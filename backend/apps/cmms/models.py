"""
Models para CMMS - Gestão de Manutenção

Este módulo implementa os modelos principais do sistema CMMS:
- ChecklistTemplate: Templates de checklist reutilizáveis
- WorkOrder: Ordens de Serviço
- WorkOrderPhoto: Fotos anexadas às OS
- WorkOrderItem: Itens de estoque usados nas OS
- Request: Solicitações de manutenção
- RequestItem: Itens de estoque nas solicitações
- MaintenancePlan: Planos de manutenção preventiva
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid

User = get_user_model()


class ChecklistCategory(models.Model):
    """
    Categoria de Checklists.
    
    Agrupa checklists por área ou tipo de equipamento.
    Exemplos: HVAC, Elétrico, Predial, Segurança.
    """
    name = models.CharField(
        max_length=100,
        verbose_name='Nome',
        help_text='Nome da categoria'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Descrição',
        help_text='Descrição da categoria'
    )
    color = models.CharField(
        max_length=20,
        blank=True,
        default='#3b82f6',
        verbose_name='Cor',
        help_text='Cor para identificação visual (hex)'
    )
    icon = models.CharField(
        max_length=50,
        blank=True,
        default='clipboard-list',
        verbose_name='Ícone',
        help_text='Nome do ícone Lucide'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Categoria de Checklist'
        verbose_name_plural = 'Categorias de Checklists'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def checklist_count(self):
        return self.checklist_templates.filter(is_active=True).count()


class ChecklistTemplate(models.Model):
    """
    Template de checklist reutilizável para ordens de serviço.
    
    Os itens são armazenados como JSON com a estrutura:
    [
        {
            "id": "uuid",
            "label": "Verificar pressão do compressor",
            "type": "checkbox",  # checkbox, text, number, select, photo
            "required": true,
            "order": 1,
            "options": ["Opção 1", "Opção 2"]  # Apenas para select
        }
    ]
    """
    
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Ativo'
        INACTIVE = 'INACTIVE', 'Inativo'
        DRAFT = 'DRAFT', 'Rascunho'

    name = models.CharField(
        max_length=200,
        verbose_name='Nome',
        help_text='Nome descritivo do template'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Descrição',
        help_text='Descrição detalhada do checklist'
    )
    category = models.ForeignKey(
        ChecklistCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checklist_templates',
        verbose_name='Categoria'
    )
    items = models.JSONField(
        default=list,
        verbose_name='Itens',
        help_text='Lista de itens do checklist em formato JSON'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        verbose_name='Status'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo',
        help_text='Se o template está disponível para uso'
    )
    version = models.PositiveIntegerField(
        default=1,
        verbose_name='Versão',
        help_text='Versão do template'
    )
    usage_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Contador de Uso',
        help_text='Quantas vezes este checklist foi utilizado'
    )
    estimated_time = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Tempo Estimado (min)',
        help_text='Tempo estimado para completar o checklist'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_checklists',
        verbose_name='Criado por'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Template de Checklist'
        verbose_name_plural = 'Templates de Checklist'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def items_count(self):
        """Retorna o número de itens no checklist."""
        return len(self.items) if self.items else 0

    def increment_usage(self):
        """Incrementa o contador de uso."""
        self.usage_count += 1
        self.save(update_fields=['usage_count'])


class WorkOrder(models.Model):
    """
    Ordem de Serviço (OS).
    
    Representa uma tarefa de manutenção a ser executada em um ativo.
    Pode ser preventiva (gerada por plano), corretiva, emergência ou solicitação.
    """
    
    class Type(models.TextChoices):
        PREVENTIVE = 'PREVENTIVE', 'Preventiva'
        CORRECTIVE = 'CORRECTIVE', 'Corretiva'
        EMERGENCY = 'EMERGENCY', 'Emergência'
        REQUEST = 'REQUEST', 'Solicitação'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Aberta'
        IN_PROGRESS = 'IN_PROGRESS', 'Em Andamento'
        COMPLETED = 'COMPLETED', 'Concluída'
        CANCELLED = 'CANCELLED', 'Cancelada'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Baixa'
        MEDIUM = 'MEDIUM', 'Média'
        HIGH = 'HIGH', 'Alta'
        CRITICAL = 'CRITICAL', 'Crítica'

    # Identificação
    number = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Número',
        help_text='Número único da OS (auto-gerado)'
    )
    
    # Relacionamentos
    asset = models.ForeignKey(
        'assets.Asset',
        on_delete=models.PROTECT,
        related_name='work_orders',
        verbose_name='Ativo',
        help_text='Equipamento relacionado à OS'
    )
    
    # Classificação
    type = models.CharField(
        max_length=20,
        choices=Type.choices,
        default=Type.CORRECTIVE,
        verbose_name='Tipo'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        verbose_name='Status'
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        verbose_name='Prioridade'
    )
    
    # Descrição
    description = models.TextField(
        verbose_name='Descrição',
        help_text='Descrição detalhada do serviço a ser executado'
    )
    execution_description = models.TextField(
        blank=True,
        verbose_name='Descrição da Execução',
        help_text='Descrição do que foi executado (preenchido na conclusão)'
    )
    
    # Agendamento
    scheduled_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Data Agendada',
        help_text='Data prevista para execução'
    )
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Iniciado em',
        help_text='Data/hora de início da execução'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Concluído em',
        help_text='Data/hora de conclusão'
    )
    
    # Responsáveis
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_work_orders',
        verbose_name='Responsável',
        help_text='Técnico responsável pela execução'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_work_orders',
        verbose_name='Criado por'
    )
    
    # Tempo
    estimated_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name='Horas Estimadas'
    )
    actual_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name='Horas Reais'
    )
    
    # Checklist
    checklist_template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Template de Checklist'
    )
    checklist_responses = models.JSONField(
        default=dict,
        verbose_name='Respostas do Checklist',
        help_text='Respostas aos itens do checklist'
    )
    
    # Origem
    request = models.OneToOneField(
        'Request',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_work_order',
        verbose_name='Solicitação de Origem'
    )
    maintenance_plan = models.ForeignKey(
        'MaintenancePlan',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_orders',
        verbose_name='Plano de Origem'
    )
    
    # Cancelamento
    cancellation_reason = models.TextField(
        blank=True,
        verbose_name='Motivo do Cancelamento'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Ordem de Serviço'
        verbose_name_plural = 'Ordens de Serviço'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['number']),
            models.Index(fields=['status', '-scheduled_date']),
            models.Index(fields=['asset', '-created_at']),
            models.Index(fields=['assigned_to', 'status']),
        ]

    def __str__(self):
        return f"OS {self.number} - {self.asset.tag}"

    def save(self, *args, **kwargs):
        # Auto-gerar número da OS
        if not self.number:
            today = timezone.now()
            prefix = f"OS{today.strftime('%Y%m')}"
            last_wo = WorkOrder.objects.filter(
                number__startswith=prefix
            ).order_by('-number').first()
            
            if last_wo:
                last_num = int(last_wo.number[-4:])
                self.number = f"{prefix}{last_num + 1:04d}"
            else:
                self.number = f"{prefix}0001"
        
        super().save(*args, **kwargs)

    def start(self):
        """Inicia a execução da OS."""
        self.status = self.Status.IN_PROGRESS
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at', 'updated_at'])

    def complete(self, execution_description: str = '', actual_hours: float = None):
        """Conclui a OS."""
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        if execution_description:
            self.execution_description = execution_description
        if actual_hours is not None:
            self.actual_hours = actual_hours
        self.save(update_fields=[
            'status', 'completed_at', 'execution_description', 
            'actual_hours', 'updated_at'
        ])

    def cancel(self, reason: str):
        """Cancela a OS."""
        self.status = self.Status.CANCELLED
        self.cancellation_reason = reason
        self.save(update_fields=['status', 'cancellation_reason', 'updated_at'])

    @property
    def is_overdue(self) -> bool:
        """Verifica se a OS está atrasada."""
        if self.status in [self.Status.COMPLETED, self.Status.CANCELLED]:
            return False
        if not self.scheduled_date:
            return False
        return self.scheduled_date < timezone.now().date()


class WorkOrderPhoto(models.Model):
    """Foto anexada a uma Ordem de Serviço."""
    
    work_order = models.ForeignKey(
        WorkOrder,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name='Ordem de Serviço'
    )
    file = models.ImageField(
        upload_to='work_orders/photos/%Y/%m/',
        verbose_name='Arquivo'
    )
    caption = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Legenda'
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='Enviado por'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name='Enviado em')

    class Meta:
        verbose_name = 'Foto da OS'
        verbose_name_plural = 'Fotos das OS'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Foto {self.id} - OS {self.work_order.number}"


class WorkOrderItem(models.Model):
    """Item de estoque utilizado em uma Ordem de Serviço."""
    
    work_order = models.ForeignKey(
        WorkOrder,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Ordem de Serviço'
    )
    inventory_item = models.ForeignKey(
        'inventory.InventoryItem',
        on_delete=models.PROTECT,
        verbose_name='Item de Estoque'
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name='Quantidade'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')

    class Meta:
        verbose_name = 'Item da OS'
        verbose_name_plural = 'Itens das OS'
        unique_together = ['work_order', 'inventory_item']

    def __str__(self):
        return f"{self.inventory_item.name} x {self.quantity}"


class Request(models.Model):
    """
    Solicitação de Manutenção.
    
    Representa um pedido de manutenção que pode ser convertido em OS.
    """
    
    class Status(models.TextChoices):
        NEW = 'NEW', 'Nova'
        TRIAGING = 'TRIAGING', 'Em Triagem'
        CONVERTED = 'CONVERTED', 'Convertida'
        REJECTED = 'REJECTED', 'Rejeitada'

    # Identificação
    number = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Número'
    )
    
    # Local e Ativo
    sector = models.ForeignKey(
        'locations.Sector',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='requests',
        verbose_name='Setor'
    )
    subsection = models.ForeignKey(
        'locations.Subsection',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requests',
        verbose_name='Subseção'
    )
    asset = models.ForeignKey(
        'assets.Asset',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requests',
        verbose_name='Ativo'
    )
    
    # Solicitante
    requester = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='maintenance_requests',
        verbose_name='Solicitante'
    )
    
    # Descrição
    note = models.TextField(
        verbose_name='Descrição',
        help_text='Descrição detalhada do problema ou solicitação'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
        verbose_name='Status'
    )
    status_history = models.JSONField(
        default=list,
        verbose_name='Histórico de Status'
    )
    
    # Rejeição
    rejection_reason = models.TextField(
        blank=True,
        verbose_name='Motivo da Rejeição'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Solicitação'
        verbose_name_plural = 'Solicitações'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['number']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['requester', '-created_at']),
        ]

    def __str__(self):
        return f"SOL {self.number}"

    def save(self, *args, **kwargs):
        # Auto-gerar número
        if not self.number:
            today = timezone.now()
            prefix = f"SOL{today.strftime('%Y%m')}"
            last_req = Request.objects.filter(
                number__startswith=prefix
            ).order_by('-number').first()
            
            if last_req:
                last_num = int(last_req.number[-4:])
                self.number = f"{prefix}{last_num + 1:04d}"
            else:
                self.number = f"{prefix}0001"
        
        super().save(*args, **kwargs)

    def update_status(self, new_status: str, user: User = None):
        """Atualiza o status e registra no histórico."""
        old_status = self.status
        self.status = new_status
        
        # Adiciona ao histórico
        self.status_history.append({
            'from_status': old_status,
            'to_status': new_status,
            'changed_at': timezone.now().isoformat(),
            'changed_by': user.id if user else None,
            'changed_by_name': user.get_full_name() if user else None,
        })
        
        self.save(update_fields=['status', 'status_history', 'updated_at'])


class RequestItem(models.Model):
    """Item de estoque solicitado em uma Solicitação."""
    
    request = models.ForeignKey(
        Request,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Solicitação'
    )
    inventory_item = models.ForeignKey(
        'inventory.InventoryItem',
        on_delete=models.PROTECT,
        verbose_name='Item de Estoque'
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name='Quantidade'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')

    class Meta:
        verbose_name = 'Item da Solicitação'
        verbose_name_plural = 'Itens das Solicitações'

    def __str__(self):
        return f"{self.inventory_item.name} x {self.quantity}"


class MaintenancePlan(models.Model):
    """
    Plano de Manutenção Preventiva.
    
    Define uma programação recorrente de manutenção para um conjunto de ativos.
    """
    
    class Frequency(models.TextChoices):
        DAILY = 'DAILY', 'Diária'
        WEEKLY = 'WEEKLY', 'Semanal'
        BIWEEKLY = 'BIWEEKLY', 'Quinzenal'
        MONTHLY = 'MONTHLY', 'Mensal'
        QUARTERLY = 'QUARTERLY', 'Trimestral'
        SEMI_ANNUAL = 'SEMI_ANNUAL', 'Semestral'
        ANNUAL = 'ANNUAL', 'Anual'

    # Identificação
    name = models.CharField(
        max_length=200,
        verbose_name='Nome'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Descrição'
    )
    
    # Configuração
    frequency = models.CharField(
        max_length=20,
        choices=Frequency.choices,
        default=Frequency.MONTHLY,
        verbose_name='Frequência'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    auto_generate = models.BooleanField(
        default=True,
        verbose_name='Geração Automática',
        help_text='Se deve gerar OS automaticamente'
    )
    
    # Ativos
    assets = models.ManyToManyField(
        'assets.Asset',
        related_name='maintenance_plans',
        verbose_name='Ativos',
        help_text='Ativos cobertos por este plano'
    )
    
    # Checklist
    checklist_template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Template de Checklist'
    )
    
    # Execução
    next_execution = models.DateField(
        null=True,
        blank=True,
        verbose_name='Próxima Execução'
    )
    last_execution = models.DateField(
        null=True,
        blank=True,
        verbose_name='Última Execução'
    )
    
    # Estatísticas
    work_orders_generated = models.PositiveIntegerField(
        default=0,
        verbose_name='OS Geradas'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Plano de Manutenção'
        verbose_name_plural = 'Planos de Manutenção'
        ordering = ['name']

    def __str__(self):
        return self.name

    def calculate_next_execution(self) -> 'date':
        """Calcula a próxima data de execução baseado na frequência."""
        from datetime import timedelta
        from dateutil.relativedelta import relativedelta
        
        base_date = self.last_execution or timezone.now().date()
        
        frequency_map = {
            self.Frequency.DAILY: timedelta(days=1),
            self.Frequency.WEEKLY: timedelta(weeks=1),
            self.Frequency.BIWEEKLY: timedelta(weeks=2),
            self.Frequency.MONTHLY: relativedelta(months=1),
            self.Frequency.QUARTERLY: relativedelta(months=3),
            self.Frequency.SEMI_ANNUAL: relativedelta(months=6),
            self.Frequency.ANNUAL: relativedelta(years=1),
        }
        
        delta = frequency_map.get(self.frequency, relativedelta(months=1))
        return base_date + delta

    def generate_work_orders(self, user: User = None) -> list:
        """
        Gera ordens de serviço para todos os ativos do plano.
        
        Returns:
            Lista de IDs das OS criadas
        """
        work_orders = []
        scheduled_date = self.next_execution or timezone.now().date()
        
        for asset in self.assets.all():
            wo = WorkOrder.objects.create(
                asset=asset,
                type=WorkOrder.Type.PREVENTIVE,
                priority=WorkOrder.Priority.MEDIUM,
                description=f"Manutenção preventiva - {self.name}",
                scheduled_date=scheduled_date,
                checklist_template=self.checklist_template,
                maintenance_plan=self,
                created_by=user,
            )
            work_orders.append(wo)
        
        # Atualiza plano
        self.last_execution = scheduled_date
        self.next_execution = self.calculate_next_execution()
        self.work_orders_generated += len(work_orders)
        self.save(update_fields=[
            'last_execution', 'next_execution', 
            'work_orders_generated', 'updated_at'
        ])
        
        return [wo.id for wo in work_orders]


# ============================================
# Procedures - Documentação Técnica
# ============================================

class ProcedureCategory(models.Model):
    """
    Categoria de Procedimentos.
    
    Agrupa procedimentos por área ou tipo (ex: Elétrico, Mecânico, Segurança).
    """
    name = models.CharField(
        max_length=100,
        verbose_name='Nome',
        help_text='Nome da categoria'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Descrição',
        help_text='Descrição da categoria'
    )
    color = models.CharField(
        max_length=20,
        blank=True,
        default='#3b82f6',
        verbose_name='Cor',
        help_text='Cor para identificação visual (hex)'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Categoria de Procedimento'
        verbose_name_plural = 'Categorias de Procedimentos'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def procedure_count(self):
        return self.procedures.filter(is_active=True).count()


class Procedure(models.Model):
    """
    Procedimento Técnico.
    
    Documento que descreve como executar uma tarefa ou manutenção.
    Pode ser um PDF, arquivo Markdown ou documento DOCX.
    """
    
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Ativo'
        INACTIVE = 'INACTIVE', 'Inativo'
        DRAFT = 'DRAFT', 'Rascunho'
        ARCHIVED = 'ARCHIVED', 'Arquivado'

    class FileType(models.TextChoices):
        PDF = 'PDF', 'PDF'
        MARKDOWN = 'MARKDOWN', 'Markdown'
        DOCX = 'DOCX', 'Word'

    title = models.CharField(
        max_length=200,
        verbose_name='Título',
        help_text='Título do procedimento'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Descrição',
        help_text='Descrição detalhada do procedimento'
    )
    category = models.ForeignKey(
        ProcedureCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='procedures',
        verbose_name='Categoria'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        verbose_name='Status'
    )
    file = models.FileField(
        upload_to='procedures/%Y/%m/',
        verbose_name='Arquivo',
        help_text='Arquivo do procedimento (PDF, MD ou DOCX)'
    )
    file_type = models.CharField(
        max_length=20,
        choices=FileType.choices,
        default=FileType.PDF,
        verbose_name='Tipo de Arquivo'
    )
    version = models.PositiveIntegerField(
        default=1,
        verbose_name='Versão',
        help_text='Número da versão atual'
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Tags',
        help_text='Tags para busca e categorização'
    )
    view_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Visualizações'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_procedures',
        verbose_name='Criado por'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Procedimento'
        verbose_name_plural = 'Procedimentos'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} (v{self.version})"

    def increment_view_count(self):
        """Incrementa o contador de visualizações."""
        self.view_count += 1
        self.save(update_fields=['view_count'])

    def create_new_version(self, file, changelog: str = '', user=None):
        """
        Cria uma nova versão do procedimento.
        
        Args:
            file: Novo arquivo do procedimento
            changelog: Descrição das mudanças
            user: Usuário que está criando a versão
        """
        # Salvar versão anterior no histórico
        ProcedureVersion.objects.create(
            procedure=self,
            version_number=self.version,
            file=self.file,
            file_type=self.file_type,
            changelog=changelog or f'Versão {self.version}',
            created_by=user
        )
        
        # Atualizar procedimento com nova versão
        self.version += 1
        self.file = file
        
        # Detectar tipo de arquivo
        if file.name.lower().endswith('.pdf'):
            self.file_type = self.FileType.PDF
        elif file.name.lower().endswith('.md'):
            self.file_type = self.FileType.MARKDOWN
        elif file.name.lower().endswith('.docx'):
            self.file_type = self.FileType.DOCX
            
        self.save()


class ProcedureVersion(models.Model):
    """
    Histórico de versões de um procedimento.
    
    Mantém registro de todas as versões anteriores do procedimento.
    """
    procedure = models.ForeignKey(
        Procedure,
        on_delete=models.CASCADE,
        related_name='versions',
        verbose_name='Procedimento'
    )
    version_number = models.PositiveIntegerField(
        verbose_name='Número da Versão'
    )
    file = models.FileField(
        upload_to='procedures/versions/%Y/%m/',
        verbose_name='Arquivo'
    )
    file_type = models.CharField(
        max_length=20,
        choices=Procedure.FileType.choices,
        default=Procedure.FileType.PDF,
        verbose_name='Tipo de Arquivo'
    )
    changelog = models.TextField(
        blank=True,
        verbose_name='Changelog',
        help_text='Descrição das mudanças nesta versão'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='procedure_versions',
        verbose_name='Criado por'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')

    class Meta:
        verbose_name = 'Versão de Procedimento'
        verbose_name_plural = 'Versões de Procedimentos'
        ordering = ['-version_number']
        unique_together = ['procedure', 'version_number']

    def __str__(self):
        return f"{self.procedure.title} - v{self.version_number}"
