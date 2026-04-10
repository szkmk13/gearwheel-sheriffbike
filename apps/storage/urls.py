from rest_framework.routers import DefaultRouter
from .views import StorageLocationViewSet, StorageRecordViewSet

router = DefaultRouter()
router.register('locations', StorageLocationViewSet, basename='storagelocation')
router.register('records', StorageRecordViewSet, basename='storagerecord')

urlpatterns = router.urls
