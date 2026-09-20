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
# (item_type, opis, cena_min, cena_max)
ITEMS = [
    ('part', 'Dętka', 15, 25),
    ('part', 'Opona', 60, 180),
    ('part', 'Klocki hamulcowe', 30, 60),
    ('part', 'Łańcuch', 50, 120),
    ('part', 'Kaseta', 90, 220),
    ('part', 'Linka hamulcowa', 10, 20),
    ('labor', 'Robocizna serwisowa', 60, 160),
    ('labor', 'Diagnostyka', 40, 80),
]

# Ułamek rowerów, dla których ostatnie zlecenie jest świeże (patrz _create_repair_history).
ACTIVE_BIKE_RATIO = 0.45

# Kolejność, w jakiej zlecenie przechodzi przez statusy w normalnym obiegu.
STATUS_FLOW = ['accepted', 'diagnosing', 'waiting_parts', 'in_progress', 'done', 'delivered']

NOTES_BY_STATUS = {
    'accepted': 'Zlecenie przyjęte',
    'diagnosing': 'Diagnoza usterki',
    'waiting_parts': 'Oczekiwanie na części',
    'in_progress': 'Naprawa w toku',
    'done': 'Naprawa zakończona',
    'delivered': 'Rower wydany klientowi',
    'cancelled': 'Zlecenie anulowane',
}


class Command(BaseCommand):
    help = (
        'Tworzy przykładowych klientów z rowerami (1-3 na klienta) '
        'i historią napraw (1-10 zleceń na rower).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--customers',
            type=int,
            default=10,
            help='Liczba klientów do wygenerowania (domyślnie 10).',
        )
        parser.add_argument(
            '--random-seed',
            type=int,
            help='Ziarno generatora losowego - ta sama wartość daje te same dane.',
        )
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
        count = options['customers']
        if count < 1:
            self.stdout.write(self.style.ERROR('--customers musi być większe od 0.'))
            return

        if options['random_seed'] is not None:
            random.seed(options['random_seed'])

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

        orders_created = 0
        with transaction.atomic():
            for i in range(count):
                customer = self._create_customer(i)
                for _ in range(random.randint(1, 3)):
                    bike = self._create_bike(customer)
                    orders_created += self._create_repair_history(bike, customer)

        self.stdout.write(self.style.SUCCESS(
            f'Wygenerowano {count} klientów wraz z rowerami i {orders_created} zleceniami napraw.'
        ))

    def _create_customer(self, index):
        first_name = FIRST_NAMES[index % len(FIRST_NAMES)]
        last_name = LAST_NAMES[index % len(LAST_NAMES)]
        customer = Customer.objects.create(
            first_name=first_name,
            last_name=last_name,
            phone=f'5{random.randint(10000000, 99999999)}',
            # indeks w adresie gwarantuje unikalność też przy --customers > len(FIRST_NAMES)
            email=f'{first_name.lower()}.{last_name.lower()}{index + 1}@example.com',
            rodo_accepted=random.random() < 0.9,
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
        # Zlecenia rozrzucone po ~2,5 roku prawie zawsze wypadają jako zamknięte, więc
        # lista bieżących zleceń byłaby pusta. Części rowerów dokładamy świeże zlecenie,
        # które ma szansę zostać w trakcie realizacji.
        if random.random() < ACTIVE_BIKE_RATIO:
            dates[-1] = now - timedelta(days=random.randint(0, 25), hours=random.randint(0, 23))
            dates.sort()
        for order_date in dates:
            self._create_order(bike, customer, order_date, now)
        self.stdout.write(f'      * {num_orders} zleceń napraw dla roweru {bike}')
        return num_orders

    def _create_order(self, bike, customer, order_date, now):
        statuses = self._status_path(order_date, now)
        status = statuses[-1]

        order = RepairOrder.objects.create(
            customer=customer,
            bike=bike,
            bike_tag_number=random.randint(1, 250),
            status=status,
            priority=random.choice([p[0] for p in RepairOrder.PRIORITY_CHOICES]),
            description=random.choice(REPAIR_DESCRIPTIONS),
        )

        items_total = self._create_items(order)
        timeline = self._status_timeline(statuses, order_date, now)

        # accepted_at i delivered_at ustawiamy tak samo jak endpoint zmiany statusu:
        # z momentu wejścia w dany status, a delivered_at tylko dla 'delivered'.
        accepted_at = timeline[0][1]
        delivered_at = next((at for name, at in timeline if name == 'delivered'), None)
        # Kwota końcowa jest znana dopiero po zamknięciu naprawy; wycena wstępna
        # to zaokrąglone przybliżenie tej kwoty (+/- 20%).
        estimated_cost = (items_total * Decimal(random.randint(80, 120)) / Decimal(100)).quantize(Decimal('1'))
        final_cost = items_total if status in ('done', 'delivered') else None

        for old_status, new_status, changed_at in self._transitions(timeline):
            history = StatusHistory.objects.create(
                repair_order=order,
                old_status=old_status,
                new_status=new_status,
                note=NOTES_BY_STATUS[new_status],
            )
            # changed_at ma auto_now_add, więc datę trzeba nadpisać po zapisie.
            StatusHistory.objects.filter(pk=history.pk).update(changed_at=changed_at)

        RepairOrder.objects.filter(pk=order.pk).update(
            created_at=order_date,
            # updated_at ma auto_now - bez nadpisania każde zlecenie wyglądałoby na
            # zamknięte dzisiaj i psułoby tygodniowe statystyki na dashboardzie.
            updated_at=timeline[-1][1],
            accepted_at=accepted_at,
            delivered_at=delivered_at,
            estimated_cost=estimated_cost,
            final_cost=final_cost,
        )

    def _status_path(self, order_date, now):
        """Lista statusów, przez które przeszło zlecenie - od 'accepted' do końcowego."""
        age_days = (now - order_date).days

        if random.random() < 0.06:
            # anulowane - obieg urywa się w losowym miejscu
            return STATUS_FLOW[:random.randint(1, 3)] + ['cancelled']

        if age_days > 30:
            # stare zlecenia są praktycznie zawsze zamknięte
            final = 'delivered' if random.random() < 0.9 else 'done'
        else:
            final = random.choice(STATUS_FLOW)

        return STATUS_FLOW[:STATUS_FLOW.index(final) + 1]

    def _status_timeline(self, statuses, order_date, now):
        """Przypisuje każdemu statusowi datę - rosnąco, od przyjęcia zlecenia."""
        timeline = [(statuses[0], order_date)]
        current = order_date
        for name in statuses[1:]:
            current = min(current + timedelta(hours=random.randint(4, 72)), now)
            timeline.append((name, current))
        return timeline

    def _transitions(self, timeline):
        """Pierwszy wpis historii to utworzenie zlecenia (pusty old_status), potem kolejne zmiany."""
        previous = ''
        for name, changed_at in timeline:
            yield previous, name, changed_at
            previous = name

    def _create_items(self, order):
        items_total = Decimal('0')
        for item_type, description, min_price, max_price in random.sample(ITEMS, random.randint(1, 3)):
            quantity = Decimal(random.randint(1, 2)) if item_type == 'part' else Decimal(1)
            unit_price = Decimal(random.randint(min_price, max_price))
            RepairOrderItem.objects.create(
                repair_order=order,
                item_type=item_type,
                description=description,
                quantity=quantity,
                unit_price=unit_price,
            )
            items_total += quantity * unit_price
        return items_total
