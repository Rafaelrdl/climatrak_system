"""
Finance Models - Orçamento Vivo MVP

Modelos principais:
- CostCenter: Centros de custo com hierarquia
- RateCard: Tabela de custos por role com vigência
- BudgetPlan: Plano orçamentário anual
- BudgetEnvelope: Envelope de orçamento por categoria/centro
- BudgetMonth: Limites mensais do envelope
- EnergyTariff: Tarifas de energia (V2)
- EnergyReading: Leituras de energia (V2)
- Baseline: Baselines para savings automático (V2)
- RiskSnapshot: Snapshots de risco (V2)

Referências:
- docs/finance/01-erd.md
- docs/finance/02-regras-negocio.md
"""

import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class CostCenter(models.Model):
    """
    Centro de Custo com hierarquia.

    Hierarquia típica: Unidade > Prédio > Área > Sistema

    Exemplos:
    - Sede SP > Torre A > Ar Condicionado
    - Filial RJ > Galpão 1 > Elétrica
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Hierarquia
    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="children",
        verbose_name="Centro de Custo Pai",
    )

    # Identificação
    code = models.CharField(
        max_length=50,
        verbose_name="Código",
        help_text="Código único do centro de custo (ex: CC-001)",
    )
    name = models.CharField(
        max_length=200,
        verbose_name="Nome",
        help_text="Nome descritivo do centro de custo",
    )
    description = models.TextField(blank=True, verbose_name="Descrição")

    # Classificação
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Tags",
        help_text='Tags para classificação (ex: ["hvac", "crítico"])',
    )

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Ativo")

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_cost_centers",
        verbose_name="Criado por",
    )

    class Meta:
        verbose_name = "Centro de Custo"
        verbose_name_plural = "Centros de Custo"
        ordering = ["code", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["code"], name="finance_costcenter_unique_code"
            )
        ]
        indexes = [
            models.Index(fields=["code"], name="finance_cc_code_idx"),
            models.Index(fields=["parent"], name="finance_cc_parent_idx"),
            models.Index(fields=["is_active"], name="finance_cc_active_idx"),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"

    def clean(self):
        """Validação para evitar referência circular na hierarquia."""
        if self.parent:
            if self.parent == self:
                raise ValidationError(
                    {"parent": "Centro de custo não pode ser pai de si mesmo."}
                )

            # Verificar ciclo na hierarquia
            current = self.parent
            visited = {self.pk}
            while current:
                if current.pk in visited:
                    raise ValidationError(
                        {"parent": "Referência circular detectada na hierarquia."}
                    )
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
        return " > ".join(path)


class RateCard(models.Model):
    """
    Tabela de Custos por Role (Função).

    Define o custo por hora de cada função/cargo para cálculo de mão de obra.
    Suporta vigência para histórico de custos.

    Exemplo:
    - Técnico HVAC: R$ 85/hora (01/01/2024 a 31/12/2024)
    - Eletricista Sênior: R$ 120/hora (01/01/2024 a ...)
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Identificação da função
    role = models.CharField(
        max_length=100,
        verbose_name="Função/Cargo",
        help_text="Nome da função (ex: Técnico HVAC, Eletricista)",
    )
    role_code = models.CharField(
        max_length=50,
        verbose_name="Código da Função",
        help_text="Código único da função (ex: TECH-HVAC)",
        blank=True,
    )
    description = models.TextField(blank=True, verbose_name="Descrição")

    # Custo
    cost_per_hour = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Custo por Hora",
        help_text="Valor em reais por hora trabalhada",
    )
    currency = models.CharField(max_length=3, default="BRL", verbose_name="Moeda")

    # Vigência
    effective_from = models.DateField(
        verbose_name="Vigência Início",
        help_text="Data de início da vigência deste custo",
    )
    effective_to = models.DateField(
        null=True,
        blank=True,
        verbose_name="Vigência Fim",
        help_text="Data de fim da vigência (vazio = vigente)",
    )

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Ativo")

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_rate_cards",
        verbose_name="Criado por",
    )

    class Meta:
        verbose_name = "Tabela de Custo"
        verbose_name_plural = "Tabelas de Custo"
        ordering = ["role", "-effective_from"]
        indexes = [
            models.Index(fields=["role"], name="finance_rc_role_idx"),
            models.Index(fields=["role_code"], name="finance_rc_role_code_idx"),
            models.Index(
                fields=["effective_from", "effective_to"],
                name="finance_rc_vigencia_idx",
            ),
            models.Index(fields=["is_active"], name="finance_rc_active_idx"),
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
                raise ValidationError(
                    {"effective_to": "Data de fim deve ser posterior à data de início."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_rate_for_role(cls, role: str, date) -> "RateCard | None":
        """
        Retorna o RateCard vigente para uma função em uma data específica.

        Args:
            role: Nome ou código da função
            date: Data para verificar vigência

        Returns:
            RateCard vigente ou None se não encontrado
        """
        return (
            cls.objects.filter(
                models.Q(role=role) | models.Q(role_code=role),
                is_active=True,
                effective_from__lte=date,
            )
            .filter(
                models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=date)
            )
            .order_by("-effective_from")
            .first()
        )


class BudgetPlan(models.Model):
    """
    Plano Orçamentário.

    Representa um plano de orçamento, tipicamente anual.
    Contém múltiplos envelopes (BudgetEnvelope) para diferentes categorias/centros.

    Exemplo:
    - Plano Orçamentário 2024
    - Plano Emergencial Q4 2024
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Identificação
    name = models.CharField(
        max_length=200,
        verbose_name="Nome",
        help_text="Nome do plano orçamentário (ex: Orçamento 2024)",
    )
    code = models.CharField(
        max_length=50,
        verbose_name="Código",
        help_text="Código único do plano (ex: BUDGET-2024)",
    )
    description = models.TextField(blank=True, verbose_name="Descrição")

    # Período
    year = models.PositiveIntegerField(
        verbose_name="Ano", help_text="Ano do plano orçamentário"
    )
    start_date = models.DateField(
        verbose_name="Data Início", help_text="Data de início do período do plano"
    )
    end_date = models.DateField(
        verbose_name="Data Fim", help_text="Data de fim do período do plano"
    )

    # Valores totais (calculados/atualizados)
    total_planned = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Total Planejado",
        help_text="Soma de todos os envelopes",
    )
    currency = models.CharField(max_length=3, default="BRL", verbose_name="Moeda")

    # Status
    class Status(models.TextChoices):
        DRAFT = "draft", "Rascunho"
        ACTIVE = "active", "Ativo"
        CLOSED = "closed", "Fechado"
        CANCELLED = "cancelled", "Cancelado"

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name="Status",
    )

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_budget_plans",
        verbose_name="Criado por",
    )

    class Meta:
        verbose_name = "Plano Orçamentário"
        verbose_name_plural = "Planos Orçamentários"
        ordering = ["-year", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["code"], name="finance_budgetplan_unique_code"
            )
        ]
        indexes = [
            models.Index(fields=["code"], name="finance_bp_code_idx"),
            models.Index(fields=["year"], name="finance_bp_year_idx"),
            models.Index(fields=["status"], name="finance_bp_status_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.year})"

    def clean(self):
        """Validação de período."""
        if self.end_date and self.start_date:
            if self.end_date < self.start_date:
                raise ValidationError(
                    {"end_date": "Data de fim deve ser posterior à data de início."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def recalculate_total(self):
        """Recalcula o total planejado a partir dos envelopes."""
        from django.db.models import Sum

        total = self.envelopes.aggregate(total=Sum("amount"))["total"] or Decimal(
            "0.00"
        )
        self.total_planned = total
        self.save(update_fields=["total_planned", "updated_at"])


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
        PREVENTIVE = "preventive", "Manutenção Preventiva"
        CORRECTIVE = "corrective", "Manutenção Corretiva"
        PREDICTIVE = "predictive", "Manutenção Preditiva"
        IMPROVEMENT = "improvement", "Melhorias"
        CONTRACTS = "contracts", "Contratos"
        PARTS = "parts", "Peças e Materiais"
        ENERGY = "energy", "Energia"
        OTHER = "other", "Outros"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relacionamentos
    budget_plan = models.ForeignKey(
        BudgetPlan,
        on_delete=models.CASCADE,
        related_name="envelopes",
        verbose_name="Plano Orçamentário",
    )
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.PROTECT,
        related_name="budget_envelopes",
        verbose_name="Centro de Custo",
    )

    # Identificação
    name = models.CharField(
        max_length=200,
        verbose_name="Nome",
        help_text="Nome do envelope (ex: Manutenção Preventiva HVAC)",
    )
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER,
        verbose_name="Categoria",
    )
    description = models.TextField(blank=True, verbose_name="Descrição")

    # Valores
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Valor Total",
        help_text="Valor total alocado para este envelope",
    )
    currency = models.CharField(max_length=3, default="BRL", verbose_name="Moeda")

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Ativo")

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Envelope de Orçamento"
        verbose_name_plural = "Envelopes de Orçamento"
        ordering = ["budget_plan", "category", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget_plan", "cost_center", "category"],
                name="finance_envelope_unique_plan_cc_cat",
            )
        ]
        indexes = [
            models.Index(fields=["budget_plan"], name="finance_env_plan_idx"),
            models.Index(fields=["cost_center"], name="finance_env_cc_idx"),
            models.Index(fields=["category"], name="finance_env_cat_idx"),
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

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relacionamento
    envelope = models.ForeignKey(
        BudgetEnvelope,
        on_delete=models.CASCADE,
        related_name="months",
        verbose_name="Envelope",
    )

    # Período (sempre 1º dia do mês)
    month = models.DateField(
        verbose_name="Mês", help_text="Primeiro dia do mês (ex: 2024-01-01)"
    )

    # Valores
    planned_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Valor Planejado",
        help_text="Valor planejado para este mês",
    )

    contingency_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Valor de Contingência",
        help_text="Valor reservado para contingências neste mês",
    )

    # Lock de período
    is_locked = models.BooleanField(
        default=False,
        verbose_name="Período Bloqueado",
        help_text="Se bloqueado, não permite alterações em transações",
    )
    locked_at = models.DateTimeField(null=True, blank=True, verbose_name="Bloqueado em")
    locked_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="locked_budget_months",
        verbose_name="Bloqueado por",
    )

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Mês do Orçamento"
        verbose_name_plural = "Meses do Orçamento"
        ordering = ["envelope", "month"]
        constraints = [
            models.UniqueConstraint(
                fields=["envelope", "month"],
                name="finance_budgetmonth_unique_env_month",
            )
        ]
        indexes = [
            models.Index(fields=["envelope"], name="finance_bm_envelope_idx"),
            models.Index(fields=["month"], name="finance_bm_month_idx"),
            models.Index(fields=["is_locked"], name="finance_bm_locked_idx"),
        ]

    def __str__(self):
        month_name = self.month.strftime("%B/%Y")
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
        self.save(update_fields=["is_locked", "locked_at", "locked_by", "updated_at"])

    def unlock(self, user):
        """Desbloqueia o período (requer permissão especial)."""
        self.is_locked = False
        self.locked_at = None
        self.locked_by = None
        self.save(update_fields=["is_locked", "locked_at", "locked_by", "updated_at"])


class CostTransaction(models.Model):
    """
    Ledger de Custos (fonte da verdade).

    Cada transação representa um custo realizado, com:
    - idempotency_key para evitar duplicação (obrigatório para automáticos)
    - is_locked para auditoria (impede edição após lock do período)
    - Vínculos opcionais com asset, work_order, vendor

    Tipos de transação (transaction_type):
    - labor: custo de mão de obra
    - parts: custo de peças/materiais
    - third_party: serviços de terceiros
    - energy: custo de energia
    - adjustment: ajuste manual
    - other: outros custos

    Referências:
    - docs/finance/02-regras-negocio.md
    """

    class TransactionType(models.TextChoices):
        LABOR = "labor", "Mão de Obra"
        PARTS = "parts", "Peças/Materiais"
        THIRD_PARTY = "third_party", "Terceiros"
        ENERGY = "energy", "Energia"
        ADJUSTMENT = "adjustment", "Ajuste"
        OTHER = "other", "Outros"

    class Category(models.TextChoices):
        PREVENTIVE = "preventive", "Manutenção Preventiva"
        CORRECTIVE = "corrective", "Manutenção Corretiva"
        PREDICTIVE = "predictive", "Manutenção Preditiva"
        IMPROVEMENT = "improvement", "Melhorias"
        CONTRACTS = "contracts", "Contratos"
        PARTS = "parts", "Peças e Materiais"
        ENERGY = "energy", "Energia"
        OTHER = "other", "Outros"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Idempotência (obrigatório para transações automáticas)
    # Formato: wo:{work_order_id}:labor, wo:{work_order_id}:parts, etc.
    idempotency_key = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Chave de Idempotência",
        help_text="Chave única para evitar duplicação (ex: wo:uuid:labor)",
    )

    # Classificação
    transaction_type = models.CharField(
        max_length=20, choices=TransactionType.choices, verbose_name="Tipo de Transação"
    )
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER,
        verbose_name="Categoria",
    )

    # Valores
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="Valor",
        help_text="Valor da transação (positivo = custo, negativo = crédito)",
    )
    currency = models.CharField(max_length=3, default="BRL", verbose_name="Moeda")

    # Data da ocorrência (não confundir com created_at)
    occurred_at = models.DateTimeField(
        verbose_name="Data da Ocorrência", help_text="Data em que o custo ocorreu"
    )

    # Descrição
    description = models.TextField(
        blank=True,
        verbose_name="Descrição",
        help_text="Descrição detalhada da transação",
    )

    # Metadados (JSON flexível para detalhes)
    meta = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadados",
        help_text="Dados adicionais (ex: breakdown de horas, itens)",
    )

    # Relacionamentos obrigatórios
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.PROTECT,
        related_name="transactions",
        verbose_name="Centro de Custo",
    )

    # Relacionamentos opcionais (vínculos com origem)
    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cost_transactions",
        verbose_name="Ativo",
    )
    work_order = models.ForeignKey(
        "cmms.WorkOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cost_transactions",
        verbose_name="Ordem de Serviço",
    )
    vendor_id = models.UUIDField(
        null=True,
        blank=True,
        verbose_name="Fornecedor ID",
        help_text="ID do fornecedor (para terceiros/contratos)",
    )

    # Lock de período
    is_locked = models.BooleanField(
        default=False,
        verbose_name="Bloqueado",
        help_text="Transação bloqueada para edição (período fechado)",
    )
    locked_at = models.DateTimeField(null=True, blank=True, verbose_name="Bloqueado em")
    locked_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="locked_transactions",
        verbose_name="Bloqueado por",
    )

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_cost_transactions",
        verbose_name="Criado por",
    )

    class Meta:
        verbose_name = "Transação de Custo"
        verbose_name_plural = "Transações de Custo"
        ordering = ["-occurred_at", "-created_at"]
        constraints = [
            # Idempotência: unique por idempotency_key (quando preenchido)
            # Django-tenants garante isolamento por schema
            models.UniqueConstraint(
                fields=["idempotency_key"],
                condition=models.Q(idempotency_key__isnull=False),
                name="finance_costtx_unique_idempotency",
            )
        ]
        indexes = [
            models.Index(fields=["idempotency_key"], name="finance_ctx_idemp_idx"),
            models.Index(fields=["transaction_type"], name="finance_ctx_type_idx"),
            models.Index(fields=["category"], name="finance_ctx_cat_idx"),
            models.Index(fields=["occurred_at"], name="finance_ctx_occurred_idx"),
            models.Index(fields=["cost_center"], name="finance_ctx_cc_idx"),
            models.Index(fields=["work_order"], name="finance_ctx_wo_idx"),
            models.Index(fields=["asset"], name="finance_ctx_asset_idx"),
            models.Index(fields=["is_locked"], name="finance_ctx_locked_idx"),
            # Índice composto para queries de summary
            models.Index(
                fields=["cost_center", "category", "occurred_at"],
                name="finance_ctx_summary_idx",
            ),
        ]

    def __str__(self):
        return f"{self.get_transaction_type_display()} - R$ {self.amount} ({self.occurred_at.date()})"

    def clean(self):
        """Validações do modelo."""
        # Transações automáticas devem ter idempotency_key
        if self.transaction_type != self.TransactionType.ADJUSTMENT:
            if self.work_order and not self.idempotency_key:
                raise ValidationError(
                    {
                        "idempotency_key": "Transações vinculadas a OS devem ter chave de idempotência."
                    }
                )

        # Não permitir edição de transação bloqueada
        if self.pk and self.is_locked:
            try:
                original = CostTransaction.objects.get(pk=self.pk)
                if original.is_locked:
                    # Verificar se está tentando alterar campos protegidos
                    protected_fields = [
                        "amount",
                        "transaction_type",
                        "category",
                        "occurred_at",
                        "cost_center",
                        "asset",
                        "work_order",
                        "idempotency_key",
                    ]
                    for field in protected_fields:
                        if getattr(original, field) != getattr(self, field):
                            raise ValidationError(
                                "Transação bloqueada não pode ser alterada. Use ajuste manual."
                            )
            except CostTransaction.DoesNotExist:
                pass

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def lock(self, user):
        """Bloqueia a transação para edição."""
        from django.utils import timezone

        self.is_locked = True
        self.locked_at = timezone.now()
        self.locked_by = user
        self.save(update_fields=["is_locked", "locked_at", "locked_by", "updated_at"])

    @classmethod
    def get_or_create_idempotent(cls, idempotency_key: str, defaults: dict):
        """
        Obtém ou cria transação de forma idempotente.

        Args:
            idempotency_key: Chave única (ex: wo:uuid:labor)
            defaults: Campos para criar se não existir

        Returns:
            tuple: (transaction, created)
        """
        try:
            return cls.objects.get(idempotency_key=idempotency_key), False
        except cls.DoesNotExist:
            defaults["idempotency_key"] = idempotency_key
            transaction = cls(**defaults)
            transaction.save()
            return transaction, True

    @classmethod
    def generate_idempotency_key(cls, work_order_id: str, transaction_type: str) -> str:
        """
        Gera chave de idempotência determinística.

        Formato: wo:{work_order_id}:{transaction_type}

        Args:
            work_order_id: UUID da OS
            transaction_type: labor, parts, third_party

        Returns:
            Chave de idempotência
        """
        return f"wo:{work_order_id}:{transaction_type}"


class Commitment(models.Model):
    """
    Compromisso de Orçamento.

    Representa uma reserva de orçamento antes do gasto efetivo.
    Permite rastrear valores comprometidos vs realizados.

    Fluxo típico:
    1. Criação em DRAFT
    2. Submissão para aprovação (SUBMITTED)
    3. Aprovação (APPROVED) → emite evento commitment.approved
    4. Realização (REALIZED) quando o gasto efetivo ocorre

    Referências:
    - docs/finance/01-erd.md
    - docs/finance/02-regras-negocio.md (seção 6)
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Rascunho"
        SUBMITTED = "submitted", "Submetido"
        APPROVED = "approved", "Aprovado"
        REJECTED = "rejected", "Rejeitado"
        CANCELLED = "cancelled", "Cancelado"
        REALIZED = "realized", "Realizado"

    class Category(models.TextChoices):
        PREVENTIVE = "preventive", "Manutenção Preventiva"
        CORRECTIVE = "corrective", "Manutenção Corretiva"
        PREDICTIVE = "predictive", "Manutenção Preditiva"
        IMPROVEMENT = "improvement", "Melhorias"
        CONTRACTS = "contracts", "Contratos"
        PARTS = "parts", "Peças e Materiais"
        ENERGY = "energy", "Energia"
        OTHER = "other", "Outros"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relacionamento obrigatório
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.PROTECT,
        related_name="commitments",
        verbose_name="Centro de Custo",
    )

    # Período (sempre 1º dia do mês)
    budget_month = models.DateField(
        verbose_name="Mês do Orçamento",
        help_text="Primeiro dia do mês (ex: 2024-01-01)",
    )

    # Valores
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Valor",
        help_text="Valor comprometido",
    )
    currency = models.CharField(max_length=3, default="BRL", verbose_name="Moeda")

    # Classificação
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER,
        verbose_name="Categoria",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name="Status",
    )

    # Descrição
    description = models.TextField(
        verbose_name="Descrição", help_text="Descrição do compromisso"
    )

    # Relacionamento opcional com OS
    work_order = models.ForeignKey(
        "cmms.WorkOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="commitments",
        verbose_name="Ordem de Serviço",
    )

    # Fornecedor (texto no MVP, futuramente FK para tabela de fornecedores)
    vendor_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Nome do Fornecedor",
        help_text="Nome do fornecedor (se aplicável)",
    )

    # Aprovação
    approved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_commitments",
        verbose_name="Aprovado por",
    )
    approved_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Aprovado em"
    )
    rejection_reason = models.TextField(blank=True, verbose_name="Motivo da Rejeição")

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_commitments",
        verbose_name="Criado por",
    )

    class Meta:
        verbose_name = "Compromisso"
        verbose_name_plural = "Compromissos"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["cost_center"], name="finance_commit_cc_idx"),
            models.Index(fields=["budget_month"], name="finance_commit_month_idx"),
            models.Index(fields=["status"], name="finance_commit_status_idx"),
            models.Index(fields=["category"], name="finance_commit_cat_idx"),
            models.Index(fields=["work_order"], name="finance_commit_wo_idx"),
            # Índice composto para queries de summary
            models.Index(
                fields=["cost_center", "budget_month", "status"],
                name="finance_commit_summary_idx",
            ),
        ]

    def __str__(self):
        return f"Compromisso {self.id} - {self.cost_center.code} - R$ {self.amount}"

    def clean(self):
        """Garante que budget_month é sempre o primeiro dia do mês."""
        if self.budget_month and self.budget_month.day != 1:
            self.budget_month = self.budget_month.replace(day=1)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def submit(self):
        """Submete o compromisso para aprovação."""
        if self.status != self.Status.DRAFT:
            raise ValidationError(
                "Apenas compromissos em rascunho podem ser submetidos."
            )
        self.status = self.Status.SUBMITTED
        self.save(update_fields=["status", "updated_at"])

    def approve(self, user):
        """
        Aprova o compromisso.

        Args:
            user: Usuário que está aprovando

        Returns:
            OutboxEvent: Evento commitment.approved publicado
        """
        from django.utils import timezone

        from apps.core_events.services import EventPublisher

        if self.status != self.Status.SUBMITTED:
            raise ValidationError("Apenas compromissos submetidos podem ser aprovados.")

        self.status = self.Status.APPROVED
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])

        # Publicar evento commitment.approved
        # O tenant_id vem da connection atual (django-tenants)
        from django.db import connection

        tenant = connection.tenant

        event = EventPublisher.publish(
            tenant_id=tenant.id,
            event_name="commitment.approved",
            aggregate_type="commitment",
            aggregate_id=self.id,
            data={
                "commitment_id": str(self.id),
                "amount": float(self.amount),
                "budget_month": self.budget_month.isoformat(),
                "cost_center_id": str(self.cost_center_id),
                "category": self.category,
            },
            idempotency_key=f"commitment:{self.id}:approved",
        )

        return event

    def reject(self, user, reason: str):
        """
        Rejeita o compromisso.

        Args:
            user: Usuário que está rejeitando
            reason: Motivo da rejeição
        """
        if self.status != self.Status.SUBMITTED:
            raise ValidationError(
                "Apenas compromissos submetidos podem ser rejeitados."
            )

        if not reason or len(reason.strip()) < 10:
            raise ValidationError(
                "Motivo da rejeição é obrigatório (mínimo 10 caracteres)."
            )

        self.status = self.Status.REJECTED
        self.rejection_reason = reason
        self.save(update_fields=["status", "rejection_reason", "updated_at"])

    def cancel(self, user):
        """
        Cancela o compromisso.

        Pode ser cancelado em qualquer status exceto REALIZED.
        """
        if self.status == self.Status.REALIZED:
            raise ValidationError("Compromissos realizados não podem ser cancelados.")

        self.status = self.Status.CANCELLED
        self.save(update_fields=["status", "updated_at"])

    def realize(self):
        """
        Marca o compromisso como realizado.

        Chamado quando o gasto efetivo foi lançado no ledger.
        """
        if self.status != self.Status.APPROVED:
            raise ValidationError("Apenas compromissos aprovados podem ser realizados.")

        self.status = self.Status.REALIZED
        self.save(update_fields=["status", "updated_at"])


class LedgerAdjustment(models.Model):
    """
    Ajuste de Ledger.

    Usado para fazer ajustes em transações de períodos bloqueados.
    Mantém auditoria completa com motivo e referência à transação original.

    Regras:
    - Só pode ser criado por usuários com permissão
    - Deve ter motivo obrigatório
    - Cria nova CostTransaction do tipo ADJUSTMENT

    Referências:
    - docs/finance/02-regras-negocio.md (seção 7)
    """

    class AdjustmentType(models.TextChoices):
        CORRECTION = "correction", "Correção de Valor"
        RECLASSIFICATION = "reclassification", "Reclassificação"
        REVERSAL = "reversal", "Estorno"
        OTHER = "other", "Outro"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Referência à transação original (opcional - pode ser ajuste avulso)
    original_transaction = models.ForeignKey(
        CostTransaction,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="adjustments",
        verbose_name="Transação Original",
    )

    # Nova transação criada pelo ajuste
    adjustment_transaction = models.OneToOneField(
        CostTransaction,
        on_delete=models.PROTECT,
        related_name="adjustment_record",
        verbose_name="Transação de Ajuste",
    )

    # Tipo de ajuste
    adjustment_type = models.CharField(
        max_length=20, choices=AdjustmentType.choices, verbose_name="Tipo de Ajuste"
    )

    # Motivo obrigatório
    reason = models.TextField(
        verbose_name="Motivo", help_text="Justificativa para o ajuste (obrigatório)"
    )

    # Valores (para auditoria)
    original_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Valor Original",
        help_text="Valor da transação antes do ajuste",
    )
    adjustment_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="Valor do Ajuste",
        help_text="Valor do ajuste (positivo ou negativo)",
    )

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="created_adjustments",
        verbose_name="Criado por",
    )

    # Aprovação (opcional para workflow futuro)
    is_approved = models.BooleanField(
        default=True,
        verbose_name="Aprovado",
        help_text="Se requer aprovação, iniciar como False",
    )
    approved_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Aprovado em"
    )
    approved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_adjustments",
        verbose_name="Aprovado por",
    )

    class Meta:
        verbose_name = "Ajuste de Ledger"
        verbose_name_plural = "Ajustes de Ledger"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["original_transaction"], name="finance_adj_orig_tx_idx"
            ),
            models.Index(fields=["adjustment_type"], name="finance_adj_type_idx"),
            models.Index(fields=["created_at"], name="finance_adj_created_idx"),
            models.Index(fields=["is_approved"], name="finance_adj_approved_idx"),
        ]

    def __str__(self):
        return (
            f"Ajuste {self.get_adjustment_type_display()} - R$ {self.adjustment_amount}"
        )

    def clean(self):
        """Validações do modelo."""
        if not self.reason or len(self.reason.strip()) < 10:
            raise ValidationError(
                {"reason": "Motivo é obrigatório e deve ter pelo menos 10 caracteres."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class SavingsEvent(models.Model):
    """
    Evento de Economia.

    Registra economias identificadas através de manutenção preventiva,
    alertas preditivos, ou outros eventos que evitaram custos maiores.

    Tipos de economia:
    - avoided_failure: Falha evitada por manutenção preventiva
    - energy_savings: Economia de energia
    - optimized_maintenance: Manutenção otimizada
    - early_detection: Detecção precoce de problema
    - other: Outros tipos de economia

    Referências:
    - docs/finance/01-erd.md
    - docs/finance/02-regras-negocio.md (seção 9)
    - docs/events/02-eventos-mvp.md (savings.event_posted)
    """

    class EventType(models.TextChoices):
        AVOIDED_FAILURE = "avoided_failure", "Falha Evitada"
        ENERGY_SAVINGS = "energy_savings", "Economia de Energia"
        OPTIMIZED_MAINTENANCE = "optimized_maintenance", "Manutenção Otimizada"
        EARLY_DETECTION = "early_detection", "Detecção Precoce"
        REDUCED_DOWNTIME = "reduced_downtime", "Redução de Parada"
        OTHER = "other", "Outros"

    class Confidence(models.TextChoices):
        HIGH = "high", "Alta"
        MEDIUM = "medium", "Média"
        LOW = "low", "Baixa"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Tipo de economia
    event_type = models.CharField(
        max_length=30, choices=EventType.choices, verbose_name="Tipo de Evento"
    )

    # Valor economizado
    savings_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Valor Economizado",
        help_text="Valor estimado da economia",
    )
    currency = models.CharField(max_length=3, default="BRL", verbose_name="Moeda")

    # Nível de confiança da estimativa
    confidence = models.CharField(
        max_length=10,
        choices=Confidence.choices,
        default=Confidence.MEDIUM,
        verbose_name="Confiança",
        help_text="Nível de confiança na estimativa",
    )

    # Data da ocorrência
    occurred_at = models.DateTimeField(
        verbose_name="Data da Ocorrência",
        help_text="Data em que a economia foi identificada",
    )

    # Descrição
    description = models.TextField(
        verbose_name="Descrição", help_text="Descrição detalhada do evento de economia"
    )

    # Metodologia de cálculo
    calculation_method = models.TextField(
        blank=True,
        verbose_name="Metodologia de Cálculo",
        help_text="Como o valor da economia foi calculado",
    )

    # Relacionamento obrigatório
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.PROTECT,
        related_name="savings_events",
        verbose_name="Centro de Custo",
    )

    # Relacionamentos opcionais (evidências)
    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="savings_events",
        verbose_name="Ativo",
        help_text="Ativo relacionado à economia",
    )
    work_order = models.ForeignKey(
        "cmms.WorkOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="savings_events",
        verbose_name="Ordem de Serviço",
        help_text="OS que identificou/gerou a economia",
    )
    alert = models.ForeignKey(
        "alerts.Alert",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="savings_events",
        verbose_name="Alerta",
        help_text="Alerta que originou a economia",
    )

    # Evidências/Anexos (JSON para flexibilidade no MVP)
    evidence = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Evidências",
        help_text="Links, fotos, documentos que comprovam a economia",
    )

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_savings_events",
        verbose_name="Criado por",
    )

    class Meta:
        verbose_name = "Evento de Economia"
        verbose_name_plural = "Eventos de Economia"
        ordering = ["-occurred_at"]
        indexes = [
            models.Index(fields=["cost_center"], name="finance_savings_cc_idx"),
            models.Index(fields=["event_type"], name="finance_savings_type_idx"),
            models.Index(fields=["occurred_at"], name="finance_savings_occurred_idx"),
            models.Index(fields=["asset"], name="finance_savings_asset_idx"),
            models.Index(fields=["work_order"], name="finance_savings_wo_idx"),
            # Índice composto para summary
            models.Index(
                fields=["cost_center", "occurred_at", "event_type"],
                name="finance_savings_summary_idx",
            ),
        ]

    def __str__(self):
        return f"{self.get_event_type_display()} - R$ {self.savings_amount} ({self.occurred_at.date()})"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        # Publicar evento na outbox ao criar
        if is_new:
            self._publish_event()

    def _publish_event(self):
        """Publica evento savings.event_posted na outbox."""
        from django.db import connection

        from apps.core_events.services import EventPublisher

        tenant = connection.tenant

        EventPublisher.publish(
            tenant_id=tenant.id,
            event_name="savings.event_posted",
            aggregate_type="savings_event",
            aggregate_id=self.id,
            data={
                "savings_event_id": str(self.id),
                "amount": float(self.savings_amount),
                "occurred_at": self.occurred_at.isoformat(),
                "cost_center_id": str(self.cost_center_id),
                "asset_id": str(self.asset_id) if self.asset_id else None,
                "event_type": self.event_type,
            },
            idempotency_key=f"savings:{self.id}:created",
        )


# ============================================================================
# V2 (M4/M5) - ENERGY, AUTO SAVINGS, RISK/BAR
# ============================================================================


class EnergyTariff(models.Model):
    """
    Tarifa de Energia Elétrica.

    Define tarifas por distribuidora com suporte a:
    - Horário de ponta e fora ponta
    - Sistema de bandeiras tarifárias (verde, amarela, vermelha)
    - Vigência para histórico de tarifas

    Exemplo:
    - CEMIG Residencial B1: R$ 0.85/kWh fora ponta, R$ 1.45/kWh ponta

    Referências:
    - [ENG-001] Energia (tarifa + custo diário)
    """

    class BandeiraTarifaria(models.TextChoices):
        VERDE = "verde", "Verde (sem acréscimo)"
        AMARELA = "amarela", "Amarela"
        VERMELHA_1 = "vermelha_1", "Vermelha Patamar 1"
        VERMELHA_2 = "vermelha_2", "Vermelha Patamar 2"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Identificação
    name = models.CharField(
        max_length=200,
        verbose_name="Nome da Tarifa",
        help_text="Nome descritivo (ex: CEMIG B3 Comercial)",
    )
    distributor = models.CharField(
        max_length=100,
        verbose_name="Distribuidora",
        help_text="Nome da distribuidora (ex: CEMIG, CPFL, Light)",
    )
    tariff_class = models.CharField(
        max_length=50,
        verbose_name="Classe Tarifária",
        help_text="Classe da tarifa (ex: B1, B3, A4)",
        blank=True,
    )
    description = models.TextField(blank=True, verbose_name="Descrição")

    # Tarifas base (R$/kWh)
    rate_off_peak = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        validators=[MinValueValidator(Decimal("0.000000"))],
        verbose_name="Tarifa Fora Ponta (R$/kWh)",
        help_text="Valor por kWh no horário fora de ponta",
    )
    rate_peak = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        validators=[MinValueValidator(Decimal("0.000000"))],
        verbose_name="Tarifa Ponta (R$/kWh)",
        help_text="Valor por kWh no horário de ponta",
    )
    rate_intermediate = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.000000"))],
        verbose_name="Tarifa Intermediária (R$/kWh)",
        help_text="Valor por kWh no horário intermediário (se aplicável)",
    )

    # Horário de ponta (formato HH:MM)
    peak_start = models.TimeField(
        verbose_name="Início Horário Ponta",
        help_text="Hora de início do horário de ponta (ex: 18:00)",
    )
    peak_end = models.TimeField(
        verbose_name="Fim Horário Ponta",
        help_text="Hora de fim do horário de ponta (ex: 21:00)",
    )

    # Bandeiras tarifárias (acréscimo por kWh)
    flag_verde = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=Decimal("0.000000"),
        verbose_name="Acréscimo Verde (R$/kWh)",
        help_text="Acréscimo bandeira verde (normalmente 0)",
    )
    flag_amarela = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=Decimal("0.000000"),
        verbose_name="Acréscimo Amarela (R$/kWh)",
        help_text="Acréscimo bandeira amarela",
    )
    flag_vermelha_1 = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=Decimal("0.000000"),
        verbose_name="Acréscimo Vermelha P1 (R$/kWh)",
        help_text="Acréscimo bandeira vermelha patamar 1",
    )
    flag_vermelha_2 = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=Decimal("0.000000"),
        verbose_name="Acréscimo Vermelha P2 (R$/kWh)",
        help_text="Acréscimo bandeira vermelha patamar 2",
    )

    # Vigência
    effective_from = models.DateField(
        verbose_name="Vigência Início",
        help_text="Data de início da vigência desta tarifa",
    )
    effective_to = models.DateField(
        null=True,
        blank=True,
        verbose_name="Vigência Fim",
        help_text="Data de fim da vigência (vazio = vigente)",
    )

    # Moeda
    currency = models.CharField(max_length=3, default="BRL", verbose_name="Moeda")

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Ativa")

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_energy_tariffs",
        verbose_name="Criado por",
    )

    class Meta:
        verbose_name = "Tarifa de Energia"
        verbose_name_plural = "Tarifas de Energia"
        ordering = ["-effective_from", "distributor"]
        indexes = [
            models.Index(fields=["distributor"], name="finance_etariff_distrib_idx"),
            models.Index(fields=["tariff_class"], name="finance_etariff_class_idx"),
            models.Index(
                fields=["effective_from", "effective_to"],
                name="finance_etariff_vig_idx",
            ),
            models.Index(fields=["is_active"], name="finance_etariff_active_idx"),
        ]

    def __str__(self):
        vigencia = f"desde {self.effective_from}"
        if self.effective_to:
            vigencia = f"{self.effective_from} a {self.effective_to}"
        return f"{self.name} ({self.distributor}) - {vigencia}"

    def clean(self):
        """Validação de vigência e horários."""
        if self.effective_to and self.effective_from:
            if self.effective_to < self.effective_from:
                raise ValidationError(
                    {"effective_to": "Data de fim deve ser posterior à data de início."}
                )

        if self.peak_start and self.peak_end:
            if self.peak_start == self.peak_end:
                raise ValidationError(
                    {"peak_end": "Horário de fim deve ser diferente do início."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_tariff_for_date(cls, distributor: str, date) -> "EnergyTariff | None":
        """
        Retorna a tarifa vigente para uma distribuidora em uma data específica.

        Args:
            distributor: Nome da distribuidora
            date: Data para verificar vigência

        Returns:
            EnergyTariff vigente ou None se não encontrado
        """
        return (
            cls.objects.filter(
                distributor=distributor, is_active=True, effective_from__lte=date
            )
            .filter(
                models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=date)
            )
            .order_by("-effective_from")
            .first()
        )

    def get_rate_for_time(self, time, bandeira: str = "verde") -> Decimal:
        """
        Calcula a tarifa efetiva para um horário e bandeira específicos.

        Args:
            time: Horário para verificar (datetime.time)
            bandeira: Bandeira tarifária ('verde', 'amarela', 'vermelha_1', 'vermelha_2')

        Returns:
            Tarifa efetiva em R$/kWh
        """
        # Determina se é horário de ponta
        is_peak = False
        if self.peak_start <= self.peak_end:
            # Horário normal (ex: 18:00 - 21:00)
            is_peak = self.peak_start <= time <= self.peak_end
        else:
            # Horário cruzando meia-noite (ex: 22:00 - 06:00)
            is_peak = time >= self.peak_start or time <= self.peak_end

        # Tarifa base
        base_rate = self.rate_peak if is_peak else self.rate_off_peak

        # Acréscimo de bandeira
        flag_surcharge = {
            "verde": self.flag_verde,
            "amarela": self.flag_amarela,
            "vermelha_1": self.flag_vermelha_1,
            "vermelha_2": self.flag_vermelha_2,
        }.get(bandeira, self.flag_verde)

        return base_rate + flag_surcharge


class EnergyReading(models.Model):
    """
    Leitura de Energia (kWh).

    Registra consumo de energia por ativo, com:
    - Origem: medidor real ou estimativa
    - Vínculo com tarifa para cálculo de custo
    - Suporte a períodos ponta/fora ponta

    Exemplo:
    - Chiller #1: 450 kWh em 2024-01-15, medido

    Referências:
    - [ENG-001] Energia (tarifa + custo diário)
    """

    class Source(models.TextChoices):
        METER = "meter", "Medidor"
        ESTIMATE = "estimate", "Estimativa"
        TELEMETRY = "telemetry", "Telemetria IoT"
        MANUAL = "manual", "Entrada Manual"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relacionamentos
    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.CASCADE,
        related_name="energy_readings",
        verbose_name="Ativo",
    )
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.PROTECT,
        related_name="energy_readings",
        verbose_name="Centro de Custo",
    )
    tariff = models.ForeignKey(
        EnergyTariff,
        on_delete=models.PROTECT,
        related_name="readings",
        verbose_name="Tarifa Aplicada",
        null=True,
        blank=True,
        help_text="Tarifa usada para cálculo (auto-preenchido se vazio)",
    )

    # Dados de consumo
    reading_date = models.DateField(
        verbose_name="Data da Leitura", help_text="Data do consumo registrado"
    )
    kwh_total = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.000"))],
        verbose_name="Consumo Total (kWh)",
        help_text="Consumo total em quilowatt-hora",
    )
    kwh_peak = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
        verbose_name="Consumo Ponta (kWh)",
        help_text="Consumo no horário de ponta",
    )
    kwh_off_peak = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
        verbose_name="Consumo Fora Ponta (kWh)",
        help_text="Consumo no horário fora de ponta",
    )

    # Origem da leitura
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL,
        verbose_name="Origem",
    )

    # Bandeira vigente no período
    bandeira = models.CharField(
        max_length=20,
        choices=EnergyTariff.BandeiraTarifaria.choices,
        default=EnergyTariff.BandeiraTarifaria.VERDE,
        verbose_name="Bandeira Tarifária",
    )

    # Custo calculado (preenchido pelo EnergyCostEngine)
    calculated_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Custo Calculado (R$)",
        help_text="Custo calculado automaticamente",
    )
    cost_transaction = models.ForeignKey(
        CostTransaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="energy_readings",
        verbose_name="Transação de Custo",
        help_text="Transação no ledger (gerada automaticamente)",
    )

    # Metadados
    notes = models.TextField(blank=True, verbose_name="Observações")
    meta = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadados",
        help_text="Dados adicionais (ex: leitura anterior, fator de demanda)",
    )

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_energy_readings",
        verbose_name="Criado por",
    )

    class Meta:
        verbose_name = "Leitura de Energia"
        verbose_name_plural = "Leituras de Energia"
        ordering = ["-reading_date", "asset"]
        constraints = [
            # Uma leitura por ativo por dia
            models.UniqueConstraint(
                fields=["asset", "reading_date"],
                name="finance_ereading_unique_asset_date",
            )
        ]
        indexes = [
            models.Index(
                fields=["asset", "reading_date"], name="finance_ereading_asset_idx"
            ),
            models.Index(fields=["reading_date"], name="finance_ereading_date_idx"),
            models.Index(fields=["cost_center"], name="finance_ereading_cc_idx"),
            models.Index(fields=["source"], name="finance_ereading_source_idx"),
        ]

    def __str__(self):
        return f"{self.asset} - {self.kwh_total} kWh ({self.reading_date})"

    def clean(self):
        """Validação de consumo ponta + fora ponta."""
        total_parts = (self.kwh_peak or Decimal("0")) + (
            self.kwh_off_peak or Decimal("0")
        )
        if total_parts > Decimal("0") and total_parts != self.kwh_total:
            # Permite diferença se parciais foram informados
            if self.kwh_peak > self.kwh_total or self.kwh_off_peak > self.kwh_total:
                raise ValidationError(
                    {
                        "kwh_peak": "Consumo ponta não pode exceder o total.",
                        "kwh_off_peak": "Consumo fora ponta não pode exceder o total.",
                    }
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Baseline(models.Model):
    """
    Baseline para Cálculo de Savings Automático.

    Representa uma linha de base antes/depois de uma intervenção para
    calcular economia automaticamente. Típico para:
    - Retrofit de equipamento
    - Otimização de operação
    - Troca de tecnologia

    Fluxo:
    1. Registra baseline ANTES da intervenção (before_*)
    2. Após período de estabilização, registra DEPOIS (after_*)
    3. AutoSavingsEngine calcula economia e cria SavingsEvent

    Exemplo:
    - Retrofit Chiller: 450 kWh/dia antes → 380 kWh/dia depois = 70 kWh/dia economia

    Referências:
    - [SAV-001] Savings automático via baseline
    """

    class BaselineType(models.TextChoices):
        ENERGY = "energy", "Consumo de Energia"
        RUNTIME = "runtime", "Tempo de Operação"
        MAINTENANCE = "maintenance", "Frequência de Manutenção"
        PERFORMANCE = "performance", "Desempenho"
        CUSTOM = "custom", "Personalizado"

    class Status(models.TextChoices):
        COLLECTING_BEFORE = "collecting_before", "Coletando Dados Antes"
        INTERVENTION = "intervention", "Em Intervenção"
        COLLECTING_AFTER = "collecting_after", "Coletando Dados Depois"
        CALCULATED = "calculated", "Economia Calculada"
        CANCELLED = "cancelled", "Cancelado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relacionamentos
    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.CASCADE,
        related_name="baselines",
        verbose_name="Ativo",
    )
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.PROTECT,
        related_name="baselines",
        verbose_name="Centro de Custo",
    )
    work_order = models.ForeignKey(
        "cmms.WorkOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="baselines",
        verbose_name="Ordem de Serviço",
        help_text="OS da intervenção (se aplicável)",
    )

    # Identificação
    name = models.CharField(
        max_length=200,
        verbose_name="Nome",
        help_text="Nome descritivo (ex: Retrofit Chiller #1 - Energia)",
    )
    baseline_type = models.CharField(
        max_length=20,
        choices=BaselineType.choices,
        default=BaselineType.ENERGY,
        verbose_name="Tipo de Baseline",
    )
    description = models.TextField(blank=True, verbose_name="Descrição da Intervenção")

    # Status
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.COLLECTING_BEFORE,
        verbose_name="Status",
    )

    # Período ANTES da intervenção
    before_start = models.DateField(
        verbose_name="Início Período Antes",
        help_text="Início da coleta de dados antes da intervenção",
    )
    before_end = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fim Período Antes",
        help_text="Fim da coleta de dados antes da intervenção",
    )

    # Métricas ANTES
    before_avg_value = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name="Valor Médio Antes",
        help_text="Valor médio no período antes (ex: kWh/dia)",
    )
    before_total_value = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name="Valor Total Antes",
        help_text="Valor total no período antes",
    )
    before_days = models.PositiveIntegerField(
        default=0, verbose_name="Dias Coletados Antes"
    )
    before_data_points = models.PositiveIntegerField(
        default=0, verbose_name="Pontos de Dados Antes"
    )

    # Data da intervenção
    intervention_date = models.DateField(
        null=True, blank=True, verbose_name="Data da Intervenção"
    )

    # Período DEPOIS da intervenção
    after_start = models.DateField(
        null=True,
        blank=True,
        verbose_name="Início Período Depois",
        help_text="Início da coleta de dados depois da intervenção",
    )
    after_end = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fim Período Depois",
        help_text="Fim da coleta de dados depois da intervenção",
    )

    # Métricas DEPOIS
    after_avg_value = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name="Valor Médio Depois",
        help_text="Valor médio no período depois (ex: kWh/dia)",
    )
    after_total_value = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name="Valor Total Depois",
        help_text="Valor total no período depois",
    )
    after_days = models.PositiveIntegerField(
        default=0, verbose_name="Dias Coletados Depois"
    )
    after_data_points = models.PositiveIntegerField(
        default=0, verbose_name="Pontos de Dados Depois"
    )

    # Economia calculada
    savings_value = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name="Economia por Período",
        help_text="Economia calculada por período (ex: kWh/dia)",
    )
    savings_percent = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Economia (%)",
        help_text="Percentual de economia",
    )
    savings_annual_estimate = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Economia Anual Estimada (R$)",
        help_text="Projeção de economia anual em reais",
    )

    # Link para SavingsEvent gerado
    savings_event = models.ForeignKey(
        SavingsEvent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="baselines",
        verbose_name="Evento de Economia",
        help_text="SavingsEvent gerado automaticamente",
    )

    # Unidade de medida
    unit = models.CharField(
        max_length=20,
        default="kWh",
        verbose_name="Unidade",
        help_text="Unidade de medida (ex: kWh, horas, R$)",
    )

    # Metadados
    meta = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadados",
        help_text="Dados adicionais (ex: configurações, parâmetros)",
    )

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_baselines",
        verbose_name="Criado por",
    )

    class Meta:
        verbose_name = "Baseline"
        verbose_name_plural = "Baselines"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["asset"], name="finance_baseline_asset_idx"),
            models.Index(fields=["cost_center"], name="finance_baseline_cc_idx"),
            models.Index(fields=["status"], name="finance_baseline_status_idx"),
            models.Index(fields=["baseline_type"], name="finance_baseline_type_idx"),
            models.Index(fields=["work_order"], name="finance_baseline_wo_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    def clean(self):
        """Validação de períodos."""
        if self.before_end and self.before_start:
            if self.before_end < self.before_start:
                raise ValidationError(
                    {"before_end": "Data de fim deve ser posterior à data de início."}
                )

        if self.after_end and self.after_start:
            if self.after_end < self.after_start:
                raise ValidationError(
                    {"after_end": "Data de fim deve ser posterior à data de início."}
                )

        if self.intervention_date and self.before_end:
            if self.intervention_date < self.before_end:
                raise ValidationError(
                    {
                        "intervention_date": "Data da intervenção deve ser após o período antes."
                    }
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def calculate_savings(self) -> bool:
        """
        Calcula economia com base nos dados before/after.

        Returns:
            True se cálculo foi bem sucedido
        """
        if not self.before_avg_value or not self.after_avg_value:
            return False

        # Economia = antes - depois (positivo = economia)
        self.savings_value = self.before_avg_value - self.after_avg_value

        # Percentual
        if self.before_avg_value > 0:
            self.savings_percent = (self.savings_value / self.before_avg_value) * 100

        return True


class RiskSnapshot(models.Model):
    """
    Snapshot de Risco Financeiro por Ativo.

    Captura um momento no tempo do risco financeiro de um ativo,
    usado para cálculo de BAR (Budget-at-Risk) e priorização.

    Fórmula de risco:
    risk_score = failure_probability × (estimated_repair_cost + downtime_cost)

    BAR = Σ(risk_score) por centro de custo

    Exemplo:
    - Chiller #1: 15% chance de falha × R$ 50.000 = R$ 7.500 BAR

    Referências:
    - [RSK-001] BAR/Forecast (RiskSnapshot)
    """

    class RiskLevel(models.TextChoices):
        LOW = "low", "Baixo"
        MEDIUM = "medium", "Médio"
        HIGH = "high", "Alto"
        CRITICAL = "critical", "Crítico"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relacionamentos
    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.CASCADE,
        related_name="risk_snapshots",
        verbose_name="Ativo",
    )
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.PROTECT,
        related_name="risk_snapshots",
        verbose_name="Centro de Custo",
    )

    # Data do snapshot
    snapshot_date = models.DateField(
        verbose_name="Data do Snapshot", help_text="Data em que o risco foi calculado"
    )

    # Probabilidade de falha
    failure_probability = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        validators=[
            MinValueValidator(Decimal("0.0000")),
            MaxValueValidator(Decimal("1.0000")),
        ],
        verbose_name="Probabilidade de Falha",
        help_text="Probabilidade de falha (0-1, ex: 0.15 = 15%)",
    )

    # MTBF (Mean Time Between Failures)
    mtbf_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="MTBF (dias)",
        help_text="Tempo médio entre falhas em dias",
    )

    # Custos estimados
    estimated_repair_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Custo Estimado de Reparo (R$)",
        help_text="Custo estimado para reparar em caso de falha",
    )
    estimated_downtime_hours = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Downtime Estimado (horas)",
        help_text="Tempo estimado de parada em horas",
    )
    downtime_cost_per_hour = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Custo Downtime (R$/hora)",
        help_text="Custo por hora de parada",
    )

    # Custos calculados
    downtime_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Custo Total Downtime (R$)",
        help_text="= downtime_hours × cost_per_hour",
    )
    total_impact_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Impacto Total (R$)",
        help_text="= repair_cost + downtime_cost",
    )

    # Risk Score e BAR contribution
    risk_score = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Risk Score (R$)",
        help_text="= probability × total_impact",
    )

    # Nível de risco (calculado)
    risk_level = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
        default=RiskLevel.LOW,
        verbose_name="Nível de Risco",
    )

    # Fonte dos dados
    data_source = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Fonte dos Dados",
        help_text="Origem dos dados (ex: histórico, telemetria, especialista)",
    )

    # Metadados
    notes = models.TextField(blank=True, verbose_name="Observações")
    meta = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadados",
        help_text="Dados adicionais (ex: fatores considerados, histórico)",
    )

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_risk_snapshots",
        verbose_name="Criado por",
    )

    class Meta:
        verbose_name = "Snapshot de Risco"
        verbose_name_plural = "Snapshots de Risco"
        ordering = ["-snapshot_date", "-risk_score"]
        constraints = [
            # Um snapshot por ativo por dia
            models.UniqueConstraint(
                fields=["asset", "snapshot_date"],
                name="finance_risksnapshot_unique_asset_date",
            )
        ]
        indexes = [
            models.Index(
                fields=["asset", "snapshot_date"], name="finance_risk_asset_idx"
            ),
            models.Index(fields=["snapshot_date"], name="finance_risk_date_idx"),
            models.Index(fields=["cost_center"], name="finance_risk_cc_idx"),
            models.Index(fields=["risk_level"], name="finance_risk_level_idx"),
            models.Index(fields=["risk_score"], name="finance_risk_score_idx"),
        ]

    def __str__(self):
        return f"{self.asset} - {self.snapshot_date} - R$ {self.risk_score}"

    def save(self, *args, **kwargs):
        # Calcula campos derivados antes de salvar
        self.calculate_derived_fields()
        super().save(*args, **kwargs)

    def calculate_derived_fields(self):
        """Calcula campos derivados (downtime_cost, total_impact, risk_score, risk_level)."""
        # Custo de downtime
        self.downtime_cost = self.estimated_downtime_hours * self.downtime_cost_per_hour

        # Impacto total
        self.total_impact_cost = self.estimated_repair_cost + self.downtime_cost

        # Risk Score
        self.risk_score = self.failure_probability * self.total_impact_cost

        # Determina nível de risco
        self.risk_level = self._determine_risk_level()

    def _determine_risk_level(self) -> str:
        """
        Determina o nível de risco baseado no score e probabilidade.

        Critérios:
        - CRITICAL: risk_score > 50000 ou probability > 0.5
        - HIGH: risk_score > 20000 ou probability > 0.3
        - MEDIUM: risk_score > 5000 ou probability > 0.15
        - LOW: demais casos
        """
        if self.risk_score > 50000 or self.failure_probability > Decimal("0.5"):
            return self.RiskLevel.CRITICAL
        elif self.risk_score > 20000 or self.failure_probability > Decimal("0.3"):
            return self.RiskLevel.HIGH
        elif self.risk_score > 5000 or self.failure_probability > Decimal("0.15"):
            return self.RiskLevel.MEDIUM
        else:
            return self.RiskLevel.LOW
