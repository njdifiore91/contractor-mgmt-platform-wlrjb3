import { ref, computed } from 'vue'; // ^3.3.0
import { Notify, useQuasar } from 'quasar'; // ^2.0.0
import { useNotificationStore } from '../stores/notification.store';
import type {
  Notification,
  NotificationType,
  NotificationPosition,
  NotificationAction
} from '../stores/notification.store';

// Screen breakpoints for responsive positioning
const SCREEN_BREAKPOINTS = {
  xs: 320,
  sm: 768,
  md: 1024,
  lg: 1440
};

export function useNotification() {
  const $q = useQuasar();
  const notificationStore = useNotificationStore();
  const notificationQueue = ref<Notification[]>([]);
  const activeNotifications = computed(() => notificationStore.activeNotifications);

  // Determine optimal notification position based on screen size
  const getResponsivePosition = (): NotificationPosition => {
    const width = window.innerWidth;
    if (width <= SCREEN_BREAKPOINTS.xs) {
      return 'bottom';
    } else if (width <= SCREEN_BREAKPOINTS.sm) {
      return 'top';
    }
    return 'top-right';
  };

  // Default accessibility configuration
  const defaultA11yConfig = {
    attrs: {
      role: 'alert',
      'aria-live': 'polite',
      'aria-atomic': 'true'
    }
  };

  interface NotificationOptions {
    message: string;
    type?: NotificationType;
    timeout?: number;
    position?: NotificationPosition;
    actions?: NotificationAction[];
    multiLine?: boolean;
    caption?: string;
    html?: boolean;
    progress?: boolean;
    closeOnClick?: boolean;
    attrs?: Record<string, unknown>;
    onDismiss?: () => void;
    onShow?: () => void;
  }

  const showNotification = (options: NotificationOptions): string => {
    const position = options.position || getResponsivePosition();
    const notificationConfig: Omit<Notification, 'id'> = {
      type: options.type || 'info',
      message: options.message,
      position,
      timeout: options.timeout,
      actions: options.actions,
      multiLine: options.multiLine ?? false,
      caption: options.caption,
      progress: options.progress ?? true,
      closeOnClick: options.closeOnClick ?? true,
      attrs: {
        ...defaultA11yConfig.attrs,
        ...options.attrs
      },
      onDismiss: options.onDismiss,
      onShow: options.onShow
    };

    notificationStore.addNotification(notificationConfig);
    return notificationConfig.message; // Store generates actual ID
  };

  const showSuccessNotification = (
    message: string,
    options: Partial<NotificationOptions> = {}
  ): string => {
    return showNotification({
      ...options,
      message,
      type: 'positive',
      attrs: {
        ...defaultA11yConfig.attrs,
        'aria-label': `Success: ${message}`
      }
    });
  };

  const showErrorNotification = (
    message: string,
    options: Partial<NotificationOptions> = {}
  ): string => {
    return showNotification({
      ...options,
      message,
      type: 'negative',
      timeout: options.timeout || 0, // Errors stay until dismissed
      attrs: {
        ...defaultA11yConfig.attrs,
        'aria-live': 'assertive',
        'aria-label': `Error: ${message}`
      }
    });
  };

  const showWarningNotification = (
    message: string,
    options: Partial<NotificationOptions> = {}
  ): string => {
    return showNotification({
      ...options,
      message,
      type: 'warning',
      attrs: {
        ...defaultA11yConfig.attrs,
        'aria-label': `Warning: ${message}`
      }
    });
  };

  const dismissNotification = (id: string): void => {
    notificationStore.removeNotification(id);
    Notify.dismiss(id);
  };

  const dismissAllNotifications = (): void => {
    notificationStore.clearNotifications();
  };

  // Handle screen resize for responsive positioning
  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    if (resizeTimeout) {
      window.clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      const newPosition = getResponsivePosition();
      notificationStore.updateConfig({ position: newPosition });
    }, 150);
  });

  return {
    // Core notification functions
    showNotification,
    showSuccessNotification,
    showErrorNotification,
    showWarningNotification,
    dismissNotification,
    dismissAllNotifications,

    // State access
    activeNotifications,
    notificationQueue,

    // Utility functions
    getResponsivePosition
  };
}

export type {
  NotificationOptions,
  NotificationType,
  NotificationPosition,
  NotificationAction
};