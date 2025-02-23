/**
 * @fileoverview TypeScript model definitions for equipment-related entities
 * @version 1.0.0
 */

// Vue.js v3.x - Type support for Vue.js integration
import { defineComponent } from 'vue';

/**
 * Enumeration of all available equipment types in the system.
 * Used for strong typing and validation of equipment categorization.
 */
export const enum EquipmentType {
    Laptop = 'Laptop',
    Mobile = 'Mobile',
    Tablet = 'Tablet',
    TestKit = 'TestKit',
    SafetyGear = 'SafetyGear',
    InspectionTool = 'InspectionTool'
}

/**
 * Equipment status type
 */
export type EquipmentStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';

/**
 * Type defining the core equipment data structure.
 * Represents physical assets that can be assigned to inspectors.
 */
export type Equipment = {
    /** Unique identifier for the equipment */
    id: number;

    /** Unique serial number for asset tracking */
    serialNumber: string;

    /** Equipment model identifier */
    model: string;

    /** Category of equipment from predefined types */
    type: EquipmentType;

    /** Current physical condition of the equipment */
    condition: string;

    /** Current status of the equipment */
    status: EquipmentStatus;

    /** Indicates if equipment is in active inventory */
    isActive: boolean;

    /** Indicates if equipment is available for assignment */
    isAvailable: boolean;

    /** Date when equipment was purchased */
    purchaseDate: Date;

    /** Date of last maintenance check, null if never maintained */
    lastMaintenanceDate: Date | null;

    /** Additional remarks about the equipment */
    notes: string;
};

/**
 * Type defining equipment assignment records.
 * Tracks the relationship between equipment and inspectors over time.
 */
export type EquipmentAssignment = {
    /** Unique identifier for the assignment */
    id: number;

    /** Reference to the assigned equipment */
    equipmentId: number;

    /** Reference to the inspector the equipment is assigned to */
    inspectorId: number;

    /** Date when equipment was assigned */
    assignedDate: Date;

    /** Date when equipment was returned, null if still assigned */
    returnedDate: Date | null;

    /** Condition of equipment at time of assignment */
    assignmentCondition: string;

    /** Condition of equipment when returned, null if not yet returned */
    returnCondition: string | null;

    /** Additional remarks about the assignment */
    notes: string;

    /** Indicates if this is the current active assignment */
    isActive: boolean;
};

/**
 * Type defining the equipment interface for API responses
 */
export type IEquipment = {
    id: string;
    name: string;
    type: string;
    serialNumber: string;
    status: 'available' | 'assigned' | 'maintenance' | 'retired';
    condition: 'new' | 'good' | 'fair' | 'poor';
    purchaseDate: Date;
    lastMaintenanceDate: Date | null;
    assignedTo: string | null;
    location: string;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Type defining equipment history records
 */
export type EquipmentHistory = {
    /** Unique identifier for the history record */
    id: number;

    /** Reference to the equipment */
    equipmentId: number;

    /** Type of history event */
    eventType: 'ASSIGNED' | 'RETURNED' | 'MAINTENANCE' | 'STATUS_CHANGE';

    /** Previous status if status changed */
    previousStatus?: EquipmentStatus;

    /** New status if status changed */
    newStatus?: EquipmentStatus;

    /** Reference to related assignment if applicable */
    assignmentId?: number;

    /** User who performed the action */
    performedBy: number;

    /** When the action was performed */
    performedAt: Date;

    /** Additional notes about the event */
    notes?: string;
};