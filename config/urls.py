from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include, re_path
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.permissions import AllowAny

from config.auth_views import (
    CookieTokenRefreshView,
    LoginView,
    LogoutView,
    MeView,
)

# ensure_csrf_cookie: the SPA is served from this shell with no server-rendered
# form, so nothing else would ever set the csrftoken cookie the frontend needs
# to send back as X-CSRFToken on unsafe API requests.
spa_view = ensure_csrf_cookie(TemplateView.as_view(template_name='home.html'))

# Everything but the homepage (/panel/*, etc.) is an internal staff app served
# from the same SPA shell - it must not be indexed, since it carries the same
# marketing title/meta and has nothing search engines should surface.
spa_view_noindex = ensure_csrf_cookie(
    TemplateView.as_view(template_name='home.html', extra_context={'noindex': True})
)


def robots_txt(request):
    # Only the homepage is public/marketing content - disallow everything else
    # (the SPA catch-all otherwise serves every path with a 200).
    content = "User-agent: *\nAllow: /$\nDisallow: /\n"
    return HttpResponse(content, content_type='text/plain')


_docs_view_kwargs = {'permission_classes': [AllowAny]} if settings.DEBUG else {}

urlpatterns = [
    path('robots.txt', robots_txt, name='robots-txt'),
    path('admin/', admin.site.urls),
    # Auth
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/me/', MeView.as_view(), name='me'),

    # Docs - public in DEBUG for local convenience, otherwise fall back to the
    # default IsAdminUser permission (schema shouldn't be world-readable in prod).
    path('api/schema/', SpectacularAPIView.as_view(**_docs_view_kwargs), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema', **_docs_view_kwargs), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema', **_docs_view_kwargs), name='redoc'),

    # Apps
    path('api/customers/', include('apps.customers.urls')),
    path('api/orders/', include('apps.orders.urls')),
    # path('api/appointments/', include('apps.appointments.urls')),
    # path('api/inventory/', include('apps.inventory.urls')),
    # path('api/storage/', include('apps.storage.urls')),
    path('api/', include('apps.landing.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA catch-all: any non-API/non-admin path is a client-side route handled by
# React Router, so serve the same shell here too (direct navigation, refresh).
urlpatterns += [
    path('', spa_view, name='home'),
    re_path(r'^(?!api/|admin/|static/|media/).*$', spa_view_noindex, name='spa'),
]
