"""
Tenant discovery view - identifica tenant pelo email sem exigir senha.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django_tenants.utils import schema_context

from apps.accounts.models import TenantMembership, User


class TenantDiscoveryView(APIView):
    """
    Descobre qual tenant um email pertence (sem exigir senha).
    
    POST /api/auth/discover-tenant/
    {
        "email": "user@example.com"
    }
    
    Response:
    {
        "found": true,
        "email": "user@example.com",
        "tenants": [
            {
                "schema_name": "UMC",
                "slug": "umc",
                "name": "Uberlandia Medical Center"
            }
        ],
        "primary_tenant": {
            "schema_name": "UMC",
            "slug": "umc",
            "name": "Uberlandia Medical Center"
        }
    }
    
    Ou se não encontrado:
    {
        "found": false,
        "email": "user@example.com"
    }
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response(
                {'error': 'Email é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar usuário no public schema
        with schema_context('public'):
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                return Response({
                    'found': False,
                    'email': email,
                    'message': 'Nenhuma conta encontrada com este email.'
                })
            
            # Buscar todos os tenants do usuário
            memberships = TenantMembership.objects.filter(
                user=user,
                status='active'
            ).select_related('tenant').order_by('joined_at')
            
            if not memberships.exists():
                return Response({
                    'found': False,
                    'email': email,
                    'message': 'Usuário encontrado mas sem acesso a nenhum tenant.'
                })
            
            # Montar lista de tenants
            tenants_data = []
            for membership in memberships:
                tenants_data.append({
                    'schema_name': membership.tenant.schema_name,
                    'slug': membership.tenant.slug,
                    'name': membership.tenant.name,
                })
            
            # Tenant primário é o primeiro (joined_at mais antigo)
            primary_tenant = tenants_data[0]
            
            return Response({
                'found': True,
                'email': email,
                'tenants': tenants_data,
                'primary_tenant': primary_tenant,
                'has_multiple_tenants': len(tenants_data) > 1,
            })
