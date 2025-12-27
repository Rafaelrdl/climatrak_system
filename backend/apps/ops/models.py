"""
Models for Control Center (Ops Panel)
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _


User = get_user_model()


class ExportJob(models.Model):
    """
    Tracks async export jobs for telemetry data.
    
    Status Flow:
        PENDING -> PROCESSING -> COMPLETED
                              -> FAILED
    """
    
    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, _('Pendente')),
        (STATUS_PROCESSING, _('Processando')),
        (STATUS_COMPLETED, _('Concluído')),
        (STATUS_FAILED, _('Falhou')),
    ]
    
    # Who requested the export
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('Usuário'),
        help_text=_('Staff user que solicitou o export')
    )
    
    # Export parameters
    tenant_slug = models.CharField(
        max_length=100,
        verbose_name=_('Tenant Slug'),
        help_text=_('Slug do tenant consultado')
    )
    
    tenant_name = models.CharField(
        max_length=200,
        verbose_name=_('Nome do Tenant'),
        blank=True
    )
    
    sensor_id = models.CharField(
        max_length=100,
        verbose_name=_('Sensor ID'),
        blank=True,
        help_text=_('Sensor específico ou vazio para todos')
    )
    
    from_timestamp = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Data Inicial'),
    )
    
    to_timestamp = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Data Final'),
    )
    
    # Job tracking
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name=_('Status'),
    )
    
    celery_task_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_('Celery Task ID'),
        help_text=_('UUID da task no Celery')
    )
    
    # Results
    file_url = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_('URL do Arquivo'),
        help_text=_('Link para download do CSV (MinIO/S3)')
    )
    
    file_size_bytes = models.BigIntegerField(
        null=True,
        blank=True,
        verbose_name=_('Tamanho do Arquivo (bytes)'),
    )
    
    record_count = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_('Quantidade de Registros'),
        help_text=_('Total de linhas exportadas')
    )
    
    error_message = models.TextField(
        blank=True,
        verbose_name=_('Mensagem de Erro'),
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Criado em'),
    )
    
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Iniciado em'),
    )
    
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Concluído em'),
    )
    
    # Expiration
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Expira em'),
        help_text=_('Arquivo será deletado após esta data (24h default)')
    )
    
    class Meta:
        verbose_name = _('Export Job')
        verbose_name_plural = _('Export Jobs')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['celery_task_id']),
        ]
    
    def __str__(self):
        return f"Export #{self.pk} - {self.tenant_slug} - {self.get_status_display()}"
    
    @property
    def duration_seconds(self):
        """Calculate processing duration if completed."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    @property
    def is_expired(self):
        """Check if download link has expired."""
        from django.utils import timezone
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def file_size_mb(self):
        """File size in MB."""
        if self.file_size_bytes:
            return round(self.file_size_bytes / (1024 * 1024), 2)
        return None


class AuditLog(models.Model):
    """
    Audit log for Control Center operations.
    Tracks all queries and actions for compliance and security.
    """
    
    ACTION_VIEW_LIST = 'view_list'
    ACTION_VIEW_DRILLDOWN = 'view_drilldown'
    ACTION_EXPORT_CSV = 'export_csv'
    ACTION_EXPORT_ASYNC = 'export_async'
    ACTION_VIEW_DASHBOARD = 'view_dashboard'
    
    ACTION_CHOICES = [
        (ACTION_VIEW_LIST, _('Visualizar Lista')),
        (ACTION_VIEW_DRILLDOWN, _('Visualizar Detalhes')),
        (ACTION_EXPORT_CSV, _('Export CSV Síncrono')),
        (ACTION_EXPORT_ASYNC, _('Export CSV Assíncrono')),
        (ACTION_VIEW_DASHBOARD, _('Visualizar Dashboard')),
    ]
    
    # Who performed the action
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Usuário'),
        help_text=_('Staff user que executou a ação')
    )
    
    username = models.CharField(
        max_length=150,
        verbose_name=_('Nome de Usuário'),
        help_text=_('Backup caso usuário seja deletado')
    )
    
    # What was accessed
    action = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES,
        verbose_name=_('Ação'),
    )
    
    tenant_slug = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_('Tenant Consultado'),
    )
    
    # Query parameters (JSON)
    filters = models.JSONField(
        default=dict,
        verbose_name=_('Filtros Aplicados'),
        help_text=_('Parâmetros da query (sensor_id, timestamps, etc)')
    )
    
    # Results metadata
    record_count = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_('Quantidade de Registros'),
        help_text=_('Total de registros retornados/exportados')
    )
    
    execution_time_ms = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_('Tempo de Execução (ms)'),
    )
    
    # Request metadata
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_('Endereço IP'),
    )
    
    user_agent = models.TextField(
        blank=True,
        verbose_name=_('User Agent'),
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Executado em'),
        db_index=True,
    )
    
    class Meta:
        verbose_name = _('Audit Log')
        verbose_name_plural = _('Audit Logs')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['tenant_slug', '-created_at']),
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.username} - {self.get_action_display()} - {self.created_at:%Y-%m-%d %H:%M}"
    
    @classmethod
    def log_action(cls, request, action, tenant_slug='', filters=None, record_count=None, execution_time_ms=None):
        """
        Convenience method to create audit log entry.
        
        Usage:
            AuditLog.log_action(
                request=request,
                action=AuditLog.ACTION_VIEW_LIST,
                tenant_slug='uberlandia-medical-center',
                filters={'sensor_id': 'temp_01'},
                record_count=1234
            )
        """
        # Get IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        return cls.objects.create(
            user=request.user if request.user.is_authenticated else None,
            username=request.user.username if request.user.is_authenticated else 'anonymous',
            action=action,
            tenant_slug=tenant_slug,
            filters=filters or {},
            record_count=record_count,
            execution_time_ms=execution_time_ms,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        )
