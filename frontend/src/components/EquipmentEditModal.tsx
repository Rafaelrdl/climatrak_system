/**
 * EquipmentEditModal - Modal de Edição de Equipamento (CMMS)
 * 
 * Modal para editar informações de um equipamento no módulo CMMS.
 * Com 3 abas: Informações Básicas, Localização e Especificações.
 */

import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUpdateEquipment } from '@/hooks/useEquipmentQuery';
import { useCompanies, useSectors, useSubsections } from '@/hooks/useLocationsQuery';
import type { Equipment } from '@/types';
import { toast } from 'sonner';

interface EquipmentEditModalProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Tipos de equipamento expandidos
const EQUIPMENT_TYPES = [
  { value: 'CHILLER', label: 'Chiller' },
  { value: 'AHU', label: 'AHU (Unidade de Tratamento de Ar)' },
  { value: 'FAN_COIL', label: 'Fan Coil' },
  { value: 'PUMP', label: 'Bomba' },
  { value: 'BOILER', label: 'Caldeira' },
  { value: 'COOLING_TOWER', label: 'Torre de Resfriamento' },
  { value: 'VRF', label: 'VRF (Variable Refrigerant Flow)' },
  { value: 'RTU', label: 'RTU (Rooftop Unit)' },
  { value: 'SPLIT', label: 'Split' },
  { value: 'CENTRAL', label: 'Central' },
  { value: 'VALVE', label: 'Válvula' },
  { value: 'SENSOR', label: 'Sensor' },
  { value: 'CONTROLLER', label: 'Controlador' },
  { value: 'FILTER', label: 'Filtro' },
  { value: 'OTHER', label: 'Outros' },
];

// Opções de status do equipamento
const STATUS_OPTIONS = [
  { value: 'FUNCTIONING', label: '🟢 Ativo' },
  { value: 'MAINTENANCE', label: '🟡 Em Manutenção' },
  { value: 'STOPPED', label: '🔴 Desativado' },
];

// Opções de criticidade
const CRITICIDADE_OPTIONS = [
  { value: 'BAIXA', label: '🔵 Baixa' },
  { value: 'MEDIA', label: '🟢 Média' },
  { value: 'ALTA', label: '🟠 Alta' },
  { value: 'CRITICA', label: '🔴 Crítica' },
];

// Opções de fases
const PHASES_OPTIONS = [
  { value: 'monofasico', label: 'Monofásico' },
  { value: 'bifasico', label: 'Bifásico' },
  { value: 'trifasico', label: 'Trifásico' },
];

// Opções de unidade de capacidade
const CAPACITY_UNITS = [
  { value: 'TR', label: 'TR' },
  { value: 'BTU/h', label: 'BTU/h' },
  { value: 'kcal/h', label: 'kcal/h' },
];

// Opções de fluido refrigerante
const REFRIGERANT_OPTIONS = [
  { value: 'none', label: 'Nenhum' },
  { value: 'R-22', label: 'R-22' },
  { value: 'R-134a', label: 'R-134a' },
  { value: 'R-404A', label: 'R-404A' },
  { value: 'R-407C', label: 'R-407C' },
  { value: 'R-410A', label: 'R-410A' },
  { value: 'R-32', label: 'R-32' },
  { value: 'R-717', label: 'R-717 (Amônia)' },
  { value: 'R-744', label: 'R-744 (CO₂)' },
];

export function EquipmentEditModal({ equipment, open, onOpenChange }: EquipmentEditModalProps) {
  const updateMutation = useUpdateEquipment();
  const [activeTab, setActiveTab] = useState('basic');

  // Informações Básicas
  const [tag, setTag] = useState('');
  const [equipmentType, setEquipmentType] = useState('CHILLER');
  const [equipmentStatus, setEquipmentStatus] = useState<'FUNCTIONING' | 'MAINTENANCE' | 'STOPPED'>('FUNCTIONING');
  const [criticidade, setCriticidade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'>('MEDIA');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  // Localização - agora usando IDs
  const [companyId, setCompanyId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [subsectorId, setSubsectorId] = useState('');
  const [location, setLocation] = useState('');

  // Carregar dados de empresas, setores e subsetores
  const { data: companies = [], isLoading: isLoadingCompanies } = useCompanies();
  const { data: allSectors = [], isLoading: isLoadingSectors } = useSectors();
  const { data: allSubsections = [], isLoading: isLoadingSubsections } = useSubsections();

  // Filtrar setores pela empresa selecionada
  const filteredSectors = companyId
    ? allSectors.filter((s) => s.companyId === companyId)
    : allSectors;

  // Filtrar subsetores pelo setor selecionado
  const filteredSubsections = sectorId
    ? allSubsections.filter((ss) => ss.sectorId === sectorId)
    : allSubsections;

  // Obter nomes para exibição na prévia
  const selectedCompany = companies.find((c) => c.id === companyId);
  const selectedSector = allSectors.find((s) => s.id === sectorId);
  const selectedSubsection = allSubsections.find((ss) => ss.id === subsectorId);

  // Especificações Técnicas
  const [voltage, setVoltage] = useState('');
  const [phases, setPhases] = useState('trifasico');
  const [maxCurrent, setMaxCurrent] = useState('');
  const [powerFactor, setPowerFactor] = useState('');
  const [capacity, setCapacity] = useState('');
  const [capacityUnit, setCapacityUnit] = useState('TR');
  const [refrigerant, setRefrigerant] = useState('none');
  const [activePower, setActivePower] = useState('');
  const [apparentPower, setApparentPower] = useState('');
  const [reactivePower, setReactivePower] = useState('');

  // Preencher formulário quando o equipment mudar ou modal abrir
  useEffect(() => {
    if (equipment && open) {
      setTag(equipment.tag || '');
      setEquipmentType(equipment.type || 'CHILLER');
      setEquipmentStatus(equipment.status || 'FUNCTIONING');
      setCriticidade(equipment.criticidade || 'MEDIA');
      setBrand(equipment.brand || '');
      setModel(equipment.model || '');
      setSerialNumber(equipment.serialNumber || '');
      
      // Localização - usar IDs diretamente do equipment
      setCompanyId(equipment.companyId || '');
      setSectorId(equipment.sectorId || '');
      setSubsectorId(equipment.subSectionId || '');
      setLocation(equipment.location || '');
      
      // Especificações - buscar do objeto specifications ou campos diretos
      const specs = (equipment.specifications || {}) as Record<string, unknown>;
      setVoltage(specs.voltage?.toString() || '');
      setPhases((specs.phases as string) || 'trifasico');
      setMaxCurrent(specs.maxCurrent?.toString() || '');
      setPowerFactor(specs.powerFactor?.toString() || '');
      setCapacity(specs.capacity?.toString() || equipment.capacity?.toString() || '');
      setCapacityUnit((specs.capacityUnit as string) || 'TR');
      setRefrigerant((specs.refrigerant as string) || 'none');
      setActivePower(specs.activePower?.toString() || '');
      setApparentPower(specs.apparentPower?.toString() || '');
      setReactivePower(specs.reactivePower?.toString() || '');
      
      setActiveTab('basic');
    }
  }, [equipment, open]);

  // Cálculo automático de Potência Ativa e Aparente
  useEffect(() => {
    const v = parseFloat(voltage);
    const i = parseFloat(maxCurrent);
    const fp = parseFloat(powerFactor);

    if (!isNaN(v) && !isNaN(i) && v > 0 && i > 0) {
      let apparentPowerCalc = 0;
      let activePowerCalc = 0;
      let reactivePowerCalc = 0;

      switch (phases) {
        case 'trifasico':
          apparentPowerCalc = (Math.sqrt(3) * v * i) / 1000;
          break;
        case 'bifasico':
          apparentPowerCalc = (2 * v * i) / 1000;
          break;
        case 'monofasico':
          apparentPowerCalc = (v * i) / 1000;
          break;
      }

      if (!isNaN(fp) && fp > 0 && fp <= 1) {
        activePowerCalc = apparentPowerCalc * fp;
        reactivePowerCalc = Math.sqrt(Math.pow(apparentPowerCalc, 2) - Math.pow(activePowerCalc, 2));
        setActivePower(activePowerCalc.toFixed(2));
        setReactivePower(reactivePowerCalc.toFixed(2));
      } else {
        setActivePower('');
        setReactivePower('');
      }

      setApparentPower(apparentPowerCalc.toFixed(2));
    } else {
      setApparentPower('');
      setActivePower('');
      setReactivePower('');
    }
  }, [voltage, maxCurrent, powerFactor, phases]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeTab !== 'specs') {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab !== 'specs') {
      return;
    }

    if (!equipment) return;

    if (!tag.trim()) {
      toast.error('Tag do equipamento é obrigatória');
      setActiveTab('basic');
      return;
    }

    if (!companyId || !sectorId) {
      toast.error('Empresa e Setor são obrigatórios');
      setActiveTab('location');
      return;
    }

    // Construir localização completa usando nomes
    const companyName = selectedCompany?.name || '';
    const sectorName = selectedSector?.name || '';
    const subsectorName = selectedSubsection?.name || '';
    const fullLocation = location.trim() || [companyName, sectorName, subsectorName].filter(Boolean).join(' - ');

    try {
      await updateMutation.mutateAsync({
        id: equipment.id,
        data: {
          tag: tag.trim(),
          type: equipmentType as Equipment['type'],
          status: equipmentStatus,
          criticidade: criticidade,
          brand: brand.trim(),
          model: model.trim(),
          serialNumber: serialNumber.trim(),
          location: fullLocation,
          sectorId: sectorId || undefined,
          subSectionId: subsectorId || undefined,
          capacity: capacity ? parseFloat(capacity) : undefined,
          specifications: {
            voltage: voltage ? parseFloat(voltage) : undefined,
            phases,
            maxCurrent: maxCurrent ? parseFloat(maxCurrent) : undefined,
            powerFactor: powerFactor ? parseFloat(powerFactor) : undefined,
            capacity: capacity ? parseFloat(capacity) : undefined,
            capacityUnit,
            refrigerant: refrigerant !== 'none' ? refrigerant : undefined,
            activePower: activePower ? parseFloat(activePower) : undefined,
            apparentPower: apparentPower ? parseFloat(apparentPower) : undefined,
            reactivePower: reactivePower ? parseFloat(reactivePower) : undefined,
            brand: brand.trim(),
            model: model.trim(),
            serialNumber: serialNumber.trim(),
          },
        },
      });
      
      toast.success('Equipamento atualizado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar equipamento:', error);
      toast.error('Erro ao atualizar equipamento');
    }
  };

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Editar Ativo</span>
          </DialogTitle>
          <DialogDescription>
            Preencha as informações do equipamento. Os campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
              <TabsTrigger value="location">Localização</TabsTrigger>
              <TabsTrigger value="specs">Especificações</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              {/* Informações Básicas */}
              <TabsContent value="basic" className="space-y-4 px-1">
                <div className="space-y-2">
                  <Label htmlFor="tag">
                    Tag do Equipamento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tag"
                    placeholder="Ex: CHILLER-001"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Identificador único do equipamento
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipmentType">
                    Tipo de equipamento <span className="text-red-500">*</span>
                  </Label>
                  <Select value={equipmentType} onValueChange={setEquipmentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="equipmentStatus">
                      Estado do Equipamento <span className="text-red-500">*</span>
                    </Label>
                    <Select value={equipmentStatus} onValueChange={(value: 'FUNCTIONING' | 'MAINTENANCE' | 'STOPPED') => setEquipmentStatus(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="criticidade">
                      Criticidade <span className="text-red-500">*</span>
                    </Label>
                    <Select value={criticidade} onValueChange={(value: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA') => setCriticidade(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a criticidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {CRITICIDADE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Nível de importância operacional
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Input
                      id="brand"
                      placeholder="Ex: Carrier, Trane, York"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Modelo</Label>
                    <Input
                      id="model"
                      placeholder="Ex: 30XA-1002"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Número de Série</Label>
                  <Input
                    id="serialNumber"
                    placeholder="Ex: SN123456789"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                  />
                </div>
              </TabsContent>

              {/* Localização */}
              <TabsContent value="location" className="space-y-4 px-1">
                <div className="space-y-2">
                  <Label htmlFor="company">
                    Empresa <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={companyId}
                    onValueChange={(value) => {
                      setCompanyId(value);
                      setSectorId('');
                      setSubsectorId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCompanies ? "Carregando..." : "Selecione a empresa"} />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selecione a empresa ou unidade
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sector">
                      Setor <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={sectorId}
                      onValueChange={(value) => {
                        setSectorId(value);
                        setSubsectorId('');
                      }}
                      disabled={!companyId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!companyId ? "Selecione uma empresa primeiro" : isLoadingSectors ? "Carregando..." : "Selecione o setor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSectors.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subsector">Subsetor</Label>
                    <Select
                      value={subsectorId}
                      onValueChange={setSubsectorId}
                      disabled={!sectorId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!sectorId ? "Selecione um setor primeiro" : isLoadingSubsections ? "Carregando..." : "Selecione o subsetor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSubsections.map((subsection) => (
                          <SelectItem key={subsection.id} value={subsection.id}>
                            {subsection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localização Descritiva (Opcional)</Label>
                  <Input
                    id="location"
                    placeholder="Ex: 3º Andar - Ala Leste"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se não preenchido, será gerado automaticamente: Empresa - Setor - Subsetor
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">Prévia da Localização:</h4>
                  <p className="text-sm text-muted-foreground">
                    {location.trim() || [selectedCompany?.name, selectedSector?.name, selectedSubsection?.name].filter(Boolean).join(' - ') || 'Preencha os campos acima'}
                  </p>
                </div>
              </TabsContent>

              {/* Especificações Técnicas */}
              <TabsContent value="specs" className="space-y-4 px-1">
                {/* Tensão e Fases */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="voltage">Tensão Nominal (V)</Label>
                    <Input
                      id="voltage"
                      type="number"
                      placeholder="Ex: 380"
                      value={voltage}
                      onChange={(e) => setVoltage(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phases">Fases</Label>
                    <Select value={phases} onValueChange={setPhases}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione as fases" />
                      </SelectTrigger>
                      <SelectContent>
                        {PHASES_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Corrente e Fator de Potência */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxCurrent">Corrente Nominal (A)</Label>
                    <Input
                      id="maxCurrent"
                      type="number"
                      step="0.1"
                      placeholder="Ex: 150.5"
                      value={maxCurrent}
                      onChange={(e) => setMaxCurrent(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="powerFactor">Fator de Potência</Label>
                    <Input
                      id="powerFactor"
                      type="number"
                      step="0.001"
                      min="0"
                      max="1"
                      placeholder="Ex: 0.915"
                      value={powerFactor}
                      onChange={(e) => setPowerFactor(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Valor entre 0 e 1</p>
                  </div>
                </div>

                {/* Capacidade */}
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidade</Label>
                  <div className="flex gap-2">
                    <Input
                      id="capacity"
                      type="number"
                      step="0.1"
                      placeholder="Ex: 120"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={capacityUnit} onValueChange={setCapacityUnit}>
                      <SelectTrigger className="w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAPACITY_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Capacidade de refrigeração/aquecimento
                  </p>
                </div>

                {/* Fluido Refrigerante */}
                <div className="space-y-2">
                  <Label htmlFor="refrigerant">Fluido Refrigerante</Label>
                  <Select value={refrigerant} onValueChange={setRefrigerant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o refrigerante" />
                    </SelectTrigger>
                    <SelectContent>
                      {REFRIGERANT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Tipo de gás refrigerante utilizado no sistema
                  </p>
                </div>

                {/* Potência Ativa */}
                <div className="space-y-2">
                  <Label htmlFor="activePower">Potência Ativa (kW)</Label>
                  <Input
                    id="activePower"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 145.4"
                    value={activePower}
                    onChange={(e) => setActivePower(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
                </div>

                {/* Potência Aparente e Reativa */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apparentPower">Potência Aparente (kVA)</Label>
                    <Input
                      id="apparentPower"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 158.9"
                      value={apparentPower}
                      onChange={(e) => setApparentPower(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reactivePower">Potência Reativa (kVAr)</Label>
                    <Input
                      id="reactivePower"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 64.1"
                      value={reactivePower}
                      onChange={(e) => setReactivePower(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>

            <div className="flex space-x-2">
              {activeTab !== 'basic' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const tabs = ['basic', 'location', 'specs'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) {
                      setActiveTab(tabs[currentIndex - 1]);
                    }
                  }}
                >
                  Anterior
                </Button>
              )}

              {activeTab !== 'specs' ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const tabs = ['basic', 'location', 'specs'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex < tabs.length - 1) {
                      setActiveTab(tabs[currentIndex + 1]);
                    }
                  }}
                >
                  Próximo
                </Button>
              ) : (
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
