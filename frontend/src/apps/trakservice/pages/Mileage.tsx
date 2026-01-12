/**
 * TrakService Mileage Page
 * 
 * KM tracking and reporting for field service fleet.
 * Features:
 * - KM summary by period
 * - Detailed reports by technician/vehicle
 * - Cost estimation
 * - Variance analysis (GPS vs reported)
 * 
 * Design System: Platform-first, seguindo docs/design/DESIGN_SYSTEM.md
 * TrakService accent color: orange-500
 * 
 * Requires: trakservice.km feature
 */

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/shared/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTable, type Column } from '@/shared/ui/components/DataTable';
import {
  Gauge,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  Calendar as CalendarIcon,
  Download,
  AlertTriangle,
  Car,
  MapPin,
  BarChart3,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Hooks
import { useKmReport } from '../hooks/useRoutingQuery';
import { useActiveTechnicians } from '../hooks/useDispatchQuery';

// Types and utilities
import type { KmSummary, KmReport, KmFilters } from '../types';
import { formatKm, calculateKmDifferenceClass } from '../services/routingService';

// =============================================================================
// Sub-components
// =============================================================================

interface QuickStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  isLoading?: boolean;
  trend?: {
    value: number;
    label: string;
  };
}

function QuickStatCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'text-muted-foreground',
  isLoading = false,
  trend,
}: QuickStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', color)} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{description}</p>
              {trend && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    trend.value >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.value >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(trend.value).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface KmVarianceBadgeProps {
  reported: number;
  tracked: number;
}

function KmVarianceBadge({ reported, tracked }: KmVarianceBadgeProps) {
  const difference = reported - tracked;
  const percentDiff = tracked > 0 ? (difference / tracked) * 100 : 0;
  const colorClass = calculateKmDifferenceClass(percentDiff);

  // Warning levels
  const isWarning = Math.abs(percentDiff) > 10;
  const isCritical = Math.abs(percentDiff) > 20;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'font-medium border-transparent',
              colorClass.bg,
              colorClass.text,
              isCritical && 'animate-pulse'
            )}
          >
            {difference >= 0 ? '+' : ''}
            {formatKm(difference)}
            {isWarning && <AlertTriangle className="h-3 w-3 ml-1" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">
              Diferença: {percentDiff >= 0 ? '+' : ''}
              {percentDiff.toFixed(1)}%
            </p>
            <p className="text-xs">Reportado: {formatKm(reported)}</p>
            <p className="text-xs">GPS: {formatKm(tracked)}</p>
            {isCritical && (
              <p className="text-xs text-amber-500">
                ⚠️ Divergência alta - verificar
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PeriodSelectorProps {
  value: { start: Date; end: Date };
  onChange: (period: { start: Date; end: Date }) => void;
}

function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    {
      label: 'Este mês',
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    },
    {
      label: 'Mês passado',
      start: startOfMonth(subMonths(new Date(), 1)),
      end: endOfMonth(subMonths(new Date(), 1)),
    },
    {
      label: 'Últimos 3 meses',
      start: startOfMonth(subMonths(new Date(), 2)),
      end: endOfMonth(new Date()),
    },
  ];

  const currentLabel =
    format(value.start, 'MMM/yy', { locale: ptBR }) ===
    format(value.end, 'MMM/yy', { locale: ptBR })
      ? format(value.start, "MMMM 'de' yyyy", { locale: ptBR })
      : `${format(value.start, 'MMM/yy', { locale: ptBR })} - ${format(
          value.end,
          'MMM/yy',
          { locale: ptBR }
        )}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[200px] justify-start">
          <CalendarIcon className="h-4 w-4 mr-2" />
          {currentLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">Período</p>
          <div className="flex flex-col gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  onChange({ start: preset.start, end: preset.end });
                  setIsOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MileagePage() {
  // ==========================================================================
  // State
  // ==========================================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [period, setPeriod] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  // ==========================================================================
  // Queries
  // ==========================================================================
  const filters: KmFilters = useMemo(
    () => ({
      date_from: format(period.start, 'yyyy-MM-dd'),
      date_to: format(period.end, 'yyyy-MM-dd'),
      technician_id: selectedTechnician !== 'all' ? selectedTechnician : undefined,
    }),
    [period, selectedTechnician]
  );

  const { data: reportData, isLoading: isLoadingReport, refetch: refetchReport } = useKmReport(filters);
  const { data: technicians } = useActiveTechnicians();

  // ==========================================================================
  // Computed Values
  // ==========================================================================
  // reportData can be KmReport (single object) or PaginatedKmReport (with results)
  const reports: KmReport[] = useMemo(() => {
    if (Array.isArray(reportData)) {
      return reportData;
    }

    const results = (reportData as unknown as { results?: KmReport[] })?.results;
    if (results) {
      return results;
    }

    return reportData ? [reportData as KmReport] : [];
  }, [reportData]);

  // Calculate summary from reports
  const summaryData: KmSummary = useMemo(() => {
    if (reports.length === 0) {
      return {
        total_km_reported: 0,
        total_km_tracked: 0,
        total_cost: 0,
        average_per_technician: 0,
        total_routes: 0,
        variance_percent: 0,
      };
    }
    
    const totalReported = reports.reduce((sum, r) => sum + r.km_reported, 0);
    const totalTracked = reports.reduce((sum, r) => sum + r.km_tracked, 0);
    const totalRoutes = reports.reduce((sum, r) => sum + r.total_routes, 0);
    const costPerKm = 1.2; // R$/km - should come from settings
    
    return {
      total_km_reported: totalReported,
      total_km_tracked: totalTracked,
      total_cost: totalReported * costPerKm,
      average_per_technician: reports.length > 0 ? totalReported / reports.length : 0,
      total_routes: totalRoutes,
      variance_percent: totalReported > 0 
        ? ((totalReported - totalTracked) / totalReported) * 100 
        : 0,
    };
  }, [reports]);

  const costPerKm = 1.2; // R$/km - should come from settings
  const isLoading = isLoadingReport;

  // ==========================================================================
  // Handlers
  // ==========================================================================
  const handleRefresh = () => {
    refetchReport();
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export KM report');
  };

  // ==========================================================================
  // Table Columns
  // ==========================================================================
  const columns: Column<KmReport>[] = useMemo(
    () => [
      {
        id: 'technician',
        header: 'Técnico',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <div className="font-medium text-sm">{row.technician_name}</div>
              {row.vehicle_plate && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  {row.vehicle_plate}
                </div>
              )}
            </div>
          </div>
        ),
        width: 200,
      },
      {
        id: 'routes',
        header: 'Rotas',
        cell: (row) => (
          <div className="text-center">
            <span className="font-medium">{row.total_routes}</span>
          </div>
        ),
        width: 80,
        align: 'center',
      },
      {
        id: 'km_reported',
        header: 'KM Reportado',
        cell: (row) => (
          <div className="text-right">
            <span className="font-medium">{formatKm(row.km_reported)}</span>
          </div>
        ),
        width: 120,
        align: 'right',
      },
      {
        id: 'km_tracked',
        header: 'KM GPS',
        cell: (row) => (
          <div className="text-right">
            <span className="font-medium">{formatKm(row.km_tracked)}</span>
          </div>
        ),
        width: 120,
        align: 'right',
      },
      {
        id: 'variance',
        header: 'Diferença',
        cell: (row) => (
          <div className="flex justify-center">
            <KmVarianceBadge reported={row.km_reported} tracked={row.km_tracked} />
          </div>
        ),
        width: 120,
        align: 'center',
      },
      {
        id: 'cost',
        header: 'Custo Est.',
        cell: (row) => {
          const cost = row.km_reported * costPerKm;
          return (
            <div className="text-right">
              <span className="font-medium">
                {cost.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </div>
          );
        },
        width: 120,
        align: 'right',
      },
      {
        id: 'period',
        header: 'Período',
        cell: (row) => (
          <div className="text-sm text-muted-foreground">
            {row.period_start && row.period_end ? (
              <>
                {format(parseISO(row.period_start), 'dd/MM')} -{' '}
                {format(parseISO(row.period_end), 'dd/MM')}
              </>
            ) : (
              '-'
            )}
          </div>
        ),
        width: 120,
      },
    ],
    [costPerKm]
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quilometragem"
        description="Controle e auditoria de KM da frota"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="KM Total Reportado"
          value={formatKm(summaryData.total_km_reported)}
          description="No período selecionado"
          icon={Gauge}
          color="text-blue-500"
          isLoading={isLoading}
        />
        <QuickStatCard
          title="KM Total GPS"
          value={formatKm(summaryData.total_km_tracked)}
          description="Rastreado via GPS"
          icon={MapPin}
          color="text-green-500"
          isLoading={isLoading}
        />
        <QuickStatCard
          title="Custo Estimado"
          value={summaryData.total_cost.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
          description={`R$ ${costPerKm.toFixed(2)}/km`}
          icon={DollarSign}
          color="text-orange-500"
          isLoading={isLoading}
        />
        <QuickStatCard
          title="Variação"
          value={`${summaryData.variance_percent >= 0 ? '+' : ''}${summaryData.variance_percent.toFixed(1)}%`}
          description="Reportado vs GPS"
          icon={BarChart3}
          color={
            Math.abs(summaryData.variance_percent) > 10
              ? 'text-red-500'
              : 'text-gray-500'
          }
          isLoading={isLoading}
          trend={
            summaryData.variance_percent !== 0
              ? {
                  value: summaryData.variance_percent,
                  label: 'vs mês anterior',
                }
              : undefined
          }
        />
      </div>

      {/* Variance Alert */}
      {Math.abs(summaryData.variance_percent) > 15 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start gap-3 pt-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800">
                Variação significativa detectada
              </p>
              <p className="text-sm text-amber-700">
                A diferença entre KM reportado e GPS está acima de 15%. 
                Recomendamos verificar os registros individualmente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Relatório de Quilometragem
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>
                {reports.length} registro(s) • {summaryData.total_routes} rota(s)
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar técnico ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <PeriodSelector value={period} onChange={setPeriod} />

            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os técnicos</SelectItem>
                {technicians?.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Table */}
          <DataTable<KmReport>
            columns={columns}
            data={reports}
            total={reports.length}
            isLoading={isLoadingReport}
            getRowId={(row) => row.technician_id}
            emptyState={{
              icon: <Gauge className="h-12 w-12" />,
              title: 'Nenhum registro de KM',
              description: 'Não há dados de quilometragem para o período selecionado.',
            }}
            hoverable
            striped
          />
        </CardContent>
      </Card>

      {/* Cost Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-orange-500" />
            Informações de Custo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Custo por KM</p>
              <p className="font-medium">
                {costPerKm.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Média por técnico</p>
              <p className="font-medium">
                {formatKm(summaryData.average_per_technician)}/mês
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total de rotas</p>
              <p className="font-medium">{summaryData.total_routes}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MileagePage;
