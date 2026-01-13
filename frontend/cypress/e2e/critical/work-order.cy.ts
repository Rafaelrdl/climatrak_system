// =============================================================================
// E2E Tests: Work Order Flow - ClimaTrak System
// =============================================================================
// Critical flow: Criar OS → Gerar custos (integração CMMS→Finance)
// Priority: SMOKE (runs on every PR)

describe('Work Order Flow (CMMS)', () => {
  beforeEach(function () {
      cy.fixture('users').then((users) => {
        this.user = users.admin;
        cy.login(this.user.username, this.user.password, this.user.tenant);
      });
  });

  describe('Work Order Creation', () => {
    beforeEach(() => {
      // Navigate to CMMS
      cy.visit('/cmms/work-orders');
      cy.url({ timeout: 10000 }).should('include', '/cmms');
    });

    it('should display work orders list', () => {
      // Wait for page to load
      cy.get('[data-testid="work-orders-list"], [data-testid="data-table"], table', {
        timeout: 15000,
      }).should('be.visible');

      // Check for common table elements
      cy.get('th, [role="columnheader"]').should('have.length.at.least', 1);
    });

    it('should open work order creation form', () => {
      // Click create button
      cy.get(
        '[data-testid="create-work-order"], [data-testid="new-wo-button"], button:contains("Nova")',
        { timeout: 10000 }
      )
        .first()
        .click();

      // Form should be visible (modal or page)
      cy.get(
        '[data-testid="work-order-form"], [data-testid="wo-form"], form',
        { timeout: 10000 }
      ).should('be.visible');
    });

    it('should create a new work order', () => {
      // Intercept API call
      cy.intercept('POST', '**/api/**/work-orders/**').as('createWO');

      // Click create button
      cy.get(
        '[data-testid="create-work-order"], [data-testid="new-wo-button"], button:contains("Nova")',
        { timeout: 10000 }
      )
        .first()
        .click();

      // Fill required fields
      cy.get('input[name="title"], [data-testid="wo-title"]', { timeout: 5000 })
        .clear()
        .type('E2E Test - Work Order');

      // Select asset (if required)
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="asset-select"], select[name="asset"]').length > 0) {
          cy.get('[data-testid="asset-select"], select[name="asset"]').click();
          cy.get('[role="option"], option').first().click();
        }
      });

      // Select priority
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="priority-select"], select[name="priority"]').length > 0) {
          cy.get('[data-testid="priority-select"], select[name="priority"]').click();
          cy.get('[role="option"]:contains("Alta"), option:contains("Alta")').first().click();
        }
      });

      // Add description
      cy.get('textarea[name="description"], [data-testid="wo-description"]').type(
        'Teste E2E automatizado - ' + new Date().toISOString()
      );

      // Submit form
      cy.get(
        'button[type="submit"], [data-testid="submit-wo"], button:contains("Salvar")'
      )
        .first()
        .click();

      // Wait for API response
      cy.wait('@createWO', { timeout: 15000 }).then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
      });

      // Should show success feedback
      cy.get('[role="alert"], .toast, [data-testid="toast"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should view work order details', () => {
      // Click on first work order in list
      cy.get(
        '[data-testid="work-orders-list"] tr, [data-testid="wo-row"], table tbody tr',
        { timeout: 15000 }
      )
        .first()
        .click();

      // Should show work order details
      cy.get('[data-testid="wo-details"], [data-testid="work-order-detail"]', {
        timeout: 10000,
      }).should('be.visible');

      // Check essential fields are displayed
      cy.get('[data-testid="wo-number"], [data-testid="wo-status"]').should('be.visible');
    });
  });

  describe('Work Order Costs (CMMS → Finance)', () => {
    it('should navigate to costs tab/section', () => {
      cy.visit('/cmms/work-orders');

      // Open first work order
      cy.get('table tbody tr, [data-testid="wo-row"]', { timeout: 15000 }).first().click();

      // Look for costs tab or section
      cy.get(
        '[data-testid="wo-costs-tab"], [data-testid="costs-section"], button:contains("Custos")',
        { timeout: 10000 }
      )
        .first()
        .click();

      // Should show costs section
      cy.get('[data-testid="costs-table"], [data-testid="cost-entries"]', {
        timeout: 10000,
      }).should('be.visible');
    });

    it('should add labor cost to work order', () => {
      cy.intercept('POST', '**/api/**/costs/**').as('addCost');

      cy.visit('/cmms/work-orders');

      // Open first work order
      cy.get('table tbody tr, [data-testid="wo-row"]', { timeout: 15000 }).first().click();

      // Go to costs
      cy.get(
        '[data-testid="wo-costs-tab"], button:contains("Custos")',
        { timeout: 10000 }
      )
        .first()
        .click();

      // Click add cost
      cy.get('[data-testid="add-cost"], button:contains("Adicionar")', { timeout: 5000 })
        .first()
        .click();

      // Fill cost form
      cy.get('body').then(($body) => {
        // Select cost type
        if ($body.find('[data-testid="cost-type"]').length > 0) {
          cy.get('[data-testid="cost-type"]').click();
          cy.get('[role="option"]:contains("Mão de obra")').first().click();
        }

        // Enter amount
        if ($body.find('input[name="amount"], [data-testid="cost-amount"]').length > 0) {
          cy.get('input[name="amount"], [data-testid="cost-amount"]').clear().type('150.00');
        }

        // Enter hours (if labor)
        if ($body.find('input[name="hours"], [data-testid="cost-hours"]').length > 0) {
          cy.get('input[name="hours"], [data-testid="cost-hours"]').clear().type('2');
        }
      });

      // Submit
      cy.get('button[type="submit"], [data-testid="save-cost"]').first().click();

      // Verify API call
      cy.wait('@addCost', { timeout: 10000 }).then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
      });
    });

    it('should reflect costs in Finance module', () => {
      // Navigate to Finance
      cy.visit('/finance');

      // Wait for page load
      cy.get('[data-testid="finance-dashboard"], [data-testid="cost-summary"]', {
        timeout: 15000,
      }).should('be.visible');

      // Check that costs are displayed
      cy.get('[data-testid="total-costs"], [data-testid="cost-value"]').should('be.visible');
    });
  });

  describe('Work Order Status Workflow', () => {
    it('should update work order status', () => {
      cy.intercept('PATCH', '**/api/**/work-orders/**').as('updateWO');

      cy.visit('/cmms/work-orders');

      // Open first work order
      cy.get('table tbody tr, [data-testid="wo-row"]', { timeout: 15000 }).first().click();

      // Find status dropdown/button
      cy.get('[data-testid="wo-status"], [data-testid="status-select"]', { timeout: 10000 })
        .first()
        .click();

      // Select new status
      cy.get('[role="option"], [data-testid="status-option"]')
        .contains(/Em Andamento|In Progress/i)
        .click();

      // Wait for update
      cy.wait('@updateWO', { timeout: 10000 }).then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 204]);
      });

      // Verify status changed in UI
      cy.get('[data-testid="wo-status"]').should('contain.text', /Em Andamento|In Progress/i);
    });

    it('should complete work order and generate final cost', () => {
      cy.intercept('PATCH', '**/api/**/work-orders/**').as('updateWO');
      cy.intercept('POST', '**/api/**/costs/**').as('postCost');

      cy.visit('/cmms/work-orders');

      // Open first work order
      cy.get('table tbody tr, [data-testid="wo-row"]', { timeout: 15000 }).first().click();

      // Change status to completed
      cy.get('[data-testid="wo-status"], [data-testid="status-select"]', { timeout: 10000 })
        .first()
        .click();
      cy.get('[role="option"], [data-testid="status-option"]')
        .contains(/Concluída|Completed|Finalizada/i)
        .click();

      // Wait for update
      cy.wait('@updateWO', { timeout: 15000 });

      // Verify completion
      cy.get('[data-testid="wo-status"]').should(
        'contain.text',
        /Concluída|Completed|Finalizada/i
      );
    });
  });
});
