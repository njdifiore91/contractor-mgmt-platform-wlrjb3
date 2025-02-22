import { format, parse, isValid, isBefore, isAfter, addDays, subDays, differenceInDays } from 'date-fns'; // ^2.30.0
import { enUS } from 'date-fns/locale'; // ^2.30.0

/**
 * Constants for date validation and formatting
 */
const DATE_CONSTANTS = {
  MIN_VALID_YEAR: 1900,
  MAX_VALID_YEAR: 2100,
  DEFAULT_FORMAT: 'MM/dd/yyyy',
  ISO_FORMAT: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
  DISPLAY_FORMAT: 'MMM dd, yyyy',
  CONTRACT_FORMAT: 'MM/dd/yyyy',
  DRUG_TEST_FORMAT: 'MM/dd/yyyy HH:mm:ss',
} as const;

/**
 * Error messages for date operations
 */
const ERROR_MESSAGES = {
  INVALID_INPUT: 'Invalid date input provided',
  INVALID_FORMAT: 'Invalid date format specified',
  OUT_OF_RANGE: 'Date is outside acceptable range',
  PARSE_ERROR: 'Failed to parse date string',
  FORMAT_ERROR: 'Failed to format date',
} as const;

/**
 * Type guard to check if a value is a valid Date object
 * @param value - Value to check
 * @returns Boolean indicating if value is a valid Date
 */
const isDateObject = (value: any): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

/**
 * Formats a date into a standardized string representation
 * @param date - Date to format (Date object, timestamp, or date string)
 * @param formatString - Target format string (defaults to MM/dd/yyyy)
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (
  date: Date | string | number | null,
  formatString: string = DATE_CONSTANTS.DEFAULT_FORMAT
): string => {
  try {
    // Handle null/undefined input
    if (!date) {
      return '';
    }

    // Convert input to Date object if needed
    let dateObject: Date;
    if (typeof date === 'string' || typeof date === 'number') {
      dateObject = new Date(date);
    } else {
      dateObject = date;
    }

    // Validate date object
    if (!isDateObject(dateObject)) {
      console.warn(`${ERROR_MESSAGES.INVALID_INPUT}: ${date}`);
      return '';
    }

    // Validate date is within acceptable range
    if (!isWithinValidRange(dateObject)) {
      console.warn(`${ERROR_MESSAGES.OUT_OF_RANGE}: ${date}`);
      return '';
    }

    // Format the date
    return format(dateObject, formatString, { locale: enUS });
  } catch (error) {
    console.error(`${ERROR_MESSAGES.FORMAT_ERROR}: ${error}`);
    return '';
  }
};

/**
 * Parses a date string into a Date object with validation
 * @param dateString - String representation of date
 * @param formatString - Expected format of input string
 * @returns Date object or null if invalid
 */
export const parseDate = (
  dateString: string,
  formatString: string = DATE_CONSTANTS.DEFAULT_FORMAT
): Date | null => {
  try {
    // Validate input
    if (!dateString || typeof dateString !== 'string') {
      console.warn(`${ERROR_MESSAGES.INVALID_INPUT}: ${dateString}`);
      return null;
    }

    // Attempt to parse the date
    const parsedDate = parse(dateString, formatString, new Date(), { locale: enUS });

    // Validate parsed result
    if (!isDateObject(parsedDate)) {
      console.warn(`${ERROR_MESSAGES.PARSE_ERROR}: ${dateString}`);
      return null;
    }

    // Validate date range
    if (!isWithinValidRange(parsedDate)) {
      console.warn(`${ERROR_MESSAGES.OUT_OF_RANGE}: ${dateString}`);
      return null;
    }

    return parsedDate;
  } catch (error) {
    console.error(`${ERROR_MESSAGES.PARSE_ERROR}: ${error}`);
    return null;
  }
};

/**
 * Performs comprehensive date validation including business rules
 * @param date - Date to validate
 * @returns Boolean indicating if date is valid and meets all rules
 */
export const isValidDate = (date: Date | string | number | null): boolean => {
  try {
    // Handle null/undefined input
    if (!date) {
      return false;
    }

    // Convert input to Date object if needed
    let dateObject: Date;
    if (typeof date === 'string' || typeof date === 'number') {
      dateObject = new Date(date);
    } else {
      dateObject = date;
    }

    // Basic date validity check
    if (!isDateObject(dateObject)) {
      return false;
    }

    // Range validation
    if (!isWithinValidRange(dateObject)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Date validation error:', error);
    return false;
  }
};

/**
 * Validates if a date falls within the acceptable range
 * @param date - Date to validate
 * @returns Boolean indicating if date is within valid range
 */
const isWithinValidRange = (date: Date): boolean => {
  const year = date.getFullYear();
  return year >= DATE_CONSTANTS.MIN_VALID_YEAR && year <= DATE_CONSTANTS.MAX_VALID_YEAR;
};

/**
 * Additional utility functions for specific business requirements
 */

/**
 * Formats a date specifically for contract display
 * @param date - Contract date to format
 * @returns Formatted contract date string
 */
export const formatContractDate = (date: Date | string | number | null): string => {
  return formatDate(date, DATE_CONSTANTS.CONTRACT_FORMAT);
};

/**
 * Formats a date specifically for drug test records
 * @param date - Drug test date to format
 * @returns Formatted drug test date string
 */
export const formatDrugTestDate = (date: Date | string | number | null): string => {
  return formatDate(date, DATE_CONSTANTS.DRUG_TEST_FORMAT);
};

/**
 * Calculates the difference in days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days between dates or null if invalid
 */
export const calculateDateDifference = (
  startDate: Date | string | number,
  endDate: Date | string | number
): number | null => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!isDateObject(start) || !isDateObject(end)) {
      return null;
    }

    return differenceInDays(end, start);
  } catch (error) {
    console.error('Error calculating date difference:', error);
    return null;
  }
};

/**
 * Checks if a date is before another date
 * @param date - Date to check
 * @param compareDate - Date to compare against
 * @returns Boolean indicating if date is before compareDate
 */
export const isDateBefore = (
  date: Date | string | number,
  compareDate: Date | string | number
): boolean => {
  try {
    const dateObj = new Date(date);
    const compareObj = new Date(compareDate);

    if (!isDateObject(dateObj) || !isDateObject(compareObj)) {
      return false;
    }

    return isBefore(dateObj, compareObj);
  } catch (error) {
    console.error('Error comparing dates:', error);
    return false;
  }
};

/**
 * Checks if a date is after another date
 * @param date - Date to check
 * @param compareDate - Date to compare against
 * @returns Boolean indicating if date is after compareDate
 */
export const isDateAfter = (
  date: Date | string | number,
  compareDate: Date | string | number
): boolean => {
  try {
    const dateObj = new Date(date);
    const compareObj = new Date(compareDate);

    if (!isDateObject(dateObj) || !isDateObject(compareObj)) {
      return false;
    }

    return isAfter(dateObj, compareObj);
  } catch (error) {
    console.error('Error comparing dates:', error);
    return false;
  }
};