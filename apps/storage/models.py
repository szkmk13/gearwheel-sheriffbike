from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

User = get_user_model()


def default_storage_price():
    """Nieuzywane - zostaje tylko dlatego, ze odwoluje sie do niego migracja 0003.

    Cena przechowania jest teraz pozycja "Przechowanie zimowe" na zleceniu
    (`services.intake`), a nie polem rezerwacji.
    """
    return Decimal('550.00')


class StorageBooking(models.Model):
    """Pobyt jednej sztuki sprzetu w magazynie, od `start_date` do `end_date` wlacznie.

    Serwis nie ma ponumerowanych miejsc postojowych - pojemnosc jest miekka, pracownik
    widzi ja na miejscu - wiec model nie trzyma zadnego `location`. Fizycznie sztuke
    identyfikuje `bike_tag_number` ze zlecenia, stad `repair_order` jest obowiazkowe
    (kazdy sprzet jest w trakcie przechowania serwisowany i tak).

    Jedno zlecenie moze objac kilka sztuk naraz (rower i dwie pary nart), dlatego
    rezerwacja wskazuje konkretny `bike` z tego zlecenia. Pieniadze sa na zleceniu:
    przyjecie dopisuje mu pozycje "Przechowanie zimowe", a rezerwacja nie trzyma ceny.
    """

    STATUS_RESERVED = 'reserved'
    STATUS_STORED = 'stored'
    STATUS_PICKED_UP = 'picked_up'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_RESERVED, 'Zarezerwowane'),
        (STATUS_STORED, 'Na przechowaniu'),
        (STATUS_PICKED_UP, 'Odebrane'),
        (STATUS_CANCELLED, 'Anulowane'),
    ]
    # Statusy zajmujace miejsce w swoim zakresie dat - tylko one licza sie do oblozenia
    # i tylko one koliduja ze soba.
    ACTIVE_STATUSES = (STATUS_RESERVED, STATUS_STORED)

    repair_order = models.ForeignKey(
        'orders.RepairOrder', on_delete=models.PROTECT, related_name='storage_bookings',
        verbose_name='Zlecenie',
        help_text='Zlecenie obslugujace ten sprzet - zrodlo numeru naklejki (bike_tag_number).',
    )
    bike = models.ForeignKey(
        'customers.Bike', on_delete=models.PROTECT, related_name='storage_bookings',
        verbose_name='Sprzet',
        help_text='Konkretna sztuka z tego zlecenia - rower albo sprzet zimowy.',
    )

    start_date = models.DateField(verbose_name='Od')
    end_date = models.DateField(
        verbose_name='Do',
        help_text='Ostatni dzien pobytu, wlacznie.',
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_RESERVED, db_index=True,
        verbose_name='Status',
    )

    checked_in_at = models.DateTimeField(null=True, blank=True, verbose_name='Przyjeto')
    checked_out_at = models.DateTimeField(null=True, blank=True, verbose_name='Wydano')
    check_in_notes = models.TextField(blank=True, verbose_name='Uwagi przy przyjeciu')
    check_out_notes = models.TextField(blank=True, verbose_name='Uwagi przy wydaniu')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date', '-id']
        verbose_name = 'Przechowanie'
        verbose_name_plural = 'Przechowania'
        indexes = [
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['bike', 'status']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_date__gte=F('start_date')),
                name='storage_booking_end_after_start',
            ),
        ]

    def __str__(self):
        return f'{self.bike} ({self.start_date} - {self.end_date})'

    @property
    def customer(self):
        """Wlasciciel sprzetu. Czytany ze zlecenia, zeby nie rozjechal sie z nim po zmianie."""
        return self.repair_order.customer

    @property
    def tag(self):
        """Numer naklejki przypietej do sprzetu - fizyczny identyfikator w magazynie."""
        return self.repair_order.bike_tag_number

    @property
    def is_overdue(self):
        """Sprzet lezy dluzej, niz ustalono. Liczone z daty, wiec nie moze byc statusem."""
        return self.status == self.STATUS_STORED and self.end_date < date.today()

    def clean(self):
        super().clean()
        errors = {}

        if self.start_date and self.end_date and self.end_date < self.start_date:
            errors['end_date'] = 'Data konca pobytu nie moze byc wczesniejsza niz data poczatku.'

        if self.repair_order_id and self.bike_id:
            if not self.repair_order.bikes.filter(pk=self.bike_id).exists():
                errors['bike'] = 'Ten sprzet nie jest przypiety do wskazanego zlecenia.'

        if not errors and self.bike_id and self.start_date and self.end_date:
            if self.status in self.ACTIVE_STATUSES and self.overlapping().exists():
                errors['start_date'] = 'Ten sprzet ma juz przechowanie w zachodzacym terminie.'

        if errors:
            raise ValidationError(errors)

    def overlapping(self):
        """Aktywne pobyty tej samej sztuki nachodzace na termin tego pobytu.

        Zakresy sa domkniete obustronnie, wiec pobyt konczacy sie 31.03 i zaczynajacy sie
        01.04 nie koliduja, a stykajace sie tego samego dnia - tak.
        """
        qs = StorageBooking.objects.filter(
            bike_id=self.bike_id,
            status__in=self.ACTIVE_STATUSES,
            start_date__lte=self.end_date,
            end_date__gte=self.start_date,
        )
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        return qs


class StorageEvent(models.Model):
    """Log audytowy przechowania - kto, kiedy i co zrobil z rezerwacja."""

    EVENT_RESERVE = 'reserve'
    EVENT_CHECK_IN = 'check_in'
    EVENT_CHECK_OUT = 'check_out'
    EVENT_EXTEND = 'extend'
    # Wplaty przeniosly sie na zlecenie - typ zostaje tylko dla starych wpisow w logu.
    EVENT_PAYMENT = 'payment'
    EVENT_CANCEL = 'cancel'
    EVENT_UPDATE = 'update'
    EVENT_CHOICES = [
        (EVENT_RESERVE, 'Rezerwacja'),
        (EVENT_CHECK_IN, 'Przyjecie'),
        (EVENT_CHECK_OUT, 'Wydanie'),
        (EVENT_EXTEND, 'Przedluzenie'),
        (EVENT_PAYMENT, 'Wplata'),
        (EVENT_CANCEL, 'Anulowanie'),
        (EVENT_UPDATE, 'Edycja'),
    ]

    # PROTECT: rezerwacji z historia nie usuwamy (od tego jest anulowanie), wiec log
    # nie moze zniknac razem z nia.
    booking = models.ForeignKey(StorageBooking, on_delete=models.PROTECT, related_name='events')
    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        verbose_name = 'Zdarzenie przechowania'
        verbose_name_plural = 'Zdarzenia przechowania'

    def __str__(self):
        return f'{self.get_event_type_display()} - {self.booking}'
