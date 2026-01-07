/**
 * RejectRequestDialog - Diálogo para rejeitar solicitação com motivo
 * 
 * Modal para rejeitar uma solicitação de manutenção,
 * exigindo que o usuário informe o motivo da rejeição.
 */

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RejectRequestDialogProps {
  /** Estado de abertura do diálogo */
  open: boolean;
  /** Callback para mudança de estado */
  onOpenChange: (open: boolean) => void;
  /** Callback de confirmação com o motivo */
  onConfirm: (reason: string) => void | Promise<void>;
  /** Estado de carregamento */
  loading?: boolean;
}

export function RejectRequestDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: RejectRequestDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    // Validar motivo
    if (!reason.trim()) {
      setError('Informe o motivo da rejeição');
      return;
    }
    if (reason.trim().length < 10) {
      setError('O motivo deve ter pelo menos 10 caracteres');
      return;
    }

    await onConfirm(reason.trim());
    // Reset após confirmação
    setReason('');
    setError('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setReason('');
    setError('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Rejeitar solicitação</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="mt-2">
            Esta ação marca a solicitação como rejeitada e impede a conversão em OS.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="rejection-reason" className="text-sm font-medium">
            Motivo da rejeição <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="rejection-reason"
            placeholder="Descreva o motivo pelo qual esta solicitação está sendo rejeitada..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            className={cn(
              "mt-2 min-h-[100px]",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-destructive mt-1">{error}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {reason.length} caracteres (mínimo: 10)
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Aguarde...' : 'Rejeitar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
