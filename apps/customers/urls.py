from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, BikeViewSet

router = DefaultRouter()
router.register('customers', CustomerViewSet, basename='customer')
router.register('bikes', BikeViewSet, basename='bike')

urlpatterns = router.urls
