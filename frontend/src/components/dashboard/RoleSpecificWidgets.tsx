/**
 * RoleSpecificWidgets - Widgets específicos por papel de usuário
 * 
 * Cada papel vê widgets diferentes e relevantes para suas responsabilidades:
 * 
 * - admin/owner: Cumprimento do orçamento, custos totais, tendências financeiras
 * - operator: Cumprimento de planos preventivos, alertas de estoque
 * - technician: Minhas OS, tempo médio de atendimento pessoal
 * - requester: Minhas solicitações, status dos pedidos
 * - viewer: Visão geral consolidada (somente leitura)
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  ClipboardList,
  Target,
  Activity,
  PiggyBank,
  BarChart3,
  FileText,
  User,
  Users,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Role } from '@/acl/abilities';

// ==================== Types ====================

interface BudgetComplianceData {
  planned: number;
  actual: number;
  committed: number;
  savings: number;
  variance: number;
  variancePercent: number;
}

interface PlanComplianceData {
  totalPlans: number;
  activePlans: number;
  complianceRate: number;
  executedThisMonth: number;
  pendingThisMonth: number;
  overdueCount: number;
}

interface InventoryAlertData {
  lowStockCount: number;
  outOfStockCount: number;
  criticalItemsCount: number;
  totalItems: number;
  totalValue: number;
}

interface TechnicianStatsData {
  assignedWorkOrders: number;
  completedThisWeek: number;
  completedThisMonth: number;
  avgCompletionTime: number;
  overdueCount: number;
  inProgressCount: number;
}

interface RequesterStatsData {
  myRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  convertedToWO: number;
}

interface ViewerStatsData {
  totalAssets: number;
  activeWorkOrders: number;
  alertsCount: number;
  uptime: number;
}

// ==================== Helper Components ====================

function StatValue({ 
  value, 
  suffix, 
  loading,
  className 
}: { 
  value: number | string; 
  suffix?: string; 
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return <Skeleton className="h-8 w-20" />;
  }
  return (
    <span className={cn("text-2xl font-bold", className)}>
      {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      {suffix && <span className="text-base font-normal text-muted-foreground ml-1">{suffix}</span>}
    </span>
  );
}

function TrendIndicator({ 
  value, 
  inverted = false,
  loading 
}: { 
  value: number; 
  inverted?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-5 w-16" />;
  }
  
  const isPositive = inverted ? value < 0 : value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <div className={cn(
      "flex items-center gap-1 text-sm",
      isPositive ? "text-emerald-600" : "text-red-600"
    )}>
      <Icon className="h-4 w-4" />
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );
}

function MiniProgressBar({ 
  value, 
  max = 100,
  variant = 'default',
  loading
}: { 
  value: number; 
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-2 w-full" />;
  }
  
  const percentage = Math.min((value / max) * 100, 100);
  const colorClass = {
    default: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  }[variant];
  
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div 
        className={cn("h-2 rounded-full transition-all", colorClass)} 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  );
}

// ==================== Admin/Owner Widgets ====================

interface AdminWidgetsProps {
  budgetData?: BudgetComplianceData;
  isLoading?: boolean;
}

export function AdminFinanceWidgets({ budgetData, isLoading }: AdminWidgetsProps) {
  const complianceRate = budgetData 
    ? ((budgetData.actual / (budgetData.planned || 1)) * 100)
    : 0;
  
  const isOverBudget = complianceRate > 100;
  const variant = isOverBudget ? 'danger' : complianceRate > 85 ? 'warning' : 'success';
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Cumprimento do Orçamento */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4" />
            Cumprimento do Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <StatValue 
                value={complianceRate.toFixed(1)} 
                suffix="%" 
                loading={isLoading}
                className={cn(
                  isOverBudget ? 'text-red-600' : complianceRate > 85 ? 'text-amber-600' : 'text-emerald-600'
                )}
              />
              {!isLoading && budgetData && (
                <Badge variant={isOverBudget ? 'destructive' : 'secondary'}>
                  {isOverBudget ? 'Acima' : 'Dentro'}
                </Badge>
              )}
            </div>
            <MiniProgressBar value={complianceRate} variant={variant} loading={isLoading} />
            <p className="text-xs text-muted-foreground">
              Realizado vs Planejado do mês
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Gastos Realizados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4" />
            Gastos Realizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={budgetData ? `R$ ${(budgetData.actual / 1000).toFixed(1)}k` : '-'} 
              loading={isLoading}
            />
            {budgetData && !isLoading && (
              <TrendIndicator value={budgetData.variancePercent} inverted />
            )}
            <p className="text-xs text-muted-foreground">
              vs R$ {budgetData ? (budgetData.planned / 1000).toFixed(1) : '-'}k planejado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Comprometido */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Comprometido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={budgetData ? `R$ ${(budgetData.committed / 1000).toFixed(1)}k` : '-'} 
              loading={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Pedidos aprovados/pendentes
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Economia */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <PiggyBank className="h-4 w-4" />
            Economia Registrada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={budgetData ? `R$ ${(budgetData.savings / 1000).toFixed(1)}k` : '-'} 
              loading={isLoading}
              className="text-emerald-600"
            />
            <p className="text-xs text-muted-foreground">
              Economia comprovada no mês
            </p>
            <Button variant="link" size="sm" className="px-0 h-auto" asChild>
              <Link to="/finance">Ver painel financeiro →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Operator Widgets ====================

interface OperatorWidgetsProps {
  planData?: PlanComplianceData;
  inventoryData?: InventoryAlertData;
  isLoadingPlans?: boolean;
  isLoadingInventory?: boolean;
}

export function OperatorWidgets({ 
  planData, 
  inventoryData, 
  isLoadingPlans, 
  isLoadingInventory 
}: OperatorWidgetsProps) {
  const complianceRate = planData 
    ? (planData.executedThisMonth / (planData.executedThisMonth + planData.pendingThisMonth || 1)) * 100
    : 0;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Cumprimento de Planos Preventivos */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Planos Preventivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <StatValue 
                value={complianceRate.toFixed(0)} 
                suffix="%" 
                loading={isLoadingPlans}
                className={cn(
                  complianceRate >= 90 ? 'text-emerald-600' : 
                  complianceRate >= 70 ? 'text-amber-600' : 'text-red-600'
                )}
              />
              <Badge variant={complianceRate >= 90 ? 'default' : 'secondary'}>
                {planData?.executedThisMonth || 0}/{(planData?.executedThisMonth || 0) + (planData?.pendingThisMonth || 0)}
              </Badge>
            </div>
            <MiniProgressBar 
              value={complianceRate} 
              variant={complianceRate >= 90 ? 'success' : complianceRate >= 70 ? 'warning' : 'danger'} 
              loading={isLoadingPlans}
            />
            <p className="text-xs text-muted-foreground">
              Execuções no mês
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Planos em Atraso */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Planos em Atraso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={planData?.overdueCount || 0} 
              loading={isLoadingPlans}
              className={planData?.overdueCount ? 'text-red-600' : 'text-emerald-600'}
            />
            <p className="text-xs text-muted-foreground">
              {planData?.overdueCount === 0 ? 'Nenhum plano atrasado 🎉' : 'Requer atenção imediata'}
            </p>
            {planData?.overdueCount ? (
              <Button variant="link" size="sm" className="px-0 h-auto text-red-600" asChild>
                <Link to="/cmms/plans">Ver planos atrasados →</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Estoque */}
      <Card className={cn(
        "border-l-4",
        (inventoryData?.lowStockCount || 0) > 0 ? 'border-l-amber-500' : 'border-l-muted'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Alertas de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Estoque Baixo:</span>
                {isLoadingInventory ? (
                  <Skeleton className="h-5 w-8" />
                ) : (
                  <Badge variant={(inventoryData?.lowStockCount || 0) > 0 ? 'outline' : 'secondary'}>
                    {inventoryData?.lowStockCount || 0}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sem Estoque:</span>
                {isLoadingInventory ? (
                  <Skeleton className="h-5 w-8" />
                ) : (
                  <Badge variant={(inventoryData?.outOfStockCount || 0) > 0 ? 'destructive' : 'secondary'}>
                    {inventoryData?.outOfStockCount || 0}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Críticos:</span>
                {isLoadingInventory ? (
                  <Skeleton className="h-5 w-8" />
                ) : (
                  <Badge variant={(inventoryData?.criticalItemsCount || 0) > 0 ? 'destructive' : 'secondary'}>
                    {inventoryData?.criticalItemsCount || 0}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="link" size="sm" className="px-0 h-auto" asChild>
              <Link to="/cmms/inventory">Gerenciar estoque →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Valor em Estoque */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            Valor em Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={inventoryData ? `R$ ${(inventoryData.totalValue / 1000).toFixed(1)}k` : '-'} 
              loading={isLoadingInventory}
            />
            <p className="text-xs text-muted-foreground">
              {inventoryData?.totalItems || 0} itens cadastrados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Operator Plan Widgets (Separado) ====================

interface OperatorPlanWidgetsProps {
  planData?: PlanComplianceData;
  isLoading?: boolean;
}

export function OperatorPlanWidgets({ planData, isLoading }: OperatorPlanWidgetsProps) {
  const complianceRate = planData 
    ? (planData.executedThisMonth / (planData.executedThisMonth + planData.pendingThisMonth || 1)) * 100
    : 0;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Cumprimento de Planos Preventivos */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Planos Preventivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <StatValue 
                value={complianceRate.toFixed(0)} 
                suffix="%" 
                loading={isLoading}
                className={cn(
                  complianceRate >= 90 ? 'text-emerald-600' : 
                  complianceRate >= 70 ? 'text-amber-600' : 'text-red-600'
                )}
              />
              <Badge variant={complianceRate >= 90 ? 'default' : 'secondary'}>
                {planData?.executedThisMonth || 0}/{(planData?.executedThisMonth || 0) + (planData?.pendingThisMonth || 0)}
              </Badge>
            </div>
            <MiniProgressBar 
              value={complianceRate} 
              variant={complianceRate >= 90 ? 'success' : complianceRate >= 70 ? 'warning' : 'danger'} 
              loading={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Execuções no mês
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Planos em Atraso */}
      <Card className={cn(
        "border-l-4",
        (planData?.overdueCount || 0) > 0 ? 'border-l-red-500' : 'border-l-emerald-500'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Planos em Atraso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={planData?.overdueCount || 0} 
              loading={isLoading}
              className={planData?.overdueCount ? 'text-red-600' : 'text-emerald-600'}
            />
            <p className="text-xs text-muted-foreground">
              {planData?.overdueCount === 0 ? 'Nenhum plano atrasado 🎉' : 'Requer atenção imediata'}
            </p>
            {planData?.overdueCount ? (
              <Button variant="link" size="sm" className="px-0 h-auto text-red-600" asChild>
                <Link to="/cmms/plans">Ver planos atrasados →</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Planos Ativos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Planos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={planData?.activePlans || 0} 
              loading={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              De {planData?.totalPlans || 0} planos cadastrados
            </p>
            <Button variant="link" size="sm" className="px-0 h-auto" asChild>
              <Link to="/cmms/plans">Gerenciar planos →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pendentes este Mês */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Pendentes no Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={planData?.pendingThisMonth || 0} 
              loading={isLoading}
              className="text-amber-600"
            />
            <p className="text-xs text-muted-foreground">
              Execuções programadas
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Operator Inventory Widgets (Separado) ====================

interface OperatorInventoryWidgetsProps {
  inventoryData?: InventoryAlertData;
  isLoading?: boolean;
}

export function OperatorInventoryWidgets({ inventoryData, isLoading }: OperatorInventoryWidgetsProps) {
  const hasAlerts = (inventoryData?.lowStockCount || 0) > 0 || 
                    (inventoryData?.outOfStockCount || 0) > 0 || 
                    (inventoryData?.criticalItemsCount || 0) > 0;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Alertas de Estoque */}
      <Card className={cn(
        "border-l-4",
        hasAlerts ? 'border-l-amber-500' : 'border-l-emerald-500'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Alertas de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Estoque Baixo:</span>
                {isLoading ? (
                  <Skeleton className="h-5 w-8" />
                ) : (
                  <Badge variant={(inventoryData?.lowStockCount || 0) > 0 ? 'outline' : 'secondary'}>
                    {inventoryData?.lowStockCount || 0}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sem Estoque:</span>
                {isLoading ? (
                  <Skeleton className="h-5 w-8" />
                ) : (
                  <Badge variant={(inventoryData?.outOfStockCount || 0) > 0 ? 'destructive' : 'secondary'}>
                    {inventoryData?.outOfStockCount || 0}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Críticos:</span>
                {isLoading ? (
                  <Skeleton className="h-5 w-8" />
                ) : (
                  <Badge variant={(inventoryData?.criticalItemsCount || 0) > 0 ? 'destructive' : 'secondary'}>
                    {inventoryData?.criticalItemsCount || 0}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itens em Estoque Baixo */}
      <Card className={cn(
        "border-l-4",
        (inventoryData?.lowStockCount || 0) > 0 ? 'border-l-amber-500' : 'border-l-muted'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Estoque Baixo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={inventoryData?.lowStockCount || 0} 
              loading={isLoading}
              className={(inventoryData?.lowStockCount || 0) > 0 ? 'text-amber-600' : ''}
            />
            <p className="text-xs text-muted-foreground">
              Itens abaixo do mínimo
            </p>
            {(inventoryData?.lowStockCount || 0) > 0 && (
              <Button variant="link" size="sm" className="px-0 h-auto text-amber-600" asChild>
                <Link to="/cmms/inventory?filter=low_stock">Ver itens →</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Valor em Estoque */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            Valor em Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={inventoryData ? `R$ ${(inventoryData.totalValue / 1000).toFixed(1)}k` : '-'} 
              loading={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Valor total imobilizado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total de Itens */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Total de Itens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={inventoryData?.totalItems || 0} 
              loading={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Itens cadastrados
            </p>
            <Button variant="link" size="sm" className="px-0 h-auto" asChild>
              <Link to="/cmms/inventory">Gerenciar estoque →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Technician Widgets ====================

interface TechnicianWidgetsProps {
  statsData?: TechnicianStatsData;
  isLoading?: boolean;
}

export function TechnicianWidgets({ statsData, isLoading }: TechnicianWidgetsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Minhas OS Atribuídas */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ClipboardList className="h-4 w-4" />
            Minhas OS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <StatValue value={statsData?.assignedWorkOrders || 0} loading={isLoading} />
              <Badge variant="outline">Atribuídas</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {statsData?.inProgressCount || 0} em execução
              </span>
            </div>
            <Button variant="link" size="sm" className="px-0 h-auto" asChild>
              <Link to="/cmms/work-orders?assigned_to=me">Ver minhas OS →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Em Atraso */}
      <Card className={cn(
        "border-l-4",
        (statsData?.overdueCount || 0) > 0 ? 'border-l-red-500' : 'border-l-emerald-500'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Em Atraso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={statsData?.overdueCount || 0} 
              loading={isLoading}
              className={statsData?.overdueCount ? 'text-red-600' : 'text-emerald-600'}
            />
            <p className="text-xs text-muted-foreground">
              {statsData?.overdueCount === 0 ? 'Todas no prazo! ✓' : 'Requer atenção urgente'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Concluídas esta Semana */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Concluídas (Semana)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue value={statsData?.completedThisWeek || 0} loading={isLoading} className="text-emerald-600" />
            <p className="text-xs text-muted-foreground">
              {statsData?.completedThisMonth || 0} no mês
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tempo Médio de Execução */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Tempo Médio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={statsData?.avgCompletionTime ? `${statsData.avgCompletionTime.toFixed(1)}h` : '-'} 
              loading={isLoading} 
            />
            <p className="text-xs text-muted-foreground">
              Para conclusão de OS
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Requester Widgets ====================

interface RequesterWidgetsProps {
  statsData?: RequesterStatsData;
  isLoading?: boolean;
}

export function RequesterWidgets({ statsData, isLoading }: RequesterWidgetsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Minhas Solicitações */}
      <Card className="border-l-4 border-l-violet-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Minhas Solicitações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue value={statsData?.myRequests || 0} loading={isLoading} />
            <p className="text-xs text-muted-foreground">
              Total de solicitações abertas
            </p>
            <Button variant="link" size="sm" className="px-0 h-auto" asChild>
              <Link to="/cmms/requests">Ver solicitações →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aguardando */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Aguardando Triagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={statsData?.pendingRequests || 0} 
              loading={isLoading}
              className="text-amber-600"
            />
            <p className="text-xs text-muted-foreground">
              Em análise pela equipe
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Aprovadas */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Convertidas em OS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={statsData?.convertedToWO || 0} 
              loading={isLoading}
              className="text-emerald-600"
            />
            <p className="text-xs text-muted-foreground">
              Solicitações atendidas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status Geral */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            Taxa de Aprovação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <StatValue 
                  value={statsData?.myRequests 
                    ? (((statsData.convertedToWO || 0) / statsData.myRequests) * 100).toFixed(0) 
                    : 0} 
                  suffix="%" 
                />
                <MiniProgressBar 
                  value={statsData?.myRequests 
                    ? ((statsData.convertedToWO || 0) / statsData.myRequests) * 100 
                    : 0} 
                  variant="success"
                />
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Solicitações aprovadas
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Viewer Widgets ====================

interface ViewerWidgetsProps {
  statsData?: ViewerStatsData;
  isLoading?: boolean;
}

export function ViewerWidgets({ statsData, isLoading }: ViewerWidgetsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total de Ativos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Ativos Monitorados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue value={statsData?.totalAssets || 0} loading={isLoading} />
            <p className="text-xs text-muted-foreground">
              Equipamentos cadastrados
            </p>
          </div>
        </CardContent>
      </Card>

      {/* OS Ativas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ClipboardList className="h-4 w-4" />
            OS Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue value={statsData?.activeWorkOrders || 0} loading={isLoading} />
            <p className="text-xs text-muted-foreground">
              Abertas ou em execução
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card className={cn(
        "border-l-4",
        (statsData?.alertsCount || 0) > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Alertas Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={statsData?.alertsCount || 0} 
              loading={isLoading}
              className={statsData?.alertsCount ? 'text-amber-600' : 'text-emerald-600'}
            />
            <p className="text-xs text-muted-foreground">
              {statsData?.alertsCount === 0 ? 'Sistema operando normalmente' : 'Requerem atenção'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Uptime */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            Disponibilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatValue 
              value={statsData?.uptime ? `${statsData.uptime.toFixed(1)}%` : '-'} 
              loading={isLoading}
              className="text-emerald-600"
            />
            <MiniProgressBar value={statsData?.uptime || 0} variant="success" loading={isLoading} />
            <p className="text-xs text-muted-foreground">
              Uptime geral do sistema
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Export ====================

export type {
  BudgetComplianceData,
  PlanComplianceData,
  InventoryAlertData,
  TechnicianStatsData,
  RequesterStatsData,
  ViewerStatsData,
};
