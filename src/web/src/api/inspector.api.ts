/**
 * @fileoverview API client module for inspector-related operations including search,
 * creation, mobilization, and drug test management with comprehensive validation.
 * @version 1.0.0
 */

import type { GeographyPoint, Inspector, InspectorStatus, DrugTest, Certification } from '../models/inspector.model';
import api from '../utils/api.util';

/**
 * Interface for paginated response data
 */
interface PaginatedList<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

/**
 * Interface for inspector creation request
 */
interface CreateInspectorRequest {
    userId: number;
    badgeNumber: string;
    location: GeographyPoint;
    certifications: Omit<Certification, 'id' | 'inspectorId'>[];
}

/**
 * Interface for inspector update request
 */
interface UpdateInspectorRequest {
    location?: GeographyPoint;
    status?: InspectorStatus;
    badgeNumber?: string;
    isActive?: boolean;
}

/**
 * Interface for drug test creation request
 */
interface CreateDrugTestRequest {
    testDate: Date;
    result: string;
    notes: string;
}

/**
 * Validates geographic coordinates
 */
function validateLocation(location: GeographyPoint): void {
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        throw new Error('Invalid location coordinates');
    }
    if (location.latitude < -90 || location.latitude > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
    }
    if (location.longitude < -180 || location.longitude > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
    }
}

export interface SearchInspectorsParams {
    location: GeographyPoint;
    radiusInMiles: number;
    status?: InspectorStatus;
    certifications?: string[];
    isActive?: boolean;
    pageNumber?: number;
    pageSize?: number;
}

export interface SearchInspectorsResponse {
    inspectors: Inspector[];
    totalItems: number;
}

export async function searchInspectors(params: SearchInspectorsParams): Promise<SearchInspectorsResponse> {
    try {
        validateLocation(params.location);
        const response = await api.get('/inspectors/search', { params });
        return response.data;
    } catch (error) {
        console.error('Failed to search inspectors:', error);
        throw error;
    }
}

/**
 * Retrieves inspector details by ID
 */
export async function getInspectorById(id: string): Promise<Inspector> {
    try {
        const response = await api.get(`/inspectors/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to get inspector ${id}:`, error);
        throw error;
    }
}

/**
 * Creates a new inspector profile
 */
export async function createInspector(request: CreateInspectorRequest): Promise<Inspector> {
    try {
        validateLocation(request.location);
        
        if (!request.userId || request.userId <= 0) {
            throw new Error('Invalid user ID');
        }
        
        if (!request.badgeNumber?.trim()) {
            throw new Error('Badge number is required');
        }

        if (request.certifications) {
            request.certifications.forEach(cert => {
                if (!cert.name || !cert.issuingAuthority || !cert.certificationNumber) {
                    throw new Error('Invalid certification data');
                }
                if (new Date(cert.expiryDate) <= new Date()) {
                    throw new Error('Certification expiry date must be in the future');
                }
            });
        }

        const response = await api.post('/inspectors', request);
        return response.data;
    } catch (error) {
        console.error('Failed to create inspector:', error);
        throw error;
    }
}

/**
 * Updates an existing inspector's information
 */
export async function updateInspector(id: string, data: UpdateInspectorRequest): Promise<Inspector> {
    try {
        if (data.location) {
            validateLocation(data.location);
        }
        const response = await api.put(`/inspectors/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Failed to update inspector ${id}:`, error);
        throw error;
    }
}

/**
 * Mobilizes an inspector for assignment
 */
export async function mobilizeInspector(id: string): Promise<void> {
    try {
        await api.post(`/inspectors/${id}/mobilize`);
    } catch (error) {
        console.error(`Failed to mobilize inspector ${id}:`, error);
        throw error;
    }
}

/**
 * Records a new drug test for an inspector
 */
export async function addDrugTest(inspectorId: string, data: Omit<DrugTest, 'id' | 'inspectorId'>): Promise<DrugTest> {
    try {
        const response = await api.post(`/inspectors/${inspectorId}/drug-tests`, data);
        return response.data;
    } catch (error) {
        console.error(`Failed to add drug test for inspector ${inspectorId}:`, error);
        throw error;
    }
}

/**
 * Demobilizes an inspector from active assignment
 */
export async function demobilizeInspector(id: string): Promise<void> {
    try {
        await api.post(`/inspectors/${id}/demobilize`);
    } catch (error) {
        console.error(`Failed to demobilize inspector ${id}:`, error);
        throw error;
    }
}

/**
 * Updates inspector certifications
 */
export async function addCertification(inspectorId: string, data: Omit<Certification, 'id' | 'inspectorId'>): Promise<Certification> {
    try {
        const response = await api.post(`/inspectors/${inspectorId}/certifications`, data);
        return response.data;
    } catch (error) {
        console.error(`Failed to add certification for inspector ${inspectorId}:`, error);
        throw error;
    }
}

export async function updateCertification(inspectorId: string, certificationId: string, data: Partial<Certification>): Promise<Certification> {
    try {
        const response = await api.put(`/inspectors/${inspectorId}/certifications/${certificationId}`, data);
        return response.data;
    } catch (error) {
        console.error(`Failed to update certification ${certificationId} for inspector ${inspectorId}:`, error);
        throw error;
    }
}

export async function getInspectorHistory(inspectorId: string): Promise<any[]> {
    try {
        const response = await api.get(`/inspectors/${inspectorId}/history`);
        return response.data;
    } catch (error) {
        console.error(`Failed to get history for inspector ${inspectorId}:`, error);
        throw error;
    }
}