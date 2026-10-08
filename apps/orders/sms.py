"""Outbound SMS to customers.

`send_sms` is a mock for now: it only logs the message and reports it as sent. Wiring up a
real gateway (SMSAPI, SerwerSMS, ...) means replacing that one function - callers rely only
on the result dict it returns.
"""

import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

SHOP_NAME = 'Sheriff Bike'


def _format_amount(amount: Decimal) -> str:
    """250.00 -> '250 zł', 249.50 -> '249,50 zł'."""
    if amount == amount.to_integral_value():
        return f'{int(amount)} zł'
    return f'{amount:.2f}'.replace('.', ',') + ' zł'


def build_ready_for_pickup_message(order) -> str:
    """Suggested text for the ready-for-pickup SMS; staff can edit it before sending.

    It uses Polish characters, which switches the SMS to UCS-2 encoding: 70 characters for
    a single message, 67 per part once it is split - so this text is usually billed as 2 SMS.
    """
    parts = [f'{SHOP_NAME}: Dzień dobry! Państwa sprzęt (zawieszka #{order.bike_tag_number}) '
             'jest gotowy do odbioru.']
    amount = order.final_cost if order.final_cost is not None else order.estimated_cost
    if amount is not None:
        parts.append(f'Do zapłaty: {_format_amount(amount)}.')
    parts.append('Zapraszamy!')
    return ' '.join(parts)


def send_sms(phone: str, message: str) -> dict:
    """Mock gateway - logs instead of sending. Never raises on a delivery problem."""
    if not phone or not phone.strip():
        return {'sent': False, 'mocked': True, 'to': '', 'message': message,
                'error': 'Klient nie ma numeru telefonu.'}
    logger.info('SMS (mock) to %s: %s', phone, message)
    return {'sent': True, 'mocked': True, 'to': phone, 'message': message, 'error': None}
