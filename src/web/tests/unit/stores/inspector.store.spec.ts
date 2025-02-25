import { describe, it, expect, vi, beforeEach } from 'vitest'; // ^0.34.0
import { setActivePinia, createPinia } from 'pinia'; // ^2.1.0
import { Inspector, InspectorStatus, GeographyPoint } from '../../../src/models/inspector.model';
import { useInspectorStore } from '@/stores/inspector.store';
import { useNotificationStore } from '@/stores/notification.store';
import * as inspectorApi from '@/api/inspector.api';

// Mock the API module
vi.mock('@/api/inspector.api');
vi.mock('@/stores/notification.store');

// Helper function to create test inspector data
const createTestInspector = (overrides = {}) => ({
  id: 1,
  userId: 1,
  status: InspectorStatus.Available,
  location: {
    latitude: 32.7767,
    longitude: -96.7970
  } as GeographyPoint,
  badgeNumber: 'TEST-001',
  certifications: [],
  drugTests: [],
  lastMobilizedDate: null,
  lastDrugTestDate: null,
  isActive: true,
  createdAt: new Date(),
  modifiedAt: null,
  ...overrides
});

// Helper function to create test drug test data
const createTestDrugTest = (inspectorId: number, overrides = {}) => ({
  id: 1,
  inspectorId,
  testDate: new Date(),
  result: 'NEGATIVE',
  notes: 'Regular screening',
  ...overrides
});

describe('Inspector Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Geographic Search', () => {
    it('should search inspectors within radius successfully', async () => {
      const store = useInspectorStore();
      const mockLocation: GeographyPoint = { latitude: 32.7767, longitude: -96.7970 };
      const mockInspectors = [createTestInspector()];
      
      vi.spyOn(inspectorApi, 'searchInspectors').mockResolvedValue({
        items: mockInspectors,
        totalCount: 1,
        pageNumber: 1,
        pageSize: 20
      });

      await store.searchInspectors(mockLocation, 50);

      expect(inspectorApi.searchInspectors).toHaveBeenCalledWith(
        mockLocation,
        50,
        null,
        [],
        null,
        1,
        25
      );
      expect(store.inspectors).toEqual(mockInspectors);
    });

    it('should handle invalid radius error', async () => {
      const store = useInspectorStore();
      const mockLocation: GeographyPoint = { latitude: 32.7767, longitude: -96.7970 };
      const notificationStore = useNotificationStore();

      await expect(store.searchInspectors(mockLocation, 501)).rejects.toThrow();
      expect(notificationStore.error).toHaveBeenCalled();
    });

    it('should cache search results', async () => {
      const store = useInspectorStore();
      const mockLocation: GeographyPoint = { latitude: 32.7767, longitude: -96.7970 };
      const mockInspectors = [createTestInspector()];

      vi.spyOn(inspectorApi, 'searchInspectors').mockResolvedValue({
        items: mockInspectors,
        totalCount: 1,
        pageNumber: 1,
        pageSize: 20
      });

      await store.searchInspectors(mockLocation, 50);
      await store.searchInspectors(mockLocation, 50);

      expect(inspectorApi.searchInspectors).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mobilization Workflow', () => {
    it('should mobilize inspector successfully', async () => {
      const store = useInspectorStore();
      const mockInspector = createTestInspector();
      const mobilizedInspector = {
        ...mockInspector,
        status: InspectorStatus.Mobilized,
        lastMobilizedDate: new Date()
      };

      vi.spyOn(inspectorApi, 'mobilizeInspector').mockResolvedValue();
      store.inspectors = [mockInspector];

      await store.mobilizeInspector(mockInspector.id);

      expect(inspectorApi.mobilizeInspector).toHaveBeenCalledWith(mockInspector.id);
      expect(store.inspectors[0].status).toBe(InspectorStatus.Mobilized);
    });

    it('should handle mobilization errors', async () => {
      const store = useInspectorStore();
      const notificationStore = useNotificationStore();
      const mockInspector = createTestInspector();

      vi.spyOn(inspectorApi, 'mobilizeInspector').mockRejectedValue(new Error('Mobilization failed'));
      store.inspectors = [mockInspector];

      await expect(store.mobilizeInspector(mockInspector.id)).rejects.toThrow();
      expect(notificationStore.error).toHaveBeenCalled();
    });
  });

  describe('Drug Test Management', () => {
    it('should create drug test successfully', async () => {
      const store = useInspectorStore();
      const mockInspector = createTestInspector();
      const mockDrugTest = createTestDrugTest(mockInspector.id);

      vi.spyOn(inspectorApi, 'createDrugTest').mockResolvedValue(mockDrugTest.id);
      store.selectedInspector = mockInspector;

      await store.createDrugTest({
        testDate: mockDrugTest.testDate,
        result: mockDrugTest.result,
        notes: mockDrugTest.notes
      });

      expect(inspectorApi.createDrugTest).toHaveBeenCalledWith(
        mockInspector.id,
        {
          testDate: mockDrugTest.testDate,
          result: mockDrugTest.result,
          notes: mockDrugTest.notes
        }
      );
    });

    it('should validate drug test date', async () => {
      const store = useInspectorStore();
      const mockInspector = createTestInspector();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      store.selectedInspector = mockInspector;

      await expect(store.createDrugTest({
        testDate: futureDate,
        result: 'NEGATIVE',
        notes: 'Invalid date test'
      })).rejects.toThrow();
    });
  });

  describe('Inspector Selection', () => {
    it('should select inspector', () => {
      const store = useInspectorStore();
      const mockInspector = createTestInspector();

      store.selectInspector(mockInspector);
      expect(store.selectedInspector).toEqual(mockInspector);
    });

    it('should clear selected inspector', () => {
      const store = useInspectorStore();
      const mockInspector = createTestInspector();

      store.selectInspector(mockInspector);
      store.selectInspector(null);
      expect(store.selectedInspector).toBeNull();
    });
  });

  describe('Cache Management', () => {
    it('should clear search cache', () => {
      const store = useInspectorStore();
      const mockLocation: GeographyPoint = { latitude: 32.7767, longitude: -96.7970 };

      store.searchCache.set('test-key', {
        timestamp: Date.now(),
        results: [createTestInspector()],
        totalItems: 1
      });

      store.clearCache();
      expect(store.searchCache.size).toBe(0);
    });

    it('should expire cached results after timeout', async () => {
      const store = useInspectorStore();
      const mockLocation: GeographyPoint = { latitude: 32.7767, longitude: -96.7970 };
      const mockInspectors = [createTestInspector()];

      vi.spyOn(inspectorApi, 'searchInspectors').mockResolvedValue({
        items: mockInspectors,
        totalCount: 1,
        pageNumber: 1,
        pageSize: 20
      });

      // Set expired cache entry
      const expiredTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      store.searchCache.set('test-key', {
        timestamp: expiredTimestamp,
        results: mockInspectors,
        totalItems: 1
      });

      await store.searchInspectors(mockLocation, 50);
      expect(inspectorApi.searchInspectors).toHaveBeenCalled();
    });
  });

  describe('State Updates', () => {
    it('should update inspector in store', () => {
      const store = useInspectorStore();
      const mockInspector = createTestInspector();
      const updatedInspector = {
        ...mockInspector,
        badgeNumber: 'UPDATED-001'
      };

      store.inspectors = [mockInspector];
      store.updateInspector(updatedInspector);

      expect(store.inspectors[0].badgeNumber).toBe('UPDATED-001');
    });

    it('should remove inspector from store', () => {
      const store = useInspectorStore();
      const mockInspector = createTestInspector();

      store.inspectors = [mockInspector];
      store.removeInspector(mockInspector.id);

      expect(store.inspectors.length).toBe(0);
    });
  });
});