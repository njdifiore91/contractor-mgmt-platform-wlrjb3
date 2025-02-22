import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { render, fireEvent, within } from '@testing-library/vue';
import { QForm, QInput, QSelect, QBtn } from 'quasar';
import InspectorForm from '@/components/inspectors/InspectorForm.vue';
import { Inspector, InspectorStatus } from '@/models/inspector.model';
import { useInspectorStore } from '@/stores/inspector.store';
import { useNotificationStore } from '@/stores/notification.store';

// Mock data for testing
const mockInspector: Inspector = {
  id: 1,
  userId: 100,
  badgeNumber: 'B12345',
  status: InspectorStatus.Available,
  location: {
    latitude: 29.7604,
    longitude: -95.3698,
    type: 'Point'
  },
  certifications: [
    {
      id: 1,
      inspectorId: 1,
      name: 'API Level 2',
      issuingAuthority: 'API Institute',
      certificationNumber: 'CERT-001',
      issueDate: new Date('2023-01-01'),
      expiryDate: new Date('2024-12-31'),
      isActive: true
    }
  ],
  drugTests: [],
  lastMobilizedDate: null,
  lastDrugTestDate: null,
  isActive: true,
  createdAt: new Date('2023-01-01'),
  modifiedAt: null
};

// Helper function to create wrapper with testing utilities
const createWrapper = (props = {}, options = {}) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    initialState: {
      inspector: {
        selectedInspector: null,
        loading: false
      }
    }
  });

  return mount(InspectorForm, {
    props: {
      modelValue: null,
      ...props
    },
    global: {
      plugins: [pinia],
      stubs: {
        QForm: true,
        QInput: true,
        QSelect: true,
        QBtn: true
      },
      ...options
    }
  });
};

describe('InspectorForm Component', () => {
  let wrapper: ReturnType<typeof createWrapper>;
  let notificationStore: ReturnType<typeof useNotificationStore>;
  let inspectorStore: ReturnType<typeof useInspectorStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    wrapper = createWrapper();
    notificationStore = useNotificationStore();
    inspectorStore = useInspectorStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    wrapper.unmount();
  });

  describe('Component Rendering', () => {
    it('renders all required form fields', () => {
      const form = wrapper.findComponent(QForm);
      expect(form.exists()).toBe(true);

      expect(wrapper.findComponent('[data-test="badge-number-input"]').exists()).toBe(true);
      expect(wrapper.findComponent('[data-test="status-select"]').exists()).toBe(true);
      expect(wrapper.findComponent('[data-test="latitude-input"]').exists()).toBe(true);
      expect(wrapper.findComponent('[data-test="longitude-input"]').exists()).toBe(true);
    });

    it('displays correct title based on edit/create mode', async () => {
      expect(wrapper.find('#form-title').text()).toBe('Create Inspector');

      await wrapper.setProps({ modelValue: mockInspector });
      expect(wrapper.find('#form-title').text()).toBe('Edit Inspector');
    });

    it('initializes form with provided inspector data', async () => {
      await wrapper.setProps({ modelValue: mockInspector });
      
      expect(wrapper.vm.formData.badgeNumber).toBe(mockInspector.badgeNumber);
      expect(wrapper.vm.formData.status).toBe(mockInspector.status);
      expect(wrapper.vm.formData.location.latitude).toBe(mockInspector.location.latitude);
      expect(wrapper.vm.formData.location.longitude).toBe(mockInspector.location.longitude);
    });

    it('maintains WCAG 2.1 compliance', () => {
      const { container } = render(InspectorForm);
      
      // Check form labelling
      expect(container.querySelector('form')).toHaveAttribute('aria-labelledby', 'form-title');
      
      // Check required field indicators
      const requiredInputs = container.querySelectorAll('[aria-required="true"]');
      expect(requiredInputs.length).toBeGreaterThan(0);
      
      // Check error message associations
      const errorMessages = container.querySelectorAll('[role="alert"]');
      errorMessages.forEach(message => {
        expect(message).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const submitButton = wrapper.find('button[type="submit"]');
      await submitButton.trigger('click');

      await flushPromises();

      expect(notificationStore.error).toHaveBeenCalledWith(
        'Please correct the form errors before submitting'
      );
    });

    it('validates geographic coordinates', async () => {
      await wrapper.setData({
        formData: {
          ...wrapper.vm.formData,
          location: {
            latitude: 91, // Invalid latitude
            longitude: -95.3698
          }
        }
      });

      const submitButton = wrapper.find('button[type="submit"]');
      await submitButton.trigger('click');

      await flushPromises();

      expect(wrapper.vm.v$.location.latitude.$errors[0].$message)
        .toBe('Latitude must be between -90 and 90');
    });

    it('validates certification dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await wrapper.setData({
        formData: {
          ...wrapper.vm.formData,
          certifications: [{
            name: 'Test Cert',
            issuingAuthority: 'Test Authority',
            expiryDate: pastDate.toISOString().split('T')[0]
          }]
        }
      });

      const submitButton = wrapper.find('button[type="submit"]');
      await submitButton.trigger('click');

      await flushPromises();

      expect(wrapper.vm.v$.certifications.$each.$response.$errors[0].expiryDate[0].$message)
        .toBe('Expiry date must be in the future');
    });
  });

  describe('Data Management', () => {
    it('handles inspector creation', async () => {
      const newInspector = { ...mockInspector };
      delete newInspector.id;

      await wrapper.setData({
        formData: {
          badgeNumber: newInspector.badgeNumber,
          status: newInspector.status,
          location: newInspector.location,
          certifications: newInspector.certifications
        }
      });

      const submitButton = wrapper.find('button[type="submit"]');
      await submitButton.trigger('click');

      await flushPromises();

      expect(inspectorStore.createInspector).toHaveBeenCalledWith(
        expect.objectContaining({
          badgeNumber: newInspector.badgeNumber,
          status: newInspector.status
        })
      );
      expect(notificationStore.success).toHaveBeenCalledWith('Inspector created successfully');
    });

    it('handles inspector updates', async () => {
      await wrapper.setProps({ modelValue: mockInspector });
      
      const updatedBadgeNumber = 'B99999';
      await wrapper.setData({
        formData: {
          ...wrapper.vm.formData,
          badgeNumber: updatedBadgeNumber
        }
      });

      const submitButton = wrapper.find('button[type="submit"]');
      await submitButton.trigger('click');

      await flushPromises();

      expect(inspectorStore.updateInspector).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockInspector.id,
          badgeNumber: updatedBadgeNumber
        })
      );
      expect(notificationStore.success).toHaveBeenCalledWith('Inspector updated successfully');
    });

    it('manages certifications list', async () => {
      const addButton = wrapper.find('[data-test="add-certification-button"]');
      await addButton.trigger('click');

      expect(wrapper.vm.formData.certifications.length).toBe(1);

      const removeButton = wrapper.find('[data-test="remove-certification-button-0"]');
      await removeButton.trigger('click');

      expect(wrapper.vm.formData.certifications.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const error = new Error('API Error');
      vi.spyOn(inspectorStore, 'createInspector').mockRejectedValue(error);

      await wrapper.setData({
        formData: {
          badgeNumber: 'B12345',
          status: InspectorStatus.Available,
          location: { latitude: 29.7604, longitude: -95.3698 },
          certifications: []
        }
      });

      const submitButton = wrapper.find('button[type="submit"]');
      await submitButton.trigger('click');

      await flushPromises();

      expect(notificationStore.error).toHaveBeenCalledWith('API Error');
      expect(wrapper.emitted('error')).toBeTruthy();
    });

    it('disables form submission while processing', async () => {
      const submitButton = wrapper.find('button[type="submit"]');
      await submitButton.trigger('click');

      expect(submitButton.attributes('loading')).toBe('true');
      expect(wrapper.find('button[type="button"]').attributes('disabled')).toBe('true');

      await flushPromises();
    });
  });
});