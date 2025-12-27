"""
Views for team management (memberships and invites).
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import connection
from django.db.models import Count, Q
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

from .models import TenantMembership, Invite
from .serializers_team import (
    TenantMembershipSerializer,
    UpdateMembershipSerializer,
    InviteSerializer,
    CreateInviteSerializer,
    AcceptInviteSerializer,
    TeamStatsSerializer
)
from .permissions import CanManageTeam

logger = logging.getLogger(__name__)


class TeamMemberViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing team members (memberships).
    
    List, retrieve, update, and remove team members.
    Only owners and admins can manage team.
    """
    
    serializer_class = TenantMembershipSerializer
    permission_classes = [IsAuthenticated, CanManageTeam]
    
    def get_queryset(self):
        """Get memberships for current tenant."""
        tenant = connection.tenant
        return TenantMembership.objects.filter(
            tenant=tenant
        ).select_related('user', 'invited_by').order_by('-joined_at')
    
    def get_serializer_class(self):
        """Use different serializer for updates."""
        if self.action in ['update', 'partial_update']:
            return UpdateMembershipSerializer
        return TenantMembershipSerializer
    
    def destroy(self, request, *args, **kwargs):
        """Remove member from team."""
        membership = self.get_object()
        tenant = connection.tenant
        
        # Prevent removing the last owner
        if membership.role == 'owner':
            other_owners = TenantMembership.objects.filter(
                tenant=tenant,
                role='owner',
                status='active'
            ).exclude(pk=membership.pk).count()
            
            if other_owners == 0:
                return Response(
                    {"detail": "Cannot remove the last owner from the organization."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Soft delete: set status to inactive instead of deleting
        membership.status = 'inactive'
        membership.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get team statistics.
        
        Returns counts of members by role and status.
        """
        tenant = connection.tenant
        
        # Count members
        total_members = TenantMembership.objects.filter(tenant=tenant).count()
        active_members = TenantMembership.objects.filter(
            tenant=tenant,
            status='active'
        ).count()
        
        # Count pending invites
        pending_invites = Invite.objects.filter(
            tenant=tenant,
            status='pending'
        ).count()
        
        # Count members by role
        members_by_role = TenantMembership.objects.filter(
            tenant=tenant,
            status='active'
        ).values('role').annotate(count=Count('id'))
        
        role_counts = {item['role']: item['count'] for item in members_by_role}
        
        members_by_status = TenantMembership.objects.filter(
            tenant=tenant
        ).values('status').annotate(count=Count('id'))
        status_counts = {item['status']: item['count'] for item in members_by_status}
        
        data = {
            'total_members': total_members,
            'active_members': active_members,
            'pending_invites': pending_invites,
            'members_by_role': role_counts,
            'members_by_status': status_counts
        }
        
        serializer = TeamStatsSerializer(data)
        return Response(serializer.data)


class InviteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invitations.
    
    Create, list, and cancel invitations.
    Accept invitations via token.
    """
    
    serializer_class = InviteSerializer
    permission_classes = [IsAuthenticated, CanManageTeam]
    
    def get_queryset(self):
        """Get invites for current tenant."""
        tenant = connection.tenant
        return Invite.objects.filter(
            tenant=tenant
        ).select_related('invited_by', 'accepted_by').order_by('-created_at')
    
    def get_serializer_class(self):
        """Use different serializer for creation."""
        if self.action == 'create':
            return CreateInviteSerializer
        elif self.action == 'accept':
            return AcceptInviteSerializer
        return InviteSerializer
    
    def create(self, request, *args, **kwargs):
        """Create and send invitation."""
        tenant = connection.tenant
        
        serializer = self.get_serializer(
            data=request.data,
            context={'tenant': tenant}
        )
        serializer.is_valid(raise_exception=True)
        
        # Create invite
        invite = Invite.objects.create(
            tenant=tenant,
            invited_by=request.user,
            **serializer.validated_data
        )
        
        # Send invitation email
        self._send_invite_email(invite)
        
        # Return created invite
        response_serializer = InviteSerializer(invite)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    def destroy(self, request, *args, **kwargs):
        """Cancel an invitation."""
        invite = self.get_object()
        
        if invite.status != 'pending':
            return Response(
                {"detail": "Only pending invitations can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invite.cancel()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def accept(self, request):
        """
        Accept an invitation using token.
        
        Creates membership and marks invite as accepted.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        invite = serializer.context['invite']
        
        try:
            # Accept invite and create membership
            membership = invite.accept(request.user)
            
            # Return membership details
            membership_serializer = TenantMembershipSerializer(membership)
            return Response(
                {
                    "message": "Invitation accepted successfully.",
                    "membership": membership_serializer.data
                },
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Resend invitation email."""
        invite = self.get_object()
        
        if invite.status != 'pending':
            return Response(
                {"detail": "Only pending invitations can be resent."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not invite.is_valid:
            return Response(
                {"detail": "This invitation has expired."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Resend email
        self._send_invite_email(invite)
        
        serializer = InviteSerializer(invite)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def _send_invite_email(self, invite):
        """
        Send invitation email to recipient.
        
        In production, this should use a proper email service (SendGrid, etc.)
        In development, emails go to console or Mailpit.
        """
        # Build acceptance URL
        accept_url = f"{settings.FRONTEND_URL}/accept-invite?token={invite.token}"
        
        # Email context
        context = {
            'invite': invite,
            'accept_url': accept_url,
            'tenant_name': invite.tenant.name,
            'invited_by_name': invite.invited_by.full_name if invite.invited_by else 'Team',
            'role': invite.get_role_display(),
        }
        
        # Render email template
        subject = f"You've been invited to join {invite.tenant.name}"
        html_message = render_to_string('emails/team_invite.html', context)
        plain_message = render_to_string('emails/team_invite.txt', context)
        
        # Send email (fail_silently=True para não bloquear a requisição)
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invite.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"✅ Invite email sent to {invite.email}")
        except Exception as e:
            logger.error(f"❌ Failed to send invite email to {invite.email}: {e}")
            # Não propaga o erro - o convite foi criado, apenas o email falhou


# =============================================================================
# PUBLIC INVITE ACCEPTANCE VIEW (No authentication required)
# =============================================================================

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model

User = get_user_model()


class PublicInviteValidateView(APIView):
    """
    Public endpoint to validate an invite token.
    GET /api/invites/validate/?token=<token>
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        token = request.query_params.get('token')
        
        if not token:
            return Response(
                {"detail": "Token is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invite = Invite.objects.select_related('tenant', 'invited_by').get(token=token)
        except Invite.DoesNotExist:
            return Response(
                {"detail": "Invalid invite token."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not invite.is_valid:
            if invite.is_expired:
                invite.status = 'expired'
                invite.save()
                return Response(
                    {"detail": "This invite has expired."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {"detail": "This invite is no longer valid."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            "id": invite.id,
            "email": invite.email,
            "role": invite.role,
            "tenant_name": invite.tenant.name,
            "tenant_slug": invite.tenant.schema_name,
            "invited_by_name": invite.invited_by.full_name if invite.invited_by else 'Team',
            "expires_at": invite.expires_at.isoformat(),
        })


class PublicInviteAcceptView(APIView):
    """
    Public endpoint to accept an invite and create user account.
    POST /api/invites/accept/
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('token')
        full_name = request.data.get('name', '').strip()
        password = request.data.get('password')
        
        # Validate required fields
        if not token:
            return Response(
                {"detail": "Token is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not full_name:
            return Response(
                {"detail": "Name is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not password:
            return Response(
                {"detail": "Password is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get invite
        try:
            invite = Invite.objects.select_related('tenant', 'invited_by').get(token=token)
        except Invite.DoesNotExist:
            return Response(
                {"detail": "Invalid invite token."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not invite.is_valid:
            if invite.is_expired:
                invite.status = 'expired'
                invite.save()
            return Response(
                {"detail": "This invite is no longer valid."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user already exists
        existing_user = User.objects.filter(email__iexact=invite.email).first()
        if existing_user:
            return Response(
                {"detail": "An account with this email already exists. Please login."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create user
        name_parts = full_name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        user = User.objects.create_user(
            username=invite.email,
            email=invite.email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        
        # Accept invite and create membership
        try:
            membership = invite.accept(user)
        except Exception as e:
            # If membership creation fails, delete the user
            user.delete()
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"✅ User {user.email} created and joined {invite.tenant.name} as {invite.role}")
        
        return Response({
            "message": "Account created successfully.",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
            },
            "membership": {
                "tenant_name": invite.tenant.name,
                "tenant_slug": invite.tenant.schema_name,
                "role": membership.role,
            }
        }, status=status.HTTP_201_CREATED)
