import { mount, VueWrapper } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Quasar, QBtn, QInput } from '@quasar/extras';
import CustomerForm from '@/components/customers/CustomerForm.vue';
import { ICustomer, CustomerStatus } from '@/models/customer.model';
import { useCustomer } from '@/composables/useCustomer';

// Mock customer composable
vi.mock('@/composables/useCustomer');

// Mock Quasar components
vi.mock('@quasar/extras');

// Helper function to create mock customer data
const createMockCustomer = (overrides: Partial<ICustomer> = {}): ICustomer => ({
  id: 1,
  code: 'CUST-001',
  name: 'Test Company',
  industry: 'energy',
  region: 'NA',
  address: '123 Test St',
  city: 'Test City',
  state: 'TX',
  postalCode: '12345',
  country: 'USA',
  status: CustomerStatus.Active,
  isActive: true,
  createdAt: new Date(),
  modifiedAt: null,
  contacts: [],
  contracts: [],
  location: {
    latitude: 0,
    longitude: 0
  },
  ...overrides
});

// Helper function to mount component with configuration
const mountComponent = (props = {}, options = {}) => {
  return mount(CustomerForm, {
    global: {
      plugins: [Quasar],
      stubs: {
        QBtn,
        QInput,
        QSelect: true,
        QForm: true
      }
    },
    props,
    ...options
  });
};

describe('CustomerForm.vue', () => {
  let wrapper: VueWrapper;
  const mockCreateCustomer = vi.fn();
  const mockUpdateCustomer = vi.fn();
  const mockValidateCustomer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCustomer as any).mockImplementation(() => ({
      createCustomer: mockCreateCustomer,
      updateCustomer: mockUpdateCustomer,
      validateCustomer: mockValidateCustomer
    }));
  });

  describe('Component Rendering', () => {
    it('should render all required form fields with correct attributes', async () => {
      wrapper = mountComponent();
      
      // Basic Information fields
      expect(wrapper.find('[data-test="customer-code"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="business-name"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="industry"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="region"]').exists()).toBe(true);

      // Contact Information fields
      expect(wrapper.find('[data-test="address"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="city"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="state"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="postal-code"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="country"]').exists()).toBe(true);

      // Security Information fields
      expect(wrapper.find('[data-test="security-level"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="compliance-requirements"]').exists()).toBe(true);
    });

    it('should render with initial customer data when provided', async () => {
      const mockCustomer = createMockCustomer();
      wrapper = mountComponent({ modelValue: mockCustomer });
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.formData.code).toBe(mockCustomer.code);
      expect(wrapper.vm.formData.name).toBe(mockCustomer.name);
      expect(wrapper.vm.formData.industry).toBe(mockCustomer.industry);
    });

    it('should render with proper ARIA attributes for accessibility', () => {
      wrapper = mountComponent();
      
      expect(wrapper.find('form').attributes('aria-label')).toBe('Customer Information Form');
      expect(wrapper.find('[data-test="customer-code"]').attributes('aria-required')).toBe('true');
      expect(wrapper.find('[data-test="business-name"]').attributes('aria-required')).toBe('true');
    });
  });

  describe('Form Validation', () => {
    it('should validate all required fields before submission', async () => {
      wrapper = mountComponent();
      await wrapper.find('form').trigger('submit');

      expect(wrapper.vm.errors.code).toBeTruthy();
      expect(wrapper.vm.errors.name).toBeTruthy();
      expect(mockCreateCustomer).not.toHaveBeenCalled();
    });

    it('should validate business name for uniqueness', async () => {
      wrapper = mountComponent();
      const nameInput = wrapper.find('[data-test="business-name"]');
      
      await nameInput.setValue('Test Company');
      await nameInput.trigger('blur');
      
      expect(mockValidateCustomer).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Company'
      }));
    });

    it('should validate postal code format per region', async () => {
      wrapper = mountComponent();
      
      await wrapper.find('[data-test="region"]').setValue('NA');
      await wrapper.find('[data-test="postal-code"]').setValue('invalid');
      await wrapper.find('[data-test="postal-code"]').trigger('blur');

      expect(wrapper.vm.errors.postalCode).toBeTruthy();
    });

    it('should prevent XSS in text inputs', async () => {
      wrapper = mountComponent();
      const scriptTag = '<script>alert("xss")</script>';
      
      await wrapper.find('[data-test="business-name"]').setValue(scriptTag);
      await wrapper.find('form').trigger('submit');

      expect(wrapper.vm.formData.name).not.toContain('<script>');
    });
  });

  describe('Form Submission', () => {
    it('should call createCustomer with validated data for new customer', async () => {
      const validCustomer = createMockCustomer();
      wrapper = mountComponent();
      
      Object.keys(validCustomer).forEach(async key => {
        const input = wrapper.find(`[data-test="${key}"]`);
        if (input.exists()) {
          await input.setValue(validCustomer[key as keyof ICustomer]);
        }
      });

      await wrapper.find('form').trigger('submit');
      expect(mockCreateCustomer).toHaveBeenCalledWith(expect.objectContaining({
        code: validCustomer.code,
        name: validCustomer.name
      }));
    });

    it('should call updateCustomer with changed fields for existing customer', async () => {
      const existingCustomer = createMockCustomer();
      wrapper = mountComponent({ modelValue: existingCustomer });
      
      await wrapper.find('[data-test="business-name"]').setValue('Updated Company');
      await wrapper.find('form').trigger('submit');

      expect(mockUpdateCustomer).toHaveBeenCalledWith(
        existingCustomer.id,
        expect.objectContaining({ name: 'Updated Company' })
      );
    });

    it('should emit success event with customer data on success', async () => {
      const validCustomer = createMockCustomer();
      wrapper = mountComponent();
      
      mockCreateCustomer.mockResolvedValueOnce(validCustomer);
      
      await wrapper.setData({ formData: validCustomer });
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('success')).toBeTruthy();
      expect(wrapper.emitted('success')?.[0]).toEqual([validCustomer]);
    });

    it('should emit error event with details on failure', async () => {
      const error = new Error('API Error');
      mockCreateCustomer.mockRejectedValueOnce(error);
      
      wrapper = mountComponent();
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('error')).toBeTruthy();
      expect(wrapper.emitted('error')?.[0]).toEqual([error]);
    });
  });

  describe('User Interactions', () => {
    it('should update v-model when form fields change', async () => {
      wrapper = mountComponent();
      
      await wrapper.find('[data-test="business-name"]').setValue('New Company');
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      expect(wrapper.emitted('update:modelValue')?.[0][0].name).toBe('New Company');
    });

    it('should reset form to initial state on reset', async () => {
      const initialCustomer = createMockCustomer();
      wrapper = mountComponent({ modelValue: initialCustomer });
      
      await wrapper.find('[data-test="business-name"]').setValue('Changed Name');
      await wrapper.find('[data-test="reset"]').trigger('click');

      expect(wrapper.vm.formData.name).toBe(initialCustomer.name);
    });

    it('should disable submit button during processing', async () => {
      wrapper = mountComponent();
      
      await wrapper.setData({ loading: true });
      
      expect(wrapper.find('[data-test="submit"]').attributes('disabled')).toBe('true');
    });

    it('should maintain focus state during validation', async () => {
      wrapper = mountComponent();
      const nameInput = wrapper.find('[data-test="business-name"]');
      
      await nameInput.trigger('focus');
      await nameInput.setValue('');
      await nameInput.trigger('blur');

      expect(wrapper.vm.touched.name).toBe(true);
      expect(wrapper.vm.errors.name).toBeTruthy();
    });
  });
});