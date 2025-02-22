/**
 * @fileoverview API client module for inspector-related operations including search,
 * creation, mobilization, and drug test management with comprehensive validation.
 * @version 1.0.0
 */

import { GeographyPoint } from '@types/microsoft-spatial'; // v7.12.2
import api from '../utils/api.util';
import { Inspector, InspectorStatus, DrugTest, Certification } from '../models/inspector.model';

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
const validateLocation = (location: GeographyPoint): void => {
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        throw new Error('Invalid location coordinates');
    }
    if (location.latitude < -90 || location.latitude > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
    }
    if (location.longitude < -180 || location.longitude > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
    }
};

/**
 * Searches for inspectors based on location and other criteria
 */
export const searchInspectors = async (
    location: GeographyPoint,
    radiusInMiles: number,
    status?: InspectorStatus | null,
    certifications?: string[],
    isActive?: boolean | null,
    pageNumber: number = 1,
    pageSize: number = 20
): Promise<PaginatedList<Inspector>> => {
    // Validate inputs
    validateLocation(location);
    
    if (radiusInMiles < 0 || radiusInMiles > 1000) {
        throw new Error('Radius must be between 0 and 1000 miles');
    }

    if (pageNumber < 1) pageNumber = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 20;

    const params = {
        latitude: location.latitude,
        longitude: location.longitude,
        radiusInMiles,
        status: status || undefined,
        certifications: certifications?.join(','),
        isActive: isActive === null ? undefined : isActive,
        pageNumber,
        pageSize
    };

    const response = await api.get<PaginatedList<Inspector>>('/api/v1/inspectors/search', { params });
    return response.data;
};

/**
 * Retrieves inspector details by ID
 */
export const getInspectorById = async (id: number): Promise<Inspector> => {
    if (id <= 0) throw new Error('Invalid inspector ID');
    
    const response = await api.get<Inspector>(`/api/v1/inspectors/${id}`);
    return response.data;
};

/**
 * Creates a new inspector profile
 */
export const createInspector = async (request: CreateInspectorRequest): Promise<number> => {
    // Validate request
    validateLocation(request.location);
    
    if (!request.userId || request.userId <= 0) {
        throw new Error('Invalid user ID');
    }
    
    if (!request.badgeNumber?.trim()) {
        throw new Error('Badge number is required');
    }

    // Validate certifications
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

    const response = await api.post<number>('/api/v1/inspectors', request);
    return response.data;
};

/**
 * Updates an existing inspector's information
 */
export const updateInspector = async (
    id: number,
    request: UpdateInspectorRequest
): Promise<void> => {
    if (id <= 0) throw new Error('Invalid inspector ID');

    if (request.location) {
        validateLocation(request.location);
    }

    if (request.badgeNumber && !request.badgeNumber.trim()) {
        throw new Error('Badge number cannot be empty');
    }

    await api.put(`/api/v1/inspectors/${id}`, request);
};

/**
 * Mobilizes an inspector for assignment
 */
export const mobilizeInspector = async (id: number): Promise<void> => {
    if (id <= 0) throw new Error('Invalid inspector ID');

    await api.post(`/api/v1/inspectors/${id}/mobilize`);
};

/**
 * Records a new drug test for an inspector
 */
export const createDrugTest = async (
    inspectorId: number,
    request: CreateDrugTestRequest
): Promise<number> => {
    if (inspectorId <= 0) throw new Error('Invalid inspector ID');

    // Validate test date
    const testDate = new Date(request.testDate);
    if (isNaN(testDate.getTime()) || testDate > new Date()) {
        throw new Error('Invalid test date');
    }

    if (!request.result?.trim()) {
        throw new Error('Test result is required');
    }

    const response = await api.post<number>(
        `/api/v1/inspectors/${inspectorId}/drugtests`,
        request
    );
    return response.data;
};

/**
 * Demobilizes an inspector from active assignment
 */
export const demobilizeInspector = async (id: number): Promise<void> => {
    if (id <= 0) throw new Error('Invalid inspector ID');

    await api.post(`/api/v1/inspectors/${id}/demobilize`);
};

/**
 * Updates inspector certifications
 */
export const updateCertifications = async (
    inspectorId: number,
    certifications: Omit<Certification, 'id' | 'inspectorId'>[]
): Promise<void> => {
    if (inspectorId <= 0) throw new Error('Invalid inspector ID');

    // Validate certifications
    certifications.forEach(cert => {
        if (!cert.name || !cert.issuingAuthority || !cert.certificationNumber) {
            throw new Error('Invalid certification data');
        }
        if (new Date(cert.expiryDate) <= new Date()) {
            throw new Error('Certification expiry date must be in the future');
        }
    });

    await api.put(`/api/v1/inspectors/${inspectorId}/certifications`, { certifications });
};