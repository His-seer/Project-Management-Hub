/// <reference types="cypress" />

/**
 * PM Hub – Project Creation E2E Tests (Fixed)
 */
describe('Create New Project', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/projects/new');
    cy.contains('Create New Project').should('be.visible');
  });

  it('displays the new project wizard with "Basic Information" form', () => {
    cy.contains('Basic Information').should('be.visible');
    // Project name input has placeholder "e.g., Website Redesign"
    cy.get('input[placeholder="e.g., Website Redesign"]').should('be.visible');
  });

  it('Next button is disabled when name is empty', () => {
    cy.contains('button', 'Next').should('be.disabled');
  });

  it('requires name + dates before Next is enabled', () => {
    cy.get('input[placeholder="e.g., Website Redesign"]').type('Test Project');
    // dates still empty — Next still disabled
    cy.contains('button', 'Next').should('be.disabled');
    // fill dates
    cy.get('input[type="date"]').first().type('2026-01-01');
    cy.get('input[type="date"]').last().type('2026-12-31');
    cy.contains('button', 'Next').should('not.be.disabled');
  });

  it('creates a project and redirects to the project dashboard', () => {
    // Step 0: Basic Info
    cy.get('input[placeholder="e.g., Website Redesign"]').type('Cypress E2E Project');
    cy.get('input[type="date"]').first().type('2026-01-01');
    cy.get('input[type="date"]').last().type('2026-12-31');
    cy.contains('button', 'Next').click();

    // Step 1: Charter — skip
    cy.contains('Project Charter').should('be.visible');
    cy.contains('button', 'Next').click();

    // Step 2: Team — skip
    cy.contains('Team Setup').should('be.visible');
    cy.contains('button', 'Next').click();

    // Step 3: Jira — skip
    cy.contains('Link Jira Board').should('be.visible');
    cy.contains('button', 'Next').click();

    // Step 4: Risks — skip
    cy.contains('Initial Risk Assessment').should('be.visible');
    cy.contains('button', 'Next').click();

    // Step 5: Review — create
    cy.contains('Review & Create').should('be.visible');
    cy.contains('Cypress E2E Project').should('be.visible');
    cy.contains('button', 'Create Project').click();

    // Should redirect to the project dashboard
    cy.url().should('match', /\/projects\/[a-zA-Z0-9_-]+$/);
    cy.contains('Cypress E2E Project').should('be.visible');
  });

  it('newly created project appears on portfolio dashboard', () => {
    cy.get('input[placeholder="e.g., Website Redesign"]').type('Portfolio Check Project');
    cy.get('input[type="date"]').first().type('2026-02-01');
    cy.get('input[type="date"]').last().type('2026-11-30');
    cy.contains('button', 'Next').click();
    cy.contains('button', 'Next').click();
    cy.contains('button', 'Next').click();
    cy.contains('button', 'Next').click();
    cy.contains('button', 'Next').click();
    cy.contains('button', 'Create Project').click();

    cy.visit('/');
    cy.contains('Portfolio Check Project').should('be.visible');
  });
});
