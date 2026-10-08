from django.db.models import F
from django.utils import timezone
from django_filters import rest_framework as filters

from apps.customers.models import Bike
# Te same widgety co przy zleceniach - `?status=a,b` i `?status=a&status=b` maja
# dzialac tak samo w calym API.
from apps.orders.filters import ChoiceInFilter

from .models import StorageBooking


class StorageBookingFilter(filters.FilterSet):
    status = ChoiceInFilter(
        field_name='status',
        choices=StorageBooking.STATUS_CHOICES,
        label='Status',
        help_text='Jeden status lub kilka po przecinku, np. `status=reserved,stored`.',
    )
    category = ChoiceInFilter(
        field_name='bike__category',
        choices=Bike.CATEGORY_CHOICES,
        label='Kategoria sprzetu',
        help_text='Kategoria przechowywanego sprzetu, np. `category=winter`.',
    )
    customer = filters.NumberFilter(
        field_name='repair_order__customer_id',
        label='Klient',
        help_text='ID klienta. Czytane ze zlecenia, bo to ono trzyma wlasciciela.',
    )
    start_after = filters.DateFilter(
        field_name='start_date', lookup_expr='gte',
        label='Poczatek pobytu od',
    )
    end_before = filters.DateFilter(
        field_name='end_date', lookup_expr='lte',
        label='Koniec pobytu do',
    )
    active_on = filters.DateFilter(
        method='filter_active_on',
        label='Aktywne w dniu',
        help_text='Pobyty obejmujace podany dzien (bez anulowanych i odebranych).',
    )
    overdue = filters.BooleanFilter(
        method='filter_overdue',
        label='Przeterminowane',
        help_text='Sprzet wciaz w magazynie, mimo ze termin odbioru minal.',
    )
    unpaid = filters.BooleanFilter(
        method='filter_unpaid',
        label='Nieoplacone',
        help_text='Rezerwacje z niezerowa kwota do zaplaty (anulowane pomijamy).',
    )

    class Meta:
        model = StorageBooking
        fields = ['status', 'category', 'customer', 'bike', 'repair_order',
                  'start_after', 'end_before', 'active_on', 'overdue', 'unpaid']

    def filter_active_on(self, queryset, name, value):
        return queryset.filter(
            status__in=StorageBooking.ACTIVE_STATUSES,
            start_date__lte=value,
            end_date__gte=value,
        )

    def filter_overdue(self, queryset, name, value):
        condition = {'status': StorageBooking.STATUS_STORED, 'end_date__lt': timezone.localdate()}
        return queryset.filter(**condition) if value else queryset.exclude(**condition)

    def filter_unpaid(self, queryset, name, value):
        settled = queryset.exclude(status=StorageBooking.STATUS_CANCELLED)
        if value:
            return settled.filter(paid_amount__lt=F('price'))
        return settled.filter(paid_amount__gte=F('price'))
