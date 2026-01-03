/**
 * AssetDetailPage - Página Unificada de Detalhes do Ativo
 * 
 * Página principal para visualização de detalhes de um ativo específico.
 * Combina funcionalidades de CMMS (manutenção) e Monitor (telemetria).
 * 
 * Design: Platform-first com densidade alta de informação.
 * Layout: Viewport fixo, contexto permanente (breadcrumbs/header).
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
  ChevronRight,
  Building2,
  Wifi,
  WifiOff,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAssetDetailsQuery, useAssetSensorsQuery } from '@/apps/monitor/hooks/useAssetsQuery';
import { useAlertsQuery } from '@/apps/monitor/hooks/useAlertsQuery';
import { useWorkOrdersByAsset } from '@/hooks/useWorkOrdersQuery';
import { useEquipment } from '@/hooks/useEquipmentQuery';
import { useMaintenanceMetrics, formatMTBF, formatMTTR, getMTBFStatusColor, getMTTRStatusColor } from '@/hooks/useMaintenanceMetrics';
import { telemetryService } from '@/apps/monitor/services';
import { MultiSeriesTelemetryChart } from '@/apps/monitor/components/charts/MultiSeriesTelemetryChart';
import { WorkOrderViewModal } from '@/components/WorkOrderViewModal';
import { WorkOrderModal } from '@/components/WorkOrderModal';
import { EquipmentEditModal } from '@/components/EquipmentEditModal';
import type { MaintenanceHistory, MaintenanceAlert, WorkOrder } from '@/types';

// ============================================================================
// Status Colors & Configurations (seguindo Design System)
// ============================================================================
const statusConfig = {
  online: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
  offline: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-500 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
} as const;

type StatusType = keyof typeof statusConfig;

// ============================================================================
// KPI Stat Card - Componente padronizado para métricas
// ============================================================================
interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: StatusType;
  icon: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: string;
  };
  description?: string;
  onClick?: () => void;
}

function StatCard({ label, value, unit, status, icon, trend, description, onClick }: StatCardProps) {
  const statusStyle = status ? statusConfig[status] : null;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/20",
        statusStyle?.border
      )}
      onClick={onClick}
    >
      {/* Barra de status lateral */}
      {status && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          statusStyle?.dot
        )} />
      )}
      
      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {label}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                "text-2xl font-bold tabular-nums",
                statusStyle?.text || "text-foreground"
              )}>
                {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
              </span>
              {unit && (
                <span className="text-sm font-medium text-muted-foreground">
                  {unit}
                </span>
              )}
            </div>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.direction === 'up' ? 'text-emerald-600' :
                trend.direction === 'down' ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                {trend.direction === 'down' && <TrendingUp className="h-3 w-3 rotate-180" />}
                <span>{trend.value}</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            statusStyle?.bg || "bg-primary/10"
          )}>
            <div className={cn(
              "h-5 w-5",
              statusStyle?.text || "text-primary"
            )}>
              {icon}
            </div>
          </div>
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
    case 'LOW': return statusConfig.online.text;
    case 'MEDIUM': return statusConfig.warning.text;
    case 'HIGH': return 'text-orange-600 dark:text-orange-400';
    case 'CRITICAL': return statusConfig.critical.text;
  }
};

const getPriorityBg = (priority: MaintenanceAlert['priority']) => {
  switch (priority) {
    case 'LOW': return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    case 'MEDIUM': return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    case 'HIGH': return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800';
    case 'CRITICAL': return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
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
// Loading Skeleton Components
// ============================================================================
function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

function KPIGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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

  // Estado para alertas de manutenção
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);

  // Estado para modal de visualização de OS
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Estado para modal de criação de OS
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Estado para modal de edição de ativo
  const [isEditAssetModalOpen, setIsEditAssetModalOpen] = useState(false);

  // Queries
  const { data: asset, isLoading: isLoadingAsset, error } = useAssetDetailsQuery(assetId);
  const { data: sensors = [] } = useAssetSensorsQuery(assetId);
  const { data: allAlerts = [] } = useAlertsQuery();
  const { data: workOrders = [], isLoading: isLoadingWorkOrders } = useWorkOrdersByAsset(assetId?.toString());
  
  // Buscar equipamento do CMMS (para o modal de edição)
  const { data: equipment } = useEquipment(assetId?.toString());

  // Filtrar alertas do asset
  const assetAlerts = useMemo(() => {
    if (!asset?.tag) return [];
    return allAlerts.filter(a => a.asset_tag === asset.tag);
  }, [allAlerts, asset?.tag]);

  // Filtrar work orders concluídas ou canceladas (histórico)
  const completedWorkOrders = useMemo(() => {
    return workOrders
      .filter((wo: any) => wo.status === 'COMPLETED' || wo.status === 'CANCELLED')
      .sort((a: any, b: any) => {
        const dateA = new Date(a.completed_at || a.updated_at || a.created_at);
        const dateB = new Date(b.completed_at || b.updated_at || b.created_at);
        return dateB.getTime() - dateA.getTime();
      });
  }, [workOrders]);

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

  // Gerar alertas de manutenção baseado em datas
  useEffect(() => {
    if (!asset) return;

    // Alertas de manutenção
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

  // Funções de cálculo de métricas de manutenção (usando hook centralizado)
  const maintenanceMetrics = useMaintenanceMetrics(workOrders, {
    installationDate: asset?.installation_date,
    analysisPeriodDays: 365,
    dailyOperatingHours: 24,
  });

  const acknowledgeAlert = (alertId: string) => {
    setMaintenanceAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isAcknowledged: true } : alert
    ));
  };

  // Custo total não está disponível nos workOrders básicos - será 0 por enquanto
  // TODO: Integrar com API de custos quando disponível
  const totalMaintenanceCosts = 0;

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

  // Loading state - com skeleton estruturado
  if (isLoadingAsset) {
    return (
      <div className="h-full flex flex-col">
        {/* Breadcrumb skeleton */}
        <div className="px-6 py-3 border-b bg-muted/30">
          <Skeleton className="h-4 w-48" />
        </div>
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <HeaderSkeleton />
          <KPIGridSkeleton />
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state - melhor UX com ações claras
  if (error || !asset) {
    return (
      <div className="h-full flex flex-col">
        {/* Breadcrumb */}
        <div className="px-6 py-3 border-b bg-muted/30">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/cmms">CMMS</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/cmms/ativos">Ativos</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {error ? 'Erro ao carregar ativo' : 'Ativo não encontrado'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {error 
                    ? 'Ocorreu um erro ao carregar os dados do ativo. Tente novamente.'
                    : 'O ativo solicitado não existe ou foi removido.'}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button onClick={() => navigate('/cmms/ativos')}>
                    Ver Todos os Ativos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Helper para cor do status - consistente com Design System
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { 
      label: string; 
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      className?: string;
    }> = {
      'OK': { label: 'Operacional', variant: 'default', className: 'bg-teal-500 text-white hover:bg-teal-600 border-transparent' },
      'ACTIVE': { label: 'Operacional', variant: 'default', className: 'bg-teal-500 text-white hover:bg-teal-600 border-transparent' },
      'OPERATIONAL': { label: 'Operacional', variant: 'default', className: 'bg-teal-500 text-white hover:bg-teal-600 border-transparent' },
      'MAINTENANCE': { label: 'Em Manutenção', variant: 'secondary', className: 'bg-amber-500 text-white hover:bg-amber-600 border-transparent' },
      'Maintenance': { label: 'Em Manutenção', variant: 'secondary', className: 'bg-amber-500 text-white hover:bg-amber-600 border-transparent' },
      'STOPPED': { label: 'Parado', variant: 'destructive', className: 'bg-red-500 text-white hover:bg-red-600 border-transparent' },
      'INACTIVE': { label: 'Inativo', variant: 'destructive', className: 'bg-slate-500 text-white hover:bg-slate-600 border-transparent' },
      'Stopped': { label: 'Parado', variant: 'destructive', className: 'bg-red-500 text-white hover:bg-red-600 border-transparent' },
      'ALERT': { label: 'Alerta', variant: 'outline', className: 'bg-orange-500 text-white hover:bg-orange-600 border-transparent' },
      'Alert': { label: 'Alerta', variant: 'outline', className: 'bg-orange-500 text-white hover:bg-orange-600 border-transparent' },
      'WARNING': { label: 'Atenção', variant: 'outline', className: 'bg-amber-500 text-white hover:bg-amber-600 border-transparent' },
      'CRITICAL': { label: 'Crítico', variant: 'destructive', className: 'bg-red-600 text-white hover:bg-red-700 border-transparent' },
      'ERROR': { label: 'Erro', variant: 'destructive', className: 'bg-red-600 text-white hover:bg-red-700 border-transparent' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return (
      <Badge 
        variant={config.variant} 
        className={cn("font-medium", config.className)}
      >
        {config.label}
      </Badge>
    );
  };

  // Helper para status do ativo (para KPIs)
  const getHealthStatus = (score: number): StatusType => {
    if (score >= 80) return 'online';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  const getUptimeStatus = (uptime: number): StatusType => {
    if (uptime >= 95) return 'online';
    if (uptime >= 85) return 'warning';
    return 'critical';
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Breadcrumb - contexto permanente */}
      <div className="px-6 py-3 border-b bg-muted/30 shrink-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/cmms" className="text-muted-foreground hover:text-foreground transition-colors">
                  CMMS
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/cmms/ativos" className="text-muted-foreground hover:text-foreground transition-colors">
                  Ativos
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">{asset.tag}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Conteúdo principal com scroll */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-5">
          {/* Header - mais compacto e informativo */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 mt-1"
                      onClick={() => navigate('/cmms/ativos')}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Voltar para lista de ativos</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground truncate">
                    {asset.tag}
                  </h1>
                  {getStatusBadge(asset.status)}
                  {hasIoTMonitoring && (
                    <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200">
                      <Wifi className="h-3 w-3 mr-1" />
                      IoT Conectado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {asset.asset_type}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {asset.location_description || asset.full_location || 'Sem localização'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Wrench className="h-4 w-4 mr-2" />
                Criar OS
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditAssetModalOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Editar Ativo
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar Relatório
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <History className="h-4 w-4 mr-2" />
                    Ver Histórico Completo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* KPIs - Grid responsivo otimizado */}
          {assetKPIs && (
            <div className="space-y-3">
              {/* Aviso se data de instalação não está preenchida */}
              {maintenanceMetrics.missingInstallationDate && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">
                    <strong>Atenção:</strong> Data de instalação não definida. Os indicadores MTBF, MTTR, Disponibilidade e Confiabilidade requerem esta informação para cálculo preciso.{' '}
                    <button 
                      type="button"
                      className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100"
                      onClick={() => setIsEditAssetModalOpen(true)}
                    >
                      Clique aqui para editar o ativo
                    </button>
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                  label="Saúde Geral"
                  value={assetKPIs.health.toFixed(0)}
                  unit="%"
                  status={getHealthStatus(assetKPIs.health)}
                  icon={<Heart className="w-5 h-5" />}
                  description="Score geral do ativo"
                />
                <StatCard
                  label="Uptime"
                  value={maintenanceMetrics.missingInstallationDate ? '-' : maintenanceMetrics.uptime.toFixed(2)}
                  unit={maintenanceMetrics.missingInstallationDate ? '' : '%'}
                  status={maintenanceMetrics.missingInstallationDate ? 'warning' : getUptimeStatus(maintenanceMetrics.uptime)}
                  icon={<TrendingUp className="w-5 h-5" />}
                  description={maintenanceMetrics.missingInstallationDate ? 'Preencha data de instalação' : 'Tempo em operação'}
                />
                <StatCard
                  label="MTBF"
                  value={maintenanceMetrics.missingInstallationDate ? '-' : maintenanceMetrics.mtbf.toLocaleString('pt-BR')}
                  unit={maintenanceMetrics.missingInstallationDate ? '' : 'h'}
                  status={maintenanceMetrics.missingInstallationDate ? 'warning' : maintenanceMetrics.mtbf >= 4320 ? 'online' : maintenanceMetrics.mtbf >= 720 ? 'warning' : 'critical'}
                  icon={<Clock className="w-5 h-5" />}
                  description={maintenanceMetrics.missingInstallationDate ? 'Preencha data de instalação' : maintenanceMetrics.totalFailures === 0 ? 'Sem falhas no período' : `${maintenanceMetrics.totalFailures} falha(s)`}
                />
                <StatCard
                  label="MTTR"
                  value={maintenanceMetrics.missingInstallationDate ? '-' : maintenanceMetrics.mttr.toFixed(2)}
                  unit={maintenanceMetrics.missingInstallationDate ? '' : 'h'}
                  status={maintenanceMetrics.missingInstallationDate ? 'warning' : maintenanceMetrics.mttr === 0 ? 'online' : maintenanceMetrics.mttr <= 4 ? 'online' : maintenanceMetrics.mttr <= 24 ? 'warning' : 'critical'}
                  icon={<Wrench className="w-5 h-5" />}
                  description={maintenanceMetrics.missingInstallationDate ? 'Preencha data de instalação' : maintenanceMetrics.totalFailures === 0 ? 'Sem reparos' : `${maintenanceMetrics.totalFailures} reparo(s)`}
                />
                <StatCard
                  label="Disponibilidade"
                  value={maintenanceMetrics.missingInstallationDate ? '-' : maintenanceMetrics.availability.toFixed(2)}
                  unit={maintenanceMetrics.missingInstallationDate ? '' : '%'}
                  status={maintenanceMetrics.missingInstallationDate ? 'warning' : maintenanceMetrics.availability >= 99 ? 'online' : maintenanceMetrics.availability >= 95 ? 'warning' : 'critical'}
                  icon={<Activity className="w-5 h-5" />}
                  description={maintenanceMetrics.missingInstallationDate ? 'Preencha data de instalação' : 'MTBF / (MTBF + MTTR)'}
                />
                <StatCard
                  label="Confiabilidade"
                  value={maintenanceMetrics.missingInstallationDate ? '-' : maintenanceMetrics.reliability.toFixed(2)}
                  unit={maintenanceMetrics.missingInstallationDate ? '' : '%'}
                  status={maintenanceMetrics.missingInstallationDate ? 'warning' : maintenanceMetrics.reliability >= 90 ? 'online' : maintenanceMetrics.reliability >= 70 ? 'warning' : 'critical'}
                  icon={<Gauge className="w-5 h-5" />}
                  description={maintenanceMetrics.missingInstallationDate ? 'Preencha data de instalação' : 'Prob. não falhar'}
                />
              </div>
            </div>
          )}

          {/* Tabs - estrutura melhorada */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="h-10 p-1 bg-muted/50">
              <TabsTrigger value="overview" className="data-[state=active]:bg-background">
                Visão Geral
              </TabsTrigger>
              {hasIoTMonitoring && (
                <>
                  <TabsTrigger value="monitoring" className="data-[state=active]:bg-background">
                    <Wifi className="h-4 w-4 mr-1.5" />
                    Monitoramento
                  </TabsTrigger>
                  <TabsTrigger value="telemetry" className="data-[state=active]:bg-background">
                    <Activity className="h-4 w-4 mr-1.5" />
                    Telemetria
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="maintenance" className="data-[state=active]:bg-background">
                <Wrench className="h-4 w-4 mr-1.5" />
                Manutenção
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-background">
                <History className="h-4 w-4 mr-1.5" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:bg-background">
                <Bell className="h-4 w-4 mr-1.5" />
                Alertas
                {(maintenanceAlerts.length > 0 || assetAlerts.length > 0) && (
                  <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 min-w-5">
                    {maintenanceAlerts.length + assetAlerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:bg-background">
                <FileText className="h-4 w-4 mr-1.5" />
                Documentos
              </TabsTrigger>
            </TabsList>

            {/* ================================================================ */}
            {/* Aba Visão Geral - Layout otimizado */}
            {/* ================================================================ */}
            <TabsContent value="overview" className="space-y-5 mt-0">
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Informações do Equipamento */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Settings className="w-4 h-4 text-primary" />
                      </div>
                      Informações do Equipamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tag</p>
                        <p className="text-sm font-semibold">{asset.tag}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            (asset.status === 'OK' || asset.status === 'ACTIVE' || asset.status === 'OPERATIONAL') && "bg-emerald-500",
                            (asset.status === 'MAINTENANCE' || asset.status === 'Maintenance') && "bg-amber-500",
                            (asset.status === 'STOPPED' || asset.status === 'Stopped' || asset.status === 'INACTIVE') && "bg-red-500",
                            (asset.status === 'ALERT' || asset.status === 'Alert' || asset.status === 'WARNING') && "bg-orange-500",
                          )} />
                          <span className="text-sm font-medium">
                            {asset.status === 'OK' || asset.status === 'ACTIVE' || asset.status === 'OPERATIONAL' ? 'Operacional' :
                             asset.status === 'MAINTENANCE' || asset.status === 'Maintenance' ? 'Em Manutenção' :
                             asset.status === 'STOPPED' || asset.status === 'Stopped' ? 'Parado' :
                             asset.status === 'INACTIVE' ? 'Inativo' :
                             asset.status === 'ALERT' || asset.status === 'Alert' ? 'Alerta' :
                             asset.status === 'WARNING' ? 'Atenção' : asset.status}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                        <p className="text-sm font-medium">{asset.asset_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Criticidade</p>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            asset.criticality === 'CRITICA' && "bg-red-500",
                            asset.criticality === 'ALTA' && "bg-orange-500",
                            asset.criticality === 'MEDIA' && "bg-emerald-500",
                            asset.criticality === 'BAIXA' && "bg-blue-500",
                          )} />
                          <span className="text-sm font-medium">
                            {asset.criticality === 'CRITICA' ? 'Crítica' : 
                             asset.criticality === 'ALTA' ? 'Alta' : 
                             asset.criticality === 'MEDIA' ? 'Média' : 
                             asset.criticality === 'BAIXA' ? 'Baixa' : '-'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Fabricante</p>
                        <p className="text-sm font-medium">{asset.manufacturer || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Modelo</p>
                        <p className="text-sm font-medium">{asset.model || '-'}</p>
                      </div>
                      {asset.serial_number && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Nº de Série</p>
                          <p className="text-sm font-medium">{asset.serial_number}</p>
                        </div>
                      )}
                      {asset.patrimony_number && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Patrimônio</p>
                          <p className="text-sm font-medium">{asset.patrimony_number}</p>
                        </div>
                      )}
                      {asset.installation_date && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Data de Instalação</p>
                          <p className="text-sm font-medium">
                            {new Date(asset.installation_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                      {asset.warranty_expiry && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Fim da Garantia</p>
                          <p className="text-sm font-medium">
                            {new Date(asset.warranty_expiry).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Especificações Técnicas */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      Especificações Técnicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {/* Capacidade */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Capacidade</p>
                        <p className="text-sm font-semibold">
                          {asset.capacity 
                            ? `${Number(asset.capacity).toLocaleString('pt-BR')} ${asset.capacity_unit || 'BTU'}`
                            : asset.specifications?.capacity 
                              ? `${Number(asset.specifications.capacity).toLocaleString('pt-BR')} ${asset.specifications.capacity_unit || 'BTU'}`
                              : '-'}
                        </p>
                      </div>
                      {/* Refrigerante */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Fluido Refrigerante</p>
                        <p className="text-sm font-medium">
                          {asset.refrigerant || asset.specifications?.refrigerant || '-'}
                        </p>
                      </div>
                      {/* Tensão */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tensão Nominal</p>
                        <p className="text-sm font-medium">
                          {asset.nominal_voltage 
                            ? `${Number(asset.nominal_voltage).toLocaleString('pt-BR')} V`
                            : asset.specifications?.voltage
                              ? `${Number(asset.specifications.voltage).toLocaleString('pt-BR')} V`
                              : '-'}
                        </p>
                      </div>
                      {/* Fases */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Fases</p>
                        <p className="text-sm font-medium">
                          {asset.phases === 1 ? 'Monofásico' :
                           asset.phases === 2 ? 'Bifásico' :
                           asset.phases === 3 ? 'Trifásico' : '-'}
                        </p>
                      </div>
                      {/* Corrente */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Corrente Nominal</p>
                        <p className="text-sm font-medium">
                          {asset.nominal_current 
                            ? `${Number(asset.nominal_current).toLocaleString('pt-BR')} A`
                            : '-'}
                        </p>
                      </div>
                      {/* Fator de Potência */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Fator de Potência</p>
                        <p className="text-sm font-medium">
                          {asset.power_factor 
                            ? Number(asset.power_factor).toFixed(2)
                            : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Potências - separador */}
                    {(asset.active_power_kw || asset.apparent_power_kva || asset.reactive_power_kvar) && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Potência Ativa</p>
                            <p className="text-sm font-semibold">
                              {asset.active_power_kw 
                                ? `${Number(asset.active_power_kw).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW`
                                : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Potência Aparente</p>
                            <p className="text-sm font-semibold">
                              {asset.apparent_power_kva 
                                ? `${Number(asset.apparent_power_kva).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kVA`
                                : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Potência Reativa</p>
                            <p className="text-sm font-semibold">
                              {asset.reactive_power_kvar 
                                ? `${Number(asset.reactive_power_kvar).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kVAr`
                                : '-'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Localização */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {/* Site */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Site</p>
                      <p className="text-sm font-medium">{asset.site_name || '-'}</p>
                    </div>
                    {/* Empresa (via setor/hierarquia) */}
                    {(asset.company_name || asset.site_company) && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Empresa</p>
                        <p className="text-sm font-medium">{asset.company_name || asset.site_company}</p>
                      </div>
                    )}
                    {/* Setor */}
                    {asset.sector_name && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Setor</p>
                        <p className="text-sm font-medium">{asset.sector_name}</p>
                      </div>
                    )}
                    {/* Subseção */}
                    {asset.subsection_name && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Subsetor</p>
                        <p className="text-sm font-medium">{asset.subsection_name}</p>
                      </div>
                    )}
                    {/* Localização Específica */}
                    {asset.location_description && (
                      <div className="sm:col-span-2 lg:col-span-1">
                        <p className="text-xs text-muted-foreground mb-1">Localização Específica</p>
                        <p className="text-sm font-medium">{asset.location_description}</p>
                      </div>
                    )}
                    {/* Localização Completa */}
                    {asset.full_location && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="text-xs text-muted-foreground mb-1">Localização Completa</p>
                        <p className="text-sm text-muted-foreground">{asset.full_location}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Banner de Monitoramento IoT */}
              {hasIoTMonitoring && (
                <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                          <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                            Monitoramento IoT Ativo
                          </h3>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400">
                            {sensors.length} sensor{sensors.length !== 1 ? 'es' : ''} conectado{sensors.length !== 1 ? 's' : ''} • 
                            Última atualização há poucos segundos
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                        onClick={() => {
                          const tab = document.querySelector('[data-state="inactive"][value="monitoring"]') as HTMLElement;
                          tab?.click();
                        }}
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
            {/* Aba Monitoramento - Cards de sensores melhorados */}
            {/* ================================================================ */}
            {hasIoTMonitoring && (
              <TabsContent value="monitoring" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <Antenna className="w-4 h-4 text-primary" />
                        </div>
                        Monitoramento em Tempo Real
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Atualização automática
                        </div>
                        <Button variant="ghost" size="sm" className="h-8">
                          <RefreshCw className="h-4 w-4 mr-1.5" />
                          Atualizar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sensors.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 rounded-full bg-muted mb-4">
                          <Antenna className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-1">Nenhum sensor vinculado</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Este ativo não possui sensores IoT configurados. Entre em contato com o suporte para configurar o monitoramento.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {sensors.map(sensor => {
                          const isOnline = sensor.is_online;
                          const statusStyle = isOnline ? statusConfig.online : statusConfig.offline;
                          
                          return (
                            <Card 
                              key={sensor.id} 
                              className={cn(
                                "relative overflow-hidden transition-all hover:shadow-md",
                                isOnline ? "border-emerald-200 dark:border-emerald-800" : "border-slate-200 dark:border-slate-700"
                              )}
                            >
                              {/* Indicador de status lateral */}
                              <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1",
                                statusStyle.dot
                              )} />
                              
                              <CardContent className="p-4 pl-5">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm truncate" title={sensor.tag}>
                                      {sensor.tag}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {sensor.metric_type}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "shrink-0 ml-2",
                                      isOnline 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
                                        : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700"
                                    )}
                                  >
                                    {isOnline ? (
                                      <><Wifi className="h-3 w-3 mr-1" /> Online</>
                                    ) : (
                                      <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                                    )}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-baseline gap-1.5">
                                  <span className={cn(
                                    "text-3xl font-bold tabular-nums",
                                    isOnline ? "text-foreground" : "text-muted-foreground"
                                  )}>
                                    {sensor.last_value?.toFixed(1) ?? '--'}
                                  </span>
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {sensor.unit}
                                  </span>
                                </div>
                                
                                {sensor.last_reading_at && (
                                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Última leitura: {new Date(sensor.last_reading_at).toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* ================================================================ */}
            {/* Aba Telemetria - Layout otimizado */}
            {/* ================================================================ */}
            {hasIoTMonitoring && (
              <TabsContent value="telemetry" className="space-y-4 mt-0">
                {/* Controles de período e métricas */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Período de Visualização */}
                  <Card className="sm:w-auto">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                          Período:
                        </span>
                        <div className="flex gap-1">
                          {(['24h', '7d', '30d'] as const).map(period => (
                            <Button
                              key={period}
                              variant={telemetryPeriod === period ? 'default' : 'ghost'}
                              size="sm"
                              className="h-8"
                              onClick={() => setTelemetryPeriod(period)}
                            >
                              {period === '24h' ? '24h' : period === '7d' ? '7 dias' : '30 dias'}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Seleção de Métricas */}
                  <Card className="flex-1">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                          Métricas:
                        </span>
                        {availableMetrics.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhum sensor disponível</p>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {availableMetrics.map(metric => (
                              <label
                                key={metric.id}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors border",
                                  selectedMetrics.includes(metric.id)
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : "bg-muted/30 border-transparent hover:bg-muted/50"
                                )}
                              >
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
                                  className="h-4 w-4"
                                />
                                <span className="text-sm font-medium">
                                  {metric.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({metric.unit})
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráfico de Séries Temporais */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <Activity className="w-4 h-4 text-primary" />
                        </div>
                        Séries Temporais
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-normal">
                          {selectedMetrics.length} métrica{selectedMetrics.length !== 1 ? 's' : ''} selecionada{selectedMetrics.length !== 1 ? 's' : ''}
                        </Badge>
                        {telemetryData && (
                          <Button variant="ghost" size="sm" className="h-8">
                            <RefreshCw className="h-4 w-4 mr-1.5" />
                            Atualizar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedMetrics.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 rounded-full bg-muted mb-4">
                          <Thermometer className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-1">Selecione métricas para visualizar</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Escolha uma ou mais métricas acima para visualizar os dados históricos no gráfico.
                        </p>
                      </div>
                    ) : isLoadingTelemetry ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">Carregando dados de telemetria...</p>
                      </div>
                    ) : telemetryData ? (
                      <div className="h-[400px]">
                        <MultiSeriesTelemetryChart data={telemetryData} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                          <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="font-semibold mb-1">Sem dados disponíveis</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Não há dados de telemetria para o período selecionado. Tente selecionar um período maior.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Info footer */}
                <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    {telemetryData?.length || 0} série(s) de dados carregadas
                  </div>
                  <span>
                    Período: últimos {telemetryPeriod === '24h' ? '24 horas' : telemetryPeriod === '7d' ? '7 dias' : '30 dias'}
                  </span>
                </div>
              </TabsContent>
            )}

            {/* ================================================================ */}
            {/* Aba Manutenção - Ordens de Serviço melhoradas */}
            {/* ================================================================ */}
            <TabsContent value="maintenance" className="space-y-5 mt-0">
              {/* Resumo de Manutenções - Design limpo e profissional */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Preventivas */}
                <Card className="relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Preventivas</p>
                        <p className="text-2xl font-bold tabular-nums">
                          {completedWorkOrders.filter((wo: any) => wo.type === 'PREVENTIVE').length}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-blue-500/10">
                        <CheckCircle2 className="h-5 w-5 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Corretivas */}
                <Card className="relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Corretivas</p>
                        <p className="text-2xl font-bold tabular-nums">
                          {completedWorkOrders.filter((wo: any) => wo.type === 'CORRECTIVE').length}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-500/10">
                        <Wrench className="h-5 w-5 text-amber-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Emergenciais */}
                <Card className="relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Emergenciais</p>
                        <p className="text-2xl font-bold tabular-nums">
                          {completedWorkOrders.filter((wo: any) => wo.type === 'EMERGENCY').length}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-red-500/10">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Custo Total */}
                <Card className="relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Custo Total</p>
                        <p className="text-2xl font-bold tabular-nums">
                          R$ {totalMaintenanceCosts.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-500/10">
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ordens de Serviço Ativas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Wrench className="w-4 h-4 text-primary" />
                    </div>
                    Ordens de Serviço em Andamento
                    {workOrders.filter((wo: any) => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED').length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {workOrders.filter((wo: any) => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED').length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingWorkOrders ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-5 w-16" />
                              </div>
                              <Skeleton className="h-4 w-full max-w-md" />
                              <div className="flex gap-4">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-28" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : workOrders.filter((wo: any) => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED').length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-4 rounded-full bg-muted mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h3 className="font-semibold mb-1">Nenhuma OS pendente</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Todas as ordens de serviço deste ativo foram concluídas ou não há registros.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workOrders.filter((wo: any) => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED').map((wo: any) => {
                        const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
                          'OPEN': { 
                            label: 'Aberta', 
                            className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
                            icon: <FileText className="w-3 h-3" /> 
                          },
                          'IN_PROGRESS': { 
                            label: 'Em Execução', 
                            className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
                            icon: <Play className="w-3 h-3" /> 
                          },
                          'COMPLETED': { 
                            label: 'Concluída', 
                            className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
                            icon: <CheckCircle2 className="w-3 h-3" /> 
                          },
                          'CANCELLED': { 
                            label: 'Cancelada', 
                            className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700',
                            icon: <XCircle className="w-3 h-3" /> 
                          },
                        };
                        const priorityConfig: Record<string, { label: string; className: string }> = {
                          'CRITICAL': { label: 'Crítica', className: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
                          'HIGH': { label: 'Alta', className: 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400' },
                          'MEDIUM': { label: 'Média', className: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
                          'LOW': { label: 'Baixa', className: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
                        };
                        const typeConfig: Record<string, { label: string; className: string }> = {
                          'CORRECTIVE': { label: 'Corretiva', className: 'text-red-600' },
                          'PREVENTIVE': { label: 'Preventiva', className: 'text-blue-600' },
                          'PREDICTIVE': { label: 'Preditiva', className: 'text-purple-600' },
                          'REQUEST': { label: 'Solicitação', className: 'text-violet-600' },
                        };

                        const status = statusConfig[wo.status] || statusConfig['OPEN'];
                        const priority = priorityConfig[wo.priority] || priorityConfig['MEDIUM'];
                        const type = typeConfig[wo.type] || typeConfig['CORRECTIVE'];

                        // Determinar cor da barra lateral baseada no status
                        const statusBarColor = wo.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-blue-500';

                        return (
                          <div 
                            key={wo.id} 
                            onClick={() => {
                              setSelectedWorkOrder(wo);
                              setIsViewModalOpen(true);
                            }}
                            className="block cursor-pointer"
                          >
                            <Card className="relative overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all group cursor-pointer">
                              <div className={cn("absolute left-0 top-0 bottom-0 w-1", statusBarColor)} />
                              <CardContent className="p-4 pl-5">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    {/* Header com número e badges */}
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                                        OS #{wo.order_number || wo.id}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <span className={cn(
                                          "w-2 h-2 rounded-full",
                                          wo.status === 'OPEN' && "bg-blue-500",
                                          wo.status === 'IN_PROGRESS' && "bg-amber-500"
                                        )} />
                                        <span className="text-sm font-medium">
                                          {status.label}
                                        </span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <span className={cn("text-xs font-medium", type.className)}>
                                        {type.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <span className={cn(
                                        "text-xs font-medium",
                                        wo.priority === 'CRITICAL' && "text-red-600",
                                        wo.priority === 'HIGH' && "text-orange-600",
                                        wo.priority === 'MEDIUM' && "text-amber-600",
                                        wo.priority === 'LOW' && "text-emerald-600"
                                      )}>
                                        Prioridade {priority.label}
                                      </span>
                                    </div>
                                    
                                    {/* Descrição */}
                                    {wo.description && (
                                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                        {wo.description}
                                      </p>
                                    )}
                                    
                                    {/* Metadados */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                      {wo.scheduled_date && (
                                        <span className="flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5" />
                                          Agendada: {new Date(wo.scheduled_date).toLocaleDateString('pt-BR')}
                                        </span>
                                      )}
                                      {wo.assigned_technician_name && (
                                        <span className="flex items-center gap-1.5">
                                          <User className="w-3.5 h-3.5" />
                                          {wo.assigned_technician_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ================================================================ */}
            {/* Aba Histórico de Manutenção - Dados reais do backend */}
            {/* ================================================================ */}
            <TabsContent value="history" className="space-y-4 mt-0">
              {isLoadingWorkOrders ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardHeader className="pb-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-6 w-32" />
                          <div className="flex gap-2">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-20" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : completedWorkOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="p-4 rounded-full bg-muted mb-4">
                        <History className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">Nenhum histórico encontrado</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Este equipamento ainda não possui registros de manutenção concluídos.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {completedWorkOrders.map((wo: any) => {
                    const typeConfig: Record<string, { label: string; className: string }> = {
                      'CORRECTIVE': { label: 'Corretiva', className: 'text-orange-600' },
                      'PREVENTIVE': { label: 'Preventiva', className: 'text-blue-600' },
                      'PREDICTIVE': { label: 'Preditiva', className: 'text-purple-600' },
                      'REQUEST': { label: 'Solicitação', className: 'text-violet-600' },
                      'EMERGENCY': { label: 'Emergencial', className: 'text-red-600' },
                    };
                    const type = typeConfig[wo.type] || typeConfig['CORRECTIVE'];
                    const completionDate = wo.completed_at || wo.updated_at;
                    const items = wo.items || [];

                    // Cor da barra lateral baseada no status
                    const statusBarColor = wo.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-400';

                    return (
                      <div 
                        key={wo.id}
                        onClick={() => {
                          setSelectedWorkOrder(wo);
                          setIsViewModalOpen(true);
                        }}
                        className="cursor-pointer"
                      >
                        <Card className="relative overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all group">
                          <div className={cn("absolute left-0 top-0 bottom-0 w-1", statusBarColor)} />
                          <CardContent className="p-4 pl-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {/* Header com número e badges */}
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="font-semibold text-foreground">
                                    OS #{wo.order_number || wo.number || wo.id}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                      "w-2 h-2 rounded-full",
                                      wo.status === 'COMPLETED' && "bg-emerald-500",
                                      wo.status === 'CANCELLED' && "bg-slate-400"
                                    )} />
                                    <span className="text-sm font-medium">
                                      {wo.status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className={cn("text-xs font-medium", type.className)}>
                                    {type.label}
                                  </span>
                                </div>
                                
                                {/* Descrição */}
                                {wo.description && (
                                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                    {wo.description}
                                  </p>
                                )}
                                
                                {/* Metadados */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  {completionDate && (
                                    <span className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5" />
                                      {new Date(completionDate).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                  {wo.actual_hours && (
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5" />
                                      {wo.actual_hours}h
                                    </span>
                                  )}
                                  {(wo.assigned_technician_name || wo.assigned_to_name) && (
                                    <span className="flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5" />
                                      {wo.assigned_technician_name || wo.assigned_to_name}
                                    </span>
                                  )}
                                  {items.length > 0 && (
                                    <span className="flex items-center gap-1.5">
                                      <Wrench className="w-3.5 h-3.5" />
                                      {items.length} {items.length === 1 ? 'material' : 'materiais'}
                                    </span>
                                  )}
                                </div>

                                {/* Relatório de execução resumido */}
                                {wo.execution_description && (
                                  <div className="mt-3 p-2 rounded bg-muted/50 text-xs text-muted-foreground line-clamp-1">
                                    <span className="font-medium text-foreground">Execução:</span> {wo.execution_description}
                                  </div>
                                )}
                              </div>
                              
                              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ================================================================ */}
            {/* Aba Alertas - Layout consistente */}
            {/* ================================================================ */}
            <TabsContent value="alerts" className="space-y-5 mt-0">
              {/* Alertas de Manutenção */}
              {maintenanceAlerts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/50">
                        <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      Alertas de Manutenção
                      <Badge variant="destructive" className="ml-2">
                        {maintenanceAlerts.filter(a => !a.isAcknowledged).length} pendente{maintenanceAlerts.filter(a => !a.isAcknowledged).length !== 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {maintenanceAlerts.map(alert => (
                      <Alert 
                        key={alert.id}
                        className={cn(
                          "transition-all",
                          alert.isAcknowledged && "opacity-60",
                          getPriorityBg(alert.priority)
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn("mt-0.5", getPriorityColor(alert.priority))}>
                              {getPriorityIcon(alert.priority)}
                            </div>
                            <div className="space-y-1">
                              <AlertDescription className="font-medium text-foreground">
                                {alert.message}
                              </AlertDescription>
                              <p className="text-xs text-muted-foreground">
                                Vencimento: {new Date(alert.dueDate).toLocaleDateString('pt-BR')}
                                {alert.daysOverdue && (
                                  <span className="text-red-600 dark:text-red-400 font-medium ml-1">
                                    ({alert.daysOverdue} dias em atraso)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {!alert.isAcknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                              Reconhecer
                            </Button>
                          )}
                        </div>
                      </Alert>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Histórico de Alertas IoT */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <AlertTriangle className="w-4 h-4 text-primary" />
                    </div>
                    Histórico de Alertas IoT
                    {assetAlerts.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {assetAlerts.length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {assetAlerts.length === 0 && maintenanceAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="font-semibold mb-1">Tudo certo!</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Não há alertas ativos ou pendentes para este ativo.
                      </p>
                    </div>
                  ) : assetAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-4 rounded-full bg-muted mb-4">
                        <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold mb-1">Sem alertas IoT</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Nenhum alerta IoT foi registrado para este ativo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assetAlerts.map(alert => {
                        const severityConfig = {
                          Critical: { 
                            bg: 'bg-red-50 dark:bg-red-950/30', 
                            border: 'border-red-200 dark:border-red-800',
                            badge: 'destructive' as const
                          },
                          High: { 
                            bg: 'bg-orange-50 dark:bg-orange-950/30', 
                            border: 'border-orange-200 dark:border-orange-800',
                            badge: 'default' as const
                          },
                          Medium: { 
                            bg: 'bg-amber-50 dark:bg-amber-950/30', 
                            border: 'border-amber-200 dark:border-amber-800',
                            badge: 'secondary' as const
                          },
                          Low: { 
                            bg: 'bg-blue-50 dark:bg-blue-950/30', 
                            border: 'border-blue-200 dark:border-blue-800',
                            badge: 'outline' as const
                          },
                        };
                        const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.Medium;

                        return (
                          <div 
                            key={alert.id} 
                            className={cn(
                              "p-4 rounded-lg border transition-colors",
                              config.bg,
                              config.border
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <Badge variant={config.badge}>
                                    {alert.severity}
                                  </Badge>
                                  <span className="text-sm font-medium">{alert.parameter_key}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{alert.message}</p>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                {new Date(alert.triggered_at).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
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
            {/* Aba Documentos - Layout consistente */}
            {/* ================================================================ */}
            <TabsContent value="documents" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      Documentos Técnicos
                    </CardTitle>
                    <Button size="sm" variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-full bg-muted mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">Nenhum documento cadastrado</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">
                      Adicione manuais, fichas técnicas e outros documentos relacionados a este ativo.
                    </p>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Adicionar primeiro documento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal de Criação de OS */}
      <WorkOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialValues={{
          equipmentId: asset?.id ? String(asset.id) : undefined,
          companyId: asset?.company_id ? String(asset.company_id) : undefined,
          sectorId: (asset?.sector_id || asset?.sector) ? String(asset.sector_id || asset.sector) : undefined,
          subsectionId: (asset?.subsection_id || asset?.subsection) ? String(asset.subsection_id || asset.subsection) : undefined,
        }}
        onSave={(newWorkOrder) => {
          console.log('OS criada:', newWorkOrder);
          setIsCreateModalOpen(false);
          // Recarregar work orders
          window.location.reload();
        }}
      />

      {/* Modal de Visualização de OS */}
      <WorkOrderViewModal
        workOrder={selectedWorkOrder}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedWorkOrder(null);
        }}
      />

      {/* Modal de Edição de Ativo */}
      <EquipmentEditModal
        equipment={equipment || null}
        open={isEditAssetModalOpen}
        onOpenChange={setIsEditAssetModalOpen}
      />
    </div>
  );
}
