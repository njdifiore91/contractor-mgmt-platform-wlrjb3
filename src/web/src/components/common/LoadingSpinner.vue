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

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

interface Props {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  thickness?: number;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  color: 'primary',
  thickness: 5,
  ariaLabel: 'Loading...'
});

const computeSpinnerSize = (size: string) => {
  const sizeMappings = {
    small: 24,
    medium: 36,
    large: 48
  };

  const baseSize = sizeMappings[size as keyof typeof sizeMappings];
  const breakpointScaling = {
    sm: 1,
    md: 1.25,
    lg: 1.5
  };

  const currentBreakpoint = $q.screen.name;
  const scale = breakpointScaling[currentBreakpoint as keyof typeof breakpointScaling] || 1;

  return Math.round(baseSize * scale);
};

const spinnerProps = computed(() => ({
  size: computeSpinnerSize(props.size),
  color: $q.dark.isActive ? `${props.color}-light` : props.color,
  thickness: props.thickness,
  animate: {
    duration: '1.5s',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
}));
</script>

<style lang="scss" scoped>
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: var(--space-base);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}
</style>