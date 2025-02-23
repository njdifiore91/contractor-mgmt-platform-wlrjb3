/**
 * @fileoverview Vue.js composable for security monitoring functionality
 * @version 1.0.0
 */

import { ref, computed } from 'vue';
import { useAuth } from './useAuth';

interface SecurityContext {
  isValid: boolean;
  lastCheck: Date;
  deviceTrusted: boolean;
  sessionExpiry: Date | null;
}

interface SecurityEvent {
  type: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

export function useSecurityMonitor() {
  const { isAuthenticated, checkAuthStatus } = useAuth();
  const securityContext = ref<SecurityContext>({
    isValid: false,
    lastCheck: new Date(),
    deviceTrusted: false,
    sessionExpiry: null
  });
  const securityEvents = ref<SecurityEvent[]>([]);

  // Check security context validity
  const checkSecurityContext = async (): Promise<boolean> => {
    try {
      const isValid = await checkAuthStatus();
      securityContext.value = {
        ...securityContext.value,
        isValid,
        lastCheck: new Date()
      };
      return isValid;
    } catch (error) {
      logEvent('SECURITY_CHECK_FAILED', { error });
      return false;
    }
  };

  // Log security events
  const logEvent = (type: string, details: Record<string, unknown> = {}): void => {
    securityEvents.value.push({
      type,
      timestamp: new Date(),
      details: {
        ...details,
        isAuthenticated: isAuthenticated.value,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      }
    });
  };

  // Handle security events
  const handleSecurityEvent = async (event: SecurityEvent): Promise<void> => {
    logEvent(event.type, event.details);

    switch (event.type) {
      case 'SESSION_EXPIRED':
        securityContext.value.isValid = false;
        securityContext.value.sessionExpiry = new Date();
        break;
      case 'SECURITY_VIOLATION':
        securityContext.value.isValid = false;
        securityContext.value.deviceTrusted = false;
        break;
      default:
        // Log unknown event types
        console.warn('Unknown security event:', event);
    }
  };

  // Computed properties
  const hasSecurityViolations = computed(() => {
    return securityEvents.value.some(event => 
      event.type === 'SECURITY_VIOLATION' &&
      event.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );
  });

  const lastSecurityCheck = computed(() => securityContext.value.lastCheck);

  return {
    securityContext: computed(() => securityContext.value),
    securityEvents: computed(() => securityEvents.value),
    hasSecurityViolations,
    lastSecurityCheck,
    checkSecurityContext,
    logEvent,
    handleSecurityEvent,
    monitor: {
      checkSecurityContext,
      logEvent,
      handleSecurityEvent
    }
  };
} 