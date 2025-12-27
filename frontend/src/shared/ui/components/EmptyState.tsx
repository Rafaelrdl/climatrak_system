/**
 * EmptyState - Estado vazio para listas e tabelas
 * 
 * Exibe mensagem quando não há dados disponíveis.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<FileText />}
 *   title="Nenhum relatório encontrado"
 *   description="Crie seu primeiro relatório para começar"
 *   action={<Button>Criar Relatório</Button>}
 * />
 * ```
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FileQuestion } from 'lucide-react';

export interface EmptyStateProps {
  /** Ícone central */
  icon?: ReactNode;
  /** Título principal */
  title: string;
  /** Descrição secundária */
  description?: string;
  /** Ação (botão, link, etc) */
  action?: ReactNode;
  /** Classes CSS adicionais */
  className?: string;
  /** Tamanho do componente */
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-8 w-8',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizes.container,
      className
    )}>
      <div className={cn(
        "text-muted-foreground/50 mb-4",
        sizes.icon
      )}>
        {icon || <FileQuestion className="h-full w-full" />}
      </div>
      
      <h3 className={cn(
        "font-semibold text-foreground mb-1",
        sizes.title
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          "text-muted-foreground max-w-sm mb-4",
          sizes.description
        )}>
          {description}
        </p>
      )}
      
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
