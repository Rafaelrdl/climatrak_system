/**
 * Finance Budgets Page
 * 
 * Tela de orçamentos - plano anual + editor mensal.
 * Baseado em: docs/frontend/finance/05-telas-fluxos.md
 * 
 * Funcionalidades:
 * - Lista de BudgetPlans (por ano)
 * - Criar novo plano
 * - Editor de envelopes (categoria + centro de custo + nome)
 * - Editor mensal (grid 12 meses com planned + contingency)
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Calendar,
  ChevronRight,
  Loader2,
  Save,
  X,
  AlertCircle,
  FileSpreadsheet,
  Check,
  TrendingUp,
  DollarSign,
  PiggyBank,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MoneyCell } from '@/components/finance';
import {
  useBudgetPlans,
  useCreateBudgetPlan,
  useEnvelopes,
  useCreateEnvelope,
  useUpdateEnvelopeMonths,
  useCostCenters,
} from '@/hooks/finance';
import { useAbility } from '@/hooks/useAbility';
import { cn } from '@/lib/utils';
import type { 
  BudgetPlan, 
  BudgetPlanStatus, 
  Envelope, 
  EnvelopeMonth,
  TransactionCategory,
  Currency,
} from '@/types/finance';

// ==================== Constants ====================

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
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

const STATUS_LABELS: Record<BudgetPlanStatus, string> = {
  draft: 'Rascunho',
  approved: 'Aprovado',
  locked: 'Fechado',
};

const STATUS_COLORS: Record<BudgetPlanStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-primary/10 text-primary border border-primary/30',
  locked: 'bg-amber-50 text-amber-700 border border-amber-200',
};

// ==================== Helper Functions ====================

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getCategoryLabel(category: TransactionCategory): string {
  return CATEGORIES.find(c => c.value === category)?.label ?? category;
}

// ==================== Create Plan Dialog ====================

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function CreatePlanDialog({ open, onOpenChange, onSuccess }: CreatePlanDialogProps) {
  const [name, setName] = useState('');
  const [year, setYear] = useState(getCurrentYear() + 1);
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [description, setDescription] = useState('');
  
  const createPlan = useCreateBudgetPlan();

  const handleSubmit = async () => {
    try {
      // Gerar código automaticamente (com timestamp para evitar duplicação)
      const timestamp = Date.now().toString().slice(-6);
      const code = `BUDGET-${year}-${timestamp}`;
      
      // Gerar datas de início e fim baseadas no ano
      const start_date = `${year}-01-01`;
      const end_date = `${year}-12-31`;
      
      await createPlan.mutateAsync({
        name: name || `Orçamento ${year}`,
        code,
        year,
        start_date,
        end_date,
        currency,
        status: 'draft',
        description,
      });
      onSuccess();
      onOpenChange(false);
      // Reset form
      setName('');
      setDescription('');
      setYear(getCurrentYear() + 1);
      setCurrency('BRL');
    } catch (error) {
      console.error('Erro ao criar plano:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Novo Plano Orçamentário</DialogTitle>
              <DialogDescription className="mt-1">
                Configure o orçamento anual para planejamento financeiro
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="plan-name">Nome do Plano</Label>
            <Input
              id="plan-name"
              placeholder="Ex: Orçamento 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar "Orçamento {year}"
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="year">Ano</Label>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger id="year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[getCurrentYear(), getCurrentYear() + 1, getCurrentYear() + 2].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="currency">Moeda</Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as Currency)}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL (R$)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="plan-description">Descrição (opcional)</Label>
            <Input
              id="plan-description"
              placeholder="Ex: Orçamento anual para manutenção predial"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createPlan.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createPlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!createPlan.isPending && <Check className="mr-2 h-4 w-4" />}
            Criar Plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Plan Card ====================

interface PlanCardProps {
  plan: BudgetPlan;
  isSelected: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, isSelected, onSelect }: PlanCardProps) {
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-primary/50',
        isSelected && 'ring-2 ring-primary border-primary shadow-md bg-primary/5'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg transition-colors',
              isSelected ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
            )}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className={cn(
                'font-semibold text-lg transition-colors',
                isSelected && 'text-primary'
              )}>{plan.year}</h3>
              <p className="text-sm text-muted-foreground">{plan.currency}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={STATUS_COLORS[plan.status]}>
              {STATUS_LABELS[plan.status]}
            </Badge>
            <ChevronRight className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-200',
              isSelected && 'rotate-90 text-primary'
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Envelope Editor ====================

interface EnvelopeEditorProps {
  envelope: Envelope;
  months: EnvelopeMonth[];
  isLocked: boolean;
  onMonthsChange: (months: EnvelopeMonth[]) => void;
}

function EnvelopeEditor({ envelope, months, isLocked, onMonthsChange }: EnvelopeEditorProps) {
  const { data: costCenters } = useCostCenters();
  const [editingField, setEditingField] = useState<string | null>(null);
  
  const costCenterName = useMemo(() => {
    return costCenters?.find(cc => cc.id === envelope.cost_center)?.name ?? 'N/A';
  }, [costCenters, envelope.cost_center]);

  const totalPlanned = useMemo(() => 
    months.reduce((sum, m) => sum + (Number(m.planned_amount) || 0), 0)
  , [months]);

  const totalContingency = useMemo(() => 
    months.reduce((sum, m) => sum + (Number(m.contingency_amount) || 0), 0)
  , [months]);

  const handleMonthChange = (monthIndex: number, field: 'planned_amount' | 'contingency_amount', value: number) => {
    const numValue = Number(value) || 0;
    const newMonths = [...months];
    const existingMonth = newMonths.find(m => m.month === monthIndex + 1);
    
    if (existingMonth) {
      existingMonth[field] = numValue;
    } else {
      newMonths.push({
        month: monthIndex + 1,
        planned_amount: field === 'planned_amount' ? numValue : 0,
        contingency_amount: field === 'contingency_amount' ? numValue : 0,
      });
    }
    
    onMonthsChange(newMonths);
  };

  // Formata número para padrão brasileiro (1.000,00)
  const formatMoneyBR = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Converte valor brasileiro (aceita . e , como decimais) para número
  const parseMoneyValue = (value: string): number => {
    if (!value) return 0;
    
    // Remove espaços
    let cleaned = value.replace(/\s/g, '');
    
    // Se tiver vírgula E ponto: formato brasileiro (1.500,50)
    // Remove pontos (milhares) e troca vírgula por ponto (decimal)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Se tiver só vírgula: formato brasileiro (1500,50)
    // Troca vírgula por ponto
    else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    // Se tiver só ponto: verifica se é milhar ou decimal
    else if (cleaned.includes('.')) {
      const parts = cleaned.split('.');
      // Se último grupo tem 3 dígitos, é separador de milhar (8.000)
      if (parts[parts.length - 1].length === 3 && parts.length > 1) {
        cleaned = cleaned.replace(/\./g, '');
      }
      // Caso contrário mantém como decimal (8.50)
    }
    
    return parseFloat(cleaned) || 0;
  };

  const getMonthValue = (monthIndex: number, field: 'planned_amount' | 'contingency_amount'): string => {
    const month = months.find(m => m.month === monthIndex + 1);
    const value = month?.[field] ?? 0;
    const fieldKey = `${monthIndex}-${field}`;
    
    // Se está editando este campo, retorna o valor bruto
    if (editingField === fieldKey) {
      return value > 0 ? String(value) : '';
    }
    
    // Senão, retorna formatado apenas se tiver valor
    return value > 0 ? formatMoneyBR(value) : '';
  };

  return (
    <AccordionItem value={envelope.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-4 text-left">
          <div className="flex-1">
            <div className="font-medium">{envelope.name}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {getCategoryLabel(envelope.category)}
              </Badge>
              <span>•</span>
              <span>{costCenterName}</span>
            </div>
          </div>
          <div className="text-right mr-4">
            <div className="text-sm font-medium">
              <MoneyCell value={totalPlanned} />
            </div>
            <div className="text-xs text-muted-foreground">
              + <MoneyCell value={totalContingency} size="sm" /> contingência
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Tipo</TableHead>
                {MONTHS.map((month) => (
                  <TableHead key={month} className="text-center min-w-[80px]">
                    {month}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Planned Row */}
              <TableRow>
                <TableCell className="font-medium">Planejado</TableCell>
                {MONTHS.map((_, idx) => (
                  <TableCell key={idx} className="p-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-20 text-right text-sm"
                      value={getMonthValue(idx, 'planned_amount')}
                      onFocus={() => setEditingField(`${idx}-planned_amount`)}
                      onChange={(e) => handleMonthChange(idx, 'planned_amount', parseMoneyValue(e.target.value))}
                      onBlur={() => setEditingField(null)}
                      disabled={isLocked}
                      placeholder="0,00"
                    />
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium">
                  <MoneyCell value={totalPlanned} />
                </TableCell>
              </TableRow>
              {/* Contingency Row */}
              <TableRow>
                <TableCell className="font-medium text-amber-600">Contingência</TableCell>
                {MONTHS.map((_, idx) => (
                  <TableCell key={idx} className="p-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-20 text-right text-sm"
                      value={getMonthValue(idx, 'contingency_amount')}
                      onFocus={() => setEditingField(`${idx}-contingency_amount`)}
                      onChange={(e) => handleMonthChange(idx, 'contingency_amount', parseMoneyValue(e.target.value))}
                      onBlur={() => setEditingField(null)}
                      disabled={isLocked}
                      placeholder="0,00"
                    />
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium text-amber-600">
                  <MoneyCell value={totalContingency} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ==================== Create Envelope Dialog ====================

interface CreateEnvelopeDialogProps {
  budgetPlanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateEnvelopeDialog({ budgetPlanId, open, onOpenChange }: CreateEnvelopeDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('preventive');
  const [costCenterId, setCostCenterId] = useState('');
  const [description, setDescription] = useState('');
  
  const { data: costCenters } = useCostCenters();
  const createEnvelope = useCreateEnvelope();

  const handleSubmit = async () => {
    try {
      await createEnvelope.mutateAsync({
        budget_plan: budgetPlanId,
        name,
        category,
        cost_center: costCenterId,
        amount: 0,
        currency: 'BRL',
        description,
      });
      onOpenChange(false);
      // Reset form
      setName('');
      setCategory('preventive');
      setCostCenterId('');
      setDescription('');
    } catch (error) {
      console.error('Erro ao criar envelope:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <PiggyBank className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Novo Envelope Orçamentário</DialogTitle>
              <DialogDescription className="mt-1">
                Configure uma categoria de orçamento para alocar valores mensais
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="envelope-name">Nome do Envelope</Label>
            <Input
              id="envelope-name"
              placeholder="Ex: Chillers - Preventiva"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="envelope-category">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TransactionCategory)}>
              <SelectTrigger id="envelope-category">
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
          
          <div className="grid gap-2">
            <Label htmlFor="envelope-cost-center">Centro de Custo</Label>
            <Select value={costCenterId} onValueChange={setCostCenterId}>
              <SelectTrigger id="envelope-cost-center">
                <SelectValue placeholder="Selecione um centro de custo" />
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
            <Label htmlFor="envelope-description">Descrição (opcional)</Label>
            <Input
              id="envelope-description"
              placeholder="Ex: Manutenção preventiva de chillers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name || !costCenterId || createEnvelope.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createEnvelope.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!createEnvelope.isPending && <Check className="mr-2 h-4 w-4" />}
            Criar Envelope
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Plan Detail ====================

interface PlanDetailProps {
  plan: BudgetPlan;
}

function PlanDetail({ plan }: PlanDetailProps) {
  const ability = useAbility();
  const canEdit = ability.can('edit', 'finance') && plan.status !== 'locked';
  
  const [isCreateEnvelopeOpen, setIsCreateEnvelopeOpen] = useState(false);
  const [envelopeMonths, setEnvelopeMonths] = useState<Record<string, EnvelopeMonth[]>>({});
  const [modifiedEnvelopes, setModifiedEnvelopes] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: envelopes, isLoading, error } = useEnvelopes(plan.id);
  const updateEnvelopeMonths = useUpdateEnvelopeMonths();

  // Initialize envelope months from backend data
  useEffect(() => {
    if (!envelopes) return;
    
    // NÃO sobrescrever estado durante salvamento
    if (isSaving) {
      console.log('useEffect: Ignorando durante salvamento');
      return;
    }
    
    console.log('useEffect: Carregando envelopes do backend:', envelopes.map(e => ({ 
      id: e.id, 
      name: e.name, 
      months: e.months?.length 
    })));
    
    setEnvelopeMonths(prevMonths => {
      const initialMonths: Record<string, EnvelopeMonth[]> = {};
      envelopes.forEach(envelope => {
        // Sempre inicializar array, mesmo que vazio
        if (envelope.months && envelope.months.length > 0) {
          // Converter dados do backend (month: "2025-01-01") para formato frontend (month: 1)
          initialMonths[envelope.id] = envelope.months.map(m => {
            // Extrair mês diretamente da string para evitar problemas de timezone
            // Formato esperado: "YYYY-MM-DD"
            const monthStr = m.month.split('-')[1];
            const monthNum = parseInt(monthStr, 10); // 01-12 -> 1-12
            
            return {
              month: monthNum,
              planned_amount: m.planned_amount,
              contingency_amount: m.contingency_amount || 0,
            };
          });
          
          console.log(`Envelope ${envelope.name}:`, initialMonths[envelope.id].map(m => ({ 
            month: m.month, 
            planned: m.planned_amount 
          })));
        } else {
          // Preservar meses existentes ou inicializar array vazio
          initialMonths[envelope.id] = prevMonths[envelope.id] ?? [];
        }
      });
      
      return initialMonths;
    });
  }, [envelopes, isSaving]);

  const handleMonthsChange = (envelopeId: string, months: EnvelopeMonth[]) => {
    setEnvelopeMonths(prev => ({
      ...prev,
      [envelopeId]: months,
    }));
    setModifiedEnvelopes(prev => new Set(prev).add(envelopeId));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Salvar apenas envelopes modificados
      const promises = Array.from(modifiedEnvelopes).map(envelopeId => {
        const months = envelopeMonths[envelopeId];
        if (!months || months.length === 0) return Promise.resolve();
        
        // Converter TODOS os 12 meses de número (1-12) para data (YYYY-MM-01)
        // Importante: enviar todos os meses porque o backend deleta e recria
        const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);
        const monthsForBackend = allMonths.map(monthNum => {
          const existingMonth = months.find(m => m.month === monthNum);
          return {
            month: `${plan.year}-${String(monthNum).padStart(2, '0')}-01`,
            planned_amount: Number(existingMonth?.planned_amount) || 0,
            contingency_amount: Number(existingMonth?.contingency_amount) || 0,
          };
        });
        
        console.log('Enviando para backend:', { envelopeId, monthsForBackend });
        
        return updateEnvelopeMonths.mutateAsync({ 
          envelopeId, 
          months: monthsForBackend 
        });
      });
      
      await Promise.all(promises);
      setHasChanges(false);
      setModifiedEnvelopes(new Set());
      console.log('Salvamento concluído');
    } catch (error) {
      console.error('Erro ao salvar meses:', error);
    } finally {
      // Aguardar um pequeno delay para garantir que o backend processou
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsSaving(false);
    }
  };

  const totalPlanned = useMemo(() => {
    if (!envelopes) return 0;
    return envelopes.reduce((total, envelope) => {
      const months = envelopeMonths[envelope.id] ?? [];
      const monthsTotal = months.reduce((sum, m) => sum + (Number(m.planned_amount) || 0), 0);
      return total + monthsTotal;
    }, 0);
  }, [envelopes, envelopeMonths]);

  const totalContingency = useMemo(() => {
    if (!envelopes) return 0;
    return envelopes.reduce((total, envelope) => {
      const months = envelopeMonths[envelope.id] ?? [];
      const monthsTotal = months.reduce((sum, m) => sum + (Number(m.contingency_amount) || 0), 0);
      return total + monthsTotal;
    }, 0);
  }, [envelopes, envelopeMonths]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar envelopes. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Plano Orçamentário {plan.year}
              <Badge className={STATUS_COLORS[plan.status]}>
                {STATUS_LABELS[plan.status]}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              {envelopes?.length ?? 0} {(envelopes?.length ?? 0) === 1 ? 'envelope configurado' : 'envelopes configurados'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && canEdit && (
            <Button 
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
          )}
          {canEdit && (
            <Button 
              variant="outline" 
              onClick={() => setIsCreateEnvelopeOpen(true)}
              className="hover:bg-primary/10 hover:text-primary hover:border-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Envelope
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <KpiGrid columns={3}>
        <KpiCard
          title="Total Planejado"
          value={<MoneyCell value={totalPlanned} size="lg" className="text-2xl font-bold" />}
          icon={<DollarSign className="h-4 w-4" />}
          description="Orçamento base anual"
          variant="primary"
        />
        <KpiCard
          title="Contingência"
          value={<MoneyCell value={totalContingency} size="lg" className="text-2xl font-bold" />}
          icon={<AlertCircle className="h-4 w-4" />}
          description="Reserva de emergência"
          variant="warning"
        />
        <KpiCard
          title="Total Geral"
          value={<MoneyCell value={totalPlanned + totalContingency} size="lg" className="text-2xl font-bold" />}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Orçamento total aprovado"
          variant="success"
        />
      </KpiGrid>

      {/* Envelopes */}
      {envelopes && envelopes.length > 0 ? (
        <Card>
          <ScrollArea className="h-[calc(100vh-520px)]">
            <Accordion type="multiple" className="w-full px-6 py-2">
              {envelopes.map((envelope) => (
                <EnvelopeEditor
                  key={envelope.id}
                  envelope={envelope}
                  months={envelopeMonths[envelope.id] ?? []}
                  isLocked={plan.status === 'locked'}
                  onMonthsChange={(months) => handleMonthsChange(envelope.id, months)}
                />
              ))}
            </Accordion>
          </ScrollArea>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <PiggyBank className="h-12 w-12 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-2">Nenhum envelope configurado</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Configure envelopes orçamentários para distribuir valores por categoria e centro de custo ao longo dos 12 meses.
            </p>
            {canEdit && (
              <Button 
                onClick={() => setIsCreateEnvelopeOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Envelope
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Envelope Dialog */}
      <CreateEnvelopeDialog
        budgetPlanId={plan.id}
        open={isCreateEnvelopeOpen}
        onOpenChange={setIsCreateEnvelopeOpen}
      />
    </div>
  );
}

// ==================== Main Component ====================

export function FinanceBudgets() {
  const ability = useAbility();
  const canCreate = ability.can('create', 'finance');

  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: plans, isLoading, error } = useBudgetPlans(selectedYear);

  const selectedPlan = useMemo(() => 
    plans?.find(p => p.id === selectedPlanId)
  , [plans, selectedPlanId]);

  // Auto-select first plan when data loads
  useMemo(() => {
    if (plans && plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
            <p className="text-muted-foreground">
              Planejamento orçamentário anual e gestão mensal de envelopes
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => {
              setSelectedYear(Number(v));
              setSelectedPlanId(null);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[getCurrentYear() - 1, getCurrentYear(), getCurrentYear() + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {canCreate && (
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Plano
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar planos orçamentários. Tente novamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {/* Plans List */}
      {plans && plans.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-4 flex-1 overflow-hidden">
          {/* Plans Sidebar */}
          <div>
            <ScrollArea className="h-[calc(100vh-240px)]">
              <div className="space-y-3 pr-4">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isSelected={plan.id === selectedPlanId}
                    onSelect={() => setSelectedPlanId(plan.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Plan Detail */}
          <div className="lg:col-span-3 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-240px)]">
              {selectedPlan ? (
                <div className="pr-4">
                  <PlanDetail plan={selectedPlan} />
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="p-4 rounded-full bg-primary/10 mb-4">
                      <Calendar className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Selecione um plano</h3>
                    <p className="text-muted-foreground text-center">
                      Escolha um plano orçamentário para visualizar e editar envelopes
                    </p>
                  </CardContent>
                </Card>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Empty State */}
      {plans && plans.length === 0 && (
        <Card className="border-dashed flex-1">
          <CardContent className="flex flex-col items-center justify-center h-full py-16">
            <div className="p-6 rounded-full bg-primary/10 mb-6">
              <FileSpreadsheet className="h-16 w-16 text-primary" />
            </div>
            <h3 className="font-semibold text-2xl mb-3">Nenhum plano orçamentário em {selectedYear}</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Configure seu primeiro plano orçamentário para gerenciar custos de manutenção de forma estruturada ao longo do ano.
            </p>
            {canCreate && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-2 h-5 w-5" />
                Criar Plano Orçamentário {selectedYear}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Plan Dialog */}
      <CreatePlanDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          // Refresh is automatic via React Query
        }}
      />
    </div>
  );
}

export default FinanceBudgets;
