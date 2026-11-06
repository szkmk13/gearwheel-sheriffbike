from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .catalog import BASE_CATALOG_SKUS, POPULAR_FILL_EXCLUDED_SKUS
from .models import Category, Supplier, Part, Invoice, StockMovement
from .serializers import (
    CategorySerializer, SupplierSerializer,
    PartListSerializer, PartDetailSerializer,
    InvoiceListSerializer, InvoiceDetailSerializer,
    StockMovementSerializer,
)
from .services import get_ocr_service


class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ['name']


class SupplierViewSet(ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    search_fields = ['name', 'email']


class PartViewSet(ModelViewSet):
    queryset = Part.objects.select_related('category', 'supplier').all()
    # `?search=` po nazwie i SKU zasila wyszukiwarkę pozycji na zleceniu (z `is_active=true`).
    filterset_fields = ['kind', 'is_active', 'category', 'supplier']
    search_fields = ['name', 'sku', 'barcode']
    ordering_fields = ['name', 'stock_quantity']
    POPULAR_LIMIT = 8
    POPULAR_DAYS = 90

    def get_serializer_class(self):
        if self.action == 'list':
            return PartListSerializer
        return PartDetailSerializer

    @action(detail=False, methods=['get'], url_path='popular')
    def popular(self, request):
        """Najczęściej dodawane do zleceń aktywne pozycje z ostatnich POPULAR_DAYS dni.

        Gdy historii jest za mało, resztę listy dopełnia katalog bazowy w kolejności z catalog.py.
        """
        try:
            limit = min(max(int(request.query_params.get('limit', self.POPULAR_LIMIT)), 1), 50)
        except ValueError:
            limit = self.POPULAR_LIMIT
        since = timezone.now() - timedelta(days=self.POPULAR_DAYS)
        active = Part.objects.filter(is_active=True)

        parts = list(
            active.annotate(uses=Count('repairorderitem', filter=Q(repairorderitem__created_at__gte=since)))
            .filter(uses__gt=0)
            .order_by('-uses', 'name')[:limit]
        )
        if len(parts) < limit:
            taken = {part.pk for part in parts}
            fill = {
                part.sku: part
                for part in active.filter(sku__in=BASE_CATALOG_SKUS).exclude(pk__in=taken)
                .exclude(sku__in=POPULAR_FILL_EXCLUDED_SKUS)
            }
            parts += [fill[sku] for sku in BASE_CATALOG_SKUS if sku in fill][:limit - len(parts)]
        return Response(PartListSerializer(parts, many=True).data)

    @action(detail=True, methods=['get'], url_path='movements')
    def movements(self, request, pk=None):
        part = self.get_object()
        qs = part.movements.all()
        return Response(StockMovementSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='available')
    def available(self, request):
        qs = self.filter_queryset(self.get_queryset().filter(stock_quantity__gt=0))
        page = self.paginate_queryset(qs)
        serializer = PartListSerializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class InvoiceViewSet(ModelViewSet):
    queryset = Invoice.objects.select_related('supplier', 'uploaded_by').all()
    filterset_fields = ['status', 'supplier']
    ordering_fields = ['created_at', 'invoice_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceDetailSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='parse')
    def parse(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status not in ('uploaded', 'failed'):
            return Response(
                {'detail': f'Cannot parse invoice with status "{invoice.status}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            svc = get_ocr_service()
            parsed = svc.parse_invoice(invoice.pk)
            return Response(parsed)
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm(self, request, pk=None):
        invoice = self.get_object()
        try:
            svc = get_ocr_service()
            svc.confirm_invoice(invoice.pk)
            invoice.refresh_from_db()
            return Response(InvoiceDetailSerializer(invoice).data)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class StockMovementViewSet(ModelViewSet):
    queryset = StockMovement.objects.select_related('part').all()
    serializer_class = StockMovementSerializer
    filterset_fields = ['part', 'movement_type', 'invoice', 'repair_order']
    ordering_fields = ['created_at']
    http_method_names = ['get', 'head', 'options']  # read-only; mutations go through order/invoice flows
