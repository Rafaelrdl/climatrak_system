/**
 * MonitorAssetDetailPage - Página de Detalhes do Ativo no Monitor
 * 
 * Mostra informações detalhadas de um ativo específico com:
 * - KPIs (Saúde, Horas de Operação, ΔP Filtro, etc.)
 * - Tabs: Informações, Monitoramento, Telemetria, Manutenção, Histórico Alertas
 * - Integração com sensores e telemetria
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  Heart, 
  Clock, 
  Gauge, 
  Zap,
  Activity,
  Loader2,
  Info,
  MapPin,
  Package,
  AlertTriangle,
  RefreshCw,
  Thermometer,
  Droplets,
  Antenna,
  Wrench,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Play
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAssetDetailsQuery, useAssetSensorsQuery } from '../hooks/useAssetsQuery';
import { useAlertsQuery } from '../hooks/useAlertsQuery';
import { useWorkOrdersByAsset } from '@/hooks/useWorkOrdersQuery';
import { telemetryService } from '../services';
import { MultiSeriesTelemetryChart } from '../components/charts/MultiSeriesTelemetryChart';

// KPI Card Component
interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
}

function KPICard({ label, value, unit, status, icon }: KPICardProps) {
  const statusColors = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    critical: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card className="bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className={status ? statusColors[status] : 'text-primary'}>
            {icon}
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${status ? statusColors[status] : ''}`}>
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function MonitorAssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetId = id ? parseInt(id) : null;

  // Estado para telemetria
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [telemetryPeriod, setTelemetryPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [telemetryData, setTelemetryData] = useState<any>(null);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);

  // Queries
  const { data: asset, isLoading: isLoadingAsset, error } = useAssetDetailsQuery(assetId);
  const { data: sensors = [] } = useAssetSensorsQuery(assetId);
  const { data: allAlerts = [] } = useAlertsQuery();
  const { data: workOrders = [], isLoading: isLoadingWorkOrders } = useWorkOrdersByAsset(assetId?.toString());

  // Filtrar alertas do asset
  const assetAlerts = useMemo(() => {
    if (!asset?.tag) return [];
    return allAlerts.filter(a => a.asset_tag === asset.tag);
  }, [allAlerts, asset?.tag]);

  // Métricas disponíveis baseadas nos sensores
  const availableMetrics = useMemo(() => {
    return sensors.map(sensor => ({
      id: sensor.tag,
      label: sensor.tag.includes('_') 
        ? sensor.tag.split('_').slice(1).join(' ').replace(/^\w/, c => c.toUpperCase())
        : sensor.tag,
      unit: sensor.unit || '',
      metricType: sensor.metric_type
    }));
  }, [sensors]);

  // Buscar dados de telemetria quando métricas são selecionadas
  useEffect(() => {
    if (!asset?.tag || selectedMetrics.length === 0) {
      setTelemetryData(null);
      return;
    }

    const getHoursForPeriod = (period: '24h' | '7d' | '30d'): number => {
      switch (period) {
        case '24h': return 24;
        case '7d': return 24 * 7;
        case '30d': return 24 * 30;
      }
    };

    const fetchTelemetryData = async () => {
      setIsLoadingTelemetry(true);
      try {
        const hours = getHoursForPeriod(telemetryPeriod);
        const data = await telemetryService.getHistoryByAsset(asset.tag, hours, selectedMetrics);
        
        if (data?.series?.length > 0) {
          const enrichedSeries = data.series.map((series: any) => {
            const sensor = sensors.find(s => s.tag === series.sensorId);
            return {
              ...series,
              sensorName: sensor?.tag || series.sensorId,
              metricType: sensor?.metric_type || series.sensorType,
              unit: sensor?.unit || series.unit || ''
            };
          });
          setTelemetryData(enrichedSeries);
        } else {
          setTelemetryData(null);
        }
      } catch (error) {
        console.error('Erro ao carregar telemetria:', error);
        setTelemetryData(null);
      } finally {
        setIsLoadingTelemetry(false);
      }
    };

    fetchTelemetryData();
  }, [asset?.tag, selectedMetrics, sensors, telemetryPeriod]);

  // Calcular KPIs
  const assetKPIs = useMemo(() => {
    if (!asset) return null;
    return {
      health: asset.health_score || 100,
      operatingHours: 0, // TODO: calcular do backend
      dpFilter: 0, // TODO: do sensor
      compressorState: 'ON',
      currentPower: 0,
      vibration: 0
    };
  }, [asset]);

  // Loading state
  if (isLoadingAsset) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Carregando ativo...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !asset) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {error ? 'Erro ao carregar ativo' : 'Ativo não encontrado'}
          </p>
          <Button onClick={() => navigate('/monitor/ativos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Lista
          </Button>
        </div>
      </div>
    );
  }

  // Helper para cor do status
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'OK': { label: 'Operacional', variant: 'default' },
      'ACTIVE': { label: 'Operacional', variant: 'default' },
      'Maintenance': { label: 'Em Manutenção', variant: 'secondary' },
      'MAINTENANCE': { label: 'Em Manutenção', variant: 'secondary' },
      'Stopped': { label: 'Parado', variant: 'destructive' },
      'INACTIVE': { label: 'Inativo', variant: 'destructive' },
      'Alert': { label: 'Alerta', variant: 'outline' },
      'WARNING': { label: 'Alerta', variant: 'outline' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/monitor/ativos')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{asset.tag}</h1>
            <p className="text-muted-foreground">
              {asset.asset_type} • {asset.location_description || asset.full_location || 'Sem localização'}
            </p>
          </div>
        </div>

        <Link
          to={`/cmms/ativos/${asset.id}`}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Abrir OS no TrakNor</span>
        </Link>
      </div>

      {/* KPIs */}
      {assetKPIs && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <KPICard
            label="Saúde Geral"
            value={assetKPIs.health.toFixed(0)}
            unit="%"
            status={assetKPIs.health >= 80 ? 'good' : assetKPIs.health >= 60 ? 'warning' : 'critical'}
            icon={<Heart className="w-4 h-4" />}
          />
          <KPICard
            label="Horas Operação"
            value={assetKPIs.operatingHours.toLocaleString('pt-BR')}
            unit="h"
            icon={<Clock className="w-4 h-4" />}
          />
          <KPICard
            label="ΔP Filtro"
            value={assetKPIs.dpFilter.toFixed(0)}
            unit="Pa"
            status={assetKPIs.dpFilter > 250 ? 'critical' : assetKPIs.dpFilter > 200 ? 'warning' : 'good'}
            icon={<Gauge className="w-4 h-4" />}
          />
          <KPICard
            label="Estado Compressor"
            value={assetKPIs.compressorState}
            status={assetKPIs.compressorState === 'ON' ? 'good' : 'warning'}
            icon={<Activity className="w-4 h-4" />}
          />
          <KPICard
            label="Potência Atual"
            value={assetKPIs.currentPower.toFixed(0)}
            unit="kW"
            icon={<Zap className="w-4 h-4" />}
          />
          <KPICard
            label="Vibração"
            value={assetKPIs.vibration.toFixed(1)}
            unit="mm/s"
            status={assetKPIs.vibration > 5 ? 'critical' : assetKPIs.vibration > 3 ? 'warning' : 'good'}
            icon={<Activity className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
          <TabsTrigger value="telemetry">Telemetria</TabsTrigger>
          <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
          <TabsTrigger value="alerts">Histórico Alertas</TabsTrigger>
        </TabsList>

        {/* Aba Informações */}
        <TabsContent value="info" className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="w-5 h-5 text-primary" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tag</label>
                  <p className="text-base font-semibold mt-1">{asset.tag}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <p className="text-base font-semibold mt-1">{asset.asset_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(asset.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pontuação de Saúde</label>
                  <p className="text-base font-semibold mt-1">{(asset.health_score || 100).toFixed(0)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Horas de Operação</label>
                  <p className="text-base font-semibold mt-1">0 h</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Última Manutenção</label>
                  <p className="text-base font-semibold mt-1">
                    {asset.last_maintenance 
                      ? new Date(asset.last_maintenance).toLocaleDateString('pt-BR')
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" />
                Localização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Local</label>
                  <p className="text-base font-semibold mt-1">
                    {asset.location_description || asset.full_location || 'N/A'}
                  </p>
                </div>
                {asset.site_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Site</label>
                    <p className="text-base font-semibold mt-1">{asset.site_name}</p>
                  </div>
                )}
                {asset.site_company && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Empresa</label>
                    <p className="text-base font-semibold mt-1">{asset.site_company}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Especificações Técnicas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-primary" />
                Especificações Técnicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {asset.manufacturer && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fabricante</label>
                    <p className="text-base font-semibold mt-1">{asset.manufacturer}</p>
                  </div>
                )}
                {asset.model && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Modelo</label>
                    <p className="text-base font-semibold mt-1">{asset.model}</p>
                  </div>
                )}
                {asset.serial_number && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Número de Série</label>
                    <p className="text-base font-semibold mt-1">{asset.serial_number}</p>
                  </div>
                )}
                {asset.specifications?.capacity && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Capacidade</label>
                    <p className="text-base font-semibold mt-1">
                      {String(asset.specifications.capacity)} {String(asset.specifications.capacity_unit || 'TR')}
                    </p>
                  </div>
                )}
                {asset.specifications?.voltage && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tensão</label>
                    <p className="text-base font-semibold mt-1">{String(asset.specifications.voltage)}V</p>
                  </div>
                )}
                {asset.specifications?.refrigerant && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Refrigerante</label>
                    <p className="text-base font-semibold mt-1">{String(asset.specifications.refrigerant)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Monitoramento */}
        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>Monitoramento em Tempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              {sensors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Antenna className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum sensor vinculado a este ativo</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sensors.map(sensor => (
                    <Card key={sensor.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{sensor.tag}</span>
                          <Badge variant={sensor.is_online ? 'default' : 'secondary'}>
                            {sensor.is_online ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold">
                            {sensor.last_value?.toFixed(1) || '--'}
                          </span>
                          <span className="text-sm text-muted-foreground">{sensor.unit}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {sensor.metric_type}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Telemetria */}
        <TabsContent value="telemetry" className="space-y-4">
          {/* Período de Visualização */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Período de Visualização</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {(['24h', '7d', '30d'] as const).map(period => (
                  <Button
                    key={period}
                    variant={telemetryPeriod === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTelemetryPeriod(period)}
                  >
                    {period === '24h' ? '24 Horas' : period === '7d' ? '7 Dias' : '30 Dias'}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Métricas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Selecionar Métricas</CardTitle>
            </CardHeader>
            <CardContent>
              {availableMetrics.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum sensor disponível</p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {availableMetrics.map(metric => (
                    <div key={metric.id} className="flex items-center gap-2">
                      <Checkbox
                        id={metric.id}
                        checked={selectedMetrics.includes(metric.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMetrics([...selectedMetrics, metric.id]);
                          } else {
                            setSelectedMetrics(selectedMetrics.filter(m => m !== metric.id));
                          }
                        }}
                      />
                      <label htmlFor={metric.id} className="text-sm cursor-pointer">
                        {metric.label} <span className="text-muted-foreground">({metric.unit})</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Séries Temporais */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Séries Temporais</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {selectedMetrics.length} métrica(s) selecionada(s)
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {selectedMetrics.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Thermometer className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione métricas para visualizar os dados</p>
                </div>
              ) : isLoadingTelemetry ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Carregando dados...</span>
                </div>
              ) : telemetryData ? (
                <MultiSeriesTelemetryChart data={telemetryData} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum dado disponível para o período selecionado</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {telemetryData?.length || 0} série(s) de dados carregadas (últimos {telemetryPeriod === '24h' ? '24 horas' : telemetryPeriod === '7d' ? '7 dias' : '30 dias'})
          </div>
        </TabsContent>

        {/* Aba Manutenção */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Histórico de Manutenção
              </CardTitle>
              <Link to={`/cmms/ordens-servico?equipmentId=${asset.id}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Ver no CMMS
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoadingWorkOrders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : workOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma ordem de serviço registrada para este ativo</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workOrders.map((wo: any) => {
                    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode }> = {
                      'OPEN': { label: 'Aberta', variant: 'outline', icon: <FileText className="w-3 h-3" /> },
                      'IN_PROGRESS': { label: 'Em Execução', variant: 'default', icon: <Play className="w-3 h-3" /> },
                      'COMPLETED': { label: 'Concluída', variant: 'secondary', icon: <CheckCircle2 className="w-3 h-3" /> },
                      'CANCELLED': { label: 'Cancelada', variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
                    };
                    const priorityConfig: Record<string, { label: string; color: string }> = {
                      'CRITICAL': { label: 'Crítica', color: 'text-red-600 bg-red-100' },
                      'HIGH': { label: 'Alta', color: 'text-orange-600 bg-orange-100' },
                      'MEDIUM': { label: 'Média', color: 'text-yellow-600 bg-yellow-100' },
                      'LOW': { label: 'Baixa', color: 'text-green-600 bg-green-100' },
                    };
                    const typeConfig: Record<string, { label: string; color: string }> = {
                      'CORRECTIVE': { label: 'Corretiva', color: 'text-red-600' },
                      'PREVENTIVE': { label: 'Preventiva', color: 'text-blue-600' },
                      'PREDICTIVE': { label: 'Preditiva', color: 'text-purple-600' },
                      'REQUEST': { label: 'Solicitação', color: 'text-violet-600' },
                    };

                    const status = statusConfig[wo.status] || statusConfig['OPEN'];
                    const priority = priorityConfig[wo.priority] || priorityConfig['MEDIUM'];
                    const type = typeConfig[wo.type] || typeConfig['CORRECTIVE'];

                    return (
                      <div 
                        key={wo.id} 
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Link 
                                to={`/cmms/ordens-servico/${wo.id}`}
                                className="font-medium text-primary hover:underline flex items-center gap-1"
                              >
                                <FileText className="w-4 h-4" />
                                OS #{wo.order_number || wo.id}
                              </Link>
                              <Badge variant={status.variant} className="flex items-center gap-1">
                                {status.icon}
                                {status.label}
                              </Badge>
                              <span className={`text-xs px-2 py-0.5 rounded ${priority.color}`}>
                                {priority.label}
                              </span>
                              <span className={`text-xs font-medium ${type.color}`}>
                                {type.label}
                              </span>
                            </div>
                            
                            {wo.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {wo.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              {wo.scheduled_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Agendada: {new Date(wo.scheduled_date).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                              {wo.assigned_technician_name && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {wo.assigned_technician_name}
                                </span>
                              )}
                              {wo.completed_at && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Concluída: {new Date(wo.completed_at).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Histórico de Alertas */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              {assetAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum alerta registrado para este ativo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assetAlerts.map(alert => (
                    <div 
                      key={alert.id} 
                      className={`p-4 rounded-lg border ${
                        alert.severity === 'Critical' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
                        alert.severity === 'High' ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800' :
                        alert.severity === 'Medium' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' :
                        'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              alert.severity === 'Critical' ? 'destructive' :
                              alert.severity === 'High' ? 'default' :
                              'secondary'
                            }>
                              {alert.severity}
                            </Badge>
                            <span className="text-sm font-medium">{alert.parameter_key}</span>
                          </div>
                          <p className="text-sm mt-1">{alert.message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.triggered_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
