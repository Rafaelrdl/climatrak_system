import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useTechnicians } from '@/hooks/useTeamQuery';
import { useCompanies, useSectors, useSubsections } from '@/hooks/useLocationsQuery';
import type { WorkOrder } from '@/types';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workOrder: Omit<WorkOrder, 'id' | 'number'>) => void;
}

type Step = 'basic' | 'preview';

export function WorkOrderModal({ isOpen, onClose, onSave }: WorkOrderModalProps) {
  const { data: equipment = [] } = useEquipments();
  const { data: technicians = [] } = useTechnicians();
  const { data: companies = [] } = useCompanies();
  
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [isLoading, setIsLoading] = useState(false);

  // Location filters state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('');
  const [selectedSubsectionId, setSelectedSubsectionId] = useState<string>('');

  // Fetch sectors and subsections based on selection
  const { data: sectors = [] } = useSectors(selectedCompanyId || undefined);
  const { data: subsections = [] } = useSubsections(selectedSectorId || undefined);

  // Filter equipment based on selected location
  const filteredEquipment = useMemo(() => {
    let filtered = equipment;

    // Equipamentos podem ter companyId, sectorId ou subSectionId
    if (selectedSubsectionId) {
      filtered = filtered.filter(eq => eq.subSectionId === selectedSubsectionId);
    } else if (selectedSectorId) {
      filtered = filtered.filter(eq => eq.sectorId === selectedSectorId);
    } else if (selectedCompanyId) {
      // Filtrar por empresa - usando companyId direto ou via setores
      const sectorIds = sectors.map(s => s.id);
      filtered = filtered.filter(eq => 
        eq.companyId === selectedCompanyId || 
        (eq.sectorId && sectorIds.includes(eq.sectorId))
      );
    }

    return filtered;
  }, [equipment, selectedCompanyId, selectedSectorId, selectedSubsectionId, sectors]);

  // Form state
  const [formData, setFormData] = useState({
    equipmentId: '',
    type: 'PREVENTIVE' as WorkOrder['type'],
    priority: 'MEDIUM' as WorkOrder['priority'],
    scheduledDate: '',
    assignedTo: '',
    description: '',
    status: 'OPEN' as WorkOrder['status']
  });

  const resetForm = () => {
    setFormData({
      equipmentId: '',
      type: 'PREVENTIVE',
      priority: 'MEDIUM',
      scheduledDate: '',
      assignedTo: '',
      description: '',
      status: 'OPEN'
    });
    setSelectedCompanyId('');
    setSelectedSectorId('');
    setSelectedSubsectionId('');
    setCurrentStep('basic');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      onSave(formData);
      handleClose();
    } catch (error) {
      console.error('Error saving work order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEquipment = equipment.find(eq => eq.id === formData.equipmentId);

  const isBasicStepValid = () => {
    return formData.equipmentId && formData.description;
  };

  const canGoNext = () => {
    if (currentStep === 'basic') return isBasicStepValid();
    return true;
  };

  const renderBasicStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Location filters */}
        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Select
            value={selectedCompanyId}
            onValueChange={(value) => {
              setSelectedCompanyId(value);
              setSelectedSectorId('');
              setSelectedSubsectionId('');
              setFormData(prev => ({ ...prev, equipmentId: '' }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sector">Setor</Label>
            <Select
              value={selectedSectorId}
              onValueChange={(value) => {
                setSelectedSectorId(value);
                setSelectedSubsectionId('');
                setFormData(prev => ({ ...prev, equipmentId: '' }));
              }}
              disabled={!selectedCompanyId}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedCompanyId ? "Selecione..." : "Selecione empresa"} />
              </SelectTrigger>
              <SelectContent>
                {sectors.map(sector => (
                  <SelectItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subsection">Subsetor</Label>
            <Select
              value={selectedSubsectionId}
              onValueChange={(value) => {
                setSelectedSubsectionId(value);
                setFormData(prev => ({ ...prev, equipmentId: '' }));
              }}
              disabled={!selectedSectorId}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedSectorId ? "Selecione..." : "Selecione setor"} />
              </SelectTrigger>
              <SelectContent>
                {subsections.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="equipmentId">Equipamento *</Label>
          <Select
            value={formData.equipmentId}
            onValueChange={(value) => 
              setFormData(prev => ({ ...prev, equipmentId: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um equipamento" />
            </SelectTrigger>
            <SelectContent>
              {filteredEquipment.map(eq => (
                <SelectItem key={eq.id} value={eq.id}>
                  {eq.tag} - {eq.brand} {eq.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filteredEquipment.length === 0 && (selectedCompanyId || selectedSectorId || selectedSubsectionId) && (
            <p className="text-sm text-muted-foreground">
              Nenhum equipamento encontrado para esta localização
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value: WorkOrder['type']) => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PREVENTIVE">Preventiva</SelectItem>
                <SelectItem value="CORRECTIVE">Corretiva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: WorkOrder['priority']) => 
                setFormData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
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
          <Label htmlFor="scheduledDate">Data Agendada</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.scheduledDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.scheduledDate ? (
                  format(new Date(formData.scheduledDate), "PPP", { locale: ptBR })
                ) : (
                  "Selecione uma data"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.scheduledDate ? new Date(formData.scheduledDate) : undefined}
                onSelect={(date) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    scheduledDate: date ? date.toISOString() : '' 
                  }))
                }
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedTo">Responsável</Label>
          <Select
            value={formData.assignedTo}
            onValueChange={(value) => 
              setFormData(prev => ({ ...prev, assignedTo: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um responsável" />
            </SelectTrigger>
            <SelectContent>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={String(tech.user.id)}>
                  {tech.user.full_name || `${tech.user.first_name} ${tech.user.last_name}`.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => 
              setFormData(prev => ({ ...prev, description: e.target.value }))
            }
            placeholder="Descrição da ordem de serviço"
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const selectedSector = sectors.find(s => s.id === selectedSectorId);
  const selectedSubsection = subsections.find(s => s.id === selectedSubsectionId);

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo da Ordem de Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Localização */}
            {(selectedCompany || selectedSector || selectedSubsection) && (
              <div>
                <h5 className="font-medium text-sm mb-2">Localização</h5>
                <div className="text-sm text-muted-foreground">
                  {[selectedCompany?.name, selectedSector?.name, selectedSubsection?.name]
                    .filter(Boolean)
                    .join(' → ')}
                </div>
              </div>
            )}

            {selectedEquipment && (
              <div>
                <h5 className="font-medium text-sm mb-2">Equipamento</h5>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <div><strong>Tag:</strong> {selectedEquipment.tag}</div>
                  <div><strong>Modelo:</strong> {selectedEquipment.brand} {selectedEquipment.model}</div>
                  <div><strong>Tipo:</strong> {selectedEquipment.type}</div>
                </div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Tipo:</span>
                <p className="text-sm text-muted-foreground">
                  {formData.type === 'PREVENTIVE' ? 'Preventiva' : 'Corretiva'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium">Prioridade:</span>
                <p className="text-sm text-muted-foreground">
                  {formData.priority === 'LOW' ? 'Baixa' : 
                   formData.priority === 'MEDIUM' ? 'Média' : 
                   formData.priority === 'HIGH' ? 'Alta' : 'Crítica'}
                </p>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium">Data Agendada:</span>
              <p className="text-sm text-muted-foreground">
                {formData.scheduledDate && format(new Date(formData.scheduledDate), "PPP", { locale: ptBR })}
              </p>
            </div>

            {formData.assignedTo && (
              <div>
                <span className="text-sm font-medium">Responsável:</span>
                <p className="text-sm text-muted-foreground">
                  {technicians.find(t => String(t.user.id) === formData.assignedTo)?.user.full_name || 
                   technicians.find(t => String(t.user.id) === formData.assignedTo)?.user.first_name || 
                   formData.assignedTo}
                </p>
              </div>
            )}

            <div>
              <span className="text-sm font-medium">Descrição:</span>
              <p className="text-sm text-muted-foreground">{formData.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 'basic': return 'Informações Básicas';
      case 'preview': return 'Revisão';
      default: return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'basic': return 'Preencha as informações básicas da ordem de serviço';
      case 'preview': return 'Revise as informações antes de salvar';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço - {getStepTitle()}</DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 pb-6">
          {(['basic', 'preview'] as Step[]).map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  currentStep === step && "bg-primary text-primary-foreground",
                  (currentStep === 'preview' && step === 'basic')
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </div>
              {index < 1 && (
                <div className={cn(
                  "w-12 h-0.5 mx-2",
                  currentStep === 'preview'
                    ? "bg-primary"
                    : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="max-h-96">
          {currentStep === 'basic' && renderBasicStep()}
          {currentStep === 'preview' && renderPreviewStep()}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between pt-6 border-t">
          <div>
            {currentStep !== 'basic' && (
              <Button
                variant="outline"
                onClick={() => {
                  if (currentStep === 'preview') setCurrentStep('basic');
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            
            {currentStep === 'preview' ? (
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Salvando...' : 'Criar OS'}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (currentStep === 'basic') setCurrentStep('preview');
                }}
                disabled={!canGoNext()}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}