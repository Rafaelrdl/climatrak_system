/**
 * SensorsPage - Página de Sensores e Telemetria
 * 
 * Exibe grid de dispositivos IoT com variáveis (sensores) expansíveis.
 * Suporta filtros por status e atualização automática a cada 30s.
 */

import { useState, useEffect } from 'react';
import { Wifi, RefreshCw, Filter, Radio, Building2 } from 'lucide-react';
import { PageHeader } from '@/shared/ui';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeviceCard } from '../components/DeviceCard';
import { useDevicesSummaryQuery } from '../hooks/useDevicesQuery';
import { useSitesQuery } from '../hooks/useSitesQuery';
import { useMonitorStore } from '../store/monitorStore';
import type { DeviceStatusFilter } from '../types/device';

export function SensorsPage() {
  const { currentSite, setCurrentSite, setSites, availableSites } = useMonitorStore();
  const [deviceStatusFilter, setDeviceStatusFilter] = useState<DeviceStatusFilter>('all');

  // React Query: buscar sites disponíveis
  const { data: sites = [], isLoading: isLoadingSites } = useSitesQuery();

  // Atualizar store quando sites são carregados e selecionar primeiro site automaticamente
  useEffect(() => {
    if (sites.length > 0) {
      setSites(sites);
      // Auto-seleciona primeiro site se nenhum está selecionado
      if (!currentSite) {
        setCurrentSite(sites[0]);
      }
    }
  }, [sites, currentSite, setSites, setCurrentSite]);

  // React Query: buscar devices summary com auto-refresh de 30s
  const {
    data: devices = [],
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useDevicesSummaryQuery(currentSite?.id);

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const noDevicesAvailable = !isLoading && devices.length === 0;
  const queryError = error ? (error as Error).message : null;

  // Filtrar devices por status
  const filteredDevices = devices.filter((device) => {
    if (deviceStatusFilter === 'all') return true;
    if (deviceStatusFilter === 'online') return device.device_status === 'ONLINE';
    if (deviceStatusFilter === 'offline') return device.device_status === 'OFFLINE';
    return true;
  });

  // Contadores
  const onlineCount = devices.filter((d) => d.device_status === 'ONLINE').length;
  const offlineCount = devices.filter((d) => d.device_status === 'OFFLINE').length;
  const totalVariables = filteredDevices.reduce((sum, d) => sum + d.total_variables_count, 0);

  // Handler para mudança de site
  const handleSiteChange = (siteId: string) => {
    const site = sites.find(s => String(s.id) === siteId);
    if (site) {
      setCurrentSite(site);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sensores & Telemetria"
        description="Monitoramento em tempo real de dispositivos IoT agrupados"
        icon={<Radio className="h-6 w-6" />}
      >
        <div className="flex items-center gap-3">
          {/* Status de conexão */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Atualizando...</span>
            </div>
          )}
          
          {!isLoading && lastUpdate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span>Atualizado às {lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
          
          {queryError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <span>⚠️ {queryError}</span>
            </div>
          )}
          
          {currentSite && !isLoading && !queryError && (
            <div className="text-xs text-muted-foreground border-l border-border pl-3">
              Auto-refresh: 30s
            </div>
          )}

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </PageHeader>

      {/* Filtros e Contadores */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card rounded-lg shadow-sm border border-border">
        <div className="flex flex-wrap items-center gap-4">
          {/* Seletor de Site */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Site:</span>
            <Select
              value={currentSite ? String(currentSite.id) : ''}
              onValueChange={handleSiteChange}
              disabled={isLoadingSites}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={isLoadingSites ? 'Carregando...' : 'Selecione um site'} />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={String(site.id)}>
                    <div className="flex items-center gap-2">
                      <span>{site.name}</span>
                      {site.sector && (
                        <span className="text-xs text-muted-foreground">({site.sector})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-border" />

          {/* Filtro de Status */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Status:</span>
            <Select
              value={deviceStatusFilter}
              onValueChange={(value) => setDeviceStatusFilter(value as DeviceStatusFilter)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({devices.length})</SelectItem>
                <SelectItem value="online">Online ({onlineCount})</SelectItem>
                <SelectItem value="offline">Offline ({offlineCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contadores */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium">Devices:</span>
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
              {filteredDevices.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Variáveis Total:</span>
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded-full font-medium">
              {totalVariables}
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && devices.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando dispositivos...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredDevices.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            {noDevicesAvailable ? (
              <>
                <Wifi className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  {currentSite ? 'Nenhum dispositivo encontrado neste site' : 'Nenhum site selecionado'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentSite 
                    ? `O site "${currentSite.name}" ainda não possui dispositivos cadastrados.` 
                    : 'Selecione um site no header para visualizar os dispositivos.'}
                </p>
                {currentSite && (
                  <p className="text-xs text-muted-foreground mt-4">
                    💡 Os dispositivos são cadastrados automaticamente via tópico MQTT
                  </p>
                )}
              </>
            ) : (
              <>
                <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  Nenhum dispositivo encontrado com os filtros aplicados
                </p>
                <p className="text-sm text-muted-foreground">
                  Tente ajustar o filtro de status ou aguarde a sincronização
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Device Cards Grid */}
      {filteredDevices.length > 0 && (
        <div className="grid gap-6">
          {filteredDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
