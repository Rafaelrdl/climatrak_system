// ***********************************************************
// Cypress E2E Support File - ClimaTrak System
// ***********************************************************
// This file is processed and loaded automatically before test files.
// Put global configuration and behavior that modifies Cypress.

import './commands';

// Prevent uncaught exceptions from failing tests (for SPA routing)
Cypress.on('uncaught:exception', (err) => {
  // Ignore ResizeObserver loop errors (common in React apps)
  if (err.message.includes('ResizeObserver loop')) {
    return false;
  }
  // Ignore chunk loading errors (lazy loading)
  if (err.message.includes('Loading chunk')) {
    return false;
  }
  return true;
});

// Log test name for debugging
beforeEach(() => {
  cy.log(`Running: ${Cypress.currentTest.title}`);
});
