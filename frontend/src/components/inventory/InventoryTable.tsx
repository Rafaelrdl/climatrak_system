import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Edit, Eye, Package, Trash2, ArrowUpDown } from 'lucide-react';
import type { InventoryItem, InventoryCategory } from '@/models/inventory';

interface InventoryTableProps {
  items: InventoryItem[];
  categories: InventoryCategory[];
  onView: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onMove: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}

export function InventoryTable({ items, categories, onView, onEdit, onMove, onDelete }: InventoryTableProps) {
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

  const getStockBadge = (item: InventoryItem) => {
    // Usar o status calculado pelo backend se disponível
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
    
    // Fallback: calcular manualmente se stock_status não estiver disponível
    const qty = item.qty_on_hand ?? item.quantity ?? 0;
    const minQty = item.min_qty ?? item.minimum_quantity ?? 0;
    
    if (qty <= 0) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    
    if (qty < minQty) {
      return <Badge variant="destructive">Baixo</Badge>;
    }
    
    return <Badge variant="outline">Normal</Badge>;
  };

  const formatLastUpdate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
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
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Foto</TableHead>
            <TableHead scope="col">Item/Fabricante</TableHead>
            <TableHead scope="col">SKU</TableHead>
            <TableHead scope="col">Categoria</TableHead>
            <TableHead scope="col">Unid.</TableHead>
            <TableHead scope="col" className="text-right">Estoque</TableHead>
            <TableHead scope="col" className="text-right">Ponto de Reposição</TableHead>
            <TableHead scope="col">Local</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">Atualizado em</TableHead>
            <TableHead scope="col" className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow 
              key={item.id}
              className={isLowStock(item) ? 'bg-destructive/5' : ''}
            >
              <TableCell>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
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
                    <Package className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">
                    {item.name}{item.manufacturer && <span className="text-muted-foreground">/{item.manufacturer}</span>}
                  </div>
                  {item.location_name && (
                    <div className="text-xs text-muted-foreground">
                      {item.location_name}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">
                  {item.sku || '-'}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {getCategoryName(item.category_id)}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {item.unit}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="font-medium">
                    {item.qty_on_hand ?? item.quantity ?? 0}
                  </span>
                  {isLowStock(item) && (
                    <AlertTriangle 
                      className="h-4 w-4 text-destructive" 
                      aria-label="Abaixo do ponto de reposição"
                    />
                  )}
                </div>
                {isLowStock(item) && (
                  <div className="text-xs text-destructive mt-1">
                    Abaixo do ponto de reposição
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <span className="font-medium">
                  {item.reorder_point ?? item.min_qty ?? '-'}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {item.location_name || '-'}
                </span>
              </TableCell>
              <TableCell>
                {getStockBadge(item)}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatLastUpdate(item.last_movement_at || item.updated_at)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <TooltipProvider>
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onView(item)}
                          aria-label={`Visualizar ${item.name}`}
                          data-testid="inventory-view"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Visualizar detalhes</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onMove(item)}
                          aria-label={`Movimentar ${item.name}`}
                          data-testid="inventory-move"
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Movimentar estoque</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onEdit(item)}
                          aria-label={`Editar ${item.name}`}
                          data-testid="inventory-edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar item</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onDelete(item)}
                          aria-label={`Excluir ${item.name}`}
                          className="text-destructive hover:text-destructive"
                          data-testid="inventory-delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir item</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}