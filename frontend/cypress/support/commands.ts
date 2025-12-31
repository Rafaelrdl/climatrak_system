// ***********************************************
// Cypress Custom Commands - ClimaTrak System
// ***********************************************

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

Cypress.Commands.add('login', (username: string, password: string, tenant?: string) => {
  cy.session(
    [username, tenant],
    () => {
      // Login via API for speed
      cy.request({
        method: 'POST',
        url: `${Cypress.env('API_URL')}/api/v1/auth/login/`,
        body: {
          username_or_email: username,
          password: password,
        },
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status === 200) {
          const { access, refresh, user, tenants } = response.body;

          // Store tokens
          window.localStorage.setItem('access_token', access);
          window.localStorage.setItem('refresh_token', refresh);
          window.localStorage.setItem('user', JSON.stringify(user));

          // If tenant specified, select it
          if (tenant && tenants?.length > 0) {
            const selectedTenant = tenants.find(
              (t: { schema_name: string }) => t.schema_name === tenant
            );
            if (selectedTenant) {
              window.localStorage.setItem('current_tenant', JSON.stringify(selectedTenant));
            }
          } else if (tenants?.length > 0) {
            // Default to first tenant
            window.localStorage.setItem('current_tenant', JSON.stringify(tenants[0]));
          }
        }
      });
    },
    {
      validate: () => {
        cy.window().its('localStorage.access_token').should('exist');
      },
    }
  );
});

Cypress.Commands.add('loginViaUI', (username: string, password: string) => {
  cy.visit('/login');

  // Wait for page load
  cy.get('input[name="username_or_email"], input[type="email"]', { timeout: 10000 }).should(
    'be.visible'
  );

  // Fill credentials
  cy.get('input[name="username_or_email"], input[type="email"]').clear().type(username);
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
