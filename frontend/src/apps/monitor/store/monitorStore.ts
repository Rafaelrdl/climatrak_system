/**
 * Store do módulo Monitor
 * 
 * Gerencia o estado global do módulo de monitoramento IoT
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Site } from '../types/site';

interface MonitorState {
  // Site management
  availableSites: Site[];
  currentSite: Site | null;
  isLoadingSites: boolean;
  
  // UI state
  selectedDeviceId: number | null;
  selectedTimeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  sidebarCollapsed: boolean;
  
  // Actions
  setSites: (sites: Site[]) => void;
  setCurrentSite: (site: Site | null) => void;
  setLoadingSites: (loading: boolean) => void;
  setSelectedDevice: (deviceId: number | null) => void;
  setTimeRange: (range: MonitorState['selectedTimeRange']) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set) => ({
      // Initial state
      availableSites: [],
      currentSite: null,
      isLoadingSites: false,
      selectedDeviceId: null,
      selectedTimeRange: '24h',
      sidebarCollapsed: false,
      
      // Actions
      setSites: (sites) => set({ availableSites: sites }),
      setCurrentSite: (site) => set({ currentSite: site }),
      setLoadingSites: (loading) => set({ isLoadingSites: loading }),
      setSelectedDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
      setTimeRange: (range) => set({ selectedTimeRange: range }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'monitor-storage',
      partialize: (state) => ({
        currentSite: state.currentSite,
        selectedTimeRange: state.selectedTimeRange,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
