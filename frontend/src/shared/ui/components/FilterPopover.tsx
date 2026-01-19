/**
 * FilterPopover - Componente padronizado de filtros em popover
 * 
 * Este componente encapsula o padrão de filtros usado em toda a plataforma,
 * baseado no design da página de Ativos (/cmms/ativos).
 * 
 * Características:
 * - Botão com ícone de filtro + texto "Filtros" + badge de contagem
 * - Popover com conteúdo scrollável
 * - Usa FilterBar internamente para header consistente
 * - Suporte a diferentes alinhamentos
 * 
 * @example
 * ```tsx
 * <FilterPopover
 *   activeCount={3}
 *   onClear={handleClear}
 * >
 *   <div className="space-y-4">
 *     <FilterItem label="Status">
 *       <Select value={status} onValueChange={setStatus}>
 *         ...
 *       </Select>
 *     </FilterItem>
 *   </div>
 * </FilterPopover>
 * ```
 */

import { ReactNode, useState } from 'react';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FilterBar } from './FilterBar';

export interface FilterPopoverProps {
  /** Número de filtros ativos (exibido no badge) */
  activeCount?: number;
  /** Callback para limpar todos os filtros */
  onClear?: () => void;
  /** Conteúdo do popover (campos de filtro) */
  children: ReactNode;
  /** Título do popover (default: "Filtros") */
  title?: string;
  /** Texto do botão (default: "Filtros") */
  buttonLabel?: string;
  /** Se deve esconder o texto do botão em mobile */
  hideButtonLabelOnMobile?: boolean;
  /** Alinhamento do popover */
  align?: 'start' | 'center' | 'end';
  /** Largura do popover (default: 320px) */
  width?: 'sm' | 'md' | 'lg' | number;
  /** Classes adicionais para o botão */
  buttonClassName?: string;
  /** Classes adicionais para o conteúdo */
  contentClassName?: string;
  /** Controle externo de abertura */
  open?: boolean;
  /** Callback para mudança de abertura */
  onOpenChange?: (open: boolean) => void;
  /** Altura máxima do conteúdo scrollável */
  maxHeight?: string;
  /** Desabilitar o botão */
  disabled?: boolean;
}

const widthMap = {
  sm: 'w-64',
  md: 'w-80',
  lg: 'w-96',
};

export function FilterPopover({
  activeCount = 0,
  onClear,
  children,
  title = 'Filtros',
  buttonLabel = 'Filtros',
  hideButtonLabelOnMobile = true,
  align = 'end',
  width = 'md',
  buttonClassName,
  contentClassName,
  open: controlledOpen,
  onOpenChange,
  maxHeight = '60vh',
  disabled = false,
}: FilterPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const widthClass = typeof width === 'number' ? undefined : widthMap[width];
  const widthStyle = typeof width === 'number' ? { width: `${width}px` } : undefined;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-1.5 shadow-sm shrink-0',
            buttonClassName
          )}
          disabled={disabled}
        >
          <Filter className="h-3.5 w-3.5" />
          <span className={cn(hideButtonLabelOnMobile && 'hidden sm:inline')}>
            {buttonLabel}
          </span>
          {activeCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(widthClass, contentClassName)} 
        align={align}
        style={widthStyle}
      >
        <FilterBar
          title={title}
          count={activeCount}
          onClear={onClear}
        >
          <div 
            className="space-y-4 overflow-y-auto pr-1"
            style={{ maxHeight }}
          >
            {children}
          </div>
        </FilterBar>
      </PopoverContent>
    </Popover>
  );
}

/**
 * FilterItem - Wrapper para cada campo de filtro individual
 * 
 * @example
 * ```tsx
 * <FilterItem label="Status">
 *   <Select value={status} onValueChange={setStatus}>
 *     ...
 *   </Select>
 * </FilterItem>
 * ```
 */
export interface FilterItemProps {
  /** Label do campo de filtro */
  label: string;
  /** Campo de filtro (Select, Input, etc.) */
  children: ReactNode;
  /** Classes adicionais */
  className?: string;
  /** Se o campo é obrigatório (mostra asterisco) */
  required?: boolean;
  /** Texto de ajuda abaixo do campo */
  helperText?: string;
}

export function FilterItem({
  label,
  children,
  className,
  required = false,
  helperText,
}: FilterItemProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

/**
 * FilterRangeItem - Wrapper para filtros de range (mín/máx)
 * 
 * @example
 * ```tsx
 * <FilterRangeItem label="Capacidade (TR)">
 *   <Input type="number" placeholder="Mín" value={min} onChange={...} />
 *   <Input type="number" placeholder="Máx" value={max} onChange={...} />
 * </FilterRangeItem>
 * ```
 */
export interface FilterRangeItemProps {
  /** Label do campo de filtro */
  label: string;
  /** Primeiro input (mínimo) */
  minInput: ReactNode;
  /** Segundo input (máximo) */
  maxInput: ReactNode;
  /** Texto separador (default: "até") */
  separator?: string;
  /** Classes adicionais */
  className?: string;
}

export function FilterRangeItem({
  label,
  minInput,
  maxInput,
  separator = 'até',
  className,
}: FilterRangeItemProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        {minInput}
        <span className="text-muted-foreground text-sm shrink-0">{separator}</span>
        {maxInput}
      </div>
    </div>
  );
}

export default FilterPopover;
