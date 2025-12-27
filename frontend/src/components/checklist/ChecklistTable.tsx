import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  CheckSquare,
  ListChecks,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { ChecklistTemplate, ChecklistCategory } from '@/models/checklist';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChecklistTableProps {
  checklists: ChecklistTemplate[];
  categories: ChecklistCategory[];
  onView: (checklist: ChecklistTemplate) => void;
  onEdit: (checklist: ChecklistTemplate) => void;
  onDuplicate: (checklist: ChecklistTemplate) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function ChecklistTable({
  checklists,
  categories,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
}: ChecklistTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<ChecklistTemplate | null>(null);

  const getCategoryById = (id: string | null | undefined) => {
    if (!id) return null;
    return categories.find(cat => cat.id === id);
  };

  const handleDeleteClick = (checklist: ChecklistTemplate) => {
    setChecklistToDelete(checklist);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (checklistToDelete) {
      onDelete(checklistToDelete.id);
    }
    setDeleteDialogOpen(false);
    setChecklistToDelete(null);
  };

  if (checklists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Lista de Checklists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ListChecks className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum checklist encontrado</h3>
            <p className="text-muted-foreground">
              Crie seu primeiro checklist para padronizar as manutenções preventivas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Lista de Checklists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full" role="grid" aria-label="Lista de checklists">
              <thead>
                <tr className="border-b">
                  <th scope="col" className="text-left p-4 font-medium text-muted-foreground">
                    Checklist
                  </th>
                  <th scope="col" className="text-left p-4 font-medium text-muted-foreground">
                    Categoria
                  </th>
                  <th scope="col" className="text-left p-4 font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CheckSquare className="h-4 w-4" />
                      Itens
                    </div>
                  </th>
                  <th scope="col" className="text-left p-4 font-medium text-muted-foreground">
                    Atualizado
                  </th>
                  <th scope="col" className="text-center p-4 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th scope="col" className="text-center p-4 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {checklists.map((checklist) => {
                  const category = getCategoryById(checklist.category_id);
                  const totalItems = checklist.items.length;
                  
                  return (
                    <tr
                      key={checklist.id}
                      className={cn(
                        "border-b hover:bg-muted/50 transition-colors",
                        !checklist.is_active && "opacity-60"
                      )}
                    >
                      {/* Nome e Descrição */}
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-sm">
                            {checklist.name}
                          </p>
                          {checklist.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {checklist.description}
                            </p>
                          )}
                        </div>
                      </td>
                      
                      {/* Categoria */}
                      <td className="p-4">
                        {category ? (
                          <div 
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${category.color}15`,
                              color: category.color,
                              border: `1px solid ${category.color}30`
                            }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      
                      {/* Itens */}
                      <td className="p-4">
                        <span className="text-sm">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
                      </td>
                      
                      {/* Atualizado */}
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {checklist.updated_at ? formatDistanceToNow(new Date(checklist.updated_at), {
                            addSuffix: false,
                            locale: ptBR,
                          }) : '-'}
                        </span>
                      </td>
                      
                      {/* Status com Switch */}
                      <td className="p-4">
                        <div className="flex justify-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Switch
                                  checked={checklist.is_active}
                                  onCheckedChange={(checked) => onToggleActive(checklist.id, checked)}
                                  className="data-[state=checked]:bg-green-500"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {checklist.is_active ? 'Clique para desativar' : 'Clique para ativar'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      
                      {/* Ações */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => onView(checklist)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Visualizar detalhes</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Mais ações</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => onEdit(checklist)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onDuplicate(checklist)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(checklist)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Excluir Checklist
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Tem certeza que deseja excluir o checklist <strong>"{checklistToDelete?.name}"</strong>?
              </span>
              {(checklistToDelete?.usage_count ?? 0) > 0 && (
                <span className="flex items-center gap-2 mt-3 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
                  <Sparkles className="h-4 w-4 flex-shrink-0" />
                  Este checklist está vinculado a {checklistToDelete?.usage_count} plano(s) de manutenção.
                </span>
              )}
              <span className="block text-xs mt-2">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
