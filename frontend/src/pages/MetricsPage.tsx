/**
 * Página de Métricas - Versão Melhorada
 * 
 * Dashboard de métricas e KPIs de manutenção com visualizações
 * interativas usando ECharts e dados da API existente.
 */

import { useState } from 'react';
import { 
  Clock, 
  Target, 
  Activity, 
  AlertTriangle,
  Wrench,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Settings2,
  RefreshCw,
  Download,
  ChevronRight,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/PageHeader';
import { KPICard as LegacyKPICard } from '@/components/KPICard';
import { MetricsToolbar } from '@/components/metrics/MetricsToolbar';
import { useMetrics } from '@/hooks/useMetrics';
import { KPIGrid, KPICard, KPICardSkeleton } from '@/components/metrics/KPICard';
import { 
  LineChart, 
  MultiLineChart, 
  PieChart, 
  BarChart, 
  GaugeChart,
  HeatmapChart,
  RadarChart,
  chartColors,
} from '@/components/charts';
import {
  useKPIs,
  useTrend,
  useWorkOrderDistribution,
  useEquipmentHealth,
  useMLPredictions,
  useAnomalies,
  useTeamPerformance,
  useCostMetrics,
  useSLAMetrics,
  useHeatmapData,
} from '@/hooks/useMetricsQuery';
import type { MetricFilter, EquipmentHealth } from '@/types/metrics';
import type { MetricsRange } from '@/models/metrics';

// ============================================
// Constants
// ============================================

const kpiIcons: Record<string, typeof Clock> = {
  mttr: Clock,
  mtbf: Target,
  availability: Activity,
  oee: Settings2,
  compliance: AlertTriangle,
  backlog: Wrench,
  preventive_ratio: TrendingUp,
  cost_per_asset: DollarSign,
};

const periodOptions = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '180d', label: 'Últimos 6 meses' },
  { value: '365d', label: 'Último ano' },
];

// ============================================
// Helpers
// ============================================

function getHealthColor(score: number): string {
  if (score >= 80) return chartColors.success;
  if (score >= 60) return chartColors.warning;
  return chartColors.danger;
}

function getHealthLabel(score: number): string {
  if (score >= 80) return 'Bom';
  if (score >= 60) return 'Atenção';
  return 'Crítico';
}

// ============================================
// Sub-Components
// ============================================

function MetricsHeader({ 
  filter, 
  onFilterChange,
  onRefresh,
  onExportCSV,
  onExportPDF,
  isLoading,
}: {
  filter: MetricFilter;
  onFilterChange: (filter: MetricFilter) => void;
  onRefresh: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dashboard de indicadores de performance de manutenção
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Filtro de Período */}
        <Select 
          value={filter.period} 
          onValueChange={(value) => onFilterChange({ ...filter, period: value })}
        >
          <SelectTrigger className="w-44">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Botões de Ação */}
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        
        <Button variant="outline" size="sm" onClick={onExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
        
        <Button variant="outline" size="sm" onClick={onExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Overview Tab (Legacy + New)
// ============================================

function OverviewTab({ 
  filter,
  legacyMetrics,
  legacyLoading,
}: { 
  filter: MetricFilter;
  legacyMetrics: ReturnType<typeof useMetrics>['metrics'];
  legacyLoading: boolean;
}) {
  const { data: kpis, isLoading: kpisLoading } = useKPIs(filter);
  const { data: distribution, isLoading: distLoading } = useWorkOrderDistribution(filter);
  const { data: mttrTrend } = useTrend(filter, 'mttr');
  const { data: slaMetrics, isLoading: slaLoading } = useSLAMetrics(filter);
  
  // Usar dados da API legada se disponíveis
  const showLegacyKPIs = legacyMetrics && !legacyLoading;
  
  return (
    <div className="space-y-6">
      {/* KPIs Grid - Legacy */}
      {showLegacyKPIs ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <LegacyKPICard
            title="MTTR Médio"
            value={`${legacyMetrics.kpis.mttr_hours}h`}
            icon={<Clock className="h-4 w-4" />}
            variant={legacyMetrics.kpis.mttr_hours > 48 ? 'warning' : 'success'}
          />
          
          <LegacyKPICard
            title="Backlog"
            value={`${legacyMetrics.kpis.backlog_percent}%`}
            icon={<AlertTriangle className="h-4 w-4" />}
            variant={
              legacyMetrics.kpis.backlog_percent > 30 ? 'danger' : 
              legacyMetrics.kpis.backlog_percent > 15 ? 'warning' : 'success'
            }
          />
          
          <LegacyKPICard
            title="Top Ativo (OS)"
            value={legacyMetrics.kpis.top_asset_by_os?.count.toString() || '0'}
            icon={<Target className="h-4 w-4" />}
            variant="default"
          />
          
          <LegacyKPICard
            title="Preventivas no Prazo"
            value={`${legacyMetrics.kpis.preventive_on_time_percent}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            variant={
              legacyMetrics.kpis.preventive_on_time_percent >= 90 ? 'success' :
              legacyMetrics.kpis.preventive_on_time_percent >= 75 ? 'warning' : 'danger'
            }
          />
        </div>
      ) : kpis?.kpis && kpis.kpis.length > 0 ? (
        <KPIGrid 
          metrics={kpis.kpis} 
          icons={kpiIcons} 
          isLoading={kpisLoading} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      )}
      
      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência MTTR */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendência MTTR</CardTitle>
            <CardDescription>Tempo médio de reparo nos últimos períodos</CardDescription>
          </CardHeader>
          <CardContent>
            {mttrTrend ? (
              <LineChart 
                data={mttrTrend.data} 
                unit="h" 
                color={chartColors.primary}
                height={250}
              />
            ) : (
              <Skeleton className="h-[250px] w-full" />
            )}
          </CardContent>
        </Card>
        
        {/* Distribuição de OS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de Ordens de Serviço</CardTitle>
            <CardDescription>Por tipo de manutenção</CardDescription>
          </CardHeader>
          <CardContent>
            {!distLoading && distribution?.by_type ? (
              <PieChart 
                data={distribution.by_type} 
                height={250}
                donut
              />
            ) : (
              <Skeleton className="h-[250px] w-full" />
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* SLA Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cumprimento de SLA</CardTitle>
          <CardDescription>Performance em relação aos acordos de nível de serviço</CardDescription>
        </CardHeader>
        <CardContent>
          {!slaLoading && slaMetrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <GaugeChart 
                  value={slaMetrics.response_time_compliance} 
                  title="Tempo de Resposta"
                  height={150}
                />
              </div>
              <div className="text-center">
                <GaugeChart 
                  value={slaMetrics.resolution_time_compliance} 
                  title="Tempo de Resolução"
                  height={150}
                />
              </div>
              <div className="text-center">
                <GaugeChart 
                  value={slaMetrics.first_fix_rate} 
                  title="First Fix Rate"
                  height={150}
                />
              </div>
              <div className="text-center">
                <GaugeChart 
                  value={slaMetrics.customer_satisfaction} 
                  title="Satisfação"
                  height={150}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-[150px] w-full" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Equipment Tab
// ============================================

function EquipmentTab({ filter }: { filter: MetricFilter }) {
  const { data: healthData, isLoading } = useEquipmentHealth(filter);
  const { data: heatmapData } = useHeatmapData(filter);
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Equipment Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthData?.map((equipment: EquipmentHealth) => (
          <Card key={equipment.equipment_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{equipment.equipment_name}</h4>
                  <p className="text-xs text-muted-foreground">Tag: {equipment.equipment_tag}</p>
                </div>
                <Badge 
                  variant="outline"
                  className={`${
                    equipment.health_score >= 80 
                      ? 'border-green-500 text-green-700 bg-green-50' 
                      : equipment.health_score >= 60 
                        ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                        : 'border-red-500 text-red-700 bg-red-50'
                  }`}
                >
                  {getHealthLabel(equipment.health_score)}
                </Badge>
              </div>
              
              {/* Health Score Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Health Score</span>
                  <span className="font-semibold">{equipment.health_score}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${equipment.health_score}%`,
                      backgroundColor: getHealthColor(equipment.health_score),
                    }}
                  />
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">MTTR</p>
                  <p className="font-semibold text-sm">{equipment.mttr.toFixed(1)}h</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">MTBF</p>
                  <p className="font-semibold text-sm">{equipment.mtbf.toFixed(0)}h</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Falhas</p>
                  <p className="font-semibold text-sm">{equipment.total_failures}</p>
                </div>
              </div>
              
              {/* Last Maintenance */}
              <p className="text-xs text-muted-foreground mt-3">
                Última manutenção: {equipment.last_maintenance ? new Date(equipment.last_maintenance + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Heatmap */}
      {heatmapData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mapa de Calor - Ocorrências por Equipamento/Dia</CardTitle>
            <CardDescription>Visualização de frequência de manutenções</CardDescription>
          </CardHeader>
          <CardContent>
            <HeatmapChart data={heatmapData} height={350} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Predictive Tab
// ============================================

function PredictiveTab({ filter }: { filter: MetricFilter }) {
  const { data: predictions, isLoading: predLoading } = useMLPredictions(filter);
  const { data: anomalies, isLoading: anomLoading } = useAnomalies(filter);
  
  return (
    <div className="space-y-6">
      {/* Predictions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            Previsões de Manutenção (ML)
          </CardTitle>
          <CardDescription>
            Equipamentos com maior probabilidade de falha nos próximos dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {predLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {predictions?.map((pred) => (
                <div 
                  key={pred.id} 
                  className={`p-4 rounded-lg border ${
                    pred.risk_level === 'high' 
                      ? 'bg-red-50 border-red-200' 
                      : pred.risk_level === 'medium' 
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{pred.equipment_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Falha prevista em {pred.days_until_failure} dias • {pred.failure_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: getHealthColor(100 - pred.failure_probability * 100) }}>
                        {(pred.failure_probability * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">probabilidade</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={pred.risk_level === 'high' ? 'destructive' : pred.risk_level === 'medium' ? 'secondary' : 'outline'}>
                      {pred.risk_level === 'high' ? 'Alto Risco' : pred.risk_level === 'medium' ? 'Médio Risco' : 'Baixo Risco'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Confiança: {(pred.confidence * 100).toFixed(0)}%
                    </span>
                    <Button variant="link" size="sm" className="ml-auto p-0 h-auto text-teal-600">
                      Agendar Preventiva <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Anomalies */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Anomalias Detectadas
          </CardTitle>
          <CardDescription>
            Padrões incomuns identificados pelo sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anomLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : anomalies && anomalies.length > 0 ? (
            <div className="space-y-3">
              {anomalies.map((anomaly) => (
                <div 
                  key={anomaly.id} 
                  className="p-4 rounded-lg border bg-orange-50 border-orange-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{anomaly.equipment_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Métrica: {anomaly.metric} • Desvio: {anomaly.deviation.toFixed(1)}σ
                      </p>
                    </div>
                    <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}>
                      {anomaly.severity === 'high' ? 'Alta' : anomaly.severity === 'medium' ? 'Média' : 'Baixa'} Severidade
                    </Badge>
                  </div>
                  <p className="text-sm mt-2">{anomaly.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Detectado em: {new Date(anomaly.detected_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma anomalia detectada no período</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Team Tab
// ============================================

function TeamTab({ filter }: { filter: MetricFilter }) {
  const { data: teamData, isLoading } = useTeamPerformance(filter);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Radar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            Performance Comparativa da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamData && teamData.length > 0 && (
            <RadarChart
              indicators={[
                { name: 'OS Completadas', max: Math.max(...teamData.map(t => t.work_orders_completed)) * 1.2 },
                { name: 'Eficiência (%)', max: 100 },
                { name: 'Satisfação (%)', max: 100 },
                { name: 'Tempo Médio (h)', max: Math.max(...teamData.map(t => t.avg_completion_time)) * 1.5 },
              ]}
              data={teamData.slice(0, 3).map((member, i) => ({
                name: member.name,
                values: [
                  member.work_orders_completed,
                  member.efficiency,
                  member.satisfaction_score,
                  member.avg_completion_time,
                ],
                color: chartColors.palette[i],
              }))}
              height={350}
            />
          )}
        </CardContent>
      </Card>
      
      {/* Team Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teamData?.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
                  <span className="text-lg font-semibold text-teal-700">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{member.name}</h4>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">OS Completadas</p>
                      <p className="font-semibold">{member.work_orders_completed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Eficiência</p>
                      <p className="font-semibold">{member.efficiency}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo Médio</p>
                      <p className="font-semibold">{member.avg_completion_time.toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Satisfação</p>
                      <p className="font-semibold">{member.satisfaction_score}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Costs Tab
// ============================================

function CostsTab({ filter }: { filter: MetricFilter }) {
  const { data: costData, isLoading } = useCostMetrics(filter);
  
  if (isLoading || !costData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }
  
  const costByCategory = [
    { name: 'Mão de Obra', value: costData.labor_cost, color: chartColors.primary },
    { name: 'Peças', value: costData.parts_cost, color: chartColors.secondary },
    { name: 'Serviços Externos', value: costData.external_services_cost, color: chartColors.warning },
  ];
  
  return (
    <div className="space-y-6">
      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-teal-600 mb-2" />
            <p className="text-sm text-muted-foreground">Custo Total</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costData.total_cost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wrench className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-sm text-muted-foreground">Custo por Ativo</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costData.cost_per_asset)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="text-sm text-muted-foreground">Corretiva</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costData.corrective_cost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-sm text-muted-foreground">Preventiva</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costData.preventive_cost)}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de Custos</CardTitle>
            <CardDescription>Por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <PieChart data={costByCategory} height={280} donut />
          </CardContent>
        </Card>
        
        {/* Budget Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Utilização do Orçamento</CardTitle>
            <CardDescription>
              {((costData.total_cost / costData.budget) * 100).toFixed(1)}% do orçamento utilizado
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <GaugeChart 
              value={(costData.total_cost / costData.budget) * 100}
              max={100}
              unit="%"
              height={250}
              thresholds={[
                { value: 70, color: chartColors.success },
                { value: 90, color: chartColors.warning },
                { value: 100, color: chartColors.danger },
              ]}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Cost Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tendência de Custos por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {costData.trend && costData.trend.length > 0 ? (
            <MultiLineChart
              series={[
                { name: 'Mão de Obra', data: costData.trend.map(t => ({ date: t.date, value: t.labor })), color: chartColors.primary },
                { name: 'Peças', data: costData.trend.map(t => ({ date: t.date, value: t.parts })), color: chartColors.secondary },
                { name: 'Externos', data: costData.trend.map(t => ({ date: t.date, value: t.external })), color: chartColors.warning },
              ]}
              unit="R$"
              height={300}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Dados de tendência não disponíveis
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function MetricsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [filter, setFilter] = useState<MetricFilter>({
    period: '90d',
    start_date: '',
    end_date: '',
  });
  
  // Hook legado para manter compatibilidade
  const {
    metrics: legacyMetrics,
    isLoading: legacyLoading,
    isError: legacyError,
    exportCSV,
    exportPDF,
    refetch: legacyRefetch,
  } = useMetrics(filter.period as MetricsRange);
  
  // Para refresh dos novos hooks
  const { refetch: refetchKPIs, isRefetching } = useKPIs(filter);
  
  const handleRefresh = () => {
    legacyRefetch();
    refetchKPIs();
  };
  
  const handleFilterChange = (newFilter: MetricFilter) => {
    setFilter(newFilter);
  };
  
  if (legacyError) {
    return (
      <div className="container mx-auto p-6 max-w-[1600px]">
        <PageHeader 
          title="Métricas" 
          description="Indicadores de desempenho e análise de tendências"
        />
        
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar métricas. Por favor, tente novamente.
            <Button variant="link" onClick={handleRefresh} className="ml-2 p-0 h-auto">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 max-w-[1600px] metrics-content">
      {/* Header */}
      <div className="no-print">
        <MetricsHeader 
          filter={filter}
          onFilterChange={handleFilterChange}
          onRefresh={handleRefresh}
          onExportCSV={exportCSV}
          onExportPDF={exportPDF}
          isLoading={legacyLoading || isRefetching}
        />
      </div>
      
      {/* Print Header */}
      {legacyMetrics && (
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Relatório de Métricas - TrakNor CMMS</h1>
          <p className="text-muted-foreground">
            Período: {legacyMetrics.period} | 
            Gerado em: {new Date(legacyMetrics.generated_at).toLocaleString('pt-BR')}
          </p>
        </div>
      )}
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Equipamentos
          </TabsTrigger>
          <TabsTrigger value="predictive" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Preditiva
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Custos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <OverviewTab 
            filter={filter} 
            legacyMetrics={legacyMetrics}
            legacyLoading={legacyLoading}
          />
        </TabsContent>
        
        <TabsContent value="equipment">
          <EquipmentTab filter={filter} />
        </TabsContent>
        
        <TabsContent value="predictive">
          <PredictiveTab filter={filter} />
        </TabsContent>
        
        <TabsContent value="team">
          <TeamTab filter={filter} />
        </TabsContent>
        
        <TabsContent value="costs">
          <CostsTab filter={filter} />
        </TabsContent>
      </Tabs>
    </div>
  );
}