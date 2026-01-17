import { api } from '@/lib';
import { updateTenantSlugCache } from '@/lib/tenantStorage';
import { appStorage } from '@/lib/storage';
import { getTenantConfig } from '@/lib/tenant';
import { useAuthStore } from '@/store/useAuthStore';
import type { ApiUser } from '@/types/api';
import type { User, UserRole } from '@/models/user';
import { defaultPreferences, defaultSecurity } from '@/models/user';
import { useFeaturesStore } from '@/store/useFeaturesStore';

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
    const authSnapshot = useAuthStore.getState();
    if (authSnapshot.tenant?.schema_name) {
      appStorage.clearByScope({ tenant: authSnapshot.tenant.schema_name });
    }
    useAuthStore.getState().clearSession();
    updateTenantSlugCache(null);
    // Clear tenant features from store
    useFeaturesStore.getState().clearFeatures();
    appStorage.emitAuthEvent();
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
  const { data } = await api.post('/v2/auth/login/', {
    email,
    password,
  });

  // Debug: Log completo da resposta
  console.log('🔐 [AUTH] Login response completa:', data);
  console.log('🔐 [AUTH] tenant.features recebido:', data.tenant?.features);
  console.log('🔐 [AUTH] tenant.role recebido:', data.tenant?.role);

  // Map user data - role comes from tenant, not user
  const user = mapApiUserToUser({ ...data.user, role: data.tenant?.role });

  useAuthStore.getState().setSession({
    user,
    tenant: {
      id: String(data.tenant?.schema_name ?? data.tenant?.slug ?? ''),
      schema_name: data.tenant.schema_name,
      name: data.tenant.name,
      slug: data.tenant.slug,
      role: user.role,
      features: data.tenant.features,
    },
  });
  updateTenantSlugCache(data.tenant.schema_name);
  getTenantConfig();
  
  // Persist tenant features if available
  console.log('🔐 [AUTH] Verificando features...', { hasFeatures: !!data.tenant?.features, features: data.tenant?.features });
  if (data.tenant?.features) {
    console.log('🔐 [AUTH] Salvando features no store:', data.tenant.features);
    // Update Zustand store (persisted via storage wrapper)
    useFeaturesStore.getState().setFeatures(data.tenant.features);
    console.log('🔐 [AUTH] Features após save:', useFeaturesStore.getState().features);
  } else {
    console.warn('🔐 [AUTH] ⚠️ Nenhuma feature recebida do backend!');
  }
  
  window.dispatchEvent(new Event('authChange'));
  appStorage.emitAuthEvent({ tenant: data.tenant.schema_name });

  return {
    user,
    tenant: data.tenant
  };
}

export async function getCurrentSession(): Promise<{
  user: User;
  tenant: {
    id: string;
    schema_name: string;
    name: string;
    slug: string;
    role: UserRole;
    features?: TenantFeatures;
  };
}> {
  const { data } = await api.get('/auth/me/');
  const role = mapApiRoleToAppRole(data.tenant?.role);
  const user = mapApiUserToUser({ ...data.user, role });
  return {
    user,
    tenant: {
      id: String(data.tenant.id),
      schema_name: data.tenant.schema_name,
      name: data.tenant.name,
      slug: data.tenant.slug,
      role,
      features: data.tenant.features,
    },
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

