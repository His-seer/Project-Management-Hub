/// <reference types="cypress" />

/**
 * PM Hub – Project Module Pages E2E Tests (Fixed)
 * Uses cy.visit() directly after seeding localStorage to avoid timing issues.
 */

const SAMPLE_ID = 'sample-cloud-migration';

/** Seed localStorage with sample project data via JS, then visit the URL */
function visitModule(path: string) {
  cy.clearLocalStorage();
  cy.visit('/');
  // Click the sample loader and wait for the card to appear in the DOM
  cy.get('button').contains('Load Sample Project').click();
  cy.contains('AWS Cloud Migration', { timeout: 8000 }).should('be.visible');
  // Now navigate directly — store is hydrated
  const url = path ? `/projects/${SAMPLE_ID}/${path}` : `/projects/${SAMPLE_ID}`;
  cy.visit(url);
  cy.url().should('include', SAMPLE_ID);
}

describe('Project Dashboard', () => {
  before(() => visitModule(''));

  it('shows overall completeness and open risk cards', () => {
    cy.contains('Overall Completeness').should('be.visible');
    cy.contains('Open Risks').should('be.visible');
    cy.contains('Open Issues').should('be.visible');
    cy.contains('Timeline Progress').should('be.visible');
  });

  it('shows Project Snapshot section', () => {
    cy.contains('Project Snapshot').should('be.visible');
  });

  it('links to Status Report from snapshot', () => {
    cy.contains('a', 'Status Report').should('exist');
  });
});

describe('Project Charter', () => {
  before(() => visitModule('charter'));

  it('loads the charter page with correct heading', () => {
    cy.contains('h1', 'Project Charter').should('be.visible');
  });

  it('shows Document Control section', () => {
    cy.contains('Document Control').should('be.visible');
    cy.contains('Version').should('be.visible');
  });

  it('shows Executive Summary textarea', () => {
    cy.contains('Executive Summary').should('be.visible');
    cy.get('textarea').should('have.length.greaterThan', 0);
  });

  it('shows Objectives with 3 columns', () => {
    cy.contains('Project Objectives').should('be.visible');
    cy.contains('Business Objectives').should('be.visible');
    cy.contains('Technology Objectives').should('be.visible');
  });

  it('shows Scope and Out of Scope fields', () => {
    cy.contains('In Scope').should('be.visible');
    cy.contains('Out of Scope').should('be.visible');
  });

  it('Export PDF button is present', () => {
    cy.contains('Export PDF').should('be.visible');
  });
});

describe('Risk Register', () => {
  before(() => visitModule('risks'));

  it('loads the Risk Register page', () => {
    cy.contains('Risk Register').should('be.visible');
  });

  it('shows the risk heat map', () => {
    cy.contains('Risk Heat Map').should('be.visible');
  });

  it('shows risk table with STATUS column', () => {
    cy.get('table').should('exist');
    cy.contains('STATUS').should('be.visible');
  });

  it('Add Risk button is present', () => {
    cy.get('button').contains(/Add Risk/i).should('exist');
  });
});

describe('Gantt Chart', () => {
  before(() => visitModule('gantt'));

  it('loads the Gantt Chart page', () => {
    cy.contains('h1', 'Gantt Chart').should('be.visible');
  });

  it('shows timeline section', () => {
    cy.contains('Timeline').should('be.visible');
  });

  it('shows editable task table with START/END columns', () => {
    cy.contains('START').should('be.visible');
    cy.contains('END').should('be.visible');
    cy.contains('TASK').should('be.visible');
  });
});

describe('KPI Dashboard', () => {
  before(() => visitModule('kpi'));

  it('loads KPI Dashboard', () => {
    cy.contains('h1', 'KPI Dashboard').should('be.visible');
  });

  it('shows KPI table column headers', () => {
    cy.contains('KPI NAME').should('be.visible');
    cy.contains('CATEGORY').should('be.visible');
    cy.contains('TARGET').should('be.visible');
    cy.contains('ACTUAL').should('be.visible');
  });

  it('Add Row button is present', () => {
    cy.contains('Add Row').should('exist');
  });
});

describe('Change Management', () => {
  before(() => visitModule('changes'));

  it('loads the Change Management page', () => {
    cy.contains('h1', 'Change Management').should('be.visible');
  });

  it('shows Change Log tab', () => {
    cy.contains('Change Log').should('be.visible');
  });

  it('shows Change Requests tab', () => {
    cy.contains('Change Requests').should('be.visible');
  });

  it('Add Row button is present in Change Log', () => {
    cy.contains('Change Log').click();
    cy.contains('Add Row').should('exist');
  });
});

describe('Status Reports', () => {
  before(() => visitModule('status-report'));

  it('loads the Status Reports page', () => {
    cy.contains('h1', 'Status Reports').should('be.visible');
  });

  it('shows completeness and health summary cards', () => {
    cy.contains('Completeness').should('be.visible');
    cy.contains('Health').should('be.visible');
  });

  it('shows AI Generate and New Report buttons', () => {
    cy.contains('button', 'AI Generate').should('be.visible');
    cy.contains('button', 'New Report').should('be.visible');
  });
});

describe('Settings Page', () => {
  beforeEach(() => cy.visit('/settings'));

  it('loads the Settings page', () => {
    cy.contains('h1', 'Settings').should('be.visible');
  });

  it('shows Atlassian Integration section', () => {
    cy.contains('Atlassian Integration').should('be.visible');
    cy.contains('Atlassian Base URL').should('be.visible');
  });

  it('shows Data Management with export and import', () => {
    cy.contains('Data Management').should('be.visible');
    cy.contains('Export All Projects').should('be.visible');
    cy.contains('Import Projects').should('be.visible');
  });
});
