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


__all__ = [
    "TechnicianProfile", 
    "ServiceAssignment", 
    "LocationPing", 
    "DailyRoute", 
    "RouteStop",
    "ServiceCatalogItem",
    "Quote",
    "QuoteItem",
]


# =============================================================================
# Quotes & Service Catalog Models
# =============================================================================


class ServiceCatalogItem(models.Model):
    """
    Service Catalog Item.
    
    Represents a service type that can be added to quotes.
    Contains standard pricing, duration, and cost information.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Identification
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Código",
        help_text="Código único do serviço (ex: SVC-001)",
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Nome",
        help_text="Nome do serviço (ex: Manutenção preventiva HVAC)",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Descrição",
        help_text="Descrição detalhada do serviço",
    )
    
    # Duration and labor
    estimated_duration_minutes = models.PositiveIntegerField(
        default=60,
        verbose_name="Duração Estimada (min)",
        help_text="Tempo médio de execução em minutos",
    )
    hourly_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custo HH",
        help_text="Custo da hora-homem para este serviço",
    )
    
    # Pricing
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Preço Base",
        help_text="Preço base sugerido para o serviço",
    )
    margin_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        verbose_name="Margem (%)",
        help_text="Margem de lucro padrão em percentual",
    )
    
    # Categorization
    category = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Categoria",
        help_text="Categoria do serviço (ex: HVAC, Elétrica, Civil)",
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Se o serviço está disponível para uso em orçamentos",
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_catalog_items",
        verbose_name="Criado por",
    )
    
    class Meta:
        verbose_name = "Item do Catálogo de Serviços"
        verbose_name_plural = "Itens do Catálogo de Serviços"
        ordering = ["category", "name"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["category"]),
            models.Index(fields=["is_active"]),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def calculated_price(self):
        """Calculate price with margin."""
        from decimal import Decimal
        if self.margin_percent > 0:
            multiplier = 1 + (self.margin_percent / 100)
            return (self.base_price * Decimal(str(multiplier))).quantize(Decimal("0.01"))
        return self.base_price


class Quote(models.Model):
    """
    Quote (Orçamento).
    
    Represents a cost estimate for a work order, including
    services and materials with their respective prices.
    """
    
    class Status(models.TextChoices):
        DRAFT = "draft", "Rascunho"
        SENT = "sent", "Enviado"
        APPROVED = "approved", "Aprovado"
        REJECTED = "rejected", "Rejeitado"
        EXPIRED = "expired", "Expirado"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Quote number (auto-generated)
    number = models.CharField(
        max_length=30,
        unique=True,
        verbose_name="Número",
        help_text="Número único do orçamento (auto-gerado)",
    )
    
    # Link to WorkOrder
    work_order = models.ForeignKey(
        "cmms.WorkOrder",
        on_delete=models.CASCADE,
        related_name="quotes",
        verbose_name="Ordem de Serviço",
    )
    
    # Status workflow
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name="Status",
    )
    
    # Validity
    valid_until = models.DateField(
        null=True,
        blank=True,
        verbose_name="Válido até",
        help_text="Data limite de validade do orçamento",
    )
    
    # Totals (calculated from items)
    subtotal_services = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Subtotal Serviços",
    )
    subtotal_materials = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Subtotal Materiais",
    )
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        verbose_name="Desconto (%)",
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Desconto (R$)",
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Total",
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name="Observações",
        help_text="Observações internas sobre o orçamento",
    )
    customer_notes = models.TextField(
        blank=True,
        verbose_name="Observações para Cliente",
        help_text="Notas visíveis no orçamento enviado ao cliente",
    )
    
    # Workflow timestamps
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Enviado em",
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Aprovado em",
    )
    rejected_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Rejeitado em",
    )
    rejection_reason = models.TextField(
        blank=True,
        verbose_name="Motivo da Rejeição",
    )
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_quotes",
        verbose_name="Criado por",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_quotes",
        verbose_name="Aprovado por",
    )
    
    class Meta:
        verbose_name = "Orçamento"
        verbose_name_plural = "Orçamentos"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["number"]),
            models.Index(fields=["work_order", "status"]),
            models.Index(fields=["status"]),
            models.Index(fields=["-created_at"]),
        ]
    
    def __str__(self):
        return f"{self.number} - {self.work_order.number}"
    
    def save(self, *args, **kwargs):
        """Auto-generate quote number if not set."""
        if not self.number:
            self.number = self._generate_number()
        super().save(*args, **kwargs)
    
    def _generate_number(self):
        """Generate unique quote number."""
        from django.utils import timezone
        
        today = timezone.now()
        prefix = f"ORC-{today.strftime('%Y%m')}"
        
        # Get last quote number for this month
        last = Quote.objects.filter(
            number__startswith=prefix
        ).order_by("-number").first()
        
        if last:
            try:
                last_num = int(last.number.split("-")[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1
        
        return f"{prefix}-{new_num:04d}"
    
    def recalculate_totals(self):
        """Recalculate quote totals from items."""
        from decimal import Decimal
        
        services_total = Decimal("0")
        materials_total = Decimal("0")
        
        for item in self.items.all():
            if item.item_type == QuoteItem.ItemType.SERVICE:
                services_total += item.total_price
            else:
                materials_total += item.total_price
        
        self.subtotal_services = services_total
        self.subtotal_materials = materials_total
        
        subtotal = services_total + materials_total
        
        # Apply discount
        if self.discount_percent > 0:
            self.discount_amount = (subtotal * self.discount_percent / 100).quantize(Decimal("0.01"))
        
        self.total = subtotal - self.discount_amount
        self.save(update_fields=[
            "subtotal_services",
            "subtotal_materials", 
            "discount_amount",
            "total",
            "updated_at",
        ])
    
    def send(self):
        """Mark quote as sent."""
        if self.status != self.Status.DRAFT:
            raise ValueError("Apenas orçamentos em rascunho podem ser enviados.")
        
        self.status = self.Status.SENT
        self.sent_at = timezone.now()
        self.save(update_fields=["status", "sent_at", "updated_at"])
    
    def approve(self, approved_by=None):
        """Mark quote as approved."""
        if self.status != self.Status.SENT:
            raise ValueError("Apenas orçamentos enviados podem ser aprovados.")
        
        self.status = self.Status.APPROVED
        self.approved_at = timezone.now()
        self.approved_by = approved_by
        self.save(update_fields=["status", "approved_at", "approved_by", "updated_at"])
    
    def reject(self, reason=""):
        """Mark quote as rejected."""
        if self.status != self.Status.SENT:
            raise ValueError("Apenas orçamentos enviados podem ser rejeitados.")
        
        self.status = self.Status.REJECTED
        self.rejected_at = timezone.now()
        self.rejection_reason = reason
        self.save(update_fields=["status", "rejected_at", "rejection_reason", "updated_at"])
    
    @property
    def is_expired(self):
        """Check if quote has expired."""
        if self.valid_until:
            return timezone.now().date() > self.valid_until
        return False
    
    @property
    def item_count(self):
        """Total number of items."""
        return self.items.count()


class QuoteItem(models.Model):
    """
    Quote Item (Item do Orçamento).
    
    Represents a line item in a quote, which can be either
    a service from the catalog or a material from inventory.
    """
    
    class ItemType(models.TextChoices):
        SERVICE = "service", "Serviço"
        MATERIAL = "material", "Material"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Parent quote
    quote = models.ForeignKey(
        Quote,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Orçamento",
    )
    
    # Item type and references
    item_type = models.CharField(
        max_length=20,
        choices=ItemType.choices,
        verbose_name="Tipo",
    )
    
    # Reference to catalog (for services)
    catalog_item = models.ForeignKey(
        ServiceCatalogItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quote_items",
        verbose_name="Item do Catálogo",
    )
    
    # Reference to inventory (for materials)
    inventory_item = models.ForeignKey(
        "inventory.InventoryItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quote_items",
        verbose_name="Item do Estoque",
    )
    
    # Item details (copied from reference or custom)
    code = models.CharField(
        max_length=50,
        verbose_name="Código",
    )
    description = models.CharField(
        max_length=500,
        verbose_name="Descrição",
    )
    
    # Quantity and pricing
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1,
        verbose_name="Quantidade",
    )
    unit = models.CharField(
        max_length=20,
        default="UN",
        verbose_name="Unidade",
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Preço Unitário",
    )
    
    # Calculated total
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Preço Total",
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name="Observações",
    )
    
    # Sequence for ordering
    sequence = models.PositiveIntegerField(
        default=0,
        verbose_name="Sequência",
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Item do Orçamento"
        verbose_name_plural = "Itens do Orçamento"
        ordering = ["quote", "sequence", "item_type"]
        indexes = [
            models.Index(fields=["quote", "item_type"]),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.description[:50]}"
    
    def save(self, *args, **kwargs):
        """Calculate total price before saving."""
        from decimal import Decimal
        self.total_price = (self.quantity * self.unit_price).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)
