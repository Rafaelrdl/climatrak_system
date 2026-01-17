import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Edit, Package, ArrowUpDown } from 'lucide-react';
import type { InventoryItem, InventoryCategory } from '@/models/inventory';

interface InventoryCardsProps {
  items: InventoryItem[];
  categories: InventoryCategory[];
  onEdit: (item: InventoryItem) => void;
  onMove: (item: InventoryItem) => void;
}

export function InventoryCards({ items, categories, onEdit, onMove }: InventoryCardsProps) {
  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return 'Sem categoria';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Categoria desconhecida';
  };

  const isLowStock = (item: InventoryItem) => {
    // Usar campo calculado pela API se disponível (verificar se é boolean)
    if (typeof item.is_low_stock === 'boolean') {
      return item.is_low_stock;
    }
    // Fallback: calcular manualmente apenas se estoque <= ponto de reposição
    const qty = Number(item.qty_on_hand ?? item.quantity ?? 0);
    const reorder = Number(item.reorder_point ?? item.min_qty ?? 0);
    // Só é low stock se qty > 0 E qty <= reorder
    return qty > 0 && reorder > 0 && qty <= reorder;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum item encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {items.map((item) => (
        <Card key={item.id} className="location-card overflow-hidden">
          <CardContent className="p-3">
            {/* Image */}
            <div className="h-28 mb-2 rounded-md overflow-hidden bg-muted/50 flex items-center justify-center">
              {(item.photo_url || item.image_url) ? (
                <img 
                  src={item.photo_url || item.image_url || ''} 
                  alt={item.name}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Package className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm leading-tight line-clamp-2" title={item.name}>
                  {item.name}
                </h3>
                {isLowStock(item) && (
                  <AlertTriangle 
                    className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" 
                    aria-label="Abaixo do ponto de reposição"
                  />
                )}
              </div>

              {item.sku && (
                <p className="text-xs text-muted-foreground font-mono">
                  {item.sku}
                </p>
              )}

              <Badge variant="outline" className="text-xs">
                {getCategoryName(item.category_id)}
              </Badge>

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-semibold">
                      {item.qty_on_hand ?? item.quantity ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.unit}
                    </span>
                  </div>
                  {isLowStock(item) && (
                    <span className="text-xs text-destructive font-medium">
                      Repor estoque
                    </span>
                  )}
                </div>
                
                {item.location_name && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground truncate max-w-[80px]">
                      {item.location_name}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 pt-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onMove(item)}
                  aria-label={`Movimentar ${item.name}`}
                  data-testid="inventory-move"
                >
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  Movimentar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit(item)}
                  aria-label={`Editar ${item.name}`}
                  data-testid="inventory-edit"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}