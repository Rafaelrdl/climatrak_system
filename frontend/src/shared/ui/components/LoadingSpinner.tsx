/**
 * LoadingSpinner - Indicador de carregamento
 * 
 * Spinner animado para estados de loading.
 * 
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" />
 * <LoadingSpinner text="Carregando dados..." />
 * ```
 */

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  /** Tamanho do spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Texto de loading */
  text?: string;
  /** Classes CSS adicionais */
  className?: string;
  /** Centralizar na tela */
  fullScreen?: boolean;
  /** Centralizar no container */
  centered?: boolean;
}

export function LoadingSpinner({
  size = 'md',
  text,
  className,
  fullScreen = false,
  centered = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  const spinner = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-2",
      centered && "min-h-[200px]",
      fullScreen && "fixed inset-0 bg-background/80 backdrop-blur-sm z-50",
      className
    )}>
      <Loader2 className={cn(
        "animate-spin text-primary",
        sizeClasses[size]
      )} />
      {text && (
        <span className={cn(
          "text-muted-foreground",
          textSizes[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );

  return spinner;
}

/**
 * LoadingOverlay - Overlay de carregamento
 * 
 * Cobre um container com estado de loading.
 */
export interface LoadingOverlayProps {
  /** Se está carregando */
  loading: boolean;
  /** Texto opcional */
  text?: string;
  /** Conteúdo filho */
  children: React.ReactNode;
  /** Classes CSS adicionais */
  className?: string;
}

export function LoadingOverlay({
  loading,
  text,
  children,
  className,
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-inherit">
          <LoadingSpinner size="lg" text={text} />
        </div>
      )}
    </div>
  );
}
