import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

interface AuditLogPayload {
  entityType: string;
  entityId: string;
  action: string;
  details: Record<string, unknown>;
}

export class AuditService {
  private static instance: AuditService;
  private readonly endpoint = '/api/v1/audit/logs';

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  private getUserEmail(): string {
    const authStore = useAuthStore();
    return authStore.user?.email || 'admin@test.com';
  }

  public async logAction(
    entityType: string,
    entityId: string,
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      const userEmail = this.getUserEmail();
      await axios.post(
        this.endpoint,
        {
          entityType,
          entityId,
          action,
          details,
        } as AuditLogPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': userEmail,
          },
        }
      );
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

export const auditService = AuditService.getInstance();
