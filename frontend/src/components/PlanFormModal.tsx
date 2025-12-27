import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, CheckSquare, Eye, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import type { MaintenancePlan } from '@/models/plan';
import { plansService } from '@/services/plansService';
import { useCompanies, useSectors } from '@/hooks/useLocationsQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useChecklists } from '@/hooks/useChecklistsQuery';
import type { ChecklistTemplate } from '@/models/checklist';

interface PlanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: MaintenancePlan;
  onSave: (plan: MaintenancePlan) => void;
}

export function PlanFormModal({ open, onOpenChange, plan, onSave }: PlanFormModalProps) {
  const { data: companies = [] } = useCompanies();
  const { data: sectors = [] } = useSectors();
  const { data: equipment = [] } = useEquipments();
  const { data: checklists = [] } = useChecklists();

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    frequency: MaintenancePlan['frequency'] | '';
    scope: {
      location_id: string;
      location_name: string;
      equipment_ids: string[];
      equipment_names: string[];
    };
    checklist_id: string;
    status: MaintenancePlan['status'];
    start_date: string;
    auto_generate: boolean;
  }>({
    name: '',
    description: '',
    frequency: '',
    scope: {
      location_id: '',
      location_name: '',
      equipment_ids: [],
      equipment_names: []
    },
    checklist_id: '',
    status: 'Ativo',
    start_date: '',
    auto_generate: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistTemplate | null>(null);
  const [isViewingChecklist, setIsViewingChecklist] = useState(false);

  // Função para inferir localização a partir dos equipamentos
  const inferLocationFromEquipments = (equipmentIds: string[]) => {
    if (equipmentIds.length === 0 || equipment.length === 0) {
      return { location_id: '', location_name: '' };
    }
    
    // Pega o primeiro equipamento para inferir a localização
    const firstEquipmentId = equipmentIds[0];
    const firstEquipment = equipment.find(eq => eq.id === firstEquipmentId);
    
    if (firstEquipment?.sectorId) {
      const sector = sectors.find(s => s.id === firstEquipment.sectorId);
      if (sector) {
        return { location_id: sector.id, location_name: sector.name };
      }
    }
    
    return { location_id: '', location_name: '' };
  };

  // Load plan data when editing
  useEffect(() => {
    if (plan) {
      // Usar assets diretamente da API ou fallback para scope legado
      const equipmentIds = plan.assets || plan.scope?.equipment_ids || [];
      const equipmentNames = plan.asset_names || plan.scope?.equipment_names || [];
      
      setFormData({
        name: plan.name,
        description: plan.description || '',
        frequency: plan.frequency,
        scope: {
          location_id: plan.scope?.location_id || '',
          location_name: plan.scope?.location_name || '',
          equipment_ids: equipmentIds,
          equipment_names: equipmentNames
        },
        checklist_id: plan.checklist_id || '',
        status: plan.status || (plan.isActive ? 'Ativo' : 'Inativo'),
        start_date: plan.next_execution_date?.split('T')[0] || '', // Usar next_execution como referência
        auto_generate: plan.auto_generate || false
      });
    } else {
      // Reset form for new plan
      setFormData({
        name: '',
        description: '',
        frequency: '',
        scope: {
          location_id: '',
          location_name: '',
          equipment_ids: [],
          equipment_names: []
        },
        checklist_id: '',
        status: 'Ativo',
        start_date: '',
        auto_generate: false
      });
    }
    setErrors({});
  }, [plan, open]);

  // Efeito separado para inferir localização quando os dados de equipamentos/setores carregarem
  useEffect(() => {
    if (plan && equipment.length > 0 && sectors.length > 0) {
      const equipmentIds = plan.assets || plan.scope?.equipment_ids || [];
      console.log('[PlanFormModal] Inferindo localização:', {
        equipmentIds,
        equipmentCount: equipment.length,
        sectorsCount: sectors.length,
        currentLocationId: formData.scope.location_id
      });
      
      // Só infere se ainda não tem localização definida e tem equipamentos
      if (equipmentIds.length > 0 && !formData.scope.location_id) {
        const locationInfo = inferLocationFromEquipments(equipmentIds);
        console.log('[PlanFormModal] Localização inferida:', locationInfo);
        
        if (locationInfo.location_id) {
          setFormData(prev => ({
            ...prev,
            scope: {
              ...prev.scope,
              location_id: locationInfo.location_id,
              location_name: locationInfo.location_name,
            }
          }));
        }
      }
    }
  }, [plan, equipment, sectors, formData.scope.location_id]);

  // Sincronizar selectedChecklist com formData.checklist_id
  useEffect(() => {
    if (formData.checklist_id && checklists.length > 0) {
      const checklist = checklists.find(c => c.id === formData.checklist_id);
      setSelectedChecklist(checklist || null);
    } else {
      setSelectedChecklist(null);
    }
  }, [formData.checklist_id, checklists]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.frequency) {
      newErrors.frequency = 'Frequência é obrigatória';
    }

    // Validate location selection for equipment filtering
    if (!formData.scope.location_id) {
      newErrors.location = 'Selecione uma empresa ou setor antes de escolher equipamentos';
    }

    // Validate equipment selection
    if ((formData.scope.equipment_ids || []).length === 0) {
      if (!formData.scope.location_id) {
        newErrors.equipment = 'Primeiro selecione uma empresa ou setor';
      } else {
        newErrors.equipment = 'Pelo menos um equipamento deve ser selecionado';
      }
    }

    // Validate checklist
    if (!formData.checklist_id || formData.checklist_id === "none") {
      newErrors.checklist = 'Selecione um checklist para o plano de manutenção';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros do formulário');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let savedPlan: MaintenancePlan;
      const isNewPlan = !plan;
      
      // Preparar dados para a API
      const apiData = {
        name: formData.name,
        description: formData.description,
        frequency: formData.frequency, // Já está em inglês (MONTHLY, QUARTERLY, etc.)
        is_active: formData.status === 'Ativo',
        assets: formData.scope.equipment_ids,
        checklist_template: formData.checklist_id || undefined,
        auto_generate: formData.auto_generate,
        next_execution: formData.start_date || undefined, // Data de início = próxima execução
      };
      
      if (plan) {
        // Update existing plan via API
        savedPlan = await plansService.update(plan.id, apiData);
        toast.success('Plano atualizado com sucesso.');
      } else {
        // Create new plan via API
        savedPlan = await plansService.create(apiData);
        toast.success('Plano criado com sucesso.');
      }
      
      // Se é um novo plano com geração automática e a data de início já passou,
      // gerar as ordens de serviço automaticamente
      if (isNewPlan && formData.auto_generate && formData.start_date) {
        const startDate = new Date(formData.start_date + 'T12:00:00');
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        
        if (startDate <= today) {
          try {
            const result = await plansService.generateWorkOrders(savedPlan.id);
            toast.success(`${result.work_orders_created} ordem(s) de serviço gerada(s) automaticamente!`, {
              description: 'A data de início já passou, então as OS foram criadas.'
            });
          } catch (error) {
            console.error('Erro ao gerar OS automaticamente:', error);
            toast.warning('Plano criado, mas erro ao gerar OS automaticamente.');
          }
        }
      }
      
      onSave(savedPlan);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Erro ao salvar plano.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationChange = (locationId: string) => {
    if (locationId === "no-location") {
      setFormData(prev => ({
        ...prev,
        scope: {
          ...prev.scope,
          location_id: '',
          location_name: '',
          // Clear selected equipment when location changes
          equipment_ids: [],
          equipment_names: []
        }
      }));
      return;
    }

    const company = companies.find(c => c.id === locationId);
    const sector = sectors.find(s => s.id === locationId);
    
    let locationName = '';
    if (company) {
      locationName = company.name;
    } else if (sector) {
      locationName = sector.name;
    }

    setFormData(prev => ({
      ...prev,
      scope: {
        ...prev.scope,
        location_id: locationId,
        location_name: locationName,
        // Clear selected equipment when location changes
        equipment_ids: [],
        equipment_names: []
      }
    }));
  };

  const handleEquipmentChange = (equipmentId: string) => {
    const selectedEquipment = equipment.find(eq => eq.id === equipmentId);
    if (!selectedEquipment) return;

    setFormData(prev => {
      // Ensure equipment_ids is always an array
      const currentEquipmentIds = prev.scope.equipment_ids || [];
      const currentEquipmentNames = prev.scope.equipment_names || [];
      
      const isAlreadySelected = currentEquipmentIds.includes(equipmentId);
      
      if (isAlreadySelected) {
        // Remove equipment
        const newIds = currentEquipmentIds.filter(id => id !== equipmentId);
        const newNames = currentEquipmentNames.filter((_, index) => 
          currentEquipmentIds[index] !== equipmentId
        );
        
        return {
          ...prev,
          scope: {
            ...prev.scope,
            equipment_ids: newIds,
            equipment_names: newNames
          }
        };
      } else {
        // Add equipment
        return {
          ...prev,
          scope: {
            ...prev.scope,
            equipment_ids: [...currentEquipmentIds, equipmentId],
            equipment_names: [...currentEquipmentNames, selectedEquipment.tag || selectedEquipment.model || `Equipment ${equipmentId}`]
          }
        };
      }
    });
  };

  const removeEquipment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      scope: {
        ...prev.scope,
        equipment_ids: (prev.scope.equipment_ids || []).filter((_, i) => i !== index),
        equipment_names: (prev.scope.equipment_names || []).filter((_, i) => i !== index)
      }
    }));
  };

  const handleChecklistChange = (checklistId: string) => {
    const actualChecklistId = checklistId === "none" ? "" : checklistId;
    setFormData(prev => ({ ...prev, checklist_id: actualChecklistId }));
    const checklist = checklists.find(c => c.id === actualChecklistId);
    setSelectedChecklist(checklist || null);
  };

  const handleViewChecklist = () => {
    setIsViewingChecklist(true);
  };

  // Filter equipment based on selected location (company or sector)
  const getFilteredEquipment = () => {
    if (!formData.scope.location_id) {
      // If no location selected, return empty array to force selection
      return [];
    }

    // Check if selected location is a company
    const selectedCompany = companies.find(c => c.id === formData.scope.location_id);
    if (selectedCompany) {
      // Get all sectors for this company
      const companySectors = sectors.filter(s => s.companyId === selectedCompany.id);
      const sectorIds = companySectors.map(s => s.id);
      
      // Return equipment that belongs to any sector of this company
      return equipment.filter(eq => eq.sectorId && sectorIds.includes(eq.sectorId));
    }

    // Check if selected location is a sector
    const selectedSector = sectors.find(s => s.id === formData.scope.location_id);
    if (selectedSector) {
      // Return equipment that belongs to this specific sector
      return equipment.filter(eq => eq.sectorId === selectedSector.id);
    }

    return [];
  };

  const isEditing = !!plan;
  const modalTitle = isEditing ? 'Editar Plano de Manutenção' : 'Novo Plano de Manutenção';
  const modalDescription = isEditing 
    ? 'Edite as configurações do plano de manutenção preventiva' 
    : 'Configure um novo plano de manutenção preventiva para seus equipamentos';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[98vw] max-w-7xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0 sm:w-[95vw] lg:w-[90vw] xl:w-[85vw]"
      >
        <DialogDescription className="sr-only">{modalDescription}</DialogDescription>
        {isViewingChecklist && selectedChecklist ? (
          // Modal de Visualização do Checklist
          <>
            <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    {selectedChecklist.name}
                  </DialogTitle>
                  {selectedChecklist.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedChecklist.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsViewingChecklist(false)}
                >
                  Voltar
                </Button>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-sm font-medium text-muted-foreground">Categoria</div>
                  <div className="text-lg font-semibold">HVAC</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm font-medium text-muted-foreground">Tipo de Equipamento</div>
                  <div className="text-lg font-semibold">{selectedChecklist.equipment_type || 'Geral'}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm font-medium text-muted-foreground">Total de Itens</div>
                  <div className="text-lg font-semibold">{selectedChecklist.items?.length || 0}</div>
                </Card>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium">Itens do Checklist</h3>
                <div className="space-y-3">
                  {(selectedChecklist.items || []).map((item, index) => (
                    <Card key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2">
                              {item.required && (
                                <Badge variant="destructive" className="text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {item.type === 'checkbox' ? 'Verificação' :
                                 item.type === 'number' ? 'Medição' :
                                 item.type === 'text' ? 'Texto' :
                                 item.type === 'photo' ? 'Foto' :
                                 item.type === 'select' ? 'Seleção' : 'Outro'}
                                {item.unit && ` (${item.unit})`}
                              </Badge>
                            </div>
                          </div>
                          {item.help_text && (
                            <p className="text-xs text-muted-foreground">
                              💡 {item.help_text}
                            </p>
                          )}
                          {item.options && item.options.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Opções:</span> {item.options.map((opt, i) => `${opt.label}${i < item.options!.length - 1 ? ', ' : ''}`)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          // Formulário Principal
          <>
            <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
              <DialogTitle className="text-xl font-semibold focus:outline-none" tabIndex={-1}>
                {modalTitle}
              </DialogTitle>
            </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-8">
            {/* Basic Information */}
            <section className="space-y-4">
              <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
                Informações Básicas
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Plano *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Plano Mensal - Climatizadores"
                    className={errors.name ? 'border-red-500' : ''}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-sm text-red-600" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequência *</Label>
                  <Select
                    value={formData.frequency || ''}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      frequency: value as MaintenancePlan['frequency']
                    }))}
                  >
                    <SelectTrigger className={errors.frequency ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
                      <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                      <SelectItem value="SEMI_ANNUAL">Semestral</SelectItem>
                      <SelectItem value="ANNUAL">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.frequency && (
                    <p className="text-sm text-red-600" role="alert">
                      {errors.frequency}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição detalhada do plano de manutenção"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </section>

            {/* Scope Configuration */}
            <section className="space-y-6">
              <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
                Escopo
              </h3>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Empresa/Localização *</Label>
                    <Select
                      value={formData.scope.location_id || "no-location"}
                      onValueChange={handleLocationChange}
                    >
                      <SelectTrigger className={`w-full ${errors.location ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Selecione uma empresa ou setor" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[350px] lg:max-w-[500px]">
                        <SelectItem value="no-location">Nenhuma selecionada</SelectItem>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Empresas
                        </div>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            <div className="flex flex-col items-start min-w-0">
                              <span className="font-medium truncate">{company.name}</span>
                              <span className="text-xs text-muted-foreground truncate">{company.segment}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t">
                          Setores
                        </div>
                        {sectors.map((sector) => {
                          const company = companies.find(c => c.id === sector.companyId);
                          return (
                            <SelectItem key={sector.id} value={sector.id}>
                              <div className="flex flex-col items-start min-w-0">
                                <span className="font-medium truncate">{sector.name}</span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {company?.name || 'Empresa não encontrada'}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {errors.location && (
                      <p className="text-sm text-red-600" role="alert">
                        {errors.location}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Selecione uma empresa para ver todos os equipamentos ou um setor específico para filtrar
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Equipamentos *</Label>
                    <Select 
                      onValueChange={handleEquipmentChange}
                      disabled={!formData.scope.location_id}
                    >
                      <SelectTrigger className={`w-full ${errors.equipment ? 'border-red-500' : ''}`}>
                        <SelectValue 
                          placeholder={
                            !formData.scope.location_id 
                              ? "Primeiro selecione uma empresa" 
                              : getFilteredEquipment().length === 0
                                ? "Nenhum equipamento disponível para esta localização"
                                : "Selecione equipamentos para o plano"
                          } 
                        />
                      </SelectTrigger>
                      <SelectContent className="max-w-[450px] lg:max-w-[600px]">
                        {getFilteredEquipment().map((eq) => (
                          <SelectItem 
                            key={eq.id} 
                            value={eq.id}
                            disabled={(formData.scope.equipment_ids || []).includes(eq.id)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {(formData.scope.equipment_ids || []).includes(eq.id) && (
                                <span className="text-primary shrink-0">✓</span>
                              )}
                              <div className="flex flex-col items-start min-w-0">
                                <span className="block truncate font-medium">{eq.tag} - {eq.model}</span>
                                <span className="text-xs text-muted-foreground truncate">{eq.brand} | {eq.type}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                        {getFilteredEquipment().length === 0 && formData.scope.location_id && (
                          <SelectItem value="no-equipment" disabled>
                            <span className="text-muted-foreground italic">
                              Nenhum equipamento cadastrado para esta localização
                            </span>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.equipment && (
                      <p className="text-sm text-red-600" role="alert">
                        {errors.equipment}
                      </p>
                    )}
                    {!formData.scope.location_id && (
                      <p className="text-sm text-muted-foreground">
                        Selecione uma empresa ou setor para visualizar os equipamentos disponíveis
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Equipment Display - Full Width */}
              {(formData.scope.equipment_ids || []).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Equipamentos Selecionados ({(formData.scope.equipment_ids || []).length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-md p-4 bg-muted/20">
                    {(formData.scope.equipment_ids || []).map((equipmentId, index) => {
                      const equipmentData = equipment.find(eq => eq.id === equipmentId);
                      const sectorData = sectors.find(s => s.id === equipmentData?.sectorId);
                      const companyData = companies.find(c => c.id === sectorData?.companyId);
                      
                      return (
                        <div key={index} className="flex items-center justify-between bg-background rounded-md px-4 py-3 border border-border">
                          <div className="flex-1 mr-3 min-w-0">
                            <span className="text-sm font-medium truncate block">{(formData.scope.equipment_names || [])[index]}</span>
                            {equipmentData && (
                              <span className="text-xs text-muted-foreground truncate block">
                                {equipmentData.brand} • {equipmentData.type} • {companyData?.name || sectorData?.name || 'Local não identificado'}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEquipment(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 h-8 w-8 p-0"
                            aria-label={`Remover ${(formData.scope.equipment_names || [])[index]}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  {formData.scope.location_id && (
                    <p className="text-xs text-muted-foreground">
                      Mostrando equipamentos de: <span className="font-medium">{formData.scope.location_name}</span>
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Status and Date */}
            <section className="space-y-4">
              <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
                Configurações Gerais
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      status: value as MaintenancePlan['status']
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="start-date">Data de Início *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className={!formData.start_date ? 'border-yellow-400' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Define quando as ordens de serviço começarão a ser geradas
                  </p>
                </div>
                
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      id="auto-generate"
                      type="checkbox"
                      checked={formData.auto_generate}
                      onChange={(e) => setFormData(prev => ({ ...prev, auto_generate: e.target.checked }))}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring focus:ring-2"
                    />
                    <Label htmlFor="auto-generate" className="text-sm font-medium cursor-pointer">
                      Gerar ordens de serviço automaticamente
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">
                    Quando ativado, as ordens de serviço serão criadas automaticamente nas datas programadas conforme a frequência definida
                  </p>
                </div>
              </div>
            </section>

            {/* Checklist Section */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-2">
                <h3 className="text-lg font-medium text-foreground">Checklist de Manutenção</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="checklist-select">Selecionar Checklist</Label>
                  <Select 
                    value={formData.checklist_id || "none"} 
                    onValueChange={handleChecklistChange}
                  >
                    <SelectTrigger className={errors.checklist ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione um checklist criado na tela de procedimentos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum checklist selecionado</SelectItem>
                      {checklists
                        .filter(checklist => checklist.is_active)
                        .map((checklist) => (
                          <SelectItem key={checklist.id} value={checklist.id}>
                            {checklist.name}
                            {checklist.equipment_type && ` - ${checklist.equipment_type}`}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                  {errors.checklist && (
                    <p className="text-sm text-red-600" role="alert">
                      {errors.checklist}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Os checklists são criados na tela de Procedimentos e definem as tarefas específicas a serem executadas
                  </p>
                </div>

                {/* Checklist Preview */}
                {selectedChecklist && (
                  <Card className="bg-muted/30 border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <ListChecks className="h-4 w-4 text-primary" />
                            {selectedChecklist.name}
                          </CardTitle>
                          {selectedChecklist.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {selectedChecklist.description}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleViewChecklist}
                          className="flex items-center gap-2 w-full sm:w-auto"
                        >
                          <Eye className="h-4 w-4" />
                          Visualizar Completo
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Itens do checklist ({selectedChecklist.items?.length || 0}):
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {(selectedChecklist.items || []).slice(0, 5).map((item, index) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <div className="w-4 h-4 border border-muted-foreground rounded-sm bg-background flex items-center justify-center">
                                <div className="w-2 h-2 bg-muted-foreground rounded-full opacity-50" />
                              </div>
                              <span>{item.description}</span>
                              {item.required && (
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  Obrigatório
                                </Badge>
                              )}
                            </div>
                          ))}
                          {(selectedChecklist.items?.length || 0) > 5 && (
                            <div className="text-xs text-muted-foreground pl-6">
                              ... e mais {(selectedChecklist.items?.length || 0) - 5} itens
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!formData.checklist_id && (
                  <Card className="border-dashed">
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center text-muted-foreground max-w-md">
                        <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p className="text-base font-medium mb-1">Nenhum checklist selecionado</p>
                        <p className="text-sm">
                          Selecione um checklist criado na tela de Procedimentos para definir as tarefas específicas deste plano de manutenção
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          </div>
        </form>

        <DialogFooter className="border-t border-border bg-muted/30 px-6 py-4 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="w-full sm:w-auto min-w-[120px] order-1 sm:order-2"
            >
              {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}