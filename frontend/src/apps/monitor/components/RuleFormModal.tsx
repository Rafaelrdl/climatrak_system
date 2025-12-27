/**
 * RuleFormModal - Modal para criar/editar regras de monitoramento
 * 
 * Permite configurar:
 * - Nome e descrição da regra
 * - Equipamento associado
 * - Parâmetros de monitoramento (baseados em dispositivos/sensores reais)
 * - Ações de notificação
 */

import { useState, useEffect, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Info, 
  Mail, 
  Bell, 
  Volume2,
  MessageSquare,
  Cpu,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

import { useCreateRuleMutation, useUpdateRuleMutation } from '../hooks/useRulesQuery';
import { useAssetsQuery } from '../hooks/useAssetsQuery';
import { useDevicesSummaryQuery } from '../hooks/useDevicesQuery';
import { useMonitorStore } from '../store/monitorStore';
import type { 
  Rule, 
  RuleParameter, 
  NotificationAction, 
  Operator, 
  Severity 
} from '../types/rule';
import type { DeviceSummary, SensorVariable } from '../types/device';

interface RuleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule?: Rule | null;
}

// Constantes
const SEVERITIES = [
  { value: 'CRITICAL', label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'HIGH', label: 'Alto', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'MEDIUM', label: 'Médio', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'LOW', label: 'Baixo', color: 'bg-blue-100 text-blue-800 border-blue-300' },
] as const;

const OPERATORS = [
  { value: '>', label: 'Maior que' },
  { value: '>=', label: 'Maior ou igual' },
  { value: '<', label: 'Menor que' },
  { value: '<=', label: 'Menor ou igual' },
  { value: '==', label: 'Igual' },
  { value: '!=', label: 'Diferente' },
] as const;

const NOTIFICATION_ACTIONS: { value: NotificationAction; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'EMAIL', label: 'Email', description: 'Receber notificações por email', icon: <Mail className="w-4 h-4" /> },
  { value: 'IN_APP', label: 'Push', description: 'Notificações no navegador e aplicativo', icon: <Bell className="w-4 h-4" /> },
  { value: 'SMS', label: 'Som', description: 'Reproduzir som ao receber alertas', icon: <Volume2 className="w-4 h-4" /> },
  { value: 'WHATSAPP', label: 'WhatsApp', description: 'Receber mensagens no WhatsApp', icon: <MessageSquare className="w-4 h-4" /> },
];

// Template padrão de mensagem
const DEFAULT_MESSAGE_TEMPLATE = "{variavel} está {operator} {threshold}{unit} (valor atual: {value}{unit})";

// Interface estendida para parâmetros com deviceId
interface RuleParameterWithDevice extends RuleParameter {
  deviceId?: number;
}

export function RuleFormModal({ open, onOpenChange, editingRule }: RuleFormModalProps) {
  const { currentSite } = useMonitorStore();
  const { data: assets = [] } = useAssetsQuery();
  const { data: devices = [], isLoading: isLoadingDevices } = useDevicesSummaryQuery(currentSite?.id);
  const createMutation = useCreateRuleMutation();
  const updateMutation = useUpdateRuleMutation();

  // Estados do formulário
  const [equipmentId, setEquipmentId] = useState<string>('');
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [actions, setActions] = useState<NotificationAction[]>(['IN_APP']);
  const [parameters, setParameters] = useState<RuleParameterWithDevice[]>([]);

  // Memoizar mapa de dispositivos para acesso rápido
  const devicesMap = useMemo(() => {
    const map = new Map<number, DeviceSummary>();
    devices.forEach(device => map.set(device.id, device));
    return map;
  }, [devices]);

  // Obter variáveis de um dispositivo específico
  const getDeviceVariables = (deviceId: number | undefined): SensorVariable[] => {
    if (!deviceId) return [];
    const device = devicesMap.get(deviceId);
    return device?.variables || [];
  };

  // Encontrar deviceId a partir do parameter_key (variável tag)
  const findDeviceIdByParameterKey = (parameterKey: string): number | undefined => {
    for (const device of devices) {
      const variable = device.variables.find(v => v.tag === parameterKey);
      if (variable) {
        return device.id;
      }
    }
    return undefined;
  };

  // Reset/Preencher formulário quando modal abre
  useEffect(() => {
    if (open) {
      if (editingRule) {
        // Edição: preencher com dados existentes
        setEquipmentId(String(editingRule.equipment));
        setRuleName(editingRule.name);
        setRuleDescription(editingRule.description || '');
        setActions(editingRule.actions || ['IN_APP']);
        
        // Carregar parâmetros
        if (editingRule.parameters && editingRule.parameters.length > 0) {
          setParameters(editingRule.parameters.map(param => {
            // Encontrar o deviceId a partir do parameter_key
            const deviceId = findDeviceIdByParameterKey(param.parameter_key);
            return {
              ...param,
              deviceId,
              severity: param.severity?.toUpperCase() as Severity || 'MEDIUM',
            };
          }));
        } else if (editingRule.parameter_key) {
          // Formato legado
          const deviceId = findDeviceIdByParameterKey(editingRule.parameter_key);
          setParameters([{
            deviceId,
            parameter_key: editingRule.parameter_key,
            variable_key: editingRule.variable_key || '',
            operator: editingRule.operator || '>',
            threshold: editingRule.threshold || 0,
            duration: editingRule.duration || 5,
            severity: (editingRule.severity?.toUpperCase() as Severity) || 'MEDIUM',
            message_template: DEFAULT_MESSAGE_TEMPLATE,
            unit: editingRule.unit,
          }]);
        } else {
          setParameters([]);
        }
      } else {
        // Criação: limpar formulário
        setEquipmentId('');
        setRuleName('');
        setRuleDescription('');
        setActions(['IN_APP']);
        setParameters([]);
      }
    }
  }, [open, editingRule, devices]);

  // Adicionar novo parâmetro
  const addParameter = () => {
    const newParam: RuleParameterWithDevice = {
      deviceId: undefined,
      parameter_key: '',
      variable_key: '',
      operator: '>',
      threshold: 0,
      duration: 5,
      severity: 'MEDIUM',
      message_template: DEFAULT_MESSAGE_TEMPLATE,
    };
    setParameters([...parameters, newParam]);
  };

  // Remover parâmetro
  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  // Atualizar parâmetro
  const updateParameter = (index: number, field: keyof RuleParameterWithDevice, value: any) => {
    const updated = [...parameters];
    
    // Se mudar o device, resetar a variável selecionada
    if (field === 'deviceId') {
      updated[index] = { 
        ...updated[index], 
        deviceId: value,
        parameter_key: '', // Reset parameter key ao mudar device
        variable_key: '',
      };
    } else if (field === 'parameter_key') {
      // Ao selecionar uma variável, preencher automaticamente alguns campos
      const device = devicesMap.get(updated[index].deviceId || 0);
      const variable = device?.variables.find(v => v.tag === value);
      updated[index] = { 
        ...updated[index], 
        parameter_key: value,
        unit: variable?.unit || '',
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    setParameters(updated);
  };

  // Toggle ação de notificação
  const toggleAction = (action: NotificationAction) => {
    setActions(prev =>
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  // Validar e salvar
  const handleSave = async () => {
    // Validações
    if (!ruleName.trim()) {
      toast.error('Nome da regra é obrigatório');
      return;
    }

    if (!equipmentId) {
      toast.error('Selecione um equipamento');
      return;
    }

    if (parameters.length === 0) {
      toast.error('Adicione pelo menos um parâmetro');
      return;
    }

    // Validar cada parâmetro
    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];
      if (!param.deviceId) {
        toast.error(`Parâmetro ${i + 1}: Selecione um dispositivo`);
        return;
      }
      if (!param.parameter_key) {
        toast.error(`Parâmetro ${i + 1}: Selecione uma variável`);
        return;
      }
    }

    if (actions.length === 0) {
      toast.error('Selecione pelo menos uma ação de notificação');
      return;
    }

    // Preparar dados para envio (remover deviceId do payload pois é apenas para UI)
    const ruleData = {
      name: ruleName.trim(),
      description: ruleDescription.trim(),
      equipment: parseInt(equipmentId),
      parameters: parameters.map(({ deviceId, ...param }) => ({
        ...param,
        // Incluir referência ao device para rastreabilidade
        device: deviceId,
      })),
      actions: actions,
      enabled: true,
    };

    if (editingRule) {
      updateMutation.mutate(
        { id: editingRule.id, data: ruleData },
        {
          onSuccess: () => {
            toast.success('Regra atualizada com sucesso!');
            onOpenChange(false);
          },
          onError: () => {
            toast.error('Erro ao atualizar regra');
          }
        }
      );
    } else {
      createMutation.mutate(ruleData, {
        onSuccess: () => {
          toast.success('Regra criada com sucesso!');
          onOpenChange(false);
        },
        onError: () => {
          toast.error('Erro ao criar regra');
        }
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="text-lg font-semibold">
            {editingRule ? 'Editar Regra de Alerta' : 'Criar Nova Regra de Alerta'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Configure múltiplos parâmetros para monitoramento em tempo real
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Informações Básicas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">
                    Nome da Regra <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="rule-name"
                    placeholder="Ex: Monitoramento Chiller Principal"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment">
                    Equipamento <span className="text-destructive">*</span>
                  </Label>
                  <Select value={equipmentId} onValueChange={setEquipmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um equipamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={String(asset.id)}>
                          {asset.tag} ({asset.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Descrição <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Adicione uma descrição para identificar facilmente esta regra"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Parâmetros de Monitoramento */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Parâmetros de Monitoramento</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure as condições que dispararão alertas para cada sensor
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={addParameter}
                  disabled={!equipmentId || devices.length === 0}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Parâmetro
                </Button>
              </div>

              {!currentSite && (
                <div className="border-2 border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Nenhum site selecionado</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Vá até a página de Sensores e selecione um site para carregar os dispositivos
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentSite && devices.length === 0 && !isLoadingDevices && (
                <div className="border-2 border-dashed border-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Nenhum dispositivo encontrado</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        O site "{currentSite.name}" não possui dispositivos cadastrados
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isLoadingDevices && (
                <div className="border-2 border-dashed border-muted-foreground/30 bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Carregando dispositivos...</p>
                  </div>
                </div>
              )}

              {parameters.length === 0 && equipmentId && devices.length > 0 && (
                <div className="border-2 border-dashed border-muted-foreground/30 bg-muted/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Nenhum parâmetro configurado</p>
                      <p className="text-xs text-muted-foreground">
                        Clique em "Adicionar Parâmetro" para selecionar dispositivos e variáveis a monitorar
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info: Dispositivos Disponíveis */}
              {currentSite && devices.length > 0 && parameters.length === 0 && !equipmentId && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    📡 {devices.length} dispositivo(s) disponível(is) no site "{currentSite.name}":
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {devices.slice(0, 5).map(device => (
                      <Badge key={device.id} variant="outline" className="text-xs">
                        {device.display_name || device.name}
                      </Badge>
                    ))}
                    {devices.length > 5 && (
                      <Badge variant="secondary" className="text-xs">+{devices.length - 5} mais</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Lista de Parâmetros */}
              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <Card key={index} className="border">
                    <CardHeader className="py-3 px-4 border-b">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          Parâmetro {index + 1}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParameter(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                      
                      {/* Dispositivo e Variável */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            Dispositivo <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={param.deviceId ? String(param.deviceId) : ''}
                            onValueChange={(value) => updateParameter(index, 'deviceId', parseInt(value))}
                            disabled={isLoadingDevices}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingDevices ? "Carregando..." : "Selecione um dispositivo"} />
                            </SelectTrigger>
                            <SelectContent>
                              {devices.length === 0 ? (
                                <SelectItem value="__none__" disabled>
                                  {currentSite ? "Nenhum dispositivo encontrado" : "Selecione um site primeiro"}
                                </SelectItem>
                              ) : (
                                devices.map((device) => (
                                  <SelectItem key={device.id} value={String(device.id)}>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${device.device_status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                      <span>{device.display_name || device.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({device.total_variables_count} variáveis)
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            Variável <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={param.parameter_key || ''}
                            onValueChange={(value) => updateParameter(index, 'parameter_key', value)}
                            disabled={!param.deviceId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={!param.deviceId ? "Selecione um dispositivo primeiro" : "Selecione uma variável"} />
                            </SelectTrigger>
                            <SelectContent>
                              {getDeviceVariables(param.deviceId).length === 0 ? (
                                <SelectItem value="__none__" disabled>
                                  Nenhuma variável disponível
                                </SelectItem>
                              ) : (
                                getDeviceVariables(param.deviceId).map((variable) => (
                                  <SelectItem key={variable.id} value={variable.tag}>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${variable.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                                      <span className="font-medium">{variable.name || variable.tag}</span>
                                      {variable.last_value !== null && (
                                        <span className="text-xs text-muted-foreground">
                                          ({typeof variable.last_value === 'number' ? variable.last_value.toFixed(2) : variable.last_value} {variable.unit})
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {param.parameter_key && param.deviceId && (
                            <p className="text-[10px] text-muted-foreground">
                              Tag: {param.parameter_key} {param.unit && `• Unidade: ${param.unit}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Condição */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">
                            Operador <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={param.operator}
                            onValueChange={(value) => updateParameter(index, 'operator', value as Operator)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATORS.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">
                            Valor Limite <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 25"
                            value={param.threshold}
                            onChange={(e) => updateParameter(index, 'threshold', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">
                            Cooldown (min)
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="5"
                            value={param.duration}
                            onChange={(e) => updateParameter(index, 'duration', parseInt(e.target.value) || 5)}
                          />
                        </div>
                      </div>

                      {/* Severidade */}
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Severidade <span className="text-destructive">*</span>
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                          {SEVERITIES.map((sev) => (
                            <button
                              key={sev.value}
                              type="button"
                              onClick={() => updateParameter(index, 'severity', sev.value)}
                              className={`
                                px-3 py-2 rounded-md border-2 text-xs font-medium transition-all
                                ${param.severity === sev.value
                                  ? `${sev.color} ring-2 ring-offset-1`
                                  : 'bg-background border-muted-foreground/30 hover:border-muted-foreground/50'
                                }
                              `}
                            >
                              {sev.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mensagem */}
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Mensagem do Alerta
                        </Label>
                        <Textarea
                          placeholder="Ex: {variavel} ultrapassou o limite de {threshold}"
                          value={param.message_template}
                          onChange={(e) => updateParameter(index, 'message_template', e.target.value)}
                          rows={2}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Variáveis: {'{variavel}'}, {'{value}'}, {'{threshold}'}, {'{operator}'}, {'{unit}'}
                        </p>
                      </div>

                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Ações ao Disparar */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">
                  Ações ao Disparar <span className="text-destructive">*</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione como deseja ser notificado quando o alerta for acionado
                </p>
              </div>
              <div className="space-y-2">
                {NOTIFICATION_ACTIONS.map((action) => (
                  <div
                    key={action.value}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-md">
                        {action.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={actions.includes(action.value)}
                      onCheckedChange={() => toggleAction(action.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editingRule ? 'Salvar Alterações' : 'Criar Regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
