/**
 * MonthPicker Component
 * 
 * Seletor de mês (YYYY-MM) para filtros Finance.
 * Baseado em: docs/frontend/finance/03-componentes-base.md
 */

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MonthPickerProps {
  /** Valor atual (YYYY-MM) */
  value: string;
  /** Callback quando mês muda */
  onChange: (month: string) => void;
  /** Mês mínimo permitido (YYYY-MM) */
  minMonth?: string;
  /** Mês máximo permitido (YYYY-MM) */
  maxMonth?: string;
  /** Desabilitado */
  disabled?: boolean;
  /** Classes CSS adicionais */
  className?: string;
  /** Placeholder */
  placeholder?: string;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseMonth(monthStr: string): { year: number; month: number } {
  const [year, month] = monthStr.split('-').map(Number);
  return { year, month };
}

function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatDisplayMonth(monthStr: string): string {
  const { year, month } = parseMonth(monthStr);
  return `${MONTH_NAMES_FULL[month - 1]} ${year}`;
}

export function MonthPicker({
  value,
  onChange,
  minMonth,
  maxMonth,
  disabled = false,
  className,
  placeholder = 'Selecione o mês',
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  
  const { year: currentYear } = value 
    ? parseMonth(value) 
    : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  
  const [viewYear, setViewYear] = useState(currentYear);

  const minParsed = minMonth ? parseMonth(minMonth) : null;
  const maxParsed = maxMonth ? parseMonth(maxMonth) : null;

  const isMonthDisabled = (year: number, month: number): boolean => {
    if (minParsed) {
      if (year < minParsed.year || (year === minParsed.year && month < minParsed.month)) {
        return true;
      }
    }
    if (maxParsed) {
      if (year > maxParsed.year || (year === maxParsed.year && month > maxParsed.month)) {
        return true;
      }
    }
    return false;
  };

  const handleMonthSelect = (month: number) => {
    onChange(formatMonth(viewYear, month));
    setOpen(false);
  };

  const handlePrevYear = () => setViewYear(y => y - 1);
  const handleNextYear = () => setViewYear(y => y + 1);

  const canGoPrev = !minParsed || viewYear > minParsed.year;
  const canGoNext = !maxParsed || viewYear < maxParsed.year;

  // Quick navigation buttons
  const quickNav = useMemo(() => {
    const today = new Date();
    const thisMonth = formatMonth(today.getFullYear(), today.getMonth() + 1);
    const lastMonth = today.getMonth() === 0
      ? formatMonth(today.getFullYear() - 1, 12)
      : formatMonth(today.getFullYear(), today.getMonth());
    
    return { thisMonth, lastMonth };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-[200px] justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <Calendar className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {value ? formatDisplayMonth(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        {/* Year navigation */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevYear}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{viewYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextYear}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-4 gap-1 p-3">
          {MONTH_NAMES.map((name, idx) => {
            const month = idx + 1;
            const monthValue = formatMonth(viewYear, month);
            const isSelected = value === monthValue;
            const isDisabled = isMonthDisabled(viewYear, month);

            return (
              <Button
                key={month}
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-9',
                  isSelected && 'bg-primary text-primary-foreground',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
                disabled={isDisabled}
                onClick={() => handleMonthSelect(month)}
              >
                {name}
              </Button>
            );
          })}
        </div>

        {/* Quick navigation */}
        <div className="flex gap-2 border-t px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              onChange(quickNav.lastMonth);
              setOpen(false);
            }}
            disabled={minMonth ? quickNav.lastMonth < minMonth : false}
          >
            Mês anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              onChange(quickNav.thisMonth);
              setOpen(false);
            }}
            disabled={maxMonth ? quickNav.thisMonth > maxMonth : false}
          >
            Mês atual
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default MonthPicker;
