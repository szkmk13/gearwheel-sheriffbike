from django import forms
from django_filters import rest_framework as filters
from django_filters.widgets import BaseCSVWidget

from apps.customers.models import Bike

from .models import RepairOrder


class MultiValueCSVWidget(BaseCSVWidget, forms.TextInput):
    """
    Widget dla filtrów przyjmujących wiele wartości naraz.

    Obsługuje oba zapisy, jakich używają klienci API:
      * `?status=done,delivered` (lista po przecinku - tak wysyła frontend),
      * `?status=done&status=delivered` (powtórzony parametr).

    Domyślny BaseCSVWidget czyta tylko ostatnie wystąpienie parametru, więc przy
    drugim zapisie po cichu gubiłby część filtrów.
    """

    def value_from_datadict(self, data, files, name):
        if hasattr(data, 'getlist'):
            raw_values = data.getlist(name)
        else:
            value = data.get(name)
            raw_values = [] if value is None else [value]

        if not raw_values:
            return None

        # Pusta wartość (`?status=`) daje pustą listę - filtr jest wtedy pomijany.
        return [item.strip() for raw in raw_values for item in raw.split(',') if item.strip()]


class ChoiceInFilter(filters.BaseInFilter, filters.ChoiceFilter):
    """Filtr `pole IN (...)` walidujący każdą wartość z osobna względem `choices`."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('widget', MultiValueCSVWidget)
        super().__init__(*args, **kwargs)


class RepairOrderFilter(filters.FilterSet):
    status = ChoiceInFilter(
        field_name='status',
        choices=RepairOrder.STATUS_CHOICES,
        label='Status',
        help_text='Jeden status lub kilka po przecinku, np. `status=in_progress,waiting_parts`.',
    )
    priority = ChoiceInFilter(
        field_name='priority',
        choices=RepairOrder.PRIORITY_CHOICES,
        label='Priorytet',
        help_text='Jeden priorytet lub kilka po przecinku, np. `priority=normal,high`.',
    )

    # Matches the order's equipment set, so an order shows up for any item attached to
    # it - not just the one that happens to be first.
    bike = filters.NumberFilter(
        field_name='bikes',
        label='Sprzet',
        help_text='ID sprzetu (roweru lub sprzetu zimowego) przypietego do zlecenia.',
    )
    category = ChoiceInFilter(
        field_name='bikes__category',
        choices=Bike.CATEGORY_CHOICES,
        distinct=True,
        label='Kategoria sprzetu',
        help_text='Zlecenia zawierajace sprzet danej kategorii, np. `category=winter`.',
    )

    class Meta:
        model = RepairOrder
        fields = ['status', 'priority', 'customer', 'bike', 'category']
