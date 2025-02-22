import { Equipment, EquipmentType } from '../../src/models/equipment.model';
// @ts-ignore - Cypress global type
import { cy } from 'cypress';

// Test data constants
const TEST_EQUIPMENT: Equipment = {
  id: 1,
  serialNumber: 'TEST-123',
  model: 'Test Model',
  type: EquipmentType.Laptop,
  condition: 'New',
  isActive: true,
  isAvailable: true,
  purchaseDate: new Date('2023-01-01'),
  lastMaintenanceDate: new Date('2023-01-01'),
  notes: 'Test equipment'
};

const API_ROUTES = {
  equipment: '/api/v1/equipment',
  assignments: '/api/v1/equipment/assignments'
};

describe('Equipment Management', () => {
  beforeEach(() => {
    // Configure test retries for flaky test handling
    Cypress.config('retries', 2);

    // Reset state before each test
    cy.clearLocalStorage();
    cy.clearCookies();

    // Login and navigate to equipment page
    cy.loginAsAdmin();
    cy.visit('/equipment');

    // Setup API interceptions
    setupApiInterceptions();

    // Wait for initial data load
    cy.wait('@getEquipmentList');

    // Verify page accessibility
    cy.injectAxe();
    cy.checkA11y();
  });

  describe('Equipment List View', () => {
    it('displays equipment list with correct columns and data', () => {
      // Verify table headers
      cy.get('[data-test="equipment-table-header"]').within(() => {
        cy.contains('Serial Number').should('be.visible');
        cy.contains('Model').should('be.visible');
        cy.contains('Type').should('be.visible');
        cy.contains('Condition').should('be.visible');
        cy.contains('Status').should('be.visible');
      });

      // Verify data display
      cy.get('[data-test="equipment-row"]').first().within(() => {
        cy.contains(TEST_EQUIPMENT.serialNumber).should('be.visible');
        cy.contains(TEST_EQUIPMENT.model).should('be.visible');
        cy.contains(TEST_EQUIPMENT.type).should('be.visible');
        cy.contains(TEST_EQUIPMENT.condition).should('be.visible');
      });

      // Test sorting functionality
      cy.get('[data-test="sort-serial-number"]').click();
      cy.wait('@getEquipmentList');
      cy.get('[data-test="equipment-row"]').should('be.sorted');
    });

    it('implements search and filtering correctly', () => {
      // Test search functionality
      cy.get('[data-test="search-input"]')
        .type(TEST_EQUIPMENT.serialNumber);
      cy.wait('@getEquipmentList');
      cy.get('[data-test="equipment-row"]')
        .should('have.length', 1)
        .and('contain', TEST_EQUIPMENT.serialNumber);

      // Test type filter
      cy.get('[data-test="type-filter"]')
        .click()
        .get(`[data-value="${EquipmentType.Laptop}"]`)
        .click();
      cy.wait('@getEquipmentList');
      cy.get('[data-test="equipment-row"]')
        .should('contain', EquipmentType.Laptop);
    });

    it('handles pagination correctly', () => {
      // Verify pagination controls
      cy.get('[data-test="pagination"]').within(() => {
        cy.get('[data-test="page-size-select"]').should('be.visible');
        cy.get('[data-test="page-number"]').should('be.visible');
      });

      // Test page navigation
      cy.get('[data-test="next-page"]').click();
      cy.wait('@getEquipmentList');
      cy.get('[data-test="page-number"]').should('contain', '2');
    });
  });

  describe('Equipment Creation', () => {
    it('creates new equipment successfully', () => {
      cy.get('[data-test="add-equipment"]').click();

      // Fill form
      cy.get('[data-test="equipment-form"]').within(() => {
        cy.get('[data-test="serial-number"]').type(TEST_EQUIPMENT.serialNumber);
        cy.get('[data-test="model"]').type(TEST_EQUIPMENT.model);
        cy.get('[data-test="type"]').select(TEST_EQUIPMENT.type);
        cy.get('[data-test="condition"]').type(TEST_EQUIPMENT.condition);
        cy.get('[data-test="notes"]').type(TEST_EQUIPMENT.notes);
        cy.get('[data-test="submit"]').click();
      });

      // Verify success
      cy.wait('@createEquipment');
      cy.get('[data-test="success-message"]')
        .should('be.visible')
        .and('contain', 'Equipment created successfully');
    });

    it('validates required fields', () => {
      cy.get('[data-test="add-equipment"]').click();
      cy.get('[data-test="submit"]').click();

      // Verify validation messages
      cy.get('[data-test="serial-number-error"]')
        .should('be.visible')
        .and('contain', 'Serial number is required');
      cy.get('[data-test="model-error"]')
        .should('be.visible')
        .and('contain', 'Model is required');
    });
  });

  describe('Equipment Assignment', () => {
    it('assigns equipment to inspector successfully', () => {
      cy.get('[data-test="assign-equipment"]').first().click();

      // Select inspector and fill assignment details
      cy.get('[data-test="assignment-form"]').within(() => {
        cy.get('[data-test="inspector-select"]').select('1');
        cy.get('[data-test="assignment-notes"]').type('Test assignment');
        cy.get('[data-test="submit-assignment"]').click();
      });

      // Verify success
      cy.wait('@createAssignment');
      cy.get('[data-test="success-message"]')
        .should('be.visible')
        .and('contain', 'Equipment assigned successfully');
    });

    it('handles assignment errors appropriately', () => {
      cy.intercept('POST', API_ROUTES.assignments, {
        statusCode: 400,
        body: { error: 'Equipment already assigned' }
      }).as('failedAssignment');

      cy.get('[data-test="assign-equipment"]').first().click();
      cy.get('[data-test="assignment-form"]').within(() => {
        cy.get('[data-test="inspector-select"]').select('1');
        cy.get('[data-test="submit-assignment"]').click();
      });

      cy.wait('@failedAssignment');
      cy.get('[data-test="error-message"]')
        .should('be.visible')
        .and('contain', 'Equipment already assigned');
    });
  });

  describe('Equipment Return', () => {
    it('processes equipment return successfully', () => {
      cy.get('[data-test="return-equipment"]').first().click();

      // Fill return details
      cy.get('[data-test="return-form"]').within(() => {
        cy.get('[data-test="return-condition"]').select('Good');
        cy.get('[data-test="return-notes"]').type('Test return');
        cy.get('[data-test="submit-return"]').click();
      });

      // Verify success
      cy.wait('@processReturn');
      cy.get('[data-test="success-message"]')
        .should('be.visible')
        .and('contain', 'Equipment returned successfully');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', () => {
      cy.intercept('GET', API_ROUTES.equipment, {
        forceNetworkError: true
      }).as('networkError');

      cy.reload();
      cy.get('[data-test="error-message"]')
        .should('be.visible')
        .and('contain', 'Network error occurred');
      cy.get('[data-test="retry-button"]').should('be.visible');
    });

    it('handles API errors appropriately', () => {
      cy.intercept('GET', API_ROUTES.equipment, {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('serverError');

      cy.reload();
      cy.get('[data-test="error-message"]')
        .should('be.visible')
        .and('contain', 'Internal server error');
    });
  });
});

// Helper function to setup API interceptions
function setupApiInterceptions() {
  cy.intercept('GET', API_ROUTES.equipment, {
    fixture: 'equipment-list.json'
  }).as('getEquipmentList');

  cy.intercept('POST', API_ROUTES.equipment, {
    statusCode: 201,
    body: TEST_EQUIPMENT
  }).as('createEquipment');

  cy.intercept('POST', API_ROUTES.assignments, {
    statusCode: 201,
    body: { message: 'Assignment successful' }
  }).as('createAssignment');

  cy.intercept('PUT', `${API_ROUTES.assignments}/*`, {
    statusCode: 200,
    body: { message: 'Return processed successfully' }
  }).as('processReturn');
}