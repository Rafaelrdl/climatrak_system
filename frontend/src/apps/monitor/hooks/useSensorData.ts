/**
 * useSensorData - Hook para dados de sensores em tempo real
 * 
 * Este hook pertence ao módulo Monitor (TrakSense) pois depende
 * diretamente de services e types específicos do Monitor.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assetsService } from '../services/assetsService';
import { telemetryService, DeviceHistoryResponse } from '../services/telemetryService';
import type { AssetSensor } from '../types/asset';

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  previousValue: number | null;
  currentValue: number | null;
}

interface UseSensorDataResult {
  value: number | null;
  unit: string;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  sensor: AssetSensor | null;
  trend: TrendData | null;
}

/**
 * Calcula a tendência comparando valores recentes
 * @param data - Array de pontos de dados com timestamp e value
 * @returns TrendData com direção, porcentagem e valores
 */
function calculateTrend(data: Array<{ timestamp: string; value: number }>): TrendData | null {
  if (!data || data.length < 2) {
    return null;
  }

  // Ordenar por timestamp (mais recente primeiro)
  const sortedData = [...data].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Pegar o valor mais recente e comparar com a média dos anteriores
  const currentValue = sortedData[0].value;
  
  // Calcular média dos valores anteriores (últimos 5-10 pontos excluindo o atual)
  const previousPoints = sortedData.slice(1, Math.min(10, sortedData.length));
  if (previousPoints.length === 0) {
    return null;
  }

  const previousAvg = previousPoints.reduce((sum, p) => sum + p.value, 0) / previousPoints.length;

  // Calcular diferença percentual
  let percentage = 0;
  if (previousAvg !== 0) {
    percentage = ((currentValue - previousAvg) / Math.abs(previousAvg)) * 100;
  }

  // Determinar direção (threshold de 1% para considerar estável)
  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (percentage > 1) {
    direction = 'up';
  } else if (percentage < -1) {
    direction = 'down';
  }

  return {
    direction,
    percentage: Math.abs(percentage),
    previousValue: previousAvg,
    currentValue,
  };
}

/**
 * Hook para buscar dados em tempo real de um sensor específico
 * Usa sensorTag e assetId do widget config para buscar o último valor
 * Também calcula a tendência baseada no histórico recente
 * 
 * @param sensorTag - Tag única do sensor configurado no widget
 * @param assetId - ID do asset ao qual o sensor pertence
 * @param refreshInterval - Intervalo de atualização em milissegundos (padrão: 30s)
 */
export function useSensorData(
  sensorTag: string | undefined, 
  assetId: number | undefined,
  refreshInterval = 30000
): UseSensorDataResult {
  const sensorsQuery = useQuery({
    queryKey: ['monitor', 'assetSensors', assetId, sensorTag],
    queryFn: () => assetsService.getSensors(assetId!),
    enabled: !!assetId && !!sensorTag,
    refetchInterval: refreshInterval,
    staleTime: refreshInterval,
  });

  const sensor = useMemo(() => {
    if (!sensorTag) return null;
    return sensorsQuery.data?.find(s => s.tag === sensorTag) ?? null;
  }, [sensorTag, sensorsQuery.data]);

  const historyQuery = useQuery({
    queryKey: [
      'monitor',
      'sensorTrend',
      sensor?.asset_tag ?? null,
      sensor?.device_mqtt_client_id ?? null,
      sensorTag,
    ],
    queryFn: async () => {
      if (!sensorTag || !sensor) return [];
      const assetTag = sensor.asset_tag;
      const deviceId = sensor.device_mqtt_client_id;

      let history: DeviceHistoryResponse | null = null;

      if (assetTag) {
        history = await telemetryService.getHistoryByAsset(
          assetTag,
          6,
          [sensorTag],
          '5m'
        );
      }

      if ((!history || history.series.length === 0) && deviceId) {
        history = await telemetryService.getHistoryByDevice(
          deviceId,
          6,
          [sensorTag],
          '5m'
        );
      }

      if (!history) return [];

      let sensorSeries = history.series.find(s => 
        s.sensorId === sensorTag || 
        s.sensorId === sensor.tag ||
        s.sensorId === sensor.name
      );

      if (!sensorSeries && history.series.length > 0) {
        sensorSeries = history.series[0];
      }

      return sensorSeries?.data ?? [];
    },
    enabled: !!assetId && !!sensorTag && !!sensor,
    refetchInterval: refreshInterval,
    staleTime: refreshInterval,
  });

  const trend = useMemo(() => {
    if (!historyQuery.data || historyQuery.data.length < 2) return null;
    return calculateTrend(historyQuery.data);
  }, [historyQuery.data]);

  const error = useMemo(() => {
    if (!sensorTag || !assetId) return null;
    if (sensorsQuery.error) {
      return sensorsQuery.error instanceof Error
        ? sensorsQuery.error.message
        : 'Erro ao carregar dados do sensor';
    }
    if (sensorsQuery.data && !sensor) {
      return `Sensor ${sensorTag} nao encontrado`;
    }
    return null;
  }, [assetId, sensorTag, sensorsQuery.error, sensorsQuery.data, sensor]);

  const isLoading = !!assetId && !!sensorTag && sensorsQuery.isLoading;

  return {
    value: sensor?.last_value ?? null,
    unit: sensor?.unit || '',
    isOnline: sensor?.is_online ?? false,
    isLoading,
    error,
    sensor,
    trend,
  };
}

/**
 * Avalia uma fórmula de transformação de valor
 * @param formula - Fórmula com $VALUE$ como placeholder
 * @param value - Valor do sensor
 * @returns Valor transformado ou original se fórmula inválida
 */
export function evaluateFormula(formula: string | undefined, value: number | null): number | string | null {
  if (!formula || value === null) return value;
  
  try {
    // Substituir $VALUE$ pelo valor real
    const expression = formula.replace(/\$VALUE\$/g, String(value));
    // Avaliar expressão de forma segura
    const result = Function('"use strict"; return (' + expression + ')')();
    return result;
  } catch (error) {
    console.warn('Erro ao avaliar fórmula:', error);
    return value;
  }
}

// ============ SENSOR HISTORY HOOKS ============

export interface SensorHistoryDataPoint {
  timestamp: Date;
  value: number;
  sensorId: string;
}

export interface SensorHistorySeries {
  sensorTag: string;
  label: string;
  name?: string;
  color: string;
  unit?: string;
  data: SensorHistoryDataPoint[];
}

export interface UseMultiSensorHistoryResult {
  series: SensorHistorySeries[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook para buscar histórico de múltiplas variáveis de sensor
 * @param sensorTags - Array de tags de sensores
 * @param assetTag - Tag do asset (ex: CHILLER-001)
 * @param hours - Número de horas de histórico
 * @param refreshInterval - Intervalo de atualização em ms
 */
export function useMultiSensorHistory(
  sensorTags: string[] | undefined,
  assetTag: string | undefined,
  hours: number = 24,
  refreshInterval: number = 60000
): UseMultiSensorHistoryResult {
  const enabled = !!sensorTags && sensorTags.length > 0 && !!assetTag;

  const historyQuery = useQuery({
    queryKey: ['monitor', 'multiSensorHistory', assetTag, hours, sensorTags],
    queryFn: async () => {
      const response = await telemetryService.getHistoryByAsset(
        assetTag!,
        hours,
        sensorTags
      );

      const colors = [
        '#3b82f6', // blue
        '#10b981', // green
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // violet
        '#06b6d4', // cyan
        '#ec4899', // pink
        '#84cc16', // lime
      ];

      return (sensorTags || []).map((tag, index) => {
        const sensorSeries = response.series.find(s => s.sensorId === tag);

        const label = tag.includes('_') ? tag.split('_').slice(1).join('_') : tag;

        const data: SensorHistoryDataPoint[] = sensorSeries?.data.map(point => ({
          timestamp: new Date(point.timestamp),
          value: point.value ?? point.avg_value ?? point.max_value ?? point.min_value ?? 0,
          sensorId: tag
        })) || [];

        return {
          sensorTag: tag,
          label,
          color: colors[index % colors.length],
          data
        };
      });
    },
    enabled,
    refetchInterval: refreshInterval,
    staleTime: refreshInterval,
  });

  const error = enabled
    ? (historyQuery.error instanceof Error ? historyQuery.error.message : historyQuery.error ? 'Erro ao carregar dados' : null)
    : null;

  return {
    series: enabled ? (historyQuery.data ?? []) : [],
    loading: enabled ? historyQuery.isLoading : false,
    error,
  };
}
