/**
 * Feature-based access control components for UI gating.
 * 
 * These components conditionally render children based on tenant features.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { 
  useFeaturesStore, 
  useFeature, 
  useTrakService, 
  useTrakServiceFeature,
  type FeatureKey 
} from '@/store/useFeaturesStore';

// =============================================================================
// Conditional Rendering Components
// =============================================================================

interface IfFeatureProps {
  /** Feature key to check */
  feature: FeatureKey;
  /** Content to render when feature is enabled */
  children: ReactNode;
  /** Optional content when feature is disabled */
  fallback?: ReactNode;
}

/**
 * Conditional render component based on feature flag.
 * 
 * @example
 * <IfFeature feature="trakservice.enabled">
 *   <TrakServiceDashboard />
 * </IfFeature>
 */
export function IfFeature({ feature, children, fallback }: IfFeatureProps) {
  const enabled = useFeature(feature);
  
  if (enabled) {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
}

interface IfTrakServiceProps {
  /** Content to render when TrakService is enabled */
  children: ReactNode;
  /** Optional content when TrakService is disabled */
  fallback?: ReactNode;
}

/**
 * Conditional render for TrakService module.
 * 
 * @example
 * <IfTrakService>
 *   <TrakServiceNavItem />
 * </IfTrakService>
 */
export function IfTrakService({ children, fallback }: IfTrakServiceProps) {
  const enabled = useTrakService();
  
  if (enabled) {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
}

interface IfTrakServiceFeatureProps {
  /** TrakService sub-feature to check (without 'trakservice.' prefix) */
  feature: 'dispatch' | 'tracking' | 'routing' | 'km' | 'quotes';
  /** Content to render when feature is enabled */
  children: ReactNode;
  /** Optional content when feature is disabled */
  fallback?: ReactNode;
}

/**
 * Conditional render for TrakService sub-features.
 * Automatically checks that base TrakService is also enabled.
 * 
 * @example
 * <IfTrakServiceFeature feature="dispatch">
 *   <DispatchBoard />
 * </IfTrakServiceFeature>
 */
export function IfTrakServiceFeature({ feature, children, fallback }: IfTrakServiceFeatureProps) {
  const enabled = useTrakServiceFeature(feature);
  
  if (enabled) {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
}

// =============================================================================
// Route Guard Components
// =============================================================================

interface FeatureRouteGuardProps {
  /** Feature key(s) required for access */
  features: FeatureKey | FeatureKey[];
  /** Route content */
  children: ReactNode;
  /** Where to redirect when feature is disabled (default: /) */
  redirectTo?: string;
}

/**
 * Route guard that redirects when required feature(s) are disabled.
 * 
 * @example
 * <Route path="/trakservice/*" element={
 *   <FeatureRouteGuard features="trakservice.enabled" redirectTo="/cmms">
 *     <TrakServiceRoutes />
 *   </FeatureRouteGuard>
 * } />
 */
export function FeatureRouteGuard({ 
  features, 
  children, 
  redirectTo = '/' 
}: FeatureRouteGuardProps) {
  const location = useLocation();
  const featuresStore = useFeaturesStore();
  
  const featureKeys = Array.isArray(features) ? features : [features];
  const allEnabled = featureKeys.every(key => featuresStore.hasFeature(key));
  
  if (!allEnabled) {
    // Redirect with state for potential notification
    return (
      <Navigate 
        to={redirectTo} 
        replace 
        state={{ 
          from: location,
          reason: 'feature_disabled',
          features: featureKeys,
        }} 
      />
    );
  }
  
  return <>{children}</>;
}

interface TrakServiceRouteGuardProps {
  /** Optional additional TrakService features required */
  features?: ('dispatch' | 'tracking' | 'routing' | 'km' | 'quotes')[];
  /** Route content */
  children: ReactNode;
  /** Where to redirect when disabled (default: /cmms) */
  redirectTo?: string;
}

/**
 * Route guard specifically for TrakService routes.
 * Always checks trakservice.enabled, plus any additional features.
 * 
 * @example
 * <Route path="/trakservice/dispatch/*" element={
 *   <TrakServiceRouteGuard features={['dispatch']}>
 *     <DispatchRoutes />
 *   </TrakServiceRouteGuard>
 * } />
 */
export function TrakServiceRouteGuard({ 
  features = [], 
  children, 
  redirectTo = '/cmms' 
}: TrakServiceRouteGuardProps) {
  const location = useLocation();
  const hasTrakServiceBase = useTrakService();
  
  // Check base trakservice.enabled
  if (!hasTrakServiceBase) {
    return (
      <Navigate 
        to={redirectTo} 
        replace 
        state={{ 
          from: location,
          reason: 'trakservice_disabled',
        }} 
      />
    );
  }
  
  // Check additional features
  const allFeatures = features.map(f => `trakservice.${f}` as FeatureKey);
  
  return (
    <FeatureRouteGuard features={allFeatures} redirectTo={redirectTo}>
      {children}
    </FeatureRouteGuard>
  );
}

// =============================================================================
// HOC for wrapping components
// =============================================================================

/**
 * Higher-Order Component that wraps a component with feature gating.
 * 
 * @example
 * const ProtectedComponent = withFeature('trakservice.enabled')(MyComponent);
 */
export function withFeature<P extends object>(feature: FeatureKey) {
  return function WithFeatureHOC(WrappedComponent: React.ComponentType<P>) {
    return function WithFeature(props: P) {
      const enabled = useFeature(feature);
      
      if (!enabled) {
        return null;
      }
      
      return <WrappedComponent {...props} />;
    };
  };
}

/**
 * HOC that wraps a component with TrakService gating.
 * 
 * @example
 * const ProtectedNavItem = withTrakService(TrakServiceNavItem);
 */
export function withTrakService<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function WithTrakService(props: P) {
    const enabled = useTrakService();
    
    if (!enabled) {
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };
}
