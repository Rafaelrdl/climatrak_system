/**
 * SLAConfigModal - Modal de configuração de SLA
 * 
 * Permite configurar os tempos de SLA de atendimento e fechamento
 * para cada nível de prioridade.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  ArrowUp, 
  ArrowDown,
  Timer,
  CheckCircle2,
  Settings2
} from 'lucide-react';
import { useSLAStore, type SLASettings } from '@/store/useSLAStore';
import { toast } from 'sonner';

interface SLAConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityLabels = {
  CRITICAL: { label: 'Crítica', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-100' },
  HIGH: { label: 'Alta', icon: AlertCircle, color: 'text-orange-500', bgColor: 'bg-orange-100' },
  MEDIUM: { label: 'Média', icon: ArrowUp, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
  LOW: { label: 'Baixa', icon: ArrowDown, color: 'text-blue-500', bgColor: 'bg-blue-100' },
};

export function SLAConfigModal({ open, onOpenChange }: SLAConfigModalProps) {
  const { settings, setSettings } = useSLAStore();
  const [localSettings, setLocalSettings] = useState<SLASettings>(settings);

  // Sincroniza quando o modal abre
  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [open, settings]);

  const handleSave = () => {
    setSettings(localSettings);
    toast.success('Configurações de SLA salvas com sucesso');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    onOpenChange(false);
  };

  const updatePrioritySLA = (
    priority: keyof SLASettings['priorities'],
    field: 'responseTime' | 'resolutionTime',
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setLocalSettings((prev) => ({
      ...prev,
      priorities: {
        ...prev.priorities,
        [priority]: {
          ...prev.priorities[priority],
          [field]: numValue,
        },
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Configuração de SLA
          </DialogTitle>
          <DialogDescription>
            Configure os tempos de SLA de atendimento e fechamento para cada nível de prioridade das ordens de serviço.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Toggle para ativar/desativar SLA */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${localSettings.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Timer className={`h-5 w-5 ${localSettings.enabled ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium">Controle de SLA</p>
                <p className="text-sm text-muted-foreground">
                  {localSettings.enabled 
                    ? 'As colunas de SLA serão exibidas na lista de ordens de serviço' 
                    : 'Ative para visualizar os indicadores de SLA'}
                </p>
              </div>
            </div>
            <Switch
              checked={localSettings.enabled}
              onCheckedChange={(checked) => 
                setLocalSettings((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          <Separator />

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">SLA de Atendimento:</span>
              <span>Tempo máximo para iniciar a OS</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">SLA de Fechamento:</span>
              <span>Tempo máximo para concluir a OS</span>
            </div>
          </div>

          {/* Configurações por prioridade */}
          <div className="space-y-4">
            {(Object.keys(priorityLabels) as Array<keyof typeof priorityLabels>).map((priority) => {
              const { label, icon: Icon, color, bgColor } = priorityLabels[priority];
              const config = localSettings.priorities[priority];

              return (
                <div 
                  key={priority} 
                  className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-1.5 rounded ${bgColor}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <span className="font-medium">Prioridade {label}</span>
                    <Badge variant="outline" className="ml-auto">
                      {priority}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${priority}-response`} className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        SLA de Atendimento
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`${priority}-response`}
                          type="number"
                          min="0"
                          value={config.responseTime}
                          onChange={(e) => updatePrioritySLA(priority, 'responseTime', e.target.value)}
                          className="w-24"
                          disabled={!localSettings.enabled}
                        />
                        <span className="text-sm text-muted-foreground">horas</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${priority}-resolution`} className="text-sm flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        SLA de Fechamento
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`${priority}-resolution`}
                          type="number"
                          min="0"
                          value={config.resolutionTime}
                          onChange={(e) => updatePrioritySLA(priority, 'resolutionTime', e.target.value)}
                          className="w-24"
                          disabled={!localSettings.enabled}
                        />
                        <span className="text-sm text-muted-foreground">horas</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
