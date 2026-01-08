"""
TrakService Models

Models for field service management:
- TechnicianProfile: Extended profile for field technicians
- ServiceAssignment: Link between WorkOrder and Technician with scheduling

Models are tenant-specific (stored in tenant schemas).
"""

import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class TechnicianProfile(models.Model):
    """
    Extended profile for field service technicians.
    
    Links a User to technician-specific data like skills,
    availability, and tracking preferences.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to User
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="technician_profile",
        verbose_name="Usuário",
    )
    
    # Contact info (may differ from user profile)
    phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Telefone",
        help_text="Telefone para contato em campo",
    )
    
    # Skills/specializations (JSON array)
    skills = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Habilidades",
        help_text="Lista de especialidades do técnico",
    )
    
    # Work schedule preferences
    work_start_time = models.TimeField(
        default="08:00",
        verbose_name="Horário de Início",
        help_text="Início da janela de trabalho",
    )
    work_end_time = models.TimeField(
        default="18:00",
        verbose_name="Horário de Término",
        help_text="Fim da janela de trabalho",
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Se o técnico está disponível para atribuições",
    )
    
    # Tracking preferences (for privacy)
    allow_tracking = models.BooleanField(
        default=True,
        verbose_name="Permitir Rastreamento",
        help_text="Se o técnico permite rastreamento GPS durante trabalho",
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Perfil de Técnico"
        verbose_name_plural = "Perfis de Técnicos"
        ordering = ["user__first_name", "user__last_name"]
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.email}"
    
    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.email


class ServiceAssignment(models.Model):
    """
    Assignment linking a WorkOrder to a Technician with scheduling info.
    
    Represents a scheduled field service visit for a work order.
    Tracks operational status from scheduling through completion.
    """
    
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Agendado"
        EN_ROUTE = "en_route", "A Caminho"
        ON_SITE = "on_site", "No Local"
        DONE = "done", "Concluído"
        CANCELED = "canceled", "Cancelado"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to WorkOrder from CMMS
    work_order = models.ForeignKey(
        "cmms.WorkOrder",
        on_delete=models.CASCADE,
        related_name="service_assignments",
        verbose_name="Ordem de Serviço",
    )
    
    # Assigned technician
    technician = models.ForeignKey(
        TechnicianProfile,
        on_delete=models.CASCADE,
        related_name="assignments",
        verbose_name="Técnico",
    )
    
    # Scheduling
    scheduled_date = models.DateField(
        verbose_name="Data Agendada",
        help_text="Data prevista para o atendimento",
    )
    scheduled_start = models.TimeField(
        null=True,
        blank=True,
        verbose_name="Horário Início Previsto",
    )
    scheduled_end = models.TimeField(
        null=True,
        blank=True,
        verbose_name="Horário Fim Previsto",
    )
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
        verbose_name="Status",
    )
    
    # Timestamps for status changes
    departed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Saída",
        help_text="Quando o técnico saiu para o local",
    )
    arrived_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Chegada",
        help_text="Quando o técnico chegou ao local",
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Conclusão",
        help_text="Quando o atendimento foi concluído",
    )
    canceled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Cancelamento",
        help_text="Quando foi cancelado (se aplicável)",
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name="Observações",
        help_text="Notas sobre o agendamento ou execução",
    )
    cancellation_reason = models.TextField(
        blank=True,
        verbose_name="Motivo do Cancelamento",
    )
    
    # Created by (for audit)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_assignments",
        verbose_name="Criado por",
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Atribuição de Serviço"
        verbose_name_plural = "Atribuições de Serviço"
        ordering = ["-scheduled_date", "-scheduled_start"]
        indexes = [
            models.Index(fields=["scheduled_date", "technician"]),
            models.Index(fields=["status"]),
            models.Index(fields=["work_order"]),
        ]
    
    def __str__(self):
        return f"{self.work_order.number} → {self.technician} ({self.scheduled_date})"
    
    def set_en_route(self, save=True):
        """Mark technician as en route to the location."""
        self.status = self.Status.EN_ROUTE
        self.departed_at = timezone.now()
        if save:
            self.save(update_fields=["status", "departed_at", "updated_at"])
    
    def set_on_site(self, save=True):
        """Mark technician as arrived on site."""
        self.status = self.Status.ON_SITE
        self.arrived_at = timezone.now()
        if save:
            self.save(update_fields=["status", "arrived_at", "updated_at"])
    
    def set_done(self, save=True):
        """Mark assignment as completed."""
        self.status = self.Status.DONE
        self.completed_at = timezone.now()
        if save:
            self.save(update_fields=["status", "completed_at", "updated_at"])
    
    def set_canceled(self, reason="", save=True):
        """Cancel the assignment."""
        self.status = self.Status.CANCELED
        self.canceled_at = timezone.now()
        self.cancellation_reason = reason
        if save:
            self.save(update_fields=["status", "canceled_at", "cancellation_reason", "updated_at"])


__all__ = ["TechnicianProfile", "ServiceAssignment"]
