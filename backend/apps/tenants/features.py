"""
Tenant Feature Flags Module.

Provides feature gating per tenant for modular functionality.
Each tenant can enable/disable features like TrakService, etc.

Feature Keys (TrakService):
- trakservice.enabled: Master toggle for TrakService module
- trakservice.dispatch: Dispatch/scheduling functionality
- trakservice.tracking: GPS/location tracking
- trakservice.routing: Route optimization
- trakservice.km: Kilometer/mileage tracking
- trakservice.quotes: Quotation/estimate functionality
"""

from typing import Optional

from django.core.cache import cache
from django.db import models


class TenantFeature(models.Model):
    """
    Feature flags per tenant.

    Lives in PUBLIC schema to allow cross-tenant feature management.
    Each row represents a single feature flag for a tenant.

    Example:
        tenant_id=1, feature_key='trakservice.enabled', enabled=True
        tenant_id=1, feature_key='trakservice.tracking', enabled=False
    """

    # Reference to tenant (FK to public schema Tenant model)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="features",
        verbose_name="Tenant",
    )

    # Feature key (hierarchical: module.feature)
    feature_key = models.CharField(
        "Feature Key",
        max_length=100,
        db_index=True,
        help_text="Hierarchical feature key (e.g., trakservice.enabled)",
    )

    # Whether feature is enabled
    enabled = models.BooleanField(
        "Enabled",
        default=False,
        help_text="Whether this feature is enabled for the tenant",
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenant_features"
        verbose_name = "Tenant Feature"
        verbose_name_plural = "Tenant Features"
        unique_together = [("tenant", "feature_key")]
        ordering = ["tenant", "feature_key"]
        indexes = [
            models.Index(fields=["tenant", "enabled"]),
            models.Index(fields=["feature_key", "enabled"]),
        ]

    def __str__(self):
        status = "✓" if self.enabled else "✗"
        return f"{self.tenant.name}: {self.feature_key} [{status}]"


# =============================================================================
# Default Feature Configuration
# =============================================================================

# Default feature states for new tenants
DEFAULT_FEATURES = {
    # TrakService features (all disabled by default)
    "trakservice.enabled": False,
    "trakservice.dispatch": False,
    "trakservice.tracking": False,
    "trakservice.routing": False,
    "trakservice.km": False,
    "trakservice.quotes": False,
}


# =============================================================================
# Feature Service
# =============================================================================

CACHE_KEY_PREFIX = "tenant_features"
CACHE_TIMEOUT = 300  # 5 minutes


class FeatureService:
    """
    Service for managing and querying tenant features.

    Uses caching for performance. Always queries public schema.
    """

    @classmethod
    def _cache_key(cls, tenant_id: int) -> str:
        """Generate cache key for tenant features."""
        return f"{CACHE_KEY_PREFIX}:{tenant_id}"

    @classmethod
    def get_features(cls, tenant_id: int) -> dict[str, bool]:
        """
        Get all features for a tenant.

        Returns dict of feature_key -> enabled status.
        Includes defaults for features not explicitly set.

        Args:
            tenant_id: The tenant's ID

        Returns:
            Dict mapping feature keys to their enabled status
        """
        from django_tenants.utils import schema_context

        cache_key = cls._cache_key(tenant_id)
        cached = cache.get(cache_key)

        if cached is not None:
            return cached

        # Start with defaults
        features = DEFAULT_FEATURES.copy()

        # Query actual features from public schema
        with schema_context("public"):
            tenant_features = TenantFeature.objects.filter(tenant_id=tenant_id)
            for tf in tenant_features:
                features[tf.feature_key] = tf.enabled

        # Cache result
        cache.set(cache_key, features, CACHE_TIMEOUT)

        return features

    @classmethod
    def has_feature(cls, tenant_id: int, feature_key: str) -> bool:
        """
        Check if a tenant has a specific feature enabled.

        Args:
            tenant_id: The tenant's ID
            feature_key: The feature key to check

        Returns:
            True if feature is enabled, False otherwise
        """
        features = cls.get_features(tenant_id)
        return features.get(feature_key, False)

    @classmethod
    def set_feature(
        cls, tenant_id: int, feature_key: str, enabled: bool
    ) -> TenantFeature:
        """
        Set a feature flag for a tenant.

        Args:
            tenant_id: The tenant's ID
            feature_key: The feature key to set
            enabled: Whether to enable or disable

        Returns:
            The created/updated TenantFeature instance
        """
        from django_tenants.utils import schema_context

        with schema_context("public"):
            feature, _ = TenantFeature.objects.update_or_create(
                tenant_id=tenant_id,
                feature_key=feature_key,
                defaults={"enabled": enabled},
            )

        # Invalidate cache
        cache.delete(cls._cache_key(tenant_id))

        return feature

    @classmethod
    def set_features(cls, tenant_id: int, features: dict[str, bool]) -> None:
        """
        Set multiple feature flags for a tenant.

        Args:
            tenant_id: The tenant's ID
            features: Dict of feature_key -> enabled
        """
        from django_tenants.utils import schema_context

        with schema_context("public"):
            for feature_key, enabled in features.items():
                TenantFeature.objects.update_or_create(
                    tenant_id=tenant_id,
                    feature_key=feature_key,
                    defaults={"enabled": enabled},
                )

        # Invalidate cache
        cache.delete(cls._cache_key(tenant_id))

    @classmethod
    def initialize_tenant_features(cls, tenant_id: int) -> None:
        """
        Initialize default features for a new tenant.

        Creates all default feature flags with their default values.

        Args:
            tenant_id: The tenant's ID
        """
        cls.set_features(tenant_id, DEFAULT_FEATURES)

    @classmethod
    def invalidate_cache(cls, tenant_id: int) -> None:
        """
        Invalidate cached features for a tenant.

        Args:
            tenant_id: The tenant's ID
        """
        cache.delete(cls._cache_key(tenant_id))


def get_tenant_features(tenant_id: int) -> dict[str, bool]:
    """
    Convenience function to get tenant features.

    Args:
        tenant_id: The tenant's ID

    Returns:
        Dict mapping feature keys to their enabled status
    """
    return FeatureService.get_features(tenant_id)


def has_feature(tenant_id: int, feature_key: str) -> bool:
    """
    Convenience function to check if tenant has a feature.

    Args:
        tenant_id: The tenant's ID
        feature_key: The feature key to check

    Returns:
        True if feature is enabled, False otherwise
    """
    return FeatureService.has_feature(tenant_id, feature_key)
