import { defineStore } from 'pinia'; // ^2.1.0
import { Notify } from 'quasar'; // ^2.0.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0 - Added for unique IDs

// Constants for notification configuration
export const NOTIFICATION_TYPES = {
  SUCCESS: 'positive',
  ERROR: 'negative',
  WARNING: 'warning',
  INFO: 'info'
} as const;

export const NOTIFICATION_POSITIONS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'top',
  'bottom',
  'left',
  'right',
  'center'
] as const;

export const DEFAULT_NOTIFICATION_OPTIONS = {
  timeout: 5000,
  position: 'top-right',
  closeOnClick: true,
  progress: true,
  group: false,
  html: false,
  actions: [],
  multiLine: false,
  caption: '',
  attrs: {
    role: 'alert',
    'aria-live': 'polite'
  }
} as const;

export const MAX_NOTIFICATIONS = 5;

// Type definitions
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type NotificationPosition = typeof NOTIFICATION_POSITIONS[number];

export interface NotificationAction {
  label: string;
  color?: string;
  handler: () => void;
  attrs?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timeout?: number;
  position?: NotificationPosition;
  closeOnClick?: boolean;
  progress?: boolean;
  multiLine?: boolean;
  caption?: string;
  actions?: NotificationAction[];
  attrs?: Record<string, unknown>;
  onDismiss?: () => void;
  onShow?: () => void;
}

export interface NotificationState {
  notifications: Notification[];
  notificationQueue: Notification[];
  config: typeof DEFAULT_NOTIFICATION_OPTIONS;
}

// Store implementation
export const useNotificationStore = defineStore('notification', {
  state: (): NotificationState => ({
    notifications: [],
    notificationQueue: [],
    config: { ...DEFAULT_NOTIFICATION_OPTIONS }
  }),

  getters: {
    activeNotifications: (state) => state.notifications,
    queuedNotifications: (state) => state.notificationQueue,
    currentConfig: (state) => state.config
  },

  actions: {
    /**
     * Updates the global notification configuration
     * @param config Partial configuration to update
     */
    updateConfig(config: Partial<typeof DEFAULT_NOTIFICATION_OPTIONS>) {
      this.config = {
        ...this.config,
        ...config
      };
    },

    /**
     * Adds a new notification to the system
     * @param notification Notification configuration
     */
    addNotification(notification: Omit<Notification, 'id'>) {
      const newNotification: Notification = {
        id: uuidv4(),
        ...DEFAULT_NOTIFICATION_OPTIONS,
        ...notification
      };

      // Validate notification type
      if (!Object.values(NOTIFICATION_TYPES).includes(newNotification.type)) {
        console.error(`Invalid notification type: ${newNotification.type}`);
        return;
      }

      // Handle notification queue if max limit reached
      if (this.notifications.length >= MAX_NOTIFICATIONS) {
        this.notificationQueue.push(newNotification);
        return;
      }

      this.showNotification(newNotification);
    },

    /**
     * Displays a notification using Quasar's Notify system
     * @param notification Notification to display
     */
    showNotification(notification: Notification) {
      const { id, type, message, onDismiss, onShow, ...options } = notification;

      this.notifications.push(notification);

      Notify.create({
        type,
        message,
        ...options,
        onDismiss: () => {
          this.removeNotification(id);
          onDismiss?.();
        },
        onShow: () => {
          onShow?.();
        }
      });
    },

    /**
     * Removes a notification from the active list
     * @param id ID of the notification to remove
     */
    removeNotification(id: string) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        this.notifications.splice(index, 1);
        this.processQueue();
      }
    },

    /**
     * Processes the notification queue when space becomes available
     */
    processQueue() {
      if (this.notifications.length < MAX_NOTIFICATIONS && this.notificationQueue.length > 0) {
        const nextNotification = this.notificationQueue.shift();
        if (nextNotification) {
          this.showNotification(nextNotification);
        }
      }
    },

    /**
     * Clears all active notifications and the queue
     */
    clearNotifications() {
      Notify.dismiss();
      this.notifications = [];
      this.notificationQueue = [];
    },

    /**
     * Convenience method for showing success notifications
     * @param message Success message
     * @param options Additional notification options
     */
    success(message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) {
      this.addNotification({
        type: NOTIFICATION_TYPES.SUCCESS,
        message,
        ...options
      });
    },

    /**
     * Convenience method for showing error notifications
     * @param message Error message
     * @param options Additional notification options
     */
    error(message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) {
      this.addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        message,
        attrs: {
          ...DEFAULT_NOTIFICATION_OPTIONS.attrs,
          'aria-live': 'assertive'
        },
        ...options
      });
    },

    /**
     * Convenience method for showing warning notifications
     * @param message Warning message
     * @param options Additional notification options
     */
    warning(message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) {
      this.addNotification({
        type: NOTIFICATION_TYPES.WARNING,
        message,
        ...options
      });
    },

    /**
     * Convenience method for showing info notifications
     * @param message Info message
     * @param options Additional notification options
     */
    info(message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) {
      this.addNotification({
        type: NOTIFICATION_TYPES.INFO,
        message,
        ...options
      });
    }
  }
});