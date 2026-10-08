"""Logika przechowania sprzetu - przejscia statusow, wplaty i liczenie oblozenia.

Widoki trzymaja tu cala regule biznesowa, zeby ten sam przeplyw dalo sie wywolac z
admina, komendy czy testu. Bledy leca jako `rest_framework.ValidationError`, bo kazdy
z nich jest odpowiedzia 400 dla klienta API, a nie awaria serwera.
"""

from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import F, Q, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import StorageBooking, StorageEvent


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
        booking.full_clean(exclude=['created_by'])
        booking.save()
        _log(booking, StorageEvent.EVENT_RESERVE, user, notes)
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
    """Klient odbiera sprzet. Nie blokujemy wydania przy niedoplacie - kasa bywa
    rozliczana osobno - ale `balance_due` zostaje widoczne na rezerwacji."""
    if booking.status != StorageBooking.STATUS_STORED:
        raise ValidationError(
            {'status': f'Wydac mozna tylko sprzet w magazynie (obecny status: '
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
                       'albo w magazynie).'}
        )
    if end_date == booking.end_date:
        raise ValidationError({'end_date': 'Podana data konca pobytu jest juz ustawiona.'})

    previous = booking.end_date
    booking.end_date = end_date
    booking.full_clean(exclude=['created_by'])
    booking.save(update_fields=['end_date', 'updated_at'])
    _log(
        booking, StorageEvent.EVENT_EXTEND, user,
        note or f'Termin konca pobytu: {previous} -> {end_date}.',
    )
    return booking


@transaction.atomic
def cancel(booking, *, user=None, reason=''):
    """Anuluje rezerwacje i zwalnia jej termin."""
    if booking.status == StorageBooking.STATUS_PICKED_UP:
        raise ValidationError({'status': 'Odebranego przechowania nie mozna anulowac.'})
    if booking.status == StorageBooking.STATUS_CANCELLED:
        raise ValidationError({'status': 'To przechowanie jest juz anulowane.'})

    booking.status = StorageBooking.STATUS_CANCELLED
    booking.save(update_fields=['status', 'updated_at'])
    _log(booking, StorageEvent.EVENT_CANCEL, user, reason)
    return booking


@transaction.atomic
def register_payment(booking, *, amount, user=None, note=''):
    """Dopisuje wplate. Sumy pilnuje constraint `paid_amount <= price`, tu tylko
    czytelny komunikat i znacznik pelnej zaplaty."""
    amount = Decimal(amount)
    if amount <= 0:
        raise ValidationError({'amount': 'Kwota wplaty musi byc dodatnia.'})

    booking = StorageBooking.objects.select_for_update().get(pk=booking.pk)
    if booking.paid_amount + amount > booking.price:
        raise ValidationError(
            {'amount': f'Wplata przekracza kwote do zaplaty ({booking.balance_due} zl).'}
        )

    booking.paid_amount += amount
    fields = ['paid_amount', 'updated_at']
    if booking.is_paid and booking.paid_at is None:
        booking.paid_at = timezone.now()
        fields.append('paid_at')
    booking.save(update_fields=fields)
    _log(booking, StorageEvent.EVENT_PAYMENT, user, note or f'Wplata {amount} zl.')
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
    """Liczby na panel: co lezy, co do odbioru, co sie przeterminowalo, co nieoplacone."""
    today = timezone.localdate()
    week_ahead = today + timedelta(days=7)

    stored = StorageBooking.objects.filter(status=StorageBooking.STATUS_STORED)
    unpaid = (
        StorageBooking.objects
        .exclude(status=StorageBooking.STATUS_CANCELLED)
        .filter(paid_amount__lt=F('price'))
    )
    settled = StorageBooking.objects.exclude(status=StorageBooking.STATUS_CANCELLED)

    return {
        'stored_now': stored.count(),
        'due_this_week': stored.filter(end_date__gte=today, end_date__lte=week_ahead).count(),
        'overdue': stored.filter(end_date__lt=today).count(),
        'upcoming': StorageBooking.objects.filter(
            status=StorageBooking.STATUS_RESERVED, start_date__gte=today,
        ).count(),
        'unpaid_count': unpaid.count(),
        'outstanding_amount': (
            unpaid.aggregate(total=Sum(F('price') - F('paid_amount')))['total'] or Decimal('0.00')
        ),
        'paid_amount_total': settled.aggregate(total=Sum('paid_amount'))['total'] or Decimal('0.00'),
    }


def overdue_filter():
    """Warunek `przeterminowane` wspoldzielony przez filtry i serializery."""
    return Q(status=StorageBooking.STATUS_STORED, end_date__lt=timezone.localdate())
