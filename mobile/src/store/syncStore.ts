// ============================================================
// ClimaTrak Mobile - Sync Store (Zustand)
// ============================================================

import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { 
  syncQueueStorage, 
  cacheStorage, 
  tenantStorage 
} from '@/shared/storage';
import { api } from '@/shared/api';
import type { SyncQueueItem } from '@/types';

interface SyncState {
  // State
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncErrors: { id: string; error: string }[];
  
  // Actions
  initialize: () => Promise<void>;
  syncAll: () => Promise<void>;
  syncItem: (item: SyncQueueItem) => Promise<boolean>;
  retryFailed: () => Promise<void>;
  clearSyncErrors: () => void;
  updatePendingCount: () => Promise<void>;
  setOnline: (online: boolean) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  // Initial state
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  syncErrors: [],

  /**
   * Initialize sync store and network listener
   */
  initialize: async () => {
    // Get initial pending count (only if tenant is set)
    try {
      const queue = await syncQueueStorage.getAll();
      set({ pendingCount: queue.length });
    } catch {
      // Tenant not set yet, that's OK
      set({ pendingCount: 0 });
    }

    // On web, assume we're online and use navigator.onLine
    if (Platform.OS === 'web') {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      set({ isOnline });

      // Listen for online/offline events on web
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          const wasOffline = !get().isOnline;
          set({ isOnline: true });
          if (wasOffline) {
            get().syncAll();
          }
        });
        window.addEventListener('offline', () => {
          set({ isOnline: false });
        });
      }
      return;
    }

    // Native: Subscribe to network changes
    NetInfo.addEventListener((state) => {
      const wasOffline = !get().isOnline;
      const isNowOnline = state.isConnected && state.isInternetReachable !== false;

      set({ isOnline: !!isNowOnline });

      // Auto-sync when coming back online
      if (wasOffline && isNowOnline) {
        get().syncAll();
      }
    });

    // Get initial network state (native only)
    try {
      const netState = await NetInfo.fetch();
      set({ 
        isOnline: !!(netState.isConnected && netState.isInternetReachable !== false) 
      });
    } catch {
      // Assume online if we can't check
      set({ isOnline: true });
    }
  },

  /**
   * Sync all pending items
   */
  syncAll: async () => {
    const { isOnline, isSyncing } = get();

    if (!isOnline || isSyncing) {
      return;
    }

    set({ isSyncing: true, syncErrors: [] });

    try {
      let queue: SyncQueueItem[] = [];
      try {
        queue = await syncQueueStorage.getAll();
      } catch {
        // Tenant not set yet
        set({ isSyncing: false });
        return;
      }

      const errors: { id: string; error: string }[] = [];

      for (const item of queue) {
        const success = await get().syncItem(item);
        
        if (!success) {
          errors.push({ 
            id: item.id, 
            error: `Falha ao sincronizar: ${item.entity_type} - ${item.action}` 
          });
        }
      }

      // Update counts
      let remaining: SyncQueueItem[] = [];
      try {
        remaining = await syncQueueStorage.getAll();
      } catch {
        // Ignore
      }
      
      set({
        pendingCount: remaining.length,
        lastSyncAt: new Date().toISOString(),
        syncErrors: errors,
        isSyncing: false,
      });
    } catch (error) {
      console.error('Sync error:', error);
      set({ isSyncing: false });
    }
  },

  /**
   * Sync a single queue item
   */
  syncItem: async (item: SyncQueueItem): Promise<boolean> => {
    try {
      const config: any = {
        method: item.method,
        url: item.endpoint,
        headers: {},
      };

      // Add idempotency key
      if (item.idempotency_key) {
        config.headers['Idempotency-Key'] = item.idempotency_key;
      }

      // Add body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(item.method)) {
        config.data = item.payload;
      }

      await api.request(config);

      // Remove from queue on success
      await syncQueueStorage.remove(item.id);

      return true;
    } catch (error: any) {
      console.error(`Sync item failed: ${item.id}`, error);

      // Check if it's a permanent failure (4xx) vs temporary (5xx/network)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        // Permanent failure - remove from queue
        await syncQueueStorage.remove(item.id);
        
        // 409 Conflict (duplicate) is actually OK for idempotent operations
        if (error.response?.status === 409) {
          return true;
        }
      }

      // Update retry count and backoff
      const updatedItem: SyncQueueItem = {
        ...item,
        retry_count: item.retry_count + 1,
        last_attempt: new Date().toISOString(),
      };

      // Remove if too many retries
      if (updatedItem.retry_count >= 5) {
        await syncQueueStorage.remove(item.id);
        return false;
      }

      // Update in queue
      const queue = await syncQueueStorage.getAll();
      const filtered = queue.filter(q => q.id !== item.id);
      filtered.push(updatedItem);
      await tenantStorage.set('sync_queue', filtered);

      return false;
    }
  },

  /**
   * Retry failed items
   */
  retryFailed: async () => {
    set({ syncErrors: [] });
    await get().syncAll();
  },

  /**
   * Clear sync errors
   */
  clearSyncErrors: () => {
    set({ syncErrors: [] });
  },

  /**
   * Update pending count
   */
  updatePendingCount: async () => {
    try {
      const queue = await syncQueueStorage.getAll();
      set({ pendingCount: queue.length });
    } catch {
      set({ pendingCount: 0 });
    }
  },

  /**
   * Set online status
   */
  setOnline: (online: boolean) => {
    set({ isOnline: online });
  },
}));

// Selectors
export const selectIsOnline = (state: SyncState) => state.isOnline;
export const selectIsSyncing = (state: SyncState) => state.isSyncing;
export const selectPendingCount = (state: SyncState) => state.pendingCount;
export const selectHasPendingSync = (state: SyncState) => state.pendingCount > 0;

export default useSyncStore;
