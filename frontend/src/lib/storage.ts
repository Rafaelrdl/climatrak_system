import { z } from 'zod';
import { getAuthSnapshot } from '@/store/useAuthStore';
import { getTenantSlug } from './tenantStorage';

const STORAGE_PREFIX = 'climatrak:v1';

export const STORAGE_KEYS = {
  TENANT_CONFIG: 'tenant.config',
  TENANT_FEATURES: 'tenant.features',
  AUTH_EVENT: 'auth.event',
  UI_PROFILE_LAST_TAB: 'ui.profile.lastTab',
  UI_INVENTORY_LAST_TAB: 'ui.inventory.lastTab',
  UI_WORKORDER_VIEW: 'ui.workorder.view',
  UI_TOUR_HINTS_DISABLED: 'ui.tour.hintsDisabled',
  UI_HELP_TOUR_SEEN: 'ui.help.tourSeen',
  UI_HELP_QUICKSTART_DISMISSED: 'ui.help.quickstartDismissed',
  TOUR_STATE: 'tour.state',
  ONBOARDING_STATE: 'onboarding.state',
  HELP_CATEGORIES: 'help.categories',
  HELP_CONTENT: 'help.content',
  HELP_PROGRESS: 'help.progress',
  HELP_SEARCH_HISTORY: 'help.searchHistory',
  DATA_USERS: 'data.users',
  DATA_WORK_ORDERS: 'data.workOrders',
  DATA_MAINTENANCE_PLANS: 'data.maintenancePlans',
  DATA_SOLICITATIONS: 'data.solicitations',
  METRICS_WORK_ORDERS: 'metrics.workOrders',
  METRICS_EQUIPMENT: 'metrics.equipment',
  METRICS_SECTORS: 'metrics.sectors',
  INVENTORY_CATEGORIES: 'inventory.categories',
  INVENTORY_ITEMS: 'inventory.items',
  INVENTORY_MOVEMENTS: 'inventory.movements',
  PROCEDURES_LIST: 'procedures.list',
  PROCEDURES_CATEGORIES: 'procedures.categories',
  PROCEDURES_VERSIONS: 'procedures.versions',
  PROCEDURES_ANNOTATIONS: 'procedures.annotations',
  PROCEDURES_COMMENTS: 'procedures.comments',
  DEMO_CREDENTIALS: 'demo.credentials',
  DEMO_INVITES: 'demo.invites',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
type StorageScopeType = 'tenant' | 'tenantUser';

type StorageDefinition = {
  scope: StorageScopeType;
  schema: z.ZodTypeAny;
  demoOnly?: boolean;
};

const idSchema = z.union([z.string(), z.number()]);
const arrayOfRecords = z.array(z.record(z.unknown()));

const storageDefinitions: Record<StorageKey, StorageDefinition> = {
  [STORAGE_KEYS.TENANT_CONFIG]: {
    scope: 'tenant',
    schema: z
      .object({
        tenantId: z.string(),
        tenantSlug: z.string(),
        tenantName: z.string(),
        apiBaseUrl: z.string(),
        branding: z
          .object({
            logo: z.string().optional(),
            primaryColor: z.string(),
            secondaryColor: z.string().optional(),
            name: z.string(),
            shortName: z.string().optional(),
            favicon: z.string().optional(),
          })
          .optional(),
      })
      .passthrough(),
  },
  [STORAGE_KEYS.TENANT_FEATURES]: {
    scope: 'tenant',
    schema: z
      .object({
        state: z.object({
          features: z.record(z.boolean()),
        }),
        version: z.number().optional(),
      })
      .passthrough(),
  },
  [STORAGE_KEYS.AUTH_EVENT]: {
    scope: 'tenant',
    schema: z.object({ ts: z.number() }),
  },
  [STORAGE_KEYS.UI_PROFILE_LAST_TAB]: {
    scope: 'tenantUser',
    schema: z.enum(['dados', 'preferencias', 'seguranca']),
  },
  [STORAGE_KEYS.UI_INVENTORY_LAST_TAB]: {
    scope: 'tenantUser',
    schema: z.enum(['table', 'cards', 'analysis', 'history']),
  },
  [STORAGE_KEYS.UI_WORKORDER_VIEW]: {
    scope: 'tenantUser',
    schema: z.enum(['list', 'kanban', 'panel']),
  },
  [STORAGE_KEYS.UI_TOUR_HINTS_DISABLED]: {
    scope: 'tenantUser',
    schema: z.boolean(),
  },
  [STORAGE_KEYS.UI_HELP_TOUR_SEEN]: {
    scope: 'tenantUser',
    schema: z.boolean(),
  },
  [STORAGE_KEYS.UI_HELP_QUICKSTART_DISMISSED]: {
    scope: 'tenantUser',
    schema: z.boolean(),
  },
  [STORAGE_KEYS.TOUR_STATE]: {
    scope: 'tenantUser',
    schema: z.object({
      completed: z.record(z.boolean()),
      skipped: z.record(z.boolean()),
      step: z.record(z.number()),
    }),
  },
  [STORAGE_KEYS.ONBOARDING_STATE]: {
    scope: 'tenantUser',
    schema: z.record(z.boolean()),
  },
  [STORAGE_KEYS.HELP_CATEGORIES]: { scope: 'tenant', schema: arrayOfRecords },
  [STORAGE_KEYS.HELP_CONTENT]: { scope: 'tenant', schema: arrayOfRecords },
  [STORAGE_KEYS.HELP_PROGRESS]: {
    scope: 'tenantUser',
    schema: z.array(
      z
        .object({
          user_id: z.string().optional(),
          content_id: z.string().optional(),
        })
        .passthrough()
    ),
  },
  [STORAGE_KEYS.HELP_SEARCH_HISTORY]: {
    scope: 'tenantUser',
    schema: z.array(z.string()),
  },
  [STORAGE_KEYS.DATA_USERS]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.DATA_WORK_ORDERS]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.DATA_MAINTENANCE_PLANS]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.DATA_SOLICITATIONS]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.METRICS_WORK_ORDERS]: { scope: 'tenant', schema: arrayOfRecords },
  [STORAGE_KEYS.METRICS_EQUIPMENT]: { scope: 'tenant', schema: arrayOfRecords },
  [STORAGE_KEYS.METRICS_SECTORS]: { scope: 'tenant', schema: arrayOfRecords },
  [STORAGE_KEYS.INVENTORY_CATEGORIES]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.INVENTORY_ITEMS]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.INVENTORY_MOVEMENTS]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.PROCEDURES_LIST]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.PROCEDURES_CATEGORIES]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.PROCEDURES_VERSIONS]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.PROCEDURES_ANNOTATIONS]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.PROCEDURES_COMMENTS]: {
    scope: 'tenant',
    schema: z.array(z.object({ id: idSchema }).passthrough()),
  },
  [STORAGE_KEYS.DEMO_CREDENTIALS]: {
    scope: 'tenant',
    demoOnly: true,
    schema: z.array(
      z
        .object({
          email: z.string(),
          password: z.string(),
        })
        .passthrough()
    ),
  },
  [STORAGE_KEYS.DEMO_INVITES]: {
    scope: 'tenant',
    demoOnly: true,
    schema: z.array(
      z
        .object({
          id: z.string(),
          email: z.string(),
        })
        .passthrough()
    ),
  },
};

const memoryStore = new Map<string, string>();

const getDemoModeOverride = (): string | undefined => {
  const override = (globalThis as Record<string, unknown>).__CLIMATRAK_DEMO_MODE__;
  if (typeof override === 'string') return override;
  if (typeof override === 'boolean') return override ? 'true' : 'false';
  return undefined;
};

const isDemoMode = (): boolean => {
  const override = getDemoModeOverride();
  if (override !== undefined) return override === 'true';
  return (
    import.meta.env.VITE_ENABLE_DEMO_MODE === 'true' ||
    import.meta.env.VITE_DEMO_MODE === 'true'
  );
};

const hasLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

const normalizeTenant = (tenant: string): string =>
  tenant.trim().toLowerCase().replace(/-/g, '_') || 'default';

const normalizeUserId = (userId: string | number | undefined): string => {
  if (userId === undefined || userId === null) return 'anonymous';
  return String(userId).trim() || 'anonymous';
};

const resolveScope = (
  key: StorageKey,
  scopeOverride?: { tenant?: string; userId?: string | number }
): { tenant: string; userId: string; scopeType: StorageScopeType } => {
  const definition = storageDefinitions[key];
  const auth = getAuthSnapshot();
  const tenant =
    scopeOverride?.tenant ||
    auth.tenant?.schema_name ||
    auth.tenant?.slug ||
    getTenantSlug();
  const userId =
    scopeOverride?.userId ||
    auth.user?.id ||
    'anonymous';
  return {
    tenant: normalizeTenant(tenant || 'default'),
    userId: normalizeUserId(userId),
    scopeType: definition.scope,
  };
};

const buildStorageKey = (
  key: StorageKey,
  scope: { tenant: string; userId: string; scopeType: StorageScopeType }
): string => {
  const base = `${STORAGE_PREFIX}:${scope.tenant}`;
  if (scope.scopeType === 'tenantUser') {
    return `${base}:${scope.userId}:${key}`;
  }
  return `${base}:${key}`;
};

const isAllowedKey = (key: string): key is StorageKey =>
  Object.values(STORAGE_KEYS).includes(key as StorageKey);

const removeRaw = (storageKey: string): void => {
  memoryStore.delete(storageKey);
  if (!hasLocalStorage()) return;
  window.localStorage.removeItem(storageKey);
};

const readRaw = (storageKey: string, demoOnly?: boolean): string | null => {
  if (memoryStore.has(storageKey)) {
    return memoryStore.get(storageKey) ?? null;
  }
  if (demoOnly && !isDemoMode()) {
    if (hasLocalStorage()) {
      window.localStorage.removeItem(storageKey);
    }
    return null;
  }
  if (!hasLocalStorage()) return null;
  return window.localStorage.getItem(storageKey);
};

const writeRaw = (storageKey: string, value: string, demoOnly: boolean): void => {
  if (demoOnly && !isDemoMode()) {
    memoryStore.set(storageKey, value);
    if (hasLocalStorage()) {
      window.localStorage.removeItem(storageKey);
    }
    return;
  }
  try {
    if (hasLocalStorage()) {
      window.localStorage.setItem(storageKey, value);
      return;
    }
  } catch {
    // fall back to memory store
  }
  memoryStore.set(storageKey, value);
};

export const appStorage = {
  get<T>(key: StorageKey, scopeOverride?: { tenant?: string; userId?: string | number }): T | null {
    const definition = storageDefinitions[key];
    const scope = resolveScope(key, scopeOverride);
    const storageKey = buildStorageKey(key, scope);
    const raw = readRaw(storageKey, definition.demoOnly);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const result = definition.schema.safeParse(parsed);
      if (!result.success) {
        removeRaw(storageKey);
        return null;
      }
      return result.data as T;
    } catch {
      removeRaw(storageKey);
      return null;
    }
  },

  set<T>(key: StorageKey, value: T, scopeOverride?: { tenant?: string; userId?: string | number }): void {
    const definition = storageDefinitions[key];
    const result = definition.schema.safeParse(value);
    if (!result.success) {
      console.warn('[storage] Invalid payload for', key, result.error.flatten());
      return;
    }
    const scope = resolveScope(key, scopeOverride);
    const storageKey = buildStorageKey(key, scope);
    writeRaw(storageKey, JSON.stringify(result.data), !!definition.demoOnly);
  },

  remove(key: StorageKey, scopeOverride?: { tenant?: string; userId?: string | number }): void {
    const scope = resolveScope(key, scopeOverride);
    const storageKey = buildStorageKey(key, scope);
    removeRaw(storageKey);
  },

  getSerialized(key: StorageKey, scopeOverride?: { tenant?: string; userId?: string | number }): string | null {
    const definition = storageDefinitions[key];
    const scope = resolveScope(key, scopeOverride);
    const storageKey = buildStorageKey(key, scope);
    const raw = readRaw(storageKey, definition.demoOnly);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const result = definition.schema.safeParse(parsed);
      if (!result.success) {
        removeRaw(storageKey);
        return null;
      }
      return raw;
    } catch {
      removeRaw(storageKey);
      return null;
    }
  },

  setSerialized(key: StorageKey, value: string, scopeOverride?: { tenant?: string; userId?: string | number }): void {
    const definition = storageDefinitions[key];
    try {
      const parsed = JSON.parse(value);
      const result = definition.schema.safeParse(parsed);
      if (!result.success) {
        return;
      }
      const scope = resolveScope(key, scopeOverride);
      const storageKey = buildStorageKey(key, scope);
      writeRaw(storageKey, JSON.stringify(result.data), !!definition.demoOnly);
    } catch {
      // ignore invalid JSON
    }
  },

  clearByScope(scope: { tenant: string; userId?: string | number }): void {
    const tenant = normalizeTenant(scope.tenant);
    const userId = scope.userId ? normalizeUserId(scope.userId) : null;
    const prefix = userId
      ? `${STORAGE_PREFIX}:${tenant}:${userId}:`
      : `${STORAGE_PREFIX}:${tenant}:`;

    memoryStore.forEach((_value, key) => {
      if (key.startsWith(prefix)) {
        memoryStore.delete(key);
      }
    });

    if (!hasLocalStorage()) return;
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        window.localStorage.removeItem(key);
      }
    }
  },

  emitAuthEvent(scopeOverride?: { tenant?: string }): void {
    this.set(STORAGE_KEYS.AUTH_EVENT, { ts: Date.now() }, scopeOverride);
  },
};

export const createZustandStorage = () => ({
  getItem: (name: string) => {
    if (!isAllowedKey(name)) return null;
    return appStorage.getSerialized(name);
  },
  setItem: (name: string, value: string) => {
    if (!isAllowedKey(name)) return;
    appStorage.setSerialized(name, value);
  },
  removeItem: (name: string) => {
    if (!isAllowedKey(name)) return;
    appStorage.remove(name);
  },
});

const migrateLegacyKey = (
  legacyKey: string,
  targetKey: StorageKey,
  scope: { tenant: string; userId?: string | number },
  parse: (raw: string) => unknown = JSON.parse
): void => {
  if (!hasLocalStorage()) return;
  const raw = window.localStorage.getItem(legacyKey);
  if (!raw) return;
  try {
    const value = parse(raw);
    appStorage.set(targetKey, value as never, scope);
  } catch {
    // ignore parse errors
  } finally {
    window.localStorage.removeItem(legacyKey);
  }
};

const migrateLegacySerializedKey = (
  legacyKey: string,
  targetKey: StorageKey,
  scope: { tenant: string; userId?: string | number }
): void => {
  if (!hasLocalStorage()) return;
  const raw = window.localStorage.getItem(legacyKey);
  if (!raw) return;
  appStorage.setSerialized(targetKey, raw, scope);
  window.localStorage.removeItem(legacyKey);
};

export const migrateLegacyStorage = (): void => {
  if (!hasLocalStorage()) return;

  let legacyUserId: string | null = null;
  let legacyTenant: string | null = null;

  const authUserRaw = window.localStorage.getItem('auth:user');
  if (authUserRaw) {
    try {
      const authUser = JSON.parse(authUserRaw) as { id?: string };
      if (authUser.id) legacyUserId = String(authUser.id);
    } catch {
      // ignore parse errors
    }
  }

  const legacyTenantRaw = window.localStorage.getItem('auth:tenant_schema');
  if (legacyTenantRaw) {
    legacyTenant = legacyTenantRaw;
  } else {
    const currentTenantRaw = window.localStorage.getItem('current_tenant');
    if (currentTenantRaw) {
      try {
        const parsed = JSON.parse(currentTenantRaw) as { tenantSlug?: string };
        if (parsed.tenantSlug) legacyTenant = parsed.tenantSlug;
      } catch {
        // ignore parse errors
      }
    }
  }

  const fallbackTenant = normalizeTenant(
    legacyTenant || getTenantSlug() || 'default'
  );

  const tenantScope = { tenant: fallbackTenant };
  const userScope = { tenant: fallbackTenant, userId: legacyUserId || 'anonymous' };

  migrateLegacyKey('workOrders:db', STORAGE_KEYS.DATA_WORK_ORDERS, tenantScope);
  migrateLegacyKey('users:db', STORAGE_KEYS.DATA_USERS, tenantScope);
  migrateLegacyKey('traknor-maintenance-plans', STORAGE_KEYS.DATA_MAINTENANCE_PLANS, tenantScope);
  migrateLegacyKey('traknor-solicitations', STORAGE_KEYS.DATA_SOLICITATIONS, tenantScope);
  migrateLegacyKey('traknor-work-orders', STORAGE_KEYS.METRICS_WORK_ORDERS, tenantScope);
  migrateLegacyKey('traknor-equipment', STORAGE_KEYS.METRICS_EQUIPMENT, tenantScope);
  migrateLegacyKey('traknor-sectors', STORAGE_KEYS.METRICS_SECTORS, tenantScope);
  migrateLegacyKey('inventory:categories', STORAGE_KEYS.INVENTORY_CATEGORIES, tenantScope);
  migrateLegacyKey('inventory:items', STORAGE_KEYS.INVENTORY_ITEMS, tenantScope);
  migrateLegacyKey('inventory:movements', STORAGE_KEYS.INVENTORY_MOVEMENTS, tenantScope);
  migrateLegacyKey('procedures:db', STORAGE_KEYS.PROCEDURES_LIST, tenantScope);
  migrateLegacyKey('procedure_categories:db', STORAGE_KEYS.PROCEDURES_CATEGORIES, tenantScope);
  migrateLegacyKey('procedure_versions:db', STORAGE_KEYS.PROCEDURES_VERSIONS, tenantScope);
  migrateLegacyKey('procedure_annotations:db', STORAGE_KEYS.PROCEDURES_ANNOTATIONS, tenantScope);
  migrateLegacyKey('procedure_comments:db', STORAGE_KEYS.PROCEDURES_COMMENTS, tenantScope);
  migrateLegacyKey('help:categories', STORAGE_KEYS.HELP_CATEGORIES, tenantScope);
  migrateLegacyKey('help:content', STORAGE_KEYS.HELP_CONTENT, tenantScope);
  migrateLegacyKey('help:progress', STORAGE_KEYS.HELP_PROGRESS, userScope);
  migrateLegacyKey('help:searchHistory', STORAGE_KEYS.HELP_SEARCH_HISTORY, userScope);
  migrateLegacyKey('profile:lastTab', STORAGE_KEYS.UI_PROFILE_LAST_TAB, userScope, raw => raw);
  migrateLegacyKey('inventory:lastTab', STORAGE_KEYS.UI_INVENTORY_LAST_TAB, userScope, raw => raw);
  migrateLegacyKey('workorder-view', STORAGE_KEYS.UI_WORKORDER_VIEW, userScope, raw => raw);
  migrateLegacyKey('tour:hintsDisabled', STORAGE_KEYS.UI_TOUR_HINTS_DISABLED, userScope, raw => raw === 'true');
  migrateLegacyKey('help:tour-seen', STORAGE_KEYS.UI_HELP_TOUR_SEEN, userScope, raw => raw === 'true');
  migrateLegacyKey('help:quickstart-dismissed', STORAGE_KEYS.UI_HELP_QUICKSTART_DISMISSED, userScope, raw => raw === 'true');

  if (isDemoMode()) {
    migrateLegacyKey('credentials:db', STORAGE_KEYS.DEMO_CREDENTIALS, tenantScope);
    migrateLegacyKey('invites:db', STORAGE_KEYS.DEMO_INVITES, tenantScope);
  } else {
    window.localStorage.removeItem('credentials:db');
    window.localStorage.removeItem('invites:db');
  }

  migrateLegacySerializedKey('tenant:features', STORAGE_KEYS.TENANT_FEATURES, tenantScope);

  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    const match = key.match(/^([^:]+):tenant_config$/);
    if (match) {
      const tenantSlug = normalizeTenant(match[1]);
      migrateLegacyKey(key, STORAGE_KEYS.TENANT_CONFIG, { tenant: tenantSlug });
    }
  }

  const tourState = appStorage.get(STORAGE_KEYS.TOUR_STATE, userScope) ?? {
    completed: {},
    skipped: {},
    step: {},
  };

  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    const match = key.match(/^tour:([^:]+):(completed|skipped|step)$/);
    if (match) {
      const [, tourId, field] = match;
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        if (field === 'step') {
          const step = Number.parseInt(raw, 10);
          if (!Number.isNaN(step)) tourState.step[tourId] = step;
        } else {
          const flag = raw === 'true';
          if (field === 'completed') tourState.completed[tourId] = flag;
          if (field === 'skipped') tourState.skipped[tourId] = flag;
        }
      }
      window.localStorage.removeItem(key);
    }
  }
  appStorage.set(STORAGE_KEYS.TOUR_STATE, tourState, userScope);

  const onboardingState = appStorage.get(STORAGE_KEYS.ONBOARDING_STATE, userScope) ?? {};
  const onboardingKeyMatch = /^onboarding:([^:]+):([^:]+):(.+)$/;
  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    const match = key.match(onboardingKeyMatch);
    if (match) {
      const [, tenantSlug, userId, subKey] = match;
      const raw = window.localStorage.getItem(key);
      if (normalizeTenant(tenantSlug) === fallbackTenant && userId === userScope.userId) {
        onboardingState[subKey] = raw === 'true';
      }
      window.localStorage.removeItem(key);
    }
  }
  if (window.localStorage.getItem('onboarding:interactiveTourCompleted') === 'true') {
    onboardingState.interactiveTourCompleted = true;
    window.localStorage.removeItem('onboarding:interactiveTourCompleted');
  }
  if (window.localStorage.getItem('onboarding:interactiveTourSkipped') === 'true') {
    onboardingState.interactiveTourSkipped = true;
    window.localStorage.removeItem('onboarding:interactiveTourSkipped');
  }
  appStorage.set(STORAGE_KEYS.ONBOARDING_STATE, onboardingState, userScope);

  window.localStorage.removeItem('auth:user');
  window.localStorage.removeItem('auth:role');
  window.localStorage.removeItem('auth:tenant_schema');
  window.localStorage.removeItem('auth:current_user');
  window.localStorage.removeItem('current_tenant');
  window.localStorage.removeItem('access_token');
  window.localStorage.removeItem('refresh_token');
};
