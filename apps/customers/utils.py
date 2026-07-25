import base64
from io import BytesIO

import qrcode


def generate_qr_base64(data):
    img = qrcode.make(data)
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('ascii')
