import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.customers.models import Bike, Customer
from apps.orders.models import RepairOrder, RepairOrderItem, StatusHistory

FIRST_NAMES = [
    'Anna', 'Piotr', 'Katarzyna', 'Michał', 'Magdalena', 'Tomasz',
    'Agnieszka', 'Krzysztof', 'Joanna', 'Marcin', 'Ewa', 'Paweł',
]
LAST_NAMES = [
    'Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski',
    'Zielińska', 'Szymańska', 'Woźniak', 'Dąbrowski', 'Kozłowska', 'Jankowski',
]

BIKE_BRANDS = ['Trek', 'Giant', 'Kross', 'Specialized', 'Cube', 'Merida', 'Romet', 'Author', 'Orbea', 'Scott']
BIKE_MODELS = ['Marlin 5', 'Talon', 'Level', 'Rockhopper', 'Aim', 'Big Nine', 'Rambler', 'A6300', 'MX 20', 'Aspect']
BIKE_TYPES = [c[0] for c in Bike.BIKE_TYPE_CHOICES]
COLORS = ['czarny', 'czerwony', 'niebieski', 'biały', 'grafitowy', 'zielony', 'żółty']

REPAIR_DESCRIPTIONS = [
    'Wymiana dętki i opony',
    'Serwis hamulców tarczowych',
    'Regulacja przerzutek',
    'Wymiana łańcucha i kasety',
    'Centrowanie koła',
    'Wymiana klocków hamulcowych',
    'Przegląd okresowy',
    'Wymiana linek i pancerzy',
    'Serwis suportu i korby',
    'Wymiana opon na zimowe',
    'Naprawa układu napędowego',
    'Smarowanie i regulacja sterów',
    'Wymiana szprychy',
    'Odpowietrzenie hamulców hydraulicznych',
    'Wymiana klamek hamulcowych',
]
ITEM_DESCRIPTIONS = [
    ('część', 'Dętka'), ('część', 'Opona'), ('część', 'Klocki hamulcowe'),
    ('część', 'Łańcuch'), ('część', 'Kaseta'), ('część', 'Linka hamulcowa'),
    ('robocizna', 'Robocizna serwisowa'), ('robocizna', 'Diagnostyka'),
]
STATUS_CHOICES = [s[0] for s in RepairOrder.STATUS_CHOICES]
PRIORITY_CHOICES = [p[0] for p in RepairOrder.PRIORITY_CHOICES]


class Command(BaseCommand):
    help = (
        'Tworzy przykładowych klientów (10) z rowerami (1-3 na klienta) '
        'i historią napraw (1-10 zleceń na rower).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Usuwa istniejących klientów (i powiązane rowery/zlecenia) przed wygenerowaniem nowych danych.',
        )
        parser.add_argument(
            '--noinput', '--no-input',
            action='store_false', dest='interactive',
            help='Nie pytaj o potwierdzenie usunięcia danych.',
        )

    def handle(self, *args, **options):
        existing = Customer.objects.exists()

        if existing and not options['flush']:
            self.stdout.write(self.style.WARNING(
                'W bazie są już klienci. Nie tworzę nowych danych, aby ich nie zduplikować.\n'
                'Użyj --flush, żeby najpierw usunąć istniejących klientów (wraz z rowerami i zleceniami).'
            ))
            return

        if existing and options['flush']:
            if options['interactive']:
                answer = input(
                    'To usunie WSZYSTKICH klientów, rowery i zlecenia napraw. Kontynuować? [y/N]: '
                )
                if answer.strip().lower() not in ('y', 'yes', 't', 'tak'):
                    self.stdout.write('Przerwano.')
                    return

            self.stdout.write('Usuwanie istniejących danych klientów...')
            # RepairOrder chroni customer/bike przed usunięciem (PROTECT),
            # więc zlecenia (i kaskadowo ich pozycje/historię statusów) trzeba usunąć jako pierwsze.
            RepairOrder.objects.all().delete()
            Bike.objects.all().delete()
            Customer.objects.all().delete()

        with transaction.atomic():
            for i in range(10):
                customer = self._create_customer(i)
                for _ in range(random.randint(1, 3)):
                    bike = self._create_bike(customer)
                    self._create_repair_history(bike, customer)

        self.stdout.write(self.style.SUCCESS('Wygenerowano 10 klientów wraz z rowerami i historią napraw.'))

    def _create_customer(self, index):
        first_name = FIRST_NAMES[index % len(FIRST_NAMES)]
        last_name = LAST_NAMES[index % len(LAST_NAMES)]
        customer = Customer.objects.create(
            first_name=first_name,
            last_name=last_name,
            phone=f'5{random.randint(10000000, 99999999)}',
            email=f'{first_name.lower()}.{last_name.lower()}@example.com',
            notes='',
        )
        self.stdout.write(f'  + Klient: {customer}')
        return customer

    def _create_bike(self, customer):
        bike = Bike.objects.create(
            customer=customer,
            brand=random.choice(BIKE_BRANDS),
            model=random.choice(BIKE_MODELS),
            bike_type=random.choice(BIKE_TYPES),
            color=random.choice(COLORS),
            serial_no=f'SN{random.randint(100000, 999999)}',
            year=random.randint(2015, 2025),
        )
        self.stdout.write(f'    - Rower: {bike}')
        return bike

    def _create_repair_history(self, bike, customer):
        num_orders = random.randint(1, 10)
        now = timezone.now()
        dates = sorted(
            now - timedelta(days=random.randint(1, 900), hours=random.randint(0, 23))
            for _ in range(num_orders)
        )
        for order_date in dates:
            status = random.choice(STATUS_CHOICES)
            order = RepairOrder.objects.create(
                customer=customer,
                bike=bike,
                status=status,
                priority=random.choice(PRIORITY_CHOICES),
                description=random.choice(REPAIR_DESCRIPTIONS),
                mechanic_notes='',
                estimated_cost=Decimal(random.randint(50, 600)),
            )

            items_total = Decimal('0')
            for _ in range(random.randint(1, 3)):
                item_type_label, item_desc = random.choice(ITEM_DESCRIPTIONS)
                item_type = 'labor' if item_type_label == 'robocizna' else 'part'
                quantity = Decimal(1)
                unit_price = Decimal(random.randint(20, 250))
                RepairOrderItem.objects.create(
                    repair_order=order,
                    item_type=item_type,
                    description=item_desc,
                    quantity=quantity,
                    unit_price=unit_price,
                )
                items_total += quantity * unit_price

            accepted_at = order_date + timedelta(hours=1)
            delivered_at = None
            final_cost = None
            if status in ('done', 'delivered'):
                delivered_at = order_date + timedelta(days=random.randint(1, 5))
                final_cost = items_total

            StatusHistory.objects.create(
                repair_order=order,
                old_status='',
                new_status=status,
                note='Utworzono zlecenie',
            )

            RepairOrder.objects.filter(pk=order.pk).update(
                created_at=order_date,
                accepted_at=accepted_at,
                delivered_at=delivered_at,
                final_cost=final_cost,
            )
        self.stdout.write(f'      * {num_orders} zleceń napraw dla roweru {bike}')
