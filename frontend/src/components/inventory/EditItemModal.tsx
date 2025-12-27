import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { InventoryItem, InventoryCategory } from '@/models/inventory';
import { useUpdateInventoryItem } from '@/hooks/useInventoryQuery';

interface EditItemModalProps {
  item: InventoryItem | null;
  categories: InventoryCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdated: (item: InventoryItem) => void;
}

export function EditItemModal({ item, categories, open, onOpenChange, onItemUpdated }: EditItemModalProps) {
  const updateMutation = useUpdateInventoryItem();
  
  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    code: '',
    description: '',
    category_id: '',
    unit: 'UN',
    location: '',
    shelf: '',
    bin: '',
    min_quantity: 0,
    max_quantity: undefined as number | undefined,
    unit_cost: 0,
    supplier: '',
    image: '',
    is_active: true,
    is_critical: false
  });

  // Update form data when item changes or modal opens
  useEffect(() => {
    if (item && open) {
      setFormData({
        name: item.name,
        manufacturer: item.manufacturer || '',
        code: item.code || item.sku || '',
        description: item.description || '',
        category_id: item.category_id || '',
        unit: item.unit || 'UN',
        location: item.location || '',
        shelf: item.shelf || '',
        bin: item.bin || '',
        min_quantity: item.min_qty || item.minimum_quantity || 0,
        max_quantity: item.max_qty || item.maximum_quantity,
        unit_cost: item.unit_cost || 0,
        supplier: item.supplier || '',
        image: item.image_url || item.photo_url || '',
        is_active: item.is_active !== undefined ? item.is_active : true,
        is_critical: item.is_critical || false
      });
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) return;
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    updateMutation.mutate({
      id: Number(item.id),
      data: {
        name: formData.name.trim(),
        manufacturer: formData.manufacturer.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
        category: formData.category_id ? Number(formData.category_id) : null,
        unit: formData.unit as any,
        location: formData.location.trim(),
        shelf: formData.shelf.trim(),
        bin: formData.bin.trim(),
        min_quantity: formData.min_quantity,
        max_quantity: formData.max_quantity,
        unit_cost: formData.unit_cost,
        supplier: formData.supplier.trim(),
        image_url: formData.image.trim() || null,
        is_active: formData.is_active,
        is_critical: formData.is_critical
      }
    }, {
      onSuccess: (data) => {
        toast.success('Item atualizado com sucesso!');
        onOpenChange(false);
        // Map API response to frontend type
        onItemUpdated({
          ...item,
          name: data.name,
          code: data.code,
          description: data.description,
          category_id: data.category ? String(data.category) : null,
          category_name: data.category_name,
          unit: data.unit,
          min_qty: data.min_quantity,
          minimum_quantity: data.min_quantity,
          max_qty: data.max_quantity ?? undefined,
          maximum_quantity: data.max_quantity ?? undefined,
          reorder_point: data.reorder_point ?? data.min_quantity,
          location: data.location,
          location_name: [data.location, data.shelf, data.bin].filter(Boolean).join(' / '),
          shelf: data.shelf,
          bin: data.bin,
          supplier: data.supplier,
          unit_cost: data.unit_cost,
          is_active: data.is_active,
          is_critical: data.is_critical,
          updated_at: data.updated_at,
        });
      },
      onError: (error: any) => {
        console.error('Error updating item:', error);
        toast.error(error.response?.data?.detail || 'Erro ao atualizar item');
      }
    });
  };

  if (!item) return null;

  const currentQty = item.qty_on_hand ?? item.quantity ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Item de Estoque</DialogTitle>
          <DialogDescription>
            Edite as informações do item. Para alterar a quantidade, use a função "Movimentar".
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Filtro de Ar G4 - 610x610x48mm"
                required
              />
            </div>

            {/* Fabricante */}
            <div className="md:col-span-2">
              <Label htmlFor="edit-manufacturer">Fabricante</Label>
              <Input
                id="edit-manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                placeholder="Ex: Siemens, WEG, Schneider"
              />
            </div>

            {/* Código */}
            <div>
              <Label htmlFor="edit-code">Código</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: FLT-001"
              />
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unidade */}
            <div>
              <Label htmlFor="edit-unit">Unidade</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">Unidade</SelectItem>
                  <SelectItem value="PC">Peça</SelectItem>
                  <SelectItem value="M">Metro</SelectItem>
                  <SelectItem value="KG">Quilograma</SelectItem>
                  <SelectItem value="L">Litro</SelectItem>
                  <SelectItem value="CX">Caixa</SelectItem>
                  <SelectItem value="PCT">Pacote</SelectItem>
                  <SelectItem value="JG">Jogo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estoque Atual (readonly) */}
            <div>
              <Label>Estoque Atual</Label>
              <div className="flex items-center gap-2 h-10 px-3 bg-muted rounded-md">
                <span className="font-medium">{currentQty}</span>
                <span className="text-muted-foreground">{item.unit}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use "Movimentar" para alterar quantidade
              </p>
            </div>

            {/* Quantidade Mínima */}
            <div>
              <Label htmlFor="edit-min-qty">Quantidade Mínima *</Label>
              <Input
                id="edit-min-qty"
                type="number"
                min="0"
                value={formData.min_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, min_quantity: parseInt(e.target.value) || 0 }))}
                required
              />
            </div>

            {/* Quantidade Máxima */}
            <div>
              <Label htmlFor="edit-max-qty">Quantidade Máxima</Label>
              <Input
                id="edit-max-qty"
                type="number"
                min="0"
                value={formData.max_quantity || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, max_quantity: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="Opcional"
              />
            </div>

            {/* Custo Unitário */}
            <div>
              <Label htmlFor="edit-unit-cost">Custo Unitário (R$)</Label>
              <Input
                id="edit-unit-cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                placeholder="0,00"
              />
            </div>

            {/* Local */}
            <div>
              <Label htmlFor="edit-location">Local</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Ex: Almoxarifado A"
              />
            </div>

            {/* Prateleira */}
            <div>
              <Label htmlFor="edit-shelf">Prateleira</Label>
              <Input
                id="edit-shelf"
                value={formData.shelf}
                onChange={(e) => setFormData(prev => ({ ...prev, shelf: e.target.value }))}
                placeholder="Ex: A1"
              />
            </div>

            {/* Posição */}
            <div>
              <Label htmlFor="edit-bin">Posição</Label>
              <Input
                id="edit-bin"
                value={formData.bin}
                onChange={(e) => setFormData(prev => ({ ...prev, bin: e.target.value }))}
                placeholder="Ex: 01"
              />
            </div>

            {/* Fornecedor */}
            <div>
              <Label htmlFor="edit-supplier">Fornecedor</Label>
              <Input
                id="edit-supplier"
                value={formData.supplier}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="Nome do fornecedor"
              />
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição detalhada do item"
              />
            </div>

            {/* URL da Imagem */}
            <div className="md:col-span-2">
              <Label htmlFor="edit-image">URL da Imagem</Label>
              <Input
                id="edit-image"
                type="url"
                value={formData.image}
                onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cole o link de uma imagem do item (opcional)
              </p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked as boolean }))}
              />
              <Label htmlFor="edit-is_active">Item ativo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is_critical"
                checked={formData.is_critical}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_critical: checked as boolean }))}
              />
              <Label htmlFor="edit-is_critical">Item crítico</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Atualizar Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}