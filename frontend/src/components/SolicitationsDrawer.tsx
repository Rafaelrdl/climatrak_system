import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, ArrowRight, PlayCircle, CheckCircle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { IfCan } from '@/components/auth/IfCan';
import type { Solicitation, SolicitationItem, StockItem } from '@/types';
// Helper functions para status de solicitação
const canAdvanceStatus = (status: string) => status !== 'Convertida em OS';
const getNextStatus = (status: string) => {
  if (status === 'Nova') return 'Em triagem';
  if (status === 'Em triagem') return 'Convertida em OS';
  return status;
};
const advanceSolicitationStatus = (solicitation: any) => ({
  ...solicitation,
  status: getNextStatus(solicitation.status),
  status_history: [...(solicitation.status_history || []), { from: solicitation.status, to: getNextStatus(solicitation.status), at: new Date().toISOString() }]
});
const addSolicitationItem = (solicitation: any, stockItem: any, qty: number) => ({
  ...solicitation,
  items: [...(solicitation.items || []), { id: String(Date.now()), stock_item_id: stockItem.id, stock_item_name: stockItem.description || stockItem.name, unit: stockItem.unit, qty }]
});
const removeSolicitationItem = (solicitation: any, itemId: string) => ({
  ...solicitation,
  items: (solicitation.items || []).filter((i: any) => i.id !== itemId)
});

interface SolicitationsDrawerProps {
  solicitation: Solicitation | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (solicitation: Solicitation) => void;
  onConvert: (solicitation: Solicitation) => void;
  stockItems: StockItem[];
}

export function SolicitationsDrawer({
  solicitation,
  isOpen,
  onClose,
  onUpdate,
  onConvert,
  stockItems
}: SolicitationsDrawerProps) {
  const [selectedStockItemId, setSelectedStockItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Focus on title when drawer opens for accessibility
  useEffect(() => {
    if (isOpen && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!solicitation) {
    return null;
  }

  const handleAdvanceStatus = () => {
    if (!canAdvanceStatus(solicitation)) {
      toast.error('Transição de status inválida.');
      return;
    }

    const updatedSolicitation = advanceSolicitationStatus(solicitation);
    if (!updatedSolicitation) {
      toast.error('Erro ao avançar status.');
      return;
    }

    onUpdate(updatedSolicitation);
    
    // Success message based on new status
    if (updatedSolicitation.status === 'Em triagem') {
      toast.success('Solicitação movida para triagem.');
    } else if (updatedSolicitation.status === 'Convertida em OS') {
      toast.success('Solicitação convertida em OS.');
      onConvert(updatedSolicitation);
    }
  };

  const handleAddItem = () => {
    if (!selectedStockItemId || !quantity || parseFloat(quantity) <= 0) {
      toast.error('Selecione um item e informe uma quantidade válida.');
      return;
    }

    const stockItem = stockItems.find(item => item.id === selectedStockItemId);
    if (!stockItem) {
      toast.error('Item de estoque não encontrado.');
      return;
    }

    const updatedSolicitation = addSolicitationItem(
      solicitation,
      selectedStockItemId,
      stockItem.description,
      stockItem.unit,
      parseFloat(quantity)
    );

    onUpdate(updatedSolicitation);
    setSelectedStockItemId('');
    setQuantity('');
    toast.success('Item adicionado.');
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedSolicitation = removeSolicitationItem(solicitation, itemId);
    onUpdate(updatedSolicitation);
    toast.success('Item removido.');
  };

  const nextStatus = getNextStatus(solicitation.status);
  const canAdvance = canAdvanceStatus(solicitation);

  const getStatusIcon = (status: Solicitation['status']) => {
    switch (status) {
      case 'Nova':
        return <PlayCircle className="h-4 w-4" />;
      case 'Em triagem':
        return <ArrowRight className="h-4 w-4" />;
      case 'Convertida em OS':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getActionButtonText = () => {
    switch (solicitation.status) {
      case 'Nova':
        return 'Iniciar triagem';
      case 'Em triagem':
        return 'Converter em OS';
      default:
        return '';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        className="w-full sm:max-w-lg overflow-y-auto"
        aria-labelledby="solicitation-drawer-title"
        aria-describedby="solicitation-drawer-description"
      >
        <SheetHeader>
          <SheetTitle 
            ref={titleRef}
            id="solicitation-drawer-title"
            tabIndex={-1}
            className="outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          >
            SOL-{solicitation.id.slice(-6).toUpperCase()}
          </SheetTitle>
          <SheetDescription id="solicitation-drawer-description">
            Detalhes e gerenciamento da solicitação
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status and Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(solicitation.status)}
                  <StatusBadge status={solicitation.status} />
                </div>
                {canAdvance && (
                  <IfCan action="convert" subject="solicitation">
                    <Button
                      onClick={handleAdvanceStatus}
                      size="sm"
                      className="flex items-center gap-2"
                      data-testid="solicitation-advance"
                    >
                      {getStatusIcon(nextStatus!)}
                      {getActionButtonText()}
                    </Button>
                  </IfCan>
                )}
              </div>

              {/* Status History */}
              {solicitation.status_history.length > 1 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Histórico:</p>
                  {solicitation.status_history.map((history, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <span>{history.from || 'Criada'}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{history.to}</span>
                      <span className="ml-auto">
                        {new Date(history.at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium">Informações da Solicitação</h4>
            
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Localização:</span>
                <p className="mt-1">{solicitation.location_name}</p>
              </div>
              
              <div>
                <span className="font-medium text-muted-foreground">Equipamento:</span>
                <p className="mt-1">{solicitation.equipment_name}</p>
              </div>
              
              <div>
                <span className="font-medium text-muted-foreground">Solicitante:</span>
                <p className="mt-1">{solicitation.requester_user_name}</p>
              </div>
              
              {solicitation.note && (
                <div>
                  <span className="font-medium text-muted-foreground">Observação:</span>
                  <p className="mt-1 p-3 bg-muted rounded-md">{solicitation.note}</p>
                </div>
              )}

              <div>
                <span className="font-medium text-muted-foreground">Criada em:</span>
                <p className="mt-1">
                  {new Date(solicitation.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Stock Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Itens de Estoque</h4>
              <Badge variant="outline">{solicitation.items.length} itens</Badge>
            </div>

            {/* Add Item Form */}
            {solicitation.status !== 'Convertida em OS' && (
              <IfCan action="edit" subject="solicitation">
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <h5 className="text-sm font-medium">Adicionar Item</h5>
                  <div className="space-y-3">
                    <Select value={selectedStockItemId} onValueChange={setSelectedStockItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um item" />
                      </SelectTrigger>
                      <SelectContent>
                        {stockItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.description} ({item.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Quantidade"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        min="0.1"
                        step="0.1"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleAddItem}
                        size="sm"
                        className="flex items-center gap-2"
                        data-testid="solicitation-add-item"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              </IfCan>
            )}

            {/* Items List */}
            {solicitation.items.length > 0 ? (
              <div className="space-y-2">
                {solicitation.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.stock_item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.qty} {item.unit || 'un'}
                      </p>
                    </div>
                    {solicitation.status !== 'Convertida em OS' && (
                      <IfCan action="edit" subject="solicitation">
                        <Button
                          onClick={() => handleRemoveItem(item.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          data-testid="solicitation-remove-item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </IfCan>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhum item de estoque adicionado.</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Close Button */}
          <Button onClick={onClose} variant="outline" className="w-full">
            Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}