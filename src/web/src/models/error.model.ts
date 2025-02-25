/**
 * Interface for API error responses
 */
export interface ApiError {
    message: string;
    code?: string;
    response?: {
        status: number;
        data?: any;
    };
} 