import { 
  validateEmail, 
  validatePhoneNumber, 
  validateRequired, 
  validateSerialNumber, 
  validateBadgeNumber, 
  validateDateRange,
  useValidation
} from '@/utils/validation.util';
import { EquipmentType } from '@/models/equipment.model';
import { describe, it, expect } from 'jest';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate standard email formats', () => {
      expect(validateEmail('user@domain.com')).toBe(true);
      expect(validateEmail('user.name@domain.com')).toBe(true);
      expect(validateEmail('user+tag@domain.com')).toBe(true);
    });

    it('should validate international domains', () => {
      expect(validateEmail('user@domain.co.uk')).toBe(true);
      expect(validateEmail('user@domain.com.au')).toBe(true);
      expect(validateEmail('user@xn--80akhbyknj4f.com')).toBe(true); // Punycode
    });

    it('should handle special characters correctly', () => {
      expect(validateEmail('"user.name"@domain.com')).toBe(true);
      expect(validateEmail('!#$%&\'*+-/=?^_`{|}~@domain.com')).toBe(true);
    });

    it('should enforce maximum length', () => {
      const longEmail = 'a'.repeat(255) + '@domain.com';
      expect(validateEmail(longEmail)).toBe(false);
    });

    it('should reject XSS attempts', () => {
      expect(validateEmail('<script>alert(1)</script>@domain.com')).toBe(false);
      expect(validateEmail('"><img src=x onerror=alert(1)>@domain.com')).toBe(false);
    });

    it('should handle null and empty values', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate North American formats', () => {
      expect(validatePhoneNumber('123-456-7890')).toBe(true);
      expect(validatePhoneNumber('(123) 456-7890')).toBe(true);
      expect(validatePhoneNumber('1234567890')).toBe(true);
    });

    it('should validate international formats', () => {
      expect(validatePhoneNumber('+44.1234.567890', '44')).toBe(true);
      expect(validatePhoneNumber('+61 2 3456 7890', '61')).toBe(true);
    });

    it('should handle various separators', () => {
      expect(validatePhoneNumber('123.456.7890')).toBe(true);
      expect(validatePhoneNumber('123 456 7890')).toBe(true);
    });

    it('should enforce length limits', () => {
      expect(validatePhoneNumber('123')).toBe(false); // Too short
      expect(validatePhoneNumber('1'.repeat(16))).toBe(false); // Too long
    });

    it('should handle null and empty values', () => {
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber(null as any)).toBe(false);
      expect(validatePhoneNumber(undefined as any)).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should validate string values', () => {
      expect(validateRequired('test')).toBe(true);
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
    });

    it('should validate numeric values', () => {
      expect(validateRequired(0)).toBe(false);
      expect(validateRequired(1)).toBe(true);
      expect(validateRequired(NaN)).toBe(false);
    });

    it('should validate object values', () => {
      expect(validateRequired({})).toBe(false);
      expect(validateRequired({ key: 'value' })).toBe(true);
      expect(validateRequired(null)).toBe(false);
    });

    it('should validate array values', () => {
      expect(validateRequired([])).toBe(false);
      expect(validateRequired(['item'])).toBe(true);
    });

    it('should validate boolean values', () => {
      expect(validateRequired(false)).toBe(false);
      expect(validateRequired(true)).toBe(true);
    });
  });

  describe('validateSerialNumber', () => {
    it('should validate manufacturer prefixes', () => {
      expect(validateSerialNumber('LP-12345678', EquipmentType.Laptop)).toBe(true);
      expect(validateSerialNumber('MB-12345678', EquipmentType.Mobile)).toBe(true);
      expect(validateSerialNumber('XX-12345678', EquipmentType.Laptop)).toBe(false);
    });

    it('should validate numeric sequences', () => {
      expect(validateSerialNumber('LP-ABCD1234', EquipmentType.Laptop)).toBe(true);
      expect(validateSerialNumber('LP-12345ABC', EquipmentType.Laptop)).toBe(true);
      expect(validateSerialNumber('LP-1234567', EquipmentType.Laptop)).toBe(false); // Too short
    });

    it('should handle case sensitivity', () => {
      expect(validateSerialNumber('lp-12345678', EquipmentType.Laptop)).toBe(true);
      expect(validateSerialNumber('LP-12345678', EquipmentType.Laptop)).toBe(true);
    });

    it('should enforce length requirements', () => {
      const longSerial = 'LP-' + '1'.repeat(49);
      expect(validateSerialNumber(longSerial, EquipmentType.Laptop)).toBe(false);
    });
  });

  describe('validateBadgeNumber', () => {
    it('should validate region codes', () => {
      expect(validateBadgeNumber('NA-2023001')).toBe(true);
      expect(validateBadgeNumber('EU-2023001')).toBe(true);
      expect(validateBadgeNumber('XX-2023001')).toBe(false);
    });

    it('should validate numeric sequences', () => {
      expect(validateBadgeNumber('NA-2023001')).toBe(true);
      expect(validateBadgeNumber('NA-2023ABC')).toBe(false);
    });

    it('should validate year portion', () => {
      const currentYear = new Date().getFullYear();
      expect(validateBadgeNumber(`NA-${currentYear}001`)).toBe(true);
      expect(validateBadgeNumber('NA-1999001')).toBe(false);
      expect(validateBadgeNumber(`NA-${currentYear + 1}001`)).toBe(false);
    });

    it('should handle case sensitivity', () => {
      expect(validateBadgeNumber('na-2023001')).toBe(true);
      expect(validateBadgeNumber('NA-2023001')).toBe(true);
    });
  });

  describe('validateDateRange', () => {
    it('should validate date ranges', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      expect(validateDateRange(today, tomorrow)).toBe(true);
      expect(validateDateRange(tomorrow, today)).toBe(false);
    });

    it('should enforce range limits', () => {
      const today = new Date();
      const tooFar = new Date(today);
      tooFar.setDate(tooFar.getDate() + 366);
      
      expect(validateDateRange(today, tooFar)).toBe(false);
    });

    it('should handle invalid dates', () => {
      expect(validateDateRange(new Date('invalid'), new Date())).toBe(false);
      expect(validateDateRange(new Date(), new Date('invalid'))).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(validateDateRange(null as any, new Date())).toBe(false);
      expect(validateDateRange(new Date(), null as any)).toBe(false);
      expect(validateDateRange(undefined as any, new Date())).toBe(false);
    });
  });

  describe('useValidation', () => {
    it('should manage validation state', () => {
      const validation = useValidation();
      
      validation.setError('email', 'Invalid email');
      expect(validation.errors.value.email).toBe('Invalid email');
      
      validation.clearError('email');
      expect(validation.errors.value.email).toBeUndefined();
      
      validation.setTouched('email');
      expect(validation.touched.value.email).toBe(true);
      
      expect(validation.isValid('email')).toBe(true);
    });
  });
});