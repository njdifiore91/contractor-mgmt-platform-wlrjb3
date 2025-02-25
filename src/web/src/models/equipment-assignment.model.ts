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