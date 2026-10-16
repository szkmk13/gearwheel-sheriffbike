from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import OccupancyView, StorageBookingViewSet, StorageDashboardView, StorageIntakeView

router = DefaultRouter()
router.register('bookings', StorageBookingViewSet, basename='storagebooking')

urlpatterns = [
    path('occupancy/', OccupancyView.as_view(), name='storage-occupancy'),
    path('intake/', StorageIntakeView.as_view(), name='storage-intake'),
    path('dashboard/', StorageDashboardView.as_view(), name='storage-dashboard'),
] + router.urls
