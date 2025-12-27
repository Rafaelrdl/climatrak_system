/**
 * Componentes de Gráficos com ECharts
 * 
 * Componentes reutilizáveis para visualização de dados com ECharts.
 */

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// ============================================
// Types Locais (para não depender de @/types/metrics)
// ============================================

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface DistributionItem {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

export interface HeatmapData {
  x_axis: string[];
  y_axis: string[];
  data: [number, number, number][];
  min: number;
  max: number;
}

// ============================================
// Cores do Tema
// ============================================

export const chartColors = {
  primary: '#0d9488',
  secondary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#6b7280',
  
  // Paleta para séries múltiplas
  palette: [
    '#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#10b981',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
  ],
  
  // Gradientes
  gradient: {
    primary: ['#0d9488', '#14b8a6'],
    success: ['#10b981', '#34d399'],
    warning: ['#f59e0b', '#fbbf24'],
    danger: ['#ef4444', '#f87171'],
  },
};

// ============================================
// Configurações Base
// ============================================

const baseConfig: Partial<EChartsOption> = {
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true,
  },
};

// ============================================
// Line Chart
// ============================================

interface LineChartProps {
  data: TrendDataPoint[];
  title?: string;
  unit?: string;
  color?: string;
  showArea?: boolean;
  height?: number | string;
  smooth?: boolean;
}

export function LineChart({
  data,
  title,
  unit = '',
  color = chartColors.primary,
  showArea = true,
  height = 300,
  smooth = true,
}: LineChartProps) {
  const option: EChartsOption = {
    ...baseConfig,
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 14,
        fontWeight: 500,
        color: '#374151',
      },
    } : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#374151' },
      formatter: (params: unknown) => {
        const p = Array.isArray(params) ? params[0] : params;
        const param = p as { axisValue: string; value: number };
        return `${param.axisValue}<br/><strong>${param.value?.toFixed(2)} ${unit}</strong>`;
      },
    },
    xAxis: {
      type: 'category',
      data: data.map(d => {
        const date = new Date(d.date + 'T12:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      }),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { 
        color: '#6b7280', 
        fontSize: 11,
        formatter: `{value} ${unit}`,
      },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
    },
    series: [{
      type: 'line',
      data: data.map(d => d.value),
      smooth,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color, width: 2 },
      itemStyle: { color },
      areaStyle: showArea ? {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '40' },
            { offset: 1, color: color + '05' },
          ],
        },
      } : undefined,
    }],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}

// ============================================
// Multi-Line Chart
// ============================================

interface MultiLineChartProps {
  series: {
    name: string;
    data: TrendDataPoint[];
    color?: string;
  }[];
  title?: string;
  unit?: string;
  height?: number | string;
  showLegend?: boolean;
}

export function MultiLineChart({
  series,
  title,
  unit = '',
  height = 300,
  showLegend = true,
}: MultiLineChartProps) {
  // Usar datas da primeira série
  const dates = series[0]?.data.map(d => {
    const date = new Date(d.date + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }) || [];

  const option: EChartsOption = {
    ...baseConfig,
    title: title ? {
      text: title,
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500, color: '#374151' },
    } : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
    },
    legend: showLegend ? {
      data: series.map(s => s.name),
      bottom: 0,
      textStyle: { color: '#6b7280', fontSize: 11 },
    } : undefined,
    grid: {
      ...baseConfig.grid,
      bottom: showLegend ? '15%' : '3%',
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11, formatter: `{value} ${unit}` },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
    },
    series: series.map((s, i) => ({
      name: s.name,
      type: 'line' as const,
      data: s.data.map(d => d.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { color: s.color || chartColors.palette[i], width: 2 },
      itemStyle: { color: s.color || chartColors.palette[i] },
    })),
  };

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}

// ============================================
// Pie Chart
// ============================================

interface PieChartProps {
  data: DistributionItem[];
  title?: string;
  height?: number | string;
  showLegend?: boolean;
  donut?: boolean;
}

export function PieChart({
  data,
  title,
  height = 300,
  showLegend = true,
  donut = false,
}: PieChartProps) {
  const option: EChartsOption = {
    ...baseConfig,
    title: title ? {
      text: title,
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500, color: '#374151' },
    } : undefined,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: showLegend ? {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#6b7280', fontSize: 11 },
    } : undefined,
    series: [{
      type: 'pie',
      radius: donut ? ['40%', '70%'] : '70%',
      center: showLegend ? ['35%', '50%'] : ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: !showLegend,
        formatter: '{b}: {d}%',
        color: '#374151',
        fontSize: 11,
      },
      labelLine: { show: !showLegend },
      emphasis: {
        label: { show: true, fontWeight: 'bold' },
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.2)' },
      },
      data: data.map((d, i) => ({
        name: d.name,
        value: d.value,
        itemStyle: { color: d.color || chartColors.palette[i] },
      })),
    }],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}

// ============================================
// Bar Chart
// ============================================

interface BarChartProps {
  data: DistributionItem[];
  title?: string;
  unit?: string;
  height?: number | string;
  horizontal?: boolean;
  showValues?: boolean;
}

export function BarChart({
  data,
  title,
  unit = '',
  height = 300,
  horizontal = false,
  showValues = true,
}: BarChartProps) {
  const categoryAxis = {
    type: 'category' as const,
    data: data.map(d => d.name),
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    axisLabel: { color: '#6b7280', fontSize: 11 },
    axisTick: { show: false },
  };

  const valueAxis = {
    type: 'value' as const,
    axisLine: { show: false },
    axisLabel: { color: '#6b7280', fontSize: 11, formatter: `{value} ${unit}` },
    splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' as const } },
  };

  const option: EChartsOption = {
    ...baseConfig,
    title: title ? {
      text: title,
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500, color: '#374151' },
    } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
    },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: [{
      type: 'bar',
      data: data.map((d, i) => ({
        value: d.value,
        itemStyle: {
          color: d.color || chartColors.palette[i],
          borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
        },
      })),
      barWidth: '60%',
      label: showValues ? {
        show: true,
        position: horizontal ? 'right' : 'top',
        color: '#374151',
        fontSize: 11,
        formatter: `{c} ${unit}`,
      } : undefined,
    }],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}

// ============================================
// Gauge Chart
// ============================================

interface GaugeChartProps {
  value: number;
  title?: string;
  max?: number;
  height?: number | string;
  thresholds?: { value: number; color: string }[];
  unit?: string;
}

export function GaugeChart({
  value,
  title,
  max = 100,
  height = 200,
  thresholds,
  unit = '%',
}: GaugeChartProps) {
  const defaultThresholds = [
    { value: 30, color: chartColors.danger },
    { value: 70, color: chartColors.warning },
    { value: 100, color: chartColors.success },
  ];

  const axisLine = (thresholds || defaultThresholds).map((t, i, arr) => {
    const prev = i === 0 ? 0 : arr[i - 1].value;
    return [(t.value - prev) / max, t.color];
  });

  const option: EChartsOption = {
    ...baseConfig,
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max,
      pointer: { show: false },
      progress: {
        show: true,
        width: 18,
        itemStyle: {
          color: value < 30 ? chartColors.danger : value < 70 ? chartColors.warning : chartColors.success,
        },
      },
      axisLine: {
        lineStyle: {
          width: 18,
          color: axisLine as [number, string][],
          opacity: 0.2,
        },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: {
        show: !!title,
        offsetCenter: [0, '70%'],
        color: '#6b7280',
        fontSize: 12,
      },
      detail: {
        valueAnimation: true,
        offsetCenter: [0, '0%'],
        formatter: `{value}${unit}`,
        color: '#374151',
        fontSize: 24,
        fontWeight: 600,
      },
      data: [{ value, name: title || '' }],
    }],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}

// ============================================
// Heatmap Chart
// ============================================

interface HeatmapChartProps {
  data: HeatmapData;
  title?: string;
  height?: number | string;
}

export function HeatmapChart({
  data,
  title,
  height = 300,
}: HeatmapChartProps) {
  const option: EChartsOption = {
    ...baseConfig,
    title: title ? {
      text: title,
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500, color: '#374151' },
    } : undefined,
    tooltip: {
      position: 'top',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '15%',
    },
    xAxis: {
      type: 'category',
      data: data.x_axis,
      splitArea: { show: true },
      axisLine: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: data.y_axis,
      splitArea: { show: true },
      axisLine: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    visualMap: {
      min: data.min,
      max: data.max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#f0fdf4', '#86efac', '#22c55e', '#15803d', '#14532d'],
      },
      textStyle: { color: '#6b7280', fontSize: 10 },
    },
    series: [{
      type: 'heatmap',
      data: data.data,
      label: {
        show: true,
        color: '#374151',
        fontSize: 10,
      },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.3)' },
      },
    }],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}

// ============================================
// Radar Chart
// ============================================

interface RadarChartProps {
  indicators: { name: string; max: number }[];
  data: { name: string; values: number[]; color?: string }[];
  title?: string;
  height?: number | string;
}

export function RadarChart({
  indicators,
  data,
  title,
  height = 300,
}: RadarChartProps) {
  const option: EChartsOption = {
    ...baseConfig,
    title: title ? {
      text: title,
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500, color: '#374151' },
    } : undefined,
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
    },
    legend: {
      data: data.map(d => d.name),
      bottom: 0,
      textStyle: { color: '#6b7280', fontSize: 11 },
    },
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#6b7280', fontSize: 11 },
      splitLine: { lineStyle: { color: '#e5e7eb' } },
      splitArea: { show: true, areaStyle: { color: ['#fff', '#f9fafb'] } },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    series: [{
      type: 'radar',
      data: data.map((d, i) => ({
        name: d.name,
        value: d.values,
        itemStyle: { color: d.color || chartColors.palette[i] },
        areaStyle: { opacity: 0.2 },
        lineStyle: { width: 2 },
      })),
    }],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
