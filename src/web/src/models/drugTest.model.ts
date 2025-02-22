/**
 * Drug test data model definitions for inspector compliance tracking
 * @version 1.0.0
 */

/**
 * Enumeration of possible drug test types for standardization and type safety
 */
export enum DrugTestType {
    /** Random drug test selected through automated system */
    RANDOM = 'RANDOM',
    
    /** Required test before inspector mobilization */
    PRE_MOBILIZATION = 'PRE_MOBILIZATION',
    
    /** Test required following an incident or reasonable suspicion */
    INCIDENT = 'INCIDENT',
    
    /** Scheduled periodic test based on compliance requirements */
    PERIODIC = 'PERIODIC'
}

/**
 * Comprehensive interface defining the structure of a drug test record
 * Contains all required fields for compliance tracking and audit purposes
 */
export interface DrugTest {
    /** Unique identifier for the drug test record */
    id: number;
    
    /** Reference to the inspector who took the test */
    inspectorId: number;
    
    /** Date when the test was administered */
    testDate: Date;
    
    /** Type of drug test administered */
    testType: DrugTestType;
    
    /** Unique identifier of the test kit used */
    testKitId: string;
    
    /** Name or ID of the person who administered the test */
    administeredBy: string;
    
    /** Indicates whether the test was passed */
    passed: boolean;
    
    /** Additional notes or observations about the test */
    notes: string;
    
    /** Timestamp of record creation */
    createdAt: Date;
    
    /** Timestamp of last modification, null if never modified */
    modifiedAt: Date | null;
}

/**
 * Interface for creating a new drug test record
 * Only includes fields required for initial creation
 */
export interface CreateDrugTestRequest {
    /** ID of the inspector taking the test */
    inspectorId: number;
    
    /** Type of test being administered */
    testType: DrugTestType;
    
    /** ID of the test kit being used */
    testKitId: string;
    
    /** Name or ID of test administrator */
    administeredBy: string;
}

/**
 * Interface for updating drug test results
 * Restricts which fields can be modified after initial creation
 */
export interface UpdateDrugTestRequest {
    /** Updated test result */
    passed: boolean;
    
    /** Updated or additional notes */
    notes: string;
}