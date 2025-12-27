import { useState, useEffect, useMemo } from 'react';
import { DashboardWidget } from '@/types/dashboard';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useAssetsQuery, useAssetSensorsQuery } from '@/apps/monitor/hooks/useAssetsQuery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Palette, Database, Save, Loader2 } from 'lucide-react';
import type { AssetSensor } from '@/apps/monitor/types/asset';
import { kpiIconMap, kpiIconOptions } from './kpiIcons';
import { cn } from '@/lib/utils';

interface WidgetConfigProps {
  widget: DashboardWidget;
  layoutId: string;
  open: boolean;
  onClose: () => void;
}

// Interface para agrupar sensores por device
interface DeviceGroup {
  deviceId: number;
  displayName: string;
  fullSerial: string;
  sensors: AssetSensor[];
}

export function WidgetConfig({ widget, layoutId, open, onClose }: WidgetConfigProps) {
  const updateWidget = useDashboardStore(state => state.updateWidget);

  // Estados locais para edição
  const [title, setTitle] = useState(widget.title);
  const [size, setSize] = useState(widget.size);
  const [config, setConfig] = useState(widget.config || {});

  // Estados para seleção de fonte de dados
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(
    config.assetId ? parseInt(config.assetId.toString()) : null
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(
    config.deviceId ? parseInt(config.deviceId.toString()) : null
  );
  const [selectedSensorTag, setSelectedSensorTag] = useState<string | null>(
    config.sensorTag || null
  );

  // Verificar se é widget de múltiplas variáveis (gráficos e tabelas)
  const isMultiVariableChart = [
    'chart-line-echarts', 'chart-area', 'chart-bar', 'chart-bar-horizontal', 
    'chart-pie', 'chart-donut', 'table-data', 'table-simple'
  ].includes(widget.type);

  const [selectedVariables, setSelectedVariables] = useState<string[]>(
    config.sensorTags || (config.sensorTag ? [config.sensorTag] : [])
  );

  // React Query: buscar assets
  const { data: assets = [], isLoading: isLoadingAssets } = useAssetsQuery({});

  // React Query: buscar sensores do asset selecionado
  const { 
    data: assetSensors = [], 
    isLoading: isLoadingSensors 
  } = useAssetSensorsQuery(selectedAssetId);

  // Helper para extrair o nome da variável do tag (remove prefixo MAC se existir)
  const getVariableName = (tag: string) => {
    const macPattern = /^[A-Fa-f0-9]{16}_(.+)$/;
    const match = tag.match(macPattern);
    if (match) {
      return match[1];
    }
    return tag;
  };

  // Agrupar sensores por device
  const deviceGroups = useMemo<DeviceGroup[]>(() => {
    const map = new Map<number, DeviceGroup>();
    
    assetSensors.forEach(sensor => {
      const deviceId = (sensor as any).device || 0;
      
      if (!map.has(deviceId)) {
        const displayName = (sensor as any).device_display_name || 
                           (sensor as any).device_name ||
                           `Device ${deviceId}`;
        const fullSerial = (sensor as any).device_serial || '';
        
        map.set(deviceId, {
          deviceId,
          displayName,
          fullSerial,
          sensors: []
        });
      }
      
      map.get(deviceId)!.sensors.push(sensor);
    });
    
    return Array.from(map.values());
  }, [assetSensors]);

  // Sensores do device selecionado
  const availableSensors = useMemo(() => {
    if (!selectedDeviceId) return [];
    const group = deviceGroups.find(g => g.deviceId === selectedDeviceId);
    return group?.sensors || [];
  }, [deviceGroups, selectedDeviceId]);

  // Sensor selecionado
  const selectedSensor = useMemo(() => {
    if (!selectedSensorTag) return null;
    return availableSensors.find(s => s.tag === selectedSensorTag) || null;
  }, [availableSensors, selectedSensorTag]);

  // Resetar estados quando o widget mudar
  useEffect(() => {
    setTitle(widget.title);
    setSize(widget.size);
    
    // Garantir que sensorTags está presente no config para widgets multi-variável
    const initialConfig = { ...widget.config };
    if (isMultiVariableChart && widget.config?.sensorTags) {
      initialConfig.sensorTags = widget.config.sensorTags;
    }
    
    setConfig(initialConfig || {});
    setSelectedAssetId(widget.config?.assetId ? parseInt(widget.config.assetId.toString()) : null);
    setSelectedDeviceId(widget.config?.deviceId ? parseInt(widget.config.deviceId.toString()) : null);
    setSelectedSensorTag(widget.config?.sensorTag || null);
    setSelectedVariables(widget.config?.sensorTags || (widget.config?.sensorTag ? [widget.config.sensorTag] : []));
  }, [widget, isMultiVariableChart]);

  // Atualizar config quando seleções mudarem
  useEffect(() => {
    if (!selectedAssetId) return;
    
    const selectedAsset = assets.find(a => a.id === selectedAssetId);
    const deviceGroup = deviceGroups.find(g => g.deviceId === selectedDeviceId);
    
    if (isMultiVariableChart && selectedVariables.length > 0) {
      const selectedSensors = availableSensors.filter(s => selectedVariables.includes(s.tag));
      
      setConfig(prev => ({
        ...prev,
        assetId: selectedAssetId?.toString(),
        assetTag: selectedAsset?.tag,
        deviceId: selectedDeviceId?.toString(),
        deviceName: deviceGroup?.displayName,
        sensorTags: selectedVariables,
        sensorTag: selectedVariables[0],
        unit: selectedSensors[0]?.unit,
      }));
    } else if (selectedSensor) {
      setConfig(prev => ({
        ...prev,
        assetId: selectedAssetId?.toString(),
        assetTag: selectedAsset?.tag,
        deviceId: selectedDeviceId?.toString(),
        deviceName: deviceGroup?.displayName,
        sensorTag: selectedSensor.tag,
        unit: selectedSensor.unit,
      }));
    }
  }, [isMultiVariableChart, selectedVariables, selectedSensor, selectedAssetId, selectedDeviceId, assets, deviceGroups, availableSensors]);

  const handleSave = () => {
    // Garantir que sensorTags estão sendo salvos para widgets multi-variável
    const finalConfig = { ...config };
    if (isMultiVariableChart && selectedVariables.length > 0) {
      finalConfig.sensorTags = selectedVariables;
    }
    
    updateWidget(layoutId, widget.id, {
      title,
      size,
      config: finalConfig,
    });
    onClose();
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Verificar se deve mostrar fonte de dados
  const showDataSource = !['photo-display', 'text-display', 
    'table-workorders', 'table-equipments', 'wo-by-status', 'wo-by-priority',
    'wo-by-type', 'os-abertas', 'os-andamento', 'os-atrasadas', 'mttr',
    'mtbf', 'disponibilidade', 'backlog'
  ].includes(widget.type);

  // Renderizar campos específicos por tipo de widget
  const renderTypeSpecificConfig = () => {
    switch (widget.type) {
      case 'card-kpi':
      case 'card-value':
      case 'card-stat':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Input
                value={config.unit || ''}
                onChange={(e) => handleConfigChange('unit', e.target.value)}
                placeholder="Ex: %, h, un"
              />
            </div>
          </div>
        );

      case 'gauge-circular':
      case 'gauge-progress':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Mínimo</Label>
                <Input
                  type="number"
                  value={config.minValue || 0}
                  onChange={(e) => handleConfigChange('minValue', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Máximo</Label>
                <Input
                  type="number"
                  value={config.maxValue || 100}
                  onChange={(e) => handleConfigChange('maxValue', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Limite de Aviso</Label>
                <Input
                  type="number"
                  value={config.warningThreshold || ''}
                  onChange={(e) => handleConfigChange('warningThreshold', Number(e.target.value))}
                  placeholder="Ex: 70"
                />
              </div>
              <div className="space-y-2">
                <Label>Limite Crítico</Label>
                <Input
                  type="number"
                  value={config.criticalThreshold || ''}
                  onChange={(e) => handleConfigChange('criticalThreshold', Number(e.target.value))}
                  placeholder="Ex: 90"
                />
              </div>
            </div>
          </div>
        );

      case 'chart-bar':
      case 'chart-bar-horizontal':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Intervalo de Atualização</Label>
              <Select
                value={String(config.refreshInterval || 60000)}
                onValueChange={(value) => handleConfigChange('refreshInterval', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30000">30 segundos</SelectItem>
                  <SelectItem value="60000">1 minuto</SelectItem>
                  <SelectItem value="300000">5 minutos</SelectItem>
                  <SelectItem value="600000">10 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'indicator-status':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status Padrão</Label>
              <Select
                value={config.status || 'ok'}
                onValueChange={(value) => handleConfigChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ok">Operacional</SelectItem>
                  <SelectItem value="warning">Atenção</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'indicator-trend':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tendência</Label>
              <Select
                value={config.trend || 'up'}
                onValueChange={(value) => handleConfigChange('trend', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">Subindo</SelectItem>
                  <SelectItem value="down">Descendo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'text-display':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Texto</Label>
              <Textarea
                value={config.text || ''}
                onChange={(e) => handleConfigChange('text', e.target.value)}
                placeholder="Digite o texto que deseja exibir..."
                rows={4}
              />
            </div>
          </div>
        );

      case 'photo-display':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL da Imagem</Label>
              <Input
                value={config.imageUrl || ''}
                onChange={(e) => handleConfigChange('imageUrl', e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Renderizar seleção de fonte de dados (Asset > Device > Variável)
  const renderDataSourceSelection = () => {
    if (!showDataSource) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Este widget usa dados dinâmicos do sistema.</p>
          <p className="text-sm mt-2">Não requer configuração de fonte de dados.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Passo 1: Selecionar Equipamento */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            1️⃣ Equipamento
          </Label>
          {isLoadingAssets ? (
            <div className="flex items-center justify-center h-10 border rounded-md bg-muted/50">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Carregando equipamentos...</span>
            </div>
          ) : (
            <Select
              value={selectedAssetId?.toString() || ''}
              onValueChange={(value) => {
                const assetId = parseInt(value);
                setSelectedAssetId(assetId);
                setSelectedDeviceId(null);
                setSelectedSensorTag(null);
                setSelectedVariables([]);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione um equipamento" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {assets.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Nenhum equipamento disponível
                  </div>
                ) : (
                  assets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{asset.tag}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground text-sm">{asset.asset_type || asset.type}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Passo 2: Selecionar Device/Sensor */}
        {selectedAssetId && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              2️⃣ Sensor (Device)
            </Label>
            {isLoadingSensors ? (
              <div className="flex items-center justify-center h-10 border rounded-md bg-muted/50">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Carregando sensores...</span>
              </div>
            ) : deviceGroups.length > 0 ? (
              <Select
                value={selectedDeviceId?.toString() || ''}
                onValueChange={(value) => {
                  setSelectedDeviceId(parseInt(value));
                  setSelectedSensorTag(null);
                  setSelectedVariables([]);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione um sensor" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {deviceGroups.map(device => (
                    <SelectItem 
                      key={device.deviceId} 
                      value={device.deviceId.toString()}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {device.displayName}
                        </span>
                        {device.fullSerial && (
                          <span className="text-muted-foreground text-xs">
                            ({device.fullSerial})
                          </span>
                        )}
                        <span className="text-muted-foreground text-xs">
                          - {device.sensors.length} variáveis
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center justify-center h-10 border rounded-md bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                <span className="text-sm text-orange-700 dark:text-orange-400">
                  Nenhum sensor encontrado para este equipamento
                </span>
              </div>
            )}
          </div>
        )}

        {/* Passo 3: Selecionar Variável(is) */}
        {selectedDeviceId && availableSensors.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              3️⃣ Variável{isMultiVariableChart ? 's' : ''} {isMultiVariableChart && '(múltipla seleção)'}
            </Label>
            
            {isMultiVariableChart ? (
              <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {availableSensors.map((sensor, index) => {
                  const isSelected = selectedVariables.includes(sensor.tag);
                  
                  return (
                    <label
                      key={`${sensor.tag}-${index}`}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border border-primary' 
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVariables(prev => [...prev, sensor.tag]);
                          } else {
                            setSelectedVariables(prev => prev.filter(t => t !== sensor.tag));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-medium text-foreground">{getVariableName(sensor.tag)}</span>
                        {sensor.is_online ? (
                          <span className="text-xs text-green-600">🟢</span>
                        ) : (
                          <span className="text-xs text-red-600">🔴</span>
                        )}
                        {sensor.last_value !== null && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground text-sm">
                              {sensor.last_value.toFixed(2)} {sensor.unit}
                            </span>
                          </>
                        )}
                      </div>
                    </label>
                  );
                })}
                {selectedVariables.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      {selectedVariables.length} variável(is) selecionada(s)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <Select
                value={selectedSensorTag || ''}
                onValueChange={(value) => setSelectedSensorTag(value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione uma variável" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {availableSensors.map((sensor, index) => (
                    <SelectItem key={`${sensor.tag}-${index}`} value={sensor.tag}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{getVariableName(sensor.tag)}</span>
                        {sensor.is_online ? (
                          <span className="text-xs">🟢</span>
                        ) : (
                          <span className="text-xs">🔴</span>
                        )}
                        {sensor.last_value !== null && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground text-sm">
                              {sensor.last_value.toFixed(2)} {sensor.unit}
                            </span>
                          </>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Fórmula de Transformação */}
        {showDataSource && (selectedSensorTag || selectedVariables.length > 0) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Fórmula de Transformação (opcional)</Label>
            <Textarea
              value={config.transform?.formula || ''}
              onChange={(e) => handleConfigChange('transform', { 
                ...config.transform,
                formula: e.target.value 
              })}
              placeholder={'Use $VALUE$ para referenciar o valor do sensor\n\nExemplo: ($VALUE$ * 9/5) + 32'}
              className="font-mono text-sm min-h-[80px] resize-y"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Transforme o valor do sensor usando expressões JavaScript. Use <code className="text-xs bg-muted px-1 py-0.5 rounded">$VALUE$</code> como placeholder.
            </p>
            <details className="text-xs">
              <summary className="cursor-pointer font-medium text-foreground hover:text-accent-foreground transition-colors">
                📚 Ver exemplos de fórmulas
              </summary>
              <div className="mt-2 space-y-1 pl-4 border-l-2 border-muted">
                <p><code className="bg-muted px-1 rounded">($VALUE$ * 9/5) + 32</code> - Converter °C para °F</p>
                <p><code className="bg-muted px-1 rounded">Math.round($VALUE$)</code> - Arredondar valor</p>
                <p><code className="bg-muted px-1 rounded">Math.abs($VALUE$)</code> - Valor absoluto</p>
                <p><code className="bg-muted px-1 rounded">$VALUE$ == true ? "Ligado" : "Desligado"</code> - Boolean para texto</p>
                <p><code className="bg-muted px-1 rounded">Math.min(Math.max($VALUE$, 0), 100)</code> - Limitar entre 0 e 100</p>
                <p><code className="bg-muted px-1 rounded">$VALUE$ / 1000</code> - Converter para kilo (ex: W para kW)</p>
                <p><code className="bg-muted px-1 rounded">$VALUE$.toFixed(2)</code> - Formatar com 2 casas decimais</p>
                <p><code className="bg-muted px-1 rounded">$VALUE$ * 100</code> - Converter para porcentagem</p>
              </div>
            </details>
          </div>
        )}

        {/* Configurações específicas do tipo */}
        {renderTypeSpecificConfig()}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurar Widget
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="w-4 h-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <Database className="w-4 h-4" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Aparência
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 overflow-y-auto pr-2">
            <TabsContent value="general" className="space-y-4 px-1 mt-0">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Título do Widget</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Digite o título..."
                  />
                </div>
                <div className="w-36 space-y-2">
                  <Label>Colunas</Label>
                  <Select
                    value={size}
                    onValueChange={(value) => setSize(value as DashboardWidget['size'])}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 bg-primary rounded-sm" 
                            style={{ width: `${parseInt(size.replace('col-', '')) * 12}px` }}
                          />
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((cols) => (
                        <SelectItem key={cols} value={`col-${cols}`}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 bg-primary rounded-sm" 
                              style={{ width: `${cols * 12}px` }}
                            />
                            <span className="text-sm text-muted-foreground">{cols}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <strong>Tipo:</strong> {widget.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </TabsContent>

            <TabsContent value="data" className="px-1">
              {renderDataSourceSelection()}
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4 px-1">
              <div className="space-y-2">
                <Label>Label (opcional)</Label>
                <Input
                  value={config.label || ''}
                  onChange={(e) => handleConfigChange('label', e.target.value)}
                  placeholder="Ex: Temperatura Retorno"
                />
                <p className="text-xs text-muted-foreground">
                  Nome personalizado para exibição no widget
                </p>
              </div>

              {/* Seletor de ícone - apenas para Card KPI */}
              {widget.type === 'card-kpi' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Ícone</Label>
                    <span className="text-xs text-muted-foreground">{kpiIconOptions.length} disponíveis</span>
                  </div>
                  
                  {/* Ícone selecionado atualmente */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                    {(() => {
                      const currentIcon = config.iconName || 'activity';
                      const CurrentIconComponent = kpiIconMap[currentIcon];
                      const currentLabel = kpiIconOptions.find(i => i.value === currentIcon)?.label || 'Atividade';
                      return (
                        <>
                          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                            <CurrentIconComponent className="w-6 h-6 text-primary-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{currentLabel}</p>
                            <p className="text-xs text-muted-foreground">Ícone selecionado</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Grid de ícones */}
                  <div className="rounded-lg border bg-muted/30 overflow-hidden">
                    <ScrollArea className="h-[160px]">
                      <div className="p-3">
                        <div className="grid grid-cols-10 gap-1">
                          {kpiIconOptions.map((iconOption) => {
                            const IconComponent = kpiIconMap[iconOption.value];
                            const isSelected = (config.iconName || 'activity') === iconOption.value;
                            return (
                              <button
                                key={iconOption.value}
                                type="button"
                                onClick={() => handleConfigChange('iconName', iconOption.value)}
                                className={cn(
                                  "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150",
                                  isSelected 
                                    ? "bg-primary text-primary-foreground shadow-md scale-110" 
                                    : "bg-background hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30"
                                )}
                                title={iconOption.label}
                              >
                                <IconComponent className="w-4 h-4" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Cor Principal</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.color || '#006b76'}
                    onChange={(e) => handleConfigChange('color', e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={config.color || '#006b76'}
                    onChange={(e) => handleConfigChange('color', e.target.value)}
                    placeholder="#006b76"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Casas Decimais</Label>
                <Select
                  value={String(config.decimals ?? 0)}
                  onValueChange={(value) => handleConfigChange('decimals', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem decimais</SelectItem>
                    <SelectItem value="1">1 casa decimal</SelectItem>
                    <SelectItem value="2">2 casas decimais</SelectItem>
                    <SelectItem value="3">3 casas decimais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
