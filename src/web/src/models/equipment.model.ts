/**
 * @fileoverview Equipment model implementation
 * @version 1.0.0
 */

import type { 
    EquipmentSpecifications, 
    MaintenanceRecord, 
    EquipmentDocument,
    EquipmentHistory,
    IEquipment,
    IEquipmentData,
    EquipmentTypeValue,
    EquipmentStatusValue
} from './equipment-types';

import {
    EquipmentType,
    EquipmentStatus
} from './equipment-types';

export { EquipmentType, EquipmentStatus };
export type { 
    EquipmentSpecifications, 
    MaintenanceRecord, 
    EquipmentDocument,
    EquipmentHistory,
    IEquipment,
    IEquipmentData,
    EquipmentTypeValue,
    EquipmentStatusValue
};

export class Equipment implements IEquipmentData {
    id: number = 0;
    serialNumber: string = '';
    model: string = '';
    type: EquipmentTypeValue = EquipmentType.Laptop;
    condition: string = '';
    status: EquipmentStatusValue = EquipmentStatus.AVAILABLE;
    isActive: boolean = true;
    isAvailable: boolean = true;
    purchaseDate: Date = new Date();
    lastMaintenanceDate: Date | null = null;
    notes: string = '';
    specifications: EquipmentSpecifications | null = null;
    maintenanceHistory: MaintenanceRecord[] = [];
    documents: EquipmentDocument[] = [];

    constructor(data: Partial<Equipment> = {}) {
        Object.assign(this, {
            ...this.getDefaults(),
            ...data,
            status: data.status || EquipmentStatus.AVAILABLE,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
            lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : null,
            specifications: data.specifications || null,
            maintenanceHistory: data.maintenanceHistory || [],
            documents: data.documents || []
        });
    }

    public getDefaults() {
        return {
            id: 0,
            serialNumber: '',
            model: '',
            type: EquipmentType.Laptop,
            condition: '',
            status: EquipmentStatus.AVAILABLE,
            isActive: true,
            isAvailable: true,
            purchaseDate: new Date(),
            lastMaintenanceDate: null,
            notes: '',
            specifications: null,
            maintenanceHistory: [],
            documents: []
        };
    }

    static fromJSON(json: any): Equipment {
        return new Equipment({
            ...json,
            specifications: json.specifications || null,
            maintenanceHistory: json.maintenanceHistory || [],
            documents: json.documents || []
        });
    }

    toJSON(): IEquipmentData {
        return {
            id: this.id,
            serialNumber: this.serialNumber,
            model: this.model,
            type: this.type,
            condition: this.condition,
            status: this.status,
            isActive: this.isActive,
            isAvailable: this.isAvailable,
            purchaseDate: this.purchaseDate,
            lastMaintenanceDate: this.lastMaintenanceDate,
            notes: this.notes,
            specifications: this.specifications,
            maintenanceHistory: this.maintenanceHistory,
            documents: this.documents
        };
    }
}