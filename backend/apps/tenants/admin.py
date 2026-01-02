"""
Admin configuration for Tenant models.

Nova arquitetura: Acesso aos dados de Assets, Devices, Sensors e Sites
é feito através do TenantAdmin, garantindo contexto correto do tenant.
"""

from urllib.parse import urlparse

from django.contrib import admin, messages
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import path, reverse
from django.utils.html import format_html

from django_tenants.admin import TenantAdminMixin
from django_tenants.utils import get_public_schema_name, schema_context

from .models import Domain, Tenant


@admin.register(Tenant)
class TenantAdmin(TenantAdminMixin, admin.ModelAdmin):
    """
    Admin interface for Tenant model.

    Permite gerenciar tenants e acessar seus dados (Assets, Devices, Sensors, Sites)
    através de views customizadas que garantem o contexto correto do schema.
    """

    list_display = [
        "name",
        "slug",
        "schema_name",
        "domain_count",
        "resources_summary",
        "tenant_actions",
        "created_at",
    ]
    search_fields = ["name", "slug", "schema_name"]
    readonly_fields = ["schema_name", "created_at", "updated_at"]
    list_per_page = 25

    fieldsets = (
        (
            "Informações Básicas",
            {
                "fields": ("name", "slug"),
                "description": "Nome e identificador único do tenant/organização.",
            },
        ),
        (
            "Schema e Timestamps",
            {
                "fields": ("schema_name", "created_at", "updated_at"),
                "classes": ("collapse",),
                "description": "Schema PostgreSQL e datas de criação/modificação (gerados automaticamente).",
            },
        ),
    )

    def domain_count(self, obj):
        """Número de domínios associados."""
        count = obj.domains.count()
        return format_html(
            '<span style="color: #0066cc; font-weight: bold;">{}</span>', count
        )

    domain_count.short_description = "🌐 Domínios"

    def resources_summary(self, obj):
        """Resumo dos recursos do tenant."""
        if obj.schema_name == "public":
            return format_html('<span style="color: #999;">-</span>')

        try:
            with schema_context(obj.schema_name):
                from apps.assets.models import Asset, Device, Sensor, Site

                site_count = Site.objects.count()
                asset_count = Asset.objects.count()
                device_count = Device.objects.count()
                sensor_count = Sensor.objects.count()

                return format_html(
                    '<div style="font-size: 11px; line-height: 1.4;">'
                    "📍 <b>{}</b> sites<br>"
                    "🏭 <b>{}</b> assets<br>"
                    "📡 <b>{}</b> devices<br>"
                    "🔬 <b>{}</b> sensors"
                    "</div>",
                    site_count,
                    asset_count,
                    device_count,
                    sensor_count,
                )
        except Exception as e:
            return format_html(
                '<span style="color: red; font-size: 11px;">Erro: {}</span>',
                str(e)[:30],
            )

    resources_summary.short_description = "Recursos"

    def tenant_actions(self, obj):
        """Botões de ação para gerenciar recursos do tenant."""
        if obj.schema_name == "public":
            return format_html('<span style="color: #999;">-</span>')

        return format_html(
            '<div style="white-space: nowrap;">'
            '<a class="button" style="padding: 5px 10px; margin: 2px; background-color: #79aec8; color: white; '
            'text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px;" '
            'href="{}">📍 Sites</a>'
            '<a class="button" style="padding: 5px 10px; margin: 2px; background-color: #79aec8; color: white; '
            'text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px;" '
            'href="{}">🏭 Assets</a>'
            '<a class="button" style="padding: 5px 10px; margin: 2px; background-color: #79aec8; color: white; '
            'text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px;" '
            'href="{}">📡 Devices</a>'
            '<a class="button" style="padding: 5px 10px; margin: 2px; background-color: #79aec8; color: white; '
            'text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px;" '
            'href="{}">🔬 Sensors</a>'
            '<a class="button" style="padding: 5px 10px; margin: 2px; background-color: #5cb85c; color: white; '
            'text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px;" '
            'href="{}">👥 Usuários</a>'
            "</div>",
            reverse("admin:tenant_sites", args=[obj.pk]),
            reverse("admin:tenant_assets", args=[obj.pk]),
            reverse("admin:tenant_devices", args=[obj.pk]),
            reverse("admin:tenant_sensors", args=[obj.pk]),
            reverse("admin:tenant_users", args=[obj.pk]),
        )

    tenant_actions.short_description = "Gerenciar"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related("domains")

    def get_urls(self):
        """Adiciona URLs customizadas para gerenciar recursos do tenant."""
        urls = super().get_urls()
        custom_urls = [
            # Sites URLs
            path(
                "<int:tenant_id>/sites/",
                self.admin_site.admin_view(self.tenant_sites_view),
                name="tenant_sites",
            ),
            path(
                "<int:tenant_id>/sites/add/",
                self.admin_site.admin_view(self.tenant_site_add_view),
                name="tenant_site_add",
            ),
            path(
                "<int:tenant_id>/sites/<int:site_id>/edit/",
                self.admin_site.admin_view(self.tenant_site_edit_view),
                name="tenant_site_edit",
            ),
            path(
                "<int:tenant_id>/sites/<int:site_id>/delete/",
                self.admin_site.admin_view(self.tenant_site_delete_view),
                name="tenant_site_delete",
            ),
            # Assets, Devices, Sensors URLs
            path(
                "<int:tenant_id>/assets/",
                self.admin_site.admin_view(self.tenant_assets_view),
                name="tenant_assets",
            ),
            path(
                "<int:tenant_id>/devices/",
                self.admin_site.admin_view(self.tenant_devices_view),
                name="tenant_devices",
            ),
            path(
                "<int:tenant_id>/sensors/",
                self.admin_site.admin_view(self.tenant_sensors_view),
                name="tenant_sensors",
            ),
            # Users/Members URLs
            path(
                "<int:tenant_id>/users/",
                self.admin_site.admin_view(self.tenant_users_view),
                name="tenant_users",
            ),
            path(
                "<int:tenant_id>/users/invite/",
                self.admin_site.admin_view(self.tenant_invite_user_view),
                name="tenant_invite_user",
            ),
            path(
                "<int:tenant_id>/users/<int:membership_id>/edit/",
                self.admin_site.admin_view(self.tenant_user_edit_view),
                name="tenant_user_edit",
            ),
            path(
                "<int:tenant_id>/users/<int:membership_id>/remove/",
                self.admin_site.admin_view(self.tenant_user_remove_view),
                name="tenant_user_remove",
            ),
            path(
                "<int:tenant_id>/invites/<int:invite_id>/cancel/",
                self.admin_site.admin_view(self.tenant_invite_cancel_view),
                name="tenant_invite_cancel",
            ),
            path(
                "<int:tenant_id>/invites/<int:invite_id>/resend/",
                self.admin_site.admin_view(self.tenant_invite_resend_view),
                name="tenant_invite_resend",
            ),
        ]
        return custom_urls + urls

    def tenant_sites_view(self, request, tenant_id):
        """View para gerenciar sites de um tenant específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        with schema_context(tenant.schema_name):
            from apps.assets.models import Site

            sites = Site.objects.all().order_by("-created_at")

            context = {
                "title": f"Sites - {tenant.name}",
                "tenant": tenant,
                "sites": sites,
                "opts": self.model._meta,
                "has_view_permission": self.has_view_permission(request),
            }

            return render(request, "admin/tenants/tenant_sites.html", context)

    def tenant_site_add_view(self, request, tenant_id):
        """View para adicionar um novo site."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        with schema_context(tenant.schema_name):
            from django import forms

            from apps.assets.models import Site

            # Timezones do Brasil e principais (alinhado com o frontend)
            TIMEZONE_CHOICES = [
                ("America/Sao_Paulo", "Brasília (GMT-3) - Brasil"),
                ("America/Manaus", "Manaus (GMT-4) - Brasil"),
                ("America/Fortaleza", "Fortaleza (GMT-3) - Brasil"),
                ("America/Recife", "Recife (GMT-3) - Brasil"),
                ("America/Noronha", "Fernando de Noronha (GMT-2) - Brasil"),
                ("America/New_York", "New York (GMT-5) - EUA"),
                ("America/Los_Angeles", "Los Angeles (GMT-8) - EUA"),
                ("Europe/London", "London (GMT+0) - Europa"),
                ("Europe/Paris", "Paris (GMT+1) - Europa"),
                ("Asia/Tokyo", "Tokyo (GMT+9) - Ásia"),
            ]

            class SiteForm(forms.ModelForm):
                timezone = forms.ChoiceField(
                    choices=TIMEZONE_CHOICES,
                    initial="America/Sao_Paulo",
                    label="Fuso Horário",
                    help_text="Selecione o fuso horário do site",
                )

                class Meta:
                    model = Site
                    fields = [
                        "name",
                        "company",
                        "sector",
                        "address",
                        "timezone",
                        "latitude",
                        "longitude",
                        "is_active",
                    ]
                    widgets = {
                        "name": forms.TextInput(
                            attrs={"placeholder": "Ex: Hospital Central"}
                        ),
                        "company": forms.TextInput(
                            attrs={"placeholder": "Ex: Rede Hospitalar SP"}
                        ),
                        "sector": forms.TextInput(attrs={"placeholder": "Ex: Saúde"}),
                        "address": forms.Textarea(
                            attrs={"rows": 3, "placeholder": "Endereço completo"}
                        ),
                        "latitude": forms.NumberInput(
                            attrs={"step": "0.000001", "placeholder": "Ex: -15.793889"}
                        ),
                        "longitude": forms.NumberInput(
                            attrs={"step": "0.000001", "placeholder": "Ex: -47.882778"}
                        ),
                    }

            if request.method == "POST":
                form = SiteForm(request.POST)
                if form.is_valid():
                    site = form.save()
                    messages.success(
                        request, f"✅ Site '{site.name}' criado com sucesso!"
                    )
                    return redirect("admin:tenant_sites", tenant_id=tenant_id)
            else:
                form = SiteForm(
                    initial={
                        "company": tenant.name,
                        "is_active": True,
                        "timezone": "America/Sao_Paulo",
                    }
                )

            context = {
                "title": "Adicionar Novo Site",
                "tenant": tenant,
                "form": form,
                "site": None,
                "opts": self.model._meta,
                "has_add_permission": self.has_add_permission(request),
            }

            return render(request, "admin/tenants/tenant_site_form.html", context)

    def tenant_site_edit_view(self, request, tenant_id, site_id):
        """View para editar um site específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        with schema_context(tenant.schema_name):
            from django import forms

            from apps.assets.models import Site

            site = get_object_or_404(Site, pk=site_id)

            # Timezones do Brasil e principais (alinhado com o frontend)
            TIMEZONE_CHOICES = [
                ("America/Sao_Paulo", "Brasília (GMT-3) - Brasil"),
                ("America/Manaus", "Manaus (GMT-4) - Brasil"),
                ("America/Fortaleza", "Fortaleza (GMT-3) - Brasil"),
                ("America/Recife", "Recife (GMT-3) - Brasil"),
                ("America/Noronha", "Fernando de Noronha (GMT-2) - Brasil"),
                ("America/New_York", "New York (GMT-5) - EUA"),
                ("America/Los_Angeles", "Los Angeles (GMT-8) - EUA"),
                ("Europe/London", "London (GMT+0) - Europa"),
                ("Europe/Paris", "Paris (GMT+1) - Europa"),
                ("Asia/Tokyo", "Tokyo (GMT+9) - Ásia"),
            ]

            class SiteForm(forms.ModelForm):
                timezone = forms.ChoiceField(
                    choices=TIMEZONE_CHOICES,
                    initial="America/Sao_Paulo",
                    label="Fuso Horário",
                    help_text="Selecione o fuso horário do site",
                )

                class Meta:
                    model = Site
                    fields = [
                        "name",
                        "company",
                        "sector",
                        "address",
                        "timezone",
                        "latitude",
                        "longitude",
                        "is_active",
                    ]
                    widgets = {
                        "name": forms.TextInput(
                            attrs={"placeholder": "Ex: Hospital Central"}
                        ),
                        "company": forms.TextInput(
                            attrs={"placeholder": "Ex: Rede Hospitalar SP"}
                        ),
                        "sector": forms.TextInput(attrs={"placeholder": "Ex: Saúde"}),
                        "address": forms.Textarea(
                            attrs={"rows": 3, "placeholder": "Endereço completo"}
                        ),
                        "latitude": forms.NumberInput(
                            attrs={"step": "0.000001", "placeholder": "Ex: -15.793889"}
                        ),
                        "longitude": forms.NumberInput(
                            attrs={"step": "0.000001", "placeholder": "Ex: -47.882778"}
                        ),
                    }

            if request.method == "POST":
                form = SiteForm(request.POST, instance=site)
                if form.is_valid():
                    form.save()
                    messages.success(
                        request, f"✅ Site '{site.name}' atualizado com sucesso!"
                    )
                    return redirect("admin:tenant_sites", tenant_id=tenant_id)
            else:
                form = SiteForm(instance=site)

            context = {
                "title": "Editar Site",
                "tenant": tenant,
                "site": site,
                "form": form,
                "opts": self.model._meta,
                "has_change_permission": self.has_change_permission(request),
            }

            return render(request, "admin/tenants/tenant_site_form.html", context)

    def tenant_site_delete_view(self, request, tenant_id, site_id):
        """View para excluir um site específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        with schema_context(tenant.schema_name):
            from apps.assets.models import Site

            site = get_object_or_404(Site, pk=site_id)
            asset_count = site.assets.count()

            if request.method == "POST" and "confirm" in request.POST:
                site_name = site.name
                site.delete()
                messages.success(request, f"🗑️ Site '{site_name}' excluído com sucesso!")
                return redirect("admin:tenant_sites", tenant_id=tenant_id)

            context = {
                "title": f"Excluir Site: {site.name}",
                "tenant": tenant,
                "site": site,
                "asset_count": asset_count,
                "opts": self.model._meta,
                "has_delete_permission": self.has_delete_permission(request),
            }

            return render(request, "admin/tenants/tenant_site_delete.html", context)

    def tenant_assets_view(self, request, tenant_id):
        """View para gerenciar assets de um tenant específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        with schema_context(tenant.schema_name):
            from apps.assets.models import Asset

            assets = Asset.objects.select_related("site").all().order_by("-created_at")

            context = {
                "title": f"Assets - {tenant.name}",
                "tenant": tenant,
                "assets": assets,
                "opts": self.model._meta,
                "has_view_permission": self.has_view_permission(request),
            }

            return render(request, "admin/tenants/tenant_assets.html", context)

    def tenant_devices_view(self, request, tenant_id):
        """View para gerenciar devices de um tenant específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        with schema_context(tenant.schema_name):
            from apps.assets.models import Device

            devices = (
                Device.objects.select_related("asset", "asset__site")
                .all()
                .order_by("-created_at")
            )

            context = {
                "title": f"Devices - {tenant.name}",
                "tenant": tenant,
                "devices": devices,
                "opts": self.model._meta,
                "has_view_permission": self.has_view_permission(request),
            }

            return render(request, "admin/tenants/tenant_devices.html", context)

    def tenant_sensors_view(self, request, tenant_id):
        """View para gerenciar sensors de um tenant específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        with schema_context(tenant.schema_name):
            from apps.assets.models import Sensor

            sensors = (
                Sensor.objects.select_related("device", "device__asset")
                .all()
                .order_by("-created_at")
            )

            context = {
                "title": f"Sensors - {tenant.name}",
                "tenant": tenant,
                "sensors": sensors,
                "opts": self.model._meta,
                "has_view_permission": self.has_view_permission(request),
            }

            return render(request, "admin/tenants/tenant_sensors.html", context)

    # =========================================================================
    # Views para gerenciar Usuários e Convites do Tenant
    # =========================================================================

    def tenant_users_view(self, request, tenant_id):
        """View para gerenciar usuários (memberships) de um tenant específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        # Memberships são armazenadas no schema public
        from apps.accounts.models import Invite, TenantMembership

        memberships = (
            TenantMembership.objects.filter(tenant=tenant)
            .select_related("user", "invited_by")
            .order_by("-joined_at")
        )

        pending_invites = (
            Invite.objects.filter(tenant=tenant, status="pending")
            .select_related("invited_by")
            .order_by("-created_at")
        )

        # Estatísticas
        stats = {
            "total_members": memberships.count(),
            "active_members": memberships.filter(status="active").count(),
            "pending_invites": pending_invites.count(),
            "owners": memberships.filter(role="owner").count(),
            "admins": memberships.filter(role="admin").count(),
        }

        context = {
            "title": f"Usuários - {tenant.name}",
            "tenant": tenant,
            "memberships": memberships,
            "pending_invites": pending_invites,
            "stats": stats,
            "opts": self.model._meta,
            "has_view_permission": self.has_view_permission(request),
            "has_add_permission": self.has_add_permission(request),
        }

        return render(request, "admin/tenants/tenant_users.html", context)

    def tenant_invite_user_view(self, request, tenant_id):
        """View para enviar convite para um novo usuário."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        from datetime import timedelta

        from django import forms
        from django.utils import timezone

        from apps.accounts.models import Invite, TenantMembership

        class InviteForm(forms.Form):
            email = forms.EmailField(
                label="Email do Usuário",
                help_text="O usuário receberá um email com o convite para se juntar ao tenant.",
                widget=forms.EmailInput(
                    attrs={"placeholder": "usuario@exemplo.com", "class": "vTextField"}
                ),
            )
            role = forms.ChoiceField(
                label="Papel/Permissão",
                choices=TenantMembership.ROLE_CHOICES,
                initial="viewer",
                help_text="Define o nível de acesso do usuário no tenant.",
            )
            message = forms.CharField(
                label="Mensagem (opcional)",
                required=False,
                widget=forms.Textarea(
                    attrs={
                        "rows": 3,
                        "placeholder": "Mensagem personalizada para o convite...",
                        "class": "vLargeTextField",
                    }
                ),
            )

        if request.method == "POST":
            form = InviteForm(request.POST)
            if form.is_valid():
                email = form.cleaned_data["email"].lower()
                role = form.cleaned_data["role"]
                message = form.cleaned_data.get("message", "")

                # Verificar se já existe um membership ativo
                existing_membership = TenantMembership.objects.filter(
                    tenant=tenant, user__email=email, status="active"
                ).first()

                if existing_membership:
                    messages.error(
                        request, f"⚠️ O usuário {email} já é membro deste tenant."
                    )
                else:
                    # Verificar se já existe um convite pendente
                    existing_invite = Invite.objects.filter(
                        tenant=tenant, email=email, status="pending"
                    ).first()

                    if existing_invite:
                        messages.warning(
                            request, f"⚠️ Já existe um convite pendente para {email}."
                        )
                    else:
                        # Criar o convite
                        invite = Invite.objects.create(
                            tenant=tenant,
                            email=email,
                            role=role,
                            message=message,
                            invited_by=request.user,
                            expires_at=timezone.now() + timedelta(days=7),
                        )

                        # Enviar email de convite
                        email_sent = self._send_invite_email(invite, request)

                        if email_sent:
                            messages.success(
                                request,
                                f"✅ Convite enviado para {email}! "
                                f"Token: {invite.token[:8]}... (expira em 7 dias)",
                            )
                        else:
                            messages.warning(
                                request,
                                f"⚠️ Convite criado para {email}, mas houve erro no envio do email. "
                                f"Token: {invite.token[:8]}... (expira em 7 dias)",
                            )
                        return redirect("admin:tenant_users", tenant_id=tenant_id)
        else:
            form = InviteForm()

        context = {
            "title": f"Convidar Usuário - {tenant.name}",
            "tenant": tenant,
            "form": form,
            "opts": self.model._meta,
            "has_add_permission": self.has_add_permission(request),
        }

        return render(request, "admin/tenants/tenant_invite_form.html", context)

    def tenant_user_edit_view(self, request, tenant_id, membership_id):
        """View para editar o papel de um membro do tenant."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        from django import forms

        from apps.accounts.models import TenantMembership

        membership = get_object_or_404(
            TenantMembership, pk=membership_id, tenant=tenant
        )

        class MembershipForm(forms.Form):
            role = forms.ChoiceField(
                label="Papel/Permissão",
                choices=TenantMembership.ROLE_CHOICES,
                initial=membership.role,
                help_text="Define o nível de acesso do usuário no tenant.",
            )
            status = forms.ChoiceField(
                label="Status",
                choices=TenantMembership.STATUS_CHOICES,
                initial=membership.status,
                help_text="Status da membresia.",
            )

        if request.method == "POST":
            form = MembershipForm(request.POST)
            if form.is_valid():
                old_role = membership.role
                membership.role = form.cleaned_data["role"]
                membership.status = form.cleaned_data["status"]
                membership.save()

                messages.success(
                    request,
                    f"✅ Permissões de {membership.user.email} atualizadas: "
                    f"{old_role} → {membership.role}",
                )
                return redirect("admin:tenant_users", tenant_id=tenant_id)
        else:
            form = MembershipForm(
                initial={
                    "role": membership.role,
                    "status": membership.status,
                }
            )

        context = {
            "title": f"Editar Membro - {membership.user.email}",
            "tenant": tenant,
            "membership": membership,
            "form": form,
            "opts": self.model._meta,
            "has_change_permission": self.has_change_permission(request),
        }

        return render(request, "admin/tenants/tenant_user_edit.html", context)

    def tenant_user_remove_view(self, request, tenant_id, membership_id):
        """View para remover um membro do tenant."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        from apps.accounts.models import TenantMembership

        membership = get_object_or_404(
            TenantMembership, pk=membership_id, tenant=tenant
        )

        # Não permitir remover o último owner
        if membership.role == "owner":
            owner_count = TenantMembership.objects.filter(
                tenant=tenant, role="owner", status="active"
            ).count()
            if owner_count <= 1:
                messages.error(
                    request, "⚠️ Não é possível remover o último owner do tenant!"
                )
                return redirect("admin:tenant_users", tenant_id=tenant_id)

        if request.method == "POST" and "confirm" in request.POST:
            user_email = membership.user.email
            membership.delete()
            messages.success(
                request, f"🗑️ Membro {user_email} removido do tenant {tenant.name}."
            )
            return redirect("admin:tenant_users", tenant_id=tenant_id)

        context = {
            "title": f"Remover Membro - {membership.user.email}",
            "tenant": tenant,
            "membership": membership,
            "opts": self.model._meta,
            "has_delete_permission": self.has_delete_permission(request),
        }

        return render(request, "admin/tenants/tenant_user_remove.html", context)

    def tenant_invite_cancel_view(self, request, tenant_id, invite_id):
        """View para cancelar um convite pendente."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        from apps.accounts.models import Invite

        invite = get_object_or_404(
            Invite, pk=invite_id, tenant=tenant, status="pending"
        )

        if request.method == "POST":
            invite.status = "cancelled"
            invite.save()
            messages.success(request, f"❌ Convite para {invite.email} cancelado.")

        return redirect("admin:tenant_users", tenant_id=tenant_id)

    def tenant_invite_resend_view(self, request, tenant_id, invite_id):
        """View para reenviar um convite."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)

        import secrets
        from datetime import timedelta

        from django.utils import timezone

        from apps.accounts.models import Invite

        invite = get_object_or_404(Invite, pk=invite_id, tenant=tenant)

        if request.method == "POST":
            # Renovar token e expiração
            invite.token = secrets.token_urlsafe(32)
            invite.expires_at = timezone.now() + timedelta(days=7)
            invite.status = "pending"
            invite.save()

            # Reenviar email de convite
            email_sent = self._send_invite_email(invite, request)

            if email_sent:
                messages.success(
                    request,
                    f"📧 Convite reenviado para {invite.email}! "
                    f"Novo token: {invite.token[:8]}...",
                )
            else:
                messages.warning(
                    request,
                    f"⚠️ Convite renovado, mas houve erro no envio do email para {invite.email}.",
                )

        return redirect("admin:tenant_users", tenant_id=tenant_id)

    def _send_invite_email(self, invite, request):
        """
        Envia email de convite para o usuário.

        Retorna True se o email foi enviado com sucesso, False caso contrário.
        """
        import logging

        from django.conf import settings
        from django.core.mail import send_mail
        from django.template.loader import render_to_string

        logger = logging.getLogger(__name__)

        try:
            # Build acceptance URL
            frontend_url = getattr(
                settings, "FRONTEND_URL", "http://localhost:5173"
            ).rstrip("/")
            parsed = urlparse(frontend_url)
            scheme = parsed.scheme or "http"
            port = f":{parsed.port}" if parsed.port else ""
            with schema_context(get_public_schema_name()):
                tenant_domain = (
                    Domain.objects.filter(tenant_id=invite.tenant_id)
                    .order_by("-is_primary", "domain")
                    .values_list("domain", flat=True)
                    .first()
                )
            if tenant_domain:
                if port and ":" not in tenant_domain:
                    tenant_domain = f"{tenant_domain}{port}"
                base_url = f"{scheme}://{tenant_domain}"
            else:
                base_url = frontend_url
            accept_url = f"{base_url}/accept-invite?token={invite.token}"

            # Email context
            context = {
                "invite": invite,
                "accept_url": accept_url,
                "tenant_name": invite.tenant.name,
                "invited_by_name": (
                    invite.invited_by.full_name if invite.invited_by else "Equipe"
                ),
                "role": (
                    invite.get_role_display()
                    if hasattr(invite, "get_role_display")
                    else invite.role
                ),
                "message": invite.message,
            }

            # Render email template
            subject = f"Você foi convidado para {invite.tenant.name} - Climatrak"

            try:
                html_message = render_to_string("emails/team_invite.html", context)
                plain_message = render_to_string("emails/team_invite.txt", context)
            except Exception as template_error:
                logger.warning(
                    f"Template não encontrado, usando fallback: {template_error}"
                )
                # Fallback simples se o template não existir
                plain_message = f"""
Olá!

Você foi convidado por {context['invited_by_name']} para se juntar à equipe "{invite.tenant.name}" no Climatrak.

Papel: {context['role']}
{f"Mensagem: {invite.message}" if invite.message else ""}

Clique no link abaixo para aceitar o convite:
{accept_url}

Este convite expira em 7 dias.

Atenciosamente,
Equipe Climatrak
                """.strip()
                html_message = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2>Você foi convidado para {invite.tenant.name}</h2>
    <p>Olá!</p>
    <p>Você foi convidado por <strong>{context['invited_by_name']}</strong> para se juntar à equipe
    "<strong>{invite.tenant.name}</strong>" no Climatrak.</p>
    <p><strong>Papel:</strong> {context['role']}</p>
    {f"<p><strong>Mensagem:</strong> {invite.message}</p>" if invite.message else ""}
    <p style="margin: 20px 0;">
        <a href="{accept_url}"
           style="background-color: #417690; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; display: inline-block;">
            Aceitar Convite
        </a>
    </p>
    <p style="color: #666; font-size: 12px;">Este convite expira em 7 dias.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="color: #999; font-size: 11px;">Equipe Climatrak</p>
</body>
</html>
                """.strip()

            # Send email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invite.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(
                f"✅ Invite email sent to {invite.email} for tenant {invite.tenant.name}"
            )
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send invite email to {invite.email}: {e}")
            return False


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    """Admin interface for Domain model."""

    list_display = ["domain", "tenant_link", "schema_badge", "primary_badge"]
    list_filter = ["is_primary", "tenant"]
    search_fields = ["domain", "tenant__name", "tenant__slug"]
    raw_id_fields = ["tenant"]
    list_per_page = 50

    fieldsets = (
        (
            "Configuração do Domain",
            {
                "fields": ("domain", "tenant", "is_primary"),
                "description": "Configure o hostname que será resolvido para este tenant.",
            },
        ),
    )

    def tenant_link(self, obj):
        """Link para o tenant."""
        return format_html(
            '<a href="/admin/tenants/tenant/{}/change/" style="color: #0066cc; text-decoration: none;">'
            "🏢 {}</a>",
            obj.tenant.id,
            obj.tenant.name,
        )

    tenant_link.short_description = "Tenant"

    def schema_badge(self, obj):
        """Schema do tenant."""
        return format_html(
            '<code style="background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 11px;">{}</code>',
            obj.tenant.schema_name,
        )

    schema_badge.short_description = "Schema"

    def primary_badge(self, obj):
        """Badge de domínio primário."""
        if obj.is_primary:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">⭐ Primário</span>'
            )
        return format_html('<span style="color: #999;">Secundário</span>')

    primary_badge.short_description = "Tipo"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("tenant")
