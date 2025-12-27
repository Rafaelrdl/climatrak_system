import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Checkbox } from '@/components/ui/checkbox';
import { 
  ClipboardList, 
  CalendarClock, 
  Wrench, 
  Building, 
  Package, 
  AlertTriangle, 
  Plus, 
  Trash2,
  Save,
  X,
  Calendar,
  User,
  Tag,
  MapPin,
  Circle,
  FileText,
  Camera,
  Upload,
  ClipboardCheck,
  Loader2
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { useCompanies, useSectors } from '@/hooks/useLocationsQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useStockItems } from '@/hooks/useInventoryQuery';
import { useTechnicians } from '@/hooks/useTeamQuery';
import { useWorkOrder } from '@/hooks/useWorkOrdersQuery';
import { printWorkOrder } from '@/utils/printWorkOrder';
import { workOrdersService } from '@/services/workOrdersService';
import type { WorkOrder, WorkOrderStockItem, ChecklistResponse, UploadedPhoto, StockItem } from '@/types';
import type { ApiInventoryItem } from '@/types/api';
import { cn } from '@/lib/utils';

// Mapper
const mapToStockItem = (item: ApiInventoryItem): StockItem => ({
  id: String(item.id),
  code: item.code,
  description: item.name,
  unit: item.unit_display || item.unit,
  quantity: item.quantity,
  minimum: item.min_quantity,
  maximum: item.max_quantity ?? 0
});

interface WorkOrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  onSave: (updatedWorkOrder: WorkOrder) => void;
}

interface StockItemRequest {
  id: string;
  stockItemId: string;
  name: string;
  quantity: number;
  unit: string;
}

// Componente para exibir o equipamento selecionado no trigger do Select
function EquipmentSelectDisplay({ equipmentId, equipment }: { 
  equipmentId: string | undefined;
  equipment: any[];
}) {
  if (!equipmentId) return null;
  
  const eq = equipment.find(e => e.id === equipmentId);
  if (!eq) return null;
  
  return (
    <div className="truncate flex-1 py-0.5">
      <div className="font-medium truncate">{eq.tag}</div>
      <div className="text-xs text-muted-foreground truncate">
        {eq.brand} {eq.model} • {eq.type}
      </div>
    </div>
  );
}

export function WorkOrderEditModal({
  isOpen,
  onClose,
  workOrder,
  onSave
}: WorkOrderEditModalProps) {
  // Buscar detalhes completos da ordem de serviço
  const { data: workOrderDetails, isLoading: isLoadingDetails } = useWorkOrder(
    isOpen && workOrder?.id ? workOrder.id : null
  );
  
  // Usar os dados detalhados se disponíveis, senão usar os dados passados como prop
  const currentWorkOrder = workOrderDetails || workOrder;
  
  // Estados e hooks
  const [formData, setFormData] = useState<Partial<WorkOrder>>({});
  const [activeTab, setActiveTab] = useState("details");
  const [selectedStockItems, setSelectedStockItems] = useState<StockItemRequest[]>([]);
  const [originalStockItems, setOriginalStockItems] = useState<StockItemRequest[]>([]); // Itens originais para comparação
  const [stockItemForm, setStockItemForm] = useState({ stockItemId: '', quantity: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]); // Fotos a serem deletadas no backend
  const [checklistResponses, setChecklistResponses] = useState<ChecklistResponse[]>([]);
  const [executionDescription, setExecutionDescription] = useState('');
  
  const { data: equipment = [] } = useEquipments();
  const { data: sectors = [] } = useSectors();
  const { data: companies = [] } = useCompanies();
  const { data: stockItemsData } = useStockItems();
  // Garantir que stockItemsData seja um array (pode vir como objeto paginado em alguns casos)
  const stockItemsArray = Array.isArray(stockItemsData) 
    ? stockItemsData 
    : (stockItemsData as any)?.results || [];
  const stockItems = stockItemsArray.map(mapToStockItem);
  
  // Lista de técnicos da API
  const { data: technicians = [] } = useTechnicians();
  
  // Simulação do hook de autenticação - substituir pela implementação real
  const user = { name: 'Usuário Atual', role: 'ADMIN' }; // Placeholder
  const canEditDetails = user.role === 'ADMIN';
  const canEditExecution = true; // Tanto admin quanto técnico podem editar execução

  // Função para imprimir a ordem de serviço
  const handlePrintWorkOrder = () => {
    if (!currentWorkOrder) return;
    
    printWorkOrder({
      workOrder: { ...currentWorkOrder, ...formData } as WorkOrder,
      equipment,
      sectors,
      companies
    });
  };
  
  // Carregar dados da ordem de serviço quando abrir o modal ou quando os detalhes carregarem
  useEffect(() => {
    // Aguardar enquanto carrega os detalhes
    if (isLoadingDetails) return;
    
    if (currentWorkOrder && isOpen) {
      setFormData({ ...currentWorkOrder });
      
      // Converter WorkOrderStockItem[] para StockItemRequest[]
      const stockItemRequests: StockItemRequest[] = (currentWorkOrder.stockItems || []).map(item => ({
        id: item.id,
        stockItemId: item.stockItemId,
        name: item.itemName || item.stockItem?.description || `Item ${item.stockItemId}`,
        quantity: item.quantity,
        unit: item.unit || item.stockItem?.unit || 'un'
      }));
      
      setSelectedStockItems(stockItemRequests);
      setOriginalStockItems(stockItemRequests); // Salvar itens originais para comparação
      setUploadedPhotos(currentWorkOrder.photos || []);
      
      // Se for ordem preventiva sem checklist, criar um exemplo
      const defaultChecklist: ChecklistResponse[] = currentWorkOrder.type === 'PREVENTIVE' && (!currentWorkOrder.checklistResponses || currentWorkOrder.checklistResponses.length === 0) ? [
        {
          taskId: 'task-1',
          taskName: 'Inspeção Visual do Equipamento',
          completed: false,
          observations: '',
          checkItems: [
            { id: 'check-1', description: 'Verificar ruídos anormais', checked: false },
            { id: 'check-2', description: 'Verificar vazamentos', checked: false },
            { id: 'check-3', description: 'Verificar condição das mangueiras', checked: false }
          ]
        },
        {
          taskId: 'task-2',
          taskName: 'Limpeza e Manutenção',
          completed: false,
          observations: '',
          checkItems: [
            { id: 'check-4', description: 'Limpar filtros', checked: false },
            { id: 'check-5', description: 'Verificar pressão do sistema', checked: false },
            { id: 'check-6', description: 'Lubrificar componentes', checked: false }
          ]
        }
      ] : (currentWorkOrder.checklistResponses || []);
      
      setChecklistResponses(defaultChecklist);
      setExecutionDescription(currentWorkOrder.executionDescription || '');
      setActiveTab("details");
      setErrors({});
    }
  }, [currentWorkOrder, isOpen, isLoadingDetails]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({});
      setSelectedStockItems([]);
      setStockItemForm({ stockItemId: '', quantity: 1 });
      setActiveTab("details");
      setErrors({});
      setNewPhotoFiles(new Map());
      setDeletedPhotoIds([]); // Limpar fotos marcadas para deletar
      setOriginalStockItems([]); // Limpar itens originais
    }
  }, [isOpen]);

  // Validação do formulário
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.type) newErrors.type = 'Tipo de ordem é obrigatório';
    if (!formData.priority) newErrors.priority = 'Prioridade é obrigatória';
    if (!formData.description) newErrors.description = 'Descrição é obrigatória';
    if (!formData.equipmentId) newErrors.equipmentId = 'Equipamento é obrigatório';
    if (!formData.status) newErrors.status = 'Status é obrigatório';
    
    // Validações específicas para status concluído
    if (formData.status === 'COMPLETED') {
      if (!formData.completedAt) {
        newErrors.completedAt = 'Data de conclusão é obrigatória para ordens concluídas';
      } else {
        const completedDate = new Date(formData.completedAt);
        
        // Validar se a data de conclusão não é anterior à data de criação
        if (formData.createdAt) {
          const createdDate = new Date(formData.createdAt);
          if (completedDate < createdDate) {
            newErrors.completedAt = 'Data de conclusão não pode ser anterior à data de criação';
          }
        }
        
        // Validar se a data de conclusão não é anterior à data programada
        if (formData.scheduledDate) {
          const scheduledDate = new Date(formData.scheduledDate);
          if (completedDate < scheduledDate) {
            newErrors.completedAt = 'Data de conclusão não pode ser anterior à data programada';
          }
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Referência para input de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para guardar arquivos de fotos novas para upload
  const [newPhotoFiles, setNewPhotoFiles] = useState<Map<string, File>>(new Map());

  // Manipuladores de eventos
  // Upload de fotos
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const photoId = `photo-${Date.now()}-${Math.random()}`;
          const newPhoto: UploadedPhoto = {
            id: photoId,
            url: e.target?.result as string,
            name: file.name,
            uploadedAt: new Date().toISOString(),
            uploadedBy: user?.name || 'Usuário'
          };
          setUploadedPhotos(prev => [...prev, newPhoto]);
          // Guardar o arquivo original para upload posterior
          setNewPhotoFiles(prev => new Map(prev).set(photoId, file));
        };
        reader.readAsDataURL(file);
      }
    });

    // Limpar input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Remover foto
  const removePhoto = (photoId: string) => {
    // Se for uma foto existente no backend (não começa com 'photo-'), marcar para deletar
    if (!photoId.startsWith('photo-')) {
      setDeletedPhotoIds(prev => [...prev, photoId]);
    }
    
    setUploadedPhotos(prev => prev.filter(photo => photo.id !== photoId));
    // Remover arquivo do mapa de novos arquivos
    setNewPhotoFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(photoId);
      return newMap;
    });
  };

  const handleSave = async () => {
    if (!formData || !workOrder) return;
    
    if (!validateForm()) {
      setActiveTab("details");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Deletar fotos marcadas para remoção
      for (const photoId of deletedPhotoIds) {
        try {
          await workOrdersService.deletePhoto(workOrder.id, photoId);
        } catch (error) {
          console.error('Erro ao deletar foto:', error);
        }
      }
      
      // Upload de fotos novas para o backend
      const uploadedNewPhotos: UploadedPhoto[] = [];
      for (const [photoId, file] of newPhotoFiles.entries()) {
        try {
          const uploadedPhoto = await workOrdersService.uploadPhoto(workOrder.id, file, file.name);
          uploadedNewPhotos.push(uploadedPhoto);
        } catch (error) {
          console.error('Erro ao fazer upload da foto:', error);
        }
      }
      
      // Gerenciar itens de estoque - identificar adições e remoções
      const originalIds = new Set(originalStockItems.map(i => i.stockItemId));
      const currentIds = new Set(selectedStockItems.map(i => i.stockItemId));
      
      // Itens a remover (existiam originalmente mas não existem mais)
      const itemsToRemove = originalStockItems.filter(item => !currentIds.has(item.stockItemId));
      for (const item of itemsToRemove) {
        try {
          await workOrdersService.removeStockItem(workOrder.id, item.id);
        } catch (error) {
          console.error('Erro ao remover item de estoque:', error);
        }
      }
      
      // Itens a adicionar (não existiam originalmente)
      const itemsToAdd = selectedStockItems.filter(item => !originalIds.has(item.stockItemId));
      for (const item of itemsToAdd) {
        try {
          await workOrdersService.addStockItem(workOrder.id, item.stockItemId, item.quantity);
        } catch (error) {
          console.error('Erro ao adicionar item de estoque:', error);
        }
      }

      // Fotos existentes (que já estavam no backend) + novas uploadadas
      const existingPhotos = uploadedPhotos.filter(p => !p.id.startsWith('photo-'));
      const allPhotos = [...existingPhotos, ...uploadedNewPhotos];

      // Combina os dados do formulário
      const updatedWorkOrder: WorkOrder = {
        ...workOrder,
        ...formData,
        stockItems: selectedStockItems.map(item => ({
          id: item.id,
          workOrderId: workOrder.id,
          stockItemId: item.stockItemId,
          quantity: item.quantity,
          stockItem: stockItems.find(si => si.id === item.stockItemId)
        })),
        executionDescription,
        photos: allPhotos,
        checklistResponses,
      };
      
      onSave(updatedWorkOrder);
      setNewPhotoFiles(new Map()); // Limpar arquivos após salvar
      setDeletedPhotoIds([]); // Limpar lista de fotos deletadas
      setOriginalStockItems(selectedStockItems); // Atualizar itens originais
      onClose();
    } catch (error) {
      console.error('Erro ao salvar ordem de serviço:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const addStockItem = () => {
    if (!stockItemForm.stockItemId) return;
    
    const stockItem = stockItems.find(si => si.id === stockItemForm.stockItemId);
    
    if (stockItem) {
      const newStockItemRequest: StockItemRequest = {
        id: `${stockItem.id}-${Date.now()}`,
        stockItemId: stockItem.id,
        name: stockItem.description,
        quantity: stockItemForm.quantity,
        unit: stockItem.unit
      };
      
      setSelectedStockItems(prev => [...prev, newStockItemRequest]);
      setStockItemForm({ stockItemId: '', quantity: 1 });
    }
  };

  const removeStockItem = (id: string) => {
    setSelectedStockItems(prev => prev.filter(item => item.id !== id));
  };

  const availableStockItems = stockItems.filter(
    si => !selectedStockItems.some(selected => selected.stockItemId === si.id)
  );

  if (!workOrder) return null;

  // Encontrar o equipamento selecionado para mostrar informações relacionadas
  const selectedEquipment = equipment.find(eq => eq.id === formData.equipmentId);
  const selectedSector = selectedEquipment 
    ? sectors.find(s => s.id === selectedEquipment.sectorId) 
    : null;
  const selectedCompany = selectedSector 
    ? companies.find(c => c.id === selectedSector.companyId) 
    : null;

  // Helper para obter cor da prioridade
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-blue-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-orange-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Helper para obter label da prioridade
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'Baixa';
      case 'MEDIUM': return 'Média';
      case 'HIGH': return 'Alta';
      case 'CRITICAL': return 'Crítica';
      default: return priority;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Header - Fixed */}
        <DialogHeader className="px-6 py-4 border-b bg-background shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Editar Ordem de Serviço
                </DialogTitle>
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
                  formData.status === 'OPEN' && "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                  formData.status === 'IN_PROGRESS' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
                  formData.status === 'COMPLETED' && "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    formData.status === 'OPEN' && "bg-blue-500",
                    formData.status === 'IN_PROGRESS' && "bg-yellow-500",
                    formData.status === 'COMPLETED' && "bg-green-500"
                  )} />
                  {formData.status === 'OPEN' && 'Aberta'}
                  {formData.status === 'IN_PROGRESS' && 'Em Andamento'}
                  {formData.status === 'COMPLETED' && 'Concluída'}
                </div>
              </div>
              
              {/* Botão de Impressão reposicionado */}
              <Button 
                variant="outline" 
                onClick={handlePrintWorkOrder}
                className="mr-8" 
                title="Imprimir ordem de serviço"
              >
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
            </div>
            <DialogDescription className="mt-2">
              OS #{workOrder.number} - Atualize as informações necessárias
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Loading indicator while fetching details */}
        {isLoadingDetails && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Carregando detalhes...</span>
            </div>
          </div>
        )}

        {/* Content - Scrollable */}
        {!isLoadingDetails && (
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start px-6 py-0 h-12 bg-muted/50 rounded-none border-b shrink-0">
              <TabsTrigger 
                value="details" 
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <ClipboardList className="h-4 w-4" />
                <span>Detalhes</span>
                {Object.keys(errors).length > 0 && (
                  <span className="h-5 w-5 bg-destructive rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-3 w-3 text-white" />
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="materials" 
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <Package className="h-4 w-4" />
                <span>Materiais</span>
                {selectedStockItems.length > 0 && (
                  <span className="h-5 w-5 bg-secondary rounded-full flex items-center justify-center text-xs font-medium">
                    {selectedStockItems.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="execution" 
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <Wrench className="h-4 w-4" />
                <span>Execução</span>
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1">
              <div className="p-6">
                {/* Aba de Detalhes */}
                {canEditDetails && (
                  <TabsContent value="details" className="mt-0">
                    <ScrollArea className="h-[60vh] pr-4">
                      <div className="space-y-6">
                        {/* Card 1: Informações Principais - Compactado */}
                        <div className="rounded-lg border bg-card">
                          <div className="px-4 py-3 border-b bg-muted/50">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                              <ClipboardList className="h-4 w-4 text-muted-foreground" />
                              Informações da Ordem
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {/* Linha 1: Tipo, Prioridade e Status - Grid de 3 colunas */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Tipo de Ordem */}
                              <div className="space-y-2">
                                <Label htmlFor="workOrderType" className="text-xs font-medium">
                                  Tipo de Ordem <span className="text-destructive">*</span>
                                </Label>
                                <Select 
                                  value={formData.type || ''} 
                                  onValueChange={(value) => {
                                    setFormData(prev => ({ ...prev, type: value as WorkOrder['type'] }));
                                    if (errors.type) setErrors(prev => ({ ...prev, type: '' }));
                                  }}
                                  disabled={formData.type === 'REQUEST'}
                                >
                                  <SelectTrigger className={cn(
                                    "h-9",
                                    errors.type && "border-destructive focus:ring-destructive",
                                    formData.type === 'REQUEST' && "bg-muted cursor-not-allowed"
                                  )}>
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CORRECTIVE">
                                      <div className="flex items-center gap-2">
                                        <Wrench className="h-3.5 w-3.5" />
                                        <span>Corretiva</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="PREVENTIVE">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>Preventiva</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="REQUEST">
                                      <div className="flex items-center gap-2">
                                        <ClipboardList className="h-3.5 w-3.5" />
                                        <span>Solicitação</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {formData.type === 'REQUEST' && (
                                  <p className="text-xs text-muted-foreground">
                                    Tipo não editável (originada de solicitação)
                                  </p>
                                )}
                                {errors.type && (
                                  <p className="text-xs text-destructive mt-1">{errors.type}</p>
                                )}
                              </div>
                              
                              {/* Prioridade */}
                              <div className="space-y-2">
                                <Label htmlFor="workOrderPriority" className="text-xs font-medium">
                                  Prioridade <span className="text-destructive">*</span>
                                </Label>
                                <Select 
                                  value={formData.priority || ''} 
                                  onValueChange={(value) => {
                                    setFormData(prev => ({ ...prev, priority: value as WorkOrder['priority'] }));
                                    if (errors.priority) setErrors(prev => ({ ...prev, priority: '' }));
                                  }}
                                >
                                  <SelectTrigger className={cn(
                                    "h-9",
                                    errors.priority && "border-destructive focus:ring-destructive"
                                  )}>
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((priority) => (
                                      <SelectItem key={priority} value={priority}>
                                        <div className="flex items-center gap-2">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            getPriorityColor(priority)
                                          )} />
                                          <span className="text-sm">{getPriorityLabel(priority)}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {errors.priority && (
                                  <p className="text-xs text-destructive mt-1">{errors.priority}</p>
                                )}
                              </div>

                              {/* Status */}
                              <div className="space-y-2">
                                <Label htmlFor="workOrderStatus" className="text-xs font-medium">
                                  Status <span className="text-destructive">*</span>
                                </Label>
                                <Select 
                                  value={formData.status || ''} 
                                  onValueChange={(value) => {
                                    setFormData(prev => ({ ...prev, status: value as WorkOrder['status'] }));
                                    if (errors.status) setErrors(prev => ({ ...prev, status: '' }));
                                  }}
                                >
                                  <SelectTrigger className={cn(
                                    "h-9",
                                    errors.status && "border-destructive focus:ring-destructive"
                                  )}>
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="OPEN">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                        <span className="text-sm">Aberta</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="IN_PROGRESS">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        <span className="text-sm">Em Progresso</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="COMPLETED">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-sm">Concluída</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {errors.status && (
                                  <p className="text-xs text-destructive mt-1">{errors.status}</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Descrição - Campo completo */}
                            <div className="space-y-2">
                              <Label htmlFor="workOrderDescription" className="text-xs font-medium">
                                Descrição do Serviço <span className="text-destructive">*</span>
                              </Label>
                              <Textarea 
                                id="workOrderDescription"
                                value={formData.description || ''} 
                                onChange={(e) => {
                                  setFormData(prev => ({ ...prev, description: e.target.value }));
                                  if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                                }}
                                placeholder="Descreva detalhadamente o problema ou trabalho a ser realizado..."
                                rows={3}
                                className={cn(
                                  "resize-none text-sm",
                                  errors.description && "border-destructive focus:ring-destructive"
                                )}
                              />
                              {errors.description && (
                                <p className="text-xs text-destructive mt-1">{errors.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Card 2: Agendamento e Responsável - Compactado */}
                        <div className="rounded-lg border bg-card">
                          <div className="px-4 py-3 border-b bg-muted/50">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                              <CalendarClock className="h-4 w-4 text-muted-foreground" />
                              Agendamento e Atribuição
                            </h3>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Data Programada */}
                              <div className="space-y-2">
                                <Label htmlFor="scheduledDate" className="text-xs font-medium flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Data Programada
                                </Label>
                                <DatePicker
                                  date={formData.scheduledDate ? new Date(formData.scheduledDate) : undefined}
                                  setDate={(date) => {
                                    setFormData(prev => ({ ...prev, scheduledDate: date?.toISOString() }));
                                    if (errors.scheduledDate) setErrors(prev => ({ ...prev, scheduledDate: '' }));
                                  }}
                                  className={cn(
                                    "h-9",
                                    errors.scheduledDate && "border-destructive"
                                  )}
                                />
                                {errors.scheduledDate && (
                                  <p className="text-xs text-destructive mt-1">{errors.scheduledDate}</p>
                                )}
                              </div>
                              
                              {/* Responsável */}
                              <div className="space-y-2">
                                <Label htmlFor="assignedTo" className="text-xs font-medium flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Técnico Executor
                                </Label>
                                <Select 
                                  value={formData.assignedTo || 'none'} 
                                  onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value === 'none' ? '' : value }))}
                                >
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Selecione um técnico" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem técnico designado</SelectItem>
                                    {technicians.map((tech) => (
                                      <SelectItem key={tech.user.id} value={String(tech.user.id)}>
                                        {tech.user.full_name || tech.user.email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Data de Conclusão - Aparece apenas quando status é COMPLETED */}
                            {formData.status === 'COMPLETED' && (
                              <div className="mt-4 pt-4 border-t">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="completedAt" className="text-xs font-medium flex items-center gap-1">
                                      <CalendarClock className="h-3 w-3" />
                                      Data de Conclusão <span className="text-destructive">*</span>
                                    </Label>
                                    <DatePicker
                                      date={formData.completedAt ? new Date(formData.completedAt) : undefined}
                                      setDate={(date) => {
                                        setFormData(prev => ({ ...prev, completedAt: date?.toISOString() }));
                                        if (errors.completedAt) setErrors(prev => ({ ...prev, completedAt: '' }));
                                      }}
                                      placeholder="Quando foi concluída"
                                      className={cn(
                                        "h-9",
                                        errors.completedAt && "border-destructive"
                                      )}
                                    />
                                    {errors.completedAt && (
                                      <p className="text-xs text-destructive mt-1">{errors.completedAt}</p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                      Tempo de Execução
                                    </Label>
                                    <div className="h-9 px-3 py-2 bg-muted/50 rounded-md text-sm">
                                      {formData.completedAt && formData.scheduledDate ? (
                                        <span className="text-muted-foreground">
                                          {Math.ceil(
                                            (new Date(formData.completedAt).getTime() - new Date(formData.scheduledDate).getTime()) 
                                            / (1000 * 60 * 60 * 24)
                                          )} dias
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/50">-</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Card 3: Equipamento e Localização - Melhorado */}
                        <div className="rounded-lg border bg-card">
                          <div className="px-4 py-3 border-b bg-muted/50">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              Equipamento e Localização
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {/* Seleção de Equipamento */}
                            <div className="space-y-2">
                              <Label htmlFor="equipmentId" className="text-xs font-medium flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                Equipamento <span className="text-destructive">*</span>
                              </Label>
                              <Select 
                                value={formData.equipmentId || ''} 
                                onValueChange={(value) => {
                                  setFormData(prev => ({ ...prev, equipmentId: value }));
                                  if (errors.equipmentId) setErrors(prev => ({ ...prev, equipmentId: '' }));
                                }}
                              >
                                <SelectTrigger className={cn(
                                  "h-auto min-h-[2.25rem] whitespace-normal",
                                  errors.equipmentId && "border-destructive focus:ring-destructive"
                                )}>
                                  {formData.equipmentId ? (
                                    <div className="flex items-center w-full pr-2">
                                      <EquipmentSelectDisplay 
                                        equipmentId={formData.equipmentId}
                                        equipment={equipment}
                                      />
                                    </div>
                                  ) : (
                                    <SelectValue placeholder="Selecione o equipamento" />
                                  )}
                                </SelectTrigger>
                                <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[400px]">
                                  {equipment.map(eq => {
                                    const eqSector = sectors.find(s => s.id === eq.sectorId);
                                    const eqCompany = eqSector ? companies.find(c => c.id === eqSector.companyId) : null;
                                    
                                    return (
                                      <SelectItem key={eq.id} value={eq.id} className="py-3">
                                        <div className="flex items-start gap-3 w-full min-w-0">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{eq.tag}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                              {eq.brand} {eq.model} • {eq.type}
                                            </div>
                                            {eqCompany && eqSector && (
                                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                                {eqCompany.name} → {eqSector.name}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              {errors.equipmentId && (
                                <p className="text-xs text-destructive mt-1">{errors.equipmentId}</p>
                              )}
                            </div>
                            
                            {/* Card de Informações do Equipamento - Visual Melhorado */}
                            {selectedEquipment && (
                              <div className="rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Tag className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <div>
                                      <h4 className="font-medium text-sm">{selectedEquipment.tag}</h4>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {selectedEquipment.type} • {selectedEquipment.capacity.toLocaleString()} BTUs
                                      </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">Marca/Modelo:</span>
                                        <p className="font-medium mt-0.5">{selectedEquipment.brand} {selectedEquipment.model}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Localização:</span>
                                        <p className="font-medium mt-0.5">
                                          {selectedCompany?.name || 'N/A'}
                                        </p>
                                        <p className="text-muted-foreground">
                                          {selectedSector?.name || 'N/A'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Tags visuais para informações importantes */}
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-primary/10">
                                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-background/80 text-xs">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {selectedSector?.name || 'Setor'}
                                      </span>
                                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-background/80 text-xs">
                                        <Building className="h-3 w-3 mr-1" />
                                        {selectedCompany?.name || 'Empresa'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                )}

                {/* Aba de Materiais - Melhorada */}
                <TabsContent value="materials" className="mt-0">
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      <div className="rounded-lg border bg-card">
                        <div className="px-4 py-3 border-b bg-muted/50">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              Materiais e Peças
                            </h3>
                            {selectedStockItems.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {selectedStockItems.length} {selectedStockItems.length === 1 ? 'item' : 'itens'} selecionado{selectedStockItems.length === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          {/* Formulário de Adição - Layout Melhorado */}
                          <div className="bg-muted/30 rounded-lg p-3 border border-muted-foreground/10">
                            <Label className="text-xs font-medium text-muted-foreground mb-3 block">
                              Adicionar Material
                            </Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex-1">
                                <Select 
                                  value={stockItemForm.stockItemId} 
                                  onValueChange={(value) => setStockItemForm(prev => ({ ...prev, stockItemId: value }))}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Selecione um item do estoque" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableStockItems.length === 0 ? (
                                      <div className="p-4 text-center text-sm text-muted-foreground">
                                        Todos os itens já foram adicionados
                                      </div>
                                    ) : (
                                      availableStockItems.map(item => (
                                        <SelectItem key={item.id} value={item.id}>
                                          <div className="flex items-center justify-between w-full gap-2">
                                            <span className="font-medium text-sm">{item.description}</span>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                              <span>Estoque: {item.quantity}</span>
                                              <span>•</span>
                                              <span>{item.unit}</span>
                                            </div>
                                          </div>
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="flex gap-2">
                                <Input 
                                  type="number" 
                                  min="1"
                                  value={stockItemForm.quantity} 
                                  onChange={(e) => setStockItemForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                  placeholder="Qtd"
                                  className="w-20 h-9"
                                />
                                
                                <Button 
                                  onClick={addStockItem}
                                  disabled={!stockItemForm.stockItemId}
                                  size="sm"
                                  className="h-9 px-3"
                                >
                                  <Plus className="h-4 w-4" />
                                  <span className="ml-1.5 hidden sm:inline">Adicionar</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Lista de Materiais - Visual Melhorado */}
                          {selectedStockItems.length === 0 ? (
                            <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 p-12">
                              <div className="flex flex-col items-center text-center max-w-sm mx-auto">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                  Nenhum material adicionado
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Selecione os materiais que serão utilizados nesta ordem de serviço
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {selectedStockItems.map((item, index) => (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                    "hover:bg-muted/50 group"
                                  )}
                                >
                                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-medium text-primary">
                                      {index + 1}
                                    </span>
                                  </div>
                                  
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      SKU: {item.stockItemId}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <p className="text-sm font-medium">{item.quantity}</p>
                                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                                    </div>
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => removeStockItem(item.id)}
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Resumo */}
                              <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-muted-foreground/10">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Total de itens:</span>
                                  <span className="font-medium">
                                    {selectedStockItems.reduce((acc, item) => acc + item.quantity, 0)} unidades
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                {/* Aba de Execução */}
                {canEditExecution && (
                  <TabsContent value="execution" className="mt-0">
                    <ScrollArea className="h-[60vh] pr-4">
                      <div className="space-y-6">
                    {/* Status de Execução */}
                    <div className="rounded-lg border bg-card">
                      <div className="px-4 py-3 border-b bg-muted/50">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <Circle className="h-4 w-4 text-muted-foreground" />
                          Status da Ordem
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-2">
                          <Label htmlFor="status">Status *</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as WorkOrder['status'] }))}
                          >
                            <SelectTrigger className={cn(errors.status && "border-destructive")}>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OPEN">Aberta</SelectItem>
                              <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                              <SelectItem value="COMPLETED">Concluída</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Descrição da Execução */}
                    <div className="rounded-lg border bg-card">
                      <div className="px-4 py-3 border-b bg-muted/50">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Descrição da Execução
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-2">
                          <Label htmlFor="executionDescription">Detalhes da Execução</Label>
                          <Textarea
                            id="executionDescription"
                            value={executionDescription}
                            onChange={(e) => setExecutionDescription(e.target.value)}
                            placeholder="Descreva os procedimentos realizados, observações e resultados..."
                            rows={4}
                            className="resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Checklist para Ordens Preventivas */}
                    {formData.type === 'PREVENTIVE' && (
                      <div className="rounded-lg border bg-card">
                        <div className="px-4 py-3 border-b bg-muted/50">
                          <h3 className="text-sm font-medium flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                            Checklist de Manutenção
                          </h3>
                        </div>
                        <div className="p-4">
                          {checklistResponses.length > 0 ? (
                            <div className="space-y-4">
                              {checklistResponses.map((response, index) => (
                                <div key={response.taskId} className="p-3 border rounded-lg space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">{response.taskName}</h4>
                                    <Checkbox
                                      checked={response.completed}
                                      onCheckedChange={(checked) => {
                                        const updated = [...checklistResponses];
                                        updated[index] = { ...response, completed: checked === true };
                                        setChecklistResponses(updated);
                                      }}
                                    />
                                  </div>
                                  
                                  {response.checkItems && response.checkItems.length > 0 && (
                                    <div className="ml-4 space-y-2">
                                      {response.checkItems.map((item, itemIndex) => (
                                        <div key={item.id} className="flex items-center gap-2 text-sm">
                                          <Checkbox
                                            checked={item.checked}
                                            onCheckedChange={(checked) => {
                                              const updated = [...checklistResponses];
                                              updated[index].checkItems![itemIndex] = { 
                                                ...item, 
                                                checked: checked === true 
                                              };
                                              setChecklistResponses(updated);
                                            }}
                                          />
                                          <span className="text-muted-foreground">{item.description}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  <div className="space-y-2">
                                    <Label className="text-xs">Observações</Label>
                                    <Textarea
                                      value={response.observations || ''}
                                      onChange={(e) => {
                                        const updated = [...checklistResponses];
                                        updated[index] = { ...response, observations: e.target.value };
                                        setChecklistResponses(updated);
                                      }}
                                      placeholder="Observações adicionais sobre esta tarefa..."
                                      rows={2}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Nenhum checklist disponível para esta ordem preventiva</p>
                              <p className="text-xs mt-1">O checklist será carregado automaticamente do plano de manutenção</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Upload de Fotos */}
                    <div className="rounded-lg border bg-card">
                      <div className="px-4 py-3 border-b bg-muted/50">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <Camera className="h-4 w-4 text-muted-foreground" />
                          Fotos da Execução
                        </h3>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Upload Area */}
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                          <input
                            type="file"
                            ref={fileInputRef}
                            multiple
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Arraste fotos aqui ou clique para selecionar
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Adicionar Fotos
                          </Button>
                        </div>

                        {/* Photos Grid */}
                        {uploadedPhotos.length > 0 && (
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {uploadedPhotos.map((photo) => (
                              <div key={photo.id} className="relative group">
                                <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                  <img
                                    src={photo.url}
                                    alt={photo.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removePhoto(photo.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-xs truncate">
                                  {photo.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data de Conclusão */}
                    {formData.status === 'COMPLETED' && (
                      <div className="rounded-lg border bg-card">
                        <div className="px-4 py-3 border-b bg-muted/50">
                          <h3 className="text-sm font-medium flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-muted-foreground" />
                            Data de Conclusão
                          </h3>
                        </div>
                        <div className="p-4">
                          <div className="space-y-2">
                            <Label htmlFor="completedAt">Data de Conclusão *</Label>
                            <DatePicker
                              date={formData.completedAt ? new Date(formData.completedAt) : undefined}
                              setDate={(date) => setFormData(prev => ({ ...prev, completedAt: date?.toISOString() }))}
                              placeholder="Selecione quando foi concluída"
                            />
                            {errors.completedAt && <p className="text-sm text-destructive">{errors.completedAt}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                    </ScrollArea>
                  </TabsContent>
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </div>
        )}

        {/* Footer - Fixed */}
        <div className="border-t bg-background px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {Object.keys(errors).length > 0 && (
                <p className="text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Corrija os campos obrigatórios
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}