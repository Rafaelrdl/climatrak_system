"""
Utility functions for Control Center operations.
"""
from django.core.cache import cache
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django_tenants.utils import get_tenant_model
import logging

logger = logging.getLogger(__name__)

# Cache keys
CACHE_KEY_TENANTS_LIST = 'ops:tenants:list'
CACHE_TIMEOUT_TENANTS = 300  # 5 minutes


def get_cached_tenants():
    """
    Get list of all tenants with caching (5 minute TTL).
    
    Returns list of dicts with: id, schema_name, name, slug, created_at
    
    Cache is invalidated automatically when tenants are created/updated/deleted
    via Django signals.
    
    Usage:
        tenants = get_cached_tenants()
        for tenant in tenants:
            print(tenant['name'], tenant['slug'])
    """
    # Try to get from cache first
    cached_data = cache.get(CACHE_KEY_TENANTS_LIST)
    
    if cached_data is not None:
        logger.debug(f"✅ Tenants loaded from cache ({len(cached_data)} tenants)")
        return cached_data
    
    # Cache miss - query database
    Tenant = get_tenant_model()
    
    # Exclude public schema
    tenants_qs = Tenant.objects.exclude(schema_name='public').order_by('name')
    
    # Convert to list of dicts for JSON serialization
    tenants_data = []
    for t in tenants_qs:
        tenants_data.append({
            'id': t.id,
            'schema_name': t.schema_name,
            'name': t.name,
            'slug': getattr(t, 'slug', t.schema_name),  # Fallback to schema_name if no slug
            'created_at': t.created_on.isoformat() if hasattr(t, 'created_on') else None,
        })
    
    # Store in cache
    cache.set(CACHE_KEY_TENANTS_LIST, tenants_data, CACHE_TIMEOUT_TENANTS)
    logger.info(f"💾 Tenants cached ({len(tenants_data)} tenants, TTL={CACHE_TIMEOUT_TENANTS}s)")
    
    return tenants_data


def invalidate_tenants_cache():
    """
    Invalidate the tenants cache.
    
    Called automatically via Django signals when tenants are created/updated/deleted.
    Can also be called manually from Django admin or management commands.
    """
    deleted = cache.delete(CACHE_KEY_TENANTS_LIST)
    if deleted:
        logger.info("🗑️ Tenants cache invalidated")
    return deleted


# Auto-invalidation via signals
@receiver(post_save, sender=None)  # Will be connected to Tenant model below
def invalidate_on_tenant_save(sender, instance, **kwargs):
    """Invalidate cache when tenant is created or updated."""
    invalidate_tenants_cache()


@receiver(post_delete, sender=None)  # Will be connected to Tenant model below  
def invalidate_on_tenant_delete(sender, instance, **kwargs):
    """Invalidate cache when tenant is deleted."""
    invalidate_tenants_cache()


# Connect signals to Tenant model
def connect_signals():
    """
    Connect cache invalidation signals to Tenant model.
    
    This is called in apps.py ready() method to ensure signals are registered.
    """
    try:
        Tenant = get_tenant_model()
        
        # Disconnect first to avoid duplicate connections
        post_save.disconnect(invalidate_on_tenant_save, sender=Tenant)
        post_delete.disconnect(invalidate_on_tenant_delete, sender=Tenant)
        
        # Connect signals
        post_save.connect(invalidate_on_tenant_save, sender=Tenant)
        post_delete.connect(invalidate_on_tenant_delete, sender=Tenant)
        
        logger.info("✅ Cache invalidation signals connected to Tenant model")
    except Exception as e:
        logger.warning(f"⚠️ Could not connect cache signals: {e}")
