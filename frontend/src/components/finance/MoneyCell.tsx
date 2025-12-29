/**
 * MoneyCell Component
 * 
 * Formatação monetária padronizada para tabelas e cards.
 * Baseado em: docs/frontend/finance/03-componentes-base.md
 */

import { cn } from '@/lib/utils';
import type { Currency } from '@/types/finance';

interface MoneyCellProps {
  /** Valor monetário */
  value: number;
  /** Moeda (padrão: BRL) */
  currency?: Currency;
  /** Exibir sinal (+/-) */
  showSign?: boolean;
  /** Colorir baseado no valor (verde positivo, vermelho negativo) */
  colorize?: boolean;
  /** Classes CSS adicionais */
  className?: string;
  /** Tamanho da fonte */
  size?: 'sm' | 'md' | 'lg';
}

const currencyConfig: Record<Currency, { locale: string; currency: string }> = {
  BRL: { locale: 'pt-BR', currency: 'BRL' },
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
};

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base font-medium',
};

export function MoneyCell({
  value,
  currency = 'BRL',
  showSign = false,
  colorize = false,
  className,
  size = 'md',
}: MoneyCellProps) {
  const config = currencyConfig[currency];
  
  const formatted = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    signDisplay: showSign ? 'exceptZero' : 'auto',
  }).format(value);

  const colorClass = colorize
    ? value > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : value < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground'
    : '';

  return (
    <span
      className={cn(
        'tabular-nums font-mono',
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {formatted}
    </span>
  );
}

export default MoneyCell;
