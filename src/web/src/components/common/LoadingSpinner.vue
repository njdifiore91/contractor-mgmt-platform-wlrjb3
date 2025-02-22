<template>
  <div 
    class="loading-spinner" 
    role="status"
    :aria-label="ariaLabel"
  >
    <q-spinner
      v-bind="spinnerProps"
      v-show="true"
    />
  </div>
</template>

<script>
import { QSpinner } from 'quasar' // v2.0.0
import { responsive-spacing } from '@/assets/styles/app.scss'

export default {
  name: 'LoadingSpinner',
  
  components: {
    QSpinner
  },

  props: {
    size: {
      type: String,
      default: 'medium',
      validator: value => ['small', 'medium', 'large'].includes(value) && typeof value === 'string'
    },
    color: {
      type: String,
      default: 'primary',
      validator: value => [
        'primary',
        'secondary',
        'accent',
        'dark',
        'positive',
        'negative',
        'info',
        'warning'
      ].includes(value)
    },
    thickness: {
      type: Number,
      default: 5,
      validator: value => value >= 2 && value <= 10
    }
  },

  computed: {
    spinnerProps() {
      return {
        size: this.computeSpinnerSize(this.size),
        color: this.$q.dark.isActive ? `${this.color}-light` : this.color,
        thickness: this.thickness,
        // Material Design animation timing
        animate: {
          duration: '1.5s',
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }
      }
    },

    ariaLabel() {
      return this.$t('common.loading') || 'Loading...'
    }
  },

  methods: {
    computeSpinnerSize(size) {
      const sizeMappings = {
        small: 24,
        medium: 36,
        large: 48
      }

      const baseSize = sizeMappings[size]
      const breakpointScaling = {
        sm: 1,
        md: 1.25,
        lg: 1.5
      }

      const currentBreakpoint = this.$q.screen.name
      const scale = breakpointScaling[currentBreakpoint] || 1

      return Math.round(baseSize * scale)
    }
  }
}
</script>

<style lang="scss" scoped>
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: responsive-spacing(margin, $space-base);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}
</style>