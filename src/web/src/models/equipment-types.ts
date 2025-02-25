/**
 * @fileoverview Type definitions for equipment-related entities
 * @version 1.0.0
 */

export const EquipmentType = {
    Laptop: 'Laptop',
    Mobile: 'Mobile',
    Tablet: 'Tablet',
    TestKit: 'TestKit',
    SafetyGear: 'SafetyGear',
    InspectionTool: 'InspectionTool'
} as const;

export type EquipmentTypeKey = keyof typeof EquipmentType;
export type EquipmentTypeValue = typeof EquipmentType[EquipmentTypeKey];

export const EquipmentStatus = {
    AVAILABLE: 'AVAILABLE',
    IN_USE: 'IN_USE',
    MAINTENANCE: 'MAINTENANCE',
    RETIRED: 'RETIRED'
} as const;

export type EquipmentStatusKey = keyof typeof EquipmentStatus;
export type EquipmentStatusValue = typeof EquipmentStatus[EquipmentStatusKey];

/**
 * Type defining equipment assignment records.
 * Tracks the relationship between equipment and inspectors over time.
 */
export interface EquipmentAssignment {
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
}

/**
 * Type defining equipment specifications
 */
export interface EquipmentSpecifications {
    manufacturer: string;
    model: string;
    calibrationDue: string;
    warranty: string;
}

/**
 * Type defining maintenance records
 */
export interface MaintenanceRecord {
    id: number;
    date: string;
    type: string;
    technician: string;
    notes: string;
}

/**
 * Type defining equipment documents
 */
export interface EquipmentDocument {
    id: number;
    type: string;
    name: string;
    url: string;
}

/**
 * Type defining equipment history records
 */
export interface EquipmentHistory {
    /** Unique identifier for the history record */
    id: number;

    /** Reference to the equipment */
    equipmentId: number;

    /** Type of history event */
    eventType: 'ASSIGNED' | 'RETURNED' | 'MAINTENANCE' | 'STATUS_CHANGE';

    /** Previous status if status changed */
    previousStatus?: EquipmentStatusValue;

    /** New status if status changed */
    newStatus?: EquipmentStatusValue;

    /** Reference to related assignment if applicable */
    assignmentId?: number;

    /** User who performed the action */
    performedBy: number;

    /** When the action was performed */
    performedAt: Date;

    /** Additional notes about the event */
    notes?: string;
}

/**
 * Type defining the equipment interface for API responses
 */
export interface IEquipment {
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
}

/**
 * Interface representing the public shape of Equipment class
 */
export interface IEquipmentData {
    id: number;
    serialNumber: string;
    model: string;
    type: EquipmentTypeValue;
    condition: string;
    status: EquipmentStatusValue;
    isActive: boolean;
    isAvailable: boolean;
    purchaseDate: Date;
    lastMaintenanceDate: Date | null;
    notes: string;
    specifications: EquipmentSpecifications | null;
    maintenanceHistory: MaintenanceRecord[];
    documents: EquipmentDocument[];
} 