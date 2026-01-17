import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertTriangle, Edit, Eye, Package, Trash2, ArrowUpDown, MoreHorizontal } from 'lucide-react';
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

  const formatCurrency = (value?: number | null) => {
    if (value == null || value === 0) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
      <div className="overflow-x-auto">
        <Table className="table-fixed w-full min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              {/* Foto - esconde em mobile */}
              <TableHead scope="col" className="hidden md:table-cell w-14">Foto</TableHead>
              {/* Item/SKU - sempre visível, flex grow */}
              <TableHead scope="col" className="w-[22%] min-w-[160px]">Item</TableHead>
              {/* Categoria - esconde em mobile */}
              <TableHead scope="col" className="hidden lg:table-cell w-[12%] min-w-[100px]">Categoria</TableHead>
              {/* Estoque - sempre visível */}
              <TableHead scope="col" className="text-right w-[10%] min-w-[80px]">Estoque</TableHead>
              {/* Mínimo - esconde em mobile */}
              <TableHead scope="col" className="hidden sm:table-cell text-right w-[7%] min-w-[60px]">Mín.</TableHead>
              {/* Valor - esconde em mobile pequeno */}
              <TableHead scope="col" className="hidden sm:table-cell text-right w-[10%] min-w-[90px]">Valor (un.)</TableHead>
              {/* Status - sempre visível */}
              <TableHead scope="col" className="w-[9%] min-w-[80px]">Status</TableHead>
              {/* Local - esconde em mobile, mais espaço */}
              <TableHead scope="col" className="hidden xl:table-cell w-[18%] min-w-[140px]">Local</TableHead>
              {/* Atualizado - esconde em tablet e menor */}
              <TableHead scope="col" className="hidden xl:table-cell w-[9%] min-w-[85px]">Atualizado</TableHead>
              {/* Ações - sticky à direita, sempre visível */}
              <TableHead 
                scope="col" 
                className="text-right w-[100px] sticky right-0 z-20 bg-muted shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]"
              >
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow 
                key={item.id}
                className={isLowStock(item) ? 'bg-destructive/5' : ''}
              >
                {/* Foto */}
                <TableCell className="hidden md:table-cell p-2">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
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
                
                {/* Item (Nome + SKU/Código) */}
                <TableCell className="py-2.5">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-medium leading-tight truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0">
                      <span className="font-mono flex-shrink-0">{item.sku || item.code || '-'}</span>
                      {item.manufacturer && (
                        <span className="truncate text-muted-foreground/70" title={item.manufacturer}>
                          • {item.manufacturer}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Categoria */}
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm truncate block" title={getCategoryName(item.category_id)}>
                    {getCategoryName(item.category_id)}
                  </span>
                </TableCell>

                {/* Estoque */}
                <TableCell className="text-right py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-semibold tabular-nums">
                      {item.qty_on_hand ?? item.quantity ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.unit}</span>
                    {isLowStock(item) && (
                      <AlertTriangle 
                        className="h-3.5 w-3.5 text-destructive flex-shrink-0" 
                        aria-label="Abaixo do ponto de reposição"
                      />
                    )}
                  </div>
                </TableCell>

                {/* Mínimo */}
                <TableCell className="hidden sm:table-cell text-right">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {item.reorder_point ?? item.min_qty ?? '-'}
                  </span>
                </TableCell>

                {/* Valor (un.) */}
                <TableCell className="hidden sm:table-cell text-right">
                  <span className="text-sm tabular-nums">
                    {formatCurrency(item.unit_cost)}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="py-2.5">
                  {getStockBadge(item)}
                </TableCell>

                {/* Local */}
                <TableCell className="hidden xl:table-cell">
                  <span className="text-sm text-muted-foreground truncate block" title={item.location_name}>
                    {item.location_name || '-'}
                  </span>
                </TableCell>

                {/* Atualizado */}
                <TableCell className="hidden xl:table-cell">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatLastUpdate(item.last_movement_at || item.updated_at)}
                  </span>
                </TableCell>

                {/* Ações - sticky à direita */}
                <TableCell className="text-right sticky right-0 z-10 bg-background shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                  {/* Desktop: botões inline */}
                  <TooltipProvider>
                    <div className="hidden sm:flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onView(item)}
                            aria-label={`Visualizar ${item.name}`}
                            data-testid="inventory-view"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Visualizar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onMove(item)}
                            aria-label={`Movimentar ${item.name}`}
                            data-testid="inventory-move"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Movimentar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(item)}
                            aria-label={`Editar ${item.name}`}
                            data-testid="inventory-edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDelete(item)}
                            aria-label={`Excluir ${item.name}`}
                            data-testid="inventory-delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                  
                  {/* Mobile: dropdown menu compacto */}
                  <div className="sm:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Ações"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(item)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMove(item)}>
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          Movimentar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(item)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}