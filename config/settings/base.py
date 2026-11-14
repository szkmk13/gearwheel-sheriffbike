import environ
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # third-party
    'rest_framework',
    'django_filters',
    'corsheaders',
    'drf_spectacular',
    'django_vite',
    'phonenumber_field',
    # local
    'apps.customers',
    'apps.orders',
    'apps.appointments',
    'apps.inventory',
    'apps.storage',
    'apps.landing',
    'apps.core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': env.db('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}')
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Europe/Warsaw'

# Numery wpisane bez prefiksu kraju (np. `504 991 254`) traktujemy jako polskie.
PHONENUMBER_DEFAULT_REGION = 'PL'

USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DJANGO_VITE = {
    'default': {
        'dev_mode': DEBUG,
        'dev_server_port': 5173,
        'manifest_path': BASE_DIR / 'static' / 'frontend' / '.vite' / 'manifest.json',
        'static_url_prefix': 'frontend',
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SPECTACULAR_SETTINGS = {
    'TITLE': 'Gearwheel Sherifbike API',
    'DESCRIPTION': 'System zarządzania warsztatem rowerowym',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    # Several models call their state field `status`, so without explicit names
    # drf-spectacular emits hash-suffixed enums (StatusC7bEnum) that change shape
    # whenever a choice list is edited - useless for a generated client.
    'ENUM_NAME_OVERRIDES': {
        'RepairOrderStatusEnum': 'apps.orders.models.RepairOrder.STATUS_CHOICES',
        'StorageBookingStatusEnum': 'apps.storage.models.StorageBooking.STATUS_CHOICES',
        'StorageEventTypeEnum': 'apps.storage.models.StorageEvent.EVENT_CHOICES',
    },
}

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'config.exceptions.exception_handler',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    # Staff only: the panel is the shop's internal tool, so a plain (non-staff)
    # Django account must not reach customer data even with a valid session.
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAdminUser',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    # Throttles are opted into per view (ScopedRateThrottle + throttle_scope),
    # only on the public endpoints an anonymous visitor can hammer.
    'DEFAULT_THROTTLE_RATES': {
        'login': '5/min',
        'contact_form': '5/hour',
    },
    # Gunicorn sits behind exactly one nginx, over a unix socket (so REMOTE_ADDR
    # is empty). With NUM_PROXIES set, DRF takes the client IP nginx appended to
    # X-Forwarded-For instead of trusting the whole, client-controlled header.
    'NUM_PROXIES': 1,
}

GROQ_API_KEY = env('GROQ_API_KEY', default='')
OCR_BACKEND = env('OCR_BACKEND', default='groq')

# Contact/booking form (frontend BookingForm -> POST /api/contact_form/)
# The Turnstile *site* key is public and lives in frontend/.env as
# VITE_TURNSTILE_SITE_KEY, not here - only the secret key is sensitive.
TURNSTILE_SECRET_KEY = env('TURNSTILE_SECRET_KEY', default='')

# Google Sheets destination for leads, via a service account that's been
# shared (Editor) on the target spreadsheet. GOOGLE_SERVICE_ACCOUNT_FILE
# (path to the downloaded key JSON) takes precedence over
# GOOGLE_SERVICE_ACCOUNT_JSON (the same credentials inlined as one line).
GOOGLE_SHEETS_SPREADSHEET_ID = env('GOOGLE_SHEETS_SPREADSHEET_ID', default='')
GOOGLE_SHEETS_WORKSHEET_NAME = env('GOOGLE_SHEETS_WORKSHEET_NAME', default='Zgłoszenia')
GOOGLE_SERVICE_ACCOUNT_FILE = env('GOOGLE_SERVICE_ACCOUNT_FILE', default='')
GOOGLE_SERVICE_ACCOUNT_JSON = env('GOOGLE_SERVICE_ACCOUNT_JSON', default='')

# Google reviews on the landing page (GET /api/reviews/), via the Places API
# (New). This key is server-side only - it must not be exposed to the browser.
# Restrict it in Google Cloud to the Places API alone. GOOGLE_PLACE_ID is the
# shop's Place ID (looks like ChIJ...), not the CID from a Maps embed URL.
# Leave either blank and the endpoint reports source="fallback" and the
# frontend keeps using its own numbers.
GOOGLE_PLACES_API_KEY = env('GOOGLE_PLACES_API_KEY', default='')
GOOGLE_PLACE_ID = env('GOOGLE_PLACE_ID', default='')

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])

# Session auth: the SPA logs in at /api/auth/login/, which starts a Django session.
# SESSION_SAVE_EVERY_REQUEST makes the expiry a sliding window measured from the
# last request, so someone working all day stays logged in while a machine left
# alone overnight does not. CSRF_COOKIE_HTTPONLY stays False on purpose - the
# frontend has to read the csrftoken cookie to echo it back as X-CSRFToken.
SESSION_COOKIE_AGE = 60 * 60 * 12  # 12 h
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = not DEBUG

# Gunicorn speaks plain HTTP to nginx over a unix socket, so without this Django
# treats every production request as insecure: it would then compare an incoming
# `Origin: https://...` against its own `http://...` and reject every unsafe
# method as a CSRF failure. Nginx already sets the header (deploy/nginx.conf.example).
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Off by default so an HTTP-only deploy doesn't lock itself out. Turn on only
# once the site is reachable exclusively over HTTPS - browsers remember HSTS
# for SECURE_HSTS_SECONDS and refuse plain HTTP for that long.
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=False)
SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=0)

# Error alerts by email (Gmail SMTP). EMAIL_HOST_PASSWORD is a Google *app
# password* (account with 2FA -> Security -> App passwords), not the account
# password. With ADMIN_EMAILS empty nothing is sent, so local/CI need no setup.
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default=EMAIL_HOST_USER or 'webmaster@localhost')
SERVER_EMAIL = DEFAULT_FROM_EMAIL
EMAIL_SUBJECT_PREFIX = '[Sheriff Bike] '
ADMINS = [(email, email) for email in env.list('ADMIN_EMAILS', default=[])]

# Backups (python manage.py backup_db, run daily by deploy/gearwheel-backup.timer).
# BACKUP_DIR must be excluded from the deploy rsync (it is: backups/).
# BACKUP_RCLONE_REMOTE is an rclone target such as `gdrive:sheriff-bike-backups`;
# HEALTHCHECK_PING_URL is a healthchecks.io check URL pinged after each backup.
BACKUP_DIR = env.path('BACKUP_DIR', default=BASE_DIR / 'backups')
BACKUP_RCLONE_REMOTE = env('BACKUP_RCLONE_REMOTE', default='')
HEALTHCHECK_PING_URL = env('HEALTHCHECK_PING_URL', default='')

# Unhandled view exceptions (500s) get logged with a traceback to stderr,
# which systemd captures into `journalctl --user -u gearwheel.service`, and
# are also emailed to ADMINS (only when DEBUG=False). ERROR records from our
# own apps (e.g. a failed backup) are emailed the same way.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        # Our own apps, e.g. the mock SMS gateway logs each message it would send.
        'apps': {
            'handlers': ['console', 'mail_admins'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
