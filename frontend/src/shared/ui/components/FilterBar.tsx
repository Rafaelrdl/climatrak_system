/**
 * FilterBar - container padrao para filtros
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface FilterBarProps {
  title?: string;
  count?: number;
  onClear?: () => void;
  clearLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function FilterBar({
  title,
  count = 0,
  onClear,
  clearLabel = 'Limpar',
  actions,
  children,
  footer,
  className,
}: FilterBarProps) {
  const showHeader = title || actions || onClear || count > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {title && <h4 className="text-sm font-medium">{title}</h4>}
            {count > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {count}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {onClear && count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-8 px-2 text-xs"
              >
                {clearLabel}
              </Button>
            )}
          </div>
        </div>
      )}
      {children}
      {footer}
    </div>
  );
}
