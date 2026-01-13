import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Loader2, Plus, MapPin, Package, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useCompanies, useUnits, useSectors, useSubsections } from '@/hooks/useLocationsQuery';
import { useCreateRequest } from '@/hooks/useRequestsQuery';
import type { CreateRequestData } from '@/services/requestsService';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateRequestModal({ isOpen, onClose, onSuccess }: CreateRequestModalProps) {
  const { data: equipment = [] } = useEquipments();
  const { data: companies = [] } = useCompanies();
  
  const createMutation = useCreateRequest();

  // Location filters state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('');
  const [selectedSubsectionId, setSelectedSubsectionId] = useState<string>('');

  // Fetch units, sectors and subsections based on selection
  const { data: units = [] } = useUnits(selectedCompanyId || undefined);
  const { data: sectors = [] } = useSectors(selectedUnitId || undefined);
  const { data: subsections = [] } = useSubsections(selectedSectorId || undefined);

  // Form state
  const [formData, setFormData] = useState({
    equipmentId: '',
    note: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter equipment based on selected location
  const filteredEquipment = useMemo(() => {
    let filtered = equipment;

    if (selectedSubsectionId) {
      filtered = filtered.filter(eq => eq.subSectionId === selectedSubsectionId);
    } else if (selectedSectorId) {
      filtered = filtered.filter(eq => eq.sectorId === selectedSectorId);
    } else if (selectedUnitId) {
      const sectorIds = sectors.map(s => s.id);
      filtered = filtered.filter(eq => 
        eq.unitId === selectedUnitId || 
        (eq.sectorId && sectorIds.includes(eq.sectorId))
      );
    } else if (selectedCompanyId) {
      const unitIds = units.map(u => u.id);
      filtered = filtered.filter(eq => 
        eq.companyId === selectedCompanyId || 
        (eq.unitId && unitIds.includes(eq.unitId))
      );
    }

    return filtered;
  }, [equipment, selectedCompanyId, selectedUnitId, selectedSectorId, selectedSubsectionId, units, sectors]);

  // Auto-fill location fields when equipment is selected
  const handleEquipmentSelect = useCallback((equipmentId: string) => {
    if (equipmentId === "none" || !equipmentId) {
      setFormData(prev => ({ ...prev, equipmentId: '' }));
      return;
    }

    const selectedEquipment = equipment.find(eq => eq.id === equipmentId);
    if (!selectedEquipment) {
      setFormData(prev => ({ ...prev, equipmentId }));
      return;
    }

    setFormData(prev => ({ ...prev, equipmentId }));

    // Auto-fill all location fields from equipment (always update to ensure full hierarchy)
    if (selectedEquipment.companyId) {
      setSelectedCompanyId(selectedEquipment.companyId);
    }
    if (selectedEquipment.unitId) {
      setSelectedUnitId(selectedEquipment.unitId);
    }
    if (selectedEquipment.sectorId) {
      setSelectedSectorId(selectedEquipment.sectorId);
      setErrors(prev => ({ ...prev, location: '' }));
    }
    if (selectedEquipment.subSectionId) {
      setSelectedSubsectionId(selectedEquipment.subSectionId);
    }
  }, [equipment]);

  const resetForm = () => {
    setFormData({
      equipmentId: '',
      note: ''
    });
    setSelectedCompanyId('');
    setSelectedUnitId('');
    setSelectedSectorId('');
    setSelectedSubsectionId('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Deve ter pelo menos um local selecionado (setor ou subsetor)
    if (!selectedSectorId && !selectedSubsectionId) {
      newErrors.location = 'Selecione pelo menos o setor da solicitação';
    }

    // Descrição é obrigatória
    if (!formData.note.trim()) {
      newErrors.note = 'Descreva o problema ou solicitação';
    } else if (formData.note.trim().length < 10) {
      newErrors.note = 'A descrição deve ter pelo menos 10 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const requestData: CreateRequestData = {
      sector_id: selectedSectorId,
      subsection_id: selectedSubsectionId || undefined,
      equipment_id: formData.equipmentId || undefined,
      note: formData.note.trim()
    };

    try {
      await createMutation.mutateAsync(requestData);
      toast.success('Solicitação enviada com sucesso!', {
        description: 'Sua solicitação foi registrada e está aguardando análise.'
      });
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Erro ao enviar solicitação', {
        description: 'Tente novamente mais tarde.'
      });
    }
  };

  const isFormValid = (selectedSectorId || selectedSubsectionId) && formData.note.trim().length >= 10;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Solicitação
          </DialogTitle>
          <DialogDescription>
            Registre uma solicitação de manutenção. A equipe técnica irá analisar e, se necessário, converter em ordem de serviço.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 py-2">
            {/* Location Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Localização
              </div>

              {/* Company and Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="company">Empresa</Label>
                  <SearchableSelect
                    id="company"
                    options={companies.map(company => ({ value: company.id, label: company.name }))}
                    value={selectedCompanyId}
                    onValueChange={(value) => {
                      setSelectedCompanyId(value);
                      setSelectedUnitId('');
                      setSelectedSectorId('');
                      setSelectedSubsectionId('');
                      setFormData(prev => ({ ...prev, equipmentId: '' }));
                      setErrors(prev => ({ ...prev, location: '' }));
                    }}
                    placeholder="Selecione..."
                    searchPlaceholder="Buscar empresa..."
                    emptyMessage="Nenhuma empresa encontrada."
                  />
                </div>

                <div className="space-y-2 min-w-0">
                  <Label htmlFor="unit">Unidade</Label>
                  <SearchableSelect
                    id="unit"
                    options={units.map(unit => ({ value: unit.id, label: unit.name }))}
                    value={selectedUnitId}
                    onValueChange={(value) => {
                      setSelectedUnitId(value);
                      setSelectedSectorId('');
                      setSelectedSubsectionId('');
                      setFormData(prev => ({ ...prev, equipmentId: '' }));
                      setErrors(prev => ({ ...prev, location: '' }));
                    }}
                    placeholder={selectedCompanyId ? "Selecione..." : "Selecione empresa"}
                    searchPlaceholder="Buscar unidade..."
                    emptyMessage="Nenhuma unidade encontrada."
                    disabled={!selectedCompanyId}
                  />
                </div>
              </div>

              {/* Sector and Subsection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">
                    Setor <span className="text-destructive">*</span>
                  </Label>
                  <SearchableSelect
                    id="sector"
                    options={sectors.map(sector => ({ value: sector.id, label: sector.name }))}
                    value={selectedSectorId}
                    onValueChange={(value) => {
                      setSelectedSectorId(value);
                      setSelectedSubsectionId('');
                      setFormData(prev => ({ ...prev, equipmentId: '' }));
                      setErrors(prev => ({ ...prev, location: '' }));
                    }}
                    placeholder={selectedUnitId ? "Selecione..." : "Selecione unidade"}
                    searchPlaceholder="Buscar setor..."
                    emptyMessage="Nenhum setor encontrado."
                    disabled={!selectedUnitId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subsection">Subsetor</Label>
                  <SearchableSelect
                    id="subsection"
                    options={subsections.map(sub => ({ value: sub.id, label: sub.name }))}
                    value={selectedSubsectionId}
                    onValueChange={(value) => {
                      setSelectedSubsectionId(value);
                      setFormData(prev => ({ ...prev, equipmentId: '' }));
                    }}
                    placeholder={selectedSectorId ? "Selecione..." : "Selecione setor"}
                    searchPlaceholder="Buscar subsetor..."
                    emptyMessage="Nenhum subsetor encontrado."
                    disabled={!selectedSectorId}
                  />
                </div>
              </div>

              {errors.location && (
                <p className="text-sm text-destructive">{errors.location}</p>
              )}
            </div>

            {/* Equipment Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Package className="h-4 w-4" />
                Equipamento (opcional)
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment">Equipamento relacionado</Label>
                <SearchableSelect
                  id="equipment"
                  options={[
                    { value: 'none', label: 'Nenhum equipamento específico' },
                    ...filteredEquipment.map(eq => ({ 
                      value: eq.id, 
                      label: `${eq.tag} - ${eq.brand} ${eq.model}` 
                    }))
                  ]}
                  value={formData.equipmentId || 'none'}
                  onValueChange={handleEquipmentSelect}
                  placeholder="Selecione se aplicável..."
                  searchPlaceholder="Buscar equipamento..."
                  emptyMessage="Nenhum equipamento encontrado."
                />
                {filteredEquipment.length === 0 && (selectedCompanyId || selectedUnitId || selectedSectorId) && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum equipamento encontrado nesta localização
                  </p>
                )}
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Descrição
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">
                  Descreva o problema ou solicitação <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="note"
                  placeholder="Descreva detalhadamente o problema observado ou a manutenção necessária..."
                  value={formData.note}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, note: e.target.value }));
                    if (errors.note && e.target.value.trim().length >= 10) {
                      setErrors(prev => ({ ...prev, note: '' }));
                    }
                  }}
                  rows={4}
                  className={errors.note ? 'border-destructive' : ''}
                />
                {errors.note && (
                  <p className="text-sm text-destructive">{errors.note}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.note.length} caracteres (mínimo: 10)
                </p>
              </div>
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Após enviar, sua solicitação ficará pendente até ser analisada pela equipe de manutenção, 
                que poderá convertê-la em uma ordem de serviço.
              </AlertDescription>
            </Alert>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isFormValid || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Enviar Solicitação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
