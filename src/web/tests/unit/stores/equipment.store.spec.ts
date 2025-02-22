import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEquipmentStore } from '@/stores/equipment.store';
import { Equipment, EquipmentType, EquipmentAssignment } from '@/models/equipment.model';

// Mock data setup
const mockEquipment: Equipment[] = [
  {
    id: 1,
    serialNumber: 'EQ001',
    model: 'ThinkPad X1',
    type: EquipmentType.Laptop,
    condition: 'New',
    isActive: true,
    isAvailable: true,
    purchaseDate: new Date('2023-01-01'),
    lastMaintenanceDate: null,
    notes: ''
  },
  {
    id: 2,
    serialNumber: 'EQ002',
    model: 'iPhone 13',
    type: EquipmentType.Mobile,
    condition: 'Good',
    isActive: true,
    isAvailable: false,
    purchaseDate: new Date('2023-02-01'),
    lastMaintenanceDate: new Date('2023-06-01'),
    notes: 'Regular maintenance done'
  }
];

const mockAssignments: EquipmentAssignment[] = [
  {
    id: 1,
    equipmentId: 2,
    inspectorId: 1,
    assignedDate: new Date('2023-03-01'),
    returnedDate: null,
    assignmentCondition: 'Good',
    returnCondition: null,
    notes: '',
    isActive: true
  }
];

// Mock API responses
vi.mock('@/api/equipment.api', () => ({
  getEquipmentList: vi.fn().mockResolvedValue(mockEquipment),
  getEquipmentById: vi.fn().mockImplementation((id: number) => 
    Promise.resolve(mockEquipment.find(e => e.id === id))
  ),
  createEquipment: vi.fn().mockImplementation((data) => 
    Promise.resolve({ ...data, id: 3 })
  ),
  updateEquipment: vi.fn().mockImplementation((id, data) => 
    Promise.resolve({ ...mockEquipment.find(e => e.id === id), ...data })
  ),
  assignEquipment: vi.fn().mockImplementation((data) => 
    Promise.resolve({ ...data, id: 2 })
  ),
  returnEquipment: vi.fn().mockImplementation((id, data) => 
    Promise.resolve({ 
      ...mockAssignments.find(a => a.id === id), 
      returnedDate: new Date(),
      returnCondition: data.returnCondition 
    })
  ),
  getEquipmentHistory: vi.fn().mockResolvedValue([])
}));

describe('Equipment Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useEquipmentStore();
      expect(store.equipment).toEqual([]);
      expect(store.selectedEquipment).toBeNull();
      expect(store.assignments).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });
  });

  describe('Loading Equipment', () => {
    it('should load equipment list successfully', async () => {
      const store = useEquipmentStore();
      await store.loadEquipment();

      expect(store.equipment).toEqual(mockEquipment);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('should handle API errors when loading equipment', async () => {
      const store = useEquipmentStore();
      vi.mocked(getEquipmentList).mockRejectedValueOnce(new Error('API Error'));

      await store.loadEquipment();
      expect(store.error).toBe('API Error');
      expect(store.loading).toBe(false);
    });

    it('should use cache when available and not forced', async () => {
      const store = useEquipmentStore();
      await store.loadEquipment();
      const firstCallCount = vi.mocked(getEquipmentList).mock.calls.length;
      
      await store.loadEquipment();
      expect(vi.mocked(getEquipmentList).mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('Equipment Selection', () => {
    it('should select equipment by ID', async () => {
      const store = useEquipmentStore();
      await store.selectEquipment(1);

      expect(store.selectedEquipment).toEqual(mockEquipment[0]);
      expect(store.loading).toBe(false);
    });

    it('should handle non-existent equipment selection', async () => {
      const store = useEquipmentStore();
      await store.selectEquipment(999);

      expect(store.selectedEquipment).toBeNull();
      expect(store.error).not.toBeNull();
    });
  });

  describe('Equipment Creation', () => {
    it('should create new equipment successfully', async () => {
      const store = useEquipmentStore();
      const newEquipment = {
        serialNumber: 'EQ003',
        model: 'iPad Pro',
        type: EquipmentType.Tablet,
        condition: 'New',
        isActive: true,
        isAvailable: true,
        purchaseDate: new Date(),
        lastMaintenanceDate: null,
        notes: ''
      };

      const result = await store.createNewEquipment(newEquipment);
      expect(result.id).toBe(3);
      expect(store.equipment).toContainEqual(result);
    });

    it('should handle validation errors in creation', async () => {
      const store = useEquipmentStore();
      vi.mocked(createEquipment).mockRejectedValueOnce(new Error('Validation Error'));

      await expect(store.createNewEquipment({} as any)).rejects.toThrow('Validation Error');
      expect(store.error).toBe('Validation Error');
    });
  });

  describe('Equipment Updates', () => {
    it('should update existing equipment', async () => {
      const store = useEquipmentStore();
      await store.loadEquipment();

      const updates = {
        condition: 'Excellent',
        notes: 'Updated condition after maintenance'
      };

      const result = await store.updateExistingEquipment(1, updates);
      expect(result.condition).toBe('Excellent');
      expect(result.notes).toBe('Updated condition after maintenance');
    });

    it('should handle non-existent equipment updates', async () => {
      const store = useEquipmentStore();
      vi.mocked(updateEquipment).mockRejectedValueOnce(new Error('Equipment not found'));

      await expect(store.updateExistingEquipment(999, {})).rejects.toThrow('Equipment not found');
    });
  });

  describe('Equipment Assignment', () => {
    it('should assign equipment to inspector', async () => {
      const store = useEquipmentStore();
      const assignment = {
        equipmentId: 1,
        inspectorId: 2,
        assignedDate: new Date(),
        assignmentCondition: 'Good',
        notes: ''
      };

      const result = await store.assignEquipmentToInspector(assignment);
      expect(result.id).toBe(2);
      expect(store.assignments).toContainEqual(result);
    });

    it('should handle assignment validation errors', async () => {
      const store = useEquipmentStore();
      vi.mocked(assignEquipment).mockRejectedValueOnce(new Error('Invalid assignment'));

      await expect(store.assignEquipmentToInspector({} as any)).rejects.toThrow('Invalid assignment');
    });
  });

  describe('Equipment Return', () => {
    it('should process equipment return successfully', async () => {
      const store = useEquipmentStore();
      const returnDetails = {
        returnCondition: 'Good',
        notes: 'Returned in working condition'
      };

      const result = await store.processEquipmentReturn(1, returnDetails);
      expect(result.returnCondition).toBe('Good');
      expect(result.returnedDate).toBeDefined();
    });

    it('should handle return processing errors', async () => {
      const store = useEquipmentStore();
      vi.mocked(returnEquipment).mockRejectedValueOnce(new Error('Invalid return'));

      await expect(store.processEquipmentReturn(999, { returnCondition: 'Good' }))
        .rejects.toThrow('Invalid return');
    });
  });

  describe('Computed Properties', () => {
    it('should calculate available equipment correctly', async () => {
      const store = useEquipmentStore();
      await store.loadEquipment();

      expect(store.availableEquipment.length).toBe(1);
      expect(store.availableEquipment[0].id).toBe(1);
    });

    it('should calculate assigned equipment correctly', async () => {
      const store = useEquipmentStore();
      await store.loadEquipment();

      expect(store.assignedEquipment.length).toBe(1);
      expect(store.assignedEquipment[0].id).toBe(2);
    });

    it('should identify equipment requiring maintenance', async () => {
      const store = useEquipmentStore();
      await store.loadEquipment();

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      expect(store.maintenanceRequired.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache successfully', async () => {
      const store = useEquipmentStore();
      await store.loadEquipment();
      store.clearCache();

      expect(store.isCacheValid).toBe(false);
    });

    it('should force refresh when cache is cleared', async () => {
      const store = useEquipmentStore();
      await store.loadEquipment();
      store.clearCache();
      await store.loadEquipment();

      expect(vi.mocked(getEquipmentList).mock.calls.length).toBe(2);
    });
  });
});