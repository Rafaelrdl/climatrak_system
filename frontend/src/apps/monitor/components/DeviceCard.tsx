/**
 * DeviceCard - Card de dispositivo IoT com variáveis expansíveis
 * 
 * Exibe informações do dispositivo, status online/offline,
 * contagem de variáveis e lista expansível de sensores.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, AlertCircle, Gauge } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DeviceSummary, SensorVariable } from '../types/device';

interface DeviceCardProps {
  device: DeviceSummary;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calcular disponibilidade
  const availability = device.total_variables_count > 0
    ? (device.online_variables_count / device.total_variables_count) * 100
    : 0;

  const getAvailabilityColor = (availability: number) => {
    if (availability >= 90) return 'bg-green-500';
    if (availability >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getAvailabilityTextColor = (availability: number) => {
    if (availability >= 90) return 'text-green-700';
    if (availability >= 70) return 'text-yellow-700';
    return 'text-red-700';
  };

  const getStatusBadge = (isOnline: boolean) => {
    return isOnline ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <span className="w-2 h-2 mr-1.5 rounded-full bg-green-600 dark:bg-green-400" />
        Online
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
        <span className="w-2 h-2 mr-1.5 rounded-full bg-gray-400" />
        Offline
      </span>
    );
  };

  const formatLastReading = (timestamp: string | null) => {
    if (!timestamp) return 'Nunca';
    
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden hover:shadow-lg transition-shadow">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-foreground">
                {device.display_name || device.name}
              </h3>
              {getStatusBadge(device.device_status === 'ONLINE')}
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Asset:</span>{' '}
                {device.asset_info.tag}
              </p>
              <p>
                <span className="font-medium">MAC:</span>{' '}
                {device.mqtt_client_id}
              </p>
              {device.firmware_version && (
                <p>
                  <span className="font-medium">Equipamento de monitoramento:</span>{' '}
                  {device.firmware_version}
                </p>
              )}
              <p>
                <span className="font-medium">Última conexão:</span>{' '}
                {formatLastReading(device.last_seen)}
              </p>
            </div>
          </div>

          {/* Variables Summary with Availability */}
          <div className="ml-4 text-right space-y-3">
            {/* Variables Count */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Variáveis
              </div>
              <div className="text-2xl font-bold text-foreground">
                {device.total_variables_count}
              </div>
              <div className="text-xs text-muted-foreground">
                {device.online_variables_count} online
              </div>
            </div>

            {/* Availability Progress Bar */}
            <div className="w-32">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Disponibilidade
                </span>
                <span className={cn("text-xs font-bold", getAvailabilityTextColor(availability))}>
                  {availability.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-300", getAvailabilityColor(availability))}
                  style={{ width: `${availability}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted rounded-md transition-colors text-sm font-medium text-muted-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ocultar Variáveis
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver Variáveis ({device.total_variables_count})
            </>
          )}
        </button>
      </div>

      {/* Expandable Variables List */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/30">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Variáveis do Dispositivo
            </h4>
            
            {device.variables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma variável encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {device.variables.map((variable) => (
                  <VariableRow key={variable.id} variable={variable} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface VariableRowProps {
  variable: SensorVariable;
}

function VariableRow({ variable }: VariableRowProps) {
  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return 'N/A';
    
    if (unit === 'celsius') return `${value.toFixed(1)}°C`;
    if (unit === 'percent_rh') return `${value.toFixed(1)}%`;
    if (unit === 'dBW' || unit === 'dB') return `${value.toFixed(1)} ${unit}`;
    
    return `${value.toFixed(2)} ${unit}`;
  };

  const formatLastReading = (timestamp: string | null) => {
    if (!timestamp) return 'Nunca';
    
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-md border",
        variable.is_online
          ? 'bg-card border-border'
          : 'bg-muted/50 border-border opacity-60'
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* Status Indicator */}
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            variable.is_online ? 'bg-green-500' : 'bg-gray-400'
          )}
        />

        {/* Variable Info */}
        <div className="flex-1 min-w-0">
          <h5 className="text-sm font-medium text-foreground truncate">
            {variable.name}
          </h5>
          <p className="text-xs text-muted-foreground truncate">
            {variable.tag}
          </p>
        </div>
      </div>

      {/* Value & Timestamp */}
      <div className="text-right ml-4">
        <div className={cn(
          "text-sm font-semibold",
          variable.is_online ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {formatValue(variable.last_value, variable.unit)}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatLastReading(variable.last_reading_at)}
        </div>
      </div>
    </div>
  );
}

export default DeviceCard;
