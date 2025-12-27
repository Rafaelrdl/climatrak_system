/**
 * Store para configurações de SLA (Service Level Agreement)
 * 
 * Gerencia os tempos de SLA de atendimento e fechamento por prioridade.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SLAConfig {
  /** SLA de atendimento em horas */
  responseTime: number;
  /** SLA de fechamento em horas */
  resolutionTime: number;
}

export interface SLASettings {
  enabled: boolean;
  priorities: {
    CRITICAL: SLAConfig;
    HIGH: SLAConfig;
    MEDIUM: SLAConfig;
    LOW: SLAConfig;
  };
}

interface SLAStore {
  settings: SLASettings;
  setEnabled: (enabled: boolean) => void;
  setSLAConfig: (priority: keyof SLASettings['priorities'], config: SLAConfig) => void;
  setSettings: (settings: SLASettings) => void;
}

const defaultSettings: SLASettings = {
  enabled: false,
  priorities: {
    CRITICAL: { responseTime: 1, resolutionTime: 4 },
    HIGH: { responseTime: 2, resolutionTime: 8 },
    MEDIUM: { responseTime: 4, resolutionTime: 24 },
    LOW: { responseTime: 8, resolutionTime: 48 },
  },
};

export const useSLAStore = create<SLAStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      
      setEnabled: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, enabled },
        })),
      
      setSLAConfig: (priority, config) =>
        set((state) => ({
          settings: {
            ...state.settings,
            priorities: {
              ...state.settings.priorities,
              [priority]: config,
            },
          },
        })),
      
      setSettings: (settings) => set({ settings }),
    }),
    {
      name: 'sla-settings',
    }
  )
);

/**
 * Calcula o status do SLA baseado no tempo decorrido
 */
export function calculateSLAStatus(
  createdAt: string,
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
  settings: SLASettings,
  workOrderStatus?: string
): {
  responseStatus: 'on-time' | 'warning' | 'breached' | 'completed';
  resolutionStatus: 'on-time' | 'warning' | 'breached' | 'completed';
  responseTimeRemaining: number; // em minutos
  resolutionTimeRemaining: number; // em minutos
  responsePercentage: number;
  resolutionPercentage: number;
} {
  const config = settings.priorities[priority];
  const now = new Date();
  const created = new Date(createdAt);
  
  // SLA de Atendimento (tempo até iniciar a OS)
  let responseStatus: 'on-time' | 'warning' | 'breached' | 'completed' = 'on-time';
  let responseTimeRemaining = 0;
  let responsePercentage = 0;
  
  const responseDeadline = new Date(created.getTime() + config.responseTime * 60 * 60 * 1000);
  
  // Considera que a OS foi atendida se tem startedAt OU se está em execução/concluída
  const wasStarted = startedAt || workOrderStatus === 'IN_PROGRESS' || workOrderStatus === 'COMPLETED';
  
  if (wasStarted) {
    // OS já foi iniciada
    // Se temos startedAt, usamos ele; senão, assumimos que foi agora (para OS antigas)
    const started = startedAt ? new Date(startedAt) : now;
    if (started <= responseDeadline) {
      responseStatus = 'completed';
      responsePercentage = 100;
    } else {
      responseStatus = 'breached';
      responsePercentage = 100;
    }
    responseTimeRemaining = 0;
  } else {
    // OS ainda não foi iniciada
    responseTimeRemaining = Math.floor((responseDeadline.getTime() - now.getTime()) / (1000 * 60));
    const totalResponseMinutes = config.responseTime * 60;
    const elapsedMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    responsePercentage = Math.min(100, (elapsedMinutes / totalResponseMinutes) * 100);
    
    if (responseTimeRemaining <= 0) {
      responseStatus = 'breached';
    } else if (responsePercentage >= 75) {
      responseStatus = 'warning';
    }
  }
  
  // SLA de Fechamento (tempo até completar a OS)
  let resolutionStatus: 'on-time' | 'warning' | 'breached' | 'completed' = 'on-time';
  let resolutionTimeRemaining = 0;
  let resolutionPercentage = 0;
  
  const resolutionDeadline = new Date(created.getTime() + config.resolutionTime * 60 * 60 * 1000);
  
  if (completedAt) {
    // OS já foi concluída
    const completed = new Date(completedAt);
    if (completed <= resolutionDeadline) {
      resolutionStatus = 'completed';
      resolutionPercentage = 100;
    } else {
      resolutionStatus = 'breached';
      resolutionPercentage = 100;
    }
    resolutionTimeRemaining = 0;
  } else {
    // OS ainda não foi concluída
    resolutionTimeRemaining = Math.floor((resolutionDeadline.getTime() - now.getTime()) / (1000 * 60));
    const totalResolutionMinutes = config.resolutionTime * 60;
    const elapsedMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    resolutionPercentage = Math.min(100, (elapsedMinutes / totalResolutionMinutes) * 100);
    
    if (resolutionTimeRemaining <= 0) {
      resolutionStatus = 'breached';
    } else if (resolutionPercentage >= 75) {
      resolutionStatus = 'warning';
    }
  }
  
  return {
    responseStatus,
    resolutionStatus,
    responseTimeRemaining,
    resolutionTimeRemaining,
    responsePercentage,
    resolutionPercentage,
  };
}

/**
 * Formata tempo restante em formato legível
 */
export function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) {
    const absMinutes = Math.abs(minutes);
    if (absMinutes < 60) {
      return `${absMinutes}min atrás`;
    }
    const hours = Math.floor(absMinutes / 60);
    if (hours < 24) {
      return `${hours}h atrás`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  }
  
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
