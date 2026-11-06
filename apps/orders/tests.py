from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.db.models import ProtectedError
from django.test import TransactionTestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.customers.models import Bike, Customer
from apps.inventory.models import Part

from .models import RepairOrder, StatusHistory

User = get_user_model()


class OrderEquipmentTests(APITestCase):
    """Orders covering several pieces of equipment, and the legacy single-bike API shape."""

    def setUp(self):
        # No password anywhere in here on purpose: force_login() signs the user in
        # directly, so a credential literal would buy nothing and trip secret scanning.
        self.user = User.objects.create_user(username='mechanik', is_staff=True)
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
        payload.setdefault('estimated_pickup_date', str(timezone.localdate() + timedelta(days=3)))
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

    def test_create_stores_estimated_pickup_date(self):
        pickup = timezone.localdate() + timedelta(days=3)
        response = self._create_order(bike=self.bike.pk, estimated_pickup_date=str(pickup))
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(RepairOrder.objects.get(pk=response.data['id']).estimated_pickup_date, pickup)

    def test_create_stores_priority(self):
        response = self._create_order(bike=self.bike.pk, priority='urgent')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(RepairOrder.objects.get(pk=response.data['id']).priority, 'urgent')

    def test_create_defaults_priority_to_normal(self):
        response = self._create_order(bike=self.bike.pk)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(RepairOrder.objects.get(pk=response.data['id']).priority, 'normal')

    def test_create_requires_estimated_pickup_date(self):
        response = self.client.post(reverse('order-list'), {
            'customer': self.customer.pk, 'bike': self.bike.pk,
            'bike_tag_number': 42, 'description': 'Serwis.',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('estimated_pickup_date', response.data)

    def test_create_rejects_null_estimated_pickup_date(self):
        response = self._create_order(bike=self.bike.pk, estimated_pickup_date=None)
        self.assertEqual(response.status_code, 400)
        self.assertIn('estimated_pickup_date', response.data)

    def test_create_rejects_past_estimated_pickup_date(self):
        yesterday = timezone.localdate() - timedelta(days=1)
        response = self._create_order(bike=self.bike.pk, estimated_pickup_date=str(yesterday))
        self.assertEqual(response.status_code, 400)
        self.assertIn('estimated_pickup_date', response.data)

    def test_create_accepts_today_as_pickup_date(self):
        response = self._create_order(bike=self.bike.pk, estimated_pickup_date=str(timezone.localdate()))
        self.assertEqual(response.status_code, 201, response.data)

    def test_update_can_move_pickup_date_into_the_past(self):
        """Correcting an existing order is not blocked by the create-time past-date rule."""
        order = self._order_with(self.bike)
        past = timezone.localdate() - timedelta(days=5)
        response = self.client.patch(
            reverse('order-detail', args=[order.pk]),
            {'estimated_pickup_date': str(past)},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        order.refresh_from_db()
        self.assertEqual(order.estimated_pickup_date, past)
        self.assertEqual(response.data['estimated_pickup_date'], str(past))

    def test_list_exposes_estimated_pickup_date(self):
        order = self._order_with(self.bike)
        order.estimated_pickup_date = timezone.localdate()
        order.save()
        response = self.client.get(reverse('order-list'))
        self.assertEqual(response.status_code, 200)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        self.assertEqual(results[0]['estimated_pickup_date'], str(timezone.localdate()))

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

    def _search_ids(self, term):
        response = self.client.get(reverse('order-list'), {'search': term})
        self.assertEqual(response.status_code, 200, response.data)
        return {row['id'] for row in response.data['results']}

    def test_search_matches_tag_number_partially(self):
        tag_9 = self._order_with(self.bike, tag=9)
        tag_19 = self._order_with(self.skis_left, tag=19)
        tag_91 = self._order_with(self.skis_right, tag=91)
        self._order_with(self.bike, tag=42)
        self.assertEqual(self._search_ids('9'), {tag_9.pk, tag_19.pk, tag_91.pk})
        self.assertEqual(self._search_ids('91'), {tag_91.pk})

    def test_search_by_tag_does_not_duplicate_multi_equipment_orders(self):
        order = self._order_with(self.skis_left, self.skis_right, tag=7)
        response = self.client.get(reverse('order-list'), {'search': '7'})
        self.assertEqual([row['id'] for row in response.data['results']], [order.pk])

    def test_text_search_still_works_alongside_tag_search(self):
        order = self._order_with(self.bike, tag=42)
        self.assertEqual(self._search_ids('Nowak'), {order.pk})
        self.assertEqual(self._search_ids('Kowalski'), set())

    def test_numeric_term_still_matches_text_fields(self):
        """A number in the description is found too - the tag is an extra field, not a replacement."""
        order = self._order_with(self.bike, tag=1)
        order.description = 'Wymiana lancucha 11 rzedow.'
        order.save()
        self.assertEqual(self._search_ids('11'), {order.pk})

    def test_tag_combines_with_other_terms(self):
        """Every term must match somewhere, the tag counting as one of the fields."""
        order = self._order_with(self.bike, tag=42)
        self.assertEqual(self._search_ids('Nowak 42'), {order.pk})
        self.assertEqual(self._search_ids('Kowalski 42'), set())


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
        request.user = User.objects.create_superuser(username='admin')
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
        self.user = User.objects.create_user(username='mechanik', is_staff=True)
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


class RenameDiagnosingToEstimatingMigrationTests(TransactionTestCase):
    """0011 moves existing orders and their status history from `diagnosing` to `estimating`."""

    before = [('orders', '0010_repairorder_estimated_pickup_date')]
    after = [('orders', '0011_rename_diagnosing_to_estimating')]

    def _migrate(self, targets):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(targets)
        return executor.loader.project_state(targets).apps

    def tearDown(self):
        # Leave the schema at the latest state for the tests that follow.
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    def _seed(self, apps, status):
        Customer = apps.get_model('customers', 'Customer')
        RepairOrder = apps.get_model('orders', 'RepairOrder')
        StatusHistory = apps.get_model('orders', 'StatusHistory')
        customer = Customer.objects.create(first_name='Anna', last_name='Nowak', phone='500100200')
        order = RepairOrder.objects.create(
            customer=customer, bike_tag_number=1, description='Serwis.', status=status,
        )
        StatusHistory.objects.create(repair_order=order, old_status='accepted', new_status=status)
        StatusHistory.objects.create(repair_order=order, old_status=status, new_status='in_progress')
        return order.pk

    def _statuses(self, apps, order_pk):
        RepairOrder = apps.get_model('orders', 'RepairOrder')
        StatusHistory = apps.get_model('orders', 'StatusHistory')
        history = StatusHistory.objects.filter(repair_order_id=order_pk).order_by('pk')
        return (
            RepairOrder.objects.get(pk=order_pk).status,
            [(h.old_status, h.new_status) for h in history],
        )

    def test_forward_renames_order_and_history(self):
        order_pk = self._seed(self._migrate(self.before), 'diagnosing')
        status, history = self._statuses(self._migrate(self.after), order_pk)
        self.assertEqual(status, 'estimating')
        self.assertEqual(history, [('accepted', 'estimating'), ('estimating', 'in_progress')])

    def test_backward_restores_diagnosing(self):
        order_pk = self._seed(self._migrate(self.after), 'estimating')
        status, history = self._statuses(self._migrate(self.before), order_pk)
        self.assertEqual(status, 'diagnosing')
        self.assertEqual(history, [('accepted', 'diagnosing'), ('diagnosing', 'in_progress')])


class StatusHistoryAdminInlineTests(APITestCase):
    """On the order's admin page only the note of a status-history entry is editable."""

    def setUp(self):
        self.admin = User.objects.create_superuser(username='admin')
        self.client.force_login(self.admin)
        customer = Customer.objects.create(first_name='Anna', last_name='Nowak', phone='500100200')
        self.bike = Bike.objects.create(customer=customer, brand='Trek', model='Marlin 5', bike_type='mtb')
        self.order = RepairOrder.objects.create(
            customer=customer, bike_tag_number=5, description='Serwis.', status='estimating',
        )
        self.order.bikes.add(self.bike)
        self.entry = StatusHistory.objects.create(
            repair_order=self.order, old_status='accepted', new_status='estimating', note='Stara notatka',
        )
        self.url = reverse('admin:orders_repairorder_change', args=[self.order.pk])

    def _post(self, **history):
        data = {
            'customer': self.order.customer_id,
            'bikes': [self.bike.pk],
            'bike_tag_number': 5,
            'status': 'estimating',
            'priority': 'normal',
            'description': 'Serwis.',
            'items-TOTAL_FORMS': 0, 'items-INITIAL_FORMS': 0,
            'status_history-TOTAL_FORMS': 1, 'status_history-INITIAL_FORMS': 1,
            'status_history-0-id': self.entry.pk,
            'status_history-0-repair_order': self.order.pk,
            'status_history-0-note': 'Poprawiona notatka',
        }
        data.update(history)
        return self.client.post(self.url, data)

    def test_change_page_offers_note_only(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="status_history-0-note"')
        self.assertNotContains(response, 'name="status_history-0-new_status"')
        self.assertNotContains(response, 'name="status_history-0-old_status"')

    def test_note_is_saved(self):
        response = self._post()
        self.assertEqual(response.status_code, 302)
        self.entry.refresh_from_db()
        self.assertEqual(self.entry.note, 'Poprawiona notatka')

    def test_status_fields_cannot_be_changed(self):
        self._post(**{'status_history-0-new_status': 'done', 'status_history-0-old_status': 'done'})
        self.entry.refresh_from_db()
        self.assertEqual((self.entry.old_status, self.entry.new_status), ('accepted', 'estimating'))

    def test_history_rows_cannot_be_added(self):
        response = self.client.get(self.url)
        self.assertNotContains(response, 'status_history-empty')


class ReadyForPickupSmsTests(APITestCase):
    """`done` returns an SMS preview; the SMS itself goes out only via the separate endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(username='mechanik', is_staff=True)
        self.client.force_login(self.user)
        self.customer = Customer.objects.create(first_name='Anna', last_name='Nowak', phone='600100200')
        self.order = RepairOrder.objects.create(
            customer=self.customer, bike_tag_number=86, description='Serwis.', status='in_progress',
            final_cost=Decimal('250.00'),
        )

    def _change_status(self, new_status, **extra):
        return self.client.post(
            reverse('order-change-status', args=[self.order.pk]),
            {'status': new_status, **extra}, format='json',
        )

    def _send_sms(self, message):
        return self.client.post(
            reverse('order-send-sms', args=[self.order.pk]), {'message': message}, format='json',
        )

    def test_done_returns_preview_without_sending(self):
        with self.assertNoLogs('apps.orders.sms', level='INFO'):
            response = self._change_status('done')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['sms_preview'], {
            'to': '+48600100200',
            'message': 'Sheriff Bike: Dzień dobry! Państwa sprzęt (zawieszka #86) jest gotowy do odbioru. '
                       'Do zapłaty: 250 zł. Zapraszamy!',
        })
        self.assertEqual(response.data['status'], 'done')
        entry = self.order.status_history.get(new_status='done')
        self.assertEqual(entry.note, '')

    def test_preview_falls_back_to_estimated_cost_and_keeps_fractions(self):
        self.order.final_cost = None
        self.order.estimated_cost = Decimal('149.50')
        self.order.save()
        self.assertIn('Do zapłaty: 149,50 zł.', self._change_status('done').data['sms_preview']['message'])

    def test_preview_has_no_amount_when_cost_unknown(self):
        self.order.final_cost = None
        self.order.save()
        self.assertNotIn('Do zapłaty', self._change_status('done').data['sms_preview']['message'])

    def test_other_statuses_have_no_preview(self):
        response = self._change_status('waiting_parts')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['sms_preview'])

    def test_send_uses_edited_message_and_notes_history(self):
        self._change_status('done', note='Wymieniony łańcuch.')
        with self.assertLogs('apps.orders.sms', level='INFO') as logs:
            response = self._send_sms('Rower gotowy, prosimy o odbiór do piątku.')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data, {
            'sent': True, 'mocked': True, 'to': '+48600100200',
            'message': 'Rower gotowy, prosimy o odbiór do piątku.', 'error': None,
        })
        self.assertIn('prosimy o odbiór do piątku', logs.output[0])
        entry = self.order.status_history.get(new_status='done')
        self.assertEqual(entry.note, 'Wymieniony łańcuch.\nSMS do +48600100200 (symulacja)')

    def test_send_rejected_when_order_not_ready(self):
        response = self._send_sms('Rower gotowy.')
        self.assertEqual(response.status_code, 400)
        self.assertIn('detail', response.data)

    def test_send_rejects_blank_message(self):
        self._change_status('done')
        response = self._send_sms('   ')
        self.assertEqual(response.status_code, 400)
        self.assertIn('message', response.data)

    def test_send_without_phone_fails_and_leaves_history_alone(self):
        self._change_status('done')
        Customer.objects.filter(pk=self.customer.pk).update(phone='')
        response = self._send_sms('Rower gotowy.')
        self.assertEqual(response.status_code, 400)
        self.assertTrue(response.data['detail'])
        self.assertEqual(self.order.status_history.get(new_status='done').note, '')


class OrderCalendarTests(APITestCase):
    """GET /api/orders/calendar/ - orders by pickup date for the calendar view."""

    def setUp(self):
        self.client.force_login(User.objects.create_user(username='mechanik', is_staff=True))
        self.customer = Customer.objects.create(first_name='Anna', last_name='Nowak', phone='500100200')
        self.bike = Bike.objects.create(customer=self.customer, brand='Trek')

    def _order(self, pickup, tag=1, status='accepted'):
        order = RepairOrder.objects.create(
            customer=self.customer, bike_tag_number=tag, description='Serwis.',
            estimated_pickup_date=pickup, status=status,
        )
        order.bikes.add(self.bike)
        return order

    def _calendar(self, **params):
        return self.client.get(reverse('order-calendar'), params)

    def test_returns_orders_in_range_inclusive_sorted_by_pickup_date(self):
        last_day = self._order(date(2026, 10, 31), tag=3)
        first_day = self._order(date(2026, 10, 1), tag=2)
        self._order(date(2026, 9, 30))
        self._order(date(2026, 11, 1))
        self._order(None)

        response = self._calendar(start='2026-10-01', end='2026-10-31')

        self.assertEqual(response.status_code, 200)
        self.assertEqual([o['id'] for o in response.data], [first_day.pk, last_day.pk])
        self.assertEqual(response.data[0]['customer_name'], 'Anna Nowak')

    def test_is_not_paginated(self):
        for tag in range(60):
            self._order(date(2026, 10, 15), tag=tag)

        response = self._calendar(start='2026-10-01', end='2026-10-31')

        self.assertEqual(len(response.data), 60)

    def test_status_filter_applies(self):
        open_order = self._order(date(2026, 10, 15), status='in_progress')
        self._order(date(2026, 10, 15), status='delivered')

        response = self._calendar(start='2026-10-01', end='2026-10-31', status='accepted,in_progress')

        self.assertEqual([o['id'] for o in response.data], [open_order.pk])

    def test_invalid_range_is_rejected(self):
        for params in (
            {},
            {'start': '2026-10-01'},
            {'start': 'jutro', 'end': '2026-10-31'},
            {'start': '2026-10-31', 'end': '2026-10-01'},
            {'start': '2026-10-01', 'end': '2026-11-12'},
        ):
            with self.subTest(params=params):
                self.assertEqual(self._calendar(**params).status_code, 400)

    def test_six_week_month_grid_is_allowed(self):
        self.assertEqual(self._calendar(start='2026-09-28', end='2026-11-08').status_code, 200)


class OrderItemsTests(APITestCase):
    """Pozycje zlecenia: z katalogu albo jednorazowe, a final_cost zawsze równa się ich sumie."""

    def setUp(self):
        self.client.force_login(User.objects.create_user(username='mechanik', is_staff=True))
        customer = Customer.objects.create(first_name='Anna', last_name='Nowak', phone='500100200')
        self.order = RepairOrder.objects.create(customer=customer, bike_tag_number=3, description='Serwis')
        self.url = f'/api/orders/{self.order.pk}/items/'
        self.tube = Part.objects.create(
            kind=Part.KIND_PART, sku='TEST-DETKA-28', name='Dętka 28"', unit='szt.', sell_price=Decimal('20.00'),
        )

    def add(self, **data):
        return self.client.post(self.url, data, format='json')

    def final_cost(self):
        self.order.refresh_from_db()
        return self.order.final_cost

    def test_catalogue_item_copies_name_kind_and_price(self):
        response = self.add(part=self.tube.pk, quantity='2')
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(
            (body['description'], body['item_type'], body['unit_price'], body['line_total']),
            ('Dętka 28"', 'part', '20.00', '40.00'),
        )
        self.assertEqual(self.final_cost(), Decimal('40.00'))

    def test_editing_description_keeps_items_and_final_cost(self):
        self.add(part=self.tube.pk, quantity='2')
        response = self.client.patch(
            f'/api/orders/{self.order.pk}/', {'description': 'Serwis + wymiana dętki'}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['description'], 'Serwis + wymiana dętki')
        self.assertEqual(self.order.items.count(), 1)
        self.assertEqual(self.final_cost(), Decimal('40.00'))

    def test_same_catalogue_entry_adds_to_quantity(self):
        self.assertEqual(self.add(part=self.tube.pk).status_code, 201)
        response = self.add(part=self.tube.pk, quantity='2')
        self.assertEqual(response.status_code, 200, response.content)
        item = self.order.items.get()
        self.assertEqual((item.quantity, response.json()['id']), (Decimal('3'), item.pk))
        self.assertEqual(self.final_cost(), Decimal('60.00'))

    def test_merge_keeps_the_price_of_the_existing_item(self):
        item_id = self.add(part=self.tube.pk).json()['id']
        self.client.patch(f'{self.url}{item_id}/', {'unit_price': '15.00'}, format='json')
        self.add(part=self.tube.pk, unit_price='20.00')
        item = self.order.items.get()
        self.assertEqual((item.quantity, item.unit_price), (Decimal('2'), Decimal('15.00')))
        self.assertEqual(self.final_cost(), Decimal('30.00'))

    def test_save_to_catalog_merges_with_the_matching_entry(self):
        self.add(part=self.tube.pk)
        response = self.add(description='dętka 28"', item_type='part', unit_price='25.00', save_to_catalog=True)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.order.items.get().quantity, Decimal('2'))

    def test_one_off_items_are_never_merged(self):
        for _ in range(2):
            self.assertEqual(self.add(description='Naprawa koła', item_type='service', unit_price='50.00').status_code, 201)
        self.assertEqual(self.order.items.count(), 2)

    def test_catalogue_price_change_does_not_rewrite_the_item(self):
        self.add(part=self.tube.pk)
        Part.objects.filter(pk=self.tube.pk).update(sell_price=Decimal('99.00'))
        self.assertEqual(self.order.items.get().unit_price, Decimal('20.00'))

    def test_one_off_item_requires_description_type_and_price(self):
        response = self.add(description='Siodło klienta')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.json()), {'unit_price', 'item_type'})

        response = self.add(description='Siodło klienta', item_type='part', unit_price='120.00')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertIsNone(response.json()['part'])
        self.assertFalse(Part.objects.filter(name='Siodło klienta').exists())

    def test_one_off_item_can_be_saved_to_catalogue(self):
        response = self.add(description='Dzwonek', item_type='accessory', unit_price='15.00', save_to_catalog=True)
        self.assertEqual(response.status_code, 201, response.content)
        part = Part.objects.get(name='Dzwonek')
        self.assertEqual((part.kind, part.sell_price), ('accessory', Decimal('15.00')))
        self.assertEqual(response.json()['part'], part.pk)

    def test_update_and_delete_recalculate_final_cost(self):
        item_id = self.add(part=self.tube.pk).json()['id']
        self.add(description='Usługi serwisowe', item_type='service', unit_price='50.00', quantity='1.5')
        self.assertEqual(self.final_cost(), Decimal('95.00'))

        response = self.client.patch(f'{self.url}{item_id}/', {'quantity': '3', 'unit_price': '25.00'}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.final_cost(), Decimal('150.00'))

        self.assertEqual(self.client.delete(f'{self.url}{item_id}/').status_code, 204)
        self.assertEqual(self.final_cost(), Decimal('75.00'))

    def test_order_without_items_has_no_final_cost(self):
        item_id = self.add(part=self.tube.pk).json()['id']
        self.client.delete(f'{self.url}{item_id}/')
        self.assertIsNone(self.final_cost())

    def test_detail_sums_items_by_type(self):
        self.add(part=self.tube.pk, quantity='2')
        self.add(part=Part.objects.get(sku='USL-PRZEGLAD-PODST').pk)
        body = self.client.get(f'/api/orders/{self.order.pk}/').json()
        self.assertEqual(body['items_summary'], {'service': '250.00', 'part': '40.00', 'accessory': '0.00'})
        self.assertEqual(body['final_cost'], '290.00')

    def test_final_cost_cannot_be_written_by_hand(self):
        self.add(part=self.tube.pk)
        self.client.patch(f'/api/orders/{self.order.pk}/', {'final_cost': '1.00'}, format='json')
        self.assertEqual(self.final_cost(), Decimal('20.00'))

    def test_items_of_a_closed_order_are_locked(self):
        item_id = self.add(part=self.tube.pk).json()['id']
        RepairOrder.objects.filter(pk=self.order.pk).update(status='delivered')
        self.assertEqual(self.add(part=self.tube.pk).status_code, 400)
        self.assertEqual(self.client.delete(f'{self.url}{item_id}/').status_code, 400)

    def test_item_of_another_order_is_404(self):
        other = RepairOrder.objects.create(customer=self.order.customer, bike_tag_number=4, description='x')
        item_id = self.add(part=self.tube.pk).json()['id']
        self.assertEqual(self.client.delete(f'/api/orders/{other.pk}/items/{item_id}/').status_code, 404)
