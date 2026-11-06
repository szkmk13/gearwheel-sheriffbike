from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.inventory.models import Category, Part
from apps.orders.models import RepairOrderItem

# Prawdziwe części i katalog bazowy ładują migracje (0004_base_catalog, 0005_service_parts) -
# seed dokłada tylko przykładowe usługi do lokalnych testów i rusza wyłącznie je.
SERVICES_CATEGORY = 'Usługi'
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
DEMO_SKUS = [f'USL-{index + 1:03d}' for index in range(len(SERVICES))]


class Command(BaseCommand):
    help = 'Tworzy przykładowy katalog usług serwisowych (części ładują migracje).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Usuwa przykładowe usługi przed utworzeniem ich od nowa.',
        )
        parser.add_argument(
            '--noinput', '--no-input',
            action='store_false', dest='interactive',
            help='Nie pytaj o potwierdzenie usunięcia danych.',
        )

    def handle(self, *args, **options):
        demo_services = Part.objects.filter(sku__in=DEMO_SKUS)
        existing = demo_services.exists()

        if existing and not options['flush']:
            self.stdout.write(self.style.WARNING(
                'W bazie są już przykładowe usługi. Nie tworzę nowych, aby ich nie zduplikować.\n'
                'Użyj --flush, żeby najpierw je usunąć.'
            ))
            return

        if existing and options['flush']:
            # Part jest chroniony przez RepairOrderItem.part (PROTECT) - bez tej kontroli
            # kasowanie kończy się ProtectedError w środku transakcji.
            used_by_orders = RepairOrderItem.objects.filter(part__in=demo_services).count()
            if used_by_orders:
                raise CommandError(
                    f'Nie mogę usunąć usług: {used_by_orders} pozycji zleceń napraw wskazuje na przykładowe '
                    'usługi. Najpierw usuń zlecenia (np. `manage.py seed_customers --flush`).'
                )

            if options['interactive']:
                answer = input('To usunie przykładowe usługi (części i katalog bazowy zostają). Kontynuować? [y/N]: ')
                if answer.strip().lower() not in ('y', 'yes', 't', 'tak'):
                    self.stdout.write('Przerwano.')
                    return

            self.stdout.write('Usuwanie przykładowych usług...')
            demo_services.delete()

        with transaction.atomic():
            services = self._create_services()

        self.stdout.write(self.style.SUCCESS(f'Utworzono katalog {len(services)} przykładowych usług.'))

    def _create_services(self):
        # Category.name jest unique - przy ponownym uruchomieniu zwykłe create() wywaliłoby się
        # na IntegrityError.
        category, _ = Category.objects.get_or_create(name=SERVICES_CATEGORY)
        services = []
        for sku, (name, unit, price) in zip(DEMO_SKUS, SERVICES):
            service = Part.objects.create(
                kind=Part.KIND_SERVICE,
                category=category,
                name=name,
                sku=sku,
                unit=unit,
                sell_price=Decimal(price),
            )
            services.append(service)
            self.stdout.write(f'    - Usługa: {service}')
        return services
