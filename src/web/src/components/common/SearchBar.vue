<template>
  <div class="search-bar" role="search">
    <QInput
      v-model="searchText"
      :placeholder="t(props.placeholder)"
      :loading="props.loading"
      :error="!!errorMessage"
      :error-message="errorMessage"
      outlined
      dense
      clearable
      :aria-label="t('search.label')"
      @update:model-value="handleSearch"
      @clear="clearSearch"
    >
      <template #prepend>
        <QIcon name="search" role="img" :aria-label="t('search.icon')" />
      </template>
      <template #append v-if="searchText">
        <QIcon 
          name="clear" 
          class="cursor-pointer"
          role="button"
          :aria-label="t('search.clear')"
          @click="clearSearch"
        />
      </template>
    </QInput>
  </div>
</template>

<script setup lang="ts">
// Vue 3.x Composition API
import { ref, onMounted, onBeforeUnmount } from 'vue';

// Quasar v2.0.0 Components
import { QInput, QIcon } from 'quasar';

// Lodash v4.17.21 for debouncing
import debounce from 'lodash/debounce';

// Vue-i18n v9.0.0 for internationalization
import { useI18n } from 'vue-i18n';

// Internal validation utility
import { validateRequired } from '@/utils/validation.util';

// Props definition with TypeScript types
const props = withDefaults(defineProps<{
  placeholder?: string;
  initialValue?: string;
  debounceTime?: number;
  validationRules?: ((value: string) => boolean)[];
  loading?: boolean;
}>(), {
  placeholder: 'search.placeholder',
  initialValue: '',
  debounceTime: 300,
  validationRules: () => [],
  loading: false
});

// Emits definition with TypeScript types
const emit = defineEmits<{
  (e: 'search', value: string): void;
  (e: 'clear'): void;
  (e: 'error', error: { message: string }): void;
}>();

// Component state
const searchText = ref(props.initialValue);
const errorMessage = ref('');
const { t } = useI18n();

// Security validation patterns
const INJECTION_PATTERN = /[<>{}()$]/;
const MAX_SEARCH_LENGTH = 100;

/**
 * Validates the search input against security and custom rules
 * @param value - The search text to validate
 * @returns Validation result object
 */
const validateInput = (value: string): { isValid: boolean; error?: string } => {
  // Required field validation
  if (!validateRequired(value)) {
    return { isValid: false, error: t('search.errors.required') };
  }

  // Security validation
  if (INJECTION_PATTERN.test(value)) {
    return { isValid: false, error: t('search.errors.invalid_characters') };
  }

  // Length validation
  if (value.length > MAX_SEARCH_LENGTH) {
    return { isValid: false, error: t('search.errors.too_long') };
  }

  // Custom validation rules
  for (const rule of props.validationRules) {
    if (!rule(value)) {
      return { isValid: false, error: t('search.errors.validation_failed') };
    }
  }

  return { isValid: true };
};

/**
 * Debounced search handler
 */
const debouncedSearch = debounce((value: string) => {
  const validation = validateInput(value);
  
  if (!validation.isValid) {
    errorMessage.value = validation.error || t('search.errors.generic');
    emit('error', { message: errorMessage.value });
    return;
  }

  errorMessage.value = '';
  emit('search', value.trim());
}, props.debounceTime);

/**
 * Handles search input changes
 * @param value - New search text value
 */
const handleSearch = (value: string): void => {
  searchText.value = value;
  if (!value) {
    clearSearch();
    return;
  }
  debouncedSearch(value);
};

/**
 * Clears the search input and resets state
 */
const clearSearch = (): void => {
  searchText.value = '';
  errorMessage.value = '';
  debouncedSearch.cancel();
  emit('clear');
};

// Lifecycle hooks
onMounted(() => {
  if (props.initialValue) {
    handleSearch(props.initialValue);
  }
});

onBeforeUnmount(() => {
  debouncedSearch.cancel();
});
</script>

<style scoped>
.search-bar {
  width: 100%;
  max-width: 400px;
  margin: 8px 0;
  position: relative;
}

/* Ensure input transitions smoothly */
:deep(.q-field) {
  transition: all 0.3s ease;
}

/* Ensure error messages are properly styled */
:deep(.q-field__bottom) {
  color: var(--q-negative);
  font-size: 12px;
  padding-top: 4px;
}

/* Improve focus visibility for accessibility */
:deep(.q-field--focused) {
  outline: 2px solid var(--q-primary);
  outline-offset: 2px;
}

/* Ensure proper contrast for placeholder text */
:deep(.q-field__native::placeholder) {
  color: rgba(0, 0, 0, 0.6);
}

/* Dark mode support */
:deep(.body--dark .q-field__native::placeholder) {
  color: rgba(255, 255, 255, 0.7);
}
</style>