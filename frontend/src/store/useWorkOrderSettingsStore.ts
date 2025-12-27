/**
 * Store para configurações de Ordens de Serviço
 * 
 * Gerencia os status e tipos de ordens de serviço personalizáveis.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkOrderStatusConfig {
  id: string;
  label: string;
  color: string;
  isDefault?: boolean;
}

export interface WorkOrderTypeConfig {
  id: string;
  label: string;
  color: string;
  isDefault?: boolean;
}

export interface WorkOrderSettings {
  statuses: WorkOrderStatusConfig[];
  types: WorkOrderTypeConfig[];
}

interface WorkOrderSettingsStore {
  settings: WorkOrderSettings;
  addStatus: (status: Omit<WorkOrderStatusConfig, 'id'>) => void;
  removeStatus: (id: string) => void;
  updateStatus: (id: string, status: Partial<WorkOrderStatusConfig>) => void;
  addType: (type: Omit<WorkOrderTypeConfig, 'id'>) => void;
  removeType: (id: string) => void;
  updateType: (id: string, type: Partial<WorkOrderTypeConfig>) => void;
  setSettings: (settings: WorkOrderSettings) => void;
  resetToDefaults: () => void;
}

const defaultStatuses: WorkOrderStatusConfig[] = [
  { id: 'OPEN', label: 'Aberta', color: '#3b82f6', isDefault: true },
  { id: 'IN_PROGRESS', label: 'Em Execução', color: '#f59e0b', isDefault: true },
  { id: 'COMPLETED', label: 'Concluída', color: '#22c55e', isDefault: true },
  { id: 'CANCELLED', label: 'Cancelada', color: '#6b7280', isDefault: true },
];

const defaultTypes: WorkOrderTypeConfig[] = [
  { id: 'PREVENTIVE', label: 'Preventiva', color: '#3b82f6', isDefault: true },
  { id: 'CORRECTIVE', label: 'Corretiva', color: '#ef4444', isDefault: true },
  { id: 'REQUEST', label: 'Solicitação', color: '#8b5cf6', isDefault: true },
];

const defaultSettings: WorkOrderSettings = {
  statuses: defaultStatuses,
  types: defaultTypes,
};

const generateId = () => `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useWorkOrderSettingsStore = create<WorkOrderSettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      
      addStatus: (status) =>
        set((state) => ({
          settings: {
            ...state.settings,
            statuses: [
              ...state.settings.statuses,
              { ...status, id: generateId() },
            ],
          },
        })),
      
      removeStatus: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            statuses: state.settings.statuses.filter(
              (s) => s.id !== id || s.isDefault
            ),
          },
        })),
      
      updateStatus: (id, status) =>
        set((state) => ({
          settings: {
            ...state.settings,
            statuses: state.settings.statuses.map((s) =>
              s.id === id ? { ...s, ...status } : s
            ),
          },
        })),
      
      addType: (type) =>
        set((state) => ({
          settings: {
            ...state.settings,
            types: [
              ...state.settings.types,
              { ...type, id: generateId() },
            ],
          },
        })),
      
      removeType: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            types: state.settings.types.filter(
              (t) => t.id !== id || t.isDefault
            ),
          },
        })),
      
      updateType: (id, type) =>
        set((state) => ({
          settings: {
            ...state.settings,
            types: state.settings.types.map((t) =>
              t.id === id ? { ...t, ...type } : t
            ),
          },
        })),
      
      setSettings: (settings) => set({ settings }),
      
      resetToDefaults: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'work-order-settings',
    }
  )
);
