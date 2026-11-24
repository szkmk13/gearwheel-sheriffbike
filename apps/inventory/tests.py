from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.customers.models import Bike, Customer
from apps.orders.models import RepairOrder, RepairOrderItem

from .catalog import BASE_CATALOG, BASE_CATALOG_SKUS, POPULAR_FILL_EXCLUDED_SKUS, STORAGE_SERVICE_SKU
from .management.commands.seed_inventory import DEMO_SKUS
from .models import Part
from .service_parts import SERVICE_PARTS


class BaseCatalogTests(APITestCase):
    """Katalog bazowy ładuje migracja 0004_base_catalog, więc jest też w bazie testowej."""

    def test_base_catalog_is_loaded(self):
        for sku, kind, name, unit, price in BASE_CATALOG:
            part = Part.objects.get(sku=sku)
            self.assertEqual((part.kind, part.name, part.sell_price), (kind, name, Decimal(price)))
            self.assertTrue(part.is_active)

    def test_storage_service_is_in_catalog(self):
        part = Part.objects.get(sku=STORAGE_SERVICE_SKU)
        self.assertEqual(part.kind, Part.KIND_SERVICE)
        self.assertEqual(part.sell_price, Decimal('550.00'))


class PartSearchApiTests(APITestCase):
    url = '/api/inventory/parts/'

    def setUp(self):
        self.client.force_authenticate(User.objects.create_user('serwisant', is_staff=True))
        # Nazwy spoza prawdziwej listy części (migracja 0005), żeby wyszukiwanie łapało tylko je.
        for sku, name in (('TEST-DETKA-26', 'Testowa dętka 26"'), ('TEST-DETKA-28', 'Testowa dętka 28"')):
            Part.objects.create(kind=Part.KIND_PART, sku=sku, name=name, unit='szt.', sell_price=Decimal('20.00'))

    def names(self, response):
        self.assertEqual(response.status_code, 200)
        return [row['name'] for row in response.data['results']]

    def test_search_by_name(self):
        names = self.names(self.client.get(self.url, {'search': 'testowa dętka'}))
        self.assertEqual(sorted(names), ['Testowa dętka 26"', 'Testowa dętka 28"'])

    def test_filter_by_kind(self):
        response = self.client.get(self.url, {'kind': 'accessory', 'search': 'lampka'})
        self.assertEqual(sorted(self.names(response)), ['Lampka przednia biała', 'Lampka tylna czerwona'])
        self.assertEqual(response.data['results'][0]['kind_display'], 'Akcesorium')

    def test_inactive_entries_can_be_filtered_out(self):
        Part.objects.filter(sku='TEST-DETKA-26').update(is_active=False)
        names = self.names(self.client.get(self.url, {'search': 'testowa dętka', 'is_active': 'true'}))
        self.assertEqual(names, ['Testowa dętka 28"'])

    def test_requires_staff(self):
        self.client.force_authenticate(User.objects.create_user('klient'))
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, 401)


class PopularPartsApiTests(APITestCase):
    url = '/api/inventory/parts/popular/'

    def setUp(self):
        self.client.force_authenticate(User.objects.create_user('serwisant', is_staff=True))
        customer = Customer.objects.create(first_name='Jan', last_name='Kowalski', phone='500100200')
        self.order = RepairOrder.objects.create(customer=customer, description='Przegląd')
        self.order.bikes.set([Bike.objects.create(customer=customer, brand='Kross')], through_defaults={'tag_number': 1})

    def use(self, sku, times=1, days_ago=0):
        part = Part.objects.get(sku=sku)
        for _ in range(times):
            item = RepairOrderItem.objects.create(
                repair_order=self.order, part=part, item_type=part.kind,
                description=part.name, quantity=1, unit_price=part.sell_price,
            )
            RepairOrderItem.objects.filter(pk=item.pk).update(created_at=timezone.now() - timedelta(days=days_ago))

    def skus(self, **params):
        response = self.client.get(self.url, params)
        self.assertEqual(response.status_code, 200)
        return [row['sku'] for row in response.data]

    def test_without_history_falls_back_to_base_catalogue_order(self):
        expected = [sku for sku in BASE_CATALOG_SKUS if sku not in POPULAR_FILL_EXCLUDED_SKUS][:8]
        self.assertEqual(self.skus(), expected)

    def test_most_used_come_first_then_fill(self):
        self.use('USL-SKLADANIE', times=3)
        self.use('AKC-SMAR', times=2)
        skus = self.skus(limit=4)
        self.assertEqual(skus[:2], ['USL-SKLADANIE', 'AKC-SMAR'])
        self.assertEqual(len(skus), 4)
        self.assertEqual(len(set(skus)), 4)

    def test_excluded_fill_entries_count_when_used(self):
        self.use(STORAGE_SERVICE_SKU)
        self.assertEqual(self.skus()[0], STORAGE_SERVICE_SKU)

    def test_old_usage_and_inactive_parts_are_ignored(self):
        self.use('AKC-LAMPKA-TYL', times=5, days_ago=120)
        self.use('USL-KOSZTORYS', times=5)
        Part.objects.filter(sku='USL-KOSZTORYS').update(is_active=False)
        skus = self.skus(limit=15)
        self.assertNotIn('USL-KOSZTORYS', skus)
        self.assertNotEqual(skus[0], 'AKC-LAMPKA-TYL')



class ServicePartsMigrationTests(APITestCase):
    def test_every_service_part_is_loaded_with_price_ean_and_category(self):
        rows = [row for items in SERVICE_PARTS.values() for row in items]
        self.assertEqual(Part.objects.filter(sku__in=[sku for sku, *_ in rows]).count(), len(rows))

        part = Part.objects.get(sku='EFCM6000EX002X')
        self.assertEqual(
            (part.kind, part.barcode, part.sell_price, part.category.name, part.is_active),
            (Part.KIND_PART, '4524667400813', Decimal('590.00'), 'Napęd', True),
        )


class SeedInventoryTests(APITestCase):
    def _seed(self, *args):
        call_command('seed_inventory', *args, stdout=StringIO())

    def test_second_run_without_flush_does_not_duplicate(self):
        self._seed()
        count = Part.objects.count()
        self._seed()
        self.assertEqual(Part.objects.count(), count)

    def test_flush_recreates_demo_services_only(self):
        self._seed()
        parts_before = Part.objects.exclude(sku__in=DEMO_SKUS).count()
        self._seed('--flush', '--noinput')
        self.assertEqual(Part.objects.filter(sku__in=DEMO_SKUS).count(), len(DEMO_SKUS))
        self.assertEqual(Part.objects.exclude(sku__in=DEMO_SKUS).count(), parts_before)


class PartEditApiTests(APITestCase):
    """Katalog w panelu: edycja jak w adminie, ale uzytej na zleceniu pozycji nie da sie usunac."""
    url = '/api/inventory/parts/'

    def setUp(self):
        self.client.force_authenticate(User.objects.create_user('serwisant', is_staff=True))
        self.part = Part.objects.create(kind=Part.KIND_PART, sku='TEST-LINKA', name='Testowa linka',
                                        unit='szt.', sell_price=Decimal('15.00'))

    def detail(self, part):
        return f'{self.url}{part.pk}/'

    def use_on_order(self, part):
        customer = Customer.objects.create(first_name='Jan', last_name='Kowalski', phone='500100300')
        order = RepairOrder.objects.create(customer=customer, description='Przegląd')
        RepairOrderItem.objects.create(repair_order=order, part=part, item_type=part.kind,
                                       description=part.name, quantity=1, unit_price=part.sell_price)

    def test_create_and_edit(self):
        response = self.client.post(self.url, {'kind': 'service', 'name': 'Test usługa', 'unit': 'szt.',
                                               'sell_price': '40.00'})
        self.assertEqual(response.status_code, 201, response.content)
        self.assertFalse(response.data['is_used'])
        response = self.client.patch(f"{self.url}{response.data['id']}/", {'sell_price': '45.00', 'is_active': False})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual((response.data['sell_price'], response.data['is_active']), ('45.00', False))

    def test_list_shows_usage(self):
        self.use_on_order(self.part)
        rows = self.client.get(self.url, {'search': 'testowa linka'}).data['results']
        self.assertEqual([(row['sku'], row['is_used']) for row in rows], [('TEST-LINKA', True)])

    def test_unused_part_can_be_deleted(self):
        self.assertEqual(self.client.delete(self.detail(self.part)).status_code, 204)
        self.assertFalse(Part.objects.filter(pk=self.part.pk).exists())

    def test_used_part_cannot_be_deleted(self):
        self.use_on_order(self.part)
        response = self.client.delete(self.detail(self.part))
        self.assertEqual(response.status_code, 409)
        self.assertTrue(Part.objects.filter(pk=self.part.pk).exists())

    def test_storage_service_cannot_be_deleted(self):
        part = Part.objects.get(sku=STORAGE_SERVICE_SKU)
        self.assertTrue(self.client.get(self.detail(part)).data['is_protected'])
        self.assertEqual(self.client.delete(self.detail(part)).status_code, 409)
        self.assertTrue(Part.objects.filter(pk=part.pk).exists())
