"""
Finance Models - Orçamento Vivo MVP

Modelos principais:
- CostCenter: Centros de custo com hierarquia
- RateCard: Tabela de custos por role com vigência
- BudgetPlan: Plano orçamentário anual
- BudgetEnvelope: Envelope de orçamento por categoria/centro
- BudgetMonth: Limites mensais do envelope

Referências:
- docs/finance/01-erd.md
- docs/finance/02-regras-negocio.md
"""

import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError


class CostCenter(models.Model):
    """
    Centro de Custo com hierarquia.
    
    Hierarquia típica: Unidade > Prédio > Área > Sistema
    
    Exemplos:
    - Sede SP > Torre A > Ar Condicionado
    - Filial RJ > Galpão 1 > Elétrica
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Hierarquia
    parent = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Centro de Custo Pai'
    )
    
    # Identificação
    code = models.CharField(
        max_length=50,
        verbose_name='Código',
        help_text='Código único do centro de custo (ex: CC-001)'
    )
    name = models.CharField(
        max_length=200,
        verbose_name='Nome',
        help_text='Nome descritivo do centro de custo'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Descrição'
    )
    
    # Classificação
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Tags',
        help_text='Tags para classificação (ex: ["hvac", "crítico"])'
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    
    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_cost_centers',
        verbose_name='Criado por'
    )
    
    class Meta:
        verbose_name = 'Centro de Custo'
        verbose_name_plural = 'Centros de Custo'
        ordering = ['code', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['code'],
                name='finance_costcenter_unique_code'
            )
        ]
        indexes = [
            models.Index(fields=['code'], name='finance_cc_code_idx'),
            models.Index(fields=['parent'], name='finance_cc_parent_idx'),
            models.Index(fields=['is_active'], name='finance_cc_active_idx'),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"
    
    def clean(self):
        """Validação para evitar referência circular na hierarquia."""
        if self.parent:
            if self.parent == self:
                raise ValidationError({'parent': 'Centro de custo não pode ser pai de si mesmo.'})
            
            # Verificar ciclo na hierarquia
            current = self.parent
            visited = {self.pk}
            while current:
                if current.pk in visited:
                    raise ValidationError({'parent': 'Referência circular detectada na hierarquia.'})
                visited.add(current.pk)
                current = current.parent
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def level(self) -> int:
        """Retorna o nível na hierarquia (0 = raiz)."""
        level = 0
        current = self.parent
        while current:
            level += 1
            current = current.parent
        return level
    
    @property
    def full_path(self) -> str:
        """Retorna o caminho completo na hierarquia."""
        path = [self.name]
        current = self.parent
        while current:
            path.insert(0, current.name)
            current = current.parent
        return ' > '.join(path)


class RateCard(models.Model):
    """
    Tabela de Custos por Role (Função).
    
    Define o custo por hora de cada função/cargo para cálculo de mão de obra.
    Suporta vigência para histórico de custos.
    
    Exemplo:
    - Técnico HVAC: R$ 85/hora (01/01/2024 a 31/12/2024)
    - Eletricista Sênior: R$ 120/hora (01/01/2024 a ...)
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Identificação da função
    role = models.CharField(
        max_length=100,
        verbose_name='Função/Cargo',
        help_text='Nome da função (ex: Técnico HVAC, Eletricista)'
    )
    role_code = models.CharField(
        max_length=50,
        verbose_name='Código da Função',
        help_text='Código único da função (ex: TECH-HVAC)',
        blank=True
    )
    description = models.TextField(
        blank=True,
        verbose_name='Descrição'
    )
    
    # Custo
    cost_per_hour = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Custo por Hora',
        help_text='Valor em reais por hora trabalhada'
    )
    currency = models.CharField(
        max_length=3,
        default='BRL',
        verbose_name='Moeda'
    )
    
    # Vigência
    effective_from = models.DateField(
        verbose_name='Vigência Início',
        help_text='Data de início da vigência deste custo'
    )
    effective_to = models.DateField(
        null=True,
        blank=True,
        verbose_name='Vigência Fim',
        help_text='Data de fim da vigência (vazio = vigente)'
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    
    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_rate_cards',
        verbose_name='Criado por'
    )
    
    class Meta:
        verbose_name = 'Tabela de Custo'
        verbose_name_plural = 'Tabelas de Custo'
        ordering = ['role', '-effective_from']
        indexes = [
            models.Index(fields=['role'], name='finance_rc_role_idx'),
            models.Index(fields=['role_code'], name='finance_rc_role_code_idx'),
            models.Index(fields=['effective_from', 'effective_to'], name='finance_rc_vigencia_idx'),
            models.Index(fields=['is_active'], name='finance_rc_active_idx'),
        ]

    def __str__(self):
        vigencia = f"desde {self.effective_from}"
        if self.effective_to:
            vigencia = f"{self.effective_from} a {self.effective_to}"
        return f"{self.role} - R$ {self.cost_per_hour}/h ({vigencia})"
    
    def clean(self):
        """Validação de vigência."""
        if self.effective_to and self.effective_from:
            if self.effective_to < self.effective_from:
                raise ValidationError({
                    'effective_to': 'Data de fim deve ser posterior à data de início.'
                })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @classmethod
    def get_rate_for_role(cls, role: str, date) -> 'RateCard | None':
        """
        Retorna o RateCard vigente para uma função em uma data específica.
        
        Args:
            role: Nome ou código da função
            date: Data para verificar vigência
            
        Returns:
            RateCard vigente ou None se não encontrado
        """
        return cls.objects.filter(
            models.Q(role=role) | models.Q(role_code=role),
            is_active=True,
            effective_from__lte=date
        ).filter(
            models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=date)
        ).order_by('-effective_from').first()


class BudgetPlan(models.Model):
    """
    Plano Orçamentário.
    
    Representa um plano de orçamento, tipicamente anual.
    Contém múltiplos envelopes (BudgetEnvelope) para diferentes categorias/centros.
    
    Exemplo:
    - Plano Orçamentário 2024
    - Plano Emergencial Q4 2024
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Identificação
    name = models.CharField(
        max_length=200,
        verbose_name='Nome',
        help_text='Nome do plano orçamentário (ex: Orçamento 2024)'
    )
    code = models.CharField(
        max_length=50,
        verbose_name='Código',
        help_text='Código único do plano (ex: BUDGET-2024)'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Descrição'
    )
    
    # Período
    year = models.PositiveIntegerField(
        verbose_name='Ano',
        help_text='Ano do plano orçamentário'
    )
    start_date = models.DateField(
        verbose_name='Data Início',
        help_text='Data de início do período do plano'
    )
    end_date = models.DateField(
        verbose_name='Data Fim',
        help_text='Data de fim do período do plano'
    )
    
    # Valores totais (calculados/atualizados)
    total_planned = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Total Planejado',
        help_text='Soma de todos os envelopes'
    )
    currency = models.CharField(
        max_length=3,
        default='BRL',
        verbose_name='Moeda'
    )
    
    # Status
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Rascunho'
        ACTIVE = 'active', 'Ativo'
        CLOSED = 'closed', 'Fechado'
        CANCELLED = 'cancelled', 'Cancelado'
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name='Status'
    )
    
    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_budget_plans',
        verbose_name='Criado por'
    )
    
    class Meta:
        verbose_name = 'Plano Orçamentário'
        verbose_name_plural = 'Planos Orçamentários'
        ordering = ['-year', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['code'],
                name='finance_budgetplan_unique_code'
            )
        ]
        indexes = [
            models.Index(fields=['code'], name='finance_bp_code_idx'),
            models.Index(fields=['year'], name='finance_bp_year_idx'),
            models.Index(fields=['status'], name='finance_bp_status_idx'),
        ]

    def __str__(self):
        return f"{self.name} ({self.year})"
    
    def clean(self):
        """Validação de período."""
        if self.end_date and self.start_date:
            if self.end_date < self.start_date:
                raise ValidationError({
                    'end_date': 'Data de fim deve ser posterior à data de início.'
                })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def recalculate_total(self):
        """Recalcula o total planejado a partir dos envelopes."""
        from django.db.models import Sum
        total = self.envelopes.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        self.total_planned = total
        self.save(update_fields=['total_planned', 'updated_at'])


class BudgetEnvelope(models.Model):
    """
    Envelope de Orçamento.
    
    Representa uma alocação de orçamento para uma categoria/centro específico
    dentro de um plano. Cada envelope pode ter distribuição mensal.
    
    Exemplo:
    - Manutenção Preventiva - HVAC: R$ 120.000
    - Peças e Materiais - Geral: R$ 50.000
    """
    
    class Category(models.TextChoices):
        PREVENTIVE = 'preventive', 'Manutenção Preventiva'
        CORRECTIVE = 'corrective', 'Manutenção Corretiva'
        PREDICTIVE = 'predictive', 'Manutenção Preditiva'
        IMPROVEMENT = 'improvement', 'Melhorias'
        CONTRACTS = 'contracts', 'Contratos'
        PARTS = 'parts', 'Peças e Materiais'
        ENERGY = 'energy', 'Energia'
        OTHER = 'other', 'Outros'
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Relacionamentos
    budget_plan = models.ForeignKey(
        BudgetPlan,
        on_delete=models.CASCADE,
        related_name='envelopes',
        verbose_name='Plano Orçamentário'
    )
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.PROTECT,
        related_name='budget_envelopes',
        verbose_name='Centro de Custo'
    )
    
    # Identificação
    name = models.CharField(
        max_length=200,
        verbose_name='Nome',
        help_text='Nome do envelope (ex: Manutenção Preventiva HVAC)'
    )
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER,
        verbose_name='Categoria'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Descrição'
    )
    
    # Valores
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Valor Total',
        help_text='Valor total alocado para este envelope'
    )
    currency = models.CharField(
        max_length=3,
        default='BRL',
        verbose_name='Moeda'
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    
    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    
    class Meta:
        verbose_name = 'Envelope de Orçamento'
        verbose_name_plural = 'Envelopes de Orçamento'
        ordering = ['budget_plan', 'category', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['budget_plan', 'cost_center', 'category'],
                name='finance_envelope_unique_plan_cc_cat'
            )
        ]
        indexes = [
            models.Index(fields=['budget_plan'], name='finance_env_plan_idx'),
            models.Index(fields=['cost_center'], name='finance_env_cc_idx'),
            models.Index(fields=['category'], name='finance_env_cat_idx'),
        ]

    def __str__(self):
        return f"{self.name} - {self.cost_center.code} ({self.budget_plan.year})"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Atualizar total do plano
        self.budget_plan.recalculate_total()


class BudgetMonth(models.Model):
    """
    Limite Mensal do Envelope.
    
    Define o valor planejado para cada mês dentro de um envelope.
    O campo month é sempre o primeiro dia do mês para evitar ambiguidades.
    
    Exemplo:
    - Janeiro/2024: R$ 10.000
    - Fevereiro/2024: R$ 10.000
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Relacionamento
    envelope = models.ForeignKey(
        BudgetEnvelope,
        on_delete=models.CASCADE,
        related_name='months',
        verbose_name='Envelope'
    )
    
    # Período (sempre 1º dia do mês)
    month = models.DateField(
        verbose_name='Mês',
        help_text='Primeiro dia do mês (ex: 2024-01-01)'
    )
    
    # Valores
    planned_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Valor Planejado',
        help_text='Valor planejado para este mês'
    )
    
    # Lock de período
    is_locked = models.BooleanField(
        default=False,
        verbose_name='Período Bloqueado',
        help_text='Se bloqueado, não permite alterações em transações'
    )
    locked_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Bloqueado em'
    )
    locked_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='locked_budget_months',
        verbose_name='Bloqueado por'
    )
    
    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    
    class Meta:
        verbose_name = 'Mês do Orçamento'
        verbose_name_plural = 'Meses do Orçamento'
        ordering = ['envelope', 'month']
        constraints = [
            models.UniqueConstraint(
                fields=['envelope', 'month'],
                name='finance_budgetmonth_unique_env_month'
            )
        ]
        indexes = [
            models.Index(fields=['envelope'], name='finance_bm_envelope_idx'),
            models.Index(fields=['month'], name='finance_bm_month_idx'),
            models.Index(fields=['is_locked'], name='finance_bm_locked_idx'),
        ]

    def __str__(self):
        month_name = self.month.strftime('%B/%Y')
        return f"{self.envelope.name} - {month_name}"
    
    def clean(self):
        """Garante que month é sempre o primeiro dia do mês."""
        if self.month and self.month.day != 1:
            # Normaliza para o primeiro dia
            self.month = self.month.replace(day=1)
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def lock(self, user):
        """Bloqueia o período para edição."""
        from django.utils import timezone
        self.is_locked = True
        self.locked_at = timezone.now()
        self.locked_by = user
        self.save(update_fields=['is_locked', 'locked_at', 'locked_by', 'updated_at'])
    
    def unlock(self, user):
        """Desbloqueia o período (requer permissão especial)."""
        self.is_locked = False
        self.locked_at = None
        self.locked_by = None
        self.save(update_fields=['is_locked', 'locked_at', 'locked_by', 'updated_at'])
