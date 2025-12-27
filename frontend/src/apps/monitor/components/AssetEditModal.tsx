/**
 * AssetEditModal - Modal de Edição de Ativo
 * 
 * Modal para editar informações de um ativo HVAC.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { useUpdateAssetMutation } from '../hooks/useAssetsQuery';
import type { Asset, AssetStatus, AssetType } from '../types/asset';
import { toast } from 'sonner';

interface AssetEditModalProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Tipos de equipamento
const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'CHILLER', label: 'Chiller' },
  { value: 'AHU', label: 'Air Handling Unit (AHU)' },
  { value: 'FAN_COIL', label: 'Fan Coil' },
  { value: 'PUMP', label: 'Bomba' },
  { value: 'BOILER', label: 'Caldeira' },
  { value: 'COOLING_TOWER', label: 'Torre de Resfriamento' },
  { value: 'VRF', label: 'VRF' },
  { value: 'SPLIT', label: 'Split' },
  { value: 'OTHER', label: 'Outro' },
];

// Status disponíveis
const ASSET_STATUSES: { value: AssetStatus; label: string }[] = [
  { value: 'OK', label: 'Operacional' },
  { value: 'MAINTENANCE', label: 'Em Manutenção' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'WARNING', label: 'Alerta' },
];

export function AssetEditModal({ asset, open, onOpenChange }: AssetEditModalProps) {
  const updateMutation = useUpdateAssetMutation();
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    asset_type: '' as AssetType,
    status: '' as AssetStatus,
    manufacturer: '',
    model: '',
    serial_number: '',
    location_description: '',
    health_score: 100,
  });

  // Preencher formulário quando o asset mudar
  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || '',
        tag: asset.tag || '',
        asset_type: asset.asset_type || 'OTHER',
        status: asset.status || 'OK',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        location_description: asset.location_description || '',
        health_score: asset.health_score || 100,
      });
    }
  }, [asset]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!asset) return;

    try {
      await updateMutation.mutateAsync({
        id: asset.id,
        data: {
          ...formData,
          // Enviar health_score como número
          health_score: Number(formData.health_score),
        },
      });
      
      toast.success('Ativo atualizado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar ativo:', error);
      toast.error('Erro ao atualizar ativo');
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ativo</DialogTitle>
          <DialogDescription>
            Atualize as informações do ativo {asset.tag}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificação */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tag">Tag *</Label>
              <Input
                id="tag"
                value={formData.tag}
                onChange={(e) => handleChange('tag', e.target.value)}
                placeholder="Ex: CHILLER-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Nome descritivo do ativo"
              />
            </div>
          </div>

          {/* Tipo e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset_type">Tipo de Equipamento</Label>
              <Select
                value={formData.asset_type}
                onValueChange={(value) => handleChange('asset_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fabricante e Modelo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Fabricante</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                placeholder="Ex: Carrier, Trane, York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="Ex: 30XA-1002"
              />
            </div>
          </div>

          {/* Número de Série e Saúde */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial_number">Número de Série</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => handleChange('serial_number', e.target.value)}
                placeholder="Serial number do equipamento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="health_score">Saúde (%)</Label>
              <Input
                id="health_score"
                type="number"
                min={0}
                max={100}
                value={formData.health_score}
                onChange={(e) => handleChange('health_score', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Localização */}
          <div className="space-y-2">
            <Label htmlFor="location_description">Descrição da Localização</Label>
            <Textarea
              id="location_description"
              value={formData.location_description}
              onChange={(e) => handleChange('location_description', e.target.value)}
              placeholder="Ex: Casa de Máquinas - Bloco A, Subsolo"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
