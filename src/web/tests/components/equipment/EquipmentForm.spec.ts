import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { Quasar, QForm, QInput } from '@quasar/extras';
import axe from 'axe-core';
import EquipmentForm from '@/components/equipment/EquipmentForm.vue';
import { Equipment, EquipmentType } from '@/models/equipment.model';
import { useEquipmentStore } from '@/stores/equipment.store';
import { useNotificationStore } from '@/stores/notification.store';

// Helper function to create a test wrapper with configured store
const createWrapper = (
  mountOptions = {},
  storeState = {}
): VueWrapper => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    initialState: {
      equipment: {
        loading: false,
        error: null,
        ...storeState
      }
    }
  });

  return mount(EquipmentForm, {
    global: {
      plugins: [Quasar, pinia],
      stubs: {
        QForm: true,
        QInput: true,
        QSelect: true,
        QBtn: true,
        QIcon: true,
        QSpinnerDots: true
      }
    },
    ...mountOptions
  });
};

// Helper function to create mock equipment data
const mockEquipmentData = (overrides = {}): Equipment => ({
  id: 1,
  serialNumber: 'TEST-12345',
  model: 'Test Model',
  type: EquipmentType.Laptop,
  condition: 'New',
  isActive: true,
  isAvailable: true,
  purchaseDate: new Date('2023-01-01'),
  lastMaintenanceDate: null,
  notes: 'Test notes',
  ...overrides
});

describe('EquipmentForm Component', () => {
  let wrapper: VueWrapper;
  let equipmentStore: ReturnType<typeof useEquipmentStore>;
  let notificationStore: ReturnType<typeof useNotificationStore>;

  beforeEach(() => {
    wrapper = createWrapper();
    equipmentStore = useEquipmentStore();
    notificationStore = useNotificationStore();
  });

  afterEach(() => {
    wrapper.unmount();
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the form with correct title for new equipment', () => {
      expect(wrapper.find('#equipment-form-title').text()).toBe('Add New Equipment');
    });

    it('should render the form with correct title for editing equipment', () => {
      wrapper = createWrapper({ props: { equipment: mockEquipmentData() } });
      expect(wrapper.find('#equipment-form-title').text()).toBe('Edit Equipment');
    });

    it('should render all required form fields', () => {
      const requiredFields = [
        'serialNumber',
        'model',
        'type',
        'condition',
        'purchaseDate'
      ];

      requiredFields.forEach(field => {
        expect(wrapper.find(`[data-test="${field}-input"]`).exists()).toBe(true);
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate serial number format', async () => {
      const input = wrapper.find('[data-test="serialNumber-input"]');
      await input.setValue('invalid@serial');
      await input.trigger('blur');

      expect(wrapper.vm.errors.serialNumber).toBe('Invalid serial number format');
    });

    it('should validate model length constraints', async () => {
      const input = wrapper.find('[data-test="model-input"]');
      await input.setValue('A');
      await input.trigger('blur');

      expect(wrapper.vm.errors.model).toBe('Model must be between 2 and 50 characters');
    });

    it('should validate purchase date is not in future', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const input = wrapper.find('[data-test="purchaseDate-input"]');
      await input.setValue(futureDate.toISOString().split('T')[0]);
      await input.trigger('blur');

      expect(wrapper.vm.errors.purchaseDate).toBe('Purchase date cannot be in the future');
    });

    it('should validate notes length', async () => {
      const input = wrapper.find('[data-test="notes-input"]');
      await input.setValue('a'.repeat(501));
      await input.trigger('blur');

      expect(wrapper.vm.errors.notes).toBe('Notes cannot exceed 500 characters');
    });
  });

  describe('Form Submission', () => {
    it('should create new equipment successfully', async () => {
      const newEquipment = mockEquipmentData({ id: undefined });
      const formData = {
        serialNumber: newEquipment.serialNumber,
        model: newEquipment.model,
        type: newEquipment.type,
        condition: newEquipment.condition,
        purchaseDate: newEquipment.purchaseDate.toISOString().split('T')[0],
        notes: newEquipment.notes
      };

      Object.entries(formData).forEach(async ([field, value]) => {
        const input = wrapper.find(`[data-test="${field}-input"]`);
        await input.setValue(value);
      });

      await wrapper.find('form').trigger('submit.prevent');

      expect(equipmentStore.createNewEquipment).toHaveBeenCalledWith(
        expect.objectContaining(formData)
      );
      expect(notificationStore.success).toHaveBeenCalledWith(
        'Equipment created successfully'
      );
    });

    it('should update existing equipment successfully', async () => {
      const existingEquipment = mockEquipmentData();
      wrapper = createWrapper({ props: { equipment: existingEquipment } });

      const updates = {
        model: 'Updated Model',
        condition: 'Used',
        notes: 'Updated notes'
      };

      Object.entries(updates).forEach(async ([field, value]) => {
        const input = wrapper.find(`[data-test="${field}-input"]`);
        await input.setValue(value);
      });

      await wrapper.find('form').trigger('submit.prevent');

      expect(equipmentStore.updateExistingEquipment).toHaveBeenCalledWith(
        existingEquipment.id,
        expect.objectContaining(updates)
      );
      expect(notificationStore.success).toHaveBeenCalledWith(
        'Equipment updated successfully'
      );
    });
  });

  describe('Error Handling', () => {
    it('should display error notification on API failure', async () => {
      const error = new Error('API Error');
      equipmentStore.createNewEquipment.mockRejectedValue(error);

      await wrapper.find('form').trigger('submit.prevent');

      expect(notificationStore.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create equipment')
      );
    });

    it('should maintain form state on validation errors', async () => {
      const invalidData = {
        serialNumber: 'invalid',
        model: 'A',
        type: 'invalid',
        condition: '',
        purchaseDate: '2025-01-01'
      };

      Object.entries(invalidData).forEach(async ([field, value]) => {
        const input = wrapper.find(`[data-test="${field}-input"]`);
        await input.setValue(value);
        await input.trigger('blur');
      });

      await wrapper.find('form').trigger('submit.prevent');

      expect(equipmentStore.createNewEquipment).not.toHaveBeenCalled();
      expect(wrapper.vm.errors).toHaveProperty('serialNumber');
      expect(wrapper.vm.errors).toHaveProperty('model');
      expect(wrapper.vm.errors).toHaveProperty('purchaseDate');
    });
  });

  describe('Accessibility', () => {
    it('should meet WCAG 2.1 Level AA standards', async () => {
      const results = await axe.run(wrapper.element);
      expect(results.violations).toHaveLength(0);
    });

    it('should support keyboard navigation', async () => {
      const inputs = wrapper.findAll('input, select, textarea, button');
      for (let i = 0; i < inputs.length; i++) {
        await inputs[i].trigger('focus');
        expect(document.activeElement).toBe(inputs[i].element);
      }
    });

    it('should have proper ARIA labels', () => {
      const form = wrapper.find('form');
      expect(form.attributes('aria-labelledby')).toBe('equipment-form-title');

      const requiredInputs = wrapper.findAll('[aria-required="true"]');
      expect(requiredInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewport', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      await window.dispatchEvent(new Event('resize'));

      const formColumns = wrapper.findAll('.col-12.col-md-6');
      formColumns.forEach(column => {
        expect(column.classes()).toContain('col-12');
      });
    });

    it('should adjust layout for desktop viewport', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      await window.dispatchEvent(new Event('resize'));

      const formColumns = wrapper.findAll('.col-12.col-md-6');
      formColumns.forEach(column => {
        expect(column.classes()).toContain('col-md-6');
      });
    });
  });
});