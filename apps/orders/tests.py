from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.db.models import ProtectedError
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.customers.models import Bike, Customer

from .models import RepairOrder

User = get_user_model()


class OrderEquipmentTests(APITestCase):
    """Orders covering several pieces of equipment, and the legacy single-bike API shape."""

    def setUp(self):
        self.user = User.objects.create_user(username='mechanik', password='tajne123')
        self.client.force_login(self.user)
        self.customer = Customer.objects.create(first_name='Anna', last_name='Nowak', phone='500100200')
        self.bike = Bike.objects.create(customer=self.customer, brand='Trek', model='Marlin 5', bike_type='mtb')
        self.skis_left = Bike.objects.create(
            customer=self.customer, category='winter', brand='Atomic', model='Redster X5',
        )
        self.skis_right = Bike.objects.create(
            customer=self.customer, category='winter', brand='Head', model='Supershape',
        )

    def _create_order(self, **payload):
        payload.setdefault('customer', self.customer.pk)
        payload.setdefault('bike_tag_number', 42)
        payload.setdefault('description', 'Serwis.')
        return self.client.post(reverse('order-list'), payload, format='json')

    def _order_with(self, *bikes, tag=42):
        order = RepairOrder.objects.create(
            customer=self.customer, bike_tag_number=tag, description='Serwis.',
        )
        order.bikes.set(bikes)
        return order

    def test_create_with_multiple_equipment(self):
        response = self._create_order(
            bikes=[self.skis_left.pk, self.skis_right.pk],
            description='Ostrzenie krawedzi, dwie pary nart.',
        )
        self.assertEqual(response.status_code, 201, response.data)
        order = RepairOrder.objects.get(pk=response.data['id'])
        self.assertEqual(order.bikes.count(), 2)
        # One claim tag covers the whole order, however many items it holds.
        self.assertEqual(order.bike_tag_number, 42)

    def test_create_with_legacy_single_bike_payload(self):
        """The pre-multi-equipment payload still works and lands in the equipment set."""
        response = self._create_order(bike=self.bike.pk, bike_tag_number=7)
        self.assertEqual(response.status_code, 201, response.data)
        order = RepairOrder.objects.get(pk=response.data['id'])
        self.assertEqual(list(order.bikes.all()), [self.bike])
        self.assertEqual(order.bike_tag_number, 7)

    def test_create_requires_equipment(self):
        response = self._create_order()
        self.assertEqual(response.status_code, 400)
        self.assertIn('bikes', response.data)

    def test_create_rejects_duplicate_equipment(self):
        response = self._create_order(bikes=[self.skis_left.pk, self.skis_left.pk])
        self.assertEqual(response.status_code, 400)
        self.assertIn('bikes', response.data)

    def test_legacy_fields_mirror_equipment_set(self):
        """`bike` and `bike_label` keep the shape the panel reads."""
        order = self._order_with(self.skis_left, self.skis_right, tag=7)

        detail = self.client.get(reverse('order-detail', args=[order.pk])).data
        self.assertEqual(detail['bike']['id'], self.skis_left.pk)
        self.assertEqual(detail['bike_label'], 'Atomic Redster X5, Head Supershape')
        self.assertEqual(detail['bike_tag_number'], 7)
        self.assertEqual([item['id'] for item in detail['bikes']], [self.skis_left.pk, self.skis_right.pk])

        row = self.client.get(reverse('order-list')).data['results'][0]
        self.assertEqual(row['bike'], self.skis_left.pk)
        self.assertEqual(row['bike_tag_number'], 7)

    def test_legacy_bike_follows_attachment_order(self):
        """`bike` is the item attached first, not the alphabetically first one."""
        # 'Head' sorts before 'Trek' under Bike.Meta.ordering, so an unordered read
        # would pick the wrong item here.
        order = self._order_with(self.bike, self.skis_right)
        detail = self.client.get(reverse('order-detail', args=[order.pk])).data
        self.assertEqual(detail['bike']['id'], self.bike.pk)

    def test_update_replaces_equipment_set(self):
        order = self._order_with(self.bike)
        response = self.client.patch(
            reverse('order-detail', args=[order.pk]),
            {'bikes': [self.skis_left.pk]},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(list(order.bikes.all()), [self.skis_left])

    def test_update_without_bikes_keeps_equipment(self):
        order = self._order_with(self.bike)
        response = self.client.patch(
            reverse('order-detail', args=[order.pk]), {'priority': 'high'}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(list(order.bikes.all()), [self.bike])

    def test_update_rejects_empty_equipment_set(self):
        order = self._order_with(self.bike)
        response = self.client.patch(
            reverse('order-detail', args=[order.pk]), {'bikes': []}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(list(order.bikes.all()), [self.bike])

    def test_filter_by_equipment_matches_any_item(self):
        order = self._order_with(self.skis_left, self.skis_right)
        # The second item has to match too - it would not under the old single-FK filter.
        results = self.client.get(reverse('order-list'), {'bike': self.skis_right.pk}).data['results']
        self.assertEqual([row['id'] for row in results], [order.pk])

    def test_filter_by_category(self):
        winter_order = self._order_with(self.skis_left)
        self._order_with(self.bike)
        results = self.client.get(reverse('order-list'), {'category': 'winter'}).data['results']
        self.assertEqual([row['id'] for row in results], [winter_order.pk])

    def test_category_filter_does_not_duplicate_orders(self):
        self._order_with(self.skis_left, self.skis_right)
        results = self.client.get(reverse('order-list'), {'category': 'winter'}).data['results']
        self.assertEqual(len(results), 1)

    def test_list_does_not_scale_queries_with_orders(self):
        """The equipment prefetch has to keep the list endpoint N+1-free."""
        self._order_with(self.bike)
        self.client.get(reverse('order-list'))  # warm up the session row

        with CaptureQueriesContext(connection) as one_order:
            self.client.get(reverse('order-list'))

        self._order_with(self.skis_left, self.skis_right)
        self._order_with(self.skis_left)
        with CaptureQueriesContext(connection) as three_orders:
            self.client.get(reverse('order-list'))

        self.assertEqual(len(three_orders), len(one_order))

    def test_search_does_not_duplicate_orders(self):
        self._order_with(self.skis_left, self.skis_right)
        results = self.client.get(reverse('order-list'), {'search': 'Serwis'}).data['results']
        self.assertEqual(len(results), 1)


class BikeDeletionGuardTests(APITestCase):
    """`bikes` is a plain M2M, so deletion protection has to be enforced by hand."""

    def setUp(self):
        self.customer = Customer.objects.create(first_name='Anna', last_name='Nowak', phone='500100200')
        self.bike = Bike.objects.create(customer=self.customer, brand='Trek', model='Marlin 5')

    def test_bike_on_an_order_cannot_be_deleted(self):
        order = RepairOrder.objects.create(
            customer=self.customer, bike_tag_number=1, description='Serwis.',
        )
        order.bikes.add(self.bike)
        # delete() runs in its own transaction, which the raise marks as broken - the
        # atomic block here keeps the assertion below queryable.
        with transaction.atomic():
            with self.assertRaises(ProtectedError):
                self.bike.delete()
        self.assertTrue(Bike.objects.filter(pk=self.bike.pk).exists())

    def test_unused_bike_can_be_deleted(self):
        self.bike.delete()
        self.assertFalse(Bike.objects.filter(pk=self.bike.pk).exists())

    def test_admin_reports_the_bike_as_protected(self):
        """The admin must show the "protected" page, not blow up inside delete()."""
        from django.contrib.admin.sites import AdminSite
        from django.test import RequestFactory

        from apps.customers.admin import BikeAdmin

        order = RepairOrder.objects.create(
            customer=self.customer, bike_tag_number=1, description='Serwis.',
        )
        order.bikes.add(self.bike)

        request = RequestFactory().get('/')
        request.user = User.objects.create_superuser(username='admin', password='tajne123')
        *_, protected = BikeAdmin(Bike, AdminSite()).get_deleted_objects([self.bike], request)
        self.assertEqual(protected, [str(order)])

    def test_bike_can_be_deleted_once_the_order_is_gone(self):
        order = RepairOrder.objects.create(
            customer=self.customer, bike_tag_number=1, description='Serwis.',
        )
        order.bikes.add(self.bike)
        order.delete()
        self.bike.delete()
        self.assertFalse(Bike.objects.filter(pk=self.bike.pk).exists())


class BikeCategoryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='mechanik', password='tajne123')
        self.client.force_login(self.user)
        self.customer = Customer.objects.create(first_name='Anna', last_name='Nowak', phone='500100200')

    def test_defaults_to_bike(self):
        bike = Bike.objects.create(customer=self.customer, brand='Trek')
        self.assertEqual(bike.category, 'bike')

    def test_winter_item_gets_its_own_sheriff_code(self):
        item = Bike.objects.create(customer=self.customer, category='winter', brand='Atomic')
        self.assertEqual(item.sheriff_code, f'sheriff-{item.id}-{item.uuid}')

    def test_qr_lookup_resolves_winter_item(self):
        item = Bike.objects.create(customer=self.customer, category='winter', brand='Atomic', model='Redster')
        response = self.client.get(reverse('bike-lookup'), {'code': item.sheriff_code})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], item.pk)
        self.assertEqual(response.data['category'], 'winter')

    def test_winter_item_rejects_bike_type(self):
        response = self.client.post(
            reverse('bike-create'),
            {'customer': self.customer.pk, 'category': 'winter', 'brand': 'Atomic', 'bike_type': 'mtb'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('bike_type', response.data)

    def test_dashboard_counts_categories_separately(self):
        Bike.objects.create(customer=self.customer, brand='Trek')
        Bike.objects.create(customer=self.customer, category='winter', brand='Atomic')
        data = self.client.get(reverse('dashboard')).data
        self.assertEqual(data['bikes_count'], 1)
        self.assertEqual(data['winter_items_count'], 1)
