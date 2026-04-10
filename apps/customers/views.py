from rest_framework.viewsets import ModelViewSet
from .models import Customer, Bike
from .serializers import CustomerListSerializer, CustomerDetailSerializer, BikeSerializer


class CustomerViewSet(ModelViewSet):
    queryset = Customer.objects.all()
    filterset_fields = ['email']
    search_fields = ['first_name', 'last_name', 'phone', 'email']
    ordering_fields = ['last_name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        return CustomerDetailSerializer


class BikeViewSet(ModelViewSet):
    queryset = Bike.objects.select_related('customer').all()
    serializer_class = BikeSerializer
    filterset_fields = ['customer', 'bike_type']
    search_fields = ['brand', 'model', 'serial_no']
