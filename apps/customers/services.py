from .models import Customer


def find_existing_customer(phone, rodo_accepted=False):
    """Customer already registered under `phone` (in any notation), or None.

    The existing record is returned as it is - name and email typed into the new form
    don't overwrite it. The one exception is a freshly signed RODO consent.
    """
    if not isinstance(phone, str) or not phone.strip():
        return None
    # PhoneNumberField normalizes the lookup value, so `504 991 254` matches `+48504991254`.
    customer = Customer.objects.filter(phone=phone.strip()).first()
    if customer and rodo_accepted and not customer.rodo_accepted:
        customer.rodo_accepted = True
        customer.save(update_fields=['rodo_accepted'])
    return customer
