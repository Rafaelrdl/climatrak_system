// ============================================================
// ClimaTrak Mobile - Auth Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { authService, configureApi } from '@/shared/api';
import { secureStorage, tenantStorage, globalStorage } from '@/shared/storage';
import type { User, Tenant } from '@/types';

interface AuthState {
  // State
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;

  // Actions
  discoverTenant: (email: string) => Promise<Tenant>;
  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoring: true, // Start as true to check session on app load
  error: null,

  /**
   * Step 1: Discover tenant by email
   */
  discoverTenant: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.discoverTenant(email);
      
      const tenant: Tenant = {
        id: response.tenant_id,
        name: response.tenant_name,
        slug: response.tenant_slug,
        schema_name: response.tenant_slug, // Use slug as schema_name when not provided
      };

      set({ tenant, isLoading: false });
      
      return tenant;
    } catch (error: any) {
      const message = error.response?.data?.detail || 
        error.message || 
        'Não foi possível encontrar sua organização';
      
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  /**
   * Step 2: Login with credentials
   */
  login: async (email: string, password: string, tenantSlug: string) => {
    console.log('[AuthStore] login called:', { email, tenantSlug });
    set({ isLoading: true, error: null });

    try {
      console.log('[AuthStore] Calling authService.login...');
      const { user, tokens } = await authService.login(
        { email, password },
        tenantSlug
      );
      console.log('[AuthStore] authService.login success');

      // Configure API with tenant
      configureApi(tenantSlug);

      // Get tenant info (might already have from discover)
      const currentTenant = get().tenant || {
        id: user.tenant_id || '',
        name: user.tenant_name || tenantSlug,
        slug: tenantSlug,
        schema_name: user.tenant_schema || tenantSlug,
      };

      // Save last tenant for quick login
      await globalStorage.setLastTenantSlug(tenantSlug);

      console.log('[AuthStore] Setting isAuthenticated: true');
      set({
        user,
        tenant: currentTenant,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const message = error.response?.data?.detail || 
        error.response?.data?.non_field_errors?.[0] ||
        error.message || 
        'Email ou senha incorretos';
      
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  /**
   * Logout: Clear all auth data
   */
  logout: async () => {
    set({ isLoading: true });

    try {
      await authService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    }

    // Clear state
    set({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  /**
   * Restore session from stored tokens
   */
  restoreSession: async () => {
    set({ isRestoring: true });

    try {
      const result = await authService.restoreSession();

      if (result) {
        const { user, tenant } = result;

        // Configure API with tenant
        configureApi(tenant.slug);

        set({
          user,
          tenant,
          isAuthenticated: true,
          isRestoring: false,
          error: null,
        });

        return true;
      }

      set({ isRestoring: false });
      return false;
    } catch (error) {
      console.error('Session restore error:', error);
      
      // Clear any invalid tokens
      await secureStorage.clearAll();
      
      set({
        user: null,
        tenant: null,
        isAuthenticated: false,
        isRestoring: false,
        error: null,
      });
      
      return false;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Set loading state (for external use)
   */
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));

// Selectors for common use cases
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectUser = (state: AuthState) => state.user;
export const selectTenant = (state: AuthState) => state.tenant;
export const selectIsLoading = (state: AuthState) => state.isLoading || state.isRestoring;
export const selectError = (state: AuthState) => state.error;

export default useAuthStore;
