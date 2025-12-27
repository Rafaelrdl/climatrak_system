import { api, reconfigureApiForTenant } from '@/lib';
import { saveTenantConfig } from '@/lib/tenant';
import { tenantStorage, updateTenantSlugCache } from '@/lib/tenantStorage';
import type { ApiUser, AuthResponse } from '@/types/api';
import type { User, UserRole } from '@/models/user';
import { defaultPreferences, defaultSecurity } from '@/models/user';

const mapApiRoleToAppRole = (role?: string | null): UserRole => {
  const normalized = role?.toUpperCase() ?? '';

  if (['OWNER', 'ADMIN', 'MANAGER'].includes(normalized)) {
    return 'admin';
  }

  if (normalized === 'TECHNICIAN') {
    return 'technician';
  }

  if (normalized === 'OPERATOR') {
    return 'operator';
  }

  return 'viewer';
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

export async function login(email: string, password: string) {
  const { data } = await api.post<AuthResponse>('/auth/login/', {
    username_or_email: email,
    password,
  });

  const user = mapApiUserToUser(data.user);

  // Persist user/role locally (used by AuthProvider)
  localStorage.setItem('auth:user', JSON.stringify(user));
  localStorage.setItem('auth:role', user.role);
  window.dispatchEvent(new Event('authChange'));

  // Persist tenant configuration for future sessions
  if (data.tenant) {
    const tenantSlug = data.tenant.slug || data.tenant.id || 'default';
    const tenantName = data.tenant.name || tenantSlug.toUpperCase();
    const apiBaseUrl = data.tenant.api_base_url || `http://${tenantSlug}.localhost:8000/api`;

    updateTenantSlugCache(tenantSlug);

    saveTenantConfig({
      tenantId: data.tenant.id || tenantSlug,
      tenantSlug,
      tenantName,
      apiBaseUrl,
    });

    reconfigureApiForTenant(apiBaseUrl);
  }

  return { user, tenant: data.tenant ?? null };
}

export async function logout() {
  try {
    await api.post('/auth/logout/');
  } catch (error) {
    console.warn('Logout request failed, clearing session locally', error);
  } finally {
    tenantStorage.clear();
    updateTenantSlugCache(null);
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
