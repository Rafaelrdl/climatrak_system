import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  ClipboardList, 
  Package, 
  Wrench, 
  Save,
  FileText,
  Calendar,
  MapPin,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useSectors, useCompanies } from '@/hooks/useLocationsQuery';
import { useStockItems } from '@/hooks/useInventoryQuery';
import { useWorkOrderSettingsStore } from '@/store/useWorkOrderSettingsStore';
import { printWorkOrder } from '@/utils/printWorkOrder';
import { WorkOrderCostsTab } from '@/components/cmms/WorkOrderCostsTab';
import { StatusBadge } from '@/shared/ui';
import type { WorkOrder, StockItem } from '@/types';
import type { ApiInventoryItem } from '@/types/api';

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

const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface WorkOrderDetailViewProps {
  workOrder: WorkOrder | null;
  onSave?: (updates: Partial<WorkOrder>) => void;
  readOnly?: boolean;
  className?: string;
}

export function WorkOrderDetailView({
  workOrder,
  onSave,
  readOnly = false,
  className
}: WorkOrderDetailViewProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState<Partial<WorkOrder>>(() => 
    workOrder || { 
      status: 'OPEN', 
      type: 'CORRECTIVE', 
      priority: 'MEDIUM' 
    }
  );
  const [isDirty, setIsDirty] = useState(false);
  
  // React Query hooks
  const { data: equipment = [] } = useEquipments();
  const { data: sectors = [] } = useSectors();
  const { data: companies = [] } = useCompanies();
  const { data: stockItemsData } = useStockItems();
  const { settings: workOrderSettings } = useWorkOrderSettingsStore();
  const stockItems = useMemo(() => 
    (Array.isArray(stockItemsData) ? stockItemsData : (stockItemsData as any)?.results || []).map(mapToStockItem), 
    [stockItemsData]
  );
  
  // Memoizar arrays para evitar re-renders
  const equipmentList = useMemo(() => equipment, [equipment]);
  const sectorsList = useMemo(() => sectors, [sectors]);
  const companiesList = useMemo(() => companies, [companies]);
  const stockItemsList = useMemo(() => stockItems, [stockItems]);

  const scheduledDateValue = useMemo(() => {
    if (!formData.scheduledDate) return undefined;
    return formData.scheduledDate.includes('T')
      ? new Date(formData.scheduledDate)
      : parseLocalDate(formData.scheduledDate);
  }, [formData.scheduledDate]);

  // Carregar dados quando workOrder mudar
  useEffect(() => {
    if (workOrder) {
      setFormData({ ...workOrder });
      setIsDirty(false);
      setActiveTab('details');
    }
  }, [workOrder]);

  // Handlers memoizados (devem estar antes do return condicional)
  const handleSave = useCallback(() => {
    if (onSave && isDirty) {
      onSave(formData);
      setIsDirty(false);
    }
  }, [onSave, isDirty, formData]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const handlePrint = useCallback(() => {
    if (!workOrder) return;
    printWorkOrder({
      workOrder: { ...workOrder, ...formData } as WorkOrder,
      equipment: equipmentList,
      sectors: sectorsList,
      companies: companiesList,
      settings: workOrderSettings,
    });
  }, [workOrder, formData, equipmentList, sectorsList, companiesList, workOrderSettings]);

  // Derivações memoizadas
  const selectedEquipment = useMemo(() => 
    equipmentList.find(e => e.id === formData.equipmentId),
    [equipmentList, formData.equipmentId]
  );
  const selectedSector = useMemo(() => 
    sectorsList.find(s => s.id === selectedEquipment?.sectorId),
    [sectorsList, selectedEquipment?.sectorId]
  );
  const selectedCompany = useMemo(() => 
    companiesList.find(c => c.id === selectedSector?.companyId),
    [companiesList, selectedSector?.companyId]
  );

  // Estado vazio - return condicional deve estar depois de todos os hooks
  if (!workOrder) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/20", className)}>
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto">
            <ClipboardList className="w-10 h-10 text-primary/60" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Nenhuma OS selecionada</h3>
            <p className="text-muted-foreground text-sm">
              Selecione uma ordem de serviço na lista ao lado para visualizar e editar todos os detalhes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header responsivo */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b bg-background shrink-0">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">OS #{workOrder.number}</span>
              </h2>
              <StatusBadge
                status={formData.status || 'OPEN'}
                type="workOrder"
                cmmsSettings={workOrderSettings}
              />
              <StatusBadge status={formData.priority || 'MEDIUM'} type="priority" />
            </div>
            <div className="mt-1">
              <StatusBadge
                status={formData.type || 'CORRECTIVE'}
                type="maintenanceType"
                cmmsSettings={workOrderSettings}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isDirty && !readOnly && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hidden sm:flex">
                <AlertCircle className="h-3 w-3 mr-1" />
                Não salvo
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3">
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            {!readOnly && (
              <Button size="sm" onClick={handleSave} disabled={!isDirty} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3">
                <Save className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Salvar</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tabs responsivas com scroll horizontal */}
          <div className="mx-3 sm:mx-6 mt-3 sm:mt-4 shrink-0 overflow-x-auto">
            <TabsList className="w-full sm:w-auto inline-flex">
              <TabsTrigger value="details" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Detalhes</span>
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Materiais</span>
              </TabsTrigger>
              {formData.status !== 'OPEN' && (
                <TabsTrigger value="execution" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline sm:inline">Execução</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="costs" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Custos</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 h-full">
            <div className="px-3 sm:px-6 py-4 pb-20">
              <TabsContent value="details" className="mt-0 space-y-5">
                <div className="space-y-5">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Localização e Equipamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEquipment ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">{selectedEquipment.tag}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Tag: {selectedEquipment.tag}
                            </p>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Tipo:</span>
                              <p className="font-medium">{selectedEquipment.type}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Capacidade:</span>
                              <p className="font-medium">{selectedEquipment.capacity.toLocaleString()} BTUs</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Marca:</span>
                              <p className="font-medium">{selectedEquipment.brand}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Modelo:</span>
                              <p className="font-medium">{selectedEquipment.model}</p>
                            </div>
                          </div>
                          {(selectedCompany || selectedSector) && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                {selectedCompany && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-medium">{selectedCompany.name}</span>
                                  </div>
                                )}
                                {selectedSector && (
                                  <p className="text-sm text-muted-foreground ml-5">{selectedSector.name}</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum equipamento selecionado</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Status da Ordem</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select 
                          value={formData.status || 'OPEN'}
                          onValueChange={(value) => handleFieldChange('status', value)}
                          disabled={readOnly}
                        >
                          <SelectTrigger id="status">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">Aberta</SelectItem>
                            <SelectItem value="IN_PROGRESS">Em Execução</SelectItem>
                            <SelectItem value="COMPLETED">Concluída</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.assignedTo && (
                        <div className="space-y-2">
                          <Label htmlFor="assigned">Responsável</Label>
                          <Input
                            id="assigned"
                            value={formData.assignedTo}
                            onChange={(e) => handleFieldChange('assignedTo', e.target.value)}
                            disabled={readOnly}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Informações Básicas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="type">Tipo</Label>
                          <Select 
                            value={formData.type || 'CORRECTIVE'}
                            onValueChange={(value) => handleFieldChange('type', value)}
                            disabled={readOnly}
                          >
                            <SelectTrigger id="type">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PREVENTIVE">Preventiva</SelectItem>
                              <SelectItem value="CORRECTIVE">Corretiva</SelectItem>
                              <SelectItem value="PREDICTIVE">Preditiva</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priority">Prioridade</Label>
                          <Select 
                            value={formData.priority || 'MEDIUM'}
                            onValueChange={(value) => handleFieldChange('priority', value)}
                            disabled={readOnly}
                          >
                            <SelectTrigger id="priority">
                              <SelectValue placeholder="Selecione a prioridade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LOW">Baixa</SelectItem>
                              <SelectItem value="MEDIUM">Média</SelectItem>
                              <SelectItem value="HIGH">Alta</SelectItem>
                              <SelectItem value="CRITICAL">Crítica</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={formData.description || ''}
                          onChange={(e) => handleFieldChange('description', e.target.value)}
                          disabled={readOnly}
                          rows={4}
                          placeholder="Descreva o trabalho a ser realizado..."
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Agendamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Data Programada</Label>
                          <DatePicker
                            date={scheduledDateValue}
                            setDate={(date) => handleFieldChange('scheduledDate', date ? formatDateToLocal(date) : undefined)}
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">Duração Estimada (min)</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={(formData as any).estimatedDuration || ''}
                            onChange={(e) => handleFieldChange('estimatedDuration', parseInt(e.target.value) || '')}
                            disabled={readOnly}
                            placeholder="Minutos"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="materials" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Materiais Utilizados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formData.stockItems && formData.stockItems.length > 0 ? (
                      <div className="space-y-3">
                        {formData.stockItems.map((item, index) => {
                          const stockItem = stockItemsList.find(si => si.id === item.stockItemId);
                          return (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{stockItem?.description || 'Item desconhecido'}</p>
                                <p className="text-sm text-muted-foreground">Código: {stockItem?.code}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{item.quantity} {stockItem?.unit}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Nenhum material registrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {formData.status !== 'OPEN' && (
                <TabsContent value="execution" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Detalhes da Execução</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {formData.completedAt && (
                        <div className="space-y-2">
                          <Label>Data de Conclusão</Label>
                          <DatePicker
                            date={new Date(formData.completedAt)}
                            setDate={(date) => handleFieldChange('completedAt', date?.toISOString())}
                            disabled={readOnly}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="notes">Observações de Execução</Label>
                        <Textarea
                          id="notes"
                          value={(formData as any).completionNotes || ''}
                          onChange={(e) => handleFieldChange('completionNotes', e.target.value)}
                          disabled={readOnly}
                          rows={4}
                          placeholder="Descreva o que foi realizado..."
                        />
                      </div>
                      {formData.type === 'PREVENTIVE' && formData.checklistResponses && formData.checklistResponses.length > 0 && (
                        <div className="space-y-3">
                          <Label>Checklist de Manutenção</Label>
                          <div className="space-y-2">
                            {formData.checklistResponses.map((item, index) => (
                              <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                                <Checkbox 
                                  checked={item.completed}
                                  onCheckedChange={(checked) => {
                                    const newChecklist = [...(formData.checklistResponses || [])];
                                    newChecklist[index] = { ...item, completed: checked as boolean };
                                    handleFieldChange('checklistResponses', newChecklist);
                                  }}
                                  disabled={readOnly}
                                />
                                <Label className="flex-1 cursor-pointer">{item.taskName}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Costs Tab */}
              <TabsContent value="costs" className="mt-0">
                {workOrder?.id && (
                  <WorkOrderCostsTab
                    workOrderId={workOrder.id}
                    workOrderNumber={workOrder.number || ''}
                  />
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
