import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import type { InventoryItem, InventoryCategory } from '@/models/inventory';
import { useCreateInventoryItem } from '@/hooks/useInventoryQuery';

interface NewItemModalProps {
  categories: InventoryCategory[];
  onItemCreated: (item: InventoryItem) => void;
  trigger?: React.ReactNode;
}

export function NewItemModal({ categories, onItemCreated, trigger }: NewItemModalProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateInventoryItem();
  
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
    quantity: 0,
    min_quantity: 0,
    max_quantity: undefined as number | undefined,
    unit_cost: 0,
    supplier: '',
    image: '',
    is_active: true,
    is_critical: false
  });

  const resetForm = () => {
    setFormData({
      name: '',
      manufacturer: '',
      code: '',
      description: '',
      category_id: '',
      unit: 'UN',
      location: '',
      shelf: '',
      bin: '',
      quantity: 0,
      min_quantity: 0,
      max_quantity: undefined,
      unit_cost: 0,
      supplier: '',
      image: '',
      is_active: true,
      is_critical: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.code.trim()) {
      toast.error('Código é obrigatório');
      return;
    }

    if (formData.min_quantity < 0) {
      toast.error('Quantidade mínima deve ser maior ou igual a 0');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      manufacturer: formData.manufacturer.trim(),
      code: formData.code.trim(),
      description: formData.description.trim(),
      category: formData.category_id ? Number(formData.category_id) : null,
      unit: formData.unit as any,
      location: formData.location.trim(),
      shelf: formData.shelf.trim(),
      bin: formData.bin.trim(),
      quantity: formData.quantity,
      min_quantity: formData.min_quantity,
      max_quantity: formData.max_quantity,
      unit_cost: formData.unit_cost,
      supplier: formData.supplier.trim(),
      image_url: formData.image.trim() || null,
      is_active: formData.is_active,
      is_critical: formData.is_critical
    }, {
      onSuccess: (data) => {
        toast.success('Item criado com sucesso!');
        setOpen(false);
        resetForm();
        // Map API response to frontend type
        onItemCreated({
          id: String(data.id),
          code: data.code,
          name: data.name,
          description: data.description,
          category_id: data.category ? String(data.category) : null,
          category_name: data.category_name,
          unit: data.unit,
          qty_on_hand: data.quantity,
          quantity: data.quantity,
          min_qty: data.min_quantity,
          minimum_quantity: data.min_quantity,
          reorder_point: data.reorder_point ?? data.min_quantity,
          location: data.location,
          location_name: [data.location, data.shelf, data.bin].filter(Boolean).join(' / '),
          shelf: data.shelf,
          bin: data.bin,
          supplier: data.supplier,
          unit_cost: data.unit_cost,
          is_active: data.is_active,
          is_critical: data.is_critical,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      },
      onError: (error: any) => {
        console.error('Error creating item:', error);
        toast.error(error.response?.data?.detail || 'Erro ao criar item');
      }
    });
  };

  const defaultTrigger = (
    <Button className="flex items-center gap-2">
      <Plus className="h-4 w-4" />
      Novo Item
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Item de Estoque</DialogTitle>
          <DialogDescription>
            Adicione um novo item ao inventário.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Filtro de Ar G4 - 610x610x48mm"
                required
              />
            </div>

            {/* Fabricante */}
            <div className="md:col-span-2">
              <Label htmlFor="manufacturer">Fabricante</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                placeholder="Ex: Siemens, WEG, Schneider"
              />
            </div>

            {/* Código */}
            <div>
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: FLT-001"
                required
              />
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="category">Categoria</Label>
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
              <Label htmlFor="unit">Unidade *</Label>
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

            {/* Quantidade Inicial */}
            <div>
              <Label htmlFor="quantity">Quantidade Inicial</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
              />
            </div>

            {/* Quantidade Mínima */}
            <div>
              <Label htmlFor="min-qty">Quantidade Mínima *</Label>
              <Input
                id="min-qty"
                type="number"
                min="0"
                value={formData.min_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, min_quantity: parseInt(e.target.value) || 0 }))}
                required
              />
            </div>

            {/* Quantidade Máxima */}
            <div>
              <Label htmlFor="max-qty">Quantidade Máxima</Label>
              <Input
                id="max-qty"
                type="number"
                min="0"
                value={formData.max_quantity || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, max_quantity: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="Opcional"
              />
            </div>

            {/* Custo Unitário */}
            <div>
              <Label htmlFor="unit-cost">Custo Unitário (R$)</Label>
              <Input
                id="unit-cost"
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
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Ex: Almoxarifado A"
              />
            </div>

            {/* Prateleira */}
            <div>
              <Label htmlFor="shelf">Prateleira</Label>
              <Input
                id="shelf"
                value={formData.shelf}
                onChange={(e) => setFormData(prev => ({ ...prev, shelf: e.target.value }))}
                placeholder="Ex: A1"
              />
            </div>

            {/* Posição */}
            <div>
              <Label htmlFor="bin">Posição</Label>
              <Input
                id="bin"
                value={formData.bin}
                onChange={(e) => setFormData(prev => ({ ...prev, bin: e.target.value }))}
                placeholder="Ex: 01"
              />
            </div>

            {/* Fornecedor */}
            <div>
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="Nome do fornecedor"
              />
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição detalhada do item"
              />
            </div>

            {/* URL da Imagem */}
            <div className="md:col-span-2">
              <Label htmlFor="image">URL da Imagem</Label>
              <Input
                id="image"
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
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked as boolean }))}
              />
              <Label htmlFor="is_active">Item ativo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_critical"
                checked={formData.is_critical}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_critical: checked as boolean }))}
              />
              <Label htmlFor="is_critical">Item crítico</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}