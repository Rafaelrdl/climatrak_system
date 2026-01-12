/**
 * TrakService Quotes Page
 * 
 * Quote management for field service.
 * Features:
 * - Quote list with filtering
 * - Quote creation/editing
 * - Item management (labor, parts, services)
 * - Workflow: draft → sent → approved/rejected
 * - Finance integration on approval
 * 
 * Design System: Platform-first, seguindo docs/design/DESIGN_SYSTEM.md
 * TrakService accent color: orange-500
 * 
 * Requires: trakservice.quotes feature
 */

import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/shared/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataTable, type Column } from '@/shared/ui/components/DataTable';
import {
  FileText,
  DollarSign,
  Target,
  Users,
  Search,
  RefreshCw,
  Plus,
  MoreHorizontal,
  Send,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Building2,
  Package,
  Wrench,
  Loader2,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Hooks
import {
  useQuotes,
  useQuote,
  useQuotesSummary,
  useCreateQuote,
  useDeleteQuote,
  useSendQuote,
  useApproveQuote,
  useRejectQuote,
  useAddQuoteItem,
  useRemoveQuoteItem,
  useCatalogItems,
} from '../hooks/useQuotesQuery';

// Types and utilities
import type {
  Quote,
  QuoteItem,
  QuoteStatus,
  QuoteFilters,
  QuoteCreateInput,
  QuoteItemInput,
  ServiceCatalogItem,
} from '../types';
import {
  getQuoteStatusConfig,
  formatCurrency,
  canEditQuote,
  canSendQuote,
  canApproveQuote,
} from '../services/quotesService';

// =============================================================================
// Sub-components
// =============================================================================

interface QuickStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  isLoading?: boolean;
}

function QuickStatCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'text-muted-foreground',
  isLoading = false,
}: QuickStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', color)} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
}

function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const config = getQuoteStatusConfig(status);

  return (
    <Badge
      variant="outline"
      className={cn(config.bgColor, config.color, 'border-transparent font-medium')}
    >
      {config.label}
    </Badge>
  );
}

interface ItemTypeIconProps {
  type: QuoteItem['type'];
}

function ItemTypeIcon({ type }: ItemTypeIconProps) {
  switch (type) {
    case 'labor':
      return <Users className="h-4 w-4 text-blue-500" />;
    case 'part':
      return <Package className="h-4 w-4 text-green-500" />;
    case 'service':
      return <Wrench className="h-4 w-4 text-purple-500" />;
    default:
      return <Receipt className="h-4 w-4 text-gray-500" />;
  }
}

interface QuoteItemsListProps {
  items: QuoteItem[];
  canEdit: boolean;
  onRemove: (itemId: string) => void;
}

function QuoteItemsList({ items, canEdit, onRemove }: QuoteItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum item adicionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 rounded-lg border bg-card"
        >
          <div className="flex items-center gap-3">
            <ItemTypeIcon type={item.type} />
            <div>
              <div className="font-medium text-sm">{item.description}</div>
              <div className="text-xs text-muted-foreground">
                {item.quantity} × {formatCurrency(item.unit_price)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium">{formatCurrency(item.total)}</span>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface AddItemDialogProps {
  quoteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddItemDialog({ quoteId, open, onOpenChange }: AddItemDialogProps) {
  const [itemData, setItemData] = useState<Partial<QuoteItemInput>>({
    type: 'labor',
    quantity: 1,
  });

  const addItem = useAddQuoteItem();
  const { data: catalogItems } = useCatalogItems();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !itemData.description ||
      !itemData.unit_price ||
      !itemData.quantity ||
      !itemData.type
    ) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    addItem.mutate(
      {
        quoteId,
        data: itemData as QuoteItemInput,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setItemData({ type: 'labor', quantity: 1 });
        },
      }
    );
  };

  const handleCatalogSelect = (item: ServiceCatalogItem) => {
    setItemData({
      ...itemData,
      catalog_item_id: item.id,
      description: item.name,
      unit_price: item.default_price,
      type: item.type,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Item</DialogTitle>
          <DialogDescription>Adicione um item ao orçamento</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={itemData.type}
                onValueChange={(v) =>
                  setItemData({ ...itemData, type: v as QuoteItemInput['type'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="labor">Mão de Obra</SelectItem>
                  <SelectItem value="part">Peça/Material</SelectItem>
                  <SelectItem value="service">Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {catalogItems && catalogItems.length > 0 && (
              <div className="space-y-2">
                <Label>Catálogo (opcional)</Label>
                <Select
                  value={itemData.catalog_item_id || ''}
                  onValueChange={(v) => {
                    const item = catalogItems.find((i) => i.id === v);
                    if (item) handleCatalogSelect(item);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar do catálogo" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogItems
                      .filter((i) => i.type === itemData.type)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} - {formatCurrency(item.default_price)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={itemData.description || ''}
                onChange={(e) =>
                  setItemData({ ...itemData, description: e.target.value })
                }
                placeholder="Descrição do item"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min={1}
                  value={itemData.quantity || ''}
                  onChange={(e) =>
                    setItemData({ ...itemData, quantity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Unitário *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={itemData.unit_price || ''}
                  onChange={(e) =>
                    setItemData({ ...itemData, unit_price: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            {itemData.quantity && itemData.unit_price && (
              <div className="rounded-lg bg-muted p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total do item:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(itemData.quantity * itemData.unit_price)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addItem.isPending}>
              {addItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface QuoteDetailSheetProps {
  quoteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function QuoteDetailSheet({ quoteId, open, onOpenChange }: QuoteDetailSheetProps) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: quote, isLoading } = useQuote(quoteId || '');
  const sendQuote = useSendQuote();
  const approveQuote = useApproveQuote();
  const rejectQuote = useRejectQuote();
  const removeItem = useRemoveQuoteItem();

  const editable = quote ? canEditQuote(quote.status) : false;
  const sendable = quote ? canSendQuote(quote.status) : false;
  const approvable = quote ? canApproveQuote(quote.status) : false;

  const handleSend = () => {
    if (quote) {
      sendQuote.mutate({ id: quote.id });
    }
  };

  const handleApprove = () => {
    if (quote) {
      approveQuote.mutate({ id: quote.id });
    }
  };

  const handleReject = () => {
    if (quote && rejectReason.trim()) {
      rejectQuote.mutate(
        { id: quote.id, data: { reason: rejectReason } },
        {
          onSuccess: () => {
            setShowRejectDialog(false);
            setRejectReason('');
          },
        }
      );
    }
  };

  const handleRemoveItem = (itemId: string) => {
    if (quote) {
      removeItem.mutate({ quoteId: quote.id, itemId });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[500px] sm:w-[600px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              {quote?.number || 'Carregando...'}
            </SheetTitle>
            <SheetDescription>
              {quote && (
                <>
                  Criado{' '}
                  {formatDistanceToNow(parseISO(quote.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : quote ? (
            <ScrollArea className="h-[calc(100vh-180px)] pr-4">
              <div className="space-y-6 py-6">
                {/* Status & Customer Info */}
                <div className="flex items-center justify-between">
                  <QuoteStatusBadge status={quote.status} />
                  {quote.valid_until && (
                    <span className="text-sm text-muted-foreground">
                      Válido até {format(parseISO(quote.valid_until), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{quote.customer_name}</span>
                    </div>
                    {quote.customer_email && (
                      <div className="text-sm text-muted-foreground">
                        {quote.customer_email}
                      </div>
                    )}
                    {quote.work_order_number && (
                      <Badge variant="outline" className="mt-2">
                        OS: {quote.work_order_number}
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                {/* Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Itens do Orçamento</CardTitle>
                      {editable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddItem(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <QuoteItemsList
                      items={quote.items}
                      canEdit={editable}
                      onRemove={handleRemoveItem}
                    />
                  </CardContent>
                </Card>

                {/* Totals */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(quote.subtotal)}</span>
                      </div>
                      {quote.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Desconto</span>
                          <span>-{formatCurrency(quote.discount)}</span>
                        </div>
                      )}
                      {quote.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Impostos</span>
                          <span>{formatCurrency(quote.tax)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-orange-600">
                          {formatCurrency(quote.total)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {quote.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Observações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {quote.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Finance Info (if approved) */}
                {quote.status === 'approved' && quote.finance_result && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="flex items-start gap-3 pt-4">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-800">
                          Integrado ao Finance
                        </p>
                        <p className="text-sm text-green-700">
                          {quote.finance_result.transactions_created} transação(ões)
                          criada(s) no TrakLedger
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Rejection Reason */}
                {quote.status === 'rejected' && quote.rejection_reason && (
                  <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="flex items-start gap-3 pt-4">
                      <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-red-800">
                          Motivo da Rejeição
                        </p>
                        <p className="text-sm text-red-700">{quote.rejection_reason}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          ) : null}

          <SheetFooter className="border-t pt-4">
            <div className="flex items-center gap-2 w-full">
              {sendable && (
                <Button
                  onClick={handleSend}
                  disabled={sendQuote.isPending}
                  className="flex-1"
                >
                  {sendQuote.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar ao Cliente
                </Button>
              )}
              {approvable && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={approveQuote.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {approveQuote.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Aprovar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={rejectQuote.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </>
              )}
              {!sendable && !approvable && (
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Fechar
                </Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Item Dialog */}
      {quote && (
        <AddItemDialog
          quoteId={quote.id}
          open={showAddItem}
          onOpenChange={setShowAddItem}
        />
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Orçamento</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O cliente será notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo da rejeição..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectQuote.isPending}
            >
              {rejectQuote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CreateQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateQuoteDialog({ open, onOpenChange }: CreateQuoteDialogProps) {
  const [formData, setFormData] = useState<Partial<QuoteCreateInput>>({});
  const createQuote = useCreateQuote();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    createQuote.mutate(formData as QuoteCreateInput, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({});
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Orçamento</DialogTitle>
          <DialogDescription>Crie um novo orçamento para um cliente</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Cliente *</Label>
              <Input
                value={formData.customer_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
                placeholder="Nome ou razão social"
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail do Cliente</Label>
              <Input
                type="email"
                value={formData.customer_email || ''}
                onChange={(e) =>
                  setFormData({ ...formData, customer_email: e.target.value })
                }
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.customer_phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, customer_phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>Ordem de Serviço (opcional)</Label>
              <Input
                value={formData.work_order_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, work_order_id: e.target.value })
                }
                placeholder="ID da OS relacionada"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createQuote.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {createQuote.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar Orçamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function QuotesPage() {
  // ==========================================================================
  // State
  // ==========================================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  // ==========================================================================
  // Queries
  // ==========================================================================
  const filters: QuoteFilters = useMemo(
    () => ({
      status: selectedStatus !== 'all' ? (selectedStatus as QuoteStatus) : undefined,
      search: searchTerm || undefined,
    }),
    [selectedStatus, searchTerm]
  );

  const { data: quotesData, isLoading: isLoadingQuotes, refetch } = useQuotes(filters);
  const { data: summary, isLoading: isLoadingSummary } = useQuotesSummary();
  const deleteQuote = useDeleteQuote();

  // ==========================================================================
  // Computed Values
  // ==========================================================================
  const quotes = quotesData?.results || [];

  const summaryData = summary || {
    total: 0,
    draft: 0,
    sent: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    total_value: 0,
    approved_value: 0,
    conversion_rate: 0,
  };

  // ==========================================================================
  // Handlers
  // ==========================================================================
  const handleRefresh = () => {
    refetch();
  };

  const handleViewQuote = useCallback((quoteId: string) => {
    setSelectedQuoteId(quoteId);
  }, []);

  const handleDeleteQuote = useCallback(
    (quoteId: string) => {
      if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
        deleteQuote.mutate(quoteId);
      }
    },
    [deleteQuote]
  );

  // ==========================================================================
  // Table Columns
  // ==========================================================================
  const columns: Column<Quote>[] = useMemo(
    () => [
      {
        id: 'number',
        header: 'Número',
        cell: (row) => (
          <div className="space-y-1">
            <div className="font-medium">{row.number}</div>
            <div className="text-xs text-muted-foreground">
              {format(parseISO(row.created_at), 'dd/MM/yyyy')}
            </div>
          </div>
        ),
        width: 120,
      },
      {
        id: 'customer',
        header: 'Cliente',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <div className="font-medium text-sm truncate max-w-[150px]">
                {row.customer_name}
              </div>
              {row.work_order_number && (
                <Badge variant="outline" className="text-xs mt-1">
                  OS: {row.work_order_number}
                </Badge>
              )}
            </div>
          </div>
        ),
        width: 200,
      },
      {
        id: 'items',
        header: 'Itens',
        cell: (row) => (
          <span className="text-sm">{row.items.length} item(ns)</span>
        ),
        width: 80,
        align: 'center',
      },
      {
        id: 'total',
        header: 'Total',
        cell: (row) => (
          <span className="font-medium">{formatCurrency(row.total)}</span>
        ),
        width: 120,
        align: 'right',
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <QuoteStatusBadge status={row.status} />,
        width: 120,
      },
      {
        id: 'valid_until',
        header: 'Validade',
        cell: (row) =>
          row.valid_until ? (
            <span className="text-sm text-muted-foreground">
              {format(parseISO(row.valid_until), 'dd/MM/yyyy')}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          ),
        width: 100,
      },
      {
        id: 'actions',
        header: '',
        cell: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleViewQuote(row.id)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              {row.status === 'draft' && (
                <DropdownMenuItem onClick={() => handleDeleteQuote(row.id)}>
                  <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        width: 60,
        align: 'right',
      },
    ],
    [handleDeleteQuote, handleViewQuote]
  );

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        description="Crie e gerencie orçamentos em campo"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Orçamento
          </Button>
        </div>
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="Orçamentos Abertos"
          value={summaryData.draft + summaryData.sent}
          description="Aguardando resposta"
          icon={FileText}
          color="text-amber-500"
          isLoading={isLoadingSummary}
        />
        <QuickStatCard
          title="Aprovados (Mês)"
          value={summaryData.approved}
          description="Convertidos"
          icon={CheckCircle}
          color="text-green-500"
          isLoading={isLoadingSummary}
        />
        <QuickStatCard
          title="Valor Aprovado"
          value={formatCurrency(summaryData.approved_value)}
          description="Este mês"
          icon={DollarSign}
          color="text-orange-500"
          isLoading={isLoadingSummary}
        />
        <QuickStatCard
          title="Taxa de Conversão"
          value={`${summaryData.conversion_rate.toFixed(0)}%`}
          description="Aprovados / Total"
          icon={Target}
          color="text-blue-500"
          isLoading={isLoadingSummary}
        />
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Lista de Orçamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar orçamento ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Table */}
          <DataTable<Quote>
            columns={columns}
            data={quotes}
            total={quotesData?.count ?? 0}
            isLoading={isLoadingQuotes}
            getRowId={(row) => row.id}
            emptyState={{
              icon: <FileText className="h-12 w-12" />,
              title: 'Nenhum orçamento encontrado',
              description: 'Crie seu primeiro orçamento clicando no botão acima.',
            }}
            hoverable
            striped
          />
        </CardContent>
      </Card>

      {/* Create Quote Dialog */}
      <CreateQuoteDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      {/* Quote Detail Sheet */}
      <QuoteDetailSheet
        quoteId={selectedQuoteId}
        open={!!selectedQuoteId}
        onOpenChange={(open) => !open && setSelectedQuoteId(null)}
      />
    </div>
  );
}

export default QuotesPage;
