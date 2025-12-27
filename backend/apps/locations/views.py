"""
Views para Locations
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count

from .models import Company, Sector, Subsection, LocationContact
from .serializers import (
    CompanySerializer, CompanyListSerializer, CompanyTreeSerializer,
    SectorSerializer, SectorListSerializer,
    SubsectionSerializer, SubsectionListSerializer,
    LocationContactSerializer, LocationTreeResponseSerializer
)


class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet para Empresas."""
    
    queryset = Company.objects.prefetch_related('sectors', 'contacts')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'is_active': ['exact'],
        'city': ['exact', 'icontains'],
        'state': ['exact'],
    }
    search_fields = ['name', 'code', 'cnpj', 'city']
    ordering_fields = ['name', 'city', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return CompanyListSerializer
        if self.action == 'tree':
            return CompanyTreeSerializer
        return CompanySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Anotar contagens
        queryset = queryset.annotate(
            _sector_count=Count('sectors', distinct=True)
        )
        return queryset

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """
        Retorna árvore hierárquica de localizações.
        Estrutura: Companies > Sectors > Subsections
        """
        companies = Company.objects.filter(is_active=True).prefetch_related(
            'sectors__subsections'
        )
        
        # Contagens totais
        total_sectors = Sector.objects.filter(is_active=True).count()
        total_subsections = Subsection.objects.filter(is_active=True).count()
        
        # Contar ativos (se o app assets existir)
        try:
            from apps.assets.models import Asset
            total_assets = Asset.objects.count()
        except ImportError:
            total_assets = 0
        
        serializer = CompanyTreeSerializer(companies, many=True)
        
        return Response({
            'companies': serializer.data,
            'total_companies': companies.count(),
            'total_sectors': total_sectors,
            'total_subsections': total_subsections,
            'total_assets': total_assets,
        })

    @action(detail=True, methods=['get', 'post'])
    def contacts(self, request, pk=None):
        """Lista ou adiciona contatos da empresa."""
        company = self.get_object()
        
        if request.method == 'POST':
            serializer = LocationContactSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        contacts = company.contacts.all()
        serializer = LocationContactSerializer(contacts, many=True)
        return Response(serializer.data)


class SectorViewSet(viewsets.ModelViewSet):
    """ViewSet para Setores."""
    
    queryset = Sector.objects.select_related('company', 'supervisor').prefetch_related(
        'subsections', 'contacts'
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'is_active': ['exact'],
        'company': ['exact'],
        'floor': ['exact', 'icontains'],
        'building': ['exact', 'icontains'],
    }
    search_fields = ['name', 'code', 'building', 'area']
    ordering_fields = ['name', 'company', 'created_at']
    ordering = ['company', 'name']

    def get_serializer_class(self):
        if self.action == 'list':
            return SectorListSerializer
        return SectorSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.annotate(
            _subsection_count=Count('subsections', distinct=True)
        )
        return queryset

    @action(detail=True, methods=['get', 'post'])
    def contacts(self, request, pk=None):
        """Lista ou adiciona contatos do setor."""
        sector = self.get_object()
        
        if request.method == 'POST':
            serializer = LocationContactSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(sector=sector)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        contacts = sector.contacts.all()
        serializer = LocationContactSerializer(contacts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def subsections(self, request, pk=None):
        """Lista subseções do setor."""
        sector = self.get_object()
        subsections = sector.subsections.filter(is_active=True)
        serializer = SubsectionListSerializer(subsections, many=True)
        return Response(serializer.data)


class SubsectionViewSet(viewsets.ModelViewSet):
    """ViewSet para Subseções."""
    
    queryset = Subsection.objects.select_related(
        'sector', 'sector__company'
    ).prefetch_related('contacts')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'is_active': ['exact'],
        'sector': ['exact'],
        'sector__company': ['exact'],
    }
    search_fields = ['name', 'code', 'position', 'reference']
    ordering_fields = ['name', 'sector', 'created_at']
    ordering = ['sector', 'name']

    def get_serializer_class(self):
        if self.action == 'list':
            return SubsectionListSerializer
        return SubsectionSerializer

    @action(detail=True, methods=['get', 'post'])
    def contacts(self, request, pk=None):
        """Lista ou adiciona contatos da subseção."""
        subsection = self.get_object()
        
        if request.method == 'POST':
            serializer = LocationContactSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(subsection=subsection)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        contacts = subsection.contacts.all()
        serializer = LocationContactSerializer(contacts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def assets(self, request, pk=None):
        """Lista ativos da subseção."""
        subsection = self.get_object()
        
        try:
            from apps.assets.models import Asset
            from apps.assets.serializers import AssetListSerializer
            
            assets = Asset.objects.filter(subsection=subsection)
            serializer = AssetListSerializer(assets, many=True)
            return Response(serializer.data)
        except ImportError:
            return Response({'error': 'App assets não disponível'}, status=400)


class LocationContactViewSet(viewsets.ModelViewSet):
    """ViewSet para Contatos de Localização."""
    
    queryset = LocationContact.objects.select_related(
        'company', 'sector', 'subsection'
    )
    serializer_class = LocationContactSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {
        'type': ['exact', 'in'],
        'company': ['exact'],
        'sector': ['exact'],
        'subsection': ['exact'],
    }
    search_fields = ['name', 'email', 'phone']
