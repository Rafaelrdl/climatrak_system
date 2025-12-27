import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  Type,
  Hash,
  List,
  Camera,
  Calendar,
  User,
  Tag,
  Edit,
  Copy,
} from 'lucide-react';
import { 
  ChecklistTemplate, 
  ChecklistItem, 
  ChecklistItemType,
  ChecklistCategory 
} from '@/models/checklist';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChecklistViewerProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: ChecklistTemplate | null;
  categories: ChecklistCategory[];
  onEdit?: (checklist: ChecklistTemplate) => void;
  onDuplicate?: (checklist: ChecklistTemplate) => void;
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

export function ChecklistViewer({
  isOpen,
  onClose,
  checklist,
  categories,
  onEdit,
  onDuplicate,
}: ChecklistViewerProps) {
  if (!checklist) return null;

  const category = checklist.category_id 
    ? categories.find(cat => cat.id === checklist.category_id)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 pr-4">
              <DialogTitle className="text-xl">{checklist.name}</DialogTitle>
              {checklist.description && (
                <DialogDescription className="text-base">
                  {checklist.description}
                </DialogDescription>
              )}
              
              <div className="flex flex-wrap gap-2 items-center pt-2">
                {category && (
                  <Badge variant="secondary" className="flex items-center gap-1.5">
                    {category.color && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    {category.name}
                  </Badge>
                )}
                
                {checklist.equipment_type && (
                  <Badge variant="outline">
                    <Tag className="h-3 w-3 mr-1" />
                    {checklist.equipment_type}
                  </Badge>
                )}
                
                <Badge 
                  variant={checklist.is_active ? 'default' : 'secondary'}
                  className={checklist.is_active ? 'bg-green-500' : ''}
                >
                  {checklist.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
                
                <Badge variant="secondary">
                  {checklist.items.length} {checklist.items.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Criado {formatDistanceToNow(new Date(checklist.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </div>
                {checklist.usage_count !== undefined && checklist.usage_count > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckSquare className="h-4 w-4" />
                    Usado em {checklist.usage_count} plano(s)
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 shrink-0">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(checklist)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              {onDuplicate && (
                <Button variant="outline" size="sm" onClick={() => onDuplicate(checklist)}>
                  <Copy className="h-4 w-4 mr-1" />
                  Duplicar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-medium">Itens do Checklist</h3>
            
            <div className="space-y-2">
              {checklist.items.map((item, index) => (
                <Card key={item.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Item Number */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
                        {index + 1}
                      </div>

                      {/* Item Content */}
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">{item.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Type Badge */}
                          <Badge variant="outline" className="text-xs">
                            {itemTypeIcons[item.type]}
                            <span className="ml-1">{itemTypeLabels[item.type]}</span>
                          </Badge>
                          
                          {/* Required Badge */}
                          {item.required && (
                            <Badge variant="secondary" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                          
                          {/* Unit for number type */}
                          {item.type === 'number' && item.unit && (
                            <Badge variant="outline" className="text-xs">
                              Unidade: {item.unit}
                            </Badge>
                          )}
                          
                          {/* Min/Max for number type */}
                          {item.type === 'number' && (item.min_value !== undefined || item.max_value !== undefined) && (
                            <Badge variant="outline" className="text-xs">
                              {item.min_value !== undefined && `Min: ${item.min_value}`}
                              {item.min_value !== undefined && item.max_value !== undefined && ' - '}
                              {item.max_value !== undefined && `Max: ${item.max_value}`}
                            </Badge>
                          )}
                        </div>

                        {/* Help Text */}
                        {item.help_text && (
                          <p className="text-sm text-muted-foreground italic">
                            💡 {item.help_text}
                          </p>
                        )}

                        {/* Options for select type */}
                        {item.type === 'select' && item.options && item.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            <span className="text-xs text-muted-foreground mr-1">Opções:</span>
                            {item.options.map((option, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {option.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
