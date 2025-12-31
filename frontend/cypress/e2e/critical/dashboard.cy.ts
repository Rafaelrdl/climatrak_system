// =============================================================================
// E2E Tests: Dashboard Flow - ClimaTrak System
// =============================================================================
// Critical flow: Listar dashboards (carrega sem erro + autorização ok)
// Priority: SMOKE (runs on every PR)

describe('Dashboard Flow', () => {
  beforeEach(function () {
    cy.fixture('users').then((users) => {
      this.adminUser = users.admin;
      this.viewerUser = users.viewer;
    });
  });

  describe('Main Dashboard', () => {
    beforeEach(function () {
      cy.login(this.adminUser.username, this.adminUser.password);
    });

    it('should load main dashboard without errors', () => {
      cy.visit('/');

      // Wait for dashboard to fully load
      cy.get(
        '[data-testid="dashboard"], [data-testid="main-dashboard"], main',
        { timeout: 20000 }
      ).should('be.visible');

      // Should not show error states
      cy.get('[data-testid="error-boundary"], [data-testid="error-message"]').should('not.exist');

      // Check for essential KPI widgets
      cy.get('[data-testid="kpi-card"], [data-testid="widget"], .card').should(
        'have.length.at.least',
        1
      );
    });

    it('should display KPI cards with data', () => {
      cy.visit('/');

      // Wait for KPIs to load
      cy.get('[data-testid="kpi-card"], [data-testid="stat-card"]', { timeout: 15000 }).should(
        'have.length.at.least',
        1
      );

      // KPIs should show values (not loading spinners)
      cy.get('[data-testid="kpi-value"], [data-testid="stat-value"]')
        .first()
        .should('not.contain', 'Loading');
    });

    it('should display charts without errors', () => {
      cy.visit('/');

      // Wait for charts to render
      cy.get('.recharts-wrapper, [data-testid="chart"], canvas', { timeout: 15000 }).should(
        'have.length.at.least',
        1
      );

      // Charts should have rendered content
      cy.get('.recharts-wrapper svg, [data-testid="chart"] svg').should(
        'have.length.at.least',
        1
      );
    });

    it('should handle empty states gracefully', () => {
      cy.visit('/');

      // If there are empty states, they should be properly styled
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="empty-state"]').length > 0) {
          cy.get('[data-testid="empty-state"]')
            .should('be.visible')
            .and('contain.text', /nenhum|vazio|empty/i);
        }
      });
    });
  });

  describe('CMMS Dashboard', () => {
    beforeEach(function () {
      cy.login(this.adminUser.username, this.adminUser.password);
    });

    it('should load CMMS dashboard', () => {
      cy.visit('/cmms');

      // Wait for dashboard to load
      cy.get('[data-testid="cmms-dashboard"], main', { timeout: 15000 }).should('be.visible');

      // Check for CMMS-specific widgets
      cy.get('[data-testid="wo-summary"], [data-testid="work-orders-widget"]').should(
        'be.visible'
      );
    });

    it('should display work order statistics', () => {
      cy.visit('/cmms');

      // Look for WO stats
      cy.get(
        '[data-testid="wo-stats"], [data-testid="wo-count"], [data-testid="open-wo-count"]',
        { timeout: 15000 }
      ).should('be.visible');
    });

    it('should navigate to work orders from dashboard', () => {
      cy.visit('/cmms');

      // Click on work orders widget/link
      cy.get(
        '[data-testid="wo-widget"] a, [data-testid="view-all-wo"], a[href*="work-orders"]',
        { timeout: 10000 }
      )
        .first()
        .click();

      // Should be on work orders page
      cy.url({ timeout: 10000 }).should('include', '/work-orders');
    });
  });

  describe('Monitor Dashboard', () => {
    beforeEach(function () {
      cy.login(this.adminUser.username, this.adminUser.password);
    });

    it('should load Monitor dashboard', () => {
      cy.visit('/monitor');

      // Wait for dashboard to load
      cy.get('[data-testid="monitor-dashboard"], main', { timeout: 15000 }).should('be.visible');
    });

    it('should display device/sensor overview', () => {
      cy.visit('/monitor');

      // Look for device/sensor counts
      cy.get(
        '[data-testid="device-count"], [data-testid="sensor-count"], [data-testid="online-count"]',
        { timeout: 15000 }
      ).should('be.visible');
    });

    it('should display alerts summary', () => {
      cy.visit('/monitor');

      // Look for alerts widget
      cy.get('[data-testid="alerts-summary"], [data-testid="alerts-widget"]', {
        timeout: 15000,
      }).should('be.visible');
    });
  });

  describe('Finance Dashboard', () => {
    beforeEach(function () {
      cy.login(this.adminUser.username, this.adminUser.password);
    });

    it('should load Finance dashboard', () => {
      cy.visit('/finance');

      // Wait for dashboard to load
      cy.get('[data-testid="finance-dashboard"], main', { timeout: 15000 }).should('be.visible');
    });

    it('should display budget overview', () => {
      cy.visit('/finance');

      // Look for budget widgets
      cy.get(
        '[data-testid="budget-summary"], [data-testid="planned-vs-actual"], [data-testid="cost-overview"]',
        { timeout: 15000 }
      ).should('be.visible');
    });

    it('should display cost breakdown chart', () => {
      cy.visit('/finance');

      // Look for cost breakdown chart
      cy.get(
        '[data-testid="cost-chart"], .recharts-wrapper, [data-testid="breakdown-chart"]',
        { timeout: 15000 }
      ).should('be.visible');
    });
  });

  describe('Authorization', () => {
    it('should restrict access based on user role', function () {
      // Login as viewer (limited permissions)
      cy.login(this.viewerUser.username, this.viewerUser.password);
      cy.visit('/');

      // Should not see admin-only elements
      cy.get('[data-testid="admin-settings"], [data-testid="user-management"]').should(
        'not.exist'
      );
    });

    it('should show appropriate navigation for role', function () {
      cy.login(this.viewerUser.username, this.viewerUser.password);
      cy.visit('/');

      // Navigation should be visible
      cy.get('nav, [data-testid="main-nav"]', { timeout: 10000 }).should('be.visible');

      // Should not see create/edit buttons if viewer
      cy.get('[data-testid="create-button"], [data-testid="edit-button"]').should('not.exist');
    });

    it('should redirect unauthorized access', function () {
      cy.login(this.viewerUser.username, this.viewerUser.password);

      // Try to access admin-only page
      cy.visit('/settings/users', { failOnStatusCode: false });

      // Should redirect or show unauthorized message
      cy.url({ timeout: 10000 }).then((url) => {
        const isRedirected = !url.includes('/settings/users');
        const hasError = Cypress.$('[data-testid="unauthorized"], [data-testid="forbidden"]')
          .length > 0;

        expect(isRedirected || hasError).to.be.true;
      });
    });
  });

  describe('Performance', () => {
    beforeEach(function () {
      cy.login(this.adminUser.username, this.adminUser.password);
    });

    it('should load dashboard within acceptable time', () => {
      const startTime = Date.now();

      cy.visit('/');

      // Dashboard should be interactive within 5 seconds
      cy.get('[data-testid="dashboard"], main', { timeout: 5000 })
        .should('be.visible')
        .then(() => {
          const loadTime = Date.now() - startTime;
          cy.log(`Dashboard loaded in ${loadTime}ms`);
          expect(loadTime).to.be.lessThan(5000);
        });
    });

    it('should not have console errors on load', () => {
      // Spy on console.error
      cy.visit('/', {
        onBeforeLoad(win) {
          cy.spy(win.console, 'error').as('consoleError');
        },
      });

      // Wait for page to stabilize
      cy.get('[data-testid="dashboard"], main', { timeout: 15000 }).should('be.visible');

      // Check no critical errors logged
      cy.get('@consoleError').then((spy) => {
        const calls = (spy as unknown as Cypress.Agent<sinon.SinonSpy>).getCalls();
        const criticalErrors = calls.filter((call) => {
          const msg = call.args.join(' ');
          // Ignore known non-critical errors
          return (
            !msg.includes('ResizeObserver') &&
            !msg.includes('Loading chunk') &&
            !msg.includes('favicon')
          );
        });

        expect(criticalErrors.length).to.equal(0);
      });
    });
  });
});
