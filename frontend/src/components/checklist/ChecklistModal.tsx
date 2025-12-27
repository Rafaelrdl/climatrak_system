import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  HelpCircle,
  CheckSquare,
  Type,
  Hash,
  List,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ChecklistTemplate, 
  ChecklistItem, 
  ChecklistItemType,
  ChecklistCategory 
} from '@/models/checklist';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (checklist: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>) => void;
  categories: ChecklistCategory[];
  checklist?: ChecklistTemplate; // Para edição
}

const itemTypeIcons: Record<ChecklistItemType, React.ReactNode> = {
  checkbox: <CheckSquare className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  photo: <Camera className="h-4 w-4" />,
};

const itemTypeLabels: Record<ChecklistItemType, string> = {
  checkbox: 'Checkbox',
  text: 'Texto',
  number: 'Número',
  select: 'Seleção',
  photo: 'Foto',
};

const equipmentTypes = [
  'Split',
  'Multi-Split',
  'Chiller',
  'Fancoil',
  'Self-Contained',
  'VRF/VRV',
  'Torre de Resfriamento',
  'Bomba',
  'Ventilador',
  'Exaustor',
  'Compressor',
  'Quadro Elétrico',
  'Gerador',
  'UPS/Nobreak',
  'Outro',
];

export function ChecklistModal({
  isOpen,
  onClose,
  onSave,
  categories,
  checklist,
}: ChecklistModalProps) {
  const isEditing = !!checklist;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: null as string | null,
    equipment_type: '',
    is_active: true,
  });

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemDescription, setNewItemDescription] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (checklist) {
        setFormData({
          name: checklist.name,
          description: checklist.description || '',
          category_id: checklist.category_id || null,
          equipment_type: checklist.equipment_type || '',
          is_active: checklist.is_active,
        });
        setItems([...checklist.items]);
      } else {
        setFormData({
          name: '',
          description: '',
          category_id: null,
          equipment_type: '',
          is_active: true,
        });
        setItems([]);
      }
      setNewItemDescription('');
    }
  }, [isOpen, checklist]);

  const handleAddItem = () => {
    if (!newItemDescription.trim()) {
      toast.error('Digite a descrição do item');
      return;
    }

    const newItem: ChecklistItem = {
      id: uuidv4(),
      order: items.length + 1,
      description: newItemDescription.trim(),
      type: 'checkbox',
      required: true,
    };

    setItems([...items, newItem]);
    setNewItemDescription('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id).map((item, index) => ({
      ...item,
      order: index + 1,
    })));
  };

  const handleUpdateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return;
    }

    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    // Update order
    setItems(newItems.map((item, i) => ({ ...item, order: i + 1 })));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Nome do checklist é obrigatório');
      return;
    }

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao checklist');
      return;
    }

    onSave({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category_id: formData.category_id,
      equipment_type: formData.equipment_type || undefined,
      is_active: formData.is_active,
      items,
    });

    onClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      category_id: null,
      equipment_type: '',
      is_active: true,
    });
    setItems([]);
    setNewItemDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>
            {isEditing ? 'Editar Checklist' : 'Novo Checklist'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize as informações e itens do checklist'
              : 'Crie um checklist para vincular aos planos de manutenção preventiva'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Checklist *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Preventiva Split - Limpeza"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment_type">Tipo de Equipamento</Label>
                <Select
                  value={formData.equipment_type || 'none'}
                  onValueChange={(value) => 
                    setFormData({ ...formData, equipment_type: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum específico</SelectItem>
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category_id || 'none'}
                  onValueChange={(value) => 
                    setFormData({ ...formData, category_id: value === 'none' ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          {category.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="status"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="status" className="font-normal">
                    {formData.is_active ? 'Ativo' : 'Inativo'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo e quando este checklist deve ser utilizado..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <Separator />

            {/* Checklist Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Itens do Checklist</h3>
                  <p className="text-sm text-muted-foreground">
                    Adicione as tarefas que o técnico deve executar
                  </p>
                </div>
                <Badge variant="secondary">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>

              {/* Add Item Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Digite a descrição do item (ex: Limpar filtros de ar)"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={handleAddItem} variant="secondary">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {/* Items List */}
              {items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <Card key={item.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Drag Handle */}
                          <div className="flex flex-col gap-1 pt-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMoveItem(index, 'up')}
                              disabled={index === 0}
                            >
                              <GripVertical className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Item Number */}
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0 mt-1">
                            {item.order}
                          </div>

                          {/* Item Content */}
                          <div className="flex-1 space-y-2">
                            <Input
                              value={item.description}
                              onChange={(e) => 
                                handleUpdateItem(item.id, { description: e.target.value })
                              }
                              className="font-medium"
                            />

                            <div className="flex flex-wrap items-center gap-4">
                              {/* Item Type */}
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground">Tipo:</Label>
                                <Select
                                  value={item.type}
                                  onValueChange={(value: ChecklistItemType) => 
                                    handleUpdateItem(item.id, { type: value })
                                  }
                                >
                                  <SelectTrigger className="h-8 w-[130px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(itemTypeLabels) as ChecklistItemType[]).map((type) => (
                                      <SelectItem key={type} value={type}>
                                        <div className="flex items-center gap-2">
                                          {itemTypeIcons[type]}
                                          {itemTypeLabels[type]}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Required Toggle */}
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`required-${item.id}`}
                                  checked={item.required}
                                  onCheckedChange={(checked) => 
                                    handleUpdateItem(item.id, { required: checked })
                                  }
                                  className="h-5 w-9"
                                />
                                <Label 
                                  htmlFor={`required-${item.id}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Obrigatório
                                </Label>
                              </div>

                              {/* Unit for number type */}
                              {item.type === 'number' && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground">Unidade:</Label>
                                  <Input
                                    value={item.unit || ''}
                                    onChange={(e) => 
                                      handleUpdateItem(item.id, { unit: e.target.value })
                                    }
                                    placeholder="°C, bar, A..."
                                    className="h-8 w-20"
                                  />
                                </div>
                              )}

                              {/* Help Text */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Adicionar texto de ajuda para o técnico</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">
                    Nenhum item adicionado. Digite acima para adicionar itens ao checklist.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? 'Salvar Alterações' : 'Criar Checklist'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
