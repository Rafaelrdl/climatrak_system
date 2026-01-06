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
    interface BackendDiscoverResponse {
      found: boolean;
      email: string;
      primary_tenant: {
        schema_name: string;
        slug: string;
        name: string;
        domain?: string;
      };
      has_multiple_tenants: boolean;
    }
    
    const response = await publicApi.post<BackendDiscoverResponse>(
      '/api/v2/auth/discover-tenant/',
      { email }
    );
    
    const data = response.data;
    
    if (!data.found || !data.primary_tenant) {
      throw new Error('Usuário não encontrado');
    }
    
    // Transform backend response to expected format
    return {
      tenant_id: data.primary_tenant.schema_name,
      tenant_slug: data.primary_tenant.slug,
      tenant_name: data.primary_tenant.name,
    };
  },

  /**
   * Login to a specific tenant (Step 2 of login)
   * After discovering tenant, user enters password
   * Uses mobile-specific endpoint that returns tokens in body
   */
  async login(
    credentials: LoginCredentials, 
    tenantSlug: string
  ): Promise<LoginResponse> {
    // Use mobile-specific endpoint that returns tokens in body
    const response = await publicApi.post('/api/v2/auth/mobile/login/', {
      ...credentials,
      schema_name: tenantSlug, // Pass tenant to avoid multiple-tenant flow
    });
    
    const data = response.data;
    
    if (!data.success) {
      throw new Error(data.error || 'Email ou senha incorretos');
    }
    
    // Handle multiple tenants case
    if (data.requires_tenant_selection) {
      // Find the tenant that matches tenantSlug
      const matchingTenant = data.tenants.find(
        (t: any) => t.slug === tenantSlug || t.schema_name === tenantSlug
      );
      
      if (matchingTenant) {
        // Re-login with specific tenant selected
        const selectResponse = await publicApi.post('/api/v2/auth/mobile/select-tenant/', {
          ...credentials,
          schema_name: matchingTenant.schema_name,
        });
        
        if (!selectResponse.data.success) {
          throw new Error(selectResponse.data.error || 'Falha ao selecionar tenant');
        }
        
        return this.processLoginResponse(selectResponse.data, tenantSlug);
      }
      
      throw new Error('Tenant não encontrado');
    }
    
    return this.processLoginResponse(data, tenantSlug);
  },
  
  /**
   * Process login response and store tokens/user data
   */
  async processLoginResponse(data: any, tenantSlug: string): Promise<LoginResponse> {
    const { user: responseUser, tenant: responseTenant } = data;
    
    // Build user object
    const user: User = {
      id: String(responseUser.id),
      email: responseUser.email,
      name: responseUser.full_name || '',
      first_name: responseUser.full_name?.split(' ')[0] || '',
      last_name: responseUser.full_name?.split(' ').slice(1).join(' ') || '',
      avatar: responseUser.avatar,
      role: responseTenant.role || 'viewer',
      tenant_id: String(responseTenant.id),
      tenant_name: responseTenant.name,
      tenant_schema: responseTenant.schema_name,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    
    // Build tenant object
    const tenant: Tenant = {
      id: String(responseTenant.id),
      slug: responseTenant.slug,
      name: responseTenant.name,
      schema_name: responseTenant.schema_name,
    };
    
    // Mobile endpoint returns tokens in response body
    if (!data.access || !data.refresh) {
      throw new Error('Tokens not found in response. Backend may be using wrong endpoint.');
    }

    const tokens: AuthTokens = {
      access_token: data.access,
      refresh_token: data.refresh,
    };

    // Store tokens securely
    await secureStorage.setTokens(tokens);

    // Configure API with tenant schema for subsequent requests
    // The backend expects schema_name in X-Tenant header
    const tenantSchema = responseTenant.schema_name || tenantSlug;
    configureApi(tenantSchema);

    // Store user and tenant info
    tenantStorage.setTenant(tenantSchema);
    await tenantStorage.setUser(user);
    await tenantStorage.setTenantInfo(tenant);

    // Save last tenant for quick login
    await globalStorage.setLastTenantSlug(tenantSchema);

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
