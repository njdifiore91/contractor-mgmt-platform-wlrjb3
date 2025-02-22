<template>
  <q-footer class="app-footer" :class="{ 'theme--dark': isDarkTheme }">
    <q-toolbar class="footer-content layout-container">
      <!-- Copyright Section -->
      <div class="footer-copyright">
        <span class="copyright-text">
          &copy; {{ getCurrentYear() }} Service Provider Management System
        </span>
      </div>

      <!-- Footer Links -->
      <nav class="footer-links" aria-label="Footer navigation">
        <a 
          href="#/privacy" 
          class="footer-link"
          @click.prevent="$router.push('/privacy')"
          aria-label="Privacy Policy"
        >
          Privacy Policy
        </a>
        <a 
          href="#/terms" 
          class="footer-link"
          @click.prevent="$router.push('/terms')"
          aria-label="Terms of Service"
        >
          Terms of Service
        </a>
        <a 
          href="#/help" 
          class="footer-link"
          @click.prevent="$router.push('/help')"
          aria-label="Help Center"
        >
          Help
        </a>
      </nav>

      <!-- Version Info -->
      <div class="footer-version" aria-label="System version">
        <span>v{{ systemVersion }}</span>
      </div>
    </q-toolbar>
  </q-footer>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { QFooter, QToolbar } from 'quasar' // v2.0.0

export default defineComponent({
  name: 'AppFooter',

  components: {
    QFooter,
    QToolbar
  },

  setup() {
    const systemVersion = ref('1.0.0')
    const isDarkTheme = ref(false)

    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleThemeChange = (e) => {
      isDarkTheme.value = e.matches
      document.documentElement.style.setProperty('will-change', 'background-color, color')
      requestAnimationFrame(() => {
        document.documentElement.style.removeProperty('will-change')
      })
    }

    onMounted(() => {
      isDarkTheme.value = mediaQuery.matches
      mediaQuery.addEventListener('change', handleThemeChange)
    })

    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handleThemeChange)
    })

    const getCurrentYear = () => {
      return new Date().getFullYear()
    }

    return {
      systemVersion,
      isDarkTheme,
      getCurrentYear
    }
  }
})
</script>

<style lang="scss" scoped>
@import '../../assets/styles/app.scss';

.app-footer {
  background-color: var(--surface-ground);
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
  border-top: 1px solid rgba(var(--text-color), 0.12);

  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    min-height: 48px;

    @media (max-width: $breakpoint-xs) {
      flex-direction: column;
      gap: var(--space-sm);
      text-align: center;
      padding: var(--space-md);
    }
  }

  .footer-copyright {
    font-size: 0.875rem;
    
    @media (max-width: $breakpoint-xs) {
      order: 2;
    }
  }

  .footer-links {
    display: flex;
    gap: var(--space-md);
    
    @media (max-width: $breakpoint-xs) {
      order: 1;
      flex-wrap: wrap;
      justify-content: center;
    }

    .footer-link {
      color: var(--text-color);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 0.3s ease, opacity 0.3s ease;
      opacity: 0.8;

      &:hover {
        opacity: 1;
      }

      &:focus {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
        opacity: 1;
      }

      // High contrast mode support
      @media (forced-colors: active) {
        color: LinkText;
        
        &:hover, &:focus {
          color: ActiveText;
        }
      }
    }
  }

  .footer-version {
    font-size: 0.75rem;
    opacity: 0.6;
    
    @media (max-width: $breakpoint-xs) {
      order: 3;
    }
  }

  // Theme-specific styles
  &.theme--dark {
    background-color: var(--dark-page);
    border-top-color: rgba(255, 255, 255, 0.12);
  }
}

// Print styles
@media print {
  .app-footer {
    display: none !important;
  }
}
</style>