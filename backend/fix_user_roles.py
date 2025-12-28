#!/usr/bin/env python
"""
Script para sincronizar papéis de usuários do tenant schema para o public schema.

Este script corrige o problema onde:
- Usuários foram convidados com um papel (ex: admin)
- Mas aparecem como outro papel (ex: viewer) no sistema

Também limpa dados desnecessários do schema público (email_hint, display_name, tenant_user_id).

Execução:
    python backend/fix_user_roles.py [--tenant=TENANT_SCHEMA] [--dry-run]

Argumentos:
    --tenant: Schema do tenant específico (opcional, padrão: todos os tenants)
    --dry-run: Apenas mostra o que seria alterado sem fazer alterações
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context
from apps.tenants.models import Tenant
from apps.public_identity.models import compute_email_hash
from django.contrib.auth import get_user_model

User = get_user_model()


def sync_tenant_memberships(tenant, dry_run=False):
    """
    Sincronizar todos os TenantMembership de um tenant para o public schema.
    
    Args:
        tenant: Instância do Tenant
        dry_run: Se True, apenas mostra o que seria feito
    """
    print(f"\n{'='*80}")
    print(f"Processando tenant: {tenant.name} ({tenant.schema_name})")
    print(f"{'='*80}")
    
    try:
        with schema_context(tenant.schema_name):
            from apps.accounts.models import TenantMembership
            
            # Buscar todos os memberships ativos
            memberships = TenantMembership.objects.filter(
                status='active'
            ).select_related('user')
            
            count = 0
            updated = 0
            
            for membership in memberships:
                count += 1
                user = membership.user
                
                # Buscar o papel no public schema para comparar
                from apps.public_identity.models import (
                    TenantMembership as PublicTenantMembership,
                    TenantUserIndex,
                )
                
                email_hash = compute_email_hash(user.email)
                
                with schema_context('public'):
                    # Atualizar/criar TenantUserIndex (apenas email_hash + tenant)
                    index, index_created = TenantUserIndex.objects.update_or_create(
                        identifier_hash=email_hash,
                        tenant=tenant,
                        defaults={
                            'is_active': user.is_active,
                            # Limpar campos deprecated
                            'email_hint': None,
                            'tenant_user_id': None,
                        }
                    )
                    
                    if index_created:
                        print(f"  ➕ Criado index para {user.email}")
                    
                    # Atualizar/criar TenantMembership (apenas email_hash + tenant + role)
                    public_membership, membership_created = PublicTenantMembership.objects.update_or_create(
                        email_hash=email_hash,
                        tenant=tenant,
                        defaults={
                            'status': 'active' if user.is_active else 'inactive',
                            # Limpar campos deprecated
                            'tenant_user_id': None,
                            'email_hint': '',
                            'display_name': '',
                        }
                    )
                    
                    if membership_created:
                        print(f"  ➕ Criado membership para {user.email}")
                    
                    # Verificar e corrigir role
                    if public_membership.role != membership.role:
                        print(f"  ⚠️  {user.email}")
                        print(f"      Tenant role: {membership.role}")
                        print(f"      Public role: {public_membership.role}")
                        
                        if not dry_run:
                            print(f"      ✅ Atualizando para {membership.role}")
                            public_membership.role = membership.role
                            public_membership.save(update_fields=['role'])
                            updated += 1
                        else:
                            print(f"      [DRY RUN] Seria atualizado para {membership.role}")
                            updated += 1
                    else:
                        print(f"  ✓  {user.email} - role correto ({membership.role})")
            
            print(f"\n  Total de memberships processados: {count}")
            print(f"  Memberships {'que seriam ' if dry_run else ''}atualizados/criados: {updated}")
            
            return count, updated
            
    except Exception as e:
        print(f"  ❌ Erro ao processar tenant {tenant.schema_name}: {e}")
        import traceback
        traceback.print_exc()
        return 0, 0


def main():
    """Função principal."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Sincronizar papéis de usuários')
    parser.add_argument('--tenant', help='Schema do tenant específico')
    parser.add_argument('--dry-run', action='store_true', help='Apenas mostrar o que seria feito')
    
    args = parser.parse_args()
    
    print("="*80)
    print("SINCRONIZAÇÃO DE PAPÉIS DE USUÁRIOS")
    print("="*80)
    
    if args.dry_run:
        print("\n⚠️  MODO DRY RUN - Nenhuma alteração será feita")
    
    # Buscar tenants
    with schema_context('public'):
        if args.tenant:
            tenants = Tenant.objects.filter(schema_name=args.tenant)
            if not tenants.exists():
                print(f"\n❌ Tenant '{args.tenant}' não encontrado!")
                return
        else:
            # Todos os tenants exceto public
            tenants = Tenant.objects.exclude(schema_name='public')
    
    total_count = 0
    total_updated = 0
    
    for tenant in tenants:
        count, updated = sync_tenant_memberships(tenant, dry_run=args.dry_run)
        total_count += count
        total_updated += updated
    
    print(f"\n{'='*80}")
    print(f"RESUMO")
    print(f"{'='*80}")
    print(f"Total de memberships processados: {total_count}")
    print(f"Total de memberships {'que seriam ' if args.dry_run else ''}atualizados/criados: {total_updated}")
    
    if args.dry_run:
        print(f"\n💡 Execute novamente sem --dry-run para aplicar as alterações")


if __name__ == '__main__':
    main()
