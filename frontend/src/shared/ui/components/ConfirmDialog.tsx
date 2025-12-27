/**
 * ConfirmDialog - Diálogo de confirmação
 * 
 * Modal de confirmação para ações destrutivas ou importantes.
 * 
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Excluir Ordem de Serviço"
 *   description="Esta ação não pode ser desfeita."
 *   confirmText="Excluir"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 * />
 * ```
 */

import { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';

export interface ConfirmDialogProps {
  /** Estado de abertura do diálogo */
  open: boolean;
  /** Callback para mudança de estado */
  onOpenChange: (open: boolean) => void;
  /** Título do diálogo */
  title: string;
  /** Descrição/mensagem */
  description?: string;
  /** Conteúdo customizado (substitui description) */
  children?: ReactNode;
  /** Texto do botão de confirmação */
  confirmText?: string;
  /** Texto do botão de cancelamento */
  cancelText?: string;
  /** Variante visual */
  variant?: 'default' | 'destructive' | 'warning';
  /** Callback de confirmação */
  onConfirm: () => void | Promise<void>;
  /** Callback de cancelamento */
  onCancel?: () => void;
  /** Estado de carregamento */
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const icons = {
    default: <Info className="h-5 w-5 text-primary" />,
    destructive: <AlertTriangle className="h-5 w-5 text-destructive" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  };

  const confirmButtonClasses = {
    default: '',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {icons[variant]}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          {description && (
            <AlertDialogDescription className="mt-2">
              {description}
            </AlertDialogDescription>
          )}
          {children && (
            <div className="mt-2 text-sm text-muted-foreground">
              {children}
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(confirmButtonClasses[variant])}
          >
            {loading ? 'Aguarde...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
