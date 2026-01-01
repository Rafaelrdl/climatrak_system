/**
 * DashboardStatCard - Card de estatística padronizado para o Dashboard
 * 
 * Segue o mesmo design visual dos widgets por papel (RoleSpecificWidgets),
 * com suporte a:
 * - Borda lateral colorida (variant)
 * - Ícone no título
 * - Valor principal com sufixo
 * - Indicador de tendência
 * - Barra de progresso opcional
 * - Descrição adicional
 */

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== Types ====================

export interface DashboardStatCardProps {
  /** Título do card */
  title: string;
  /** Ícone que aparece ao lado do título */
  icon?: ReactNode;
  /** Valor principal a ser exibido */
  value: string | number;
  /** Sufixo do valor (ex: %, h, k) */
  suffix?: string;
  /** Variante visual - define a cor da borda lateral */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Direção da tendência */
  trend?: 'up' | 'down';
  /** Texto descritivo da tendência */
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
  /** Estado de carregamento */
  loading?: boolean;
  /** Classe CSS adicional */
  className?: string;
  /** Callback de clique */
  onClick?: () => void;
}

// ==================== Helper Components ====================

function StatValue({ 
  value, 
  suffix, 
  loading,
  className 
}: { 
  value: string | number; 
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

// ==================== Main Component ====================

export function DashboardStatCard({
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
  loading = false,
  className,
  onClick,
}: DashboardStatCardProps) {
  
  // Mapear variante para cor da borda
  const borderColorClass = {
    default: '',
    primary: 'border-l-4 border-l-primary',
    success: 'border-l-4 border-l-emerald-500',
    warning: 'border-l-4 border-l-amber-500',
    danger: 'border-l-4 border-l-red-500',
    info: 'border-l-4 border-l-blue-500',
  }[variant];

  // Mapear variante para cor do valor
  const valueColorClass = {
    default: '',
    primary: 'text-primary',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    info: 'text-blue-600',
  }[variant];

  return (
    <Card 
      className={cn(
        borderColorClass,
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Valor principal e badge */}
          <div className="flex items-center justify-between">
            <StatValue 
              value={value} 
              suffix={suffix} 
              loading={loading}
              className={valueColorClass}
            />
            {badge && !loading && (
              <Badge variant={badge.variant || 'secondary'}>
                {badge.text}
              </Badge>
            )}
          </div>

          {/* Barra de progresso */}
          {progress !== undefined && (
            <MiniProgressBar 
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
        </div>
      </CardContent>
    </Card>
  );
}

export default DashboardStatCard;
