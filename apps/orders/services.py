from django.db import transaction
from django.utils import timezone

from .models import StatusHistory
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
