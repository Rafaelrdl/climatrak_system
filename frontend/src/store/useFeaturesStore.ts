/**
 * Tenant Features Store
 * 
 * Manages feature flags for the current tenant.
 * Features are fetched from /api/auth/me/ during authentication.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// TrakService feature keys
export type TrakServiceFeature = 
  | 'trakservice.enabled'
  | 'trakservice.dispatch'
  | 'trakservice.tracking'
  | 'trakservice.routing'
  | 'trakservice.km'
  | 'trakservice.quotes';

// All known feature keys
export type FeatureKey = TrakServiceFeature | string;

// Features map type
export type FeaturesMap = Record<FeatureKey, boolean>;

// Default features (all disabled)
export const DEFAULT_FEATURES: FeaturesMap = {
  'trakservice.enabled': false,
  'trakservice.dispatch': false,
  'trakservice.tracking': false,
  'trakservice.routing': false,
  'trakservice.km': false,
  'trakservice.quotes': false,
};

interface FeaturesState {
  // Current tenant features
  features: FeaturesMap;
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  setFeatures: (features: FeaturesMap) => void;
  clearFeatures: () => void;
  
  // Helpers
  hasFeature: (key: FeatureKey) => boolean;
  hasTrakService: () => boolean;
  hasTrakServiceFeature: (feature: Exclude<TrakServiceFeature, 'trakservice.enabled'>) => boolean;
}

const STORAGE_KEY = 'tenant:features';

export const useFeaturesStore = create<FeaturesState>()(
  persist(
    (set, get) => ({
      features: { ...DEFAULT_FEATURES },
      isLoading: false,

      setFeatures: (features: FeaturesMap) => {
        set({ 
          features: { ...DEFAULT_FEATURES, ...features },
          isLoading: false,
        });
      },

      clearFeatures: () => {
        set({ 
          features: { ...DEFAULT_FEATURES },
          isLoading: false,
        });
      },

      hasFeature: (key: FeatureKey) => {
        const { features } = get();
        return features[key] ?? false;
      },

      hasTrakService: () => {
        const { features } = get();
        return features['trakservice.enabled'] ?? false;
      },

      hasTrakServiceFeature: (feature) => {
        const { features } = get();
        // Must have base trakservice.enabled AND the specific feature
        const baseEnabled = features['trakservice.enabled'] ?? false;
        const featureEnabled = features[feature] ?? false;
        return baseEnabled && featureEnabled;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ features: state.features }),
    }
  )
);

// =============================================================================
// Hook Helpers
// =============================================================================

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeature(key: FeatureKey): boolean {
  return useFeaturesStore((state) => state.features[key] ?? false);
}

/**
 * Hook to check if TrakService is enabled
 */
export function useTrakService(): boolean {
  return useFeaturesStore((state) => state.features['trakservice.enabled'] ?? false);
}

/**
 * Hook to check if a TrakService sub-feature is enabled
 * Automatically checks base trakservice.enabled
 */
export function useTrakServiceFeature(
  feature: 'dispatch' | 'tracking' | 'routing' | 'km' | 'quotes'
): boolean {
  return useFeaturesStore((state) => {
    const baseEnabled = state.features['trakservice.enabled'] ?? false;
    const featureEnabled = state.features[`trakservice.${feature}`] ?? false;
    return baseEnabled && featureEnabled;
  });
}

/**
 * Hook to get all features
 */
export function useFeatures(): FeaturesMap {
  return useFeaturesStore((state) => state.features);
}

/**
 * Sync function to check feature (for non-hook contexts)
 */
export function hasFeature(key: FeatureKey): boolean {
  return useFeaturesStore.getState().features[key] ?? false;
}

/**
 * Sync function to check TrakService (for non-hook contexts)
 */
export function hasTrakService(): boolean {
  return useFeaturesStore.getState().features['trakservice.enabled'] ?? false;
}
