/**
 * KpiCard - Componente unificado de KPI/estatística
 * 
 * Segue o padrão visual do CMMS (DashboardStatCard) com suporte a:
 * - Borda lateral colorida (variant)
 * - Ícone no título
 * - Valor principal com sufixo
 * - Indicador de tendência
 * - Barra de progresso opcional
 * - Descrição adicional
 * - Action slot (botão/link)
 * - Badge opcional
 * - Estado de loading com skeleton
 * 
 * Grid padrão recomendado: grid gap-4 md:grid-cols-2 lg:grid-cols-4 (ou lg:grid-cols-5)
 */

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== Types ====================

export interface KpiCardProps {
  /** Título do card */
  title: string;
  /** Ícone que aparece ao lado do título (lucide-react) */
  icon?: ReactNode;
  /** Valor principal a ser exibido (pode ser string, número ou ReactNode) */
  value: ReactNode;
  /** Sufixo do valor (ex: %, h, k) - usado quando value é string/number */
  suffix?: string;
  /** Variante visual - define a cor da borda lateral */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Direção da tendência */
  trend?: 'up' | 'down';
  /** Texto descritivo da tendência (ex: "+5.2%") */
  trendValue?: string;
  /** Se a tendência é invertida (down é bom, up é ruim) */
  trendInverted?: boolean;
  /** Valor para a barra de progresso (0-100) */
  progress?: number;
  /** Variante da barra de progresso */
  progressVariant?: 'default' | 'success' | 'warning' | 'danger';
  /** Descrição adicional abaixo do valor */
  description?: string;
  /** Badge opcional ao lado do valor */
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  /** Slot para ação (botão, link) */
  action?: ReactNode;
  /** Estado de carregamento */
  loading?: boolean;
  /** Classe CSS adicional */
  className?: string;
  /** Callback de clique */
  onClick?: () => void;
}

// ==================== Helper: Safe Value ====================

function safeValue(val: unknown): ReactNode {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number' && !Number.isFinite(val)) return '-';
  if (typeof val === 'number') return val.toLocaleString('pt-BR');
  return val as ReactNode;
}

// ==================== Helper: Value Display ====================

function ValueDisplay({ 
  value, 
  suffix, 
  loading,
  className 
}: { 
  value: ReactNode; 
  suffix?: string; 
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return <Skeleton className="h-8 w-24" />;
  }

  const displayValue = typeof value === 'string' || typeof value === 'number'
    ? safeValue(value)
    : value;

  return (
    <div className={cn("text-2xl font-bold", className)}>
      {displayValue}
      {suffix && <span className="text-base font-normal text-muted-foreground ml-1">{suffix}</span>}
    </div>
  );
}

// ==================== Helper: Trend Indicator ====================

function TrendIndicator({ 
  direction,
  value, 
  inverted = false,
  loading 
}: { 
  direction: 'up' | 'down';
  value?: string; 
  inverted?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-5 w-16" />;
  }
  
  const isPositive = inverted ? direction === 'down' : direction === 'up';
  const Icon = direction === 'up' ? TrendingUp : TrendingDown;
  
  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-medium",
      isPositive ? "text-emerald-600" : "text-red-600"
    )}>
      <Icon className="h-3 w-3" />
      {value && <span>{value}</span>}
    </div>
  );
}

// ==================== Helper: Progress Bar ====================

function ProgressBar({ 
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
  
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const colorClass = {
    default: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  }[variant];
  
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div 
        className={cn("h-2 rounded-full transition-all duration-300", colorClass)} 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  );
}

// ==================== Variant Classes ====================

const borderVariants = {
  default: '',
  primary: 'border-l-4 border-l-primary',
  success: 'border-l-4 border-l-emerald-500',
  warning: 'border-l-4 border-l-amber-500',
  danger: 'border-l-4 border-l-red-500',
  info: 'border-l-4 border-l-blue-500',
};

const valueColorVariants = {
  default: '',
  primary: 'text-primary',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  info: 'text-blue-600',
};

// ==================== Main Component ====================

export function KpiCard({
  title,
  icon,
  value,
  suffix,
  variant = 'default',
  trend,
  trendValue,
  trendInverted = false,
  progress,
  progressVariant = 'default',
  description,
  badge,
  action,
  loading = false,
  className,
  onClick,
}: KpiCardProps) {
  return (
    <Card 
      className={cn(
        borderVariants[variant],
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon && <span className="text-muted-foreground/70">{icon}</span>}
          {title}
        </CardTitle>
        {icon && !badge && (
          <div className="text-muted-foreground/70 md:hidden">
            {/* Ícone duplicado para mobile - escondido em desktop */}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Valor principal e badge */}
          <div className="flex items-center justify-between">
            <ValueDisplay 
              value={value} 
              suffix={suffix} 
              loading={loading}
              className={valueColorVariants[variant]}
            />
            {badge && !loading && (
              <Badge variant={badge.variant || 'secondary'}>
                {badge.text}
              </Badge>
            )}
          </div>

          {/* Barra de progresso */}
          {progress !== undefined && (
            <ProgressBar 
              value={progress} 
              variant={progressVariant} 
              loading={loading}
            />
          )}

          {/* Tendência */}
          {trend && (
            <TrendIndicator 
              direction={trend}
              value={trendValue} 
              inverted={trendInverted}
              loading={loading}
            />
          )}

          {/* Descrição */}
          {description && !loading && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}

          {/* Action */}
          {action && !loading && (
            <div className="pt-1">
              {action}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Skeleton Variant ====================

export function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Grid Wrapper ====================

interface KpiGridProps {
  children: ReactNode;
  /** Número de colunas em lg breakpoint (default: 4) */
  columns?: 3 | 4 | 5;
  className?: string;
}

export function KpiGrid({ children, columns = 4, className }: KpiGridProps) {
  const colsClass = {
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
  }[columns];

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", colsClass, className)}>
      {children}
    </div>
  );
}

export default KpiCard;
