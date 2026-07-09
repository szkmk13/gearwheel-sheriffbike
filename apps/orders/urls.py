from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import RepairOrderViewSet, DashboardView

router = DefaultRouter()
router.register('orders', RepairOrderViewSet, basename='order')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
] + router.urls
