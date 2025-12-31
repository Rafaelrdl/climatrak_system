"""
Views for team management (memberships and invites).
"""
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import connection
from django.db.models import Count
from django.template.loader import render_to_string
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Invite, TenantMembership
from .permissions import CanManageTeam
from .serializers_team import (
    AcceptInviteSerializer,
    CreateInviteSerializer,
    InviteSerializer,
    TeamStatsSerializer,
    TenantMembershipSerializer,
    UpdateMembershipSerializer,
)

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
        return (
            TenantMembership.objects.filter(tenant=tenant)
            .select_related("user", "invited_by")
            .order_by("-joined_at")
        )

    def get_serializer_class(self):
        """Use different serializer for updates."""
        if self.action in ["update", "partial_update"]:
            return UpdateMembershipSerializer
        return TenantMembershipSerializer

    def destroy(self, request, *args, **kwargs):
        """Remove member from team."""
        membership = self.get_object()
        tenant = connection.tenant

        # Prevent removing the last owner
        if membership.role == "owner":
            other_owners = (
                TenantMembership.objects.filter(
                    tenant=tenant, role="owner", status="active"
                )
                .exclude(pk=membership.pk)
                .count()
            )

            if other_owners == 0:
                return Response(
                    {"detail": "Cannot remove the last owner from the organization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Soft delete: set status to inactive instead of deleting
        membership.status = "inactive"
        membership.save()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """
        Get team statistics.

        Returns counts of members by role and status.
        """
        tenant = connection.tenant

        # Count members
        total_members = TenantMembership.objects.filter(tenant=tenant).count()
        active_members = TenantMembership.objects.filter(
            tenant=tenant, status="active"
        ).count()

        # Count pending invites
        pending_invites = Invite.objects.filter(tenant=tenant, status="pending").count()

        # Count members by role
        members_by_role = (
            TenantMembership.objects.filter(tenant=tenant, status="active")
            .values("role")
            .annotate(count=Count("id"))
        )

        role_counts = {item["role"]: item["count"] for item in members_by_role}

        members_by_status = (
            TenantMembership.objects.filter(tenant=tenant)
            .values("status")
            .annotate(count=Count("id"))
        )
        status_counts = {item["status"]: item["count"] for item in members_by_status}

        data = {
            "total_members": total_members,
            "active_members": active_members,
            "pending_invites": pending_invites,
            "members_by_role": role_counts,
            "members_by_status": status_counts,
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
        return (
            Invite.objects.filter(tenant=tenant)
            .select_related("invited_by", "accepted_by")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        """Use different serializer for creation."""
        if self.action == "create":
            return CreateInviteSerializer
        elif self.action == "accept":
            return AcceptInviteSerializer
        return InviteSerializer

    def create(self, request, *args, **kwargs):
        """Create and send invitation."""
        tenant = connection.tenant

        serializer = self.get_serializer(data=request.data, context={"tenant": tenant})
        serializer.is_valid(raise_exception=True)

        # Create invite
        invite = Invite.objects.create(
            tenant=tenant, invited_by=request.user, **serializer.validated_data
        )

        # Send invitation email
        self._send_invite_email(invite)

        # Return created invite
        response_serializer = InviteSerializer(invite)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """Cancel an invitation."""
        invite = self.get_object()

        if invite.status != "pending":
            return Response(
                {"detail": "Only pending invitations can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invite.cancel()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def accept(self, request):
        """
        Accept an invitation using token.

        Creates membership and marks invite as accepted.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invite = serializer.context["invite"]

        try:
            # Accept invite and create membership
            membership = invite.accept(
                request.user, invite_schema=connection.schema_name
            )

            # Return membership details
            membership_serializer = TenantMembershipSerializer(membership)
            return Response(
                {
                    "message": "Invitation accepted successfully.",
                    "membership": membership_serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def resend(self, request, pk=None):
        """Resend invitation email."""
        invite = self.get_object()

        if invite.status != "pending":
            return Response(
                {"detail": "Only pending invitations can be resent."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not invite.is_valid:
            return Response(
                {"detail": "This invitation has expired."},
                status=status.HTTP_400_BAD_REQUEST,
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
            "invite": invite,
            "accept_url": accept_url,
            "tenant_name": invite.tenant.name,
            "invited_by_name": invite.invited_by.full_name
            if invite.invited_by
            else "Team",
            "role": invite.get_role_display(),
        }

        # Render email template
        subject = f"You've been invited to join {invite.tenant.name}"
        html_message = render_to_string("emails/team_invite.html", context)
        plain_message = render_to_string("emails/team_invite.txt", context)

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

from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

User = get_user_model()


class PublicInviteValidateView(APIView):
    """
    Public endpoint to validate an invite token.
    GET /api/invites/validate/?token=<token>
    """

    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")

        if not token:
            return Response(
                {"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            invite = Invite.objects.select_related("tenant", "invited_by").get(
                token=token
            )
        except Invite.DoesNotExist:
            return Response(
                {"detail": "Invalid invite token."}, status=status.HTTP_404_NOT_FOUND
            )

        if not invite.is_valid:
            if invite.is_expired:
                invite.status = "expired"
                invite.save()
                return Response(
                    {"detail": "This invite has expired."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"detail": "This invite is no longer valid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "id": invite.id,
                "email": invite.email,
                "role": invite.role,
                "tenant_name": invite.tenant.name,
                "tenant_slug": invite.tenant.schema_name,
                "invited_by_name": invite.invited_by.full_name
                if invite.invited_by
                else "Team",
                "expires_at": invite.expires_at.isoformat(),
            }
        )


class PublicInviteAcceptView(APIView):
    """
    Public endpoint to accept an invite and create user account.
    POST /api/invites/accept/

    For NEW users: requires token, name, password
    For EXISTING users: only requires token (will add them to the tenant)
    """

    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        full_name = request.data.get("name", "").strip()
        password = request.data.get("password")

        # Validate token (always required)
        if not token:
            return Response(
                {"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Get invite
        try:
            invite = Invite.objects.select_related("tenant", "invited_by").get(
                token=token
            )
        except Invite.DoesNotExist:
            return Response(
                {"detail": "Invalid invite token."}, status=status.HTTP_404_NOT_FOUND
            )

        if not invite.is_valid:
            if invite.is_expired:
                invite.status = "expired"
                invite.save()
            return Response(
                {"detail": "This invite is no longer valid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user already exists (search in all tenant schemas via TenantUserIndex)
        from django_tenants.utils import schema_context

        from apps.public_identity.models import TenantUserIndex

        email_hash = None
        origin_schema = connection.schema_name
        try:
            from apps.public_identity.models import compute_email_hash

            email_hash = compute_email_hash(invite.email)

            # Check if user exists in ANY tenant
            user_index = TenantUserIndex.objects.filter(
                identifier_hash=email_hash, is_active=True
            ).first()

            if user_index:
                # User exists - add them to this tenant
                # Get the user from their existing tenant to validate password could work
                with schema_context(user_index.tenant.schema_name):
                    existing_user = User.objects.get(id=user_index.user_id)

                # Now check/create in the INVITED tenant schema
                with schema_context(invite.tenant.schema_name):
                    # Check if user exists in THIS tenant
                    user_in_tenant = User.objects.filter(
                        email__iexact=invite.email
                    ).first()

                    if user_in_tenant:
                        # User already in this tenant - check membership
                        existing_membership = TenantMembership.objects.filter(
                            user=user_in_tenant,
                            tenant=invite.tenant,
                        ).first()

                        if (
                            existing_membership
                            and existing_membership.status == "active"
                        ):
                            return Response(
                                {
                                    "detail": "You are already a member of this organization."
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        elif existing_membership:
                            # Reactivate membership with new role
                            existing_membership.status = "active"
                            existing_membership.role = invite.role
                            existing_membership.save()
                            membership_role = existing_membership.role
                        else:
                            # Create membership for existing user
                            membership = invite.accept(
                                user_in_tenant, invite_schema=origin_schema
                            )
                            membership_role = membership.role
                    else:
                        # User exists in another tenant but not this one
                        # Create user record in this tenant (same credentials)
                        user_in_tenant = User.objects.create_user(
                            username=existing_user.username,
                            email=existing_user.email,
                            password=existing_user.password,  # Copy hashed password
                            first_name=existing_user.first_name,
                            last_name=existing_user.last_name,
                        )
                        # Need to copy the password hash directly
                        user_in_tenant.password = existing_user.password
                        user_in_tenant.save()

                        # Create membership
                        membership = invite.accept(
                            user_in_tenant, invite_schema=origin_schema
                        )
                        membership_role = membership.role

                    user_id = user_in_tenant.id
                    user_email = user_in_tenant.email
                    user_full_name = user_in_tenant.full_name

                logger.info(
                    f"✅ Existing user {user_email} joined {invite.tenant.name} as {membership_role}"
                )

                return Response(
                    {
                        "message": "You have been added to the organization.",
                        "existing_user": True,
                        "user": {
                            "id": user_id,
                            "email": user_email,
                            "full_name": user_full_name,
                        },
                        "membership": {
                            "tenant_name": invite.tenant.name,
                            "tenant_slug": invite.tenant.schema_name,
                            "role": membership_role,
                        },
                    },
                    status=status.HTTP_200_OK,
                )
        except Exception as e:
            logger.exception(f"Error handling existing user for invite: {e}")
            # Continue to new user creation if we can't find existing user
            pass

        # User doesn't exist - create new user
        if not full_name:
            return Response(
                {"detail": "Name is required for new accounts."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not password:
            return Response(
                {"detail": "Password is required for new accounts."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create user IN THE TENANT SCHEMA (not public!)
        from django_tenants.utils import schema_context

        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        try:
            # Switch to tenant schema to create user
            with schema_context(invite.tenant.schema_name):
                user = User.objects.create_user(
                    username=invite.email,
                    email=invite.email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                )

                # Accept invite and create membership (also in tenant schema)
                membership = invite.accept(user, invite_schema=origin_schema)

                # Get user data before leaving schema context
                user_id = user.id
                user_email = user.email
                user_full_name = user.full_name
                membership_role = membership.role
        except Exception as e:
            logger.exception(f"Error creating user for invite {invite.token}: {e}")
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(
            f"✅ User {user_email} created and joined {invite.tenant.name} as {membership_role}"
        )

        return Response(
            {
                "message": "Account created successfully.",
                "user": {
                    "id": user_id,
                    "email": user_email,
                    "full_name": user_full_name,
                },
                "membership": {
                    "tenant_name": invite.tenant.name,
                    "tenant_slug": invite.tenant.schema_name,
                    "role": membership_role,
                },
            },
            status=status.HTTP_201_CREATED,
        )
