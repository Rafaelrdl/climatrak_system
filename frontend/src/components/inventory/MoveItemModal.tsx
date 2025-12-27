import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import type { InventoryItem } from '@/models/inventory';
import { inventoryMovementsService, type CreateMovementData } from '@/services/inventoryService';
import { useQueryClient } from '@tanstack/react-query';

interface MoveItemModalProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemMoved: (item: InventoryItem) => void;
}

type MovementType = 'IN' | 'OUT';
type ReasonType = 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'WORK_ORDER' | 'TRANSFER' | 'OTHER';

const reasonLabels: Record<ReasonType, string> = {
  PURCHASE: 'Compra/Recebimento',
  RETURN: 'Devolução',
  ADJUSTMENT: 'Ajuste de Estoque',
  WORK_ORDER: 'Ordem de Serviço',
  TRANSFER: 'Transferência',
  OTHER: 'Outro',
};

export function MoveItemModal({ item, open, onOpenChange, onItemMoved }: MoveItemModalProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'IN' as MovementType,
    quantity: 1,
    reason: 'ADJUSTMENT' as ReasonType,
    note: '',
    reference: '',
    unit_cost: undefined as number | undefined
  });

  // Get current quantity safely
  const currentQty = item?.qty_on_hand ?? item?.quantity ?? 0;

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (open && item) {
      setFormData({
        type: 'IN',
        quantity: 1,
        reason: 'ADJUSTMENT',
        note: '',
        reference: '',
        unit_cost: undefined
      });
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) return;
    
    if (formData.quantity <= 0) {
      toast.error('Quantidade deve ser maior que 0');
      return;
    }

    if (formData.type === 'OUT' && currentQty < formData.quantity) {
      toast.error('Saldo insuficiente');
      return;
    }

    setLoading(true);
    
    try {
      const movementData: CreateMovementData = {
        item: Number(item.id),
        type: formData.type,
        reason: formData.reason,
        quantity: formData.quantity,
        note: formData.note.trim() || undefined,
        reference: formData.reference.trim() || undefined,
        unit_cost: formData.type === 'IN' ? formData.unit_cost : undefined,
      };

      await inventoryMovementsService.create(movementData);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['inventory'] });

      toast.success('Movimentação registrada com sucesso!');
      onOpenChange(false);
      
      // Calculate new quantity and trigger refresh
      const newQty = formData.type === 'IN' 
        ? currentQty + formData.quantity
        : currentQty - formData.quantity;
      onItemMoved({ ...item, qty_on_hand: newQty, quantity: newQty });
    } catch (error: any) {
      console.error('Error creating movement:', error);
      toast.error(error.response?.data?.detail || error.message || 'Erro ao registrar movimentação');
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  const projectedQty = formData.type === 'IN' 
    ? currentQty + formData.quantity
    : currentQty - formData.quantity;

  const isInsufficientStock = formData.type === 'OUT' && currentQty < formData.quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentar Estoque</DialogTitle>
          <DialogDescription>
            Registre uma entrada ou saída para <strong>{item.name}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Stock Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">Estoque atual</div>
            <div className="text-lg font-semibold">
              {currentQty} {item.unit}
            </div>
            {projectedQty !== currentQty && (
              <div className="text-sm mt-1">
                <span className="text-muted-foreground">Após movimentação: </span>
                <span className={`font-medium ${isInsufficientStock ? 'text-destructive' : formData.type === 'IN' ? 'text-green-600' : 'text-orange-600'}`}>
                  {projectedQty} {item.unit}
                </span>
              </div>
            )}
          </div>

          {/* Movement Type */}
          <div>
            <Label htmlFor="move-type">Tipo de Movimentação *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: MovementType) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-green-600" />
                    Entrada
                  </div>
                </SelectItem>
                <SelectItem value="OUT">
                  <div className="flex items-center gap-2">
                    <ArrowDown className="h-4 w-4 text-red-600" />
                    Saída
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="move-reason">Motivo *</Label>
            <Select 
              value={formData.reason} 
              onValueChange={(value: ReasonType) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reasonLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div>
            <Label htmlFor="move-qty">Quantidade *</Label>
            <Input
              id="move-qty"
              type="number"
              min="1"
              max={formData.type === 'OUT' ? currentQty : undefined}
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              required
              className={isInsufficientStock ? 'border-destructive' : ''}
            />
            {isInsufficientStock && (
              <p className="text-sm text-destructive mt-1">
                Quantidade não disponível em estoque
              </p>
            )}
          </div>

          {/* Unit Cost (only for entries) */}
          {formData.type === 'IN' && (
            <div>
              <Label htmlFor="move-unit-cost">Custo Unitário (R$)</Label>
              <Input
                id="move-unit-cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: e.target.value ? parseFloat(e.target.value) : undefined }))}
                placeholder="0,00"
              />
            </div>
          )}

          {/* Reference */}
          <div>
            <Label htmlFor="move-reference">Referência</Label>
            <Input
              id="move-reference"
              value={formData.reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
              placeholder="Ex: NF-12345, OS-2024-001"
            />
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="move-note">Observação</Label>
            <Textarea
              id="move-note"
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Adicione uma observação sobre esta movimentação (opcional)"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || isInsufficientStock}
              className={formData.type === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                `Registrar ${formData.type === 'IN' ? 'Entrada' : 'Saída'}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}