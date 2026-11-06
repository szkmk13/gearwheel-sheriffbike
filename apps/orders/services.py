from decimal import Decimal

from django.db import transaction
from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.models import Part

from .models import RepairOrder, RepairOrderItem, StatusHistory
from .sms import build_ready_for_pickup_message, send_sms

READY_FOR_PICKUP = 'done'


def change_order_status(order, new_status, user, note=''):
    """Moves the order to `new_status` and records the change in its status history.

    Never texts the customer - the ready-for-pickup SMS is a separate, explicit step
    (`send_ready_for_pickup_sms`) after staff have reviewed the message.
    """
    with transaction.atomic():
        StatusHistory.objects.create(
            repair_order=order,
            old_status=order.status,
            new_status=new_status,
            changed_by=user,
            note=note,
        )
        order.status = new_status
        if new_status == 'accepted' and not order.accepted_at:
            order.accepted_at = timezone.now()
        if new_status == 'delivered' and not order.delivered_at:
            order.delivered_at = timezone.now()
        order.save()


def ready_for_pickup_sms_preview(order):
    """Number and suggested text of the ready-for-pickup SMS, or None if the order isn't ready."""
    if order.status != READY_FOR_PICKUP:
        return None
    return {'to': str(order.customer.phone), 'message': build_ready_for_pickup_message(order)}


class SmsNotAllowed(Exception):
    pass


def send_ready_for_pickup_sms(order, message):
    """Texts the customer that the order can be collected and notes it in the status history.

    Raises SmsNotAllowed when the order is not ready for pickup. Returns the gateway result
    (see `sms.send_sms`); a failed delivery is reported there, not raised.
    """
    if order.status != READY_FOR_PICKUP:
        raise SmsNotAllowed('SMS o odbiorze mozna wyslac tylko dla zlecenia gotowego do odbioru.')

    result = send_sms(str(order.customer.phone), message)
    if result['sent']:
        suffix = ' (symulacja)' if result['mocked'] else ''
        entry = order.status_history.filter(new_status=READY_FOR_PICKUP).order_by('-changed_at', '-pk').first()
        if entry:
            sms_note = f'SMS do {result["to"]}{suffix}'
            entry.note = f'{entry.note}\n{sms_note}' if entry.note else sms_note
            entry.save(update_fields=['note'])
    return result


# Wydanego ani anulowanego zlecenia nie przeliczamy - jego kwota jest już zamknięta.
ITEMS_LOCKED_STATUSES = ('delivered', 'cancelled')

LINE_TOTAL = ExpressionWrapper(
    F('quantity') * F('unit_price'), output_field=DecimalField(max_digits=12, decimal_places=2),
)


def _ensure_items_editable(order):
    if order.status in ITEMS_LOCKED_STATUSES:
        raise ValidationError(
            {'detail': f'Pozycji zlecenia o statusie "{order.get_status_display()}" nie można zmieniać.'}
        )


def recalculate_final_cost(order):
    """`final_cost` to suma pozycji (ilość x cena); bez pozycji - brak kwoty (null)."""
    total = order.items.aggregate(total=Sum(LINE_TOTAL))['total']
    order.final_cost = None if total is None else Decimal(total).quantize(Decimal('0.01'))
    RepairOrder.objects.filter(pk=order.pk).update(final_cost=order.final_cost, updated_at=timezone.now())
    return order.final_cost


@transaction.atomic
def add_item(order, *, part=None, item_type=None, description='', quantity=Decimal('1'),
             unit_price=None, save_to_catalog=False):
    """Dopisuje pozycję do zlecenia.

    Z katalogu (`part`): opis, rodzaj i cena kopiują się z pozycji katalogu, chyba że podano
    własne. Bez `part` to pozycja jednorazowa - opis, rodzaj i cena są wtedy wymagane, a
    `save_to_catalog` dodaje ją przy okazji do katalogu (albo podpina istniejącą o tej nazwie).

    Pozycja katalogu, która już jest na zleceniu, nie tworzy nowej linii - ilość dopisuje się
    do istniejącej (pierwszej, gdyby było ich kilka), a jej cena zostaje bez zmian, więc ręczny
    rabat obejmuje też kolejne sztuki. Zwrócona linia ma wtedy `merged = True`.
    """
    _ensure_items_editable(order)
    description = (description or '').strip()

    if part is None:
        errors = {}
        if not description:
            errors['description'] = 'Podaj opis pozycji.'
        if unit_price is None:
            errors['unit_price'] = 'Podaj cenę pozycji.'
        if not item_type:
            errors['item_type'] = 'Wybierz rodzaj pozycji.'
        if errors:
            raise ValidationError(errors)
        if save_to_catalog:
            part = Part.objects.filter(name__iexact=description, is_active=True).first()
            if part is None:
                part = Part.objects.create(
                    kind=item_type, name=description, unit='szt.', sell_price=unit_price,
                )
    else:
        description = description or part.name
        item_type = item_type or part.kind
        if unit_price is None:
            unit_price = part.sell_price if part.sell_price is not None else Decimal('0.00')

    existing = order.items.filter(part=part).order_by('id').first() if part is not None else None
    if existing is not None:
        existing.quantity += Decimal(quantity)
        existing.save(update_fields=['quantity'])
        existing.merged = True
        recalculate_final_cost(order)
        return existing

    item = RepairOrderItem.objects.create(
        repair_order=order, part=part, item_type=item_type, description=description,
        quantity=quantity, unit_price=unit_price,
    )
    item.merged = False
    recalculate_final_cost(order)
    return item


@transaction.atomic
def update_item(item, **fields):
    """Poprawia opis, ilość, cenę albo rodzaj pozycji. Pozycja katalogu zostaje ta sama."""
    _ensure_items_editable(item.repair_order)
    for name in ('description', 'quantity', 'unit_price', 'item_type'):
        if name in fields:
            setattr(item, name, fields[name])
    item.description = item.description.strip()
    if not item.description:
        raise ValidationError({'description': 'Opis pozycji nie może być pusty.'})
    item.save()
    recalculate_final_cost(item.repair_order)
    return item


@transaction.atomic
def remove_item(item):
    order = item.repair_order
    _ensure_items_editable(order)
    item.delete()
    recalculate_final_cost(order)
