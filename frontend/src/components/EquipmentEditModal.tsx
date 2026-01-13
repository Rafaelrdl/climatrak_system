/**
 * EquipmentEditModal - Modal de Edição de Equipamento (CMMS)
 * 
 * Modal para editar informações de um equipamento no módulo CMMS.
 * Com 3 abas: Informações Básicas, Localização e Especificações.
 * Design alinhado com o modal de adicionar equipamento.
 */

import React, { useState, useEffect } from 'react';
import { Info, MapPin, Activity, Loader2, Save } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useUpdateEquipment } from '@/hooks/useEquipmentQuery';
import { useCompanies, useSectors, useSubsections } from '@/hooks/useLocationsQuery';
import { useAssetTypes } from '@/hooks/useAssetTypesQuery';
import type { Equipment } from '@/types';
import { toast } from 'sonner';

interface EquipmentEditModalProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Opções de status do equipamento
const STATUS_OPTIONS: { value: string; label: string; disabled?: boolean }[] = [
  { value: 'OK', label: '🟢 Operacional' },
  { value: 'MAINTENANCE', label: '🟠 Em Manutenção' },
  { value: 'STOPPED', label: '🔴 Parado' },
];

const ALERT_STATUS_OPTION: { value: string; label: string; disabled?: boolean } = {
  value: 'ALERT',
  label: '⚠️ Alerta (automático)',
  disabled: true,
};

// Opções de criticidade
const CRITICIDADE_OPTIONS = [
  { value: 'BAIXA', label: '🔵 Baixa' },
  { value: 'MEDIA', label: '🟢 Média' },
  { value: 'ALTA', label: '🟠 Alta' },
  { value: 'CRITICA', label: '🔴 Crítica' },
];

// Não usar constante - refrigerantes são renderizados diretamente no SelectContent

export function EquipmentEditModal({ equipment, open, onOpenChange }: EquipmentEditModalProps) {
  const updateMutation = useUpdateEquipment();
  
  // Query para tipos de ativo (todos os tipos vêm do banco de dados)
  const assetTypesQuery = useAssetTypes();
  const assetTypes = (assetTypesQuery.data ?? [])
    .map(t => ({ value: t.code, label: t.name }));

  // Estado do formulário - igual ao modal de adicionar
  const [formData, setFormData] = useState({
    tag: '',
    type: 'SPLIT' as string,
    brand: '',
    model: '',
    serialNumber: '',
    patrimonio: '',
    criticidade: 'MEDIA' as 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA',
    status: 'OK' as 'OK' | 'MAINTENANCE' | 'STOPPED' | 'ALERT',
    installDate: '',
    warrantyExpiry: '',
    notes: '',
    // Localização
    companyId: '',
    sectorId: '',
    subSectionId: '',
    location: '',
    // Especificações
    capacity: '',
    capacityUnit: 'BTU' as 'BTU' | 'TR' | 'KCAL',
    nominalVoltage: undefined as number | undefined,
    phases: 3 as 1 | 2 | 3,
    nominalCurrent: undefined as number | undefined,
    powerFactor: undefined as number | undefined,
    refrigerant: '',
    // Potências (calculadas automaticamente)
    activePower: undefined as number | undefined,
    apparentPower: undefined as number | undefined,
    reactivePower: undefined as number | undefined,
  });

  // Carregar dados de empresas, setores e subsetores
  const { data: companies = [], isLoading: isLoadingCompanies } = useCompanies();
  const { data: allSectors = [], isLoading: isLoadingSectors } = useSectors();
  const { data: allSubsections = [], isLoading: isLoadingSubsections } = useSubsections();

  // Status options
  const statusOptions = formData.status === 'ALERT' 
    ? [...STATUS_OPTIONS, ALERT_STATUS_OPTION] 
    : STATUS_OPTIONS;

  // Filtrar setores pela empresa selecionada
  const filteredSectors = formData.companyId
    ? allSectors.filter((s) => String(s.companyId) === String(formData.companyId))
    : allSectors;

  // Filtrar subsetores pelo setor selecionado
  const filteredSubsections = formData.sectorId
    ? allSubsections.filter((ss) => String(ss.sectorId) === String(formData.sectorId))
    : allSubsections;

  // Obter nomes para exibição
  const selectedCompany = companies.find((c) => String(c.id) === String(formData.companyId));
  const selectedSector = allSectors.find((s) => String(s.id) === String(formData.sectorId));
  const selectedSubsection = allSubsections.find((ss) => String(ss.id) === String(formData.subSectionId));

  // Preencher formulário quando o equipment mudar ou modal abrir
  useEffect(() => {
    if (equipment && open) {
      const specs = (equipment.specifications || {}) as Record<string, unknown>;
      const equipmentData = equipment as Equipment & {
        capacityUnit?: string;
        nominalVoltage?: number | string;
        nominalCurrent?: number | string;
        powerFactor?: number | string;
        refrigerant?: string;
        activePower?: number | string;
        apparentPower?: number | string;
        reactivePower?: number | string;
        patrimonio?: string;
        phases?: number | string;
      };
      const parseNumber = (value: unknown): number | undefined => {
        if (value === null || value === undefined || value === '') return undefined;
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
      };
      const parsePhases = (value: unknown): number | undefined => {
        if (value === null || value === undefined || value === '') return undefined;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const normalized = value.toLowerCase();
          if (normalized === 'monofasico') return 1;
          if (normalized === 'bifasico') return 2;
          if (normalized === 'trifasico') return 3;
          return parseNumber(normalized);
        }
        return undefined;
      };

      const capacityValue = parseNumber(specs.capacity ?? equipmentData.capacity);
      const capacityUnitValue = (specs.capacityUnit ?? (specs as { capacity_unit?: unknown }).capacity_unit ?? equipmentData.capacityUnit) as
        | 'BTU'
        | 'TR'
        | 'KCAL'
        | undefined;
      const nominalVoltageValue = parseNumber(
        specs.voltage ??
          (specs as { nominalVoltage?: unknown }).nominalVoltage ??
          (specs as { nominal_voltage?: unknown }).nominal_voltage ??
          equipmentData.nominalVoltage
      );
      const nominalCurrentValue = parseNumber(
        specs.maxCurrent ??
          (specs as { nominalCurrent?: unknown }).nominalCurrent ??
          (specs as { nominal_current?: unknown }).nominal_current ??
          equipmentData.nominalCurrent
      );
      const powerFactorValue = parseNumber(
        specs.powerFactor ??
          (specs as { power_factor?: unknown }).power_factor ??
          equipmentData.powerFactor
      );
      const phasesValue = (parsePhases(specs.phases ?? equipmentData.phases) ?? 3) as 1 | 2 | 3;
      const refrigerantValue = (specs.refrigerant as string) || equipmentData.refrigerant || '';
      const activePowerValue = parseNumber(
        specs.activePower ??
          (specs as { active_power_kw?: unknown }).active_power_kw ??
          equipmentData.activePower
      );
      const apparentPowerValue = parseNumber(
        specs.apparentPower ??
          (specs as { apparent_power_kva?: unknown }).apparent_power_kva ??
          equipmentData.apparentPower
      );
      const reactivePowerValue = parseNumber(
        specs.reactivePower ??
          (specs as { reactive_power_kvar?: unknown }).reactive_power_kvar ??
          equipmentData.reactivePower
      );
      const patrimonioValue = (specs.patrimonio as string) || equipmentData.patrimonio || '';
      
      setFormData({
        tag: equipment.tag || '',
        type: equipment.type || 'SPLIT',
        brand: equipment.brand || '',
        model: equipment.model || '',
        serialNumber: equipment.serialNumber || '',
        patrimonio: patrimonioValue,
        criticidade: equipment.criticidade || 'MEDIA',
        status: equipment.status || 'OK',
        installDate: equipment.installDate ? equipment.installDate.split('T')[0] : '',
        warrantyExpiry: equipment.warrantyExpiry ? equipment.warrantyExpiry.split('T')[0] : '',
        notes: equipment.notes || '',
        // Localização
        companyId: equipment.companyId || '',
        sectorId: equipment.sectorId || '',
        subSectionId: equipment.subSectionId || '',
        location: equipment.location || '',
        // Especificações
        capacity: capacityValue !== undefined ? capacityValue.toString() : '',
        capacityUnit: capacityUnitValue || 'BTU',
        nominalVoltage: nominalVoltageValue,
        phases: phasesValue,
        nominalCurrent: nominalCurrentValue,
        powerFactor: powerFactorValue,
        refrigerant: refrigerantValue,
        activePower: activePowerValue,
        apparentPower: apparentPowerValue,
        reactivePower: reactivePowerValue,
      });
    }
  }, [equipment, open]);

  // Cálculo automático de potências
  useEffect(() => {
    const V = formData.nominalVoltage;
    const I = formData.nominalCurrent;
    const numPhases = formData.phases || 3;
    const FP = formData.powerFactor;

    let apparentPower: number | undefined;
    let activePower: number | undefined;
    let reactivePower: number | undefined;

    if (V && I && numPhases) {
      let S: number;
      if (numPhases === 3) {
        S = Math.sqrt(3) * V * I;
      } else if (numPhases === 2) {
        S = 2 * V * I;
      } else {
        S = V * I;
      }

      const S_kVA = S / 1000;
      apparentPower = parseFloat(S_kVA.toFixed(2));

      if (FP && FP > 0 && FP <= 1) {
        const P_kW = S_kVA * FP;
        const Q_kVAr = Math.sqrt(S_kVA * S_kVA - P_kW * P_kW);

        activePower = parseFloat(P_kW.toFixed(2));
        reactivePower = parseFloat(Q_kVAr.toFixed(2));
      }
    }

    setFormData((prev) => ({
      ...prev,
      apparentPower,
      activePower,
      reactivePower,
    }));
  }, [formData.nominalVoltage, formData.nominalCurrent, formData.phases, formData.powerFactor]);

  const handleSubmit = async () => {
    if (!equipment) return;

    if (!formData.tag.trim()) {
      toast.error('Tag do equipamento é obrigatória');
      return;
    }

    if (!formData.companyId || !formData.sectorId) {
      toast.error('Empresa e Setor são obrigatórios');
      return;
    }

    // Construir localização completa usando nomes
    const companyName = selectedCompany?.name || '';
    const sectorName = selectedSector?.name || '';
    const subsectorName = selectedSubsection?.name || '';
    const fullLocation = formData.location.trim() || [companyName, sectorName, subsectorName].filter(Boolean).join(' - ');

    // Converter phases para string
    const phasesString = formData.phases === 1 ? 'monofasico' : formData.phases === 2 ? 'bifasico' : 'trifasico';

    try {
      await updateMutation.mutateAsync({
        id: equipment.id,
        data: {
          tag: formData.tag.trim(),
          type: formData.type as Equipment['type'],
          status: formData.status,
          criticidade: formData.criticidade,
          brand: formData.brand.trim(),
          model: formData.model.trim(),
          serialNumber: formData.serialNumber.trim(),
          location: fullLocation,
          sectorId: formData.sectorId || undefined,
          subSectionId: formData.subSectionId || undefined,
          installDate: formData.installDate || undefined,
          warrantyExpiry: formData.warrantyExpiry || undefined,
          notes: formData.notes.trim() || undefined,
          capacity: formData.capacity ? parseFloat(formData.capacity) : undefined,
          specifications: {
            voltage: formData.nominalVoltage,
            phases: phasesString,
            maxCurrent: formData.nominalCurrent,
            powerFactor: formData.powerFactor,
            capacity: formData.capacity ? parseFloat(formData.capacity) : undefined,
            capacityUnit: formData.capacityUnit,
            refrigerant: formData.refrigerant || undefined,
            activePower: formData.activePower,
            apparentPower: formData.apparentPower,
            reactivePower: formData.reactivePower,
            brand: formData.brand.trim(),
            model: formData.model.trim(),
            serialNumber: formData.serialNumber.trim(),
            patrimonio: formData.patrimonio.trim() || undefined,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl">Editar Ativo</DialogTitle>
          <DialogDescription>
            Atualize os dados do ativo. Os campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Informações Básicas
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Localização
            </TabsTrigger>
            <TabsTrigger value="specs" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Especificações
            </TabsTrigger>
          </TabsList>

          {/* ========== ABA: INFORMAÇÕES BÁSICAS ========== */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Tag do equipamento */}
              <div>
                <Label htmlFor="edit-tag" className="mb-2 block">
                  Tag do Ativo *
                  <span className="text-xs text-muted-foreground ml-2 font-normal">
                    Identificação única
                  </span>
                </Label>
                <Input 
                  id="edit-tag"
                  value={formData.tag}
                  onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
                  placeholder="CLI-001"
                  required
                  className="h-10"
                />
              </div>
              
              {/* Tipo do equipamento */}
              <div>
                <Label htmlFor="edit-type" className="mb-2 block">Tipo do Ativo *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="edit-type" className="h-10">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Marca do equipamento */}
              <div>
                <Label htmlFor="edit-brand" className="mb-2 block">Marca *</Label>
                <Input 
                  id="edit-brand"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="Daikin, Carrier, etc"
                  required
                  className="h-10"
                />
              </div>
              
              {/* Modelo */}
              <div>
                <Label htmlFor="edit-model" className="mb-2 block">Modelo *</Label>
                <Input 
                  id="edit-model"
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Inverter 18000"
                  required
                  className="h-10"
                />
              </div>
              
              {/* Número de série */}
              <div>
                <Label htmlFor="edit-serialNumber" className="mb-2 block">
                  Número de Série
                  <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                </Label>
                <Input 
                  id="edit-serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder="SN123456789"
                  className="h-10"
                />
              </div>
              
              {/* Patrimônio */}
              <div>
                <Label htmlFor="edit-patrimonio" className="mb-2 block">
                  Patrimônio
                  <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                </Label>
                <Input 
                  id="edit-patrimonio"
                  value={formData.patrimonio}
                  onChange={(e) => setFormData(prev => ({ ...prev, patrimonio: e.target.value }))}
                  placeholder="PAT-00001"
                  className="h-10"
                />
              </div>
              
              {/* Criticidade */}
              <div>
                <Label htmlFor="edit-criticidade" className="mb-2 block">Criticidade *</Label>
                <Select 
                  value={formData.criticidade} 
                  onValueChange={(value: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA') => 
                    setFormData(prev => ({ ...prev, criticidade: value }))
                  }
                >
                  <SelectTrigger id="edit-criticidade" className="h-10">
                    <SelectValue placeholder="Selecione a criticidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRITICIDADE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status */}
              <div>
                <Label htmlFor="edit-status" className="mb-2 block">Status *</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'OK' | 'MAINTENANCE' | 'STOPPED' | 'ALERT') => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger id="edit-status" className="h-10">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Data de Instalação */}
              <div>
                <Label htmlFor="edit-installDate" className="mb-2 block">
                  Data de Instalação
                  <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                </Label>
                <Input 
                  id="edit-installDate"
                  type="date"
                  value={formData.installDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, installDate: e.target.value }))}
                  className="h-10"
                />
              </div>
              
              {/* Data de Expiração da Garantia */}
              <div>
                <Label htmlFor="edit-warrantyExpiry" className="mb-2 block">
                  Garantia até
                  <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                </Label>
                <Input 
                  id="edit-warrantyExpiry"
                  type="date"
                  value={formData.warrantyExpiry}
                  onChange={(e) => setFormData(prev => ({ ...prev, warrantyExpiry: e.target.value }))}
                  className="h-10"
                />
              </div>
              
              {/* Observações */}
              <div className="md:col-span-2">
                <Label htmlFor="edit-notes" className="mb-2 block">
                  Observações
                  <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                </Label>
                <Textarea 
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações adicionais sobre o equipamento..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </TabsContent>

          {/* ========== ABA: LOCALIZAÇÃO ========== */}
          <TabsContent value="location" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Empresa */}
              <div>
                <Label htmlFor="edit-company" className="mb-2 block">Empresa *</Label>
                <Select 
                  value={formData.companyId} 
                  onValueChange={(value) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      companyId: value, 
                      sectorId: '', 
                      subSectionId: '' 
                    }));
                  }}
                >
                  <SelectTrigger id="edit-company" className="h-10">
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
              </div>
              
              {/* Setor */}
              <div>
                <Label htmlFor="edit-sector" className="mb-2 block">Setor *</Label>
                <Select 
                  value={formData.sectorId} 
                  onValueChange={(value) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      sectorId: value, 
                      subSectionId: '' 
                    }));
                  }}
                  disabled={!formData.companyId}
                >
                  <SelectTrigger id="edit-sector" className="h-10">
                    <SelectValue placeholder={
                      !formData.companyId 
                        ? "Selecione uma empresa primeiro" 
                        : isLoadingSectors 
                          ? "Carregando..." 
                          : "Selecione o setor"
                    } />
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
              
              {/* Subsetor */}
              <div className="md:col-span-2">
                <Label htmlFor="edit-subsector" className="mb-2 block">
                  Subsetor
                  <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                </Label>
                <Select 
                  value={formData.subSectionId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, subSectionId: value }))}
                  disabled={!formData.sectorId}
                >
                  <SelectTrigger id="edit-subsector" className="h-10">
                    <SelectValue placeholder={
                      !formData.sectorId 
                        ? "Selecione um setor primeiro" 
                        : isLoadingSubsections 
                          ? "Carregando..." 
                          : "Selecione o subsetor"
                    } />
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
              
              {/* Localização específica */}
              <div className="md:col-span-2">
                <Label htmlFor="edit-location" className="mb-2 block">
                  Localização Específica
                  <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                </Label>
                <Input 
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Sala 101, Corredor principal, etc."
                  className="h-10"
                />
              </div>
            </div>
          </TabsContent>

          {/* ========== ABA: ESPECIFICAÇÕES ========== */}
          <TabsContent value="specs" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Tensão Nominal */}
              <div>
                <Label htmlFor="edit-nominalVoltage" className="mb-2 block">
                  Tensão Nominal (V)
                </Label>
                <Input 
                  id="edit-nominalVoltage"
                  type="number"
                  step="0.1"
                  value={formData.nominalVoltage ?? ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    nominalVoltage: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  placeholder="Ex: 380"
                  className="h-10"
                />
              </div>

              {/* Fases */}
              <div>
                <Label htmlFor="edit-phases" className="mb-2 block">Fases</Label>
                <Select 
                  value={formData.phases?.toString()} 
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, phases: parseInt(value) as 1 | 2 | 3 }))
                  }
                >
                  <SelectTrigger id="edit-phases" className="h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Monofásico (1 fase)</SelectItem>
                    <SelectItem value="2">Bifásico (2 fases)</SelectItem>
                    <SelectItem value="3">Trifásico (3 fases)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Corrente Nominal */}
              <div>
                <Label htmlFor="edit-nominalCurrent" className="mb-2 block">
                  Corrente Nominal (A)
                </Label>
                <Input 
                  id="edit-nominalCurrent"
                  type="number"
                  step="0.1"
                  value={formData.nominalCurrent ?? ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    nominalCurrent: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  placeholder="Ex: 150"
                  className="h-10"
                />
              </div>

              {/* Fator de Potência */}
              <div>
                <Label htmlFor="edit-powerFactor" className="mb-2 block">
                  Fator de Potência
                  <span className="text-xs text-muted-foreground ml-2 font-normal">(0 a 1)</span>
                </Label>
                <Input 
                  id="edit-powerFactor"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.powerFactor ?? ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    powerFactor: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  placeholder="Ex: 0.85"
                  className="h-10"
                />
              </div>

              {/* Capacidade + Unidade */}
              <div>
                <Label htmlFor="edit-capacity" className="mb-2 block">Capacidade *</Label>
                <div className="flex gap-2">
                  <Input 
                    id="edit-capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="Ex: 300"
                    required
                    className="h-10 flex-1"
                  />
                  <Select 
                    value={formData.capacityUnit} 
                    onValueChange={(value: 'BTU' | 'TR' | 'KCAL') => 
                      setFormData(prev => ({ ...prev, capacityUnit: value }))
                    }
                  >
                    <SelectTrigger className="h-10 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TR">TR</SelectItem>
                      <SelectItem value="BTU">BTU/h</SelectItem>
                      <SelectItem value="KCAL">kcal/h</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fluido Refrigerante */}
              <div>
                <Label htmlFor="edit-refrigerant" className="mb-2 block">
                  Fluido Refrigerante
                </Label>
                <Select 
                  value={formData.refrigerant} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, refrigerant: value }))}
                >
                  <SelectTrigger id="edit-refrigerant" className="h-10">
                    <SelectValue placeholder="Selecione o refrigerante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="R-11">R-11</SelectItem>
                    <SelectItem value="R-12">R-12</SelectItem>
                    <SelectItem value="R-22">R-22</SelectItem>
                    <SelectItem value="R-23">R-23</SelectItem>
                    <SelectItem value="R-32">R-32</SelectItem>
                    <SelectItem value="R-113">R-113</SelectItem>
                    <SelectItem value="R-114">R-114</SelectItem>
                    <SelectItem value="R-115">R-115</SelectItem>
                    <SelectItem value="R-123">R-123</SelectItem>
                    <SelectItem value="R-1234yf">R-1234yf</SelectItem>
                    <SelectItem value="R-1234ze">R-1234ze</SelectItem>
                    <SelectItem value="R-1233zd">R-1233zd</SelectItem>
                    <SelectItem value="R-134a">R-134a</SelectItem>
                    <SelectItem value="R-141b">R-141b</SelectItem>
                    <SelectItem value="R-142b">R-142b</SelectItem>
                    <SelectItem value="R-143a">R-143a</SelectItem>
                    <SelectItem value="R-152a">R-152a</SelectItem>
                    <SelectItem value="R-404A">R-404A</SelectItem>
                    <SelectItem value="R-407C">R-407C</SelectItem>
                    <SelectItem value="R-407F">R-407F</SelectItem>
                    <SelectItem value="R-410A">R-410A</SelectItem>
                    <SelectItem value="R-448A">R-448A</SelectItem>
                    <SelectItem value="R-449A">R-449A</SelectItem>
                    <SelectItem value="R-452A">R-452A</SelectItem>
                    <SelectItem value="R-454B">R-454B</SelectItem>
                    <SelectItem value="R-507A">R-507A</SelectItem>
                    <SelectItem value="R-513A">R-513A</SelectItem>
                    <SelectItem value="R-717">R-717 (Amônia)</SelectItem>
                    <SelectItem value="R-744">R-744 (CO₂)</SelectItem>
                    <SelectItem value="R-290">R-290 (Propano)</SelectItem>
                    <SelectItem value="R-600a">R-600a (Isobutano)</SelectItem>
                    <SelectItem value="R-1270">R-1270 (Propileno)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Separador visual */}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-4">
                  Potências (calculadas automaticamente)
                </h4>
              </div>

              {/* Potência Ativa */}
              <div>
                <Label htmlFor="edit-activePower" className="mb-2 block">
                  Potência Ativa (kW)
                  <span className="text-xs text-muted-foreground ml-2 font-normal">P = S × FP</span>
                </Label>
                <Input 
                  id="edit-activePower"
                  type="number"
                  value={formData.activePower?.toFixed(2) ?? ''}
                  disabled
                  className="h-10 bg-muted"
                />
              </div>

              {/* Potência Aparente */}
              <div>
                <Label htmlFor="edit-apparentPower" className="mb-2 block">
                  Potência Aparente (kVA)
                  <span className="text-xs text-muted-foreground ml-2 font-normal">S = √3×V×I</span>
                </Label>
                <Input 
                  id="edit-apparentPower"
                  type="number"
                  value={formData.apparentPower?.toFixed(2) ?? ''}
                  disabled
                  className="h-10 bg-muted"
                />
              </div>

              {/* Potência Reativa */}
              <div>
                <Label htmlFor="edit-reactivePower" className="mb-2 block">
                  Potência Reativa (kVAr)
                  <span className="text-xs text-muted-foreground ml-2 font-normal">Q = √(S²-P²)</span>
                </Label>
                <Input 
                  id="edit-reactivePower"
                  type="number"
                  value={formData.reactivePower?.toFixed(2) ?? ''}
                  disabled
                  className="h-10 bg-muted"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ========== BOTÕES DE AÇÃO DO FORMULÁRIO ========== */}
        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              updateMutation.isPending || 
              !formData.tag || 
              !formData.brand || 
              !formData.model || 
              !formData.capacity || 
              !formData.criticidade ||
              !formData.companyId ||
              !formData.sectorId
            }
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
