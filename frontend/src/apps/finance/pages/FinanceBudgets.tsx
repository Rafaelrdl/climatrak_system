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

import { useState, useMemo } from 'react';
import {
  Plus,
  Calendar,
  Edit2,
  Trash2,
  ChevronRight,
  Loader2,
  Save,
  X,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  Unlock,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DialogTrigger,
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
  { value: 'other', label: 'Outros' },
];

const STATUS_LABELS: Record<BudgetPlanStatus, string> = {
  draft: 'Rascunho',
  approved: 'Aprovado',
  locked: 'Fechado',
};

const STATUS_COLORS: Record<BudgetPlanStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-emerald-100 text-emerald-700',
  locked: 'bg-amber-100 text-amber-700',
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Plano Orçamentário</DialogTitle>
          <DialogDescription>
            Crie um novo plano anual para gerenciar seu orçamento.
          </DialogDescription>
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
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createPlan.isPending}>
            {createPlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{plan.year}</h3>
              <p className="text-sm text-muted-foreground">{plan.currency}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={STATUS_COLORS[plan.status]}>
              {STATUS_LABELS[plan.status]}
            </Badge>
            <ChevronRight className={cn(
              'h-5 w-5 text-muted-foreground transition-transform',
              isSelected && 'rotate-90'
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
  
  const costCenterName = useMemo(() => {
    return costCenters?.find(cc => cc.id === envelope.cost_center)?.name ?? 'N/A';
  }, [costCenters, envelope.cost_center]);

  const totalPlanned = useMemo(() => 
    months.reduce((sum, m) => sum + m.planned_amount, 0)
  , [months]);

  const totalContingency = useMemo(() => 
    months.reduce((sum, m) => sum + m.contingency_amount, 0)
  , [months]);

  const handleMonthChange = (monthIndex: number, field: 'planned_amount' | 'contingency_amount', value: number) => {
    const newMonths = [...months];
    const existingMonth = newMonths.find(m => m.month === monthIndex + 1);
    
    if (existingMonth) {
      existingMonth[field] = value;
    } else {
      newMonths.push({
        month: monthIndex + 1,
        planned_amount: field === 'planned_amount' ? value : 0,
        contingency_amount: field === 'contingency_amount' ? value : 0,
      });
    }
    
    onMonthsChange(newMonths);
  };

  const getMonthValue = (monthIndex: number, field: 'planned_amount' | 'contingency_amount'): number => {
    const month = months.find(m => m.month === monthIndex + 1);
    return month?.[field] ?? 0;
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
                      type="number"
                      min={0}
                      step={100}
                      className="h-8 w-20 text-right text-sm"
                      value={getMonthValue(idx, 'planned_amount') || ''}
                      onChange={(e) => handleMonthChange(idx, 'planned_amount', Number(e.target.value) || 0)}
                      disabled={isLocked}
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
                      type="number"
                      min={0}
                      step={100}
                      className="h-8 w-20 text-right text-sm"
                      value={getMonthValue(idx, 'contingency_amount') || ''}
                      onChange={(e) => handleMonthChange(idx, 'contingency_amount', Number(e.target.value) || 0)}
                      disabled={isLocked}
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
          <DialogTitle>Novo Envelope</DialogTitle>
          <DialogDescription>
            Crie uma categoria de orçamento para alocar valores mensais.
          </DialogDescription>
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
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name || !costCenterId || createEnvelope.isPending}
          >
            {createEnvelope.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
  const [hasChanges, setHasChanges] = useState(false);

  const { data: envelopes, isLoading, error } = useEnvelopes(plan.id);

  // Initialize envelope months from data
  // In real implementation, this would come from the API
  const handleMonthsChange = (envelopeId: string, months: EnvelopeMonth[]) => {
    setEnvelopeMonths(prev => ({
      ...prev,
      [envelopeId]: months,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // TODO: Call updateEnvelopeMonths for each changed envelope
    console.log('Saving envelope months:', envelopeMonths);
    setHasChanges(false);
  };

  const totalPlanned = useMemo(() => {
    if (!envelopes) return 0;
    return Object.values(envelopeMonths).reduce((total, months) => 
      total + months.reduce((sum, m) => sum + m.planned_amount, 0)
    , 0);
  }, [envelopes, envelopeMonths]);

  const totalContingency = useMemo(() => {
    if (!envelopes) return 0;
    return Object.values(envelopeMonths).reduce((total, months) => 
      total + months.reduce((sum, m) => sum + m.contingency_amount, 0)
    , 0);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Plano {plan.year}</h2>
          <p className="text-sm text-muted-foreground">
            {envelopes?.length ?? 0} envelopes configurados
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && canEdit && (
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setIsCreateEnvelopeOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Envelope
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Planejado</p>
              <p className="text-2xl font-bold">
                <MoneyCell value={totalPlanned} />
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Contingência</p>
              <p className="text-2xl font-bold text-amber-600">
                <MoneyCell value={totalContingency} />
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Geral</p>
              <p className="text-2xl font-bold text-primary">
                <MoneyCell value={totalPlanned + totalContingency} />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Envelopes */}
      {envelopes && envelopes.length > 0 ? (
        <Accordion type="multiple" className="w-full">
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
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Nenhum envelope criado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie envelopes para distribuir seu orçamento por categoria e centro de custo.
            </p>
            {canEdit && (
              <Button onClick={() => setIsCreateEnvelopeOpen(true)}>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">
            Planejamento orçamentário anual e mensal
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => {
              setSelectedYear(Number(v));
              setSelectedPlanId(null);
            }}
          >
            <SelectTrigger className="w-[120px]">
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
            <Button onClick={() => setIsCreateDialogOpen(true)}>
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
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Plans Sidebar */}
          <div className="space-y-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isSelected={plan.id === selectedPlanId}
                onSelect={() => setSelectedPlanId(plan.id)}
              />
            ))}
          </div>
          
          {/* Plan Detail */}
          <div className="lg:col-span-3">
            {selectedPlan ? (
              <PlanDetail plan={selectedPlan} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Selecione um plano para ver detalhes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {plans && plans.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Nenhum plano encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Não há planos orçamentários para {selectedYear}. Crie um novo plano para começar.
            </p>
            {canCreate && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Plano {selectedYear}
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
