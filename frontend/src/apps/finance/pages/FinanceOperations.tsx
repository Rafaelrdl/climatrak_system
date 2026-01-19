/**
 * Finance Operations Page
 * 
 * Tela de Custos Operacionais:
 * - Saídas de estoque (consumo de materiais)
 * - Mão de obra de Ordens de Serviço
 * 
 * Separado de "Lançamentos" que mostra entradas financeiras
 * (commitments + compras de estoque)
 * 
 * Baseado em: docs/frontend/finance/05-telas-fluxos.md
 */

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wrench,
  ClipboardList,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Package,
  Users,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { KpiCard, KpiGrid } from '@/components/kpi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoneyCell, DataTable, type Column, type PaginationState } from '@/components/finance';
import { FilterPopover, FilterItem } from '@/shared/ui';
import { useLedger, useCostCenters } from '@/hooks/finance';
import { cn } from '@/lib/utils';
import type { 
  CostTransaction, 
  TransactionType, 
  TransactionCategory,
  LedgerFilters,
} from '@/types/finance';

// ==================== Constants ====================

const TRANSACTION_TYPES: { value: TransactionType; label: string; color: string }[] = [
  { value: 'labor', label: 'Mão de Obra', color: 'bg-blue-100 text-blue-700' },
  { value: 'parts', label: 'Materiais', color: 'bg-purple-100 text-purple-700' },
  { value: 'third_party', label: 'Terceiros', color: 'bg-orange-100 text-orange-700' },
  { value: 'adjustment', label: 'Ajuste', color: 'bg-gray-100 text-gray-700' },
];

const CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: 'preventive', label: 'Preventiva' },
  { value: 'corrective', label: 'Corretiva' },
  { value: 'predictive', label: 'Preditiva' },
  { value: 'improvement', label: 'Melhorias' },
  { value: 'contracts', label: 'Contratos' },
  { value: 'parts', label: 'Peças e Materiais' },
  { value: 'energy', label: 'Energia' },
  { value: 'other', label: 'Outros' },
];

// ==================== Helpers ====================

function getTypeInfo(type: TransactionType) {
  return TRANSACTION_TYPES.find(t => t.value === type) ?? TRANSACTION_TYPES[0];
}

function getCategoryLabel(category: TransactionCategory): string {
  return CATEGORIES.find(c => c.value === category)?.label ?? category;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR');
}

function getFirstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getLastDayOfMonth(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
}

// ==================== Filter Panel ====================

interface FilterPanelProps {
  filters: LedgerFilters;
  onFiltersChange: (filters: LedgerFilters) => void;
  onClear: () => void;
}

function FilterPanel({ filters, onFiltersChange, onClear }: FilterPanelProps) {
  const { data: costCenters } = useCostCenters();

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.cost_center) count++;
    if (filters.category) count++;
    if (filters.type) count++;
    if (filters.asset_id) count++;
    if (filters.work_order_id) count++;
    return count;
  }, [filters]);

  return (
    <FilterPopover activeCount={activeFiltersCount} onClear={onClear}>
      <FilterItem label="Centro de Custo">
        <Select
          value={filters.cost_center ?? 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, cost_center: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os centros</SelectItem>
            {costCenters?.map((cc) => (
              <SelectItem key={cc.id} value={cc.id}>
                {cc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterItem>

      <FilterItem label="Categoria">
        <Select
          value={filters.category ?? 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, category: v === 'all' ? undefined : v as TransactionCategory })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterItem>

      <FilterItem label="Tipo">
        <Select
          value={filters.type ?? 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, type: v === 'all' ? undefined : v as TransactionType })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="labor">Mão de Obra</SelectItem>
            <SelectItem value="parts">Materiais</SelectItem>
          </SelectContent>
        </Select>
      </FilterItem>

      <FilterItem label="ID do Ativo">
        <Input
          placeholder="UUID do ativo"
          value={filters.asset_id ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, asset_id: e.target.value || undefined })}
        />
      </FilterItem>

      <FilterItem label="ID da OS">
        <Input
          placeholder="UUID da OS"
          value={filters.work_order_id ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, work_order_id: e.target.value || undefined })}
        />
      </FilterItem>
    </FilterPopover>
  );
}

// ==================== Transaction Detail Dialog ====================

interface TransactionDetailDialogProps {
  transaction: CostTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TransactionDetailDialog({ transaction, open, onOpenChange }: TransactionDetailDialogProps) {
  if (!transaction) return null;

  const typeInfo = getTypeInfo(transaction.transaction_type);
  const isInventory = transaction.meta?.source === 'inventory_movement';
  const movementType = transaction.meta?.movement_type as string | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4 pr-8">
            <DialogTitle className="text-xl font-semibold">Detalhes do Custo Operacional</DialogTitle>
            <Badge className={cn('shrink-0', typeInfo.color)}>
              {typeInfo.label}
            </Badge>
          </div>
          <DialogDescription>
            {isInventory 
              ? `Movimento de Estoque (${movementType === 'OUT' ? 'Saída' : 'Entrada'})`
              : 'Custo de Mão de Obra'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Valor em Destaque */}
          <div className="py-6 px-4 rounded-lg bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20">
            <div className="text-center space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Custo Operacional</p>
              <div className="text-4xl font-bold text-orange-600">
                <MoneyCell value={Number(transaction.amount) || 0} size="lg" />
              </div>
            </div>
          </div>

          {/* Informações Principais */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Informações Gerais
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Data da Ocorrência</p>
                <p className="font-medium">{formatDateTime(transaction.occurred_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Categoria</p>
                <p className="font-medium">{getCategoryLabel(transaction.category)}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-xs text-muted-foreground">Centro de Custo</p>
                <p className="font-medium">{transaction.cost_center_name ?? transaction.cost_center_id}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="font-medium">{formatDateTime(transaction.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Vínculos */}
          {(transaction.asset_name || transaction.work_order_number) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Vínculos
                </h3>
                <div className="space-y-3">
                  {transaction.asset_name && (
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ativo</p>
                        <p className="font-medium">{transaction.asset_name}</p>
                      </div>
                    </div>
                  )}
                  {transaction.work_order_number && (
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Ordem de Serviço</p>
                        <p className="font-medium">OS #{transaction.work_order_number}</p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a 
                          href={`/cmms/work-orders/${transaction.work_order_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Informações do Movimento (se for inventário) */}
          {isInventory && transaction.meta && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Detalhes do Movimento
                </h3>
                <div className="space-y-3">
                  {Boolean(transaction.meta.item_name) && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Item</p>
                      <p className="text-sm font-medium">{String(transaction.meta.item_name)}</p>
                    </div>
                  )}
                  {Boolean(transaction.meta.quantity) && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Quantidade</p>
                      <p className="text-sm font-medium">{String(transaction.meta.quantity)} {String(transaction.meta.unit || 'un')}</p>
                    </div>
                  )}
                  {Boolean(transaction.meta.unit_cost) && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Custo Unitário</p>
                      <p className="text-sm font-medium">
                        <MoneyCell value={Number(transaction.meta.unit_cost) || 0} />
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Main Component ====================

export function FinanceOperations() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CostTransaction | null>(null);

  // Filters - sempre inclui source_category='operations'
  const [filters, setFilters] = useState<LedgerFilters>(() => ({
    start_date: searchParams.get('start_date') ?? getFirstDayOfMonth(),
    end_date: searchParams.get('end_date') ?? getLastDayOfMonth(),
    source_category: 'operations', // Força filtro de operações
  }));

  // Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 50,
  });

  // Query - sempre filtra por operations
  const { data: ledgerData, isLoading, error } = useLedger({
    ...filters,
    source_category: 'operations', // Garante que sempre filtra operações
    page: pagination.page,
    page_size: pagination.pageSize,
  });

  // Handlers
  const handleFiltersChange = useCallback((newFilters: LedgerFilters) => {
    setFilters({ ...newFilters, source_category: 'operations' });
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Sync with URL
    const params = new URLSearchParams();
    if (newFilters.start_date) params.set('start_date', newFilters.start_date);
    if (newFilters.end_date) params.set('end_date', newFilters.end_date);
    setSearchParams(params);
  }, [setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setFilters({
      start_date: getFirstDayOfMonth(),
      end_date: getLastDayOfMonth(),
      source_category: 'operations',
    });
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    setPagination(newPagination);
  }, []);

  const handleRowClick = useCallback((transaction: CostTransaction) => {
    setSelectedTransaction(transaction);
    setDetailSheetOpen(true);
  }, []);

  // Columns
  const columns: Column<CostTransaction>[] = useMemo(() => [
    {
      id: 'occurred_at',
      header: 'Data',
      accessorFn: (row) => formatDate(row.occurred_at),
      width: 100,
    },
    {
      id: 'transaction_type',
      header: 'Tipo',
      cell: (row) => {
        const typeInfo = getTypeInfo(row.transaction_type);
        const isInventory = row.meta?.source === 'inventory_movement';
        return (
          <Badge className={cn('text-xs', typeInfo.color)}>
            {isInventory ? 'Material' : typeInfo.label}
          </Badge>
        );
      },
      width: 110,
    },
    {
      id: 'description',
      header: 'Descrição',
      accessorFn: (row) => {
        if (row.meta?.item_name) {
          return `${row.meta.item_name}${row.meta.quantity ? ` (${row.meta.quantity} ${row.meta.unit || 'un'})` : ''}`;
        }
        return row.meta?.source === 'inventory_movement' 
          ? 'Movimento de Estoque' 
          : (row.cost_center_name ?? 'Custo operacional');
      },
    },
    {
      id: 'category',
      header: 'Categoria',
      accessorFn: (row) => getCategoryLabel(row.category),
      width: 120,
    },
    {
      id: 'work_order',
      header: 'OS',
      accessorFn: (row) => row.work_order_number ? `#${row.work_order_number}` : '-',
      width: 80,
    },
    {
      id: 'amount',
      header: 'Valor',
      cell: (row) => <MoneyCell value={Number(row.amount) || 0} />,
      align: 'right',
      width: 120,
    },
    {
      id: 'actions',
      header: '',
      cell: () => (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      ),
      width: 40,
      align: 'center',
    },
  ], []);

  // KPIs calculados - ensure numeric addition
  const kpis = useMemo(() => {
    const transactions = ledgerData?.data ?? [];
    const totalAmount = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const laborCost = transactions
      .filter(t => t.transaction_type === 'labor')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const materialCost = transactions
      .filter(t => t.meta?.source === 'inventory_movement')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    return {
      totalAmount,
      laborCost,
      materialCost,
      count: ledgerData?.meta?.total ?? transactions.length,
    };
  }, [ledgerData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operação</h1>
          <p className="text-muted-foreground">
            Custos operacionais: mão de obra e consumo de materiais
          </p>
        </div>
      </div>

      {/* KPIs */}
      <KpiGrid columns={4}>
        <KpiCard
          title="Custo Total"
          value={<MoneyCell value={kpis.totalAmount} size="lg" className="text-2xl font-bold" />}
          icon={<TrendingUp className="h-4 w-4" />}
          description="No período selecionado"
          variant="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Mão de Obra"
          value={<MoneyCell value={kpis.laborCost} size="lg" className="text-2xl font-bold" />}
          icon={<Users className="h-4 w-4" />}
          description="Custo com técnicos"
          variant="info"
          loading={isLoading}
        />
        <KpiCard
          title="Materiais"
          value={<MoneyCell value={kpis.materialCost} size="lg" className="text-2xl font-bold" />}
          icon={<Package className="h-4 w-4" />}
          description="Consumo de estoque"
          variant="warning"
          loading={isLoading}
        />
        <KpiCard
          title="Operações"
          value={kpis.count}
          icon={<Activity className="h-4 w-4" />}
          description="Total de lançamentos"
          loading={isLoading}
        />
      </KpiGrid>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar custos operacionais. Tente novamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Período:</Label>
              <DateRangePicker
                dateRange={{
                  from: filters.start_date ? new Date(filters.start_date + 'T00:00:00') : undefined,
                  to: filters.end_date ? new Date(filters.end_date + 'T00:00:00') : undefined,
                }}
                onDateRangeChange={(range) => {
                  const formatDate = (d: Date | undefined) => {
                    if (!d) return undefined;
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  };
                  handleFiltersChange({
                    ...filters,
                    start_date: formatDate(range?.from) ?? undefined,
                    end_date: formatDate(range?.to) ?? undefined,
                  });
                }}
                className="w-[280px]"
              />
            </div>

            {/* Filter Panel */}
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClear={handleClearFilters}
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          {ledgerData && (
            <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">
                {ledgerData.meta?.total ?? ledgerData.data.length} operações encontradas
              </div>
              <div className="text-sm font-medium">
                Total: <MoneyCell value={kpis.totalAmount} />
              </div>
            </div>
          )}

          {/* Table */}
          <DataTable
            columns={columns}
            data={ledgerData?.data ?? []}
            total={ledgerData?.meta?.total}
            isLoading={isLoading}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            getRowId={(row) => row.id}
            onRowClick={handleRowClick}
            emptyMessage="Nenhum custo operacional encontrado para o período"
          />
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <TransactionDetailDialog
        transaction={selectedTransaction}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  );
}

export default FinanceOperations;
