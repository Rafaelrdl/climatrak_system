/**
 * Finance Dashboard (Painel do mês)
 * 
 * Tela principal do módulo Finance com KPIs e breakdown por categoria.
 * Baseado em: docs/frontend/finance/05-telas-fluxos.md
 * 
 * Componentes:
 * - SummaryCards (planned/committed/actual/savings)
 * - Breakdown por categoria (tabela com progress bars)
 * - Top desvios (ativos/categorias)
 * - Quick actions (Criar comprometido, Lançar custo, Registrar economia)
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowRight,
  AlertCircle,
  Loader2,
  Plus,
  FileText,
  CheckSquare,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MoneyCell, DeltaBadge, MonthPicker } from '@/components/finance';
import { useFinanceSummary, useCostCenters } from '@/hooks/finance';
import { useAbility } from '@/hooks/useAbility';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CategorySummary } from '@/types/finance';

// ==================== Helpers ====================

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    preventive: 'Preventiva',
    corrective: 'Corretiva',
    predictive: 'Preditiva',
    other: 'Outros',
  };
  return labels[category] || category;
}

// ==================== KPI Card ====================

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
  trend?: number;
  link?: string;
  linkLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function KPICard({
  title,
  value,
  icon,
  description,
  trend,
  link,
  linkLabel = 'Ver detalhes',
  variant = 'default',
}: KPICardProps) {
  const variantClasses = {
    default: 'border-l-primary',
    success: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500',
  };

  return (
    <Card className={cn('border-l-4', variantClasses[variant])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <MoneyCell value={value} size="lg" className="text-2xl font-bold" />
          {trend !== undefined && (
            <DeltaBadge value={trend} type="percent" size="sm" />
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {link && (
          <Button variant="link" size="sm" className="px-0 mt-2" asChild>
            <Link to={link}>
              {linkLabel}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== Category Breakdown ====================

interface CategoryBreakdownProps {
  data: CategorySummary[];
  isLoading?: boolean;
}

function CategoryBreakdown({ data, isLoading }: CategoryBreakdownProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado para o período selecionado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((cat) => {
        const variance = cat.planned - cat.actual;
        const variancePercent = cat.planned > 0 
          ? ((variance / cat.planned) * 100) 
          : 0;
        const usagePercent = cat.planned > 0 
          ? Math.min((cat.actual / cat.planned) * 100, 100) 
          : 0;

        return (
          <Link 
            key={cat.category} 
            to={`/finance/ledger?category=${cat.category}`}
            className="block group"
          >
            <div className="space-y-2 p-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {getCategoryLabel(cat.category)}
                  </span>
                  {cat.savings > 0 && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      <MoneyCell value={cat.savings} size="sm" /> economia
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    <MoneyCell value={cat.actual} size="sm" /> / <MoneyCell value={cat.planned} size="sm" />
                  </span>
                  <DeltaBadge 
                    value={variancePercent} 
                    type="percent" 
                    size="sm"
                    inverted // Positivo = gastou menos que planejado
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    usagePercent > 100 ? 'bg-red-500' :
                    usagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              {/* Committed indicator */}
              {cat.committed > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                  <MoneyCell value={cat.committed} size="sm" /> comprometido
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ==================== Top Deviations ====================

interface TopDeviationsProps {
  data: CategorySummary[];
  isLoading?: boolean;
}

function TopDeviations({ data, isLoading }: TopDeviationsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  // Sort categories by absolute variance (negative = over budget)
  const sortedByDeviation = useMemo(() => {
    if (!data) return [];
    return [...data]
      .map(cat => ({
        ...cat,
        deviation: cat.actual - cat.planned,
        deviationPercent: cat.planned > 0 
          ? ((cat.actual - cat.planned) / cat.planned) * 100 
          : 0
      }))
      .filter(cat => cat.deviation !== 0)
      .sort((a, b) => b.deviation - a.deviation) // Most over budget first
      .slice(0, 5);
  }, [data]);

  if (sortedByDeviation.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Nenhum desvio significativo
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedByDeviation.map((cat) => {
        const isOverBudget = cat.deviation > 0;
        
        return (
          <Link
            key={cat.category}
            to={`/finance/ledger?category=${cat.category}`}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-2">
              {isOverBudget ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-emerald-500" />
              )}
              <span className="text-sm">{getCategoryLabel(cat.category)}</span>
            </div>
            <div className="flex items-center gap-2">
              <DeltaBadge 
                value={cat.deviationPercent} 
                type="percent" 
                size="sm"
                inverted
              />
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ==================== Main Component ====================

export function FinanceDashboard() {
  const navigate = useNavigate();
  const ability = useAbility();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('__all__');

  // Permission checks
  const canCreateCommitment = ability.can('create', 'finance_commitment');
  const canCreateTransaction = ability.can('create', 'finance_ledger');
  const canCreateSavings = ability.can('create', 'finance_savings');
  const hasAnyCreatePermission = canCreateCommitment || canCreateTransaction || canCreateSavings;

  const { data: summary, isLoading, error } = useFinanceSummary(
    selectedMonth,
    selectedCostCenter === '__all__' ? undefined : selectedCostCenter
  );
  const { data: costCenters } = useCostCenters();

  // Calculate trends (mock - in real app would compare to previous month)
  const trends = useMemo(() => {
    if (!summary) return { planned: 0, committed: 0, actual: 0, savings: 0 };
    // TODO: Implement real trend calculation comparing to previous month
    return { planned: 0, committed: 0, actual: 0, savings: 0 };
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Financeiro</h1>
          <p className="text-muted-foreground">
            Visão geral dos custos e economia do período
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-3">
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            maxMonth={getCurrentMonth()}
          />
          
          {costCenters && costCenters.length > 0 && (
            <Select
              value={selectedCostCenter}
              onValueChange={setSelectedCostCenter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os centros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os centros</SelectItem>
                {costCenters.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Quick Actions Dropdown */}
          {hasAnyCreatePermission && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {canCreateCommitment && (
                  <DropdownMenuItem onClick={() => navigate('/finance/commitments/new')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Criar comprometido
                  </DropdownMenuItem>
                )}
                {canCreateTransaction && (
                  <DropdownMenuItem onClick={() => navigate('/finance/ledger/new')}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Lançar custo manual
                  </DropdownMenuItem>
                )}
                {(canCreateCommitment || canCreateTransaction) && canCreateSavings && (
                  <DropdownMenuSeparator />
                )}
                {canCreateSavings && (
                  <DropdownMenuItem onClick={() => navigate('/finance/savings/new')}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Registrar economia
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar dados financeiros. Tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Planejado"
          value={summary?.planned ?? 0}
          icon={<DollarSign className="h-5 w-5" />}
          description="Orçamento previsto para o mês"
          trend={trends.planned}
          link="/finance/budgets"
          linkLabel="Ver orçamentos"
          variant="default"
        />
        
        <KPICard
          title="Comprometido"
          value={summary?.committed ?? 0}
          icon={<TrendingUp className="h-5 w-5" />}
          description="Pedidos aprovados/pendentes"
          trend={trends.committed}
          link="/finance/commitments"
          linkLabel="Ver compromissos"
          variant="warning"
        />
        
        <KPICard
          title="Realizado"
          value={summary?.actual ?? 0}
          icon={<TrendingDown className="h-5 w-5" />}
          description="Custos efetivamente lançados"
          trend={trends.actual}
          link="/finance/ledger"
          linkLabel="Ver ledger"
          variant={(summary?.actual ?? 0) > (summary?.planned ?? 0) ? 'danger' : 'success'}
        />
        
        <KPICard
          title="Economia"
          value={summary?.savings ?? 0}
          icon={<PiggyBank className="h-5 w-5" />}
          description="Economia gerada no período"
          trend={trends.savings}
          link="/finance/savings"
          linkLabel="Ver economia"
          variant="success"
        />
      </div>

      {/* Variance indicator */}
      {summary && summary.variance !== 0 && (
        <Card className={cn(
          'border-l-4',
          summary.variance > 0 ? 'border-l-emerald-500 bg-emerald-50/50' : 'border-l-red-500 bg-red-50/50'
        )}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {summary.variance > 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className="font-medium">
                  {summary.variance > 0 ? 'Sob orçamento' : 'Acima do orçamento'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Variância: <MoneyCell value={summary.variance} showSign colorize />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown + Top Deviations */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Category Breakdown - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Breakdown por Categoria</CardTitle>
            <CardDescription>
              Comparativo planejado vs realizado por tipo de manutenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown 
              data={summary?.by_category ?? []} 
              isLoading={isLoading} 
            />
          </CardContent>
        </Card>

        {/* Top Deviations - Takes 1 column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Top Desvios
            </CardTitle>
            <CardDescription>
              Categorias com maior variação no período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopDeviations 
              data={summary?.by_category ?? []} 
              isLoading={isLoading} 
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:bg-muted/50 transition-colors">
          <Link to="/finance/ledger">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Lançamentos Recentes</p>
                <p className="text-sm text-muted-foreground">
                  Ver últimas transações no ledger
                </p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors">
          <Link to="/finance/commitments?status=submitted">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CheckSquare className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Pendentes de Aprovação</p>
                <p className="text-sm text-muted-foreground">
                  Compromissos aguardando aprovação
                </p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors">
          <Link to="/cmms/work-orders">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Custos por OS</p>
                <p className="text-sm text-muted-foreground">
                  Ver custos nas ordens de serviço
                </p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default FinanceDashboard;
