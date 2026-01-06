// ============================================================
// ClimaTrak Mobile - Secure Storage Service
// Uses expo-secure-store for sensitive data (tokens) on native
// Uses localStorage as fallback for web
// Uses AsyncStorage for general data (namespaced by tenant)
// ============================================================

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { AuthTokens, User, Tenant, SyncQueueItem } from '@/types';

// ==================== Platform-aware Secure Storage ====================
// SecureStore doesn't work on web, so we use localStorage as fallback
const isWeb = Platform.OS === 'web';

const webStorage = {
  async setItemAsync(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  async getItemAsync(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  async deleteItemAsync(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
};

// Use web storage on web, SecureStore on native
const storage = isWeb ? webStorage : SecureStore;

// ==================== Secure Storage (Tokens) ====================
const SECURE_KEYS = {
  ACCESS_TOKEN: 'climatrak_access_token',
  REFRESH_TOKEN: 'climatrak_refresh_token',
} as const;

export const secureStorage = {
  async setTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      storage.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, tokens.access_token),
      storage.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, tokens.refresh_token),
    ]);
  },

  async getTokens(): Promise<AuthTokens | null> {
    const [access_token, refresh_token] = await Promise.all([
      storage.getItemAsync(SECURE_KEYS.ACCESS_TOKEN),
      storage.getItemAsync(SECURE_KEYS.REFRESH_TOKEN),
    ]);

    if (!access_token || !refresh_token) {
      return null;
    }

    return { access_token, refresh_token };
  },

  async getAccessToken(): Promise<string | null> {
    return storage.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return storage.getItemAsync(SECURE_KEYS.REFRESH_TOKEN);
  },

  async setAccessToken(token: string): Promise<void> {
    await storage.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, token);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      storage.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN),
      storage.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN),
    ]);
  },

  // Alias for compatibility
  async clearAll(): Promise<void> {
    return this.clearTokens();
  },
};

// ==================== Tenant-Namespaced Storage ====================
// All keys are prefixed with tenant slug to isolate data

class TenantStorage {
  private tenantSlug: string | null = null;

  setTenant(slug: string): void {
    this.tenantSlug = slug;
  }

  getTenant(): string | null {
    return this.tenantSlug;
  }

  clearTenant(): void {
    this.tenantSlug = null;
  }

  private getKey(key: string): string {
    // Use a default namespace if tenant not set yet
    const prefix = this.tenantSlug ? `tenant:${this.tenantSlug}` : 'tenant:_default';
    return `${prefix}:${key}`;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const storageKey = this.getKey(key);
    await AsyncStorage.setItem(storageKey, JSON.stringify(value));
  }

  async get<T>(key: string): Promise<T | null> {
    const storageKey = this.getKey(key);
    const value = await AsyncStorage.getItem(storageKey);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    const storageKey = this.getKey(key);
    await AsyncStorage.removeItem(storageKey);
  }

  async clear(): Promise<void> {
    if (!this.tenantSlug) return;
    
    const allKeys = await AsyncStorage.getAllKeys();
    const tenantKeys = allKeys.filter(k => k.startsWith(`tenant:${this.tenantSlug}:`));
    await AsyncStorage.multiRemove(tenantKeys);
  }

  // === User Data ===
  async setUser(user: User): Promise<void> {
    await this.set('user', user);
  }

  async getUser(): Promise<User | null> {
    return this.get<User>('user');
  }

  // === Tenant Info ===
  async setTenantInfo(tenant: Tenant): Promise<void> {
    await this.set('tenant_info', tenant);
  }

  async getTenantInfo(): Promise<Tenant | null> {
    return this.get<Tenant>('tenant_info');
  }
}

export const tenantStorage = new TenantStorage();

// ==================== Global Storage (Non-tenant specific) ====================
const GLOBAL_KEYS = {
  LAST_TENANT_SLUG: 'climatrak_last_tenant_slug',
  DEVICE_ID: 'climatrak_device_id',
  ONBOARDING_COMPLETE: 'climatrak_onboarding_complete',
} as const;

export const globalStorage = {
  async setLastTenantSlug(slug: string): Promise<void> {
    await AsyncStorage.setItem(GLOBAL_KEYS.LAST_TENANT_SLUG, slug);
  },

  async getLastTenantSlug(): Promise<string | null> {
    return AsyncStorage.getItem(GLOBAL_KEYS.LAST_TENANT_SLUG);
  },

  async setDeviceId(deviceId: string): Promise<void> {
    await AsyncStorage.setItem(GLOBAL_KEYS.DEVICE_ID, deviceId);
  },

  async getDeviceId(): Promise<string | null> {
    return AsyncStorage.getItem(GLOBAL_KEYS.DEVICE_ID);
  },

  async setOnboardingComplete(complete: boolean): Promise<void> {
    await AsyncStorage.setItem(GLOBAL_KEYS.ONBOARDING_COMPLETE, String(complete));
  },

  async isOnboardingComplete(): Promise<boolean> {
    const value = await AsyncStorage.getItem(GLOBAL_KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  },
};

// ==================== Sync Queue Storage ====================
const SYNC_QUEUE_KEY = 'sync_queue';

export const syncQueueStorage = {
  async getQueue(): Promise<SyncQueueItem[]> {
    const queue = await tenantStorage.get<SyncQueueItem[]>(SYNC_QUEUE_KEY);
    return queue || [];
  },

  // Alias for compatibility
  async getAll(): Promise<SyncQueueItem[]> {
    return this.getQueue();
  },

  async addToQueue(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retry_count' | 'status'>): Promise<SyncQueueItem> {
    const queue = await this.getQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      retry_count: 0,
      status: 'pending',
    };
    queue.push(newItem);
    await tenantStorage.set(SYNC_QUEUE_KEY, queue);
    return newItem;
  },

  // Alias for compatibility - add is the same as addToQueue
  async add(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retry_count' | 'status'>): Promise<SyncQueueItem> {
    return this.addToQueue(item);
  },

  async updateItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex(item => item.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      await tenantStorage.set(SYNC_QUEUE_KEY, queue);
    }
  },

  async removeItem(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(item => item.id !== id);
    await tenantStorage.set(SYNC_QUEUE_KEY, filtered);
  },

  // Alias for compatibility
  async remove(id: string): Promise<void> {
    return this.removeItem(id);
  },

  async getPendingItems(): Promise<SyncQueueItem[]> {
    const queue = await this.getQueue();
    return queue.filter(item => item.status === 'pending' || item.status === 'failed');
  },

  async getFailedItems(): Promise<SyncQueueItem[]> {
    const queue = await this.getQueue();
    return queue.filter(item => item.status === 'failed');
  },

  async clearCompleted(): Promise<void> {
    const queue = await this.getQueue();
    const pending = queue.filter(item => item.status !== 'completed');
    await tenantStorage.set(SYNC_QUEUE_KEY, pending);
  },

  async clearAll(): Promise<void> {
    await tenantStorage.remove(SYNC_QUEUE_KEY);
  },
};

// ==================== Cache Storage ====================
const CACHE_PREFIX = 'cache:';
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export const cacheStorage = {
  async set<T>(key: string, data: T, ttl: number = DEFAULT_CACHE_TTL): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    await tenantStorage.set(`${CACHE_PREFIX}${key}`, entry);
  },

  async get<T>(key: string): Promise<T | null> {
    const entry = await tenantStorage.get<CacheEntry<T>>(`${CACHE_PREFIX}${key}`);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      await this.remove(key);
      return null;
    }

    return entry.data;
  },

  async remove(key: string): Promise<void> {
    await tenantStorage.remove(`${CACHE_PREFIX}${key}`);
  },

  async clearAll(): Promise<void> {
    if (!tenantStorage.getTenant()) return;
    
    const allKeys = await AsyncStorage.getAllKeys();
    const tenantSlug = tenantStorage.getTenant();
    const cacheKeys = allKeys.filter(
      k => k.startsWith(`tenant:${tenantSlug}:${CACHE_PREFIX}`)
    );
    await AsyncStorage.multiRemove(cacheKeys);
  },
};
