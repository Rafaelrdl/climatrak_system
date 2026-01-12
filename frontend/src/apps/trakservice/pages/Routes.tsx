/**
 * TrakService Routes Page
 * 
 * Route optimization and management for field service.
 * Features:
 * - List of daily routes
 * - Route optimization with TSP algorithm
 * - Stop management (reorder, update status)
 * - Route execution tracking
 * 
 * Design System: Platform-first, seguindo docs/design/DESIGN_SYSTEM.md
 * TrakService accent color: orange-500
 * 
 * Requires: trakservice.routing feature
 */

import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/shared/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DataTable, type Column } from '@/shared/ui/components/DataTable';
import {
  Route,
  Clock,
  Users,
  Target,
  Search,
  RefreshCw,
  Play,
  CheckCircle,
  Circle,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Gauge,
  Navigation,
  Zap,
  Loader2,
  Truck,
  Building2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Hooks
import {
  useRoutes,
  useRoute,
  useOptimizeRoute,
  useStartRoute,
  useCompleteRoute,
  useUpdateStopStatus,
} from '../hooks/useRoutingQuery';
import { useActiveTechnicians } from '../hooks/useDispatchQuery';

// Types and utilities
import type { DailyRoute, RouteStop, RouteFilters, RouteStatus, StopStatus } from '../types';
import {
  getRouteStatusConfig,
  getStopStatusConfig,
  formatDuration,
  formatKm,
} from '../services/routingService';

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
}

function QuickStatCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'text-muted-foreground',
  isLoading = false,
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
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface RouteStatusBadgeProps {
  status: RouteStatus;
}

function RouteStatusBadge({ status }: RouteStatusBadgeProps) {
  const config = getRouteStatusConfig(status);

  return (
    <Badge
      variant="outline"
      className={cn(config.bgColor, config.color, 'border-transparent font-medium')}
    >
      {config.label}
    </Badge>
  );
}

interface RouteProgressProps {
  route: DailyRoute;
}

function RouteProgress({ route }: RouteProgressProps) {
  const completedStops = route.stops.filter((s) => s.status === 'completed').length;
  const totalStops = route.stops.length;
  const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>
          {completedStops} de {totalStops} paradas
        </span>
        <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

interface StopStatusIconProps {
  status: RouteStop['status'];
}

function StopStatusIcon({ status }: StopStatusIconProps) {
  const config = getStopStatusConfig(status);

  switch (status) {
    case 'completed':
      return <CheckCircle className={cn('h-5 w-5', config.color)} />;
    case 'in_progress':
      return <Play className={cn('h-5 w-5', config.color)} />;
    case 'skipped':
      return <XCircle className={cn('h-5 w-5', config.color)} />;
    default:
      return <Circle className={cn('h-5 w-5', config.color)} />;
  }
}

interface RouteStopsListProps {
  stops: RouteStop[];
  routeId: string;
  routeStatus: RouteStatus;
}

function RouteStopsList({ stops, routeId, routeStatus }: RouteStopsListProps) {
  const updateStopStatus = useUpdateStopStatus();
  const canEdit = routeStatus === 'in_progress';

  const handleUpdateStop = (stopId: string, status: StopStatus) => {
    updateStopStatus.mutate({
      routeId,
      stopId,
      status,
    });
  };

  return (
    <div className="space-y-2">
      {stops.map((stop) => (
        <div
          key={stop.id}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border transition-colors',
            stop.status === 'completed' && 'bg-green-50/50 border-green-200',
            stop.status === 'in_progress' && 'bg-blue-50/50 border-blue-200',
            stop.status === 'skipped' && 'bg-gray-50/50 border-gray-200'
          )}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">{stop.sequence}</span>
            <StopStatusIcon status={stop.status} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-sm truncate">{stop.location_name}</div>
              {canEdit && stop.status === 'pending' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleUpdateStop(stop.id, 'in_progress')}>
                      <Play className="h-4 w-4 mr-2 text-blue-500" />
                      Iniciar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStop(stop.id, 'skipped')}>
                      <XCircle className="h-4 w-4 mr-2 text-gray-500" />
                      Pular
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {canEdit && stop.status === 'in_progress' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600"
                  onClick={() => handleUpdateStop(stop.id, 'completed')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Concluir
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground mt-1">{stop.address}</div>

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {stop.estimated_arrival && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Chegada: {format(parseISO(stop.estimated_arrival), 'HH:mm')}
                </span>
              )}
              {stop.estimated_duration && (
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Duração: {stop.estimated_duration} min
                </span>
              )}
            </div>

            {stop.work_order_number && (
              <Badge variant="outline" className="mt-2 text-xs">
                OS: {stop.work_order_number}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface RouteDetailDialogProps {
  routeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RouteDetailDialog({ routeId, open, onOpenChange }: RouteDetailDialogProps) {
  const { data: route, isLoading } = useRoute(routeId);
  const startRoute = useStartRoute();
  const completeRoute = useCompleteRoute();

  const handleStart = () => {
    if (route) {
      startRoute.mutate(route.id);
    }
  };

  const handleComplete = () => {
    if (route) {
      completeRoute.mutate(route.id);
    }
  };

  const canStart = route?.status === 'pending' || route?.status === 'optimized';
  const canComplete =
    route?.status === 'in_progress' &&
    route.stops.every((s) => s.status === 'completed' || s.status === 'skipped');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-orange-500" />
            Detalhes da Rota
          </DialogTitle>
          <DialogDescription>
            {route ? (
              <>
                {route.technician_name} •{' '}
                {format(parseISO(route.date), "dd 'de' MMMM", { locale: ptBR })}
              </>
            ) : (
              'Carregando...'
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : route ? (
          <>
            {/* Route Summary */}
            <div className="grid grid-cols-4 gap-4 py-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {formatKm(route.total_distance)}
                </div>
                <div className="text-xs text-muted-foreground">Distância</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatDuration(route.total_duration)}</div>
                <div className="text-xs text-muted-foreground">Tempo Est.</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{route.stops.length}</div>
                <div className="text-xs text-muted-foreground">Paradas</div>
              </div>
              <div className="text-center">
                <RouteStatusBadge status={route.status} />
                <div className="text-xs text-muted-foreground mt-1">Status</div>
              </div>
            </div>

            <Separator />

            {/* Stops List */}
            <ScrollArea className="h-[300px] pr-4">
              <div className="py-4">
                <h4 className="text-sm font-medium mb-3">Paradas da Rota</h4>
                <RouteStopsList
                  stops={route.stops}
                  routeId={route.id}
                  routeStatus={route.status}
                />
              </div>
            </ScrollArea>
          </>
        ) : null}

        <DialogFooter>
          {canStart && (
            <Button
              onClick={handleStart}
              disabled={startRoute.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {startRoute.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Iniciar Rota
            </Button>
          )}
          {canComplete && (
            <Button onClick={handleComplete} disabled={completeRoute.isPending} variant="default">
              {completeRoute.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Finalizar Rota
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function RoutesPage() {
  // ==========================================================================
  // State
  // ==========================================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // ==========================================================================
  // Queries
  // ==========================================================================
  const filters: RouteFilters = useMemo(
    () => ({
      date: format(selectedDate, 'yyyy-MM-dd'),
      status: selectedStatus !== 'all' ? (selectedStatus as RouteStatus) : undefined,
      technician_id: selectedTechnician !== 'all' ? selectedTechnician : undefined,
      search: searchTerm || undefined,
    }),
    [selectedDate, selectedStatus, selectedTechnician, searchTerm]
  );

  const { data: routesData, isLoading: isLoadingRoutes, refetch } = useRoutes(filters);
  const { data: technicians } = useActiveTechnicians();
  const optimizeRoute = useOptimizeRoute();

  // ==========================================================================
  // Computed Values
  // ==========================================================================
  const routes = useMemo(() => routesData?.results ?? [], [routesData]);

  const stats = useMemo(() => {
    const pending = routes.filter((r) => r.status === 'pending').length;
    const inProgress = routes.filter((r) => r.status === 'in_progress').length;
    const completed = routes.filter((r) => r.status === 'completed').length;
    const totalKm = routes.reduce((acc, r) => acc + (r.total_distance || 0), 0);

    return { pending, inProgress, completed, totalKm };
  }, [routes]);

  // ==========================================================================
  // Handlers
  // ==========================================================================
  const handleRefresh = () => {
    refetch();
  };

  const handleOptimize = useCallback(
    (technicianId: string, date: string) => {
      optimizeRoute.mutate({
        technician_id: technicianId,
        date,
        optimize_for: 'distance',
      });
    },
    [optimizeRoute]
  );

  const handleViewRoute = useCallback((routeId: string) => {
    setSelectedRouteId(routeId);
  }, []);

  // ==========================================================================
  // Table Columns
  // ==========================================================================
  const columns: Column<DailyRoute>[] = useMemo(
    () => [
      {
        id: 'date',
        header: 'Data',
        cell: (row) => {
          const date = parseISO(row.date);
          const label = isToday(date)
            ? 'Hoje'
            : isTomorrow(date)
            ? 'Amanhã'
            : format(date, "dd/MM", { locale: ptBR });
          return (
            <div className="space-y-1">
              <div className="font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">
                {format(date, 'EEEE', { locale: ptBR })}
              </div>
            </div>
          );
        },
        width: 100,
      },
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
              {row.vehicle && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {row.vehicle}
                </div>
              )}
            </div>
          </div>
        ),
        width: 180,
      },
      {
        id: 'stops',
        header: 'Paradas',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.stops.length}</span>
          </div>
        ),
        width: 80,
      },
      {
        id: 'distance',
        header: 'Distância',
        cell: (row) => (
          <div className="space-y-1">
            <div className="font-medium">{formatKm(row.total_distance)}</div>
            <div className="text-xs text-muted-foreground">{formatDuration(row.total_duration)}</div>
          </div>
        ),
        width: 100,
      },
      {
        id: 'progress',
        header: 'Progresso',
        cell: (row) =>
          row.status === 'in_progress' ? (
            <div className="w-32">
              <RouteProgress route={row} />
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          ),
        width: 150,
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <RouteStatusBadge status={row.status} />,
        width: 120,
      },
      {
        id: 'actions',
        header: '',
        cell: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleViewRoute(row.id)}>
                <Target className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              {(row.status === 'pending' || row.status === 'optimized') && (
                <DropdownMenuItem onClick={() => handleOptimize(row.technician_id, row.date)}>
                  <Zap className="h-4 w-4 mr-2 text-amber-500" />
                  Otimizar Rota
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        width: 60,
        align: 'right',
      },
    ],
    [handleOptimize, handleViewRoute]
  );

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="space-y-6">
      <PageHeader
        title="Roteirização"
        description="Otimize rotas e acompanhe deslocamentos"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="Pendentes"
          value={stats.pending}
          description="Aguardando início"
          icon={Clock}
          color="text-amber-500"
          isLoading={isLoadingRoutes}
        />
        <QuickStatCard
          title="Em Andamento"
          value={stats.inProgress}
          description="Rotas ativas"
          icon={Navigation}
          color="text-blue-500"
          isLoading={isLoadingRoutes}
        />
        <QuickStatCard
          title="Concluídas"
          value={stats.completed}
          description="Finalizadas hoje"
          icon={CheckCircle}
          color="text-green-500"
          isLoading={isLoadingRoutes}
        />
        <QuickStatCard
          title="KM Total"
          value={formatKm(stats.totalKm)}
          description="Distância planejada"
          icon={Gauge}
          color="text-orange-500"
          isLoading={isLoadingRoutes}
        />
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Rotas do Dia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar rota ou técnico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[180px] justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="optimized">Otimizada</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
              </SelectContent>
            </Select>

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
          <DataTable<DailyRoute>
            columns={columns}
            data={routes}
            total={routesData?.count ?? 0}
            isLoading={isLoadingRoutes}
            getRowId={(row) => row.id}
            emptyState={{
              icon: <Route className="h-12 w-12" />,
              title: 'Nenhuma rota encontrada',
              description: 'Não há rotas planejadas para os filtros selecionados.',
            }}
            hoverable
            striped
          />
        </CardContent>
      </Card>

      {/* Route Detail Dialog */}
      {selectedRouteId && (
        <RouteDetailDialog
          routeId={selectedRouteId}
          open={!!selectedRouteId}
          onOpenChange={(open) => !open && setSelectedRouteId(null)}
        />
      )}
    </div>
  );
}

export default RoutesPage;
