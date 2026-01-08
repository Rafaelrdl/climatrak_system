import { useState, useEffect, useRef } from 'react';
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
  PenTool,
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { SignaturePad, type SignaturePadRef } from '@/components/ui/signature-pad';
import { useCompanies, useSectors, useUnits, useSubsections } from '@/hooks/useLocationsQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useStockItems } from '@/hooks/useInventoryQuery';
import { useTechnicians } from '@/hooks/useTeamQuery';
import { useWorkOrder } from '@/hooks/useWorkOrdersQuery';
import { useWorkOrderSettingsStore } from '@/store/useWorkOrderSettingsStore';
import { printWorkOrder } from '@/utils/printWorkOrder';
import { workOrdersService } from '@/services/workOrdersService';
import type { WorkOrder, ChecklistResponse, UploadedPhoto, StockItem } from '@/types';
import type { ApiInventoryItem } from '@/types/api';
import { cn } from '@/lib/utils';

/**
 * Converte Date para string YYYY-MM-DD no timezone local
 * Evita problemas de timezone ao usar toISOString()
 */
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

/**
 * Formata uma data para o formato do input datetime-local (YYYY-MM-DDTHH:MM)
 * usando o horário LOCAL do usuário, não UTC
 */
const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

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
  
  // Estados para filtros de localização
  const [filterCompanyId, setFilterCompanyId] = useState<string>('');
  const [filterUnitId, setFilterUnitId] = useState<string>('');
  const [filterSectorId, setFilterSectorId] = useState<string>('');
  const [filterSubsectionId, setFilterSubsectionId] = useState<string>('');
  
  // Estados para assinatura
  const [signedBy, setSignedBy] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const signaturePadRef = useRef<SignaturePadRef>(null);
  
  const { data: equipment = [] } = useEquipments();
  const { data: sectors = [] } = useSectors();
  const { data: companies = [] } = useCompanies();
  const { data: units = [] } = useUnits();
  const { data: subsections = [] } = useSubsections();
  const { data: stockItemsData } = useStockItems();
  // Garantir que stockItemsData seja um array (pode vir como objeto paginado em alguns casos)
  const stockItemsArray = Array.isArray(stockItemsData) 
    ? stockItemsData 
    : (stockItemsData as any)?.results || [];
  const stockItems = stockItemsArray.map(mapToStockItem);
  
  // Lista de técnicos da API
  const { data: technicians = [] } = useTechnicians();
  
  // Configurações de status e tipos
  const { settings } = useWorkOrderSettingsStore();
  
  // Simulação do hook de autenticação - substituir pela implementação real
  const user = { name: 'Usuário Atual', role: 'ADMIN' }; // Placeholder
  const canEditDetails = user.role === 'ADMIN';
  const canEditExecution = true; // Tanto admin quanto técnico podem editar execução
  
  // Helper para obter configuração de status
  const getStatusConfig = (status: WorkOrder['status']) => {
    const config = settings.statuses.find(s => s.id === status);
    return config || { id: status, label: status, color: '#6b7280' };
  };
  
  // Helper para obter estilo de badge de status
  const getStatusBadgeStyle = (status: WorkOrder['status']) => {
    const config = getStatusConfig(status);
    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const rgb = hexToRgb(config.color);
    if (!rgb) {
      return {
        backgroundColor: '#f3f4f6',
        color: '#374151',
        dotColor: '#6b7280'
      };
    }
    
    return {
      backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
      color: config.color,
      dotColor: config.color
    };
  };

  // Função para imprimir a ordem de serviço
  const handlePrintWorkOrder = () => {
    if (!currentWorkOrder) return;
    
    printWorkOrder({
      workOrder: { ...currentWorkOrder, ...formData } as WorkOrder,
      equipment,
      sectors,
      companies,
      settings
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
      
      // Determinar o checklist a ser usado
      let checklistToUse: ChecklistResponse[] = [];
      
      if (currentWorkOrder.checklistResponses && currentWorkOrder.checklistResponses.length > 0) {
        // Se já tem respostas salvas, usar elas
        checklistToUse = currentWorkOrder.checklistResponses;
      } else if (currentWorkOrder.checklistTemplateItems && currentWorkOrder.checklistTemplateItems.length > 0) {
        // Se tem um template de checklist associado, converter para o formato de respostas
        checklistToUse = [{
          taskId: `template-${currentWorkOrder.checklistTemplate || 'default'}`,
          taskName: currentWorkOrder.checklistTemplateName || 'Checklist',
          completed: false,
          observations: '',
          checkItems: currentWorkOrder.checklistTemplateItems.map((item, index) => ({
            id: item.id || `item-${index}`,
            description: item.label,
            checked: false
          }))
        }];
      }
      
      setChecklistResponses(checklistToUse);
      setExecutionDescription(currentWorkOrder.executionDescription || '');
      
      // Carregar dados de assinatura
      setSignedBy(currentWorkOrder.signedBy || '');
      setHasSignature(!!currentWorkOrder.signature);
      // Carregar assinatura existente no SignaturePad após render
      if (currentWorkOrder.signature && signaturePadRef.current) {
        signaturePadRef.current.fromDataURL(currentWorkOrder.signature);
      }
      
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
      setSignedBy(''); // Limpar nome de quem assinou
      setHasSignature(false); // Limpar flag de assinatura
      signaturePadRef.current?.clear(); // Limpar canvas de assinatura
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
      for (const [, file] of newPhotoFiles.entries()) {
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

      // Obter dados de assinatura
      const signatureData = signaturePadRef.current && !signaturePadRef.current.isEmpty() 
        ? signaturePadRef.current.toDataURL() 
        : currentWorkOrder?.signature;

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
        signature: signatureData,
        signedBy: signedBy || currentWorkOrder?.signedBy,
        signedAt: signatureData && signedBy && !currentWorkOrder?.signedAt 
          ? new Date().toISOString() 
          : currentWorkOrder?.signedAt,
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

  // Filtrar unidades baseado na empresa selecionada
  const filteredUnits = filterCompanyId 
    ? units.filter(u => u.companyId === filterCompanyId)
    : units;
  
  // Filtrar setores baseado na unidade selecionada
  const filteredSectors = filterUnitId 
    ? sectors.filter(s => s.unitId === filterUnitId)
    : sectors;
  
  // Filtrar subsetores baseado no setor selecionado
  const filteredSubsections = filterSectorId 
    ? subsections.filter(ss => ss.sectorId === filterSectorId)
    : subsections;
  
  // Filtrar equipamentos baseado na localização selecionada
  const filteredEquipment = equipment.filter(eq => {
    if (filterSubsectionId && eq.subSectionId !== filterSubsectionId) return false;
    if (filterSectorId && eq.sectorId !== filterSectorId) return false;
    if (filterUnitId) {
      const eqSector = sectors.find(s => s.id === eq.sectorId);
      if (!eqSector || eqSector.unitId !== filterUnitId) return false;
    }
    if (filterCompanyId) {
      const eqSector = sectors.find(s => s.id === eq.sectorId);
      const eqUnit = eqSector ? units.find(u => u.id === eqSector.unitId) : null;
      if (!eqUnit || eqUnit.companyId !== filterCompanyId) return false;
    }
    return true;
  });

  // Encontrar o equipamento selecionado para mostrar informações relacionadas
  const selectedEquipment = equipment.find(eq => eq.id === formData.equipmentId);
  const selectedSubsection = selectedEquipment?.subSectionId 
    ? subsections.find(ss => ss.id === selectedEquipment.subSectionId)
    : null;
  const selectedSector = selectedEquipment 
    ? sectors.find(s => s.id === selectedEquipment.sectorId) 
    : null;
  const selectedUnit = selectedSector 
    ? units.find(u => u.id === selectedSector.unitId)
    : null;
  const selectedCompany = selectedUnit 
    ? companies.find(c => c.id === selectedUnit.companyId) 
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
                {formData.status && (
                  <div 
                    className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
                    style={{
                      backgroundColor: getStatusBadgeStyle(formData.status).backgroundColor,
                      color: getStatusBadgeStyle(formData.status).color
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getStatusBadgeStyle(formData.status).dotColor }}
                    />
                    {getStatusConfig(formData.status).label}
                  </div>
                )}
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
              <TabsTrigger 
                value="signature" 
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <PenTool className="h-4 w-4" />
                <span>Assinatura</span>
                {(hasSignature || currentWorkOrder?.signature) && (
                  <span className="h-2 w-2 bg-green-500 rounded-full" />
                )}
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
                                    {settings.types.map((type) => (
                                      <SelectItem key={type.id} value={type.id}>
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-2 h-2 rounded-full" 
                                            style={{ backgroundColor: type.color }}
                                          />
                                          <span className="text-sm">{type.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
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
                                    {settings.statuses.map((status) => (
                                      <SelectItem key={status.id} value={status.id}>
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-2 h-2 rounded-full" 
                                            style={{ backgroundColor: status.color }}
                                          />
                                          <span className="text-sm">{status.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
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
                                    setFormData(prev => ({ ...prev, scheduledDate: date ? formatDateToLocal(date) : undefined }));
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
                            {/* Filtros de Localização */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Empresa</Label>
                                <Select 
                                  value={filterCompanyId || "__all__"} 
                                  onValueChange={(value) => {
                                    setFilterCompanyId(value === "__all__" ? '' : value);
                                    setFilterUnitId('');
                                    setFilterSectorId('');
                                    setFilterSubsectionId('');
                                  }}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Todas" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__all__">Todas</SelectItem>
                                    {companies.map(c => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Unidade</Label>
                                <Select 
                                  value={filterUnitId || "__all__"} 
                                  onValueChange={(value) => {
                                    setFilterUnitId(value === "__all__" ? '' : value);
                                    setFilterSectorId('');
                                    setFilterSubsectionId('');
                                  }}
                                  disabled={!filterCompanyId}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder={filterCompanyId ? "Todas" : "Selecione empresa"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__all__">Todas</SelectItem>
                                    {filteredUnits.map(u => (
                                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Setor</Label>
                                <Select 
                                  value={filterSectorId || "__all__"} 
                                  onValueChange={(value) => {
                                    setFilterSectorId(value === "__all__" ? '' : value);
                                    setFilterSubsectionId('');
                                  }}
                                  disabled={!filterUnitId}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder={filterUnitId ? "Todos" : "Selecione unidade"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__all__">Todos</SelectItem>
                                    {filteredSectors.map(s => (
                                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Subsetor</Label>
                                <Select 
                                  value={filterSubsectionId || "__all__"} 
                                  onValueChange={(value) => setFilterSubsectionId(value === "__all__" ? '' : value)}
                                  disabled={!filterSectorId}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder={filterSectorId ? "Todos" : "Selecione setor"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__all__">Todos</SelectItem>
                                    {filteredSubsections.map(ss => (
                                      <SelectItem key={ss.id} value={ss.id}>{ss.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Seleção de Equipamento */}
                            <div className="space-y-2">
                              <Label htmlFor="equipmentId" className="text-xs font-medium flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                Equipamento <span className="text-destructive">*</span>
                                {filteredEquipment.length > 0 && (
                                  <span className="text-muted-foreground font-normal ml-1">
                                    ({filteredEquipment.length} disponíveis)
                                  </span>
                                )}
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
                                  {filteredEquipment.length === 0 ? (
                                    <div className="p-3 text-center text-sm text-muted-foreground">
                                      Nenhum equipamento encontrado
                                    </div>
                                  ) : (
                                    filteredEquipment.map(eq => {
                                      const eqSector = sectors.find(s => s.id === eq.sectorId);
                                      const eqUnit = eqSector ? units.find(u => u.id === eqSector.unitId) : null;
                                      const eqCompany = eqUnit ? companies.find(c => c.id === eqUnit.companyId) : null;
                                      
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
                                                  {eqCompany.name} → {eqUnit?.name} → {eqSector.name}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </SelectItem>
                                      );
                                    })
                                  )}
                                </SelectContent>
                              </Select>
                              {errors.equipmentId && (
                                <p className="text-xs text-destructive mt-1">{errors.equipmentId}</p>
                              )}
                            </div>
                            
                            {/* Card de Informações do Equipamento - Visual Melhorado */}
                            {selectedEquipment && (
                              <div className="rounded-xl border bg-white dark:bg-card overflow-hidden">
                                {/* Header com tag e tipo */}
                                <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <Tag className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-sm">{selectedEquipment.tag}</h4>
                                      <p className="text-xs text-muted-foreground">
                                        {selectedEquipment.type} • {selectedEquipment.capacity?.toLocaleString() || 0} BTUs
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Conteúdo principal */}
                                <div className="p-4 space-y-4">
                                  {/* Grid de informações */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Marca</p>
                                      <p className="text-sm font-medium">{selectedEquipment.brand || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Modelo</p>
                                      <p className="text-sm font-medium">{selectedEquipment.model || 'N/A'}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Localização hierárquica */}
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      Localização
                                    </p>
                                    <div className="flex flex-col gap-1 text-sm">
                                      {selectedCompany && (
                                        <div className="flex items-center gap-2">
                                          <Building className="h-3.5 w-3.5 text-blue-500" />
                                          <span className="font-medium">{selectedCompany.name}</span>
                                        </div>
                                      )}
                                      {selectedUnit && (
                                        <div className="flex items-center gap-2 ml-4">
                                          <Building className="h-3.5 w-3.5 text-indigo-500" />
                                          <span>{selectedUnit.name}</span>
                                        </div>
                                      )}
                                      {selectedSector && (
                                        <div className="flex items-center gap-2 ml-8">
                                          <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                                          <span>{selectedSector.name}</span>
                                        </div>
                                      )}
                                      {selectedSubsection && (
                                        <div className="flex items-center gap-2 ml-12">
                                          <MapPin className="h-3.5 w-3.5 text-amber-500" />
                                          <span>{selectedSubsection.name}</span>
                                        </div>
                                      )}
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
                                  min="0.01"
                                  step="0.01"
                                  value={stockItemForm.quantity} 
                                  onChange={(e) => setStockItemForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
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
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="status">Status *</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => {
                              const newStatus = value as WorkOrder['status'];
                              setFormData(prev => ({
                                ...prev,
                                status: newStatus,
                                // Preencher automaticamente a data/hora de conclusão ao mudar para COMPLETED
                                completedAt: newStatus === 'COMPLETED' && !prev.completedAt
                                  ? new Date().toISOString()
                                  : prev.completedAt
                              }));
                            }}
                          >
                            <SelectTrigger className={cn(errors.status && "border-destructive")}>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                              {settings.statuses.map((status) => (
                                <SelectItem key={status.id} value={status.id}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                        </div>

                        {/* Data e Hora de Conclusão - Aparece apenas quando status é COMPLETED */}
                        {formData.status === 'COMPLETED' && (
                          <div className="pt-4 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="completedAt" className="text-sm font-medium flex items-center gap-1">
                                  <CalendarClock className="h-4 w-4" />
                                  Data e Hora de Conclusão <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="completedAt"
                                  type="datetime-local"
                                  value={formData.completedAt ? formatDateTimeLocal(new Date(formData.completedAt)) : ''}
                                  onChange={(e) => {
                                    const dateValue = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                                    setFormData(prev => ({ ...prev, completedAt: dateValue }));
                                    if (errors.completedAt) setErrors(prev => ({ ...prev, completedAt: '' }));
                                  }}
                                  className={cn(
                                    errors.completedAt && "border-destructive"
                                  )}
                                />
                                {errors.completedAt && (
                                  <p className="text-xs text-destructive mt-1">{errors.completedAt}</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Tempo de Execução
                                </Label>
                                <div className="h-10 px-3 py-2 bg-muted/50 rounded-md text-sm flex items-center">
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
                    </div>
                    </ScrollArea>
                  </TabsContent>
                )}
                
                {/* Aba de Assinatura */}
                <TabsContent value="signature" className="mt-0">
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      {/* Informações sobre assinatura */}
                      <div className="rounded-lg border bg-card">
                        <div className="px-4 py-3 border-b bg-muted/50">
                          <h3 className="text-sm font-medium flex items-center gap-2">
                            <PenTool className="h-4 w-4 text-muted-foreground" />
                            Assinatura de Comprovação
                          </h3>
                        </div>
                        <div className="p-4 space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Após a execução da ordem de serviço, o solicitante ou responsável deve assinar 
                            abaixo para comprovar que o serviço foi realizado.
                          </p>
                          
                          {/* Nome de quem assina */}
                          <div className="space-y-2">
                            <Label htmlFor="signedBy">Nome do Responsável pela Assinatura</Label>
                            <Input
                              id="signedBy"
                              placeholder="Digite o nome completo de quem está assinando"
                              value={signedBy}
                              onChange={(e) => setSignedBy(e.target.value)}
                              disabled={formData.status !== 'COMPLETED'}
                            />
                            {formData.status !== 'COMPLETED' && (
                              <p className="text-xs text-muted-foreground">
                                A assinatura só pode ser coletada quando a ordem estiver concluída.
                              </p>
                            )}
                          </div>
                          
                          {/* Campo de Assinatura */}
                          <div className="space-y-2">
                            <Label>Assinatura</Label>
                            {currentWorkOrder?.signature && !hasSignature ? (
                              <div className="space-y-3">
                                <div className="border rounded-lg p-2 bg-white">
                                  <img 
                                    src={currentWorkOrder.signature} 
                                    alt="Assinatura existente" 
                                    className="max-w-full h-auto"
                                  />
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                  <span>
                                    Assinado por: <strong>{currentWorkOrder.signedBy}</strong>
                                  </span>
                                  {currentWorkOrder.signedAt && (
                                    <span>
                                      em {new Date(currentWorkOrder.signedAt).toLocaleString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                                {formData.status === 'COMPLETED' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setHasSignature(true);
                                      setSignedBy('');
                                    }}
                                  >
                                    Coletar Nova Assinatura
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <SignaturePad
                                ref={signaturePadRef}
                                width={460}
                                height={200}
                                disabled={formData.status !== 'COMPLETED'}
                                onChange={(empty) => setHasSignature(!empty)}
                                initialValue={currentWorkOrder?.signature}
                              />
                            )}
                          </div>
                          
                          {/* Status da Assinatura */}
                          {formData.status === 'COMPLETED' && (
                            <div className={cn(
                              "flex items-center gap-2 p-3 rounded-lg text-sm",
                              hasSignature || currentWorkOrder?.signature
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            )}>
                              {hasSignature || currentWorkOrder?.signature ? (
                                <>
                                  <ClipboardCheck className="h-4 w-4" />
                                  <span>Ordem de serviço assinada</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>Aguardando assinatura do responsável</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
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
