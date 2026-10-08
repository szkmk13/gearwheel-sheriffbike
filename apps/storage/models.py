from datetime import date
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

User = get_user_model()


def default_storage_price():
    """Cena przechowania brana z ustawien, zapisywana na rezerwacji jako snapshot.

    Jest to `default=` pola, a nie odczyt w locie - podniesienie cennika za rok nie moze
    przepisac kwot na rezerwacjach juz rozliczonych.
    """
    return Decimal(settings.STORAGE_DEFAULT_PRICE)


class StorageBooking(models.Model):
    """Pobyt jednej sztuki sprzetu w magazynie, od `start_date` do `end_date` wlacznie.

    Serwis nie ma ponumerowanych miejsc postojowych - pojemnosc jest miekka, pracownik
    widzi ja na miejscu - wiec model nie trzyma zadnego `location`. Fizycznie sztuke
    identyfikuje `bike_tag_number` ze zlecenia, stad `repair_order` jest obowiazkowe
    (kazdy sprzet jest w trakcie przechowania serwisowany i tak).

    Rozliczamy per sztuka, a jedno zlecenie moze objac kilka sztuk naraz (rower i dwie
    pary nart), dlatego rezerwacja wskazuje konkretny `bike` z tego zlecenia.
    """

    STATUS_RESERVED = 'reserved'
    STATUS_STORED = 'stored'
    STATUS_PICKED_UP = 'picked_up'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_RESERVED, 'Zarezerwowane'),
        (STATUS_STORED, 'W magazynie'),
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

    price = models.DecimalField(
        max_digits=8, decimal_places=2, default=default_storage_price,
        verbose_name='Cena',
        help_text='Kwota ustalona przy rezerwacji. Domyslnie z STORAGE_DEFAULT_PRICE.',
    )
    paid_amount = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0.00'), verbose_name='Zaplacono',
    )
    paid_at = models.DateTimeField(
        null=True, blank=True, verbose_name='Oplacone w calosci',
        help_text='Ustawiane automatycznie, gdy wplaty pokryja cala cene.',
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
            models.CheckConstraint(
                condition=Q(paid_amount__gte=Decimal('0.00')),
                name='storage_booking_paid_amount_not_negative',
            ),
            models.CheckConstraint(
                condition=Q(paid_amount__lte=F('price')),
                name='storage_booking_paid_amount_within_price',
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
    def balance_due(self):
        return self.price - self.paid_amount

    @property
    def is_paid(self):
        return self.paid_amount >= self.price

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

        if self.price is not None and self.paid_amount is not None and self.paid_amount > self.price:
            errors['paid_amount'] = 'Wplata nie moze przekroczyc ceny przechowania.'

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
    EVENT_PAYMENT = 'payment'
    EVENT_CANCEL = 'cancel'
    EVENT_CHOICES = [
        (EVENT_RESERVE, 'Rezerwacja'),
        (EVENT_CHECK_IN, 'Przyjecie'),
        (EVENT_CHECK_OUT, 'Wydanie'),
        (EVENT_EXTEND, 'Przedluzenie'),
        (EVENT_PAYMENT, 'Wplata'),
        (EVENT_CANCEL, 'Anulowanie'),
    ]

    booking = models.ForeignKey(StorageBooking, on_delete=models.CASCADE, related_name='events')
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
