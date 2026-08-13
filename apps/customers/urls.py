from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, BikeCreateView, BikeLookupView

router = DefaultRouter()
router.register('', CustomerViewSet, basename='customer')

urlpatterns = [
    path('bikes/lookup/', BikeLookupView.as_view(), name='bike-lookup'),
    path('bikes/', BikeCreateView.as_view(), name='bike-create'),
] + router.urls
