<template>
  <div class="app-notification" role="status" aria-live="polite">
    <!-- Notifications are rendered by Quasar in portal, no direct template needed -->
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'; // ^3.3.0
import { Notify, useQuasar } from 'quasar'; // ^2.0.0
import { useNotificationStore } from '@/stores/notification.store';
import { useNotification } from '@/composables/useNotification';

// Screen breakpoints for responsive positioning
const SCREEN_BREAKPOINTS = {
  xs: 320,
  sm: 768,
  md: 1024,
  lg: 1440
};

export default defineComponent({
  name: 'AppNotification',

  setup() {
    const $q = useQuasar();
    const notificationStore = useNotificationStore();
    const { showNotification, dismissNotification } = useNotification();
    
    // Track screen size for responsive positioning
    const screenSize = ref(window.innerWidth);
    
    // Computed property for active notifications
    const activeNotifications = computed(() => notificationStore.activeNotifications);

    // Handle screen resize for responsive positioning
    let resizeTimeout: number | null = null;
    
    const handleResize = () => {
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }
      resizeTimeout = window.setTimeout(() => {
        screenSize.value = window.innerWidth;
        updateNotificationPositions();
      }, 150);
    };

    // Update notification positions based on screen size
    const updateNotificationPositions = () => {
      const position = getResponsivePosition();
      activeNotifications.value.forEach(notification => {
        if (notification.position !== position) {
          // Re-render notification with new position
          dismissNotification(notification.id);
          showNotification({
            ...notification,
            position
          });
        }
      });
    };

    // Get optimal position based on screen size
    const getResponsivePosition = () => {
      if (screenSize.value <= SCREEN_BREAKPOINTS.xs) {
        return 'bottom';
      } else if (screenSize.value <= SCREEN_BREAKPOINTS.sm) {
        return 'top';
      }
      return 'top-right';
    };

    // Handle notification click events
    const handleNotificationClick = (notification: any) => {
      if (notification.closeOnClick) {
        dismissNotification(notification.id);
      }
      if (notification.onClick) {
        notification.onClick();
      }
    };

    // Handle action button clicks
    const handleActionClick = (action: any, notification: any) => {
      if (action.handler) {
        action.handler();
      }
      if (action.closeOnClick !== false) {
        dismissNotification(notification.id);
      }
    };

    // Configure global Quasar notification defaults
    const configureQuasarNotifications = () => {
      $q.notify.setDefaults({
        position: getResponsivePosition(),
        timeout: 5000,
        progress: true,
        actions: [
          {
            icon: 'close',
            color: 'white',
            handler: () => {},
            class: 'notification-close-btn'
          }
        ],
        classes: 'app-notification-item'
      });
    };

    // Lifecycle hooks
    onMounted(() => {
      window.addEventListener('resize', handleResize);
      configureQuasarNotifications();
    });

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }
    });

    return {
      activeNotifications,
      showNotification: (options: any) => {
        const position = getResponsivePosition();
        return showNotification({
          ...options,
          position,
          onClick: () => handleNotificationClick(options),
          actions: options.actions?.map((action: any) => ({
            ...action,
            handler: () => handleActionClick(action, options)
          }))
        });
      },
      dismissNotification,
      handleNotificationClick,
      handleActionClick
    };
  }
});
</script>

<style lang="scss">
@use "@/assets/styles/variables.scss" as vars;

.app-notification {
  // Container is virtual, styles apply to Quasar notifications
  &-item {
    // Base notification styling
    margin: 8px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.4;
    max-width: 400px;
    
    // Type-specific styling
    &--positive {
      background: var(--q-positive);
    }
    
    &--negative {
      background: var(--q-negative);
    }
    
    &--warning {
      background: var(--q-warning);
    }
    
    &--info {
      background: var(--q-info);
    }

    // Responsive adjustments
    @media (max-width: vars.$breakpoint-xs) {
      margin: 4px;
      max-width: 100%;
      border-radius: 0;
    }

    // Accessibility enhancements
    &:focus {
      outline: 2px solid white;
      outline-offset: 2px;
    }

    // Animation classes
    &-enter-active,
    &-leave-active {
      transition: all 0.3s ease;
    }

    &-enter-from,
    &-leave-to {
      opacity: 0;
      transform: translateY(-20px);
    }
  }

  // Close button styling
  .notification-close-btn {
    opacity: 0.8;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }

    &:focus {
      outline: 2px solid white;
      outline-offset: 2px;
    }
  }
}
</style>