"""Logika przechowania sprzetu - przejscia statusow i liczenie oblozenia.

Widoki trzymaja tu cala regule biznesowa, zeby ten sam przeplyw dalo sie wywolac z
admina, komendy czy testu. Bledy leca jako `rest_framework.ValidationError`, bo kazdy
z nich jest odpowiedzia 400 dla klienta API, a nie awaria serwera.
"""

from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.catalog import STORAGE_SERVICE_SKU
from apps.inventory.models import Part
from apps.orders.models import RepairOrder
from apps.orders.services import ITEMS_LOCKED_STATUSES, add_item, remove_item, update_item

from .models import StorageBooking, StorageEvent

# Pola, ktore wolno poprawic w aktywnej rezerwacji. Zlecenie i sprzet sa ustalane przy
# tworzeniu - przepiecie rezerwacji na inne zlecenie zmienialoby wlasciciela.
EDITABLE_FIELDS = ('start_date', 'end_date', 'check_in_notes', 'check_out_notes')

STORAGE_ITEM_DESCRIPTION = 'Przechowanie zimowe'


def add_storage_item(order, *, quantity, unit_price=None):
    """Dopisuje do zlecenia pozycje "Przechowanie zimowe" - stad koszt widac w "Do zaplaty".

    Cena z katalogu, chyba ze podano inna (np. rabat). Gdy pozycji katalogu nie ma
    (usunieta w adminie), przyjecie i tak przechodzi z pozycja jednorazowa.
    """
    part = Part.objects.filter(sku=STORAGE_SERVICE_SKU).first()
    if part is not None:
        return add_item(order, part=part, quantity=quantity, unit_price=unit_price)
    return add_item(
        order, item_type=Part.KIND_SERVICE, description=STORAGE_ITEM_DESCRIPTION,
        quantity=quantity, unit_price=unit_price if unit_price is not None else Decimal('0.00'),
    )


def release_storage_item(order):
    """Zdejmuje jedna sztuke z pozycji "Przechowanie zimowe" (ostatnia sztuka usuwa linie).

    Zwraca opis zmiany do logu albo '' - gdy pozycji nie ma (np. usunieta recznie) albo
    zlecenie jest zamkniete, bo wtedy kwot juz nie ruszamy.
    """
    if order.status in ITEMS_LOCKED_STATUSES:
        return ''
    item = (
        order.items.filter(Q(part__sku=STORAGE_SERVICE_SKU) | Q(part__isnull=True, description=STORAGE_ITEM_DESCRIPTION))
        .order_by('id').first()
    )
    if item is None:
        return ''
    if item.quantity > 1:
        update_item(item, quantity=item.quantity - 1)
        before, after = (f'{q.normalize():f}' for q in (item.quantity + 1, item.quantity))
        return f'Pozycja "{item.description}" na zleceniu: ilosc {before} -> {after}.'
    remove_item(item)
    return f'Usunieto pozycje "{item.description}" ze zlecenia.'


def _full_clean(booking):
    """`full_clean()` z bledem DRF - walidacja modelu ma konczyc sie 400, nie 500."""
    try:
        booking.full_clean(exclude=['created_by'])
    except DjangoValidationError as exc:
        raise ValidationError(exc.message_dict)


def _log(booking, event_type, user, note=''):
    return StorageEvent.objects.create(
        booking=booking,
        event_type=event_type,
        performed_by=user if user and user.is_authenticated else None,
        note=note,
    )


def active_bookings(start_date, end_date, *, category=None):
    """Pobyty zajmujace miejsce w magazynie w podanym zakresie dat (domknietym)."""
    qs = StorageBooking.objects.filter(
        status__in=StorageBooking.ACTIVE_STATUSES,
        start_date__lte=end_date,
        end_date__gte=start_date,
    )
    if category:
        qs = qs.filter(bike__category=category)
    return qs


def create_booking(*, user=None, **fields):
    """Zaklada rezerwacje po sprawdzeniu, ze sprzet jest wolny w tym terminie.

    Jedyna droga tworzenia pobytu - widok tez tu trafia - zeby kazda rezerwacja
    przeszla `full_clean()` i zostawila zdarzenie w logu.
    """
    booking = StorageBooking(
        created_by=user if user and user.is_authenticated else None,
        **fields,
    )
    notes = fields.get('check_in_notes', '')

    with transaction.atomic():
        _full_clean(booking)
        booking.save()
        _log(booking, StorageEvent.EVENT_RESERVE, user, notes)
    return booking


def intake(*, customer, bikes, bike_tag_number, end_date, start_date=None, price=None,
           description='', notes='', user=None):
    """Przyjecie sprzetu na przechowanie - zlecenie i pobyty powstaja w jednym kroku.

    Serwis nie przyjmuje rezerwacji z wyprzedzeniem: zlecenie (z naklejka przypieta na
    sprzet) zaklada sie dopiero, gdy klient fizycznie przynosi sprzet. Jedno zlecenie
    obejmuje wszystkie przyniesione sztuki pod jedna naklejka, a kazda sztuka dostaje
    wlasny pobyt od razu w statusie `stored`, a zlecenie pozycje "Przechowanie zimowe"
    (ilosc = liczba sztuk, `price` to cena za sztuke). Wszystko albo nic - kolizja
    terminu jednej sztuki cofa cale przyjecie.
    """
    start_date = start_date or timezone.localdate()
    bikes = list(bikes)
    if not bikes:
        raise ValidationError({'bikes': 'Wybierz co najmniej jedna sztuke sprzetu.'})
    if len(bikes) != len({bike.pk for bike in bikes}):
        raise ValidationError({'bikes': 'Ta sama sztuka sprzetu zostala wybrana dwa razy.'})
    foreign = [str(bike) for bike in bikes if bike.customer_id != customer.pk]
    if foreign:
        raise ValidationError({'bikes': f'Sprzet nie nalezy do tego klienta: {", ".join(foreign)}.'})
    if end_date < start_date:
        raise ValidationError(
            {'end_date': 'Data konca pobytu nie moze byc wczesniejsza niz data poczatku.'}
        )

    now = timezone.now()
    with transaction.atomic():
        order = RepairOrder.objects.create(
            customer=customer,
            bike_tag_number=bike_tag_number,
            description=description or STORAGE_ITEM_DESCRIPTION,
            estimated_pickup_date=end_date,
        )
        order.bikes.set(bikes)

        bookings = []
        for bike in bikes:
            booking = StorageBooking(
                repair_order=order, bike=bike, start_date=start_date, end_date=end_date,
                status=StorageBooking.STATUS_STORED, checked_in_at=now, check_in_notes=notes,
                created_by=user if user and user.is_authenticated else None,
            )
            # Kolizje sprawdzamy tu, a nie dopiero w `full_clean`, zeby komunikat wskazal
            # sztuke - przy kilku naraz samo "zachodzacy termin" nie mowi, o ktora chodzi.
            if booking.overlapping().exists():
                raise ValidationError(
                    {'bikes': f'{bike} ma juz przechowanie w zachodzacym terminie.'}
                )
            _full_clean(booking)
            booking.save()
            _log(booking, StorageEvent.EVENT_CHECK_IN, user, notes)
            bookings.append(booking)

        add_storage_item(order, quantity=Decimal(len(bookings)), unit_price=price)
    return order, bookings


@transaction.atomic
def update_booking(booking, *, user=None, **fields):
    """Poprawia dane aktywnej rezerwacji i zapisuje w logu, co sie zmienilo.

    Jedyna droga edycji - PATCH/PUT z API tez tu trafia - zeby zmiana terminu
    nie mogla przejsc bez sladu. Odebranych i anulowanych pobytow nie edytujemy.
    """
    booking = StorageBooking.objects.select_for_update().get(pk=booking.pk)
    if booking.status not in StorageBooking.ACTIVE_STATUSES:
        raise ValidationError(
            {'status': 'Edytowac mozna tylko rezerwacje aktywna (zarezerwowana albo na przechowaniu).'}
        )

    changes = []
    for name in EDITABLE_FIELDS:
        if name in fields and fields[name] != getattr(booking, name):
            changes.append((name, getattr(booking, name), fields[name]))
            setattr(booking, name, fields[name])
    if not changes:
        return booking

    _full_clean(booking)
    booking.save(update_fields=[name for name, _, _ in changes] + ['updated_at'])

    note = '; '.join(
        f'{StorageBooking._meta.get_field(name).verbose_name}: {old} -> {new}'
        for name, old, new in changes
    )
    _log(booking, StorageEvent.EVENT_UPDATE, user, note)
    return booking


@transaction.atomic
def check_in(booking, *, user=None, notes=''):
    """Sprzet fizycznie trafia do magazynu."""
    if booking.status != StorageBooking.STATUS_RESERVED:
        raise ValidationError(
            {'status': f'Przyjac mozna tylko rezerwacje w statusie "zarezerwowane" '
                       f'(obecny: {booking.get_status_display()}).'}
        )

    booking.status = StorageBooking.STATUS_STORED
    booking.checked_in_at = timezone.now()
    if notes:
        booking.check_in_notes = notes
    booking.save(update_fields=['status', 'checked_in_at', 'check_in_notes', 'updated_at'])
    _log(booking, StorageEvent.EVENT_CHECK_IN, user, notes)
    return booking


@transaction.atomic
def check_out(booking, *, user=None, notes=''):
    """Klient odbiera sprzet. Rozliczenie jest na zleceniu, wiec tu go nie sprawdzamy."""
    if booking.status != StorageBooking.STATUS_STORED:
        raise ValidationError(
            {'status': f'Wydac mozna tylko sprzet na przechowaniu (obecny status: '
                       f'{booking.get_status_display()}).'}
        )

    booking.status = StorageBooking.STATUS_PICKED_UP
    booking.checked_out_at = timezone.now()
    if notes:
        booking.check_out_notes = notes
    booking.save(update_fields=['status', 'checked_out_at', 'check_out_notes', 'updated_at'])
    _log(booking, StorageEvent.EVENT_CHECK_OUT, user, notes)
    return booking


@transaction.atomic
def extend(booking, *, end_date, user=None, note=''):
    """Przesuwa date konca pobytu. Sluzy tez skroceniu terminu, stad brak wymogu,
    zeby nowa data byla pozniejsza - liczy sie tylko, ze pobyt zostaje poprawny."""
    if booking.status not in StorageBooking.ACTIVE_STATUSES:
        raise ValidationError(
            {'status': 'Zmienic termin mozna tylko rezerwacji aktywnej (zarezerwowana '
                       'albo na przechowaniu).'}
        )
    if end_date == booking.end_date:
        raise ValidationError({'end_date': 'Podana data konca pobytu jest juz ustawiona.'})

    previous = booking.end_date
    booking.end_date = end_date
    _full_clean(booking)
    booking.save(update_fields=['end_date', 'updated_at'])
    _log(
        booking, StorageEvent.EVENT_EXTEND, user,
        note or f'Termin konca pobytu: {previous} -> {end_date}.',
    )
    return booking


@transaction.atomic
def cancel(booking, *, user=None, reason=''):
    """Anuluje rezerwacje i zwalnia jej termin, a ze zlecenia zdejmuje jedna sztuke przechowania."""
    if booking.status == StorageBooking.STATUS_PICKED_UP:
        raise ValidationError({'status': 'Odebranego przechowania nie mozna anulowac.'})
    if booking.status == StorageBooking.STATUS_CANCELLED:
        raise ValidationError({'status': 'To przechowanie jest juz anulowane.'})

    booking.status = StorageBooking.STATUS_CANCELLED
    booking.save(update_fields=['status', 'updated_at'])
    # Świeży odczyt - status zlecenia (zamknięte?) mógł się zmienić od załadowania rezerwacji.
    item_note = release_storage_item(RepairOrder.objects.select_for_update().get(pk=booking.repair_order_id))
    _log(booking, StorageEvent.EVENT_CANCEL, user, '\n'.join(filter(None, [reason, item_note])))
    return booking


def occupancy(start_date, end_date, *, category=None):
    """Ile sztuk sprzetu lezy w magazynie w kolejnych dniach zakresu.

    Liczone metoda zamiatania: kazdy pobyt daje +1 w dniu wejscia i -1 nazajutrz po
    wyjsciu, wiec jedno zapytanie wystarcza na dowolnie dlugi zakres - zamiast zliczania
    osobno dla kazdego dnia. `timeline` zawiera wylacznie dni, w ktorych liczba sie
    zmienia, przyciete do zadanego zakresu.
    """
    if end_date < start_date:
        raise ValidationError({'end': 'Koniec zakresu nie moze byc wczesniejszy niz poczatek.'})

    deltas = defaultdict(int)
    bookings = active_bookings(start_date, end_date, category=category)
    for booking_start, booking_end in bookings.values_list('start_date', 'end_date'):
        deltas[max(booking_start, start_date)] += 1
        day_after = booking_end + timedelta(days=1)
        if day_after <= end_date:
            deltas[day_after] -= 1

    timeline = []
    running = 0
    peak = 0
    peak_date = None
    for day in sorted(deltas):
        running += deltas[day]
        timeline.append({'date': day, 'count': running})
        if running > peak:
            peak, peak_date = running, day

    # Zakres zaczynajacy sie pusto - wykres po stronie panelu ma wtedy od czego wystartowac.
    if not timeline or timeline[0]['date'] > start_date:
        timeline.insert(0, {'date': start_date, 'count': 0})

    return {
        'start': start_date,
        'end': end_date,
        'bookings_count': bookings.count(),
        'peak_occupancy': peak,
        'peak_date': peak_date,
        'timeline': timeline,
    }


def dashboard():
    """Liczby na panel: co lezy, co do odbioru w tym tygodniu, co sie przeterminowalo."""
    today = timezone.localdate()
    week_ahead = today + timedelta(days=7)

    stored = StorageBooking.objects.filter(status=StorageBooking.STATUS_STORED)
    return {
        'stored_now': stored.count(),
        'due_this_week': stored.filter(end_date__gte=today, end_date__lte=week_ahead).count(),
        'overdue': stored.filter(end_date__lt=today).count(),
        'upcoming': StorageBooking.objects.filter(
            status=StorageBooking.STATUS_RESERVED, start_date__gte=today,
        ).count(),
    }


def overdue_filter():
    """Warunek `przeterminowane` wspoldzielony przez filtry i serializery."""
    return Q(status=StorageBooking.STATUS_STORED, end_date__lt=timezone.localdate())
