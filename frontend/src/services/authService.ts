import { api } from '@/lib';
import { tenantStorage, updateTenantSlugCache } from '@/lib/tenantStorage';
import type { ApiUser } from '@/types/api';
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
    apiUser.full_name ||
    `${apiUser.first_name || ''} ${apiUser.last_name || ''}`.trim() ||
    apiUser.email;

  return {
    id: String(apiUser.id),
    name: fullName || apiUser.email,
    email: apiUser.email,
    role: mapApiRoleToAppRole(apiUser.role),
    status: apiUser.is_active ? 'active' : 'disabled',
    avatar_url: apiUser.avatar ?? apiUser.avatar_url ?? undefined,
    phone: apiUser.phone || undefined,
    created_at: apiUser.created_at || new Date().toISOString(),
    updated_at: apiUser.updated_at || undefined,
    last_login_at: apiUser.last_login || undefined,
    preferences: { ...defaultPreferences },
    security: { ...defaultSecurity },
  };
};


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
    localStorage.removeItem('tenant:features'); // Clear tenant features
    window.dispatchEvent(new Event('authChange'));
  }
}

// Tenant Discovery (Step 1 of login)
export interface TenantDiscoveryResult {
  found: boolean;
  email: string;
  primary_tenant?: {
    schema_name: string;
    slug: string;
    name: string;
    domain?: string;
  };
  has_multiple_tenants?: boolean;
  message?: string;
}

// Tenant features type
export interface TenantFeatures {
  'trakservice.enabled': boolean;
  'trakservice.dispatch': boolean;
  'trakservice.tracking': boolean;
  'trakservice.routing': boolean;
  'trakservice.km': boolean;
  'trakservice.quotes': boolean;
  [key: string]: boolean;
}

export async function discoverTenant(email: string): Promise<TenantDiscoveryResult> {
  const { data } = await api.post<TenantDiscoveryResult>('/v2/auth/discover-tenant/', { email });
  return data;
}

// Tenant-specific login (usado no fluxo de 2 passos)
export async function tenantLogin(email: string, password: string): Promise<{
  user: User;
  tenant: {
    schema_name: string;
    name: string;
    slug: string;
    features?: TenantFeatures;
  };
}> {
  const { data } = await api.post('/auth/login/', {
    email,
    password,
  });

  if (import.meta.env.DEV) {
    console.log('🔐 Tenant login response:', data);
  }

  // Map user data
  const user = mapApiUserToUser(data.user);

  // Persist user locally
  localStorage.setItem('auth:user', JSON.stringify(user));
  localStorage.setItem('auth:role', user.role);
  localStorage.setItem('auth:tenant_schema', data.tenant.schema_name);
  updateTenantSlugCache(data.tenant.schema_name);
  
  // Persist tenant features if available
  if (data.tenant.features) {
    localStorage.setItem('tenant:features', JSON.stringify({ 
      state: { features: data.tenant.features },
      version: 0,
    }));
  }
  
  window.dispatchEvent(new Event('authChange'));

  return {
    user,
    tenant: data.tenant
  };
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

export async function updateProfile(profileData: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  position?: string;
  timezone?: string;
  time_format?: string;
}): Promise<{ user: any; message: string }> {
  const { data } = await api.patch<{ user: any; message: string }>('/users/me/', profileData);
  return data;
}

