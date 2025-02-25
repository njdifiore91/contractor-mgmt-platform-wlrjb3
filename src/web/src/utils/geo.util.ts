// @types/microsoft-spatial v7.12.2 - Required for geographic location data types
import type { GeographyPoint } from '@/models/inspector.model';

/**
 * Constants for geographic calculations and validation
 */
export const EARTH_RADIUS_MILES: number = 3959.0;
export const EARTH_RADIUS_KILOMETERS: number = 6371.0;
export const MAX_LATITUDE: number = 90.0;
export const MIN_LATITUDE: number = -90.0;
export const MAX_LONGITUDE: number = 180.0;
export const MIN_LONGITUDE: number = -180.0;

/**
 * Creates a GeographyPoint object with validated coordinates
 * @param latitude - Latitude coordinate in decimal degrees
 * @param longitude - Longitude coordinate in decimal degrees
 * @throws Error if coordinates are invalid
 * @returns GeographyPoint object with validated coordinates
 */
export function createGeographyPoint(latitude: number, longitude: number): GeographyPoint {
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
        throw new Error('Coordinates cannot be null or undefined');
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('Coordinates must be finite numbers');
    }

    if (!validateCoordinates(latitude, longitude)) {
        throw new Error(`Invalid coordinates: latitude must be between ${MIN_LATITUDE} and ${MAX_LATITUDE}, longitude must be between ${MIN_LONGITUDE} and ${MAX_LONGITUDE}`);
    }

    return {
        latitude,
        longitude
    };
}

/**
 * Calculates the great circle distance between two points using the Haversine formula
 * @param point1 - First geographic point
 * @param point2 - Second geographic point
 * @param inKilometers - Optional flag to return distance in kilometers (default: false)
 * @throws Error if points are invalid
 * @returns Distance between points in miles or kilometers
 */
export function calculateDistance(
    point1: GeographyPoint,
    point2: GeographyPoint,
    inKilometers: boolean = false
): number {
    if (!point1 || !point2) {
        throw new Error('Points cannot be null or undefined');
    }

    if (!validateCoordinates(point1.latitude, point1.longitude) || 
        !validateCoordinates(point2.latitude, point2.longitude)) {
        throw new Error('Invalid coordinates in points');
    }

    const radius = inKilometers ? EARTH_RADIUS_KILOMETERS : EARTH_RADIUS_MILES;

    const lat1Rad = toRadians(point1.latitude);
    const lon1Rad = toRadians(point1.longitude);
    const lat2Rad = toRadians(point2.latitude);
    const lon2Rad = toRadians(point2.longitude);

    const dLat = lat2Rad - lat1Rad;
    const dLon = lon2Rad - lon1Rad;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return Number((radius * c).toFixed(4));
}

/**
 * Determines if a point is within a specified radius of a center point
 * @param center - Center point for radius check
 * @param point - Point to check
 * @param radiusMiles - Radius in miles
 * @throws Error if points or radius are invalid
 * @returns Boolean indicating if point is within radius
 */
export function isPointInRadius(
    center: GeographyPoint,
    point: GeographyPoint,
    radiusMiles: number
): boolean {
    if (!center || !point) {
        throw new Error('Points cannot be null or undefined');
    }

    if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) {
        throw new Error('Radius must be a positive number');
    }

    if (!validateCoordinates(center.latitude, center.longitude) || 
        !validateCoordinates(point.latitude, point.longitude)) {
        throw new Error('Invalid coordinates in points');
    }

    const distance = calculateDistance(center, point);
    return distance <= radiusMiles;
}

/**
 * Validates if given coordinates are within valid ranges
 * @param latitude - Latitude coordinate to validate
 * @param longitude - Longitude coordinate to validate
 * @returns Boolean indicating if coordinates are valid
 */
export function validateCoordinates(latitude: number, longitude: number): boolean {
    if (latitude === null || latitude === undefined || 
        longitude === null || longitude === undefined) {
        return false;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return false;
    }

    return latitude >= MIN_LATITUDE && 
           latitude <= MAX_LATITUDE && 
           longitude >= MIN_LONGITUDE && 
           longitude <= MAX_LONGITUDE;
}

/**
 * Converts distance from miles to meters for API compatibility
 * @param miles - Distance in miles
 * @throws Error if input is invalid
 * @returns Distance in meters
 */
export function convertMilesToMeters(miles: number): number {
    if (miles === null || miles === undefined) {
        throw new Error('Miles value cannot be null or undefined');
    }

    if (!Number.isFinite(miles) || miles < 0) {
        throw new Error('Miles must be a positive number');
    }

    // 1 mile = 1609.344 meters (exact conversion)
    return Math.round(miles * 1609.344);
}

/**
 * Converts degrees to radians for trigonometric calculations
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}