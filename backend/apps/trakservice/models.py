"""
TrakService Models

Models for field service management:
- TechnicianProfile: Extended profile for field technicians
- ServiceAssignment: Link between WorkOrder and Technician with scheduling

Models are tenant-specific (stored in tenant schemas).
"""

import uuid
from datetime import time as dt_time
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
        default=dt_time(8, 0),
        verbose_name="Horário de Início",
        help_text="Início da janela de trabalho",
    )
    work_end_time = models.TimeField(
        default=dt_time(18, 0),
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


class LocationPing(models.Model):
    """
    GPS location ping from a field technician's mobile device.
    
    Stores location data with audit trail for tracking purposes.
    Respects privacy constraints (work window, allow_tracking).
    
    Note: Only pings within the technician's work window and with
    allow_tracking=True should be stored.
    """
    
    class Source(models.TextChoices):
        GPS = "gps", "GPS"
        NETWORK = "network", "Rede"
        FUSED = "fused", "Fusão GPS+Rede"
        MANUAL = "manual", "Manual"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to technician
    technician = models.ForeignKey(
        TechnicianProfile,
        on_delete=models.CASCADE,
        related_name="location_pings",
        verbose_name="Técnico",
    )
    
    # Location data
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        verbose_name="Latitude",
        help_text="Latitude em graus decimais (-90 a 90)",
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        verbose_name="Longitude",
        help_text="Longitude em graus decimais (-180 a 180)",
    )
    
    # Accuracy/precision metadata
    accuracy = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Precisão (metros)",
        help_text="Raio de precisão em metros",
    )
    altitude = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Altitude (metros)",
    )
    speed = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Velocidade (m/s)",
    )
    heading = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Direção (graus)",
        help_text="Direção em graus (0-360, 0=Norte)",
    )
    
    # Source of location data
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.GPS,
        verbose_name="Fonte",
    )
    
    # Audit trail (required by spec)
    device_id = models.CharField(
        max_length=100,
        verbose_name="ID do Dispositivo",
        help_text="Identificador único do dispositivo móvel",
    )
    recorded_at = models.DateTimeField(
        verbose_name="Registrado em",
        help_text="Timestamp quando a localização foi capturada no dispositivo",
    )
    
    # Server-side metadata
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Recebido em")
    
    # Optional: link to active assignment (for context)
    assignment = models.ForeignKey(
        ServiceAssignment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="location_pings",
        verbose_name="Atribuição",
        help_text="Atribuição ativa quando o ping foi registrado",
    )
    
    class Meta:
        verbose_name = "Ping de Localização"
        verbose_name_plural = "Pings de Localização"
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["technician", "-recorded_at"]),
            models.Index(fields=["recorded_at"]),
            models.Index(fields=["device_id"]),
        ]
    
    def __str__(self):
        return f"{self.technician} @ ({self.latitude}, {self.longitude}) - {self.recorded_at}"


# =============================================================================
# Routing & KM Models
# =============================================================================


class DailyRoute(models.Model):
    """
    Daily route for a technician.
    
    Represents the planned sequence of stops (assignments) for a given day.
    Used for route optimization and KM tracking.
    """
    
    class Status(models.TextChoices):
        DRAFT = "draft", "Rascunho"
        CONFIRMED = "confirmed", "Confirmado"
        IN_PROGRESS = "in_progress", "Em Andamento"
        COMPLETED = "completed", "Concluído"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to technician
    technician = models.ForeignKey(
        TechnicianProfile,
        on_delete=models.CASCADE,
        related_name="daily_routes",
        verbose_name="Técnico",
    )
    
    # Date for the route
    route_date = models.DateField(
        verbose_name="Data da Rota",
        help_text="Data para a qual a rota foi planejada",
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name="Status",
    )
    
    # Starting point (technician's home/base or first location)
    start_latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        verbose_name="Latitude Inicial",
    )
    start_longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        verbose_name="Longitude Inicial",
    )
    start_address = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Endereço Inicial",
    )
    
    # KM estimates (calculated at route generation)
    estimated_km = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name="KM Estimado",
        help_text="Quilometragem estimada para a rota completa",
    )
    
    # KM actual (aggregated from pings/legs)
    actual_km = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name="KM Real",
        help_text="Quilometragem real percorrida (calculada dos pings)",
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_routes",
        verbose_name="Criado por",
    )
    
    class Meta:
        verbose_name = "Rota Diária"
        verbose_name_plural = "Rotas Diárias"
        ordering = ["-route_date", "technician"]
        unique_together = [["technician", "route_date"]]
        indexes = [
            models.Index(fields=["route_date", "technician"]),
            models.Index(fields=["status"]),
        ]
    
    def __str__(self):
        return f"Rota {self.technician} - {self.route_date}"
    
    @property
    def total_stops(self):
        return self.stops.count()


class RouteStop(models.Model):
    """
    A stop in a daily route.
    
    Links to a ServiceAssignment and represents one destination
    in the technician's planned route for the day.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to route
    route = models.ForeignKey(
        DailyRoute,
        on_delete=models.CASCADE,
        related_name="stops",
        verbose_name="Rota",
    )
    
    # Sequence in the route (1, 2, 3, ...)
    sequence = models.PositiveIntegerField(
        verbose_name="Sequência",
        help_text="Ordem da parada na rota (1 = primeira)",
    )
    
    # Link to assignment (optional - can have manual stops)
    assignment = models.ForeignKey(
        ServiceAssignment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="route_stops",
        verbose_name="Atribuição",
    )
    
    # Location (can be from assignment or manual)
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        verbose_name="Latitude",
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        verbose_name="Longitude",
    )
    address = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Endereço",
    )
    
    # Description (from assignment or custom)
    description = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Descrição",
    )
    
    # Estimated times
    estimated_arrival = models.TimeField(
        null=True,
        blank=True,
        verbose_name="Chegada Estimada",
    )
    estimated_duration_minutes = models.PositiveIntegerField(
        default=60,
        verbose_name="Duração Estimada (min)",
    )
    
    # Distance from previous stop (km)
    distance_from_previous_km = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name="Distância do Anterior (km)",
    )
    
    # Actual data (filled during execution)
    actual_arrival = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Chegada Real",
    )
    actual_departure = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Saída Real",
    )
    
    class Meta:
        verbose_name = "Parada da Rota"
        verbose_name_plural = "Paradas da Rota"
        ordering = ["route", "sequence"]
        unique_together = [["route", "sequence"]]
        indexes = [
            models.Index(fields=["route", "sequence"]),
        ]
    
    def __str__(self):
        return f"Parada {self.sequence} - {self.route}"


__all__ = ["TechnicianProfile", "ServiceAssignment", "LocationPing", "DailyRoute", "RouteStop"]
