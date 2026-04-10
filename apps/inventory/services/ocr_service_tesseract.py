import re
from django.db import transaction

from apps.inventory.models import Invoice, Part, StockMovement

# Requires: pip install pytesseract Pillow
# Requires Tesseract binary: https://github.com/tesseract-ocr/tesseract
# Windows: choco install tesseract
# Ubuntu: apt install tesseract-ocr tesseract-ocr-pol


def _run_tesseract(image_field) -> str:
    import pytesseract
    from PIL import Image
    with image_field.open('rb') as f:
        img = Image.open(f)
        img.load()
    return pytesseract.image_to_string(img, lang='pol+eng')


def _parse_items(text: str) -> list[dict]:
    """
    Heuristic line-by-line parser. Works best with structured invoices
    where each line contains: description, quantity and price.
    Pattern: anything  <quantity>  <price>
    """
    items = []
    pattern = re.compile(
        r'^(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*(?:PLN|zł)?$',
        re.MULTILINE | re.IGNORECASE,
    )
    for match in pattern.finditer(text):
        description, qty_str, price_str = match.groups()
        items.append({
            'description': description.strip(),
            'sku': '',
            'quantity': float(qty_str.replace(',', '.')),
            'unit_cost': float(price_str.replace(',', '.')),
        })
    return items


def parse_invoice(invoice_id: int) -> dict:
    invoice = Invoice.objects.get(pk=invoice_id)
    invoice.status = 'processing'
    invoice.save(update_fields=['status'])

    try:
        raw_text = _run_tesseract(invoice.image)
        items = _parse_items(raw_text)

        invoice_number = ''
        m = re.search(r'(?:faktura|invoice|nr)[^\w]*([A-Z0-9/\-]+)', raw_text, re.IGNORECASE)
        if m:
            invoice_number = m.group(1)

        parsed = {
            'invoice_number': invoice_number,
            'invoice_date': None,
            'total_amount': None,
            'items': items,
        }

        invoice.raw_ocr_text = raw_text
        invoice.parsed_data = parsed
        invoice.invoice_number = invoice_number
        invoice.status = 'parsed'
        invoice.save()
        return parsed

    except Exception as exc:
        invoice.status = 'failed'
        invoice.raw_ocr_text = str(exc)
        invoice.save(update_fields=['status', 'raw_ocr_text'])
        raise


@transaction.atomic
def confirm_invoice(invoice_id: int) -> None:
    invoice = Invoice.objects.select_for_update().get(pk=invoice_id)
    if invoice.status != 'parsed':
        raise ValueError(f'Invoice must be in "parsed" state, got "{invoice.status}"')

    items = (invoice.parsed_data or {}).get('items', [])
    for item in items:
        sku = item.get('sku', '').strip()
        name = item.get('description', '').strip()
        quantity = item.get('quantity', 0)
        unit_cost = item.get('unit_cost')

        if sku:
            part, _ = Part.objects.get_or_create(sku=sku, defaults={'name': name})
        else:
            part, _ = Part.objects.get_or_create(name=name)

        StockMovement.objects.create(
            part=part,
            movement_type='in',
            quantity=quantity,
            unit_cost=unit_cost,
            invoice=invoice,
        )
        Part.objects.filter(pk=part.pk).update(stock_quantity=part.stock_quantity + quantity)

    invoice.status = 'confirmed'
    invoice.save(update_fields=['status'])
