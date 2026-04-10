from rest_framework.routers import DefaultRouter
from .views import RepairOrderViewSet

router = DefaultRouter()
router.register('orders', RepairOrderViewSet, basename='order')

urlpatterns = router.urls
