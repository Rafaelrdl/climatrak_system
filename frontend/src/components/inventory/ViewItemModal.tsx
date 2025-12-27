import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, AlertTriangle, Calendar, DollarSign, Tag, Boxes, User } from 'lucide-react';
import type { InventoryItem, InventoryCategory } from '@/models/inventory';

interface ViewItemModalProps {
  item: InventoryItem | null;
  categories: InventoryCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewItemModal({ item, categories, open, onOpenChange }: ViewItemModalProps) {
  if (!item) return null;

  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return 'Sem categoria';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Categoria desconhecida';
  };

  const getStockBadge = () => {
    if (item.stock_status) {
      switch (item.stock_status) {
        case 'OUT_OF_STOCK':
          return <Badge variant="destructive">Esgotado</Badge>;
        case 'LOW':
          return <Badge variant="destructive">Baixo</Badge>;
        case 'OVERSTOCKED':
          return <Badge variant="secondary">Excesso</Badge>;
        case 'OK':
        default:
          return <Badge variant="outline">Normal</Badge>;
      }
    }
    
    const qty = item.qty_on_hand ?? item.quantity ?? 0;
    const minQty = item.min_qty ?? item.minimum_quantity ?? 0;
    
    if (qty <= 0) return <Badge variant="destructive">Esgotado</Badge>;
    if (qty < minQty) return <Badge variant="destructive">Baixo</Badge>;
    return <Badge variant="outline">Normal</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const qty = item.qty_on_hand ?? item.quantity ?? 0;
  const minQty = item.min_qty ?? item.minimum_quantity ?? 0;
  const maxQty = item.max_qty ?? item.maximum_quantity;
  
  // Usar stock_status do backend se disponível, senão calcular
  const isLowStock = item.stock_status 
    ? (item.stock_status === 'LOW' || item.stock_status === 'OUT_OF_STOCK')
    : (qty > 0 && minQty > 0 && qty < minQty);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalhes do Item
          </DialogTitle>
          <DialogDescription>
            Informações completas do item de estoque
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Imagem e Info Principal */}
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {(item.photo_url || item.image_url) ? (
                <img 
                  src={item.photo_url || item.image_url || ''} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Package className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="text-lg font-semibold">{item.name}</h3>
                {item.manufacturer && (
                  <p className="text-sm text-muted-foreground">Fabricante: {item.manufacturer}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {getStockBadge()}
                {item.is_critical && <Badge className="bg-amber-500 hover:bg-amber-600">Item Crítico</Badge>}
                {!item.is_active && <Badge variant="secondary">Inativo</Badge>}
              </div>
            </div>
          </div>

          {/* Descrição */}
          {item.description && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Descrição</h4>
              <div className="p-4 rounded-lg border bg-muted/50">
                <p className="text-sm">{item.description}</p>
              </div>
            </div>
          )}

          {/* Identificação */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoCard 
              icon={<Tag className="h-4 w-4" />}
              label="Código/SKU"
              value={item.code || item.sku || '-'}
            />
            <InfoCard 
              icon={<Boxes className="h-4 w-4" />}
              label="Categoria"
              value={getCategoryName(item.category_id)}
            />
            <InfoCard 
              icon={<Package className="h-4 w-4" />}
              label="Unidade"
              value={item.unit || 'UN'}
            />
          </div>

          {/* Estoque */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Estoque</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg border ${isLowStock ? 'border-destructive bg-destructive/5' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-muted-foreground">Quantidade Atual</span>
                  {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                </div>
                <p className={`text-2xl font-bold ${isLowStock ? 'text-destructive' : ''}`}>{qty}</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/50">
                <span className="text-sm text-muted-foreground">Ponto de Reposição</span>
                <p className="text-2xl font-bold">{minQty}</p>
              </div>
              {maxQty !== undefined && maxQty !== null && (
                <div className="p-4 rounded-lg border bg-muted/50">
                  <span className="text-sm text-muted-foreground">Qtd. Máxima</span>
                  <p className="text-2xl font-bold">{maxQty}</p>
                </div>
              )}
              <div className="p-4 rounded-lg border bg-muted/50">
                <span className="text-sm text-muted-foreground">Custo Unitário</span>
                <p className="text-xl font-bold">{formatCurrency(item.unit_cost)}</p>
              </div>
            </div>
          </div>

          {/* Localização */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Localização</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoCard 
                icon={<MapPin className="h-4 w-4" />}
                label="Local"
                value={item.location || '-'}
              />
              <InfoCard 
                icon={<MapPin className="h-4 w-4" />}
                label="Prateleira"
                value={item.shelf || '-'}
              />
              <InfoCard 
                icon={<MapPin className="h-4 w-4" />}
                label="Compartimento"
                value={item.bin || '-'}
              />
            </div>
          </div>

          {/* Fornecedor */}
          {item.supplier && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Fornecedor</h4>
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{item.supplier}</span>
                </div>
              </div>
            </div>
          )}

          {/* Datas */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Histórico</h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoCard 
                icon={<Calendar className="h-4 w-4" />}
                label="Criado em"
                value={formatDate(item.created_at)}
              />
              <InfoCard 
                icon={<Calendar className="h-4 w-4" />}
                label="Última atualização"
                value={formatDate(item.updated_at)}
              />
              {item.last_movement_at && (
                <InfoCard 
                  icon={<Calendar className="h-4 w-4" />}
                  label="Última movimentação"
                  value={formatDate(item.last_movement_at)}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border bg-muted/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="font-medium">{value}</p>
    </div>
  );
}
