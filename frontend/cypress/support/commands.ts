// ***********************************************
// Cypress Custom Commands - ClimaTrak System
// ***********************************************

import { defaultPreferences, defaultSecurity, type UserRole } from '../../src/models/user';

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login via API (bypasses UI for speed)
       */
      login(username: string, password: string, tenant?: string): Chainable<void>;

      /**
       * Login via UI (for testing login flow)
       */
      loginViaUI(username: string, password: string): Chainable<void>;

      /**
       * Select tenant from tenant selector
       */
      selectTenant(tenantName: string): Chainable<void>;

      /**
       * Get element by data-testid
       */
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Wait for API call to complete
       */
      waitForApi(alias: string, timeout?: number): Chainable<void>;

      /**
       * Check if toast/notification appears
       */
      checkToast(message: string, type?: 'success' | 'error' | 'warning'): Chainable<void>;

      /**
       * Navigate to app section
       */
      navigateTo(section: 'cmms' | 'monitor' | 'finance' | 'settings'): Chainable<void>;
    }
  }
}

// =============================================================================
// LOGIN COMMANDS
// =============================================================================

const normalizeApiBaseUrl = (apiUrl: string): string => {
  const trimmed = apiUrl.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const normalizeRole = (role?: string | null): UserRole => {
  const normalized = (role || '').toLowerCase();
  const allowed: UserRole[] = ['owner', 'admin', 'operator', 'technician', 'requester', 'viewer'];
  return allowed.includes(normalized as UserRole) ? (normalized as UserRole) : 'viewer';
};

Cypress.Commands.add('login', (username: string, password: string, tenant?: string) => {
  const apiUrl = normalizeApiBaseUrl(Cypress.env('API_URL') || 'http://127.0.0.1:8000');

  cy.session(
    [username, tenant],
    () => {
      // Login via centralized auth (cookie-based)
      cy.request({
        method: 'POST',
        url: `${apiUrl}/v2/auth/login/`,
        body: {
          email: username,
          password: password,
        },
        failOnStatusCode: false,
      })
        .then((response) => {
          if (response.status !== 200) {
            throw new Error(`Login failed with status ${response.status}`);
          }

          if (response.body?.requires_tenant_selection) {
            const tenants = response.body?.tenants || [];
            const matchedTenant = tenant
              ? tenants.find(
                  (item: { schema_name?: string; slug?: string }) =>
                    item.schema_name === tenant || item.slug === tenant
                )
              : null;
            const schemaName =
              matchedTenant?.schema_name || tenants[0]?.schema_name || tenants[0]?.slug || tenant;
            if (!schemaName) {
              throw new Error('Tenant selection required but no tenant provided.');
            }

            return cy.request({
              method: 'POST',
              url: `${apiUrl}/v2/auth/select-tenant/`,
              body: {
                email: username,
                password: password,
                schema_name: schemaName,
              },
              failOnStatusCode: false,
            });
          }

          return response;
        })
        .then((response) => {
          if (response.status !== 200) {
            throw new Error(`Tenant login failed with status ${response.status}`);
          }

          const responseUser = response.body?.user || {};
          const responseTenant = response.body?.tenant || {};
          const role = normalizeRole(responseTenant.role);
          const tenantSchema = responseTenant.schema_name || tenant || 'default';
          const tenantSlug = responseTenant.slug || tenantSchema;

          const authUser = {
            id: String(responseUser.id || tenantSchema),
            name: responseUser.full_name || responseUser.email || username,
            email: responseUser.email || username,
            role,
            status: 'active',
            avatar_url: responseUser.avatar || undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            preferences: { ...defaultPreferences },
            security: { ...defaultSecurity },
          };

          const tenantConfig = {
            tenantId: String(responseTenant.id || tenantSchema),
            tenantSlug,
            tenantName: responseTenant.name || tenantSchema,
            apiBaseUrl: apiUrl,
          };

          const features = responseTenant.features || {};

          cy.visit('/', {
            onBeforeLoad(win) {
              win.localStorage.setItem('auth:user', JSON.stringify(authUser));
              win.localStorage.setItem('auth:role', role);
              win.localStorage.setItem('auth:tenant_schema', tenantSchema);
              win.localStorage.setItem(
                'current_tenant',
                JSON.stringify({
                  tenantId: tenantConfig.tenantId,
                  tenantSlug: tenantConfig.tenantSlug,
                  tenantName: tenantConfig.tenantName,
                })
              );
              win.localStorage.setItem(
                `${tenantSchema}:tenant_config`,
                JSON.stringify(tenantConfig)
              );
              win.localStorage.setItem(
                'tenant:features',
                JSON.stringify({
                  state: { features },
                  version: 0,
                })
              );
            },
          });
        });
    },
    {
      validate: () => {
        cy.window().then((win) => {
          expect(win.localStorage.getItem('auth:user')).to.exist;
          expect(win.localStorage.getItem('auth:tenant_schema')).to.exist;
        });
      },
    }
  );
});

Cypress.Commands.add('loginViaUI', (username: string, password: string) => {
  const encodedEmail = encodeURIComponent(username);
  cy.visit(`/login?email=${encodedEmail}`);

  // Wait for password step
  cy.get('input[name="password"], input[type="password"]', { timeout: 10000 }).should('be.visible');

  // Fill credentials
  cy.get('input[name="password"], input[type="password"]').clear().type(password);

  // Submit
  cy.get('button[type="submit"]').click();

  // Wait for redirect (dashboard or tenant selector)
  cy.url({ timeout: 15000 }).should('not.include', '/login');
});

Cypress.Commands.add('selectTenant', (tenantName: string) => {
  // Look for tenant selector button or dropdown
  cy.get('[data-testid="tenant-selector"], [data-testid="tenant-switch"]', { timeout: 5000 })
    .should('be.visible')
    .click();

  // Select tenant from list
  cy.contains(tenantName).click();

  // Wait for tenant switch to complete
  cy.get('[data-testid="tenant-selector"]', { timeout: 10000 }).should('contain', tenantName);
});

// =============================================================================
// UTILITY COMMANDS
// =============================================================================

Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

Cypress.Commands.add('waitForApi', (alias: string, timeout = 30000) => {
  cy.wait(`@${alias}`, { timeout });
});

Cypress.Commands.add('checkToast', (message: string, type?: string) => {
  const toastSelector = type
    ? `[data-testid="toast-${type}"], .toast-${type}, [role="alert"]`
    : '[data-testid="toast"], .toast, [role="alert"]';

  cy.get(toastSelector, { timeout: 5000 }).should('contain', message);
});

Cypress.Commands.add('navigateTo', (section: 'cmms' | 'monitor' | 'finance' | 'settings') => {
  const routes: Record<string, string> = {
    cmms: '/cmms',
    monitor: '/monitor',
    finance: '/finance',
    settings: '/settings',
  };

  // Try clicking nav item first
  cy.get(`[data-testid="nav-${section}"], a[href*="${routes[section]}"]`, { timeout: 5000 })
    .first()
    .click({ force: true });

  // Verify navigation
  cy.url({ timeout: 10000 }).should('include', routes[section]);
});

export {};
