from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.permissions import AllowAny

from config.auth_views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView,
    MeView,
)

spa_view = TemplateView.as_view(template_name='home.html')

_docs_view_kwargs = {'permission_classes': [AllowAny]} if settings.DEBUG else {}

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/logout/', LogoutView.as_view(), name='token_logout'),
    path('api/auth/me/', MeView.as_view(), name='me'),

    # Docs — public in DEBUG for local convenience, otherwise fall back to the
    # default IsAdminUser permission (schema shouldn't be world-readable in prod).
    path('api/schema/', SpectacularAPIView.as_view(**_docs_view_kwargs), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema', **_docs_view_kwargs), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema', **_docs_view_kwargs), name='redoc'),

    # Apps
    path('api/customers/', include('apps.customers.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/storage/', include('apps.storage.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA catch-all: any non-API/non-admin path is a client-side route handled by
# React Router, so serve the same shell here too (direct navigation, refresh).
urlpatterns += [
    path('', spa_view, name='home'),
    re_path(r'^(?!api/|admin/|static/|media/).*$', spa_view, name='spa'),
]
