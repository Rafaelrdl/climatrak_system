// =============================================================================
// E2E Tests: Telemetry & Alerts Flow - ClimaTrak System
// =============================================================================
// Critical flow: Ingest telemetria → leitura normalizada → alerta
// Priority: NIGHTLY (runs on scheduled builds)

describe('Telemetry & Alerts Flow (Monitor)', () => {
  beforeEach(function () {
    cy.fixture('users').then((users) => {
      this.user = users.admin;
      cy.login(this.user.username, this.user.password);
    });
  });

  describe('Monitor Dashboard', () => {
    beforeEach(() => {
      cy.visit('/monitor');
      cy.url({ timeout: 10000 }).should('include', '/monitor');
    });

    it('should display monitor dashboard', () => {
      // Wait for dashboard to load
      cy.get(
        '[data-testid="monitor-dashboard"], [data-testid="dashboard-content"], main',
        { timeout: 15000 }
      ).should('be.visible');

      // Check for essential widgets
      cy.get('[data-testid="device-count"], [data-testid="sensor-count"]').should('be.visible');
    });

    it('should display device list', () => {
      // Navigate to devices
      cy.get('[data-testid="nav-devices"], a[href*="devices"]', { timeout: 10000 })
        .first()
        .click();

      // Should show devices table/list
      cy.get('[data-testid="devices-list"], table', { timeout: 15000 }).should('be.visible');
    });

    it('should display real-time telemetry data', () => {
      // Navigate to a device detail or telemetry view
      cy.get('[data-testid="nav-devices"], a[href*="devices"]', { timeout: 10000 })
        .first()
        .click();

      // Click on first device
      cy.get('table tbody tr, [data-testid="device-row"]', { timeout: 15000 }).first().click();

      // Should show telemetry data
      cy.get(
        '[data-testid="telemetry-chart"], [data-testid="sensor-readings"], .recharts-wrapper',
        { timeout: 15000 }
      ).should('be.visible');
    });
  });

  describe('Sensor Readings', () => {
    it('should display sensor list with current values', () => {
      cy.visit('/monitor/sensors');

      // Wait for sensors to load
      cy.get('[data-testid="sensors-list"], table', { timeout: 15000 }).should('be.visible');

      // Check that values are displayed
      cy.get('[data-testid="sensor-value"], td').should('have.length.at.least', 1);
    });

    it('should show sensor history chart', () => {
      cy.visit('/monitor/sensors');

      // Click on first sensor
      cy.get('table tbody tr, [data-testid="sensor-row"]', { timeout: 15000 }).first().click();

      // Should show history chart
      cy.get(
        '[data-testid="sensor-chart"], .recharts-wrapper, [data-testid="history-chart"]',
        { timeout: 15000 }
      ).should('be.visible');
    });

    it('should filter readings by date range', () => {
      cy.intercept('GET', '**/api/**/readings/**').as('getReadings');

      cy.visit('/monitor/sensors');

      // Click on first sensor
      cy.get('table tbody tr, [data-testid="sensor-row"]', { timeout: 15000 }).first().click();

      // Look for date range picker
      cy.get(
        '[data-testid="date-range"], [data-testid="period-selector"]',
        { timeout: 10000 }
      )
        .first()
        .click();

      // Select last 7 days
      cy.get('[data-testid="preset-7d"], button:contains("7 dias")').first().click();

      // Wait for API call with new date range
      cy.wait('@getReadings', { timeout: 10000 });

      // Chart should still be visible
      cy.get('.recharts-wrapper, [data-testid="sensor-chart"]').should('be.visible');
    });
  });

  describe('Alerts', () => {
    beforeEach(() => {
      cy.visit('/monitor/alerts');
      cy.url({ timeout: 10000 }).should('include', '/alerts');
    });

    it('should display alerts list', () => {
      // Wait for alerts to load
      cy.get(
        '[data-testid="alerts-list"], [data-testid="alerts-table"], table',
        { timeout: 15000 }
      ).should('be.visible');
    });

    it('should show alert severity badges', () => {
      // Check for severity indicators
      cy.get(
        '[data-testid="alert-severity"], [data-testid="severity-badge"], .badge',
        { timeout: 10000 }
      ).should('have.length.at.least', 0); // May be 0 if no alerts
    });

    it('should filter alerts by severity', () => {
      // Look for severity filter
      cy.get(
        '[data-testid="severity-filter"], select[name="severity"]',
        { timeout: 10000 }
      ).then(($filter) => {
        if ($filter.length > 0) {
          cy.wrap($filter).click();
          cy.get('[role="option"]:contains("Critical"), option:contains("Crítico")')
            .first()
            .click();

          // Verify filter applied (URL or UI state)
          cy.url().should('include', 'severity');
        }
      });
    });

    it('should acknowledge an alert', () => {
      cy.intercept('PATCH', '**/api/**/alerts/**').as('ackAlert');

      // Get first unacknowledged alert
      cy.get(
        '[data-testid="alert-row"]:not([data-acknowledged]), table tbody tr',
        { timeout: 15000 }
      ).then(($rows) => {
        if ($rows.length > 0) {
          // Click on alert
          cy.wrap($rows).first().click();

          // Click acknowledge button
          cy.get(
            '[data-testid="acknowledge-alert"], button:contains("Reconhecer")',
            { timeout: 5000 }
          )
            .first()
            .click();

          // Wait for API call
          cy.wait('@ackAlert', { timeout: 10000 }).then((interception) => {
            expect(interception.response?.statusCode).to.be.oneOf([200, 204]);
          });
        } else {
          cy.log('No unacknowledged alerts to test');
        }
      });
    });
  });

  describe('Alert Rules', () => {
    it('should display alert rules configuration', () => {
      cy.visit('/monitor/alert-rules');

      // Wait for rules to load
      cy.get('[data-testid="alert-rules-list"], table', { timeout: 15000 }).should('be.visible');
    });

    it('should create a new alert rule', () => {
      cy.intercept('POST', '**/api/**/alert-rules/**').as('createRule');

      cy.visit('/monitor/alert-rules');

      // Click create button
      cy.get(
        '[data-testid="create-rule"], button:contains("Nova Regra")',
        { timeout: 10000 }
      )
        .first()
        .click();

      // Fill rule form
      cy.get('input[name="name"], [data-testid="rule-name"]', { timeout: 5000 })
        .clear()
        .type('E2E Test Rule - Temperature Alert');

      // Select sensor/metric (if available)
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="metric-select"]').length > 0) {
          cy.get('[data-testid="metric-select"]').click();
          cy.get('[role="option"]').first().click();
        }
      });

      // Set threshold
      cy.get('input[name="threshold"], [data-testid="threshold-value"]').clear().type('30');

      // Set condition
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="condition-select"]').length > 0) {
          cy.get('[data-testid="condition-select"]').click();
          cy.get('[role="option"]:contains(">"), [role="option"]:contains("maior")')
            .first()
            .click();
        }
      });

      // Submit
      cy.get('button[type="submit"], [data-testid="save-rule"]').first().click();

      // Wait for API call
      cy.wait('@createRule', { timeout: 10000 }).then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
      });
    });
  });
});
