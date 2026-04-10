from .base import *

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
]
