/**
 * StatCard - Card de estatística/KPI
 * 
 * Exibe métricas e indicadores com visual consistente.
 * 
 * @example
 * ```tsx
 * <StatCard
 *   title="Ordens Abertas"
 *   value={42}
 *   description="+12% em relação ao mês anterior"
 *   icon={<ClipboardList />}
 *   trend="up"
 * />
 * ```
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export interface StatCardProps {
  /** Título do card */
  title: string;
  /** Valor principal (número ou texto) */
  value: string | number;
  /** Descrição ou contexto adicional */
  description?: string;
  /** Ícone representativo */
  icon?: ReactNode;
  /** Tendência (seta para cima, baixo ou neutro) */
  trend?: 'up' | 'down' | 'neutral';
  /** Porcentagem de mudança */
  trendValue?: string;
  /** Cor do trend (verde para positivo, vermelho para negativo) */
  trendColor?: 'positive' | 'negative' | 'neutral';
  /** Classes CSS adicionais */
  className?: string;
  /** Ação ao clicar */
  onClick?: () => void;
  /** Carregando */
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  trendColor,
  className,
  onClick,
  loading = false
}: StatCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  
  // Determinar cor do trend automaticamente se não especificado
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

  return (
    <Card 
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/20",
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
              {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
            </div>
            
            {(description || trendValue) && (
              <div className="flex items-center gap-1.5 mt-1">
                {trend && trendValue && (
                  <span className={cn(
                    "flex items-center text-xs font-medium",
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
