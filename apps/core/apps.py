from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Operational plumbing with no models: health check and database backups."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
