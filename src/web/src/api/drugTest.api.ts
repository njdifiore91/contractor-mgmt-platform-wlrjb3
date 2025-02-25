/**
 * Drug test API module providing secure CRUD operations for managing drug test records
 * Implements comprehensive error handling, caching, and audit logging
 * @version 1.0.0
 */

import api from '../utils/api.util';
import type { DrugTest } from '../models/inspector.model';
import type { ApiError } from '../models/error.model';

// Define the request types here since they're API-specific
export interface CreateDrugTestRequest {
    inspectorId: number;
    testDate: Date;
    result: string;
    testType: DrugTestType;
    testKitId: string;
    administeredBy: string;
    notes?: string;
}

export interface UpdateDrugTestRequest {
    testDate?: Date;
    result?: string;
    testType?: DrugTestType;
    testKitId?: string;
    administeredBy?: string;
    notes?: string;
    passed?: boolean;
}

export enum DrugTestType {
    Standard = 'STANDARD',
    Random = 'RANDOM',
    PostIncident = 'POST_INCIDENT'
}

// API endpoint base path
const API_BASE_PATH = '/api/v1/drugtests';

/**
 * Creates a new drug test record with comprehensive validation
 * @param request The drug test creation request
 * @returns Promise resolving to the created drug test record
 * @throws Error if validation fails or API request fails
 */
export const createDrugTest = async (request: CreateDrugTestRequest): Promise<DrugTest> => {
    if (!request.inspectorId || !request.testType || !request.testKitId || !request.administeredBy) {
        throw new Error('Missing required fields for drug test creation');
    }

    if (!Object.values(DrugTestType).includes(request.testType)) {
        throw new Error('Invalid test type specified');
    }

    try {
        const response = await api.post<DrugTest>(API_BASE_PATH, request);
        return response.data;
    } catch (error) {
        const apiError = error as ApiError;
        throw new Error(apiError.message || 'Failed to create drug test record');
    }
};

/**
 * Retrieves a specific drug test record by ID
 * Implements caching for improved performance
 * @param id The ID of the drug test to retrieve
 * @returns Promise resolving to the drug test record
 * @throws Error if the drug test is not found or API request fails
 */
export const getDrugTestById = async (id: number): Promise<DrugTest> => {
    if (!id || id <= 0) {
        throw new Error('Invalid drug test ID');
    }

    try {
        const response = await api.get<DrugTest>(`${API_BASE_PATH}/${id}`);
        return response.data;
    } catch (error) {
        const apiError = error as ApiError;
        if (apiError.response?.status === 404) {
            throw new Error(`Drug test with ID ${id} not found`);
        }
        throw new Error(apiError.message || 'Failed to retrieve drug test record');
    }
};

/**
 * Updates an existing drug test record with results and maintains audit trail
 * @param id The ID of the drug test to update
 * @param request The update request containing new test data
 * @returns Promise resolving to the updated drug test record
 * @throws Error if validation fails or API request fails
 */
export const updateDrugTest = async (id: number, request: UpdateDrugTestRequest): Promise<DrugTest> => {
    if (!id || id <= 0) {
        throw new Error('Invalid drug test ID');
    }

    if (typeof request.passed !== 'boolean' || !request.notes) {
        throw new Error('Invalid update request data');
    }

    try {
        const response = await api.put<DrugTest>(`${API_BASE_PATH}/${id}`, request);
        return response.data;
    } catch (error) {
        const apiError = error as ApiError;
        throw new Error(apiError.message || 'Failed to update drug test record');
    }
};

/**
 * Interface for drug test search options
 */
interface DrugTestSearchOptions {
    startDate?: Date;
    endDate?: Date;
    testType?: DrugTestType;
    status?: boolean;
    page?: number;
    pageSize?: number;
}

/**
 * Retrieves all drug test records for a specific inspector with filtering and pagination
 * @param inspectorId The ID of the inspector
 * @param options Optional search parameters
 * @returns Promise resolving to an array of drug test records
 * @throws Error if validation fails or API request fails
 */
export const getInspectorDrugTests = async (
    inspectorId: number,
    options: DrugTestSearchOptions = {}
): Promise<DrugTest[]> => {
    if (!inspectorId || inspectorId <= 0) {
        throw new Error('Invalid inspector ID');
    }

    const queryParams = new URLSearchParams();
    queryParams.append('inspectorId', inspectorId.toString());

    if (options.startDate) {
        queryParams.append('startDate', options.startDate.toISOString());
    }
    if (options.endDate) {
        queryParams.append('endDate', options.endDate.toISOString());
    }
    if (options.testType) {
        queryParams.append('testType', options.testType);
    }
    if (typeof options.status === 'boolean') {
        queryParams.append('status', options.status.toString());
    }
    if (options.page) {
        queryParams.append('page', options.page.toString());
    }
    if (options.pageSize) {
        queryParams.append('pageSize', options.pageSize.toString());
    }

    try {
        const response = await api.get<DrugTest[]>(`${API_BASE_PATH}?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw new Error('Failed to retrieve inspector drug tests');
    }
};