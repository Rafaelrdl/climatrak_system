/**
 * Overview Store - Gerencia widgets do dashboard customizável
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DashboardWidget, WidgetType } from '../types/dashboard';

interface OverviewState {
  widgets: DashboardWidget[];
  editMode: boolean;
  
  // Actions
  addWidget: (widgetType: WidgetType, title: string) => void;
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void;
  removeWidget: (widgetId: string) => void;
  reorderWidgets: (widgets: DashboardWidget[]) => void;
  setEditMode: (editMode: boolean) => void;
  resetToDefault: () => void;
}

// Widgets padrão para Visão Geral
const defaultWidgets: DashboardWidget[] = [
  // Linha 1: KPIs principais
  {
    id: 'overview-uptime',
    type: 'card-kpi',
    title: 'Uptime Dispositivos',
    size: 'col-1',
    position: { x: 0, y: 0 },
    config: {
      label: 'Uptime Dispositivos',
      unit: '%',
      color: '#10b981',
      icon: 'activity',
      decimals: 1
    }
  },
  {
    id: 'overview-active-alerts',
    type: 'card-kpi',
    title: 'Ativos com Alerta',
    size: 'col-1',
    position: { x: 1, y: 0 },
    config: {
      label: 'Ativos com Alerta',
      unit: '',
      color: '#f59e0b',
      icon: 'alert',
      decimals: 0
    }
  },
  {
    id: 'overview-consumption',
    type: 'card-kpi',
    title: 'Consumo Hoje',
    size: 'col-1',
    position: { x: 2, y: 0 },
    config: {
      label: 'Consumo Hoje',
      unit: 'kWh',
      color: '#10b981',
      icon: 'energy',
      decimals: 0
    }
  },
  {
    id: 'overview-health-score',
    type: 'card-kpi',
    title: 'Saúde Média HVAC',
    size: 'col-1',
    position: { x: 3, y: 0 },
    config: {
      label: 'Saúde Média HVAC',
      unit: '%',
      color: '#f59e0b',
      icon: 'health',
      decimals: 1
    }
  },
  {
    id: 'overview-mtbf',
    type: 'card-kpi',
    title: 'MTBF',
    size: 'col-1',
    position: { x: 4, y: 0 },
    config: {
      label: 'MTBF',
      unit: 'h',
      color: '#10b981',
      icon: 'clock',
      decimals: 0
    }
  },
  {
    id: 'overview-mttr',
    type: 'card-kpi',
    title: 'MTTR',
    size: 'col-1',
    position: { x: 5, y: 0 },
    config: {
      label: 'MTTR',
      unit: 'h',
      color: '#ef4444',
      icon: 'wrench',
      decimals: 1
    }
  },

  // Linha 2: Gráficos
  {
    id: 'overview-consumption-bar',
    type: 'chart-bar',
    title: 'Consumo por Equipamento',
    size: 'col-3',
    position: { x: 0, y: 1 },
    config: {
      label: 'Consumo Energético (kWh)',
      chartType: 'bar',
      timeRange: '24h',
      showLegend: true
    }
  },
  {
    id: 'overview-consumption-trend',
    type: 'chart-line',
    title: 'Histórico de Consumo',
    size: 'col-3',
    position: { x: 3, y: 1 },
    config: {
      label: 'Consumo ao Longo do Tempo',
      chartType: 'line',
      timeRange: '7d',
      showLegend: true
    }
  },

  // Linha 3: Tabela de alertas
  {
    id: 'overview-alerts-table',
    type: 'table-alerts',
    title: 'Últimos Alertas',
    size: 'col-6',
    position: { x: 0, y: 2 },
    config: {
      label: 'Alertas Mais Recentes',
      showIcon: true,
    }
  },
];

export const useOverviewStore = create<OverviewState>()(
  persist(
    (set) => ({
      widgets: defaultWidgets,
      editMode: false,

      addWidget: (widgetType, title) => {
        const newWidget: DashboardWidget = {
          id: `widget-${Date.now()}`,
          type: widgetType,
          title,
          size: 'col-2',
          position: { x: 0, y: 0 },
          config: {}
        };
        set((state) => ({ widgets: [...state.widgets, newWidget] }));
      },

      updateWidget: (widgetId, updates) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === widgetId ? { ...w, ...updates } : w
          )
        }));
      },

      removeWidget: (widgetId) => {
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== widgetId)
        }));
      },

      reorderWidgets: (widgets) => {
        set({ widgets });
      },

      setEditMode: (editMode) => {
        set({ editMode });
      },

      resetToDefault: () => {
        set({ widgets: defaultWidgets, editMode: false });
      }
    }),
    {
      name: 'monitor-overview-store'
    }
  )
);
