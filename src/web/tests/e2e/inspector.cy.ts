import { Inspector, InspectorStatus } from '../../src/models/inspector.model';
import { GeographyPoint } from '../../src/models/inspector.model';

describe('Inspector Management', () => {
  const mockInspector: Inspector = {
    id: 1,
    userId: 1,
    status: InspectorStatus.Available,
    location: {
      latitude: 32.7767,
      longitude: -96.7970
    } as GeographyPoint,
    badgeNumber: 'B12345',
    certifications: [
      {
        id: 1,
        inspectorId: 1,
        name: 'API Level 2',
        issuingAuthority: 'ASNT',
        certificationNumber: 'CERT-001',
        issueDate: new Date('2023-01-01'),
        expiryDate: new Date('2024-01-01'),
        isActive: true
      }
    ],
    drugTests: [],
    lastMobilizedDate: null,
    lastDrugTestDate: new Date('2023-11-01'),
    isActive: true,
    createdAt: new Date('2023-01-01'),
    modifiedAt: null
  };

  beforeEach(() => {
    // Reset viewport for responsive testing
    cy.viewport(1280, 720);

    // Clear local storage and cookies
    cy.clearLocalStorage();
    cy.clearCookies();

    // Intercept API calls
    cy.intercept('GET', '/api/v1/inspectors*', {
      statusCode: 200,
      body: [mockInspector]
    }).as('getInspectors');

    cy.intercept('GET', '/api/v1/inspectors/search*', {
      statusCode: 200,
      body: [mockInspector]
    }).as('searchInspectors');

    // Visit inspector management page
    cy.visit('/inspectors');
    cy.wait('@getInspectors');
  });

  describe('Geographic Search', () => {
    it('should perform radius search with valid coordinates', () => {
      // Test coordinate input
      cy.get('[data-test="latitude-input"]').type('32.7767');
      cy.get('[data-test="longitude-input"]').type('-96.7970');
      cy.get('[data-test="radius-input"]').type('50');
      cy.get('[data-test="radius-unit-select"]').select('miles');
      cy.get('[data-test="search-button"]').click();

      cy.wait('@searchInspectors').then((interception) => {
        expect(interception.request.url).to.include('latitude=32.7767');
        expect(interception.request.url).to.include('longitude=-96.7970');
        expect(interception.request.url).to.include('radius=50');
      });

      cy.get('[data-test="inspector-list"]').should('be.visible');
      cy.get('[data-test="inspector-card"]').should('have.length.at.least', 1);
    });

    it('should validate coordinate boundaries', () => {
      // Test invalid latitude
      cy.get('[data-test="latitude-input"]').type('91');
      cy.get('[data-test="latitude-error"]')
        .should('be.visible')
        .and('contain', 'Latitude must be between -90 and 90');

      // Test invalid longitude
      cy.get('[data-test="longitude-input"]').type('181');
      cy.get('[data-test="longitude-error"]')
        .should('be.visible')
        .and('contain', 'Longitude must be between -180 and 180');
    });

    it('should handle empty search results', () => {
      cy.intercept('GET', '/api/v1/inspectors/search*', {
        statusCode: 200,
        body: []
      }).as('emptySearch');

      cy.get('[data-test="latitude-input"]').type('0');
      cy.get('[data-test="longitude-input"]').type('0');
      cy.get('[data-test="search-button"]').click();

      cy.wait('@emptySearch');
      cy.get('[data-test="no-results-message"]')
        .should('be.visible')
        .and('contain', 'No inspectors found in the specified area');
    });
  });

  describe('Advanced Filtering', () => {
    it('should filter by multiple criteria', () => {
      // Open filter panel
      cy.get('[data-test="filter-button"]').click();

      // Select status
      cy.get('[data-test="status-filter"]').select(InspectorStatus.Available);

      // Select certifications
      cy.get('[data-test="certification-filter"]').click();
      cy.get('[data-test="certification-option-API"]').click();

      // Apply filters
      cy.get('[data-test="apply-filters"]').click();

      cy.wait('@searchInspectors').then((interception) => {
        expect(interception.request.url).to.include('status=AVAILABLE');
        expect(interception.request.url).to.include('certification=API');
      });
    });

    it('should persist filter selections', () => {
      // Set filters
      cy.get('[data-test="filter-button"]').click();
      cy.get('[data-test="status-filter"]').select(InspectorStatus.Available);
      cy.get('[data-test="apply-filters"]').click();

      // Reload page
      cy.reload();
      cy.wait('@getInspectors');

      // Verify filters persisted
      cy.get('[data-test="status-filter"]')
        .should('have.value', InspectorStatus.Available);
    });
  });

  describe('Mobilization Workflow', () => {
    it('should complete mobilization process', () => {
      cy.intercept('PUT', '/api/v1/inspectors/*/mobilize', {
        statusCode: 200,
        body: { ...mockInspector, status: InspectorStatus.Mobilized }
      }).as('mobilizeInspector');

      // Select inspector
      cy.get('[data-test="inspector-card"]').first().click();
      
      // Start mobilization
      cy.get('[data-test="mobilize-button"]').click();

      // Complete mobilization form
      cy.get('[data-test="mobilization-date"]').type('2024-01-01');
      cy.get('[data-test="location-select"]').select('Dallas, TX');
      cy.get('[data-test="equipment-checklist"]').find('input[type="checkbox"]').check();
      
      // Submit mobilization
      cy.get('[data-test="submit-mobilization"]').click();

      cy.wait('@mobilizeInspector').then((interception) => {
        expect(interception.request.body).to.include({
          mobilizationDate: '2024-01-01',
          location: 'Dallas, TX'
        });
      });

      // Verify success message
      cy.get('[data-test="success-message"]')
        .should('be.visible')
        .and('contain', 'Inspector successfully mobilized');
    });

    it('should handle mobilization errors', () => {
      cy.intercept('PUT', '/api/v1/inspectors/*/mobilize', {
        statusCode: 400,
        body: { error: 'Invalid mobilization date' }
      }).as('mobilizationError');

      cy.get('[data-test="inspector-card"]').first().click();
      cy.get('[data-test="mobilize-button"]').click();
      cy.get('[data-test="submit-mobilization"]').click();

      cy.get('[data-test="error-message"]')
        .should('be.visible')
        .and('contain', 'Invalid mobilization date');
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', () => {
      // Test tab navigation
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-test', 'search-button');

      // Test filter interaction
      cy.get('[data-test="filter-button"]').focus().type('{enter}');
      cy.get('[data-test="filter-panel"]').should('be.visible');
    });

    it('should have proper ARIA attributes', () => {
      cy.get('[data-test="inspector-list"]')
        .should('have.attr', 'role', 'list');

      cy.get('[data-test="inspector-card"]')
        .should('have.attr', 'role', 'listitem');

      cy.get('[data-test="search-button"]')
        .should('have.attr', 'aria-label', 'Search inspectors');
    });

    it('should announce status changes', () => {
      cy.get('[data-test="status-message"]')
        .should('have.attr', 'role', 'alert')
        .should('have.attr', 'aria-live', 'polite');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Set mobile viewport
      cy.viewport('iphone-x');

      // Verify mobile layout
      cy.get('[data-test="mobile-menu"]').should('be.visible');
      cy.get('[data-test="filter-panel"]').should('not.be.visible');

      // Test mobile filter interaction
      cy.get('[data-test="mobile-filter-button"]').click();
      cy.get('[data-test="filter-panel"]')
        .should('be.visible')
        .and('have.class', 'mobile-view');
    });

    it('should maintain functionality on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('[data-test="inspector-list"]').should('be.visible');
      cy.get('[data-test="filter-panel"]').should('be.visible');
    });
  });
});