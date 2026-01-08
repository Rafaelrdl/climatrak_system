"""
Feature-based permissions for DRF views.

Provides permission classes and decorators to enforce feature gating
at the API level. Features must be enabled for the tenant to access endpoints.
"""

from functools import wraps
from typing import Callable, Optional, Sequence, Union

from django.db import connection
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.tenants.features import has_feature


class FeatureNotEnabled(PermissionDenied):
    """
    Exception raised when a required feature is not enabled.

    Returns 403 Forbidden with a descriptive message.
    """

    default_detail = "This feature is not enabled for your organization."
    default_code = "feature_not_enabled"


class FeatureRequired(permissions.BasePermission):
    """
    DRF Permission class that requires specific feature(s) to be enabled.

    Usage:
        class MyViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, FeatureRequired]
            required_features = ['trakservice.enabled']

        # Or with multiple features (all must be enabled):
        class MyOtherView(APIView):
            permission_classes = [IsAuthenticated, FeatureRequired]
            required_features = ['trakservice.enabled', 'trakservice.dispatch']
    """

    message = "This feature is not enabled for your organization."

    def has_permission(self, request: Request, view: APIView) -> bool:
        """
        Check if all required features are enabled for the tenant.

        Features are specified via `required_features` attribute on the view.
        """
        # Get required features from view
        required_features = getattr(view, "required_features", [])

        if not required_features:
            # No features required, allow access
            return True

        # Get tenant from connection
        tenant = getattr(connection, "tenant", None)
        if not tenant or connection.schema_name == "public":
            # No tenant context, deny access
            return False

        # Check all required features
        for feature_key in required_features:
            if not has_feature(tenant.id, feature_key):
                self.message = f"Feature '{feature_key}' is not enabled for your organization."
                return False

        return True


def feature_required(
    *feature_keys: str,
    raise_exception: bool = True,
) -> Callable:
    """
    Decorator to require specific feature(s) for a view function or method.

    Can be used on function-based views or ViewSet actions.

    Args:
        *feature_keys: Feature key(s) that must be enabled
        raise_exception: Whether to raise PermissionDenied (True) or return 403 Response (False)

    Usage:
        @api_view(['GET'])
        @feature_required('trakservice.enabled')
        def my_view(request):
            ...

        # Or on a ViewSet action:
        class MyViewSet(viewsets.ModelViewSet):
            @action(detail=True, methods=['post'])
            @feature_required('trakservice.dispatch')
            def dispatch_job(self, request, pk=None):
                ...

        # Multiple features (all must be enabled):
        @feature_required('trakservice.enabled', 'trakservice.quotes')
        def create_quote(request):
            ...
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(request_or_self, *args, **kwargs):
            # Handle both function views and class-based view methods
            if hasattr(request_or_self, "request"):
                # Class-based view (self)
                request = request_or_self.request
            else:
                # Function-based view (request)
                request = request_or_self

            # Get tenant from connection
            tenant = getattr(connection, "tenant", None)
            if not tenant or connection.schema_name == "public":
                raise FeatureNotEnabled("No tenant context available.")

            # Check all required features
            for feature_key in feature_keys:
                if not has_feature(tenant.id, feature_key):
                    raise FeatureNotEnabled(
                        f"Feature '{feature_key}' is not enabled for your organization."
                    )

            return func(request_or_self, *args, **kwargs)

        return wrapper

    return decorator


class TrakServiceFeatureRequired(FeatureRequired):
    """
    Convenience permission class for TrakService endpoints.

    Requires 'trakservice.enabled' plus any additional features
    specified in `trakservice_features` view attribute.

    Usage:
        class DispatchViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
            trakservice_features = ['dispatch']  # Will check trakservice.dispatch
    """

    def has_permission(self, request: Request, view: APIView) -> bool:
        # Get tenant from connection
        tenant = getattr(connection, "tenant", None)
        if not tenant or connection.schema_name == "public":
            return False

        # Always require base trakservice.enabled
        if not has_feature(tenant.id, "trakservice.enabled"):
            self.message = "TrakService module is not enabled for your organization."
            return False

        # Check additional trakservice features
        additional_features = getattr(view, "trakservice_features", [])
        for feature in additional_features:
            feature_key = f"trakservice.{feature}"
            if not has_feature(tenant.id, feature_key):
                self.message = f"TrakService feature '{feature}' is not enabled for your organization."
                return False

        return True


def trakservice_feature_required(*features: str) -> Callable:
    """
    Decorator requiring TrakService base + specific features.

    Args:
        *features: Additional TrakService features (without 'trakservice.' prefix)

    Usage:
        @api_view(['POST'])
        @trakservice_feature_required('dispatch')  # Requires trakservice.enabled + trakservice.dispatch
        def create_dispatch(request):
            ...

        @trakservice_feature_required('quotes', 'km')  # Requires all three features
        def create_quote_with_km(request):
            ...
    """

    def decorator(func: Callable) -> Callable:
        # Build full feature keys
        all_features = ["trakservice.enabled"] + [f"trakservice.{f}" for f in features]
        return feature_required(*all_features)(func)

    return decorator
