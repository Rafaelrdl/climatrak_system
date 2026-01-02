/**
 * DeltaBadge Component
 * 
 * Badge para exibir variação (positiva/negativa/neutra).
 * Baseado em: docs/frontend/finance/03-componentes-base.md
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DeltaBadgeProps {
  /** Valor da variação (pode ser porcentagem ou absoluto) */
  value: number;
  /** Tipo de exibição */
  type?: 'percent' | 'absolute' | 'currency';
  /** Moeda (para type='currency') */
  currency?: 'BRL' | 'USD' | 'EUR';
  /** Inverter cores (ex: quando queda é positivo) */
  inverted?: boolean;
  /** Tamanho */
  size?: 'sm' | 'md';
  /** Exibir ícone */
  showIcon?: boolean;
  /** Classes CSS adicionais */
  className?: string;
}

const formatValue = (
  value: number,
  type: DeltaBadgeProps['type'],
  currency: DeltaBadgeProps['currency']
): string => {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';

  switch (type) {
    case 'percent':
      return `${sign}${absValue.toFixed(1)}%`;
    case 'currency': {
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency || 'BRL',
        maximumFractionDigits: 0,
      }).format(absValue);
      return `${sign}${formatted}`;
    }
    case 'absolute':
    default:
      return `${sign}${absValue.toLocaleString('pt-BR')}`;
  }
};

export function DeltaBadge({
  value,
  type = 'percent',
  currency = 'BRL',
  inverted = false,
  size = 'md',
  showIcon = true,
  className,
}: DeltaBadgeProps) {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNegative = inverted ? value > 0 : value < 0;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const variantClasses = isPositive
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    : isNegative
      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5';

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-mono font-medium gap-1',
        variantClasses,
        sizeClasses,
        className
      )}
    >
      {showIcon && <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      <span>{formatValue(value, type, currency)}</span>
    </Badge>
  );
}

export default DeltaBadge;
