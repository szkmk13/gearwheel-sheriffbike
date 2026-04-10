from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Appointment
from .serializers import AppointmentSerializer


class AppointmentViewSet(ModelViewSet):
    queryset = Appointment.objects.select_related('customer', 'bike', 'mechanic').all()
    serializer_class = AppointmentSerializer
    filterset_fields = ['status', 'mechanic', 'customer']
    search_fields = ['title', 'notes', 'customer__first_name', 'customer__last_name']
    ordering_fields = ['start_time']

    @action(detail=False, methods=['get'], url_path='by-date')
    def by_date(self, request):
        date = request.query_params.get('date')
        if not date:
            return Response({'detail': 'date query param required (YYYY-MM-DD).'}, status=400)
        qs = self.get_queryset().filter(start_time__date=date)
        return Response(AppointmentSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='by-mechanic')
    def by_mechanic(self, request):
        mechanic_id = request.query_params.get('mechanic')
        from_dt = request.query_params.get('from')
        to_dt = request.query_params.get('to')
        qs = self.get_queryset()
        if mechanic_id:
            qs = qs.filter(mechanic_id=mechanic_id)
        if from_dt:
            qs = qs.filter(start_time__gte=from_dt)
        if to_dt:
            qs = qs.filter(end_time__lte=to_dt)
        return Response(AppointmentSerializer(qs, many=True).data)
