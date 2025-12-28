import { api, reconfigureApiForTenant } from '@/lib';
import { saveTenantConfig } from '@/lib/tenant';
import { tenantStorage, updateTenantSlugCache } from '@/lib/tenantStorage';
import type { ApiUser, CentralizedLoginResponse } from '@/types/api';
import type { User, UserRole } from '@/models/user';
import { defaultPreferences, defaultSecurity } from '@/models/user';

/**
 * Mapeia o role da API (uppercase) para o role do app (lowercase)
 * Mantém correspondência 1:1 com os roles do backend
 */
const mapApiRoleToAppRole = (role?: string | null): UserRole => {
  const normalized = role?.toUpperCase() ?? '';

  switch (normalized) {
    case 'OWNER':
      return 'owner';
    case 'ADMIN':
      return 'admin';
    case 'OPERATOR':
      return 'operator';
    case 'TECHNICIAN':
      return 'technician';
    case 'REQUESTER':
      return 'requester';
    case 'VIEWER':
    default:
      return 'viewer';
  }
};

const mapApiUserToUser = (apiUser: ApiUser): User => {
  const fullName =
    (apiUser as any).full_name ||
    `${apiUser.first_name || ''} ${apiUser.last_name || ''}`.trim() ||
    apiUser.email;

  return {
    id: String(apiUser.id),
    name: fullName || apiUser.email,
    email: apiUser.email,
    role: mapApiRoleToAppRole(apiUser.role),
    status: apiUser.is_active ? 'active' : 'disabled',
    avatar_url: (apiUser as any).avatar || apiUser.avatar_url || undefined,
    phone: apiUser.phone || undefined,
    created_at: apiUser.created_at || new Date().toISOString(),
    updated_at: apiUser.updated_at || undefined,
    last_login_at: apiUser.last_login || undefined,
    preferences: { ...defaultPreferences },
    security: { ...defaultSecurity },
  };
};

export interface LoginResult {
  user: User;
  tenants: Array<{
    schema_name: string;
    name: string;
    slug: string;
    role: string;
    is_default: boolean;
  }>;
  selectedTenant: {
    schema_name: string;
    name: string;
    slug: string;
    role: string;
  } | null;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  // Use centralized login endpoint (public schema)
  const { data } = await api.post<CentralizedLoginResponse>('/auth/centralized-login/', {
    username_or_email: email,
    password,
  });

  const user = mapApiUserToUser(data.user);

  // Persist user/role locally (used by AuthProvider)
  localStorage.setItem('auth:user', JSON.stringify(user));
  localStorage.setItem('auth:role', user.role);
  window.dispatchEvent(new Event('authChange'));

  // Select default tenant or first available
  const defaultTenant = data.tenants.find(t => t.is_default) || data.tenants[0] || null;

  if (defaultTenant) {
    const tenantSlug = defaultTenant.slug || defaultTenant.schema_name.toLowerCase();
    const tenantName = defaultTenant.name || defaultTenant.schema_name;
    // API base URL for tenant - frontend will use X-Tenant header instead of subdomain
    const apiBaseUrl = `/api`; // Keep relative, proxy handles routing

    updateTenantSlugCache(tenantSlug);

    saveTenantConfig({
      tenantId: defaultTenant.schema_name,
      tenantSlug,
      tenantName,
      apiBaseUrl,
    });

    // Store selected tenant schema for X-Tenant header
    localStorage.setItem('auth:tenant_schema', defaultTenant.schema_name);
  }

  return { 
    user, 
    tenants: data.tenants,
    selectedTenant: defaultTenant 
  };
}

export async function logout() {
  try {
    await api.post('/auth/logout/');
  } catch (error) {
    console.warn('Logout request failed, clearing session locally', error);
  } finally {
    tenantStorage.clear();
    updateTenantSlugCache(null);
    localStorage.removeItem('auth:tenant_schema');
    localStorage.removeItem('auth:user');
    localStorage.removeItem('auth:role');
    window.dispatchEvent(new Event('authChange'));
  }
}

// Password Reset Functions
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/password-reset/request/', { email });
  return data;
}

export async function validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
  const { data } = await api.post<{ valid: boolean; email?: string }>('/auth/password-reset/validate/', { token });
  return data;
}

export async function confirmPasswordReset(
  token: string, 
  password: string, 
  passwordConfirm: string
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/password-reset/confirm/', { 
    token, 
    password,
    password_confirm: passwordConfirm
  });
  return data;
}

export async function changePassword(
  oldPassword: string, 
  newPassword: string, 
  newPasswordConfirm: string
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/users/me/change-password/', {
    old_password: oldPassword,
    new_password: newPassword,
    new_password_confirm: newPasswordConfirm,
  });
  return data;
}
