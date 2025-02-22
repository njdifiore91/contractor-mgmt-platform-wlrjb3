/**
 * @fileoverview Equipment API client module providing comprehensive equipment management operations
 * with enhanced error handling, validation, retry logic, and logging capabilities.
 * @version 1.0.0
 */

import { Equipment, EquipmentAssignment, EquipmentType } from '../models/equipment.model';
import api from '../utils/api.util';
import retry from 'axios-retry';
import rateLimit from 'axios-rate-limit';
import createError from 'http-errors';
import winston from 'winston';

// API endpoint constants
const API_ENDPOINTS = {
    EQUIPMENT: '/api/v1/equipment',
    ASSIGNMENTS: '/api/v1/equipment/assignments',
    HISTORY: '/api/v1/equipment/history'
} as const;

// Retry configuration for failed requests
const RETRY_CONFIG = {
    retries: 3,
    retryDelay: retry.exponentialDelay,
    retryCondition: retry.isNetworkOrIdempotentRequestError
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
    maxRequests: 50,
    perMilliseconds: 1000
};

/**
 * Equipment API client class providing comprehensive equipment management operations
 * with error handling, validation, and logging capabilities.
 */
export class EquipmentApiClient {
    private logger: winston.Logger;

    constructor() {
        // Initialize logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'equipment-api.log' })
            ]
        });

        // Configure retry and rate limiting
        retry(api, RETRY_CONFIG);
        rateLimit(api, RATE_LIMIT_CONFIG);
    }

    /**
     * Retrieves a list of all equipment items with optional filtering
     * @param params Optional query parameters for filtering equipment
     * @returns Promise resolving to array of Equipment items
     * @throws {ApiError} If the request fails or validation errors occur
     */
    async getEquipmentList(params?: {
        type?: EquipmentType;
        isAvailable?: boolean;
        search?: string;
    }): Promise<Equipment[]> {
        try {
            this.logger.info('Fetching equipment list', { params });
            const response = await api.get<Equipment[]>(API_ENDPOINTS.EQUIPMENT, { params });
            return response.data;
        } catch (error) {
            this.logger.error('Failed to fetch equipment list', { error, params });
            throw createError(500, 'Failed to fetch equipment list', { cause: error });
        }
    }

    /**
     * Retrieves equipment details by ID
     * @param id Equipment identifier
     * @returns Promise resolving to Equipment details
     * @throws {ApiError} If the request fails or equipment is not found
     */
    async getEquipmentById(id: number): Promise<Equipment> {
        try {
            this.logger.info('Fetching equipment details', { id });
            const response = await api.get<Equipment>(`${API_ENDPOINTS.EQUIPMENT}/${id}`);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to fetch equipment details', { error, id });
            throw createError(404, 'Equipment not found', { cause: error });
        }
    }

    /**
     * Creates a new equipment record
     * @param equipment Equipment data to create
     * @returns Promise resolving to created Equipment
     * @throws {ApiError} If the request fails or validation errors occur
     */
    async createEquipment(equipment: Omit<Equipment, 'id'>): Promise<Equipment> {
        try {
            this.logger.info('Creating new equipment', { equipment });
            const response = await api.post<Equipment>(API_ENDPOINTS.EQUIPMENT, equipment);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to create equipment', { error, equipment });
            throw createError(400, 'Failed to create equipment', { cause: error });
        }
    }

    /**
     * Updates an existing equipment record
     * @param id Equipment identifier
     * @param equipment Updated equipment data
     * @returns Promise resolving to updated Equipment
     * @throws {ApiError} If the request fails or equipment is not found
     */
    async updateEquipment(id: number, equipment: Partial<Equipment>): Promise<Equipment> {
        try {
            this.logger.info('Updating equipment', { id, equipment });
            const response = await api.put<Equipment>(`${API_ENDPOINTS.EQUIPMENT}/${id}`, equipment);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to update equipment', { error, id, equipment });
            throw createError(400, 'Failed to update equipment', { cause: error });
        }
    }

    /**
     * Assigns equipment to an inspector
     * @param assignment Equipment assignment details
     * @returns Promise resolving to created EquipmentAssignment
     * @throws {ApiError} If the request fails or validation errors occur
     */
    async assignEquipment(assignment: Omit<EquipmentAssignment, 'id'>): Promise<EquipmentAssignment> {
        try {
            this.logger.info('Assigning equipment', { assignment });
            const response = await api.post<EquipmentAssignment>(API_ENDPOINTS.ASSIGNMENTS, assignment);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to assign equipment', { error, assignment });
            throw createError(400, 'Failed to assign equipment', { cause: error });
        }
    }

    /**
     * Records equipment return
     * @param assignmentId Assignment identifier
     * @param returnDetails Return condition and notes
     * @returns Promise resolving to updated EquipmentAssignment
     * @throws {ApiError} If the request fails or assignment is not found
     */
    async returnEquipment(
        assignmentId: number,
        returnDetails: { returnCondition: string; notes?: string }
    ): Promise<EquipmentAssignment> {
        try {
            this.logger.info('Processing equipment return', { assignmentId, returnDetails });
            const response = await api.put<EquipmentAssignment>(
                `${API_ENDPOINTS.ASSIGNMENTS}/${assignmentId}/return`,
                returnDetails
            );
            return response.data;
        } catch (error) {
            this.logger.error('Failed to process equipment return', { error, assignmentId, returnDetails });
            throw createError(400, 'Failed to process equipment return', { cause: error });
        }
    }

    /**
     * Retrieves equipment assignment history
     * @param equipmentId Equipment identifier
     * @returns Promise resolving to array of EquipmentAssignment records
     * @throws {ApiError} If the request fails
     */
    async getEquipmentHistory(equipmentId: number): Promise<EquipmentAssignment[]> {
        try {
            this.logger.info('Fetching equipment history', { equipmentId });
            const response = await api.get<EquipmentAssignment[]>(
                `${API_ENDPOINTS.HISTORY}/${equipmentId}`
            );
            return response.data;
        } catch (error) {
            this.logger.error('Failed to fetch equipment history', { error, equipmentId });
            throw createError(500, 'Failed to fetch equipment history', { cause: error });
        }
    }
}

// Export singleton instance
export const equipmentApi = new EquipmentApiClient();
export default equipmentApi;