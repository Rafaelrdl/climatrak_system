import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { appStorage, STORAGE_KEYS } from '@/lib/storage';

const normalizeTenant = (value: string) =>
  value.trim().toLowerCase().replace(/-/g, '_') || 'default';

describe('storage policy', () => {
  const tenant = 'Acme-Test';
  const userId = 'user-1';

  beforeEach(() => {
    localStorage.clear();
    appStorage.clearByScope({ tenant });
    appStorage.clearByScope({ tenant, userId });

    const globals = globalThis as Record<string, unknown>;
    globals.__CLIMATRAK_DEMO_MODE__ = false;
  });

  afterEach(() => {
    const globals = globalThis as Record<string, unknown>;
    delete globals.__CLIMATRAK_DEMO_MODE__;
    localStorage.clear();
  });

  it('does not persist demo credentials when demo mode is off', () => {
    const credentials = [{ email: 'demo@example.com', password: 'demo123' }];
    appStorage.set(STORAGE_KEYS.DEMO_CREDENTIALS, credentials, { tenant });
    appStorage.set(STORAGE_KEYS.DEMO_INVITES, [{ id: 'invite-1', email: 'invite@example.com' }], { tenant });

    const base = `climatrak:v1:${normalizeTenant(tenant)}`;
    expect(localStorage.getItem(`${base}:${STORAGE_KEYS.DEMO_CREDENTIALS}`)).toBeNull();
    expect(localStorage.getItem(`${base}:${STORAGE_KEYS.DEMO_INVITES}`)).toBeNull();
    expect(appStorage.get(STORAGE_KEYS.DEMO_CREDENTIALS, { tenant })).toEqual(credentials);
  });

  it('namespaces tenantUser keys by tenant and user', () => {
    appStorage.set(STORAGE_KEYS.UI_PROFILE_LAST_TAB, 'dados', { tenant, userId });

    const key = `climatrak:v1:${normalizeTenant(tenant)}:${userId}:${STORAGE_KEYS.UI_PROFILE_LAST_TAB}`;
    expect(localStorage.getItem(key)).toBe(JSON.stringify('dados'));
  });
});
