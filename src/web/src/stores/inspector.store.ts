// Pinia store for managing inspector state and operations
import { defineStore } from 'pinia'; // ^2.1.0
import { GeographyPoint } from '@types/microsoft-spatial'; // v7.12.2
import { Inspector, InspectorStatus } from '../models/inspector.model';
import { searchInspectors } from '../api/inspector.api';
import { useNotificationStore } from '../stores/notification.store';

// Constants for store configuration
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SEARCH_RADIUS = 50;
const MAX_SEARCH_RADIUS = 500;
const CACHE_DURATION_MS = 300000; // 5 minutes

// Interface for search parameters
interface SearchParameters {
    location: GeographyPoint;
    radiusInMiles: number;
    status: InspectorStatus | null;
    certifications: string[];
    isActive: boolean | null;
    pageNumber: number;
    pageSize: number;
}

// Interface for cached search results
interface CachedSearchResult {
    timestamp: number;
    results: Inspector[];
    totalItems: number;
}

// Interface for store state
interface InspectorState {
    inspectors: Inspector[];
    selectedInspector: Inspector | null;
    loading: boolean;
    searchLoading: boolean;
    totalItems: number;
    currentPage: number;
    searchCache: Map<string, CachedSearchResult>;
    lastSearch: SearchParameters | null;
}

// Generate cache key from search parameters
const generateCacheKey = (params: SearchParameters): string => {
    return JSON.stringify({
        lat: params.location.latitude,
        lng: params.location.longitude,
        radius: params.radiusInMiles,
        status: params.status,
        certs: params.certifications.sort(),
        active: params.isActive,
        page: params.pageNumber,
        size: params.pageSize
    });
};

// Check if cached result is still valid
const isCacheValid = (timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION_MS;
};

// Create and export the inspector store
export const useInspectorStore = defineStore('inspector', {
    state: (): InspectorState => ({
        inspectors: [],
        selectedInspector: null,
        loading: false,
        searchLoading: false,
        totalItems: 0,
        currentPage: 1,
        searchCache: new Map(),
        lastSearch: null
    }),

    getters: {
        // Get all inspectors
        allInspectors: (state): Inspector[] => state.inspectors,

        // Get selected inspector
        currentInspector: (state): Inspector | null => state.selectedInspector,

        // Check if search is in progress
        isSearching: (state): boolean => state.searchLoading,

        // Get total pages based on items and page size
        totalPages: (state): number => 
            Math.ceil(state.totalItems / (state.lastSearch?.pageSize || DEFAULT_PAGE_SIZE)),

        // Get inspectors by status
        inspectorsByStatus: (state) => (status: InspectorStatus): Inspector[] => 
            state.inspectors.filter(inspector => inspector.status === status),

        // Get active inspectors
        activeInspectors: (state): Inspector[] => 
            state.inspectors.filter(inspector => inspector.isActive)
    },

    actions: {
        /**
         * Search for inspectors based on location and criteria
         */
        async searchInspectors(
            location: GeographyPoint,
            radiusInMiles: number = DEFAULT_SEARCH_RADIUS,
            status: InspectorStatus | null = null,
            certifications: string[] = [],
            isActive: boolean | null = null,
            pageNumber: number = 1,
            pageSize: number = DEFAULT_PAGE_SIZE
        ): Promise<void> {
            const notificationStore = useNotificationStore();

            try {
                // Validate radius
                if (radiusInMiles > MAX_SEARCH_RADIUS) {
                    throw new Error(`Search radius cannot exceed ${MAX_SEARCH_RADIUS} miles`);
                }

                // Create search parameters
                const searchParams: SearchParameters = {
                    location,
                    radiusInMiles,
                    status,
                    certifications,
                    isActive,
                    pageNumber,
                    pageSize
                };

                // Generate cache key
                const cacheKey = generateCacheKey(searchParams);

                // Check cache for existing results
                const cachedResult = this.searchCache.get(cacheKey);
                if (cachedResult && isCacheValid(cachedResult.timestamp)) {
                    this.inspectors = cachedResult.results;
                    this.totalItems = cachedResult.totalItems;
                    this.currentPage = pageNumber;
                    this.lastSearch = searchParams;
                    return;
                }

                // Set loading state
                this.searchLoading = true;

                // Perform search
                const response = await searchInspectors(
                    location,
                    radiusInMiles,
                    status,
                    certifications,
                    isActive,
                    pageNumber,
                    pageSize
                );

                // Update state with results
                this.inspectors = response.items;
                this.totalItems = response.totalCount;
                this.currentPage = pageNumber;
                this.lastSearch = searchParams;

                // Cache results
                this.searchCache.set(cacheKey, {
                    timestamp: Date.now(),
                    results: response.items,
                    totalItems: response.totalCount
                });

            } catch (error) {
                notificationStore.error(
                    error instanceof Error ? error.message : 'Failed to search inspectors'
                );
                throw error;
            } finally {
                this.searchLoading = false;
            }
        },

        /**
         * Select an inspector
         */
        selectInspector(inspector: Inspector | null): void {
            this.selectedInspector = inspector;
        },

        /**
         * Clear search results and reset state
         */
        clearSearch(): void {
            this.inspectors = [];
            this.totalItems = 0;
            this.currentPage = 1;
            this.lastSearch = null;
        },

        /**
         * Clear search cache
         */
        clearCache(): void {
            this.searchCache.clear();
        },

        /**
         * Update inspector in store after changes
         */
        updateInspector(updatedInspector: Inspector): void {
            const index = this.inspectors.findIndex(i => i.id === updatedInspector.id);
            if (index !== -1) {
                this.inspectors[index] = updatedInspector;
            }
            if (this.selectedInspector?.id === updatedInspector.id) {
                this.selectedInspector = updatedInspector;
            }
        },

        /**
         * Remove inspector from store
         */
        removeInspector(inspectorId: number): void {
            this.inspectors = this.inspectors.filter(i => i.id !== inspectorId);
            if (this.selectedInspector?.id === inspectorId) {
                this.selectedInspector = null;
            }
        }
    }
});