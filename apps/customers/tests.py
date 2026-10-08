from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.orders.models import RepairOrder

from .models import Bike, Customer


class SeedCustomersTests(TestCase):
    """Smoke test for the demo-data command, which has to keep up with the model changes."""

    def test_seeds_both_categories_and_multi_equipment_orders(self):
        call_command('seed_customers', '--customers', '12', '--no-input', stdout=StringIO())

        self.assertEqual(Customer.objects.count(), 12)
        self.assertTrue(Bike.objects.filter(category='bike').exists())
        self.assertTrue(Bike.objects.filter(category='winter').exists())
        # Every seeded order must carry equipment, otherwise the panel renders blanks.
        self.assertFalse(RepairOrder.objects.filter(bikes__isnull=True).exists())

    def test_flush_removes_previous_data(self):
        call_command('seed_customers', '--customers', '3', '--no-input', stdout=StringIO())
        call_command('seed_customers', '--customers', '2', '--flush', '--no-input', stdout=StringIO())

        self.assertEqual(Customer.objects.count(), 2)


class CustomerPhoneUniquenessTests(APITestCase):
    """A customer is identified by phone number: creating one again returns the existing record."""

    def setUp(self):
        self.client.force_login(get_user_model().objects.create_user(username='mechanik', is_staff=True))
        self.customer = Customer.objects.create(first_name='Anna', last_name='Nowak', phone='+48500100200')

    def _create(self, **payload):
        payload = {'first_name': 'Jan', 'last_name': 'Kowalski', 'phone': '600700800', **payload}
        return self.client.post(reverse('customer-list'), payload, format='json')

    def test_phone_is_stored_normalized(self):
        response = self._create(phone='600 700-800')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['phone'], '+48600700800')
        self.assertNotIn('existing', response.data)

    def test_existing_phone_in_any_notation_returns_existing_customer(self):
        for phone in ('500100200', '500 100 200', '+48 500-100-200', '0048500100200'):
            with self.subTest(phone=phone):
                response = self._create(phone=phone)

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data['id'], self.customer.pk)
                self.assertTrue(response.data['existing'])
        self.assertEqual(Customer.objects.count(), 1)

    def test_existing_customer_data_is_not_overwritten(self):
        self._create(phone='500100200', first_name='Ktos', email='inny@example.com')

        self.customer.refresh_from_db()
        self.assertEqual((self.customer.first_name, self.customer.email), ('Anna', ''))

    def test_signed_rodo_is_recorded_on_existing_customer(self):
        self._create(phone='500100200', rodo_accepted=True)

        self.customer.refresh_from_db()
        self.assertTrue(self.customer.rodo_accepted)

    def test_invalid_phone_is_rejected(self):
        response = self._create(phone='12')

        self.assertEqual(response.status_code, 400)
        self.assertIn('phone', response.data)

    def test_changing_phone_to_another_customers_number_is_rejected(self):
        other = Customer.objects.create(first_name='Jan', last_name='Kowalski', phone='+48600700800')

        response = self.client.patch(
            reverse('customer-detail', args=[other.pk]), {'phone': '500 100 200'}, format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('phone', response.data)


class MergeCustomersByPhoneMigrationTests(TransactionTestCase):
    """customers.0005 merges customers sharing a number before making the phone unique."""

    before = [
        ('customers', '0004_bike_category_alter_bike_bike_type'),
        ('orders', '0011_rename_diagnosing_to_estimating'),
    ]
    after = [('customers', '0005_customer_phone_unique')]

    def _migrate(self, targets):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(targets)
        return executor.loader.project_state(targets).apps

    def tearDown(self):
        # Leave the schema at the latest state for the tests that follow.
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    def test_duplicates_are_merged_into_the_oldest_customer(self):
        apps = self._migrate(self.before)
        OldCustomer = apps.get_model('customers', 'Customer')
        OldBike = apps.get_model('customers', 'Bike')
        OldOrder = apps.get_model('orders', 'RepairOrder')
        keeper = OldCustomer.objects.create(first_name='Anna', last_name='Nowak', phone='500 100 200')
        duplicate = OldCustomer.objects.create(
            first_name='Anna', last_name='Nowak', phone='+48500100200',
            email='anna@example.com', notes='Stala klientka', rodo_accepted=True,
        )
        other = OldCustomer.objects.create(first_name='Jan', last_name='Kowalski', phone='600700800')
        bike = OldBike.objects.create(customer=duplicate, brand='Trek')
        order = OldOrder.objects.create(customer=duplicate, bike_tag_number=1, description='Serwis.')

        apps = self._migrate(self.after)
        NewCustomer = apps.get_model('customers', 'Customer')

        self.assertEqual(
            sorted(NewCustomer.objects.values_list('pk', 'phone')),
            sorted([(keeper.pk, '+48500100200'), (other.pk, '+48600700800')]),
        )
        merged = NewCustomer.objects.get(pk=keeper.pk)
        self.assertEqual((merged.email, merged.notes, merged.rodo_accepted), ('anna@example.com', 'Stala klientka', True))
        self.assertEqual(apps.get_model('customers', 'Bike').objects.get(pk=bike.pk).customer_id, keeper.pk)
        self.assertEqual(apps.get_model('orders', 'RepairOrder').objects.get(pk=order.pk).customer_id, keeper.pk)
