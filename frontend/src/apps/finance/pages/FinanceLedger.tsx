/**
 * Finance Ledger Page
 * 
 * Tela do ledger (transações de custo) com:
 * - DataTable com filtros server-side
 * - Drawer de detalhe do lançamento
 * - Modal de ajuste manual (adjustment)
 * 
 * Baseado em: docs/frontend/finance/05-telas-fluxos.md
 */

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Filter,
  Wrench,
  ClipboardList,
  AlertCircle,
  Loader2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MoneyCell, DataTable, type Column, type PaginationState } from '@/components/finance';
import { FilterBar } from '@/shared/ui';
import { useLedger, useCreateTransaction, useCostCenters } from '@/hooks/finance';
import { useAbility } from '@/hooks/useAbility';
import { cn } from '@/lib/utils';
import type { 
  CostTransaction, 
  TransactionType, 
  TransactionCategory,
  LedgerFilters,
  ManualTransactionInput,
  Currency,
} from '@/types/finance';

// ==================== Constants ====================

const TRANSACTION_TYPES: { value: TransactionType; label: string; color: string }[] = [
  { value: 'labor', label: 'Mão de Obra', color: 'bg-blue-100 text-blue-700' },
  { value: 'parts', label: 'Peças', color: 'bg-purple-100 text-purple-700' },
  { value: 'third_party', label: 'Terceiros', color: 'bg-orange-100 text-orange-700' },
  { value: 'adjustment', label: 'Ajuste', color: 'bg-gray-100 text-gray-700' },
];

const CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: 'preventive', label: 'Preventiva' },
  { value: 'corrective', label: 'Corretiva' },
  { value: 'predictive', label: 'Preditiva' },
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

function getCurrentLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    if (filters.asset) count++;
    if (filters.work_order) count++;
    return count;
  }, [filters]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <FilterBar title="Filtros" count={activeFiltersCount} onClear={onClear}>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Centro de Custo</Label>
              <Select
                value={filters.cost_center ?? 'all'}
                onValueChange={(v) => onFiltersChange({ ...filters, cost_center: v === 'all' ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {costCenters?.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select
                value={filters.category ?? 'all'}
                onValueChange={(v) => onFiltersChange({ ...filters, category: v === 'all' ? undefined : v as TransactionCategory })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={filters.type ?? 'all'}
                onValueChange={(v) => onFiltersChange({ ...filters, type: v === 'all' ? undefined : v as TransactionType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {TRANSACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>ID do Ativo</Label>
              <Input
                placeholder="UUID do ativo"
                value={filters.asset_id ?? ''}
                onChange={(e) => onFiltersChange({ ...filters, asset_id: e.target.value || undefined })}
              />
            </div>

            <div className="grid gap-2">
              <Label>ID da OS</Label>
              <Input
                placeholder="UUID da OS"
                value={filters.work_order_id ?? ''}
                onChange={(e) => onFiltersChange({ ...filters, work_order_id: e.target.value || undefined })}
              />
            </div>
          </div>
        </FilterBar>
      </PopoverContent>
    </Popover>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4 pr-8">
            <DialogTitle className="text-xl font-semibold">Detalhes da Transação</DialogTitle>
            <Badge className={cn('shrink-0', typeInfo.color)}>
              {typeInfo.label}
            </Badge>
          </div>
          <DialogDescription>
            {transaction.idempotency_key}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Valor em Destaque */}
          <div className="py-6 px-4 rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="text-center space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Valor da Transação</p>
              <div className="text-4xl font-bold text-primary">
                <MoneyCell value={transaction.amount} size="lg" />
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

          {/* Informações Adicionais (Meta) */}
          {transaction.meta && Object.keys(transaction.meta).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Informações Adicionais
                </h3>
                <div className="space-y-3">
                  {Boolean(transaction.meta.reason) && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Motivo</p>
                      <p className="text-sm leading-relaxed">{String(transaction.meta.reason)}</p>
                    </div>
                  )}
                  {Boolean(transaction.meta.invoice) && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Nota Fiscal</p>
                      <p className="text-sm font-medium">{String(transaction.meta.invoice)}</p>
                    </div>
                  )}
                  {Object.entries(transaction.meta)
                    .filter(([key]) => !['reason', 'invoice'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm">{String(value)}</p>
                      </div>
                    ))
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Manual Adjustment Dialog ====================

interface ManualAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ManualAdjustmentDialog({ open, onOpenChange }: ManualAdjustmentDialogProps) {
  const { data: costCenters } = useCostCenters();
  const createTransaction = useCreateTransaction();

  const [formData, setFormData] = useState<{
    occurred_at: string;
    amount: string;
    category: TransactionCategory;
    cost_center_id: string;
    asset_id: string;
    work_order_id: string;
    reason: string;
    invoice: string;
  }>({
    occurred_at: getCurrentLocalDate(),
    amount: '',
    category: 'other',
    cost_center_id: '',
    asset_id: '',
    work_order_id: '',
    reason: '',
    invoice: '',
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    // Validação básica
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Informe um valor válido');
      return;
    }
    if (!formData.cost_center_id) {
      setError('Selecione um centro de custo');
      return;
    }
    if (!formData.reason) {
      setError('Informe o motivo do ajuste');
      return;
    }

    try {
      const input: ManualTransactionInput = {
        occurred_at: new Date(formData.occurred_at).toISOString(),
        amount: Number(formData.amount),
        currency: 'BRL' as Currency,
        transaction_type: 'adjustment',
        category: formData.category,
        cost_center_id: formData.cost_center_id,
        asset_id: formData.asset_id || undefined,
        work_order_id: formData.work_order_id || undefined,
        meta: {
          reason: formData.reason,
          invoice: formData.invoice || undefined,
        },
      };

      await createTransaction.mutateAsync(input);
      
      // Reset form
      setFormData({
        occurred_at: getCurrentLocalDate(),
        amount: '',
        category: 'other',
        cost_center_id: '',
        asset_id: '',
        work_order_id: '',
        reason: '',
        invoice: '',
      });
      
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('409')) {
          setError('Este mês está fechado e não permite novos lançamentos');
        } else if (err.message.includes('403')) {
          setError('Você não tem permissão para criar ajustes');
        } else {
          setError('Erro ao criar ajuste. Tente novamente.');
        }
      }
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Ajuste Manual</DialogTitle>
          <DialogDescription>
            Crie um lançamento de ajuste para corrigir valores ou registrar custos não automáticos.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="occurred_at">Data da Ocorrência *</Label>
              <Input
                id="occurred_at"
                type="date"
                value={formData.occurred_at}
                onChange={(e) => setFormData(prev => ({ ...prev, occurred_at: e.target.value }))}
                className="w-40"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cost_center_id">Centro de Custo *</Label>
              <Select
                value={formData.cost_center_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, cost_center_id: v }))}
              >
                <SelectTrigger id="cost_center_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {costCenters?.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v as TransactionCategory }))}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Motivo do Ajuste *</Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo do ajuste..."
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invoice">Nota Fiscal (opcional)</Label>
            <Input
              id="invoice"
              placeholder="Número da NF"
              value={formData.invoice}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice: e.target.value }))}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="asset_id">ID do Ativo (opcional)</Label>
              <Input
                id="asset_id"
                placeholder="UUID"
                value={formData.asset_id}
                onChange={(e) => setFormData(prev => ({ ...prev, asset_id: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="work_order_id">ID da OS (opcional)</Label>
              <Input
                id="work_order_id"
                placeholder="UUID"
                value={formData.work_order_id}
                onChange={(e) => setFormData(prev => ({ ...prev, work_order_id: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createTransaction.isPending}
          >
            {createTransaction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Main Component ====================

export function FinanceLedger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ability = useAbility();
  const canCreateAdjustment = ability.can('create', 'finance_ledger');

  // State
  const [selectedTransaction, setSelectedTransaction] = useState<CostTransaction | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);

  // Filters from URL
  const filters: LedgerFilters = useMemo(() => ({
    start_date: searchParams.get('start_date') ?? getFirstDayOfMonth(),
    end_date: searchParams.get('end_date') ?? getLastDayOfMonth(),
    cost_center: searchParams.get('cost_center_id') ?? undefined,
    asset: searchParams.get('asset_id') ?? undefined,
    work_order: searchParams.get('work_order_id') ?? undefined,
    category: searchParams.get('category') as TransactionCategory ?? undefined,
    type: searchParams.get('type') as TransactionType ?? undefined,
    page: Number(searchParams.get('page')) || 1,
    page_size: Number(searchParams.get('page_size')) || 20,
  }), [searchParams]);

  // Data
  const { data: ledgerData, isLoading, error } = useLedger(filters);

  // Pagination
  const pagination: PaginationState = useMemo(() => ({
    page: filters.page ?? 1,
    pageSize: filters.page_size ?? 20,
  }), [filters.page, filters.page_size]);

  // Handlers
  const handleFiltersChange = useCallback((newFilters: LedgerFilters) => {
    const params = new URLSearchParams();
    if (newFilters.start_date) params.set('start_date', newFilters.start_date);
    if (newFilters.end_date) params.set('end_date', newFilters.end_date);
    if (newFilters.cost_center_id) params.set('cost_center_id', newFilters.cost_center_id);
    if (newFilters.asset_id) params.set('asset_id', newFilters.asset_id);
    if (newFilters.work_order_id) params.set('work_order_id', newFilters.work_order_id);
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.type) params.set('type', newFilters.type);
    params.set('page', '1'); // Reset to page 1 on filter change
    params.set('page_size', String(newFilters.page_size ?? 20));
    setSearchParams(params);
  }, [setSearchParams]);

  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPagination.page));
    params.set('page_size', String(newPagination.pageSize));
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const handleClearFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set('start_date', getFirstDayOfMonth());
    params.set('end_date', getLastDayOfMonth());
    params.set('page', '1');
    params.set('page_size', '20');
    setSearchParams(params);
  }, [setSearchParams]);

  const handleRowClick = useCallback((row: CostTransaction) => {
    setSelectedTransaction(row);
    setDetailSheetOpen(true);
  }, []);

  // Table columns
  const columns: Column<CostTransaction>[] = useMemo(() => [
    {
      id: 'occurred_at',
      header: 'Data',
      accessorKey: 'occurred_at',
      cell: (row) => (
        <span className="text-sm">{formatDate(row.occurred_at)}</span>
      ),
      width: 100,
      sortable: true,
    },
    {
      id: 'transaction_type',
      header: 'Tipo',
      accessorKey: 'transaction_type',
      cell: (row) => {
        const typeInfo = getTypeInfo(row.transaction_type);
        return (
          <Badge variant="outline" className={cn('text-xs', typeInfo.color)}>
            {typeInfo.label}
          </Badge>
        );
      },
      width: 110,
    },
    {
      id: 'category',
      header: 'Categoria',
      accessorKey: 'category',
      cell: (row) => (
        <span className="text-sm">{getCategoryLabel(row.category)}</span>
      ),
      width: 100,
    },
    {
      id: 'cost_center',
      header: 'Centro de Custo',
      cell: (row) => (
        <span className="text-sm truncate max-w-[180px]">
          {row.cost_center_name ?? '-'}
        </span>
      ),
      width: 180,
    },
    {
      id: 'reason',
      header: 'Motivo',
      cell: (row) => (
        <span className="text-sm text-muted-foreground truncate max-w-[150px]">
          {row.meta?.reason ? String(row.meta.reason) : '-'}
        </span>
      ),
      width: 150,
    },
    {
      id: 'invoice',
      header: 'Nota Fiscal',
      cell: (row) => (
        <span className="text-sm truncate max-w-[100px]">
          {row.meta?.invoice ? String(row.meta.invoice) : '-'}
        </span>
      ),
      width: 100,
    },
    {
      id: 'asset',
      header: 'Ativo',
      cell: (row) => (
        <span className="text-sm truncate max-w-[130px]">
          {row.asset_name ?? '-'}
        </span>
      ),
      width: 130,
    },
    {
      id: 'work_order',
      header: 'OS',
      cell: (row) => (
        <span className="text-sm">
          {row.work_order_number ?? '-'}
        </span>
      ),
      width: 90,
    },
    {
      id: 'amount',
      header: 'Valor',
      accessorKey: 'amount',
      cell: (row) => (
        <span className="font-medium">
          <MoneyCell value={row.amount} />
        </span>
      ),
      align: 'right',
      width: 120,
      sortable: true,
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

  // Computed
  const totalAmount = useMemo(() => {
    return ledgerData?.data?.reduce((sum, t) => sum + t.amount, 0) ?? 0;
  }, [ledgerData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lançamentos</h1>
          <p className="text-muted-foreground">
            Registro de todas as transações de custo
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCreateAdjustment && (
            <Button onClick={() => setAdjustmentDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Ajuste
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar transações. Tente novamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">De:</Label>
                <Input
                  type="date"
                  className="w-[140px]"
                  value={filters.start_date ?? ''}
                  onChange={(e) => handleFiltersChange({ ...filters, start_date: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Até:</Label>
                <Input
                  type="date"
                  className="w-[140px]"
                  value={filters.end_date ?? ''}
                  onChange={(e) => handleFiltersChange({ ...filters, end_date: e.target.value })}
                />
              </div>
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
                {ledgerData.meta?.total ?? ledgerData.data.length} transações encontradas
              </div>
              <div className="text-sm font-medium">
                Total: <MoneyCell value={totalAmount} />
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
            emptyMessage="Nenhuma transação encontrada para o período"
          />
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <TransactionDetailDialog
        transaction={selectedTransaction}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />

      {/* Manual Adjustment Dialog */}
      <ManualAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
      />
    </div>
  );
}

export default FinanceLedger;
