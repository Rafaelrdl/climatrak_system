"""
Custom permissions for role-based access control.
"""

from rest_framework import permissions
from django.db import connection


class IsTenantMember(permissions.BasePermission):
    """
    Permission to check if user is a member of the current tenant.
    """
    
    message = "You must be a member of this organization."
    
    def has_permission(self, request, view):
        """Check if user has membership in current tenant."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get tenant from connection (set by django-tenants middleware)
        tenant = connection.tenant
        
        # Import here to avoid circular imports
        from .models import TenantMembership
        
        # Check for active membership
        return TenantMembership.objects.filter(
            user=request.user,
            tenant=tenant,
            status='active'
        ).exists()


class CanManageTeam(permissions.BasePermission):
    """
    Permission for owner/admin to manage team members.
    """
    
    message = "You must be an owner or administrator to manage team members."
    
    def has_permission(self, request, view):
        """Check if user can manage team."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        tenant = connection.tenant
        
        # Import here to avoid circular imports
        from .models import TenantMembership
        
        # Check for admin/owner role
        # Query must be done in tenant schema where the table exists
        membership = TenantMembership.objects.filter(
            user=request.user,
            tenant=tenant,
            status='active'
        ).first()
        
        return membership and membership.can_manage_team


class CanWrite(permissions.BasePermission):
    """
    Permission for users with write access (owner/admin/operator).
    """
    
    message = "You do not have write permissions."
    
    def has_permission(self, request, view):
        """Check if user has write permissions."""
        # Allow read operations for anyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if not request.user or not request.user.is_authenticated:
            return False
        
        tenant = connection.tenant
        
        # Import here to avoid circular imports
        from .models import TenantMembership
        
        # Check for write role
        membership = TenantMembership.objects.filter(
            user=request.user,
            tenant=tenant,
            status='active'
        ).first()
        
        return membership and membership.can_write


class IsOwner(permissions.BasePermission):
    """
    Permission for owner-only actions (tenant deletion, billing).
    """
    
    message = "Only the organization owner can perform this action."
    
    def has_permission(self, request, view):
        """Check if user is owner."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        tenant = connection.tenant
        
        # Import here to avoid circular imports
        from .models import TenantMembership
        
        # Check for owner role
        membership = TenantMembership.objects.filter(
            user=request.user,
            tenant=tenant,
            status='active',
            role='owner'
        ).first()
        
        return membership and membership.can_delete_tenant


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission that allows owners full access, others read-only.
    """
    
    def has_permission(self, request, view):
        """Check permissions based on method."""
        # Allow read operations for authenticated users
        if request.method in permissions.SAFE_METHODS:
            if not request.user or not request.user.is_authenticated:
                return False
            
            tenant = connection.tenant
            return request.user.memberships.filter(
                tenant=tenant,
                status='active'
            ).exists()
        
        # Write operations require owner
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Import here to avoid circular imports
        from .models import TenantMembership
        
        tenant = connection.tenant
        membership = TenantMembership.objects.filter(
            user=request.user,
            tenant=tenant,
            status='active',
            role='owner'
        ).first()
        
        return membership and membership.can_delete_tenant


class RoleBasedPermission(permissions.BasePermission):
    """
    Flexible permission class based on required roles.
    
    Usage in ViewSet:
        permission_classes = [RoleBasedPermission]
        required_roles = ['owner', 'admin']
    """
    
    def has_permission(self, request, view):
        """Check if user has one of the required roles."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Import here to avoid circular imports
        from .models import TenantMembership
        
        # Get required roles from view
        required_roles = getattr(view, 'required_roles', None)
        if not required_roles:
            # Default: allow all authenticated members
            required_roles = ['owner', 'admin', 'operator', 'viewer']
        
        # Allow read operations if 'viewer' is in required roles
        if request.method in permissions.SAFE_METHODS and 'viewer' in required_roles:
            required_roles = ['owner', 'admin', 'operator', 'viewer']
        
        tenant = connection.tenant
        
        # Check if user has required role
        membership = TenantMembership.objects.filter(
            user=request.user,
            tenant=tenant,
            status='active',
            role__in=required_roles
        ).first()
        
        return membership is not None
