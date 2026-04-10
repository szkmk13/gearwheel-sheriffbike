from django.conf import settings

def get_ocr_service():
    backend = getattr(settings, 'OCR_BACKEND', 'groq')
    if backend == 'tesseract':
        from . import ocr_service_tesseract as svc
    else:
        from . import ocr_service_groq as svc
    return svc
