// Define our own location type instead of using microsoft-spatial
export interface GeographyPoint {
    latitude: number;
    longitude: number;
}

/**
 * Enum defining all possible inspector statuses for workflow management
 */
export enum InspectorStatus {
    Inactive = 'INACTIVE',
    Available = 'AVAILABLE',
    Mobilized = 'MOBILIZED',
    Suspended = 'SUSPENDED'
}

/**
 * Interface defining comprehensive certification data structure for inspector qualifications
 */
export interface Certification {
    id: number;
    inspectorId: number;
    name: string;
    issuingAuthority: string;
    certificationNumber: string;
    issueDate: Date;
    expiryDate: Date;
    isActive: boolean;
}

/**
 * Interface defining drug test record structure for compliance tracking
 */
export interface DrugTest {
    id: number;
    inspectorId: number;
    testDate: Date;
    result: string;
    notes: string;
}

/**
 * Main interface defining complete inspector data structure with all required tracking fields.
 * Implements comprehensive inspector management requirements including:
 * - Status tracking for mobilization/demobilization workflows
 * - Geographic location support for spatial queries
 * - Certification and drug test tracking for compliance
 */
export interface Inspector {
    id: number;
    userId: number;
    status: InspectorStatus;
    location: GeographyPoint;
    badgeNumber: string;
    certifications: Certification[];
    drugTests: DrugTest[];
    lastMobilizedDate: Date | null;
    lastDrugTestDate: Date | null;
    isActive: boolean;
    createdAt: Date;
    modifiedAt: Date | null;
}