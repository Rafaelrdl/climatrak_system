import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface DateRangePickerProps {
  /** Range de datas selecionado */
  dateRange?: DateRange;
  /** Callback quando o range muda */
  onDateRangeChange: (range: DateRange | undefined) => void;
  /** Placeholder para data inicial */
  placeholderFrom?: string;
  /** Placeholder para data final */
  placeholderTo?: string;
  /** Se está desabilitado */
  disabled?: boolean;
  /** Classes CSS adicionais para o container */
  className?: string;
  /** Se deve permitir datas futuras */
  allowFutureDates?: boolean;
  /** Alinhamento do popover */
  align?: "start" | "center" | "end";
}

/**
 * DateRangePicker - Componente de seleção de período
 * 
 * Padrão de design consistente com o filtro de período da tela de Solicitações.
 * Exibe dois botões lado a lado (De/Até) que abrem calendários.
 * 
 * @example
 * ```tsx
 * <DateRangePicker
 *   dateRange={{ from: startDate, to: endDate }}
 *   onDateRangeChange={(range) => setDateRange(range)}
 * />
 * ```
 */
export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholderFrom = "De",
  placeholderTo = "Até",
  disabled = false,
  className,
  allowFutureDates = false,
  align = "start",
}: DateRangePickerProps) {
  const [fromOpen, setFromOpen] = React.useState(false);
  const [toOpen, setToOpen] = React.useState(false);

  const handleFromChange = (date: Date | undefined) => {
    onDateRangeChange({
      from: date,
      to: dateRange?.to,
    });
    setFromOpen(false);
  };

  const handleToChange = (date: Date | undefined) => {
    onDateRangeChange({
      from: dateRange?.from,
      to: date,
    });
    setToOpen(false);
  };

  const disabledFromDate = (date: Date) => {
    if (!allowFutureDates && date > new Date()) return true;
    if (dateRange?.to && date > dateRange.to) return true;
    return false;
  };

  const disabledToDate = (date: Date) => {
    if (!allowFutureDates && date > new Date()) return true;
    if (dateRange?.from && date < dateRange.from) return true;
    return false;
  };

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {/* Data inicial (De) */}
      <Popover open={fromOpen} onOpenChange={setFromOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              "justify-start text-left font-normal h-9",
              !dateRange?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {dateRange?.from 
              ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR }) 
              : placeholderFrom}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            mode="single"
            selected={dateRange?.from}
            onSelect={handleFromChange}
            disabled={disabledFromDate}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      {/* Data final (Até) */}
      <Popover open={toOpen} onOpenChange={setToOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              "justify-start text-left font-normal h-9",
              !dateRange?.to && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {dateRange?.to 
              ? format(dateRange.to, "dd/MM/yyyy", { locale: ptBR }) 
              : placeholderTo}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            mode="single"
            selected={dateRange?.to}
            onSelect={handleToChange}
            disabled={disabledToDate}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * SingleDatePicker - Componente de seleção de data única
 * 
 * Versão simplificada para campos de data única, mantendo o mesmo design.
 * Substitui inputs type="date" nativos por um botão com popover de calendário.
 * 
 * @example
 * ```tsx
 * <SingleDatePicker
 *   date={selectedDate}
 *   onDateChange={(date) => setSelectedDate(date)}
 *   placeholder="Selecione uma data"
 * />
 * ```
 */
interface SingleDatePickerProps {
  /** Data selecionada */
  date?: Date | string;
  /** Callback quando a data muda (retorna string YYYY-MM-DD ou Date) */
  onDateChange: (date: string | undefined) => void;
  /** Placeholder */
  placeholder?: string;
  /** Se está desabilitado */
  disabled?: boolean;
  /** Classes CSS adicionais */
  className?: string;
  /** Se deve permitir datas futuras */
  allowFutureDates?: boolean;
  /** Se deve permitir datas passadas */
  allowPastDates?: boolean;
  /** ID do elemento */
  id?: string;
}

export function SingleDatePicker({
  date,
  onDateChange,
  placeholder = "Selecione uma data",
  disabled = false,
  className,
  allowFutureDates = true,
  allowPastDates = true,
  id,
}: SingleDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Converter string para Date se necessário
  const dateValue = React.useMemo(() => {
    if (!date) return undefined;
    if (date instanceof Date) return date;
    // Parse string YYYY-MM-DD como data local
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [date]);

  const handleChange = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Formatar como YYYY-MM-DD para manter compatibilidade com inputs nativos
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onDateChange(`${year}-${month}-${day}`);
    } else {
      onDateChange(undefined);
    }
    setOpen(false);
  };

  const disabledDate = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!allowFutureDates && d > today) return true;
    if (!allowPastDates && d < today) return true;
    return false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id={id}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue 
            ? format(dateValue, "dd/MM/yyyy", { locale: ptBR }) 
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleChange}
          disabled={disabledDate}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}
