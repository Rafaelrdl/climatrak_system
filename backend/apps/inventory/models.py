"""
Models para Inventory - Gestão de Estoque

Estrutura:
  InventoryCategory (Categoria de itens)
    └── InventoryItem (Item de estoque)
          └── InventoryMovement (Movimentação - entrada/saída)
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class InventoryCategory(models.Model):
    """
    Categoria de itens de estoque.
    Ex: Peças Elétricas, Filtros, Lubrificantes, Ferramentas
    """
    
    name = models.CharField('Nome', max_length=255)
    code = models.CharField('Código', max_length=50, blank=True, unique=True)
    description = models.TextField('Descrição', blank=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Categoria Pai'
    )
    icon = models.CharField('Ícone', max_length=50, blank=True)
    color = models.CharField('Cor', max_length=20, blank=True)
    is_active = models.BooleanField('Ativo', default=True)
    
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    @property
    def item_count(self):
        return self.items.count()
    
    @property
    def full_path(self):
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name


class InventoryItem(models.Model):
    """
    Item de estoque.
    Representa uma peça, material ou ferramenta.
    """
    
    class Unit(models.TextChoices):
        UNIT = 'UN', 'Unidade'
        PIECE = 'PC', 'Peça'
        KG = 'KG', 'Quilograma'
        LITER = 'L', 'Litro'
        METER = 'M', 'Metro'
        BOX = 'CX', 'Caixa'
        PACK = 'PCT', 'Pacote'
        SET = 'JG', 'Jogo'
    
    # Identificação
    code = models.CharField('Código', max_length=50, unique=True)
    name = models.CharField('Nome', max_length=255)
    manufacturer = models.CharField('Fabricante', max_length=255, blank=True)
    description = models.TextField('Descrição', blank=True)
    barcode = models.CharField('Código de Barras', max_length=100, blank=True)
    
    # Classificação
    category = models.ForeignKey(
        InventoryCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='items',
        verbose_name='Categoria'
    )
    
    # Estoque
    unit = models.CharField('Unidade', max_length=5, choices=Unit.choices, default=Unit.UNIT)
    quantity = models.DecimalField(
        'Quantidade',
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0'))]
    )
    min_quantity = models.DecimalField(
        'Estoque Mínimo',
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0'))]
    )
    max_quantity = models.DecimalField(
        'Estoque Máximo',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))]
    )
    reorder_point = models.DecimalField(
        'Ponto de Reposição',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))]
    )
    
    # Valores
    unit_cost = models.DecimalField(
        'Custo Unitário',
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0'))]
    )
    last_purchase_cost = models.DecimalField(
        'Último Custo de Compra',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Localização física
    location = models.CharField('Localização no Estoque', max_length=100, blank=True)
    shelf = models.CharField('Prateleira', max_length=50, blank=True)
    bin = models.CharField('Gaveta/Compartimento', max_length=50, blank=True)
    
    # Fornecedor
    supplier = models.CharField('Fornecedor', max_length=255, blank=True)
    supplier_code = models.CharField('Código do Fornecedor', max_length=100, blank=True)
    lead_time_days = models.PositiveIntegerField('Lead Time (dias)', null=True, blank=True)
    
    # Imagem
    image = models.ImageField('Imagem', upload_to='inventory/items/', blank=True, null=True)
    image_url = models.TextField('URL da Imagem', blank=True, null=True, help_text='URL ou Data URI da imagem')
    
    # Status
    is_active = models.BooleanField('Ativo', default=True)
    is_critical = models.BooleanField('Item Crítico', default=False)
    
    # Metadados
    notes = models.TextField('Observações', blank=True)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'Item de Estoque'
        verbose_name_plural = 'Itens de Estoque'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def is_low_stock(self):
        """Verifica se está abaixo do estoque mínimo."""
        return self.quantity < self.min_quantity
    
    @property
    def is_out_of_stock(self):
        """Verifica se está sem estoque."""
        return self.quantity <= 0
    
    @property
    def needs_reorder(self):
        """Verifica se precisa repor."""
        if self.reorder_point:
            return self.quantity <= self.reorder_point
        return self.is_low_stock
    
    @property
    def total_value(self):
        """Valor total do item em estoque."""
        return self.quantity * self.unit_cost
    
    @property
    def stock_status(self):
        """Status do estoque."""
        if self.is_out_of_stock:
            return 'OUT_OF_STOCK'
        if self.is_low_stock:
            return 'LOW'
        if self.max_quantity and self.quantity > self.max_quantity:
            return 'OVERSTOCKED'
        return 'OK'


class InventoryMovement(models.Model):
    """
    Movimentação de estoque.
    Registra entradas e saídas de itens.
    """
    
    class MovementType(models.TextChoices):
        IN = 'IN', 'Entrada'
        OUT = 'OUT', 'Saída'
        ADJUSTMENT = 'ADJUSTMENT', 'Ajuste'
        TRANSFER = 'TRANSFER', 'Transferência'
        RETURN = 'RETURN', 'Devolução'
    
    class Reason(models.TextChoices):
        PURCHASE = 'PURCHASE', 'Compra'
        WORK_ORDER = 'WORK_ORDER', 'Ordem de Serviço'
        ADJUSTMENT = 'ADJUSTMENT', 'Ajuste de Inventário'
        DAMAGE = 'DAMAGE', 'Avaria'
        EXPIRY = 'EXPIRY', 'Vencimento'
        RETURN_SUPPLIER = 'RETURN_SUPPLIER', 'Devolução ao Fornecedor'
        RETURN_STOCK = 'RETURN_STOCK', 'Retorno ao Estoque'
        TRANSFER = 'TRANSFER', 'Transferência'
        OTHER = 'OTHER', 'Outro'
    
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name='movements',
        verbose_name='Item'
    )
    
    type = models.CharField('Tipo', max_length=20, choices=MovementType.choices)
    reason = models.CharField('Motivo', max_length=30, choices=Reason.choices)
    
    quantity = models.DecimalField(
        'Quantidade',
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    quantity_before = models.DecimalField(
        'Quantidade Anterior',
        max_digits=12,
        decimal_places=2
    )
    quantity_after = models.DecimalField(
        'Quantidade Depois',
        max_digits=12,
        decimal_places=2
    )
    
    unit_cost = models.DecimalField(
        'Custo Unitário',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Referências
    work_order = models.ForeignKey(
        'cmms.WorkOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventory_movements',
        verbose_name='Ordem de Serviço'
    )
    reference = models.CharField('Referência', max_length=100, blank=True)
    invoice_number = models.CharField('Nota Fiscal', max_length=50, blank=True)
    
    note = models.TextField('Observação', blank=True)
    
    # Usuário que fez a movimentação
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='inventory_movements',
        verbose_name='Realizado por'
    )
    
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Movimentação'
        verbose_name_plural = 'Movimentações'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.item.code} ({self.quantity})"
    
    def save(self, *args, **kwargs):
        # Registrar quantidade anterior
        if not self.pk:
            self.quantity_before = self.item.quantity
            
            # Se unit_cost não foi informado, usar o custo do item
            if self.unit_cost is None:
                self.unit_cost = self.item.unit_cost
            
            # Calcular quantidade depois
            if self.type == self.MovementType.IN or self.type == self.MovementType.RETURN:
                self.quantity_after = self.quantity_before + self.quantity
            elif self.type == self.MovementType.OUT:
                self.quantity_after = self.quantity_before - self.quantity
            elif self.type == self.MovementType.ADJUSTMENT:
                # Para ajuste, quantity representa o valor final
                self.quantity_after = self.quantity
            else:
                self.quantity_after = self.quantity_before
            
            # Atualizar quantidade do item
            self.item.quantity = self.quantity_after
            self.item.save(update_fields=['quantity', 'updated_at'])
        
        super().save(*args, **kwargs)
    
    @property
    def total_value(self):
        if self.unit_cost:
            return self.quantity * self.unit_cost
        return None


class InventoryCount(models.Model):
    """
    Contagem de inventário.
    Para auditorias e ajustes periódicos.
    """
    
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Rascunho'
        IN_PROGRESS = 'IN_PROGRESS', 'Em Andamento'
        COMPLETED = 'COMPLETED', 'Concluído'
        CANCELLED = 'CANCELLED', 'Cancelado'
    
    name = models.CharField('Nome', max_length=255)
    description = models.TextField('Descrição', blank=True)
    status = models.CharField('Status', max_length=20, choices=Status.choices, default=Status.DRAFT)
    
    # Datas
    scheduled_date = models.DateField('Data Agendada', null=True, blank=True)
    started_at = models.DateTimeField('Iniciado em', null=True, blank=True)
    completed_at = models.DateTimeField('Concluído em', null=True, blank=True)
    
    # Filtros
    categories = models.ManyToManyField(
        InventoryCategory,
        blank=True,
        related_name='counts',
        verbose_name='Categorias'
    )
    location = models.CharField('Localização', max_length=100, blank=True)
    
    # Usuários
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_counts',
        verbose_name='Criado por'
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='performed_counts',
        verbose_name='Realizado por'
    )
    
    notes = models.TextField('Observações', blank=True)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'Contagem de Inventário'
        verbose_name_plural = 'Contagens de Inventário'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name


class InventoryCountItem(models.Model):
    """
    Item de contagem de inventário.
    """
    
    count = models.ForeignKey(
        InventoryCount,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Contagem'
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name='count_items',
        verbose_name='Item'
    )
    
    expected_quantity = models.DecimalField(
        'Quantidade Esperada',
        max_digits=12,
        decimal_places=2
    )
    counted_quantity = models.DecimalField(
        'Quantidade Contada',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    is_counted = models.BooleanField('Contado', default=False)
    note = models.TextField('Observação', blank=True)
    
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'Item de Contagem'
        verbose_name_plural = 'Itens de Contagem'
        unique_together = ['count', 'item']
    
    @property
    def difference(self):
        if self.counted_quantity is not None:
            return self.counted_quantity - self.expected_quantity
        return None
    
    @property
    def has_discrepancy(self):
        return self.difference is not None and self.difference != 0
