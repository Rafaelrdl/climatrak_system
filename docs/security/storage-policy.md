# Storage Policy (Frontend)

This document defines how ClimaTrak persists client-side state to avoid XSS data leakage
and cross-tenant contamination.

## Principles
- Do not persist P0 data (tokens, credentials, roles, tenant schema).
- All persisted data must be scoped by tenant (and user when applicable).
- Only the storage wrapper may touch browser storage APIs.

## Storage wrapper
Use `frontend/src/lib/storage.ts` (`appStorage`) for all persistence. It enforces:
- Allowlist of keys (`STORAGE_KEYS`).
- Zod validation per key.
- Namespace format: `climatrak:v1:{tenant}:{user?}:{key}`.
- Demo-only keys stored in memory when demo mode is disabled.

## Scopes
- `tenant`: shared within the current tenant.
- `tenantUser`: specific to a tenant + user pair.

## Demo-only keys
Demo-only data (credentials/invites) is never persisted when demo mode is off.
Demo mode is controlled by `VITE_ENABLE_DEMO_MODE` or `VITE_DEMO_MODE`.
Tests can override with `globalThis.__CLIMATRAK_DEMO_MODE__`.

## Cleanup and rotation
- On logout or tenant change, call `appStorage.clearByScope({ tenant, userId })`.
- Legacy keys are migrated and removed via `migrateLegacyStorage()`.

## Guardrails
- Direct `localStorage`/`sessionStorage` usage is blocked by ESLint.
- Use `appStorage` and add new keys to `STORAGE_KEYS` + schema map.

## Adding a new key
1. Add the key to `STORAGE_KEYS`.
2. Define a Zod schema and scope in `storageDefinitions`.
3. Use `appStorage.get/set/remove` with proper scope overrides.
4. If migrating a legacy key, add it to `migrateLegacyStorage()`.

## Testing
- See `frontend/src/__tests__/storagePolicy.test.ts` for policy checks.
