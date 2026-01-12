/**
 * TrakService Tracking Page
 * 
 * Real-time location tracking for field technicians.
 * Features:
 * - Map view with technician locations (placeholder for map integration)
 * - List view with status indicators
 * - Location history
 * - Summary statistics
 * 
 * Design System: Platform-first, seguindo docs/design/DESIGN_SYSTEM.md
 * TrakService accent color: orange-500
 * 
 * Requires: trakservice.tracking feature
 */

import { useState, useMemo } from 'react';
import { format, formatDistanceToNow, parseISO, subHours } from 'date-fns';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/shared/ui/components/DataTable';
import {
  MapPin,
  Users,
  Target,
  Search,
  RefreshCw,
  Map,
  List,
  SignalLow,
  SignalMedium,
  SignalHigh,
  History,
  Activity,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  WifiOff,
  Car,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Hooks
import {
  useCurrentLocations,
  useLocationHistory,
  useTrackingSummary,
} from '../hooks/useTrackingQuery';

// Types and utilities
import type { TechnicianLocation, TechnicianStatus, LocationPing } from '../types';

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

interface TechnicianStatusBadgeProps {
  status: TechnicianStatus;
}

function TechnicianStatusBadge({ status }: TechnicianStatusBadgeProps) {
  const statusConfig: Record<TechnicianStatus, { label: string; color: string; bgColor: string }> = {
    online: { label: 'Online', color: 'text-green-700', bgColor: 'bg-green-100' },
    offline: { label: 'Offline', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    moving: { label: 'Em movimento', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    stationary: { label: 'Parado', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    at_site: { label: 'No local', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    inactive: { label: 'Inativo', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  };

  const config = statusConfig[status] || statusConfig.offline;

  return (
    <Badge
      variant="outline"
      className={cn(config.bgColor, config.color, 'border-transparent font-medium')}
    >
      {config.label}
    </Badge>
  );
}

interface SignalStrengthIndicatorProps {
  accuracy?: number;
}

function SignalStrengthIndicator({ accuracy }: SignalStrengthIndicatorProps) {
  if (!accuracy) {
    return <WifiOff className="h-4 w-4 text-gray-400" />;
  }

  // Accuracy in meters - lower is better
  if (accuracy <= 10) {
    return <SignalHigh className="h-4 w-4 text-green-500" />;
  } else if (accuracy <= 30) {
    return <SignalMedium className="h-4 w-4 text-amber-500" />;
  } else {
    return <SignalLow className="h-4 w-4 text-red-500" />;
  }
}

interface BatteryIndicatorProps {
  level?: number;
}

function BatteryIndicator({ level }: BatteryIndicatorProps) {
  if (level === undefined) {
    return <Battery className="h-4 w-4 text-gray-400" />;
  }

  if (level >= 60) {
    return <BatteryFull className="h-4 w-4 text-green-500" />;
  } else if (level >= 30) {
    return <BatteryMedium className="h-4 w-4 text-amber-500" />;
  } else {
    return <BatteryLow className="h-4 w-4 text-red-500" />;
  }
}

interface LocationHistoryDialogProps {
  technicianId: string;
  technicianName: string;
}

function LocationHistoryDialog({ technicianId, technicianName }: LocationHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const endDate = useMemo(() => new Date(), []);
  const startDate = useMemo(() => subHours(endDate, 8), [endDate]);

  const { data: historyData, isLoading } = useLocationHistory(
    technicianId,
    open ? format(startDate, 'yyyy-MM-dd HH:mm') : undefined,
    open ? format(endDate, 'yyyy-MM-dd HH:mm') : undefined
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="h-4 w-4 mr-1" />
          Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de Localização</DialogTitle>
          <DialogDescription>
            Últimas 8 horas de {technicianName}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : historyData?.pings && historyData.pings.length > 0 ? (
            <div className="space-y-2">
              {historyData.pings.map((ping: LocationPing, index: number) => (
                <div
                  key={ping.id || index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <MapPin className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {format(parseISO(ping.recorded_at), "HH:mm", { locale: ptBR })}
                      </span>
                      <SignalStrengthIndicator accuracy={ping.accuracy} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {ping.latitude.toFixed(6)}, {ping.longitude.toFixed(6)}
                    </div>
                    {ping.address && (
                      <div className="text-xs text-muted-foreground">{ping.address}</div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Precisão: ±{ping.accuracy?.toFixed(0) || '?'}m</span>
                      {ping.speed !== undefined && (
                        <span>• {(ping.speed * 3.6).toFixed(0)} km/h</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum registro de localização no período</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface MapPlaceholderProps {
  locations: TechnicianLocation[];
  isLoading: boolean;
}

function MapPlaceholder({ locations, isLoading }: MapPlaceholderProps) {
  return (
    <Card className="h-[500px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Map className="h-4 w-4 text-orange-500" />
          Mapa de Localização
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-60px)] flex flex-col items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed">
        {isLoading ? (
          <div className="space-y-4 text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <>
            <Map className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium mb-2">
              Integração com Mapa
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Em breve: visualização em tempo real com Google Maps ou Leaflet.
              {locations.length > 0 && (
                <span className="block mt-2 text-orange-600">
                  {locations.length} técnico(s) rastreado(s)
                </span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-lg">
              {locations.slice(0, 6).map((loc) => (
                <Badge key={loc.technician_id} variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {loc.technician_name}
                </Badge>
              ))}
              {locations.length > 6 && (
                <Badge variant="outline">+{locations.length - 6} mais</Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TrackingPage() {
  // ==========================================================================
  // State
  // ==========================================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // ==========================================================================
  // Queries
  // ==========================================================================
  const { data: locations, isLoading: isLoadingLocations, refetch } = useCurrentLocations();
  const { data: summary, isLoading: isLoadingSummary } = useTrackingSummary();

  // ==========================================================================
  // Computed Values
  // ==========================================================================
  const filteredLocations = useMemo(() => {
    if (!locations) return [];

    return locations.filter((loc) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = loc.technician_name.toLowerCase().includes(search);
        const matchesAddress = loc.last_known_address?.toLowerCase().includes(search);
        if (!matchesName && !matchesAddress) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && loc.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [locations, searchTerm, statusFilter]);

  const summaryData = summary || {
    total_technicians: 0,
    online: 0,
    offline: 0,
    in_field: 0,
    at_site: 0,
    moving: 0,
    average_accuracy: 0,
  };

  // ==========================================================================
  // Handlers
  // ==========================================================================
  const handleRefresh = () => {
    refetch();
  };

  // ==========================================================================
  // Table Columns
  // ==========================================================================
  const columns: Column<TechnicianLocation>[] = useMemo(
    () => [
      {
        id: 'technician',
        header: 'Técnico',
        cell: (row) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <div className="font-medium">{row.technician_name}</div>
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
        id: 'status',
        header: 'Status',
        cell: (row) => <TechnicianStatusBadge status={row.status} />,
        width: 120,
      },
      {
        id: 'location',
        header: 'Última Localização',
        cell: (row) => (
          <div className="space-y-1">
            <div className="text-sm font-medium truncate max-w-[200px]">
              {row.last_known_address || 'Endereço não disponível'}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.latitude?.toFixed(4)}, {row.longitude?.toFixed(4)}
            </div>
          </div>
        ),
        width: 220,
      },
      {
        id: 'updated',
        header: 'Atualizado',
        cell: (row) => (
          <div className="space-y-1">
            <div className="text-sm">
              {row.last_seen_at
                ? formatDistanceToNow(parseISO(row.last_seen_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })
                : 'Nunca'}
            </div>
            {row.last_seen_at && (
              <div className="text-xs text-muted-foreground">
                {format(parseISO(row.last_seen_at), "HH:mm", { locale: ptBR })}
              </div>
            )}
          </div>
        ),
        width: 140,
      },
      {
        id: 'signal',
        header: 'Sinal',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <SignalStrengthIndicator accuracy={row.accuracy} />
            <span className="text-xs text-muted-foreground">
              ±{row.accuracy?.toFixed(0) || '?'}m
            </span>
          </div>
        ),
        width: 100,
      },
      {
        id: 'battery',
        header: 'Bateria',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <BatteryIndicator level={row.battery_level} />
            {row.battery_level !== undefined && (
              <span className="text-xs text-muted-foreground">{row.battery_level}%</span>
            )}
          </div>
        ),
        width: 90,
      },
      {
        id: 'actions',
        header: '',
        cell: (row) => (
          <LocationHistoryDialog
            technicianId={row.technician_id}
            technicianName={row.technician_name}
          />
        ),
        width: 100,
        align: 'right',
      },
    ],
    []
  );

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rastreamento"
        description="Acompanhe a localização da equipe em tempo real"
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
          title="Total Técnicos"
          value={summaryData.total_technicians}
          description="Rastreados"
          icon={Users}
          color="text-blue-500"
          isLoading={isLoadingSummary}
        />
        <QuickStatCard
          title="Online"
          value={summaryData.online}
          description="Conectados agora"
          icon={Activity}
          color="text-green-500"
          isLoading={isLoadingSummary}
        />
        <QuickStatCard
          title="Em Campo"
          value={summaryData.in_field}
          description="Fora do escritório"
          icon={MapPin}
          color="text-orange-500"
          isLoading={isLoadingSummary}
        />
        <QuickStatCard
          title="No Local"
          value={summaryData.at_site}
          description="Em atendimento"
          icon={Target}
          color="text-purple-500"
          isLoading={isLoadingSummary}
        />
      </div>

      {/* View Toggle & Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Localizações</CardTitle>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')}>
              <TabsList className="grid w-[180px] grid-cols-2">
                <TabsTrigger value="list" className="gap-1">
                  <List className="h-4 w-4" />
                  Lista
                </TabsTrigger>
                <TabsTrigger value="map" className="gap-1">
                  <Map className="h-4 w-4" />
                  Mapa
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar técnico ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="moving">Em movimento</SelectItem>
                <SelectItem value="stationary">Parado</SelectItem>
                <SelectItem value="at_site">No local</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content based on view mode */}
          {viewMode === 'list' ? (
            <DataTable<TechnicianLocation>
              columns={columns}
              data={filteredLocations}
              total={filteredLocations.length}
              isLoading={isLoadingLocations}
              getRowId={(row) => row.technician_id}
              emptyState={{
                icon: <MapPin className="h-12 w-12" />,
                title: 'Nenhum técnico encontrado',
                description:
                  searchTerm || statusFilter !== 'all'
                    ? 'Tente ajustar os filtros para ver mais resultados.'
                    : 'Aguardando sincronização com os dispositivos móveis.',
              }}
              hoverable
              striped
            />
          ) : (
            <MapPlaceholder locations={filteredLocations} isLoading={isLoadingLocations} />
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800">Privacidade e Compliance</p>
            <p className="text-sm text-amber-700">
              O rastreamento respeita a janela de trabalho configurada para cada técnico. 
              Localizações fora do horário permitido não são registradas (LGPD).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TrackingPage;
