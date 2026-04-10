from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, SupplierViewSet, PartViewSet, InvoiceViewSet, StockMovementViewSet

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('suppliers', SupplierViewSet, basename='supplier')
router.register('parts', PartViewSet, basename='part')
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('movements', StockMovementViewSet, basename='stockmovement')

urlpatterns = router.urls
