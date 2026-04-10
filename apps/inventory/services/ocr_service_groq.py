import base64
import json
import re

import httpx
from django.conf import settings

from apps.inventory.models import Invoice, Part, StockMovement
from django.db import transaction

GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

EXTRACTION_PROMPT = """
Extract invoice data from this image and return ONLY valid JSON (no markdown, no explanation) matching exactly this schema:
{
  "invoice_number": "string or empty string",
  "invoice_date": "YYYY-MM-DD or null",
  "total_amount": number or null,
  "items": [
    {
      "description": "string",
      "sku": "string or empty string",
      "quantity": number,
      "unit_cost": number
    }
  ]
}
"""


def _encode_image(image_field) -> tuple[str, str]:
    name = image_field.name.lower()
    if name.endswith('.png'):
        mime = 'image/png'
    elif name.endswith('.webp'):
        mime = 'image/webp'
    else:
        mime = 'image/jpeg'
    with image_field.open('rb') as f:
        return base64.b64encode(f.read()).decode(), mime


def _extract_json(text: str) -> dict:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError('No JSON object found in Groq response')


def parse_invoice(invoice_id: int) -> dict:
    invoice = Invoice.objects.get(pk=invoice_id)
    invoice.status = 'processing'
    invoice.save(update_fields=['status'])

    try:
        b64, mime = _encode_image(invoice.image)
        payload = {
            'model': GROQ_MODEL,
            'messages': [{
                'role': 'user',
                'content': [
                    {'type': 'image_url', 'image_url': {'url': f'data:{mime};base64,{b64}'}},
                    {'type': 'text', 'text': EXTRACTION_PROMPT},
                ],
            }],
            'max_tokens': 2000,
        }
        headers = {'Authorization': f'Bearer {settings.GROQ_API_KEY}'}

        with httpx.Client(timeout=60) as client:
            response = client.post(GROQ_ENDPOINT, json=payload, headers=headers)
            response.raise_for_status()

        raw_text = response.json()['choices'][0]['message']['content']
        parsed = _extract_json(raw_text)

        invoice.raw_ocr_text = raw_text
        invoice.parsed_data = parsed
        invoice.invoice_number = parsed.get('invoice_number', '')
        invoice.invoice_date = parsed.get('invoice_date')
        invoice.total_amount = parsed.get('total_amount')
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
