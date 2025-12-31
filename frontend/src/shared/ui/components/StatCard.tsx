/**
 * StatCard - KPI/estatistica padronizado
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title?: string;
  value?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: ReactNode;
  trendColor?: 'positive' | 'negative' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  loading?: boolean;
  action?: ReactNode;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  trendColor,
  variant = 'default',
  children,
  className,
  onClick,
  loading = false,
  action,
}: StatCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;

  const effectiveTrendColor = trendColor || (
    trend === 'up' ? 'positive' :
    trend === 'down' ? 'negative' :
    'neutral'
  );

  const trendColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-muted-foreground',
  };

  const variantClasses = {
    default: '',
    success: 'bg-[color:var(--status-success-bg)] border-[color:var(--status-success-border)]',
    warning: 'bg-[color:var(--status-warning-bg)] border-[color:var(--status-warning-border)]',
    danger: 'bg-[color:var(--status-danger-bg)] border-[color:var(--status-danger-border)]',
  };

  if (children) {
    return (
      <Card
        className={cn(
          'transition-all duration-200',
          onClick && 'cursor-pointer hover:shadow-md hover:border-primary/20',
          variantClasses[variant],
          className
        )}
        onClick={onClick}
      >
        {children}
      </Card>
    );
  }

  const displayValue = typeof value === 'number'
    ? value.toLocaleString('pt-BR')
    : (value ?? '-');

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/20',
        variantClasses[variant],
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-muted-foreground/70">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold text-foreground">
              {displayValue}
            </div>

            {(description || trendValue) && (
              <div className="flex items-center gap-1.5 mt-1">
                {trend && trendValue && (
                  <span className={cn(
                    'flex items-center text-xs font-medium',
                    trendColors[effectiveTrendColor]
                  )}>
                    <TrendIcon className="h-3 w-3 mr-0.5" />
                    {trendValue}
                  </span>
                )}
                {description && (
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                )}
              </div>
            )}

            {action && (
              <div className="mt-2">
                {action}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
