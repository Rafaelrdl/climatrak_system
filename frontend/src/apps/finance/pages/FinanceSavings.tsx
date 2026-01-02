/**
 * Finance Savings Page
 * 
 * Tela de economia (savings) com:
 * - Lista de SavingsEvent
 * - Form de criação manual com tipo, valor, confiança
 * - Vínculo com OS/Ativo/Alerta
 * - Evidências (links/anexos)
 * 
 * Baseado em: docs/frontend/finance/05-telas-fluxos.md (FE-FIN-011)
 */

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Filter,
  TrendingDown,
  Zap,
  ShieldCheck,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  Wrench,
  Building2,
  Bell,
  ExternalLink,
  HelpCircle,
  Link2,
  Sparkles,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MoneyCell, DataTable, type Column, type PaginationState } from '@/components/finance';
import { 
  useSavings, 
  useCreateSavingsEvent, 
  useCostCenters,
  useFinanceSummary,
} from '@/hooks/finance';
import { useAbility } from '@/hooks/useAbility';
import { cn } from '@/lib/utils';
import type { 
  SavingsEvent, 
  SavingsEventInput,
  SavingsEventType,
  SavingsConfidence,
  SavingsFilters,
} from '@/types/finance';

// ==================== Constants ====================

const EVENT_TYPE_CONFIG: Record<SavingsEventType, { label: string; icon: typeof TrendingDown; color: string }> = {
  avoided_failure: { 
    label: 'Falha Evitada', 
    icon: ShieldCheck, 
    color: 'text-green-600 dark:text-green-400' 
  },
  energy_saving: { 
    label: 'Economia Energia', 
    icon: Zap, 
    color: 'text-amber-600 dark:text-amber-400' 
  },
  lifespan_extension: { 
    label: 'Extensão Vida Útil', 
    icon: Clock, 
    color: 'text-blue-600 dark:text-blue-400' 
  },
  other: { 
    label: 'Outros', 
    icon: Sparkles, 
    color: 'text-purple-600 dark:text-purple-400' 
  },
};

const CONFIDENCE_CONFIG: Record<SavingsConfidence, { label: string; color: string; description: string }> = {
  high: { 
    label: 'Alta', 
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    description: 'Evidências sólidas e métricas comprovadas',
  },
  med: { 
    label: 'Média', 
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    description: 'Estimativa baseada em dados parciais',
  },
  low: { 
    label: 'Baixa', 
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    description: 'Estimativa aproximada ou subjetiva',
  },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ==================== Helpers ====================

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

// ==================== Type Badge ====================

function TypeBadge({ type }: { type: SavingsEventType }) {
  const config = EVENT_TYPE_CONFIG[type];
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn('h-4 w-4', config.color)} />
      <span className="text-sm">{config.label}</span>
    </div>
  );
}

// ==================== Confidence Badge ====================

function ConfidenceBadge({ confidence }: { confidence: SavingsConfidence }) {
  const config = CONFIDENCE_CONFIG[confidence];
  
  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="secondary" className={cn('gap-1', config.color)}>
          {config.label}
          <HelpCircle className="h-3 w-3" />
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs text-xs">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ==================== Filter Panel ====================

interface FilterPanelProps {
  filters: SavingsFilters;
  onFiltersChange: (filters: SavingsFilters) => void;
  onClear: () => void;
}

function FilterPanel({ filters, onFiltersChange, onClear }: FilterPanelProps) {
  const { data: costCenters } = useCostCenters();

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.cost_center_id) count++;
    if (filters.event_type) count++;
    if (filters.confidence) count++;
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
              <Label>Tipo de Evento</Label>
              <Select
                value={filters.event_type ?? ''}
                onValueChange={(v) => onFiltersChange({ ...filters, event_type: v as SavingsEventType || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {Object.entries(EVENT_TYPE_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Confiança</Label>
              <Select
                value={filters.confidence ?? ''}
                onValueChange={(v) => onFiltersChange({ ...filters, confidence: v as SavingsConfidence || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {Object.entries(CONFIDENCE_CONFIG).map(([value, config]) => (
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

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>De</Label>
                <Input
                  type="date"
                  value={filters.from ?? ''}
                  onChange={(e) => onFiltersChange({ ...filters, from: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Até</Label>
                <Input
                  type="date"
                  value={filters.to ?? ''}
                  onChange={(e) => onFiltersChange({ ...filters, to: e.target.value || undefined })}
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ==================== Summary Cards ====================

function SummaryCards() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: summary, isLoading } = useFinanceSummary(currentMonth);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
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

  const cards = [
    { 
      label: 'Economia Total (Mês)', 
      value: summary?.savings ?? 0, 
      icon: TrendingDown,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    { 
      label: 'Custos Evitados', 
      value: summary?.savings ?? 0, 
      icon: ShieldCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    { 
      label: 'ROI Manutenção', 
      value: summary?.actual && summary.actual > 0 
        ? (((summary?.savings ?? 0) / summary.actual) * 100) 
        : 0, 
      icon: Sparkles,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      isPercentage: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  {card.isPercentage ? (
                    <p className={cn('text-2xl font-bold mt-1', card.color)}>
                      {card.value.toFixed(1)}%
                    </p>
                  ) : (
                    <MoneyCell value={card.value} size="lg" className={card.color} />
                  )}
                </div>
                <div className={cn('p-2 rounded-lg', card.bgColor)}>
                  <Icon className={cn('h-5 w-5', card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ==================== Create Savings Dialog ====================

interface CreateSavingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateSavingsDialog({ open, onOpenChange }: CreateSavingsDialogProps) {
  const { data: costCenters } = useCostCenters();
  const createMutation = useCreateSavingsEvent();
  
  const [formData, setFormData] = useState<Partial<SavingsEventInput>>({
    currency: 'BRL',
    confidence: 'med',
    occurred_at: new Date().toISOString().slice(0, 16),
  });
  const [evidenceLinks, setEvidenceLinks] = useState<{ key: string; value: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    // Validate
    const newErrors: Record<string, string> = {};
    if (!formData.event_type) newErrors.event_type = 'Obrigatório';
    if (!formData.cost_center_id) newErrors.cost_center_id = 'Obrigatório';
    if (!formData.savings_amount || formData.savings_amount <= 0) {
      newErrors.savings_amount = 'Valor deve ser maior que zero';
    }
    if (!formData.occurred_at) newErrors.occurred_at = 'Obrigatório';
    if (!formData.confidence) newErrors.confidence = 'Obrigatório';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Build evidence_links object
      const links: Record<string, string> = {};
      evidenceLinks.forEach(({ key, value }) => {
        if (key && value) {
          links[key] = value;
        }
      });

      await createMutation.mutateAsync({
        ...formData,
        evidence_links: Object.keys(links).length > 0 ? links : undefined,
      } as SavingsEventInput);
      
      onOpenChange(false);
      setFormData({
        currency: 'BRL',
        confidence: 'med',
        occurred_at: new Date().toISOString().slice(0, 16),
      });
      setEvidenceLinks([]);
      setErrors({});
    } catch (error) {
      console.error('Erro ao criar savings event:', error);
    }
  };

  const handleFieldChange = (field: keyof SavingsEventInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addEvidenceLink = () => {
    setEvidenceLinks(prev => [...prev, { key: '', value: '' }]);
  };

  const updateEvidenceLink = (index: number, field: 'key' | 'value', value: string) => {
    setEvidenceLinks(prev => {
      const newLinks = [...prev];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return newLinks;
    });
  };

  const removeEvidenceLink = (index: number) => {
    setEvidenceLinks(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Economia</DialogTitle>
          <DialogDescription>
            Registre uma economia gerada por manutenção preventiva ou preditiva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo e Confiança */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Evento *</Label>
              <Select
                value={formData.event_type ?? ''}
                onValueChange={(v) => handleFieldChange('event_type', v as SavingsEventType)}
              >
                <SelectTrigger className={errors.event_type ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <config.icon className={cn('h-4 w-4', config.color)} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.event_type && (
                <p className="text-xs text-destructive">{errors.event_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Confiança *</Label>
              <Select
                value={formData.confidence ?? ''}
                onValueChange={(v) => handleFieldChange('confidence', v as SavingsConfidence)}
              >
                <SelectTrigger className={errors.confidence ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONFIDENCE_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.confidence && (
                <p className="text-xs text-destructive">{errors.confidence}</p>
              )}
            </div>
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Economizado *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className={cn('pl-9', errors.savings_amount ? 'border-destructive' : '')}
                  value={formData.savings_amount ?? ''}
                  onChange={(e) => handleFieldChange('savings_amount', parseFloat(e.target.value) || 0)}
                />
              </div>
              {errors.savings_amount && (
                <p className="text-xs text-destructive">{errors.savings_amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data/Hora *</Label>
              <Input
                type="datetime-local"
                className={errors.occurred_at ? 'border-destructive' : ''}
                value={formData.occurred_at ?? ''}
                onChange={(e) => handleFieldChange('occurred_at', e.target.value)}
              />
              {errors.occurred_at && (
                <p className="text-xs text-destructive">{errors.occurred_at}</p>
              )}
            </div>
          </div>

          {/* Centro de Custo */}
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

          {/* Vínculos opcionais */}
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium">Vínculos (opcional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">ID do Ativo</Label>
                <Input
                  placeholder="UUID do ativo"
                  value={formData.asset_id ?? ''}
                  onChange={(e) => handleFieldChange('asset_id', e.target.value || undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">ID da Ordem de Serviço</Label>
                <Input
                  placeholder="UUID da OS"
                  value={formData.work_order_id ?? ''}
                  onChange={(e) => handleFieldChange('work_order_id', e.target.value || undefined)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">ID do Alerta</Label>
              <Input
                placeholder="UUID do alerta"
                value={formData.alert_id ?? ''}
                onChange={(e) => handleFieldChange('alert_id', e.target.value || undefined)}
              />
            </div>
          </div>

          {/* Explicação */}
          <div className="space-y-2">
            <Label>Explicação</Label>
            <Textarea
              placeholder="Descreva como a economia foi gerada..."
              rows={3}
              value={formData.explanation ?? ''}
              onChange={(e) => handleFieldChange('explanation', e.target.value)}
            />
          </div>

          {/* Links de Evidência */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Links de Evidência</Label>
              <Button variant="outline" size="sm" onClick={addEvidenceLink}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            {evidenceLinks.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Nome (ex: chart)"
                  className="w-32"
                  value={link.key}
                  onChange={(e) => updateEvidenceLink(index, 'key', e.target.value)}
                />
                <Input
                  placeholder="URL"
                  className="flex-1"
                  value={link.value}
                  onChange={(e) => updateEvidenceLink(index, 'value', e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEvidenceLink(index)}
                >
                  <AlertCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {evidenceLinks.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum link adicionado. Clique em "Adicionar" para incluir evidências.
              </p>
            )}
          </div>
        </div>

        {createMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao registrar economia. Tente novamente.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 mr-2" />
                Registrar Economia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Savings Detail Sheet ====================

interface SavingsDetailSheetProps {
  event: SavingsEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SavingsDetailSheet({ event, open, onOpenChange }: SavingsDetailSheetProps) {
  if (!event) return null;

  const typeConfig = EVENT_TYPE_CONFIG[event.event_type];
  const TypeIcon = typeConfig.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-green-600" />
            Detalhes da Economia
          </SheetTitle>
          <SheetDescription>
            Registrado em {formatDateTime(event.created_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Tipo e Confiança */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
              <span className="font-medium">{typeConfig.label}</span>
            </div>
            <ConfidenceBadge confidence={event.confidence} />
          </div>

          <Separator />

          {/* Valor */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Valor Economizado</p>
            <MoneyCell value={event.savings_amount} size="lg" className="text-green-600" />
          </div>

          {/* Detalhes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Data do Evento</p>
              <p className="font-medium">{formatDateTime(event.occurred_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Centro de Custo</p>
              <p className="font-medium">{event.cost_center_name ?? '-'}</p>
            </div>
          </div>

          {/* Vínculos */}
          {(event.asset_name || event.work_order_id || event.alert_id) && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium">Vínculos</p>
                {event.asset_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{event.asset_name}</span>
                  </div>
                )}
                {event.work_order_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span>OS vinculada</span>
                  </div>
                )}
                {event.alert_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span>Alerta vinculado</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Explicação */}
          {event.explanation && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Explicação</p>
                <p className="text-sm whitespace-pre-wrap">{event.explanation}</p>
              </div>
            </>
          )}

          {/* Links de Evidência */}
          {event.evidence_links && Object.keys(event.evidence_links).length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Evidências</p>
                <div className="space-y-2">
                  {Object.entries(event.evidence_links).map(([key, url]) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Link2 className="h-4 w-4" />
                      {key}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Baseline Reference */}
          {event.baseline_ref && Object.keys(event.baseline_ref).length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Referência de Baseline</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(event.baseline_ref, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==================== Main Component ====================

export function FinanceSavings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useAbility();
  const canCreate = can('create', 'finance_savings');

  // State
  const [selectedEvent, setSelectedEvent] = useState<SavingsEvent | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Filters from URL
  const filters = useMemo<SavingsFilters>(() => ({
    from: searchParams.get('from') ?? getFirstDayOfMonth(),
    to: searchParams.get('to') ?? getLastDayOfMonth(),
    cost_center_id: searchParams.get('cost_center_id') ?? undefined,
    event_type: searchParams.get('event_type') as SavingsEventType | undefined,
    confidence: searchParams.get('confidence') as SavingsConfidence | undefined,
    page: parseInt(searchParams.get('page') ?? '1'),
    page_size: parseInt(searchParams.get('page_size') ?? '20'),
  }), [searchParams]);

  // Queries
  const { data: savingsData, isLoading, isError } = useSavings(filters);

  // Handlers
  const handleFiltersChange = useCallback((newFilters: SavingsFilters) => {
    const params = new URLSearchParams();
    if (newFilters.from) params.set('from', newFilters.from);
    if (newFilters.to) params.set('to', newFilters.to);
    if (newFilters.cost_center_id) params.set('cost_center_id', newFilters.cost_center_id);
    if (newFilters.event_type) params.set('event_type', newFilters.event_type);
    if (newFilters.confidence) params.set('confidence', newFilters.confidence);
    params.set('page', '1');
    params.set('page_size', String(newFilters.page_size ?? 20));
    setSearchParams(params);
  }, [setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams({ 
      from: getFirstDayOfMonth(),
      to: getLastDayOfMonth(),
      page: '1', 
      page_size: '20' 
    }));
  }, [setSearchParams]);

  const handlePaginationChange = useCallback((pagination: PaginationState) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(pagination.page));
    params.set('page_size', String(pagination.pageSize));
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const handleRowClick = useCallback((event: SavingsEvent) => {
    setSelectedEvent(event);
    setShowDetail(true);
  }, []);

  // Table columns
  const columns = useMemo<Column<SavingsEvent>[]>(() => [
    {
      id: 'event_type',
      header: 'Tipo',
      width: 160,
      cell: (row) => <TypeBadge type={row.event_type} />,
    },
    {
      id: 'savings_amount',
      header: 'Valor',
      width: 140,
      align: 'right',
      cell: (row) => <MoneyCell value={row.savings_amount} className="text-green-600" />,
    },
    {
      id: 'confidence',
      header: 'Confiança',
      width: 100,
      cell: (row) => <ConfidenceBadge confidence={row.confidence} />,
    },
    {
      id: 'cost_center',
      header: 'Centro de Custo',
      cell: (row) => (
        <span className="truncate">{row.cost_center_name ?? '-'}</span>
      ),
    },
    {
      id: 'occurred_at',
      header: 'Data',
      width: 140,
      cell: (row) => formatDate(row.occurred_at),
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

  const events = savingsData?.data ?? [];
  const total = savingsData?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Economia</h1>
          <p className="text-muted-foreground">
            Registro de economia gerada por manutenção preventiva/preditiva
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Economia
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <SummaryCards />

      {/* Filters and Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Histórico de Economias</CardTitle>
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
                Erro ao carregar economias. Tente novamente.
              </AlertDescription>
            </Alert>
          ) : (
            <DataTable<SavingsEvent>
              columns={columns}
              data={events}
              total={total}
              isLoading={isLoading}
              pagination={{
                page: filters.page ?? 1,
                pageSize: filters.page_size ?? 20,
              }}
              onPaginationChange={handlePaginationChange}
              onRowClick={handleRowClick}
              emptyMessage="Nenhuma economia registrada"
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateSavingsDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Detail Sheet */}
      <SavingsDetailSheet
        event={selectedEvent}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </div>
  );
}

export default FinanceSavings;
