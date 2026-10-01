from io import StringIO

from django.core.management import call_command
from django.test import TestCase

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
