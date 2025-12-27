import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Warehouse, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { InventoryTabs } from '@/components/inventory/InventoryTabs';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { InventoryCards } from '@/components/inventory/InventoryCards';
import { InventoryAnalysis } from '@/components/inventory/InventoryAnalysis';
import { NewItemModal } from '@/components/inventory/NewItemModal';
import { InventoryHistory } from '@/components/inventory/InventoryHistory';
import { EditItemModal } from '@/components/inventory/EditItemModal';
import { MoveItemModal } from '@/components/inventory/MoveItemModal';
import { ViewItemModal } from '@/components/inventory/ViewItemModal';
import { IfCan } from '@/components/auth/IfCan';
import { useRoleBasedData, DataFilterInfo } from '@/components/data/FilteredDataProvider';
import { useAbility } from '@/hooks/useAbility';
import type { InventoryItem, InventoryCategory } from '@/models/inventory';
import { 
  useInventoryItems, 
  useInventoryCategories,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem
} from '@/hooks/useInventoryQuery';
import type { ApiInventoryItem, ApiInventoryCategory } from '@/types/api';

// Mappers
const mapApiItemToInventoryItem = (item: ApiInventoryItem): InventoryItem => {
  return {
    id: String(item.id),
    code: item.code,
    sku: item.code, // Use code as SKU
    name: item.name,
    manufacturer: item.manufacturer || undefined,
    description: item.description,
    category_id: item.category ? String(item.category) : null,
    category_name: item.category_name || null,
    unit: item.unit,
    qty_on_hand: item.quantity,
    quantity: item.quantity,
    min_qty: item.min_quantity,
    minimum_quantity: item.min_quantity,
    max_qty: item.max_quantity ?? undefined,
    maximum_quantity: item.max_quantity ?? undefined,
    reorder_point: item.reorder_point ?? item.min_quantity,
    location: item.location,
    location_name: [item.location, item.shelf, item.bin].filter(Boolean).join(' / ') || undefined,
    shelf: item.shelf,
    bin: item.bin,
    supplier: item.supplier,
    supplier_code: item.supplier_code,
    unit_cost: item.unit_cost,
    photo_url: item.image_url || item.image,
    image_url: item.image_url,
    is_active: item.is_active,
    is_critical: item.is_critical,
    is_low_stock: item.is_low_stock,
    stock_status: item.stock_status,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
};

const mapApiCategoryToCategory = (cat: ApiInventoryCategory): InventoryCategory => ({
  id: String(cat.id),
  code: cat.code,
  name: cat.name,
  description: cat.description || '',
  parent_id: cat.parent ? String(cat.parent) : null,
  is_active: cat.is_active,
  created_at: cat.created_at,
  updated_at: cat.updated_at,
});

export function InventoryPage() {
  const { role } = useAbility();
  
  // React Query hooks
  const { data: itemsData, isLoading: loadingItems, error: itemsError } = useInventoryItems();
  const { data: categoriesData, isLoading: loadingCategories } = useInventoryCategories();
  
  // Mutations
  const deleteMutation = useDeleteInventoryItem();
  
  // Map API data to frontend types
  const items = useMemo(() => {
    // Handle both array and paginated response formats
    const itemsArray = Array.isArray(itemsData) 
      ? itemsData 
      : (itemsData as any)?.results || [];
    return itemsArray.map(mapApiItemToInventoryItem);
  }, [itemsData]);
  const categories = useMemo(() => {
    // Handle both array and paginated response formats
    const categoryArray = Array.isArray(categoriesData) 
      ? categoriesData 
      : (categoriesData as any)?.results || [];
    return categoryArray.map(mapApiCategoryToCategory);
  }, [categoriesData]);
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(true);
  
  // Memoize the filter options to prevent infinite re-renders
  const filterOptions = useMemo(() => ({
    includeInactive: role === 'admin' || role === 'technician',
    onlyOwned: role === 'viewer' // Viewers see limited inventory
  }), [role]);

  // Apply role-based filtering to inventory items
  const { data: filteredInventoryData, stats: inventoryFilterStats } = useRoleBasedData(
    items, 
    'inventory',
    filterOptions
  );
  
  // Filter items when search/filters change
  const filteredItems = useMemo(() => {
    let result = filteredInventoryData;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category_id === selectedCategory);
    }
    
    // Apply active filter
    if (showActiveOnly) {
      result = result.filter(item => item.is_active);
    }
    
    return result;
  }, [filteredInventoryData, searchQuery, selectedCategory, showActiveOnly]);
  
  // Modal states
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [movingItem, setMovingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  // Handlers
  const handleItemCreated = (newItem: InventoryItem) => {
    // React Query will automatically invalidate and refetch
    toast.success('Item adicionado ao inventário');
  };

  const handleItemUpdated = (updatedItem: InventoryItem) => {
    // React Query will automatically invalidate and refetch
    toast.success('Item atualizado');
  };

  const handleItemMoved = () => {
    // React Query will automatically invalidate and refetch via mutations
    toast.success('Estoque atualizado');
  };

  const handleDeleteConfirm = () => {
    if (!deletingItem) return;
    
    deleteMutation.mutate(Number(deletingItem.id), {
      onSuccess: () => {
        toast.success('Item removido do inventário');
        setDeletingItem(null);
      },
      onError: (error) => {
        console.error('Error deleting item:', error);
        toast.error('Erro ao remover item');
      }
    });
  };

  const handleView = (item: InventoryItem) => {
    setViewingItem(item);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
  };

  const handleMove = (item: InventoryItem) => {
    setMovingItem(item);
  };

  const handleDelete = (item: InventoryItem) => {
    setDeletingItem(item);
  };

  // Prepare tabs content
  const tabs = [
    {
      value: 'table' as const,
      label: 'Tabela',
      content: (
        <InventoryTable
          items={filteredItems}
          categories={categories}
          onView={handleView}
          onEdit={handleEdit}
          onMove={handleMove}
          onDelete={handleDelete}
        />
      )
    },
    {
      value: 'cards' as const,
      label: 'Cards',
      content: (
        <InventoryCards
          items={filteredItems}
          categories={categories}
          onEdit={handleEdit}
          onMove={handleMove}
        />
      )
    },
    {
      value: 'analysis' as const,
      label: 'Análise',
      content: <InventoryAnalysis />
    },
    {
      value: 'history' as const,
      label: 'Histórico',
      content: <InventoryHistory />
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Controle de Estoque">
        <IfCan action="create" subject="inventory">
          <NewItemModal
            categories={categories}
            onItemCreated={handleItemCreated}
            trigger={
              <Button className="flex items-center gap-2" data-testid="inventory-create">
                <Plus className="h-4 w-4" />
                Novo Item
              </Button>
            }
          />
        </IfCan>
      </PageHeader>
      
      {/* Role-based data filtering info */}
      {inventoryFilterStats.filtered > 0 && (
        <DataFilterInfo
          filterStats={inventoryFilterStats}
          dataType="inventory"
          canViewAll={role === 'admin'}
        />
      )}

      {/* Special notice for requesters */}
      {role === 'requester' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Visualização limitada do estoque</p>
                <p className="mt-1">
                  Como solicitante, você pode ver os itens básicos do estoque mas não as quantidades detalhadas. 
                  Entre em contato com um técnico ou administrador para informações específicas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Itens de Estoque
              {role !== 'admin' && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {role === 'requester' ? 'Vista limitada' : 'Filtrado'}
                </Badge>
              )}
              {filteredItems.length !== items.length && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filteredItems.length} de {items.length}
                </Badge>
              )}
            </CardTitle>
            
            {/* Filters */}
            {!loadingItems && !itemsError && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative min-w-0 flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar itens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Todas categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Active Filter */}
              <Select 
                value={showActiveOnly ? 'active' : 'all'} 
                onValueChange={(value) => setShowActiveOnly(value === 'active')}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingItems && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando itens...</span>
            </div>
          )}
          
          {itemsError && (
            <div className="text-center py-12 text-destructive">
              <p>Erro ao carregar itens de estoque.</p>
              <p className="text-sm text-muted-foreground mt-1">Tente novamente mais tarde.</p>
            </div>
          )}
          
          {!loadingItems && !itemsError && <InventoryTabs tabs={tabs} />}
        </CardContent>
      </Card>

      {/* View Modal */}
      <ViewItemModal
        item={viewingItem}
        categories={categories}
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
      />

      {/* Edit Modal */}
      <EditItemModal
        item={editingItem}
        categories={categories}
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onItemUpdated={handleItemUpdated}
      />

      {/* Move Modal */}
      <MoveItemModal
        item={movingItem}
        open={!!movingItem}
        onOpenChange={(open) => !open && setMovingItem(null)}
        onItemMoved={handleItemMoved}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o item "{deletingItem?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}