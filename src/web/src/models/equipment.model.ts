// Vue.js v3.x - Type support for Vue.js integration
import { defineComponent } from 'vue';

/**
 * Enumeration of all available equipment types in the system.
 * Used for strong typing and validation of equipment categorization.
 */
export enum EquipmentType {
    Laptop = 'Laptop',
    Mobile = 'Mobile',
    Tablet = 'Tablet',
    TestKit = 'TestKit',
    SafetyGear = 'SafetyGear',
    InspectionTool = 'InspectionTool'
}

/**
 * Interface defining the core equipment data structure.
 * Represents physical assets that can be assigned to inspectors.
 */
export interface Equipment {
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
}

/**
 * Interface defining equipment assignment records.
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