// Pinia store for managing inspector state and operations
import { defineStore } from 'pinia';
import { InspectorStatus } from '../models/inspector.model';
import type { GeographyPoint, Inspector } from '../models/inspector.model';
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
    error: string | null;
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
        lastSearch: null,
        error: null
    }),

    getters: {
        allInspectors: (state): Inspector[] => state.inspectors,
        currentInspector: (state): Inspector | null => state.selectedInspector,
        isSearching: (state): boolean => state.searchLoading,
        totalPages: (state): number => 
            Math.ceil(state.totalItems / (state.lastSearch?.pageSize || DEFAULT_PAGE_SIZE)),
        inspectorsByStatus: (state) => (status: InspectorStatus) => 
            state.inspectors.filter((inspector: Inspector) => inspector.status === status),
        activeInspectors: (state): Inspector[] => 
            state.inspectors.filter((inspector: Inspector) => inspector.isActive)
    },

    actions: {
        async searchInspectors(
            location: GeographyPoint | null,
            radius: number | null,
            status: InspectorStatus[] | null,
            certifications: string[],
            includeUnavailable = null
        ) {
            this.loading = true;
            try {
                const response = await searchInspectors({
                    location: location ? {
                        latitude: location.latitude,
                        longitude: location.longitude
                    } : null,
                    radiusInMiles: radius || undefined,
                    status: status || undefined,
                    certifications,
                    isActive: includeUnavailable === false ? true : undefined
                });

                this.inspectors = response.items;
                this.totalItems = response.totalCount;
                return response;
            } catch (error) {
                console.error('Failed to search inspectors:', error);
                this.error = error instanceof Error ? error.message : 'An unknown error occurred';
                throw error;
            } finally {
                this.loading = false;
            }
        },

        selectInspector(inspector: Inspector | null): void {
            this.selectedInspector = inspector;
        },

        clearSearch(): void {
            this.inspectors = [];
            this.totalItems = 0;
            this.currentPage = 1;
            this.lastSearch = null;
        },

        clearCache(): void {
            this.searchCache.clear();
        },

        updateInspector(updatedInspector: Inspector): void {
            const index = this.inspectors.findIndex(i => i.id === updatedInspector.id);
            if (index !== -1) {
                this.inspectors[index] = updatedInspector;
            }
            if (this.selectedInspector?.id === updatedInspector.id) {
                this.selectedInspector = updatedInspector;
            }
        },

        removeInspector(inspectorId: number): void {
            this.inspectors = this.inspectors.filter(i => i.id !== inspectorId);
            if (this.selectedInspector?.id === inspectorId) {
                this.selectedInspector = null;
            }
        }
    }
});