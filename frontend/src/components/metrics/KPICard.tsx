/**
 * Componente KPI Card
 * 
 * Card para exibição de indicadores-chave de performance (KPIs).
 */

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  LucideIcon,
} from 'lucide-react';
import type { KPIMetric } from '@/types/metrics';

// ============================================
// Types
// ============================================

interface KPICardProps {
  metric: KPIMetric;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

interface KPICardSkeletonProps {
  className?: string;
}

// ============================================
// Helpers
// ============================================

function getTrendIcon(trend: number) {
  if (trend > 0) return TrendingUp;
  if (trend < 0) return TrendingDown;
  return Minus;
}

function getTrendColor(trend: number, status: 'good' | 'warning' | 'critical' | 'neutral') {
  if (status === 'good') return 'text-green-600';
  if (status === 'warning') return 'text-yellow-600';
  if (status === 'critical') return 'text-red-600';
  return 'text-gray-500';
}

function formatValue(value: number, unit: string): string {
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  if (unit === 'h') {
    return `${value.toFixed(1)}h`;
  }
  if (unit === 'R$') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(unit === 'dias' || unit === 'horas' ? 1 : 0);
}

// ============================================
// KPI Card Component
// ============================================

export function KPICard({ metric, icon: Icon, onClick, className }: KPICardProps) {
  const TrendIcon = getTrendIcon(metric.trend);
  const trendColor = getTrendColor(metric.trend, metric.status);
  
  // Determinar se a mudança é positiva baseado no status
  const isPositiveChange = metric.status === 'good';
  
  const ChangeIcon = metric.trend > 0 ? ArrowUpRight : metric.trend < 0 ? ArrowDownRight : Minus;
  
  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        onClick && 'cursor-pointer hover:border-teal-500',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Título */}
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {metric.label}
            </p>
            
            {/* Valor Principal */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatValue(metric.value, metric.unit)}
              </span>
              {metric.unit && metric.unit !== '%' && metric.unit !== 'R$' && (
                <span className="text-sm text-muted-foreground">{metric.unit}</span>
              )}
            </div>
            
            {/* Target e Mudança */}
            <div className="flex items-center gap-3 mt-2">
              {/* Variação */}
              {metric.trend !== 0 && (
                <div className={cn('flex items-center gap-0.5 text-xs font-medium', trendColor)}>
                  <ChangeIcon className="h-3 w-3" />
                  <span>{Math.abs(metric.trend).toFixed(1)}%</span>
                </div>
              )}
              
              {/* Meta */}
              {metric.target !== undefined && (
                <div className="text-xs text-muted-foreground">
                  Meta: {formatValue(metric.target, metric.unit)}
                </div>
              )}
            </div>
            
            {/* Valor Anterior */}
            {metric.previous_value !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                Anterior: {formatValue(metric.previous_value, metric.unit)}
              </p>
            )}
          </div>
          
          {/* Ícone */}
          <div className="flex flex-col items-end gap-2">
            {Icon && (
              <div className="p-2 bg-teal-50 rounded-lg">
                <Icon className="h-5 w-5 text-teal-600" />
              </div>
            )}
            <TrendIcon className={cn('h-4 w-4', trendColor)} />
          </div>
        </div>
        
        {/* Barra de Progresso (se houver target) */}
        {metric.target !== undefined && metric.target > 0 && (
          <div className="mt-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isPositiveChange ? 'bg-teal-500' : 'bg-red-500'
                )}
                style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// KPI Card Skeleton
// ============================================

export function KPICardSkeleton({ className }: KPICardSkeletonProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-20 mb-2" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
        <Skeleton className="h-1.5 w-full mt-3" />
      </CardContent>
    </Card>
  );
}

// ============================================
// KPI Grid
// ============================================

interface KPIGridProps {
  metrics: KPIMetric[];
  icons?: Record<string, LucideIcon>;
  isLoading?: boolean;
  className?: string;
}

export function KPIGrid({ metrics, icons, isLoading, className }: KPIGridProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {[1, 2, 3, 4].map(i => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {metrics.map((metric, index) => (
        <KPICard
          key={metric.name || index}
          metric={metric}
          icon={icons?.[metric.name]}
        />
      ))}
    </div>
  );
}
