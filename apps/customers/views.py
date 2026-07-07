import uuid

from rest_framework.decorators import action
from rest_framework.response import Response
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

    @action(detail=False, methods=['get'], url_path='lookup')
    def lookup(self, request):
        code = request.query_params.get('code', '').strip()

        prefix = 'sheriff-'
        rest = code[len(prefix):] if code.startswith(prefix) else ''
        bike_id, _, bike_uuid = rest.partition('-')

        bike = None
        if bike_id.isdigit() and bike_uuid:
            try:
                bike_uuid = uuid.UUID(bike_uuid)
            except ValueError:
                bike_uuid = None
            if bike_uuid:
                bike = Bike.objects.filter(pk=bike_id, uuid=bike_uuid).select_related('customer').first()

        if not bike:
            return Response({'detail': 'Nie znaleziono roweru dla podanego kodu.'}, status=404)

        serializer = self.get_serializer(bike)
        return Response(serializer.data)
