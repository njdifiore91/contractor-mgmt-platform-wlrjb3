import { CustomerStatus } from '../../src/models/customer.model';
import '@axe-core/cypress/commands';

// Test data constants
const TEST_CUSTOMER = {
  id: 1,
  code: 'TST-001',
  name: 'Test Customer',
  industry: 'Energy',
  region: 'North',
  address: '123 Test St',
  city: 'Test City',
  state: 'TX',
  postalCode: '12345',
  country: 'USA',
  status: CustomerStatus.Active,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  modifiedAt: null,
  location: {
    latitude: 32.7767,
    longitude: -96.7970
  }
};

const TEST_CONTACT = {
  firstName: 'John',
  lastName: 'Doe',
  title: 'Manager',
  email: 'john.doe@test.com',
  phoneNumber: '1234567890',
  isPrimary: true,
  preferredContactMethod: 'email'
};

const TEST_CONTRACT = {
  contractNumber: 'CNT-001',
  description: 'Test Contract',
  value: 100000,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  status: 'Active',
  terms: 'Net 30'
};

describe('Customer Management E2E Tests', () => {
  beforeEach(() => {
    // Reset application state
    cy.task('db:reset');
    cy.clearCookies();
    cy.clearLocalStorage();

    // Login and navigate to customers page
    cy.login('test-admin@example.com', 'TestPass123!');
    cy.visit('/customers');
    
    // Wait for initial data load
    cy.get('[data-cy=customer-table]').should('be.visible');
    
    // Check accessibility
    cy.injectAxe();
    cy.checkA11y();
  });

  describe('Customer List View', () => {
    it('should display customer list with correct layout and functionality', () => {
      // Verify table headers
      cy.get('[data-cy=customer-table-header]').within(() => {
        cy.contains('Code').should('be.visible');
        cy.contains('Name').should('be.visible');
        cy.contains('Industry').should('be.visible');
        cy.contains('Region').should('be.visible');
        cy.contains('Status').should('be.visible');
      });

      // Test search functionality
      cy.get('[data-cy=customer-search]').type('Test');
      cy.get('[data-cy=customer-table-row]').should('have.length.gt', 0);
      
      // Test column sorting
      cy.get('[data-cy=sort-by-name]').click();
      cy.get('[data-cy=customer-table-row]').first()
        .should('have.attr', 'data-sort-order', 'asc');

      // Test filtering
      cy.get('[data-cy=status-filter]').click();
      cy.contains('Active').click();
      cy.get('[data-cy=customer-table-row]')
        .should('have.length.gt', 0)
        .each($row => {
          cy.wrap($row).contains('Active');
        });
    });

    it('should handle pagination correctly', () => {
      // Check pagination controls
      cy.get('[data-cy=pagination]').should('be.visible');
      cy.get('[data-cy=items-per-page]').should('be.visible');
      
      // Test page navigation
      cy.get('[data-cy=next-page]').click();
      cy.get('[data-cy=page-number]').should('contain', '2');
      
      // Test items per page
      cy.get('[data-cy=items-per-page]').select('50');
      cy.get('[data-cy=customer-table-row]').should('have.length.lte', 50);
    });
  });

  describe('Customer Creation', () => {
    it('should create new customer with valid data', () => {
      cy.get('[data-cy=add-customer]').click();
      
      // Fill customer form
      cy.get('[data-cy=customer-code]').type(TEST_CUSTOMER.code);
      cy.get('[data-cy=customer-name]').type(TEST_CUSTOMER.name);
      cy.get('[data-cy=customer-industry]').select(TEST_CUSTOMER.industry);
      cy.get('[data-cy=customer-region]').select(TEST_CUSTOMER.region);
      cy.get('[data-cy=customer-address]').type(TEST_CUSTOMER.address);
      cy.get('[data-cy=customer-city]').type(TEST_CUSTOMER.city);
      cy.get('[data-cy=customer-state]').type(TEST_CUSTOMER.state);
      cy.get('[data-cy=customer-postal]').type(TEST_CUSTOMER.postalCode);
      
      // Submit form
      cy.get('[data-cy=submit-customer]').click();
      
      // Verify success message
      cy.get('[data-cy=success-message]')
        .should('be.visible')
        .and('contain', 'Customer created successfully');
        
      // Verify customer appears in list
      cy.get('[data-cy=customer-table]')
        .should('contain', TEST_CUSTOMER.code)
        .and('contain', TEST_CUSTOMER.name);
    });

    it('should validate required fields', () => {
      cy.get('[data-cy=add-customer]').click();
      cy.get('[data-cy=submit-customer]').click();
      
      // Check validation messages
      cy.get('[data-cy=code-error]').should('be.visible');
      cy.get('[data-cy=name-error]').should('be.visible');
      cy.get('[data-cy=industry-error]').should('be.visible');
      cy.get('[data-cy=region-error]').should('be.visible');
    });
  });

  describe('Customer Details', () => {
    beforeEach(() => {
      // Navigate to test customer details
      cy.get(`[data-cy=customer-row-${TEST_CUSTOMER.id}]`).click();
    });

    it('should display customer details correctly', () => {
      // Verify customer information
      cy.get('[data-cy=customer-details]').within(() => {
        cy.contains(TEST_CUSTOMER.code);
        cy.contains(TEST_CUSTOMER.name);
        cy.contains(TEST_CUSTOMER.industry);
        cy.contains(TEST_CUSTOMER.region);
      });

      // Check tabs presence
      cy.get('[data-cy=details-tab]').should('be.visible');
      cy.get('[data-cy=contacts-tab]').should('be.visible');
      cy.get('[data-cy=contracts-tab]').should('be.visible');
    });

    it('should manage customer contacts', () => {
      cy.get('[data-cy=contacts-tab]').click();
      cy.get('[data-cy=add-contact]').click();
      
      // Add new contact
      cy.get('[data-cy=contact-firstName]').type(TEST_CONTACT.firstName);
      cy.get('[data-cy=contact-lastName]').type(TEST_CONTACT.lastName);
      cy.get('[data-cy=contact-email]').type(TEST_CONTACT.email);
      cy.get('[data-cy=contact-phone]').type(TEST_CONTACT.phoneNumber);
      cy.get('[data-cy=contact-isPrimary]').check();
      cy.get('[data-cy=submit-contact]').click();
      
      // Verify contact added
      cy.get('[data-cy=contacts-list]')
        .should('contain', TEST_CONTACT.firstName)
        .and('contain', TEST_CONTACT.email);
    });

    it('should manage customer contracts', () => {
      cy.get('[data-cy=contracts-tab]').click();
      cy.get('[data-cy=add-contract]').click();
      
      // Add new contract
      cy.get('[data-cy=contract-number]').type(TEST_CONTRACT.contractNumber);
      cy.get('[data-cy=contract-description]').type(TEST_CONTRACT.description);
      cy.get('[data-cy=contract-value]').type(TEST_CONTRACT.value.toString());
      cy.get('[data-cy=contract-startDate]').type(TEST_CONTRACT.startDate);
      cy.get('[data-cy=contract-endDate]').type(TEST_CONTRACT.endDate);
      cy.get('[data-cy=contract-terms]').type(TEST_CONTRACT.terms);
      cy.get('[data-cy=submit-contract]').click();
      
      // Verify contract added
      cy.get('[data-cy=contracts-list]')
        .should('contain', TEST_CONTRACT.contractNumber)
        .and('contain', TEST_CONTRACT.value);
    });
  });

  describe('Customer Edit and Delete', () => {
    it('should edit existing customer', () => {
      cy.get(`[data-cy=edit-customer-${TEST_CUSTOMER.id}]`).click();
      
      // Update customer name
      const updatedName = 'Updated Customer Name';
      cy.get('[data-cy=customer-name]')
        .clear()
        .type(updatedName);
      
      cy.get('[data-cy=submit-customer]').click();
      
      // Verify update
      cy.get('[data-cy=success-message]').should('be.visible');
      cy.get('[data-cy=customer-table]').should('contain', updatedName);
    });

    it('should delete customer with confirmation', () => {
      cy.get(`[data-cy=delete-customer-${TEST_CUSTOMER.id}]`).click();
      
      // Confirm deletion
      cy.get('[data-cy=confirm-delete]').click();
      
      // Verify deletion
      cy.get('[data-cy=success-message]').should('be.visible');
      cy.get('[data-cy=customer-table]')
        .should('not.contain', TEST_CUSTOMER.code);
    });
  });

  describe('Accessibility and Responsiveness', () => {
    it('should be accessible at different viewport sizes', () => {
      // Test tablet viewport
      cy.viewport(768, 1024);
      cy.checkA11y();
      
      // Test mobile viewport
      cy.viewport(375, 667);
      cy.checkA11y();
      
      // Verify responsive layout
      cy.get('[data-cy=customer-table]').should('be.visible');
      cy.get('[data-cy=mobile-menu]').should('be.visible');
    });

    it('should support keyboard navigation', () => {
      cy.get('[data-cy=customer-table]').focus();
      cy.realPress('Tab');
      cy.realPress('Enter');
      cy.get('[data-cy=customer-details]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Simulate network error
      cy.intercept('GET', '/api/customers', {
        statusCode: 500,
        body: 'Server error'
      });
      
      cy.reload();
      
      // Verify error message
      cy.get('[data-cy=error-message]')
        .should('be.visible')
        .and('contain', 'Error loading customers');
      
      // Verify retry functionality
      cy.get('[data-cy=retry-button]').click();
    });

    it('should handle validation errors', () => {
      cy.get('[data-cy=add-customer]').click();
      
      // Submit invalid email
      cy.get('[data-cy=customer-email]').type('invalid-email');
      cy.get('[data-cy=submit-customer]').click();
      
      // Verify validation message
      cy.get('[data-cy=email-error]')
        .should('be.visible')
        .and('contain', 'Invalid email format');
    });
  });
});