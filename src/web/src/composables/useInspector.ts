import { ref, computed, onMounted, watchEffect } from 'vue'; // ^3.3.0
import type { GeographyPoint } from '../types/spatial'; // v7.12.2
import { debounce } from 'lodash'; // ^4.17.21
import { useInspectorStore } from '../stores/inspector.store';
import type { Inspector, InspectorStatus, Certification, DrugTest } from '../models/inspector.model';

// Constants for search configuration
const DEFAULT_SEARCH_RADIUS = 50;
const MIN_SEARCH_RADIUS = 1;
const MAX_SEARCH_RADIUS = 500;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Composable for managing inspector-related functionality
 * Implements comprehensive inspector management with reactive state,
 * geographic search, and error handling
 */
export function useInspector() {
  // Initialize store
  const inspectorStore = useInspectorStore();

  // Reactive state
  const searchLocation = ref<GeographyPoint | null>(null);
  const searchRadius = ref<number>(DEFAULT_SEARCH_RADIUS);
  const selectedStatus = ref<InspectorStatus | null>(null);
  const selectedCertifications = ref<string[]>([]);
  const isActive = ref<boolean | null>(null);
  const error = ref<Error | null>(null);
  const currentPage = ref<number>(1);
  const pageSize = ref<number>(25);

  // Computed properties
  const inspectors = computed(() => inspectorStore.allInspectors);
  const selectedInspector = computed(() => inspectorStore.currentInspector);
  const isLoading = computed(() => inspectorStore.isSearching);
  const totalPages = computed(() => inspectorStore.totalPages);
  const activeInspectors = computed(() => inspectorStore.activeInspectors);

  /**
   * Validates search parameters
   * @throws Error if parameters are invalid
   */
  const validateSearchParams = (
    location: GeographyPoint,
    radius: number
  ): void => {
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      throw new Error('Invalid location coordinates');
    }

    if (location.latitude < -90 || location.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    if (location.longitude < -180 || location.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }

    if (radius < MIN_SEARCH_RADIUS || radius > MAX_SEARCH_RADIUS) {
      throw new Error(`Search radius must be between ${MIN_SEARCH_RADIUS} and ${MAX_SEARCH_RADIUS} miles`);
    }
  };

  /**
   * Performs geographic search for inspectors with debouncing
   */
  const searchInspectors = debounce(async () => {
    if (!searchLocation.value) {
      return;
    }

    try {
      error.value = null;
      validateSearchParams(searchLocation.value, searchRadius.value);

      await inspectorStore.searchInspectors(
        searchLocation.value,
        searchRadius.value,
        selectedStatus.value,
        selectedCertifications.value,
        isActive.value,
        currentPage.value,
        pageSize.value
      );
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to search inspectors');
      throw error.value;
    }
  }, SEARCH_DEBOUNCE_MS);

  /**
   * Updates search location and triggers search
   */
  const setSearchLocation = (location: GeographyPoint): void => {
    searchLocation.value = location;
    searchInspectors();
  };

  /**
   * Updates search radius and triggers search
   */
  const setSearchRadius = (radius: number): void => {
    searchRadius.value = radius;
    searchInspectors();
  };

  /**
   * Updates selected inspector status filter
   */
  const setSelectedStatus = (status: InspectorStatus | null): void => {
    selectedStatus.value = status;
    searchInspectors();
  };

  /**
   * Updates certification filters
   */
  const setSelectedCertifications = (certifications: string[]): void => {
    selectedCertifications.value = certifications;
    searchInspectors();
  };

  /**
   * Selects an inspector for detailed view
   */
  const selectInspector = (inspector: Inspector | null): void => {
    inspectorStore.selectInspector(inspector);
  };

  /**
   * Updates pagination
   */
  const setPage = (page: number): void => {
    currentPage.value = page;
    searchInspectors();
  };

  /**
   * Clears all search filters and results
   */
  const clearSearch = (): void => {
    searchLocation.value = null;
    searchRadius.value = DEFAULT_SEARCH_RADIUS;
    selectedStatus.value = null;
    selectedCertifications.value = [];
    isActive.value = null;
    currentPage.value = 1;
    inspectorStore.clearSearch();
  };

  /**
   * Watches for changes in search parameters to invalidate cache
   */
  watchEffect(() => {
    if (searchLocation.value || selectedStatus.value || selectedCertifications.value.length > 0) {
      inspectorStore.clearCache();
    }
  });

  // Initialize component
  onMounted(() => {
    // Clear any stale search results
    clearSearch();
  });

  return {
    // State
    searchLocation,
    searchRadius,
    selectedStatus,
    selectedCertifications,
    isActive,
    error,
    currentPage,
    pageSize,

    // Computed
    inspectors,
    selectedInspector,
    isLoading,
    totalPages,
    activeInspectors,

    // Methods
    searchInspectors,
    setSearchLocation,
    setSearchRadius,
    setSelectedStatus,
    setSelectedCertifications,
    selectInspector,
    setPage,
    clearSearch
  };
}