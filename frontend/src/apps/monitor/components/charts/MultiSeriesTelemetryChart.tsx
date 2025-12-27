/**
 * MultiSeriesTelemetryChart - Gráfico de séries temporais
 * 
 * Exibe múltiplas séries de dados de telemetria usando ECharts.
 */

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface TelemetrySeries {
  sensorId: string;
  sensorName?: string;
  metricType?: string;
  unit?: string;
  data: Array<{
    timestamp: string;
    value: number;
  }>;
}

interface MultiSeriesTelemetryChartProps {
  data: TelemetrySeries[];
}

// Cores para diferentes séries
const COLORS = [
  '#0088FE', // Azul
  '#00C49F', // Verde
  '#FFBB28', // Amarelo
  '#FF8042', // Laranja
  '#8884D8', // Roxo
  '#82CA9D', // Verde claro
  '#FF6B6B', // Vermelho
  '#4ECDC4', // Turquesa
];

export function MultiSeriesTelemetryChart({ data }: MultiSeriesTelemetryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Inicializar instância do ECharts
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    if (!data || data.length === 0) {
      chartInstanceRef.current.clear();
      return;
    }

    // Coletar todos os timestamps únicos
    const allTimestamps = new Set<string>();
    data.forEach(series => {
      series.data.forEach(point => {
        allTimestamps.add(point.timestamp);
      });
    });

    // Ordenar timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort();

    // Formatar timestamps para exibição
    const formattedTimestamps = sortedTimestamps.map(timestamp => {
      const date = new Date(timestamp);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // Preparar séries para ECharts
    const series = data.map((serie, index) => {
      // Criar mapa de valores por timestamp
      const valueMap = new Map(
        serie.data.map(point => [point.timestamp, point.value])
      );

      // Criar array de valores alinhado com timestamps
      const values = sortedTimestamps.map(ts => valueMap.get(ts) ?? null);

      return {
        name: serie.sensorName || serie.sensorId,
        type: 'line' as const,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        data: values,
        itemStyle: {
          color: COLORS[index % COLORS.length]
        },
        lineStyle: {
          width: 2
        },
        connectNulls: true
      };
    });

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#ddd',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: 12
        }
      },
      legend: {
        data: series.map(s => s.name),
        bottom: 10,
        textStyle: {
          fontSize: 12
        }
      },
      grid: {
        left: '60px',
        right: '30px',
        bottom: '60px',
        top: '20px',
        containLabel: false
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: formattedTimestamps,
        axisLabel: {
          fontSize: 11,
          color: '#666',
          rotate: 45
        },
        axisLine: {
          lineStyle: {
            color: '#ddd'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 11,
          color: '#666'
        },
        splitLine: {
          lineStyle: {
            color: '#eee',
            type: 'dashed'
          }
        },
        axisLine: {
          lineStyle: {
            color: '#ddd'
          }
        }
      },
      series: series
    };

    chartInstanceRef.current.setOption(option, { notMerge: true });

    // Resize handler
    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        Nenhum dado para exibir
      </div>
    );
  }

  return (
    <div ref={chartRef} className="h-80 w-full" />
  );
}
