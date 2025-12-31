// =============================================================================
// E2E Tests: Authentication Flow - ClimaTrak System
// =============================================================================
// Critical flow: Login centralizado e troca de tenant
// Priority: SMOKE (runs on every PR)

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear sessions before each test
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Login Centralizado', () => {
    it('should display login page correctly', () => {
      cy.visit('/login');

      // Check essential elements
      cy.get('input[name="username_or_email"], input[type="email"]').should('be.visible');
      cy.get('input[name="password"], input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');

      // Check branding
      cy.get('[data-testid="logo"], img[alt*="logo" i]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');

      cy.get('input[name="username_or_email"], input[type="email"]').type('invalid@test.com');
      cy.get('input[name="password"], input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();

      // Should show error message
      cy.get('[data-testid="error-message"], [role="alert"], .error', { timeout: 10000 }).should(
        'be.visible'
      );

      // Should stay on login page
      cy.url().should('include', '/login');
    });

    it('should login successfully with valid credentials', function () {
      cy.fixture('users').then((users) => {
        const user = users.admin;

        cy.visit('/login');

        cy.get('input[name="username_or_email"], input[type="email"]').type(user.username);
        cy.get('input[name="password"], input[type="password"]').type(user.password);
        cy.get('button[type="submit"]').click();

        // Should redirect away from login
        cy.url({ timeout: 15000 }).should('not.include', '/login');

        // Should have auth tokens in storage
        cy.window().then((win) => {
          expect(win.localStorage.getItem('access_token')).to.exist;
        });
      });
    });

    it('should persist session on page reload', function () {
      cy.fixture('users').then((users) => {
        const user = users.admin;

        // Login first
        cy.login(user.username, user.password);
        cy.visit('/');

        // Reload page
        cy.reload();

        // Should still be logged in (not redirected to login)
        cy.url({ timeout: 10000 }).should('not.include', '/login');
      });
    });
  });

  describe('Tenant Switching', () => {
    beforeEach(function () {
      cy.fixture('users').then((users) => {
        this.user = users.admin;
      });
    });

    it('should display tenant selector for multi-tenant users', function () {
      cy.login(this.user.username, this.user.password);
      cy.visit('/');

      // Look for tenant selector (may be in header or sidebar)
      cy.get(
        '[data-testid="tenant-selector"], [data-testid="tenant-switch"], [data-testid="current-tenant"]',
        { timeout: 10000 }
      ).should('be.visible');
    });

    it('should switch tenant without full page reload', function () {
      cy.login(this.user.username, this.user.password);
      cy.visit('/');

      // Get current tenant name
      cy.get('[data-testid="tenant-selector"], [data-testid="current-tenant"]', { timeout: 10000 })
        .invoke('text')
        .then((currentTenant) => {
          // Open tenant selector
          cy.get('[data-testid="tenant-selector"], [data-testid="tenant-switch"]').click();

          // Select a different tenant (if available)
          cy.get('[data-testid="tenant-list"] li, [role="option"]')
            .not(':contains("' + currentTenant.trim() + '")')
            .first()
            .click();

          // Verify tenant changed
          cy.get('[data-testid="tenant-selector"], [data-testid="current-tenant"]', {
            timeout: 10000,
          })
            .invoke('text')
            .should('not.eq', currentTenant);
        });
    });

    it('should update data context after tenant switch', function () {
      cy.login(this.user.username, this.user.password);
      cy.visit('/');

      // Intercept API calls to verify tenant header
      cy.intercept('GET', '**/api/**').as('apiCall');

      // Switch tenant
      cy.get('[data-testid="tenant-selector"], [data-testid="tenant-switch"]', {
        timeout: 10000,
      }).click();
      cy.get('[data-testid="tenant-list"] li, [role="option"]').first().click();

      // Wait for new data to load
      cy.wait('@apiCall', { timeout: 10000 });

      // Verify the app didn't crash
      cy.get('[data-testid="main-content"], main, [role="main"]').should('be.visible');
    });
  });

  describe('Logout', () => {
    it('should logout and redirect to login', function () {
      cy.fixture('users').then((users) => {
        const user = users.admin;

        cy.login(user.username, user.password);
        cy.visit('/');

        // Find and click logout button
        cy.get(
          '[data-testid="logout-button"], [data-testid="user-menu"]',
          { timeout: 10000 }
        ).click();

        // If user menu, click logout option
        cy.get('body').then(($body) => {
          if ($body.find('[data-testid="logout-option"]').length > 0) {
            cy.get('[data-testid="logout-option"]').click();
          }
        });

        // Should redirect to login
        cy.url({ timeout: 10000 }).should('include', '/login');

        // Tokens should be cleared
        cy.window().then((win) => {
          expect(win.localStorage.getItem('access_token')).to.be.null;
        });
      });
    });
  });
});
