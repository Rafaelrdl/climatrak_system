// ============================================================
// ClimaTrak Mobile - Auth Service
// ============================================================

import { api, publicApi, configureApi, getErrorMessage } from './client';
import { secureStorage, tenantStorage, globalStorage } from '@/shared/storage';
import type { 
  User, 
  Tenant, 
  AuthTokens, 
  LoginCredentials, 
  DiscoverTenantResponse 
} from '@/types';

export interface LoginResponse {
  user: User;
  tenant: Tenant;
  tokens: AuthTokens;
}

export const authService = {
  /**
   * Discover tenant by email (Step 1 of login)
   * Returns tenant info if user exists
   */
  async discoverTenant(email: string): Promise<DiscoverTenantResponse> {
    const response = await publicApi.post<DiscoverTenantResponse>(
      '/api/v2/auth/discover-tenant/',
      { email }
    );
    return response.data;
  },

  /**
   * Login to a specific tenant (Step 2 of login)
   * After discovering tenant, user enters password
   */
  async login(
    credentials: LoginCredentials, 
    tenantSlug: string
  ): Promise<LoginResponse> {
    // Configure API for this tenant
    configureApi(tenantSlug);

    const response = await api.post('/api/auth/login/', credentials);
    
    const { user, access, refresh } = response.data;
    
    // Build tokens object
    const tokens: AuthTokens = {
      access_token: access,
      refresh_token: refresh,
    };

    // Build tenant object from response or user
    const tenant: Tenant = {
      id: user.tenant_id,
      slug: tenantSlug,
      name: user.tenant_name || tenantSlug,
      schema_name: user.tenant_schema || tenantSlug,
    };

    // Store tokens securely
    await secureStorage.setTokens(tokens);

    // Store user and tenant info
    tenantStorage.setTenant(tenantSlug);
    await tenantStorage.setUser(user);
    await tenantStorage.setTenantInfo(tenant);

    // Save last tenant for quick login
    await globalStorage.setLastTenantSlug(tenantSlug);

    return { user, tenant, tokens };
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/api/auth/token/refresh/', {
      refresh: refreshToken,
    });

    const { access, refresh } = response.data;
    
    await secureStorage.setTokens({
      access_token: access,
      refresh_token: refresh || refreshToken,
    });

    return access;
  },

  /**
   * Logout - clear all stored data
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate server-side
      await api.post('/api/auth/logout/');
    } catch {
      // Ignore errors - we'll clear local data anyway
    }

    // Clear secure storage (tokens)
    await secureStorage.clearTokens();

    // Clear tenant storage
    await tenantStorage.clear();
    tenantStorage.clearTenant();
  },

  /**
   * Get current logged in user from storage
   */
  async getCurrentUser(): Promise<User | null> {
    return tenantStorage.getUser();
  },

  /**
   * Fetch fresh user data from API
   */
  async fetchCurrentUser(): Promise<User> {
    const response = await api.get<User>('/api/accounts/me/');
    const user = response.data;
    
    // Update stored user
    await tenantStorage.setUser(user);
    
    return user;
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const tokens = await secureStorage.getTokens();
    return tokens !== null;
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await publicApi.post('/api/auth/password/reset/', { email });
  },

  /**
   * Restore session from stored tokens
   * Returns user if session is valid, null otherwise
   */
  async restoreSession(): Promise<{ user: User; tenant: Tenant } | null> {
    try {
      // Check for stored tokens
      const tokens = await secureStorage.getTokens();
      if (!tokens) return null;

      // Get last tenant
      const lastTenantSlug = await globalStorage.getLastTenantSlug();
      if (!lastTenantSlug) return null;

      // Configure API for tenant
      configureApi(lastTenantSlug);
      tenantStorage.setTenant(lastTenantSlug);

      // Try to get stored user first
      const storedUser = await tenantStorage.getUser();
      const storedTenant = await tenantStorage.getTenantInfo();

      if (storedUser && storedTenant) {
        // Verify session is still valid by fetching fresh user data
        try {
          const freshUser = await this.fetchCurrentUser();
          return { user: freshUser, tenant: storedTenant };
        } catch {
          // Token might be expired, try refresh
          try {
            await this.refreshToken();
            const freshUser = await this.fetchCurrentUser();
            return { user: freshUser, tenant: storedTenant };
          } catch {
            // Refresh failed, session is invalid
            await this.logout();
            return null;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  },
};

export default authService;
