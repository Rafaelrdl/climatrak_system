/**
 * AddEquipmentsModal - Modal para adicionar múltiplos equipamentos
 * 
 * Modal com filtro por localização, barra de busca e seleção múltipla de equipamentos.
 */

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, X, Building2, MapPin, Package } from 'lucide-react';
import { useCompanies, useSectors, useUnits, useSubsections } from '@/hooks/useLocationsQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import type { Equipment } from '@/types';

export interface SelectedEquipment {
  id: string;
  name: string;
  tag: string;
  brand?: string;
  type?: string;
  sectorName?: string;
  companyName?: string;
  unitName?: string;
  subsectionName?: string;
}

interface AddEquipmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEquipments: SelectedEquipment[];
  onConfirm: (equipments: SelectedEquipment[]) => void;
}

export function AddEquipmentsModal({ 
  open, 
  onOpenChange, 
  selectedEquipments: initialSelected,
  onConfirm 
}: AddEquipmentsModalProps) {
  const { data: companies = [] } = useCompanies();
  const { data: units = [] } = useUnits();
  const { data: sectors = [] } = useSectors();
  const { data: subsections = [] } = useSubsections();
  const { data: equipments = [] } = useEquipments();

  // Local state
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedLocationType, setSelectedLocationType] = useState<'company' | 'sector' | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState<SelectedEquipment[]>([]);

  // Sync temp selection with initial selection when modal opens
  useEffect(() => {
    if (open) {
      setTempSelected(initialSelected);
    }
  }, [open, initialSelected]);

  // Reset state when modal closes
  const handleClose = () => {
    setSearchTerm('');
    setSelectedLocationId('');
    setSelectedLocationType('');
    onOpenChange(false);
  };

  // Filter equipments based on location and search
  const filteredEquipments = useMemo(() => {
    let filtered = equipments;

    // Filter by location
    if (selectedLocationId) {
      if (selectedLocationType === 'company') {
        // Get all sectors for this company
        const companySectors = sectors.filter(s => s.companyId === selectedLocationId);
        const sectorIds = companySectors.map(s => s.id);
        filtered = filtered.filter(eq => eq.sectorId && sectorIds.includes(eq.sectorId));
      } else if (selectedLocationType === 'sector') {
        // Filter by specific sector
        filtered = filtered.filter(eq => eq.sectorId === selectedLocationId);
      }
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(eq => 
        eq.tag?.toLowerCase().includes(term) ||
        eq.model?.toLowerCase().includes(term) ||
        eq.brand?.toLowerCase().includes(term) ||
        eq.type?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [equipments, selectedLocationId, selectedLocationType, searchTerm, sectors]);

  // Check if equipment is selected
  const isSelected = (equipmentId: string) => {
    return tempSelected.some(eq => eq.id === equipmentId);
  };

  // Toggle equipment selection
  const toggleEquipment = (equipment: Equipment) => {
    const sector = sectors.find(s => s.id === equipment.sectorId);
    const unit = sector ? units.find(u => u.id === sector.unitId) : null;
    const company = unit ? companies.find(c => c.id === unit.companyId) : null;
    const subsection = equipment.subSectionId ? subsections.find(ss => ss.id === equipment.subSectionId) : null;

    const equipmentData: SelectedEquipment = {
      id: equipment.id,
      name: equipment.model || equipment.tag || '',
      tag: equipment.tag || '',
      brand: equipment.brand,
      type: equipment.type,
      sectorName: sector?.name,
      companyName: company?.name,
      unitName: unit?.name,
      subsectionName: subsection?.name,
    };

    if (isSelected(equipment.id)) {
      setTempSelected(prev => prev.filter(eq => eq.id !== equipment.id));
    } else {
      setTempSelected(prev => [...prev, equipmentData]);
    }
  };

  // Select all filtered equipments
  const selectAll = () => {
    const newSelections: SelectedEquipment[] = [];
    
    filteredEquipments.forEach(equipment => {
      if (!isSelected(equipment.id)) {
        const sector = sectors.find(s => s.id === equipment.sectorId);
        const unit = sector ? units.find(u => u.id === sector.unitId) : null;
        const company = unit ? companies.find(c => c.id === unit.companyId) : null;
        const subsection = equipment.subSectionId ? subsections.find(ss => ss.id === equipment.subSectionId) : null;

        newSelections.push({
          id: equipment.id,
          name: equipment.model || equipment.tag || '',
          tag: equipment.tag || '',
          brand: equipment.brand,
          type: equipment.type,
          sectorName: sector?.name,
          companyName: company?.name,
          unitName: unit?.name,
          subsectionName: subsection?.name,
        });
      }
    });

    setTempSelected(prev => [...prev, ...newSelections]);
  };

  // Clear selection from filtered equipments
  const clearFilteredSelection = () => {
    const filteredIds = filteredEquipments.map(eq => eq.id);
    setTempSelected(prev => prev.filter(eq => !filteredIds.includes(eq.id)));
  };

  // Handle confirm
  const handleConfirm = () => {
    onConfirm(tempSelected);
    handleClose();
  };

  // Remove specific equipment from temp selection
  const removeFromSelection = (equipmentId: string) => {
    setTempSelected(prev => prev.filter(eq => eq.id !== equipmentId));
  };

  const allFilteredSelected = filteredEquipments.length > 0 && 
    filteredEquipments.every(eq => isSelected(eq.id));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Selecione os equipamentos que farão parte deste plano de manutenção
        </DialogDescription>
        
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Adicionar Equipamentos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-6 py-4 gap-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Empresa/Localização
              </Label>
              <Select
                value={selectedLocationId ? `${selectedLocationType}:${selectedLocationId}` : "all"}
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedLocationId('');
                    setSelectedLocationType('');
                  } else {
                    const [type, id] = value.split(':');
                    setSelectedLocationType(type as 'company' | 'sector');
                    setSelectedLocationId(id);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as localizações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as localizações</SelectItem>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Empresas
                  </div>
                  {companies.map((company) => (
                    <SelectItem key={`company-${company.id}`} value={`company:${company.id}`}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        <span>{company.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t">
                    Setores
                  </div>
                  {sectors.map((sector) => {
                    const company = companies.find(c => c.id === sector.companyId);
                    return (
                      <SelectItem key={`sector-${sector.id}`} value={`sector:${sector.id}`}>
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{sector.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground ml-5">
                            {company?.name}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Buscar Equipamento
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por tag, nome, modelo, marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Selection summary and actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-y border-border">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3">
                {tempSelected.length} selecionado(s)
              </Badge>
              <span className="text-sm text-muted-foreground">
                {filteredEquipments.length} equipamento(s) encontrado(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {filteredEquipments.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={allFilteredSelected ? clearFilteredSelection : selectAll}
                  >
                    {allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Equipment list */}
          <div className="flex-1 min-h-0 -mx-6">
            <ScrollArea className="h-full px-6">
              {filteredEquipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium">
                    {searchTerm || selectedLocationId 
                      ? 'Nenhum equipamento encontrado com os filtros aplicados'
                      : 'Nenhum equipamento disponível'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tente ajustar os filtros de busca
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredEquipments.map((equipment) => {
                    const sector = sectors.find(s => s.id === equipment.sectorId);
                    const unit = sector ? units.find(u => u.id === sector.unitId) : null;
                    const company = unit ? companies.find(c => c.id === unit.companyId) : null;
                    const subsection = equipment.subSectionId ? subsections.find(ss => ss.id === equipment.subSectionId) : null;
                    const selected = isSelected(equipment.id);
                    
                    // Construir localização hierárquica
                    const locationParts = [company?.name, unit?.name, sector?.name, subsection?.name].filter(Boolean);
                    const fullLocation = locationParts.join(' › ');

                  return (
                    <div
                      key={equipment.id}
                      className={`
                        flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all
                        ${selected 
                          ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' 
                          : 'bg-background border-border hover:bg-muted/50'
                        }
                      `}
                      onClick={() => toggleEquipment(equipment)}
                    >
                      <Checkbox 
                        checked={selected}
                        onCheckedChange={() => toggleEquipment(equipment)}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {equipment.tag}
                          </span>
                          {equipment.model && (
                            <span className="text-muted-foreground">
                              - {equipment.model}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                          {equipment.brand && (
                            <span>{equipment.brand}</span>
                          )}
                          {equipment.model && (
                            <>
                              <span>•</span>
                              <span>{equipment.model}</span>
                            </>
                          )}
                          {equipment.type && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {equipment.type}
                              </Badge>
                            </>
                          )}
                        </div>
                        {fullLocation && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate" title={fullLocation}>{fullLocation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </ScrollArea>
          </div>

          {/* Selected items preview */}
          {tempSelected.length > 0 && (
            <div className="border-t border-border pt-4">
              <Label className="text-sm font-medium mb-2 block">
                Equipamentos selecionados ({tempSelected.length})
              </Label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {tempSelected.map((eq) => (
                  <Badge 
                    key={eq.id} 
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span>{eq.tag}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromSelection(eq.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-muted/30 px-6 py-4 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="w-full sm:w-auto gap-2"
            >
              <Plus className="h-4 w-4" />
              Confirmar Seleção ({tempSelected.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
