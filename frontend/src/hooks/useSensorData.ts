import { useState, useEffect } from 'react';
import { assetsService } from '@/apps/monitor/services/assetsService';
import { telemetryService, DeviceHistoryResponse } from '@/apps/monitor/services/telemetryService';
import type { AssetSensor } from '@/apps/monitor/types/asset';

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
  const [data, setData] = useState<UseSensorDataResult>({
    value: null,
    unit: '',
    isOnline: false,
    isLoading: true,
    error: null,
    sensor: null,
    trend: null,
  });

  useEffect(() => {
    if (!sensorTag || !assetId) {
      // Para widgets sem sensor configurado, retornar estado vazio sem erro
      setData({
        value: null,
        unit: '',
        isOnline: false,
        isLoading: false,
        error: null,
        sensor: null,
        trend: null,
      });
      return;
    }

    let isMounted = true;

    const fetchSensorData = async () => {
      try {
        if (!isMounted) return;
        
        setData(prev => ({ ...prev, isLoading: prev.value === null, error: null }));
        
        // Buscar todos os sensores do asset
        const sensors = await assetsService.getSensors(assetId);
        
        // Encontrar sensor específico pela tag
        const targetSensor = sensors.find(s => s.tag === sensorTag);
        
        if (!targetSensor) {
          if (!isMounted) return;
          setData({
            value: null,
            unit: '',
            isOnline: false,
            isLoading: false,
            error: `Sensor ${sensorTag} não encontrado`,
            sensor: null,
            trend: null,
          });
          return;
        }
        
        // Buscar histórico para calcular tendência (últimas 6 horas)
        let trend: TrendData | null = null;
        try {
          const assetTag = targetSensor.asset_tag;
          const deviceId = targetSensor.device_mqtt_client_id;
          

          
          let history: DeviceHistoryResponse | null = null;
          
          // Tentar primeiro pelo asset_tag
          if (assetTag) {
            history = await telemetryService.getHistoryByAsset(
              assetTag,
              6, // 6 horas de histórico para ter mais dados
              [sensorTag],
              '5m' // Intervalo de 5 minutos
            );
          }
          
          // Se não retornou dados, tentar pelo device_id
          if ((!history || history.series.length === 0) && deviceId) {

            history = await telemetryService.getHistoryByDevice(
              deviceId,
              6,
              [sensorTag],
              '5m'
            );
          }
          
          if (history) {

            
            // Tentar encontrar série pelo sensorTag ou pelo nome do sensor
            let sensorSeries = history.series.find(s => 
              s.sensorId === sensorTag || 
              s.sensorId === targetSensor.tag ||
              s.sensorId === targetSensor.name
            );
            
            // Se não encontrou, pegar a primeira série disponível
            if (!sensorSeries && history.series.length > 0) {
              sensorSeries = history.series[0];

            }
            

            
            if (sensorSeries && sensorSeries.data.length >= 2) {
              trend = calculateTrend(sensorSeries.data);

            } else {
              console.warn('📊 Dados insuficientes para calcular tendência:', sensorSeries?.data?.length || 0, 'pontos');
            }
          }
        } catch (historyError) {
          console.warn('Não foi possível carregar histórico para tendência:', historyError);
        }
        
        if (!isMounted) return;
        
        setData({
          value: targetSensor.last_value,
          unit: targetSensor.unit || '',
          isOnline: targetSensor.is_online,
          isLoading: false,
          error: null,
          sensor: targetSensor,
          trend,
        });
        
      } catch (error: any) {
        console.error('❌ Erro ao buscar dados do sensor:', error);
        if (!isMounted) return;
        
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Erro ao carregar dados do sensor',
        }));
      }
    };

    fetchSensorData();
    
    // Configurar refresh automático
    const intervalId = setInterval(fetchSensorData, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [sensorTag, assetId, refreshInterval]);

  return data;
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
  color: string;
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
  const [result, setResult] = useState<UseMultiSensorHistoryResult>({
    series: [],
    loading: false,
    error: null
  });

  useEffect(() => {
    if (!sensorTags || sensorTags.length === 0 || !assetTag) {

      setResult({
        series: [],
        loading: false,
        error: null
      });
      return;
    }



    let isMounted = true;
    let hasData = false;

    const fetchHistory = async () => {
      if (!hasData) {
        setResult(prev => ({ ...prev, loading: true, error: null }));
      }

      try {


        // Buscar histórico usando assetTag diretamente
        const response = await telemetryService.getHistoryByAsset(
          assetTag,
          hours,
          sensorTags
        );



        if (!isMounted) return;

        // Cores para as séries
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

        // Mapear séries
        const series: SensorHistorySeries[] = sensorTags.map((tag, index) => {
          const sensorSeries = response.series.find(s => s.sensorId === tag);
          
          // Extrair nome da variável (remover MAC)
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

        hasData = series.some(s => s.data.length > 0);
        


        
        setResult({
          series,
          loading: false,
          error: null
        });
        

      } catch (error) {
        if (!isMounted) return;
        console.error('❌ Erro ao buscar histórico dos sensores:', error);
        setResult({
          series: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Erro ao carregar dados'
        });
      }
    };

    fetchHistory();

    const interval = setInterval(fetchHistory, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sensorTags?.join(','), assetTag, hours, refreshInterval]);

  return result;
}
