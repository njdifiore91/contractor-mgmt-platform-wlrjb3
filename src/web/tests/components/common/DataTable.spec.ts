import { mount } from '@vue/test-utils'; // ^2.0.0
import { describe, it, expect, beforeEach, vi } from 'vitest'; // ^0.34.0
import { QTable } from '@quasar/test-utils'; // ^2.0.0
import DataTable from '@/components/common/DataTable.vue';
import { formatDate } from '@/utils/date.util';

// Mock Quasar screen plugin
const mockQuasar = {
  screen: {
    name: 'lg',
    lt: { sm: false },
  },
};

vi.mock('quasar', () => ({
  useQuasar: () => mockQuasar,
}));

describe('DataTable.vue', () => {
  // Mock data for testing
  const mockColumns = [
    { name: 'id', label: 'ID', field: 'id', sortable: true, responsive: ['sm', 'md', 'lg', 'xl'] },
    { name: 'name', label: 'Name', field: 'name', sortable: true, responsive: ['xs', 'sm', 'md', 'lg', 'xl'] },
    { name: 'date', label: 'Date', field: 'date', sortable: true, format: 'date', responsive: ['md', 'lg', 'xl'] },
  ];

  const mockData = [
    { id: 1, name: 'Test Item 1', date: '2023-12-01' },
    { id: 2, name: 'Test Item 2', date: '2023-12-02' },
  ];

  const createWrapper = (props = {}, breakpoint = 'lg') => {
    mockQuasar.screen.name = breakpoint;
    mockQuasar.screen.lt.sm = breakpoint === 'xs';

    return mount(DataTable, {
      props: {
        columns: mockColumns,
        data: mockData,
        loading: false,
        title: 'Test Table',
        ...props,
      },
      global: {
        stubs: {
          QTable: true,
          QInput: true,
          QIcon: true,
          QPagination: true,
        },
      },
    });
  };

  describe('rendering', () => {
    it('renders the component with correct title', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.data-table').exists()).toBe(true);
      expect(wrapper.find('h2').text()).toBe('Test Table');
    });

    it('applies responsive column visibility based on breakpoint', async () => {
      const wrapper = createWrapper({}, 'xs');
      const responsiveColumns = wrapper.vm.responsiveColumns;
      expect(responsiveColumns.length).toBe(1);
      expect(responsiveColumns[0].name).toBe('name');
    });

    it('displays loading state correctly', () => {
      const wrapper = createWrapper({ loading: true });
      expect(wrapper.attributes('aria-busy')).toBe('true');
    });

    it('handles empty data state', () => {
      const wrapper = createWrapper({ data: [] });
      expect(wrapper.find('.text-body1').exists()).toBe(true);
    });
  });

  describe('interactions', () => {
    it('handles row selection when selectable is true', async () => {
      const wrapper = createWrapper({ selectable: true });
      await wrapper.vm.handleRowClick({}, mockData[0]);
      expect(wrapper.vm.selectedRows).toContain(mockData[0]);
    });

    it('emits row-click event when not selectable', async () => {
      const wrapper = createWrapper({ selectable: false });
      await wrapper.vm.handleRowClick({}, mockData[0]);
      expect(wrapper.emitted('row-click')).toBeTruthy();
    });

    it('handles pagination changes', async () => {
      const wrapper = createWrapper();
      const newPagination = { page: 2, rowsPerPage: 10 };
      await wrapper.vm.handlePaginationChange(newPagination);
      expect(wrapper.emitted('pagination-change')).toBeTruthy();
    });

    it('handles search filter input', async () => {
      const wrapper = createWrapper({ filterable: true });
      const searchInput = wrapper.findComponent({ name: 'q-input' });
      await searchInput.setValue('test');
      expect(wrapper.vm.filter).toBe('test');
    });
  });

  describe('accessibility', () => {
    it('provides correct ARIA attributes', () => {
      const wrapper = createWrapper();
      const table = wrapper.find('.data-table');
      expect(table.attributes('role')).toBe('region');
      expect(table.attributes('aria-label')).toBe('Test Table');
    });

    it('includes accessible search input label', () => {
      const wrapper = createWrapper({ filterable: true });
      const searchInput = wrapper.findComponent({ name: 'q-input' });
      expect(searchInput.attributes('aria-label')).toBe('Search Test Table');
    });

    it('provides accessible pagination controls', () => {
      const wrapper = createWrapper();
      const pagination = wrapper.findComponent({ name: 'q-pagination' });
      expect(pagination.attributes('aria-label')).toBe('Page navigation for Test Table');
    });
  });

  describe('data_formatting', () => {
    it('formats date columns correctly', () => {
      const wrapper = createWrapper();
      const formattedDate = formatDate('2023-12-01');
      expect(formattedDate).toBe('12/01/2023');
    });

    it('handles custom cell rendering based on column format', () => {
      const wrapper = createWrapper();
      const props = { col: { format: 'date' }, value: '2023-12-01' };
      const formattedValue = wrapper.vm.$slots['body-cell'](props);
      expect(formattedValue).toBeTruthy();
    });

    it('handles currency formatting in cells', () => {
      const wrapper = createWrapper();
      const props = { col: { format: 'currency' }, value: 1000 };
      const formattedValue = wrapper.vm.$slots['body-cell'](props);
      expect(formattedValue).toBeTruthy();
    });
  });

  describe('error_handling', () => {
    it('handles invalid column definitions gracefully', () => {
      const invalidColumns = [...mockColumns, { name: 'invalid' }];
      expect(() => createWrapper({ columns: invalidColumns })).toThrow();
    });

    it('validates required props', () => {
      expect(() => createWrapper({ columns: undefined })).toThrow();
      expect(() => createWrapper({ data: undefined })).toThrow();
    });

    it('handles invalid date values in date formatting', () => {
      const wrapper = createWrapper();
      const props = { col: { format: 'date' }, value: 'invalid-date' };
      const formattedValue = wrapper.vm.$slots['body-cell'](props);
      expect(formattedValue).toBe('');
    });
  });

  describe('responsive_behavior', () => {
    it('adapts to mobile viewport', () => {
      const wrapper = createWrapper({}, 'xs');
      expect(wrapper.vm.tableProps.dense).toBe(true);
      expect(wrapper.vm.tableProps.class['mobile-optimized']).toBe(true);
    });

    it('shows correct columns for tablet viewport', () => {
      const wrapper = createWrapper({}, 'md');
      const visibleColumns = wrapper.vm.responsiveColumns;
      expect(visibleColumns.length).toBe(3);
    });

    it('maintains full column set for desktop viewport', () => {
      const wrapper = createWrapper({}, 'lg');
      const visibleColumns = wrapper.vm.responsiveColumns;
      expect(visibleColumns.length).toBe(mockColumns.length);
    });
  });
});