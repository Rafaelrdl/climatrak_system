/**
 * Tests for TrakService Feature Gating
 * 
 * Tests cover:
 * 1. Feature store state management
 * 2. Route guards redirect when features disabled
 * 3. Conditional rendering based on features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { 
  useFeaturesStore, 
  DEFAULT_FEATURES,
  type FeaturesMap 
} from '@/store/useFeaturesStore';
import {
  IfFeature,
  IfTrakService,
  IfTrakServiceFeature,
  FeatureRouteGuard,
  TrakServiceRouteGuard,
} from '@/components/auth/FeatureGate';

// Helper to reset store between tests
const resetStore = () => {
  useFeaturesStore.setState({ 
    features: { ...DEFAULT_FEATURES },
    isLoading: false,
  });
};

// Helper to set features
const setFeatures = (features: Partial<FeaturesMap>) => {
  useFeaturesStore.setState({ 
    features: { ...DEFAULT_FEATURES, ...features } as FeaturesMap,
    isLoading: false,
  });
};

describe('useFeaturesStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should have all features disabled by default', () => {
    const state = useFeaturesStore.getState();
    expect(state.features['trakservice.enabled']).toBe(false);
    expect(state.features['trakservice.dispatch']).toBe(false);
  });

  it('should set features correctly', () => {
    const { setFeatures: storeSetFeatures } = useFeaturesStore.getState();
    
    storeSetFeatures({
      'trakservice.enabled': true,
      'trakservice.dispatch': true,
    });

    const state = useFeaturesStore.getState();
    expect(state.features['trakservice.enabled']).toBe(true);
    expect(state.features['trakservice.dispatch']).toBe(true);
    expect(state.features['trakservice.tracking']).toBe(false);
  });

  it('should clear features to defaults', () => {
    setFeatures({ 'trakservice.enabled': true });
    
    const { clearFeatures } = useFeaturesStore.getState();
    clearFeatures();

    const state = useFeaturesStore.getState();
    expect(state.features['trakservice.enabled']).toBe(false);
  });

  it('hasFeature should return correct value', () => {
    setFeatures({ 'trakservice.enabled': true });
    
    const { hasFeature } = useFeaturesStore.getState();
    expect(hasFeature('trakservice.enabled')).toBe(true);
    expect(hasFeature('trakservice.dispatch')).toBe(false);
  });

  it('hasTrakService should check base feature', () => {
    const { hasTrakService } = useFeaturesStore.getState();
    expect(hasTrakService()).toBe(false);
    
    setFeatures({ 'trakservice.enabled': true });
    expect(useFeaturesStore.getState().hasTrakService()).toBe(true);
  });

  it('hasTrakServiceFeature should check both base and sub-feature', () => {
    // Neither enabled
    expect(useFeaturesStore.getState().hasTrakServiceFeature('trakservice.dispatch')).toBe(false);
    
    // Only base enabled
    setFeatures({ 'trakservice.enabled': true });
    expect(useFeaturesStore.getState().hasTrakServiceFeature('trakservice.dispatch')).toBe(false);
    
    // Both enabled
    setFeatures({ 
      'trakservice.enabled': true, 
      'trakservice.dispatch': true 
    });
    expect(useFeaturesStore.getState().hasTrakServiceFeature('trakservice.dispatch')).toBe(true);
    
    // Only sub-feature enabled (should still be false)
    setFeatures({ 
      'trakservice.enabled': false, 
      'trakservice.dispatch': true 
    });
    expect(useFeaturesStore.getState().hasTrakServiceFeature('trakservice.dispatch')).toBe(false);
  });
});

describe('IfFeature', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should render children when feature is enabled', () => {
    setFeatures({ 'trakservice.enabled': true });
    
    render(
      <IfFeature feature="trakservice.enabled">
        <div data-testid="content">Enabled Content</div>
      </IfFeature>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should not render children when feature is disabled', () => {
    render(
      <IfFeature feature="trakservice.enabled">
        <div data-testid="content">Enabled Content</div>
      </IfFeature>
    );

    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('should render fallback when feature is disabled', () => {
    render(
      <IfFeature 
        feature="trakservice.enabled" 
        fallback={<div data-testid="fallback">Fallback</div>}
      >
        <div data-testid="content">Enabled Content</div>
      </IfFeature>
    );

    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });
});

describe('IfTrakService', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should render when TrakService is enabled', () => {
    setFeatures({ 'trakservice.enabled': true });
    
    render(
      <IfTrakService>
        <div data-testid="trakservice">TrakService UI</div>
      </IfTrakService>
    );

    expect(screen.getByTestId('trakservice')).toBeInTheDocument();
  });

  it('should not render when TrakService is disabled', () => {
    render(
      <IfTrakService>
        <div data-testid="trakservice">TrakService UI</div>
      </IfTrakService>
    );

    expect(screen.queryByTestId('trakservice')).not.toBeInTheDocument();
  });
});

describe('IfTrakServiceFeature', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should render when base and sub-feature are enabled', () => {
    setFeatures({ 
      'trakservice.enabled': true,
      'trakservice.dispatch': true,
    });
    
    render(
      <IfTrakServiceFeature feature="dispatch">
        <div data-testid="dispatch">Dispatch UI</div>
      </IfTrakServiceFeature>
    );

    expect(screen.getByTestId('dispatch')).toBeInTheDocument();
  });

  it('should not render when only base is enabled', () => {
    setFeatures({ 'trakservice.enabled': true });
    
    render(
      <IfTrakServiceFeature feature="dispatch">
        <div data-testid="dispatch">Dispatch UI</div>
      </IfTrakServiceFeature>
    );

    expect(screen.queryByTestId('dispatch')).not.toBeInTheDocument();
  });

  it('should not render when only sub-feature is enabled', () => {
    setFeatures({ 'trakservice.dispatch': true });
    
    render(
      <IfTrakServiceFeature feature="dispatch">
        <div data-testid="dispatch">Dispatch UI</div>
      </IfTrakServiceFeature>
    );

    expect(screen.queryByTestId('dispatch')).not.toBeInTheDocument();
  });
});

describe('FeatureRouteGuard', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should render route when feature is enabled', () => {
    setFeatures({ 'trakservice.enabled': true });
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={
            <FeatureRouteGuard features="trakservice.enabled">
              <div data-testid="protected">Protected Content</div>
            </FeatureRouteGuard>
          } />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('should redirect when feature is disabled', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={
            <FeatureRouteGuard features="trakservice.enabled" redirectTo="/">
              <div data-testid="protected">Protected Content</div>
            </FeatureRouteGuard>
          } />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    expect(screen.getByTestId('home')).toBeInTheDocument();
  });

  it('should check multiple features', () => {
    setFeatures({ 
      'trakservice.enabled': true,
      // trakservice.dispatch is still false
    });
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={
            <FeatureRouteGuard 
              features={['trakservice.enabled', 'trakservice.dispatch']} 
              redirectTo="/"
            >
              <div data-testid="protected">Protected Content</div>
            </FeatureRouteGuard>
          } />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect because trakservice.dispatch is false
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    expect(screen.getByTestId('home')).toBeInTheDocument();
  });
});

describe('TrakServiceRouteGuard', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should render when TrakService is enabled', () => {
    setFeatures({ 'trakservice.enabled': true });
    
    render(
      <MemoryRouter initialEntries={['/trakservice']}>
        <Routes>
          <Route path="/trakservice" element={
            <TrakServiceRouteGuard>
              <div data-testid="trakservice">TrakService</div>
            </TrakServiceRouteGuard>
          } />
          <Route path="/cmms" element={<div data-testid="cmms">CMMS</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('trakservice')).toBeInTheDocument();
  });

  it('should redirect to /cmms when TrakService is disabled', () => {
    render(
      <MemoryRouter initialEntries={['/trakservice']}>
        <Routes>
          <Route path="/trakservice" element={
            <TrakServiceRouteGuard>
              <div data-testid="trakservice">TrakService</div>
            </TrakServiceRouteGuard>
          } />
          <Route path="/cmms" element={<div data-testid="cmms">CMMS</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('trakservice')).not.toBeInTheDocument();
    expect(screen.getByTestId('cmms')).toBeInTheDocument();
  });

  it('should check sub-features when specified', () => {
    setFeatures({ 
      'trakservice.enabled': true,
      // trakservice.dispatch is false
    });
    
    render(
      <MemoryRouter initialEntries={['/trakservice/dispatch']}>
        <Routes>
          <Route path="/trakservice/dispatch" element={
            <TrakServiceRouteGuard features={['dispatch']}>
              <div data-testid="dispatch">Dispatch</div>
            </TrakServiceRouteGuard>
          } />
          <Route path="/cmms" element={<div data-testid="cmms">CMMS</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect because dispatch is not enabled
    expect(screen.queryByTestId('dispatch')).not.toBeInTheDocument();
    expect(screen.getByTestId('cmms')).toBeInTheDocument();
  });
});
