/// <reference types="cypress" />

/**
 * PM Hub – Portfolio & Navigation E2E Tests (Fixed)
 */
describe('Portfolio Dashboard', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('loads with correct title and empty state', () => {
    cy.title().should('include', 'PM Hub');
    cy.contains('h1', 'Portfolio Dashboard').should('be.visible');
    cy.contains('0 projects across your portfolio').should('be.visible');
    cy.contains('No projects yet').should('be.visible');
  });

  it('shows summary cards: Active, At Risk, Completed, On Hold', () => {
    cy.contains('Active').should('exist');
    cy.contains('At Risk').should('exist');
    cy.contains('Completed').should('exist');
    cy.contains('On Hold').should('exist');
  });

  it('loads sample project and displays it on the dashboard', () => {
    // click the "Load Sample Project" button (not the sidebar link)
    cy.get('button').contains('Load Sample Project').click();
    cy.contains('AWS Cloud Migration').should('be.visible');
    cy.contains('1 project across your portfolio').should('be.visible');
    cy.contains('Project Completeness').should('be.visible');
    cy.contains('Open Risks & Issues').should('be.visible');
  });

  it('navigates to New Project page via primary CTA button', () => {
    // Target the btn-primary link specifically (not sidebar link)
    cy.get('a.btn-primary').contains('New Project').click();
    cy.url().should('include', '/projects/new');
  });

  it('sidebar shows Portfolio and New Project links', () => {
    cy.get('aside').first().within(() => {
      cy.contains('Portfolio').should('exist');
      cy.contains('New Project').should('exist');
    });
  });

  it('sidebar collapses to w-16 and expands back', () => {
    // The desktop aside starts at w-64; click the collapse button inside it
    cy.get('aside.hidden').first().within(() => {
      cy.get('button').first().click({ force: true });
    });
    cy.get('aside.hidden').first().should('have.class', 'w-16');
    // Click expand button (now the only button visible)
    cy.get('aside.hidden').first().within(() => {
      cy.get('button').first().click({ force: true });
    });
    cy.get('aside.hidden').first().should('have.class', 'w-64');
  });
});

describe('Sidebar Navigation (inside project)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/');
    cy.get('button').contains('Load Sample Project').click();
    // Wait for the store to hydrate and the project card to appear
    cy.contains('AWS Cloud Migration', { timeout: 5000 }).should('be.visible');
    cy.visit('/projects/sample-cloud-migration');
    cy.url().should('include', 'sample-cloud-migration');
  });

  const moduleLinks = [
    'Charter', 'Project Plan', 'Gantt Chart', 'WBS', 'Estimates',
    'Roadmap', 'Assumptions', 'RACI Matrix', 'Stakeholders', 'Resources',
    'Comms Plan', 'Jira Hub', 'Issue Tracker', 'Meetings', 'Decision Log',
    'Dashboard', 'KPI Dashboard', 'Risk Register', 'Changes', 'Status Report',
    'Governance', 'Funding', 'Lessons Learned', 'Confluence Hub',
  ];

  moduleLinks.forEach((label) => {
    it(`sidebar link exists: ${label}`, () => {
      cy.get('aside').first().contains(label).should('exist');
    });
  });
});
