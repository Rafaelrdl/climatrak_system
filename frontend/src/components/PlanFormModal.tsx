import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, CheckSquare, Eye, ListChecks, Plus, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { MaintenancePlan } from '@/types';
import { plansService } from '@/services/plansService';
import { useCompanies, useSectors } from '@/hooks/useLocationsQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useChecklists } from '@/hooks/useChecklistsQuery';
import { AddEquipmentsModal, type SelectedEquipment } from './AddEquipmentsModal';
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
    selectedEquipments: SelectedEquipment[];
    checklist_id: string;
    status: MaintenancePlan['status'];
    start_date: string;
    auto_generate: boolean;
  }>({
    name: '',
    description: '',
    frequency: '',
    selectedEquipments: [],
    checklist_id: '',
    status: 'Ativo',
    start_date: '',
    auto_generate: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistTemplate | null>(null);
  const [isViewingChecklist, setIsViewingChecklist] = useState(false);
  const [isAddEquipmentsOpen, setIsAddEquipmentsOpen] = useState(false);

  // Load plan data when editing
  useEffect(() => {
    if (plan) {
      // Usar assets diretamente da API ou fallback para scope legado
      const equipmentIds = plan.assets || plan.scope?.equipment_ids || [];
      const equipmentNames = plan.asset_names || plan.scope?.equipment_names || [];
      
      // Converter para o formato SelectedEquipment
      const selectedEquipments: SelectedEquipment[] = equipmentIds.map((id, index) => {
        const eq = equipment.find(e => e.id === id);
        const sector = eq ? sectors.find(s => s.id === eq.sectorId) : null;
        const company = sector ? companies.find(c => c.id === sector.companyId) : null;
        
        return {
          id,
          name: eq?.tag || eq?.model || '',
          tag: equipmentNames[index] || eq?.tag || '',
          brand: eq?.brand,
          type: eq?.type,
          sectorName: sector?.name,
          companyName: company?.name,
        };
      });
      
      setFormData({
        name: plan.name,
        description: plan.description || '',
        frequency: plan.frequency,
        selectedEquipments,
        checklist_id: plan.checklist_id || '',
        status: plan.status || (plan.isActive ? 'Ativo' : 'Inativo'),
        start_date: plan.next_execution_date?.split('T')[0] || '',
        auto_generate: plan.auto_generate || false
      });
    } else {
      // Reset form for new plan
      setFormData({
        name: '',
        description: '',
        frequency: '',
        selectedEquipments: [],
        checklist_id: '',
        status: 'Ativo',
        start_date: '',
        auto_generate: false
      });
    }
    setErrors({});
  }, [plan, open, equipment, sectors, companies]);

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

    // Validate equipment selection
    if (formData.selectedEquipments.length === 0) {
      newErrors.equipment = 'Pelo menos um equipamento deve ser selecionado';
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
      const isNewPlan = !plan;
      
      // Validar frequency antes de enviar (já validado no form, mas para segurança de tipo)
      if (!formData.frequency) {
        toast.error('Frequência é obrigatória');
        setIsSubmitting(false);
        return;
      }
      
      // Preparar dados para a API
      const apiData = {
        name: formData.name,
        description: formData.description,
        frequency: formData.frequency, // Já está em inglês (MONTHLY, QUARTERLY, etc.)
        is_active: formData.status === 'Ativo',
        assets: formData.selectedEquipments.map(eq => eq.id),
        checklist_template: formData.checklist_id || undefined,
        auto_generate: formData.auto_generate,
        next_execution: formData.start_date || undefined, // Data de início = próxima execução
      };
      
      // Create ou update retornam MaintenancePlan com created_at/updated_at
      const savedPlan = plan
        ? await plansService.update(plan.id, apiData)
        : await plansService.create(apiData);
      
      toast.success(plan ? 'Plano atualizado com sucesso.' : 'Plano criado com sucesso.');
      
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

  const handleChecklistChange = (checklistId: string) => {
    const actualChecklistId = checklistId === "none" ? "" : checklistId;
    setFormData(prev => ({ ...prev, checklist_id: actualChecklistId }));
    const checklist = checklists.find(c => c.id === actualChecklistId);
    setSelectedChecklist(checklist || null);
  };

  const handleViewChecklist = () => {
    setIsViewingChecklist(true);
  };

  // Handler para confirmar equipamentos do modal
  const handleEquipmentsConfirm = (equipments: SelectedEquipment[]) => {
    setFormData(prev => ({ ...prev, selectedEquipments: equipments }));
  };

  // Handler para remover equipamento individual
  const removeEquipment = (equipmentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedEquipments: prev.selectedEquipments.filter(eq => eq.id !== equipmentId)
    }));
  };

  const isEditing = !!plan;
  const modalTitle = isEditing ? 'Editar Plano de Manutenção' : 'Novo Plano de Manutenção';
  const modalDescription = isEditing 
    ? 'Edite as configurações do plano de manutenção preventiva' 
    : 'Configure um novo plano de manutenção preventiva para seus equipamentos';

  return (
    <>
    <AddEquipmentsModal
      open={isAddEquipmentsOpen}
      onOpenChange={setIsAddEquipmentsOpen}
      selectedEquipments={formData.selectedEquipments}
      onConfirm={handleEquipmentsConfirm}
    />
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
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-lg font-medium text-foreground">
                  Escopo
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddEquipmentsOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Equipamentos
                </Button>
              </div>

              {/* Selected Equipment Display */}
              {formData.selectedEquipments.length > 0 ? (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Equipamentos Selecionados ({formData.selectedEquipments.length})
                  </Label>
                  <div className="space-y-2 max-h-52 overflow-y-auto border border-border rounded-md p-4 bg-muted/20">
                    {formData.selectedEquipments.map((eq) => {
                      // Construir localização hierárquica completa
                      const locationParts = [eq.companyName, eq.unitName, eq.sectorName, eq.subsectionName].filter(Boolean);
                      const fullLocation = locationParts.join(' › ');
                      
                      return (
                        <div 
                          key={eq.id} 
                          className="flex items-center justify-between bg-background rounded-md px-4 py-3 border border-border"
                        >
                          <div className="flex-1 mr-3 min-w-0">
                            <span className="text-sm font-medium truncate block">
                              {eq.tag || eq.name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate block">
                              {[eq.brand, eq.type].filter(Boolean).join(' • ')}
                            </span>
                            {fullLocation && (
                              <span className="text-xs text-muted-foreground truncate block mt-0.5" title={fullLocation}>
                                 {fullLocation}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEquipment(eq.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 h-8 w-8 p-0"
                            aria-label={`Remover ${eq.tag || eq.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/10">
                  <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Nenhum equipamento selecionado
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em "Adicionar Equipamentos" para selecionar os equipamentos do plano
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddEquipmentsOpen(true)}
                    className="mt-4 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Equipamentos
                  </Button>
                </div>
              )}
              {errors.equipment && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.equipment}
                </p>
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
                          {(selectedChecklist.items || []).slice(0, 5).map((item) => (
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
    </>
  );
}
