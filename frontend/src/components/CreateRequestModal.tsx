import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Loader2, Plus, MapPin, Package, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useCompanies, useSectors, useSubsections } from '@/hooks/useLocationsQuery';
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
  const [selectedSectorId, setSelectedSectorId] = useState<string>('');
  const [selectedSubsectionId, setSelectedSubsectionId] = useState<string>('');

  // Fetch sectors and subsections based on selection
  const { data: sectors = [] } = useSectors(selectedCompanyId || undefined);
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
    } else if (selectedCompanyId) {
      const sectorIds = sectors.map(s => s.id);
      filtered = filtered.filter(eq => 
        eq.companyId === selectedCompanyId || 
        (eq.sectorId && sectorIds.includes(eq.sectorId))
      );
    }

    return filtered;
  }, [equipment, selectedCompanyId, selectedSectorId, selectedSubsectionId, sectors]);

  const resetForm = () => {
    setFormData({
      equipmentId: '',
      note: ''
    });
    setSelectedCompanyId('');
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
      <DialogContent className="max-w-lg">
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

              {/* Company */}
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={(value) => {
                    setSelectedCompanyId(value);
                    setSelectedSectorId('');
                    setSelectedSubsectionId('');
                    setFormData(prev => ({ ...prev, equipmentId: '' }));
                    setErrors(prev => ({ ...prev, location: '' }));
                  }}
                >
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Selecione a empresa..." />
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

              {/* Sector and Subsection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">
                    Setor <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedSectorId}
                    onValueChange={(value) => {
                      setSelectedSectorId(value);
                      setSelectedSubsectionId('');
                      setFormData(prev => ({ ...prev, equipmentId: '' }));
                      setErrors(prev => ({ ...prev, location: '' }));
                    }}
                    disabled={!selectedCompanyId}
                  >
                    <SelectTrigger id="sector">
                      <SelectValue 
                        placeholder={selectedCompanyId ? "Selecione..." : "Selecione empresa"} 
                      />
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
                    <SelectTrigger id="subsection">
                      <SelectValue 
                        placeholder={selectedSectorId ? "Selecione..." : "Selecione setor"} 
                      />
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
                <Select
                  value={formData.equipmentId || "none"}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, equipmentId: value === "none" ? "" : value }))
                  }
                  disabled={!selectedSectorId}
                >
                  <SelectTrigger id="equipment">
                    <SelectValue 
                      placeholder={selectedSectorId ? "Selecione se aplicável..." : "Selecione um local primeiro"} 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum equipamento específico</SelectItem>
                    {filteredEquipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.tag} - {eq.brand} {eq.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredEquipment.length === 0 && selectedSectorId && (
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
