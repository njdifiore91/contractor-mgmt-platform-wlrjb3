import { ref } from 'vue'; // v3.x
import type { ICustomer } from '../models/customer.model';
import type { Inspector } from '../models/inspector.model';
import type { Equipment } from '../models/equipment.model';
import type { IUser } from '../models/user.model';

// Constants for validation rules
const EMAIL_MAX_LENGTH = 254; // RFC 5321
const PHONE_MIN_LENGTH = 10;
const PHONE_MAX_LENGTH = 15; // Including country code
const BADGE_NUMBER_LENGTH = 10;
const SERIAL_NUMBER_MAX_LENGTH = 50;

/**
 * Validates email format using RFC 5322 standards with enhanced security checks
 * @param email - Email address to validate
 * @returns boolean indicating if email is valid
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;

  // RFC 5322 compliant email regex
  const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;

  const sanitizedEmail = email.trim().toLowerCase();
  
  if (sanitizedEmail.length > EMAIL_MAX_LENGTH) return false;
  
  return emailRegex.test(sanitizedEmail);
};

/**
 * Validates phone number format with international number support
 * @param phoneNumber - Phone number to validate
 * @param countryCode - Optional country code for specific validation rules
 * @returns boolean indicating if phone number is valid
 */
export const validatePhoneNumber = (phoneNumber: string, countryCode?: string): boolean => {
  if (!phoneNumber) return false;

  // Remove all non-numeric characters
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  if (cleanNumber.length < PHONE_MIN_LENGTH || cleanNumber.length > PHONE_MAX_LENGTH) {
    return false;
  }

  // Validate North American numbers (default)
  if (!countryCode || countryCode === '1') {
    const naRegex = /^1?[2-9]\d{9}$/;
    return naRegex.test(cleanNumber);
  }

  // Basic international number validation
  const intlRegex = /^\d{10,15}$/;
  return intlRegex.test(cleanNumber);
};

/**
 * Validates that a required field has a valid value with type checking
 * @param value - Value to validate
 * @returns boolean indicating if value is valid and not empty
 */
export const validateRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }
  
  return Boolean(value);
};

/**
 * Validates equipment serial number format with type-specific patterns
 * @param serialNumber - Serial number to validate
 * @param equipmentType - Type of equipment for specific validation rules
 * @returns boolean indicating if serial number is valid
 */
export const validateSerialNumber = (serialNumber: string, equipmentType: string): boolean => {
  if (!serialNumber || serialNumber.length > SERIAL_NUMBER_MAX_LENGTH) return false;

  const cleanSerial = serialNumber.trim().toUpperCase();

  // Equipment type-specific validation patterns
  const patterns: Record<string, RegExp> = {
    Laptop: /^LP-[A-Z0-9]{8}$/,
    Mobile: /^MB-[A-Z0-9]{8}$/,
    Tablet: /^TB-[A-Z0-9]{8}$/,
    TestKit: /^TK-[A-Z0-9]{8}$/,
    SafetyGear: /^SG-[A-Z0-9]{8}$/,
    InspectionTool: /^IT-[A-Z0-9]{8}$/
  };

  return patterns[equipmentType]?.test(cleanSerial) ?? false;
};

/**
 * Validates inspector badge number format
 * @param badgeNumber - Badge number to validate
 * @returns boolean indicating if badge number is valid
 */
export const validateBadgeNumber = (badgeNumber: string): boolean => {
  if (!badgeNumber || badgeNumber.length !== BADGE_NUMBER_LENGTH) return false;

  // Badge format: RR-YYYYNNN (Region-YearSequence)
  const badgeRegex = /^[A-Z]{2}-\d{7}$/;
  const cleanBadge = badgeNumber.trim().toUpperCase();

  if (!badgeRegex.test(cleanBadge)) return false;

  // Validate region code
  const region = cleanBadge.substring(0, 2);
  const validRegions = ['NA', 'SA', 'EU', 'AS', 'AF', 'OC'];
  if (!validRegions.includes(region)) return false;

  // Validate year portion
  const year = parseInt(cleanBadge.substring(3, 7));
  const currentYear = new Date().getFullYear();
  if (year < 2000 || year > currentYear) return false;

  return true;
};

/**
 * Validates date range with business rules and constraints
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @returns boolean indicating if date range is valid
 */
export const validateDateRange = (startDate: Date, endDate: Date): boolean => {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return false;
  
  // Ensure dates are valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;

  // Start date must be before or equal to end date
  if (startDate > endDate) return false;

  const maxRangeInDays = 365; // Maximum one year range
  const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDifference > maxRangeInDays) return false;

  // Ensure dates are not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (startDate < today) return false;

  return true;
};

/**
 * Creates a reactive validation state for form fields
 * @returns Validation state object with utility methods
 */
export const useValidation = () => {
  const errors = ref<Record<string, string>>({});
  const touched = ref<Record<string, boolean>>({});

  const setError = (field: string, message: string) => {
    errors.value[field] = message;
  };

  const clearError = (field: string) => {
    delete errors.value[field];
  };

  const setTouched = (field: string) => {
    touched.value[field] = true;
  };

  const isValid = (field: string) => {
    return touched.value[field] && !errors.value[field];
  };

  return {
    errors,
    touched,
    setError,
    clearError,
    setTouched,
    isValid
  };
};