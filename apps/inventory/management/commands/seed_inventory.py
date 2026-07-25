import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.inventory.models import Category, Part, Supplier

SUPPLIERS = [
    ('VeloParts Hurt', 'Dział zamówień', 'zamowienia@veloparts.example.com', '583001122'),
    ('BikePoint Dystrybucja', 'Marek Nowicki', 'hurt@bikepoint.example.com', '583002233'),
    ('CentrumRowerowe.pl', 'Biuro obsługi', 'kontakt@centrumrowerowe.example.com', '583003344'),
    ('Merida Polska - Serwis', 'Dział serwisowy', 'serwis@merida.example.com', '583004455'),
]

# (kategoria, [(nazwa, unit, cena_zakupu, cena_sprzedazy, próg_niskiego_stanu), ...])
SUPPLY_CATEGORIES = {
    'Opony i dętki': [
        ('Opona MTB 29"', 'szt.', 45, 89, 4),
        ('Opona szosowa 28"', 'szt.', 38, 75, 4),
        ('Dętka 26"', 'szt.', 8, 18, 8),
        ('Dętka 29"', 'szt.', 9, 20, 8),
        ('Uszczelniacz do opon tubeless 250ml', 'szt.', 15, 32, 5),
    ],
    'Hamulce': [
        ('Klocki hamulcowe tarczowe', 'kpl.', 18, 42, 6),
        ('Klocki hamulcowe szczękowe', 'kpl.', 12, 28, 6),
        ('Tarcza hamulcowa 160mm', 'szt.', 28, 59, 4),
        ('Tarcza hamulcowa 180mm', 'szt.', 32, 65, 4),
        ('Linka hamulcowa', 'szt.', 5, 14, 10),
        ('Płyn hamulcowy DOT 5.1 250ml', 'szt.', 14, 29, 5),
        ('Olej mineralny do hamulców 250ml', 'szt.', 16, 34, 5),
    ],
    'Napęd': [
        ('Łańcuch 11-rz.', 'szt.', 45, 95, 5),
        ('Łańcuch 9-rz.', 'szt.', 28, 59, 5),
        ('Kaseta 11-36T', 'szt.', 85, 169, 3),
        ('Korba MTB', 'szt.', 120, 249, 2),
        ('Suport', 'szt.', 35, 75, 3),
        ('Pedały MTB', 'kpl.', 60, 129, 3),
        ('Zębatka pojedyncza', 'szt.', 40, 89, 3),
    ],
    'Koła i szprychy': [
        ('Szprycha 260mm', 'szt.', 2, 6, 20),
        ('Nypel', 'szt.', 1, 3, 40),
        ('Piasta przednia', 'szt.', 55, 119, 2),
        ('Piasta tylna', 'szt.', 75, 159, 2),
        ('Obręcz 29"', 'szt.', 90, 189, 2),
    ],
    'Stery i mostki': [
        ('Stery bezgwintowe', 'kpl.', 40, 89, 3),
        ('Mostek kierownicy', 'szt.', 35, 79, 3),
        ('Kierownica MTB', 'szt.', 45, 99, 3),
    ],
    'Siodła i sztycy': [
        ('Siodło sportowe', 'szt.', 40, 89, 3),
        ('Sztyca amortyzowana', 'szt.', 70, 149, 2),
        ('Obejma sztycy', 'szt.', 8, 19, 6),
    ],
    'Oświetlenie i elektronika': [
        ('Lampka przednia LED', 'szt.', 25, 55, 5),
        ('Lampka tylna LED', 'szt.', 15, 35, 5),
        ('Komputer rowerowy', 'szt.', 45, 99, 3),
    ],
    'Akcesoria': [
        ('Dzwonek', 'szt.', 6, 15, 8),
        ('Bidon 750ml', 'szt.', 8, 19, 8),
        ('Kosz na bidon', 'szt.', 12, 27, 6),
        ('Błotniki (para)', 'kpl.', 25, 55, 4),
        ('Stojak rowerowy', 'szt.', 30, 65, 3),
        ('Zapięcie U-lock', 'szt.', 35, 79, 4),
    ],
}

# usługi nie mają stanu magazynowego ani ceny zakupu - tylko cenę sprzedaży
SERVICES = [
    ('Robocizna serwisowa (godz.)', 'godz.', 80),
    ('Diagnostyka roweru', 'usł.', 40),
    ('Przegląd okresowy', 'usł.', 120),
    ('Centrowanie koła', 'usł.', 60),
    ('Regulacja przerzutek', 'usł.', 50),
    ('Odpowietrzenie hamulców hydraulicznych', 'usł.', 70),
    ('Montaż / wymiana opony', 'usł.', 25),
    ('Wymiana linek i pancerzy', 'usł.', 60),
    ('Serwis zawieszenia', 'usł.', 150),
    ('Mycie i czyszczenie roweru', 'usł.', 40),
]


class Command(BaseCommand):
    help = (
        'Tworzy przykładowe zaopatrzenie (kategorie, dostawców, części magazynowe) '
        'oraz katalog usług serwisowych.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Usuwa istniejące kategorie, dostawców i części przed wygenerowaniem nowych danych.',
        )
        parser.add_argument(
            '--noinput', '--no-input',
            action='store_false', dest='interactive',
            help='Nie pytaj o potwierdzenie usunięcia danych.',
        )

    def handle(self, *args, **options):
        existing = Part.objects.exists()

        if existing and not options['flush']:
            self.stdout.write(self.style.WARNING(
                'W bazie są już części/usługi. Nie tworzę nowych danych, aby ich nie zduplikować.\n'
                'Użyj --flush, żeby najpierw usunąć istniejące kategorie, dostawców i części.'
            ))
            return

        if existing and options['flush']:
            if options['interactive']:
                answer = input(
                    'To usunie WSZYSTKIE kategorie, wszystkich dostawców i wszystkie części/usługi. Kontynuować? [y/N]: '
                )
                if answer.strip().lower() not in ('y', 'yes', 't', 'tak'):
                    self.stdout.write('Przerwano.')
                    return

            self.stdout.write('Usuwanie istniejących danych zaopatrzenia...')
            Part.objects.all().delete()
            Supplier.objects.all().delete()
            Category.objects.all().delete()

        with transaction.atomic():
            suppliers = self._create_suppliers()
            self._create_supplies(suppliers)
            self._create_services()

        self.stdout.write(self.style.SUCCESS(
            'Wygenerowano zaopatrzenie (kategorie, dostawców, części) oraz katalog usług.'
        ))

    def _create_suppliers(self):
        suppliers = []
        for name, contact, email, phone in SUPPLIERS:
            supplier = Supplier.objects.create(name=name, contact=contact, email=email, phone=phone)
            suppliers.append(supplier)
            self.stdout.write(f'  + Dostawca: {supplier}')
        return suppliers

    def _create_supplies(self, suppliers):
        for category_name, items in SUPPLY_CATEGORIES.items():
            category = Category.objects.create(name=category_name)
            self.stdout.write(f'  + Kategoria: {category}')
            for index, (name, unit, purchase, sell, low_stock) in enumerate(items):
                part = Part.objects.create(
                    category=category,
                    supplier=random.choice(suppliers),
                    name=name,
                    sku=f'{category_name[:3].upper()}-{index + 1:03d}',
                    unit=unit,
                    stock_quantity=Decimal(random.randint(low_stock, low_stock * 6)),
                    low_stock_threshold=Decimal(low_stock),
                    purchase_price=Decimal(purchase),
                    sell_price=Decimal(sell),
                )
                self.stdout.write(f'    - Część: {part}')

    def _create_services(self):
        category = Category.objects.create(name='Usługi')
        self.stdout.write(f'  + Kategoria: {category}')
        for index, (name, unit, price) in enumerate(SERVICES):
            service = Part.objects.create(
                category=category,
                supplier=None,
                name=name,
                sku=f'USL-{index + 1:03d}',
                unit=unit,
                stock_quantity=Decimal('0'),
                low_stock_threshold=Decimal('0'),
                purchase_price=None,
                sell_price=Decimal(price),
            )
            self.stdout.write(f'    - Usługa: {service}')
