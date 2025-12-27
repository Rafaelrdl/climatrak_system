"""
Tenant models for multi-tenancy support.

This module defines the Tenant and Domain models required by django-tenants.
Each tenant gets its own PostgreSQL schema for data isolation.
"""

from django.db import models
from django_tenants.models import DomainMixin, TenantMixin


class Tenant(TenantMixin):
    """
    Tenant model representing an organization/client.
    
    Each tenant has its own PostgreSQL schema where all tenant-specific
    data is stored, ensuring complete data isolation between tenants.
    
    Attributes:
        name: Display name of the organization (e.g., "Uberlandia Medical Center")
        slug: URL-friendly identifier (e.g., "uberlandia-medical-center")
        created_at: Timestamp when tenant was created
        updated_at: Timestamp of last update
    """
    
    name = models.CharField(
        max_length=255,
        help_text="Nome de exibição do tenant (organização)"
    )
    
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text="Identificador único para URLs e schema do banco"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # django-tenants will automatically create schema_name from auto_create_schema
    auto_create_schema = True
    auto_drop_schema = True
    
    class Meta:
        db_table = 'tenants'
        ordering = ['name']
        verbose_name = 'Tenant'
        verbose_name_plural = 'Tenants'
    
    def __str__(self):
        return f"{self.name} ({self.schema_name})"
    
    def save(self, *args, **kwargs):
        """
        Override save to ensure schema_name is set from slug.
        Schema names must be valid PostgreSQL identifiers (no hyphens).
        """
        if not self.schema_name:
            # Convert slug to valid schema name (replace hyphens with underscores)
            self.schema_name = self.slug.replace('-', '_')
        super().save(*args, **kwargs)


class Domain(DomainMixin):
    """
    Domain model for routing requests to the correct tenant.
    
    Maps hostnames/subdomains to tenants. For example:
    - umc.localhost → Uberlandia Medical Center tenant
    - acme.traksense.com → ACME Corp tenant
    
    Attributes:
        domain: The hostname/subdomain (e.g., "umc.localhost")
        tenant: Foreign key to the Tenant this domain belongs to
        is_primary: Whether this is the primary domain for the tenant
    """
    
    class Meta:
        db_table = 'tenant_domains'
        ordering = ['domain']
        verbose_name = 'Domain'
        verbose_name_plural = 'Domains'
    
    def __str__(self):
        return f"{self.domain} → {self.tenant.name}"
