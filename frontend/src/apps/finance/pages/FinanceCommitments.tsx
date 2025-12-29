/**
 * Finance Commitments Page
 * 
 * Tela de compromissos financeiros com:
 * - DataTable com filtros por status
 * - Form para criar novo commitment
 * - Ações: submit, approve, cancel
 * - Exibir impacto no budget do mês
 * 
 * Baseado em: docs/frontend/finance/05-telas-fluxos.md (FE-FIN-010)
 */

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Filter,
  FileText,
  Building2,
  AlertCircle,
  Loader2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Paperclip,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoneyCell, DataTable, type Column, type PaginationState } from '@/components/finance';
import { 
  useCommitments, 
  useCreateCommitment, 
  useApproveCommitment, 
  useCancelCommitment,
  useCostCenters,
  useFinanceSummary,
} from '@/hooks/finance';
import { useAbility } from '@/hooks/useAbility';
import { cn } from '@/lib/utils';
import type { 
  Commitment, 
  CommitmentInput,
  CommitmentStatus,
  TransactionCategory,
  CommitmentFilters,
} from '@/types/finance';

// ==================== Constants ====================

const STATUS_CONFIG: Record<CommitmentStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: FileText },
  submitted: { label: 'Submetido', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: Send },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: XCircle },
  converted: { label: 'Convertido', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', icon: TrendingUp },
};

const CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: 'preventive', label: 'Preventiva' },
  { value: 'corrective', label: 'Corretiva' },
  { value: 'predictive', label: 'Preditiva' },
  { value: 'other', label: 'Outros' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ==================== Helpers ====================

function getCategoryLabel(category: TransactionCategory): string {
  return CATEGORIES.find(c => c.value === category)?.label ?? category;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// ==================== Status Badge ====================

function StatusBadge({ status }: { status: CommitmentStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <Badge variant="secondary" className={cn('gap-1', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ==================== Filter Panel ====================

interface FilterPanelProps {
  filters: CommitmentFilters;
  onFiltersChange: (filters: CommitmentFilters) => void;
  onClear: () => void;
}

function FilterPanel({ filters, onFiltersChange, onClear }: FilterPanelProps) {
  const { data: costCenters } = useCostCenters();

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.cost_center_id) count++;
    if (filters.status) count++;
    if (filters.budget_month) count++;
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros</h4>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Limpar
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={filters.status ?? ''}
                onValueChange={(v) => onFiltersChange({ ...filters, status: v as CommitmentStatus || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Centro de Custo</Label>
              <Select
                value={filters.cost_center_id ?? ''}
                onValueChange={(v) => onFiltersChange({ ...filters, cost_center_id: v || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {costCenters?.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Mês do Budget</Label>
              <Input
                type="month"
                value={filters.budget_month?.slice(0, 7) ?? ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  budget_month: e.target.value ? `${e.target.value}-01` : undefined 
                })}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ==================== Summary Cards ====================

interface SummaryCardsProps {
  filters: CommitmentFilters;
}

function SummaryCards({ filters }: SummaryCardsProps) {
  const month = filters.budget_month?.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
  const { data: summary, isLoading } = useFinanceSummary(month, filters.cost_center_id);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    { label: 'Planejado', value: summary.planned, color: 'text-blue-600' },
    { label: 'Comprometido', value: summary.committed, color: 'text-amber-600' },
    { label: 'Realizado', value: summary.actual, color: 'text-green-600' },
    { label: 'Disponível', value: summary.planned - summary.committed - summary.actual, color: 'text-gray-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <MoneyCell value={card.value} size="lg" className={card.color} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ==================== Create Commitment Dialog ====================

interface CreateCommitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateCommitmentDialog({ open, onOpenChange }: CreateCommitmentDialogProps) {
  const { data: costCenters } = useCostCenters();
  const createMutation = useCreateCommitment();
  
  const [formData, setFormData] = useState<Partial<CommitmentInput>>({
    currency: 'BRL',
    status: 'draft',
    budget_month: getCurrentMonth(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (asDraft: boolean) => {
    // Validate
    const newErrors: Record<string, string> = {};
    if (!formData.cost_center_id) newErrors.cost_center_id = 'Obrigatório';
    if (!formData.category) newErrors.category = 'Obrigatório';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valor deve ser maior que zero';
    if (!formData.budget_month) newErrors.budget_month = 'Obrigatório';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...formData,
        status: asDraft ? 'draft' : 'submitted',
      } as CommitmentInput);
      
      onOpenChange(false);
      setFormData({
        currency: 'BRL',
        status: 'draft',
        budget_month: getCurrentMonth(),
      });
      setErrors({});
    } catch (error) {
      console.error('Erro ao criar commitment:', error);
    }
  };

  const handleFieldChange = (field: keyof CommitmentInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Compromisso</DialogTitle>
          <DialogDescription>
            Registre um novo compromisso financeiro para o budget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Centro de Custo *</Label>
              <Select
                value={formData.cost_center_id ?? ''}
                onValueChange={(v) => handleFieldChange('cost_center_id', v)}
              >
                <SelectTrigger className={errors.cost_center_id ? 'border-destructive' : ''}>
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
              {errors.cost_center_id && (
                <p className="text-xs text-destructive">{errors.cost_center_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={formData.category ?? ''}
                onValueChange={(v) => handleFieldChange('category', v as TransactionCategory)}
              >
                <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className={cn('pl-9', errors.amount ? 'border-destructive' : '')}
                  value={formData.amount ?? ''}
                  onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Mês do Budget *</Label>
              <Input
                type="month"
                className={errors.budget_month ? 'border-destructive' : ''}
                value={formData.budget_month?.slice(0, 7) ?? ''}
                onChange={(e) => handleFieldChange('budget_month', `${e.target.value}-01`)}
              />
              {errors.budget_month && (
                <p className="text-xs text-destructive">{errors.budget_month}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data de Vencimento</Label>
            <Input
              type="date"
              value={formData.due_date ?? ''}
              onChange={(e) => handleFieldChange('due_date', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Descreva o compromisso..."
              rows={3}
              value={formData.notes ?? ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
            />
          </div>
        </div>

        {createMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao criar compromisso. Tente novamente.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={createMutation.isPending}
          >
            Salvar Rascunho
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submeter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Commitment Detail Sheet ====================

interface CommitmentDetailSheetProps {
  commitment: Commitment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
}

function CommitmentDetailSheet({ 
  commitment, 
  open, 
  onOpenChange,
  onApprove,
  onCancel,
}: CommitmentDetailSheetProps) {
  const { can } = useAbility();
  const canApprove = can('edit', 'finance_commitment');

  if (!commitment) return null;

  const canPerformActions = commitment.status === 'submitted' || commitment.status === 'draft';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Compromisso
          </SheetTitle>
          <SheetDescription>
            Criado em {formatDate(commitment.created_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={commitment.status} />
          </div>

          <Separator />

          {/* Valor */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Valor</p>
            <MoneyCell value={commitment.amount} size="lg" />
          </div>

          {/* Detalhes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Centro de Custo</p>
              <p className="font-medium">{commitment.cost_center_name ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Categoria</p>
              <p className="font-medium">{getCategoryLabel(commitment.category)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Mês do Budget</p>
              <p className="font-medium">{formatMonth(commitment.budget_month)}</p>
            </div>
            {commitment.due_date && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Vencimento</p>
                <p className="font-medium">{formatDate(commitment.due_date)}</p>
              </div>
            )}
          </div>

          {/* Vínculos */}
          {(commitment.vendor_name || commitment.work_order_number) && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium">Vínculos</p>
                {commitment.vendor_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{commitment.vendor_name}</span>
                  </div>
                )}
                {commitment.work_order_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>OS #{commitment.work_order_number}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Notas */}
          {commitment.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{commitment.notes}</p>
              </div>
            </>
          )}

          {/* Anexos */}
          {commitment.attachments && commitment.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Anexos</p>
                <div className="space-y-2">
                  {commitment.attachments.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Paperclip className="h-4 w-4" />
                      Anexo {i + 1}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Ações */}
          {canApprove && canPerformActions && (
            <>
              <Separator />
              <div className="flex gap-2">
                {commitment.status === 'submitted' && (
                  <Button 
                    className="flex-1"
                    onClick={() => onApprove(commitment.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                )}
                {commitment.status === 'draft' && (
                  <Button 
                    variant="outline"
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submeter
                  </Button>
                )}
                <Button 
                  variant="destructive"
                  onClick={() => onCancel(commitment.id)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==================== Main Component ====================

export function FinanceCommitments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useAbility();
  const canCreate = can('create', 'finance_commitment');

  // State
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'cancel'; id: string } | null>(null);
  
  // Filters from URL
  const filters = useMemo<CommitmentFilters>(() => ({
    status: searchParams.get('status') as CommitmentStatus | undefined,
    cost_center_id: searchParams.get('cost_center_id') ?? undefined,
    budget_month: searchParams.get('budget_month') ?? undefined,
    page: parseInt(searchParams.get('page') ?? '1'),
    page_size: parseInt(searchParams.get('page_size') ?? '20'),
  }), [searchParams]);

  // Queries and mutations
  const { data: commitmentsData, isLoading, isError } = useCommitments(filters);
  const approveMutation = useApproveCommitment();
  const cancelMutation = useCancelCommitment();

  // Handlers
  const handleFiltersChange = useCallback((newFilters: CommitmentFilters) => {
    const params = new URLSearchParams();
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.cost_center_id) params.set('cost_center_id', newFilters.cost_center_id);
    if (newFilters.budget_month) params.set('budget_month', newFilters.budget_month);
    params.set('page', '1');
    params.set('page_size', String(newFilters.page_size ?? 20));
    setSearchParams(params);
  }, [setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams({ page: '1', page_size: '20' }));
  }, [setSearchParams]);

  const handlePaginationChange = useCallback((pagination: PaginationState) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(pagination.page));
    params.set('page_size', String(pagination.pageSize));
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const handleRowClick = useCallback((commitment: Commitment) => {
    setSelectedCommitment(commitment);
    setShowDetail(true);
  }, []);

  const handleApprove = useCallback(async (id: string) => {
    setConfirmAction({ type: 'approve', id });
  }, []);

  const handleCancel = useCallback(async (id: string) => {
    setConfirmAction({ type: 'cancel', id });
  }, []);

  const executeAction = useCallback(async () => {
    if (!confirmAction) return;
    
    try {
      if (confirmAction.type === 'approve') {
        await approveMutation.mutateAsync(confirmAction.id);
      } else {
        await cancelMutation.mutateAsync(confirmAction.id);
      }
      setShowDetail(false);
      setSelectedCommitment(null);
    } catch (error) {
      console.error('Erro na ação:', error);
    } finally {
      setConfirmAction(null);
    }
  }, [confirmAction, approveMutation, cancelMutation]);

  // Table columns
  const columns = useMemo<Column<Commitment>[]>(() => [
    {
      id: 'status',
      header: 'Status',
      width: 140,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'amount',
      header: 'Valor',
      width: 140,
      align: 'right',
      cell: (row) => <MoneyCell value={row.amount} />,
    },
    {
      id: 'cost_center',
      header: 'Centro de Custo',
      cell: (row) => (
        <span className="truncate">{row.cost_center_name ?? '-'}</span>
      ),
    },
    {
      id: 'category',
      header: 'Categoria',
      width: 120,
      cell: (row) => getCategoryLabel(row.category),
    },
    {
      id: 'budget_month',
      header: 'Mês Budget',
      width: 140,
      cell: (row) => formatMonth(row.budget_month),
    },
    {
      id: 'due_date',
      header: 'Vencimento',
      width: 120,
      cell: (row) => row.due_date ? formatDate(row.due_date) : '-',
    },
    {
      id: 'actions',
      header: '',
      width: 50,
      cell: () => (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      ),
    },
  ], []);

  const commitments = commitmentsData?.data ?? [];
  const total = commitmentsData?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compromissos</h1>
          <p className="text-muted-foreground">
            Gerenciamento de compromissos financeiros
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Compromisso
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <SummaryCards filters={filters} />

      {/* Filters and Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lista de Compromissos</CardTitle>
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClear={handleClearFilters}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erro ao carregar compromissos. Tente novamente.
              </AlertDescription>
            </Alert>
          ) : (
            <DataTable<Commitment>
              columns={columns}
              data={commitments}
              total={total}
              isLoading={isLoading}
              pagination={{
                page: filters.page ?? 1,
                pageSize: filters.page_size ?? 20,
              }}
              onPaginationChange={handlePaginationChange}
              onRowClick={handleRowClick}
              emptyMessage="Nenhum compromisso encontrado"
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateCommitmentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Detail Sheet */}
      <CommitmentDetailSheet
        commitment={selectedCommitment}
        open={showDetail}
        onOpenChange={setShowDetail}
        onApprove={handleApprove}
        onCancel={handleCancel}
      />

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'approve' ? 'Aprovar Compromisso' : 'Cancelar Compromisso'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'approve'
                ? 'Confirma a aprovação deste compromisso? Isso impactará o budget comprometido do mês.'
                : 'Confirma o cancelamento deste compromisso? Esta ação não pode ser desfeita.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              className={confirmAction?.type === 'cancel' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {approveMutation.isPending || cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {confirmAction?.type === 'approve' ? 'Aprovar' : 'Cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default FinanceCommitments;
