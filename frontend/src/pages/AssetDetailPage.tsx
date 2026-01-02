/**
 * AssetDetailPage - Página Unificada de Detalhes do Ativo
 * 
 * Página principal para visualização de detalhes de um ativo específico.
 * Combina funcionalidades de CMMS (manutenção) e Monitor (telemetria).
 * 
 * Tabs:
 * - Visão Geral: Informações básicas, métricas de performance e resumo de manutenção
 * - Monitoramento: Sensores em tempo real
 * - Telemetria: Gráficos de séries temporais
 * - Manutenção: Ordens de serviço
 * - Histórico: Histórico detalhado de manutenções
 * - Alertas: Histórico de alertas (manutenção e IoT)
 * - Documentos: Manuais e documentos técnicos
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Clock,
  Gauge,
  Zap,
  Activity,
  Loader2,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Thermometer,
  Antenna,
  Wrench,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Play,
  Plus,
  Upload,
  Settings,
  TrendingUp,
  History,
  DollarSign,
  Bell,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAssetDetailsQuery, useAssetSensorsQuery } from '@/apps/monitor/hooks/useAssetsQuery';
import { useAlertsQuery } from '@/apps/monitor/hooks/useAlertsQuery';
import { useWorkOrdersByAsset } from '@/hooks/useWorkOrdersQuery';
import { telemetryService } from '@/apps/monitor/services';
import { MultiSeriesTelemetryChart } from '@/apps/monitor/components/charts/MultiSeriesTelemetryChart';
import type { MaintenanceHistory, MaintenanceAlert } from '@/types';

// ============================================================================
// KPI Card Component
// ============================================================================
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

// ============================================================================
// Helper Functions para Alertas de Manutenção
// ============================================================================
const getPriorityColor = (priority: MaintenanceAlert['priority']) => {
  switch (priority) {
    case 'LOW': return 'text-blue-600';
    case 'MEDIUM': return 'text-yellow-600';
    case 'HIGH': return 'text-orange-600';
    case 'CRITICAL': return 'text-red-600';
  }
};

const getPriorityIcon = (priority: MaintenanceAlert['priority']) => {
  switch (priority) {
    case 'LOW': return <Bell className="h-4 w-4" />;
    case 'MEDIUM': return <AlertCircle className="h-4 w-4" />;
    case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
    case 'CRITICAL': return <XCircle className="h-4 w-4" />;
  }
};

// ============================================================================
// Main Component
// ============================================================================
export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetId = id ? parseInt(id) : null;

  // Estado para telemetria
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [telemetryPeriod, setTelemetryPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [telemetryData, setTelemetryData] = useState<any>(null);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);

  // Estado para alertas de manutenção e histórico
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);

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

  // Verificar se o asset tem monitoramento IoT
  const hasIoTMonitoring = sensors.length > 0;

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

  // Gerar dados mock de histórico de manutenção
  useEffect(() => {
    if (!asset) return;

    // Mock maintenance history - em produção virá da API
    const history: MaintenanceHistory[] = [
      {
        id: '1',
        equipmentId: String(asset.id),
        workOrderId: 'OS-2024-001',
        type: 'PREVENTIVE',
        performedBy: 'João Silva',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Manutenção preventiva trimestral',
        partsUsed: ['Filtro de ar', 'Óleo lubrificante'],
        cost: 150,
        duration: 2,
        status: 'COMPLETED',
        findings: 'Equipamento em bom estado, filtros substituídos conforme cronograma.',
        recommendations: 'Próxima manutenção em 90 dias'
      },
      {
        id: '2',
        equipmentId: String(asset.id),
        workOrderId: 'OS-2024-002',
        type: 'CORRECTIVE',
        performedBy: 'Maria Santos',
        date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Correção de vazamento no condensador',
        partsUsed: ['Vedação', 'Gás refrigerante R410A'],
        cost: 320,
        duration: 4,
        status: 'COMPLETED',
        findings: 'Vazamento localizado na conexão do condensador.',
        recommendations: 'Monitorar temperatura de operação'
      },
      {
        id: '3',
        equipmentId: String(asset.id),
        workOrderId: 'OS-2024-003',
        type: 'PREVENTIVE',
        performedBy: 'Carlos Lima',
        date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Limpeza e inspeção geral',
        partsUsed: ['Produto de limpeza'],
        cost: 80,
        duration: 1.5,
        status: 'COMPLETED',
        findings: 'Limpeza realizada, serpentinas em bom estado.',
        recommendations: 'Manter cronograma de limpeza'
      }
    ];

    setMaintenanceHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    // Mock maintenance alerts
    const alerts: MaintenanceAlert[] = [];
    const now = new Date();
    
    // Simular alerta se última manutenção foi há mais de 90 dias
    if (asset.last_maintenance) {
      const lastMaintenance = new Date(asset.last_maintenance);
      const daysSinceLastMaintenance = Math.ceil((now.getTime() - lastMaintenance.getTime()) / (1000 * 3600 * 24));
      
      if (daysSinceLastMaintenance > 90) {
        alerts.push({
          id: '1',
          equipmentId: String(asset.id),
          type: 'OVERDUE',
          priority: 'HIGH',
          message: `Manutenção preventiva em atraso há ${daysSinceLastMaintenance - 90} dias`,
          dueDate: new Date(lastMaintenance.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          daysOverdue: daysSinceLastMaintenance - 90,
          isAcknowledged: false,
          createdAt: now.toISOString()
        });
      }
    }

    setMaintenanceAlerts(alerts);
  }, [asset]);

  // Funções de cálculo de métricas de manutenção
  const calculateUptime = () => {
    const totalHours = 8760; // 1 year default
    const downtimeHours = maintenanceHistory.reduce((total, record) => total + record.duration, 0);
    return Math.max(0, ((totalHours - downtimeHours) / totalHours) * 100);
  };

  const calculateMTBF = () => {
    const correctiveMaintenances = maintenanceHistory.filter(h => h.type === 'CORRECTIVE').length;
    const operatingHours = 8760;
    return correctiveMaintenances > 0 ? Math.round(operatingHours / correctiveMaintenances) : operatingHours;
  };

  const calculateMTTR = () => {
    const correctiveMaintenances = maintenanceHistory.filter(h => h.type === 'CORRECTIVE');
    const totalRepairTime = correctiveMaintenances.reduce((total, record) => total + record.duration, 0);
    return correctiveMaintenances.length > 0 ? Math.round(totalRepairTime / correctiveMaintenances.length * 10) / 10 : 0;
  };

  const acknowledgeAlert = (alertId: string) => {
    setMaintenanceAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isAcknowledged: true } : alert
    ));
  };

  const totalMaintenanceCosts = maintenanceHistory.reduce((total, record) => total + record.cost, 0);

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
          <Button onClick={() => navigate('/cmms/ativos')}>
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
      'OPERATIONAL': { label: 'Operacional', variant: 'default' },
      'MAINTENANCE': { label: 'Em Manutenção', variant: 'secondary' },
      'Maintenance': { label: 'Em Manutenção', variant: 'secondary' },
      'STOPPED': { label: 'Parado', variant: 'destructive' },
      'INACTIVE': { label: 'Parado', variant: 'destructive' },
      'Stopped': { label: 'Parado', variant: 'destructive' },
      'ALERT': { label: 'Alerta', variant: 'outline' },
      'Alert': { label: 'Alerta', variant: 'outline' },
      'WARNING': { label: 'Alerta', variant: 'outline' },
      'CRITICAL': { label: 'Alerta', variant: 'outline' },
      'ERROR': { label: 'Alerta', variant: 'outline' },
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
            onClick={() => navigate('/cmms/ativos')}
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

        <div className="flex items-center gap-2">
          {getStatusBadge(asset.status)}
          <Button>
            <Wrench className="h-4 w-4 mr-2" />
            Criar OS
          </Button>
        </div>
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
            label="Uptime"
            value={calculateUptime().toFixed(1)}
            unit="%"
            status={calculateUptime() >= 95 ? 'good' : calculateUptime() >= 85 ? 'warning' : 'critical'}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <KPICard
            label="MTBF"
            value={calculateMTBF().toLocaleString('pt-BR')}
            unit="h"
            icon={<Clock className="w-4 h-4" />}
          />
          <KPICard
            label="MTTR"
            value={calculateMTTR().toFixed(1)}
            unit="h"
            icon={<Wrench className="w-4 h-4" />}
          />
          <KPICard
            label="ΔP Filtro"
            value={assetKPIs.dpFilter.toFixed(0)}
            unit="Pa"
            status={assetKPIs.dpFilter > 250 ? 'critical' : assetKPIs.dpFilter > 200 ? 'warning' : 'good'}
            icon={<Gauge className="w-4 h-4" />}
          />
          <KPICard
            label="Potência Atual"
            value={assetKPIs.currentPower.toFixed(0)}
            unit="kW"
            icon={<Zap className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          {hasIoTMonitoring && (
            <>
              <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
              <TabsTrigger value="telemetry">Telemetria</TabsTrigger>
            </>
          )}
          <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* Aba Visão Geral */}
        {/* ================================================================ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Informações do Equipamento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="w-5 h-5 text-primary" />
                  Informações do Equipamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">{getStatusBadge(asset.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                    <p className="mt-1 font-medium">{asset.asset_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Marca/Modelo</label>
                    <p className="mt-1 font-medium">{asset.manufacturer || '-'} {asset.model || ''}</p>
                  </div>
                  {asset.serial_number && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Série</label>
                      <p className="mt-1 font-medium">{asset.serial_number}</p>
                    </div>
                  )}
                  {asset.specifications?.capacity && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Capacidade</label>
                      <p className="mt-1 font-medium">
                        {String(asset.specifications.capacity)} {String(asset.specifications.capacity_unit || 'TR')}
                      </p>
                    </div>
                  )}
                  {asset.installation_date && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Instalação</label>
                      <p className="mt-1 font-medium">
                        {new Date(asset.installation_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Métricas de Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Métricas de Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Uptime</label>
                    <span className="text-sm font-medium">{calculateUptime().toFixed(1)}%</span>
                  </div>
                  <Progress value={calculateUptime()} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">MTBF</label>
                    <p className="mt-1 text-lg font-semibold">{calculateMTBF()}h</p>
                    <p className="text-xs text-muted-foreground">Tempo Médio Entre Falhas</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">MTTR</label>
                    <p className="mt-1 text-lg font-semibold">{calculateMTTR()}h</p>
                    <p className="text-xs text-muted-foreground">Tempo Médio de Reparo</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Última Manutenção</label>
                  <p className="mt-1 text-lg font-semibold">
                    {asset.last_maintenance 
                      ? new Date(asset.last_maintenance).toLocaleDateString('pt-BR')
                      : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo de Manutenções */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="w-5 h-5 text-primary" />
                Resumo de Manutenções
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {maintenanceHistory.filter(h => h.type === 'PREVENTIVE').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Preventivas</p>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {maintenanceHistory.filter(h => h.type === 'CORRECTIVE').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Corretivas</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {maintenanceHistory.filter(h => h.type === 'EMERGENCY').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Emergenciais</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    R$ {totalMaintenanceCosts.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Banner de Monitoramento IoT */}
          {hasIoTMonitoring && (
            <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                      <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800 dark:text-green-300">Monitoramento IoT Ativo</h3>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Este ativo possui {sensors.length} sensor(es) conectado(s)
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Ver Sensores
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* Aba Monitoramento */}
        {/* ================================================================ */}
        {hasIoTMonitoring && (
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
        )}

        {/* ================================================================ */}
        {/* Aba Telemetria */}
        {/* ================================================================ */}
        {hasIoTMonitoring && (
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
        )}

        {/* ================================================================ */}
        {/* Aba Manutenção */}
        {/* ================================================================ */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Ordens de Serviço
              </CardTitle>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nova OS
              </Button>
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
                  <Button variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeira OS
                  </Button>
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
                      'CRITICAL': { label: 'Crítica', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
                      'HIGH': { label: 'Alta', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
                      'MEDIUM': { label: 'Média', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
                      'LOW': { label: 'Baixa', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
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
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Link 
                                to={`/cmms/work-orders/${wo.id}`}
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

        {/* ================================================================ */}
        {/* Aba Histórico de Manutenção */}
        {/* ================================================================ */}
        <TabsContent value="history" className="space-y-4">
          {maintenanceHistory.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Nenhum histórico encontrado</h3>
                <p className="text-muted-foreground">
                  Este equipamento ainda não possui registros de manutenção.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {maintenanceHistory.map(record => (
                <Card key={record.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" />
                        {record.workOrderId}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          record.type === 'PREVENTIVE' ? 'default' :
                          record.type === 'CORRECTIVE' ? 'secondary' : 
                          record.type === 'REQUEST' ? 'outline' : 'destructive'
                        }>
                          {record.type === 'PREVENTIVE' ? 'Preventiva' :
                           record.type === 'CORRECTIVE' ? 'Corretiva' :
                           record.type === 'REQUEST' ? 'Solicitação' : 'Emergencial'}
                        </Badge>
                        <Badge variant={record.status === 'COMPLETED' ? 'default' : 'outline'}>
                          {record.status === 'COMPLETED' ? 'Concluída' : 
                           record.status === 'PARTIAL' ? 'Parcial' : 'Cancelada'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-medium mb-2">Detalhes</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{record.duration}h de duração</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>R$ {record.cost.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{record.performedBy}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Peças Utilizadas</h4>
                        <div className="space-y-1">
                          {record.partsUsed.map((part, index) => (
                            <div key={index} className="text-sm text-muted-foreground">
                              • {part}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Descrição</h4>
                      <p className="text-sm text-muted-foreground">
                        {record.description}
                      </p>
                    </div>

                    {record.findings && (
                      <div>
                        <h4 className="font-medium mb-2">Observações</h4>
                        <p className="text-sm text-muted-foreground">
                          {record.findings}
                        </p>
                      </div>
                    )}

                    {record.recommendations && (
                      <div>
                        <h4 className="font-medium mb-2">Recomendações</h4>
                        <p className="text-sm text-muted-foreground">
                          {record.recommendations}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* Aba Alertas */}
        {/* ================================================================ */}
        <TabsContent value="alerts" className="space-y-4">
          {/* Alertas de Manutenção */}
          {maintenanceAlerts.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertas de Manutenção
              </h3>
              {maintenanceAlerts.map(alert => (
                <Alert 
                  key={alert.id}
                  className={`${alert.isAcknowledged ? 'opacity-60' : ''} ${
                    alert.priority === 'CRITICAL' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                    alert.priority === 'HIGH' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' :
                    alert.priority === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                    'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={getPriorityColor(alert.priority)}>
                        {getPriorityIcon(alert.priority)}
                      </div>
                      <div className="space-y-1">
                        <AlertDescription className="font-medium">
                          {alert.message}
                        </AlertDescription>
                        <p className="text-xs text-muted-foreground">
                          Vencimento: {new Date(alert.dueDate).toLocaleDateString('pt-BR')}
                          {alert.daysOverdue && ` (${alert.daysOverdue} dias em atraso)`}
                        </p>
                      </div>
                    </div>
                    {!alert.isAcknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Reconhecer
                      </Button>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Histórico de Alertas IoT */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Histórico de Alertas IoT
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assetAlerts.length === 0 && maintenanceAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-medium mb-2">Nenhum alerta ativo</h3>
                  <p>Todos os alertas foram verificados ou não há problemas detectados.</p>
                </div>
              ) : assetAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum alerta IoT registrado para este ativo</p>
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

        {/* ================================================================ */}
        {/* Aba Documentos */}
        {/* ================================================================ */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documentos
              </CardTitle>
              <Button size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Manuais e documentos técnicos</p>
                <p className="text-sm">Nenhum documento cadastrado para este ativo</p>
                <Button variant="outline" className="mt-4">
                  <Upload className="w-4 h-4 mr-2" />
                  Adicionar primeiro documento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
