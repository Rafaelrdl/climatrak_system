/**
 * TrakService Module Routes
 * 
 * Routes for the TrakService (Field Service) module.
 * Protected by TrakServiceRouteGuard.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { TrakServiceRouteGuard } from '@/components/auth/FeatureGate';

// Placeholder pages (to be implemented)
import { TrakServiceDashboard } from './pages/Dashboard';
import { 
  DispatchPage, 
  TrackingPage, 
  RoutesPage, 
  QuotesPage, 
  TeamPage, 
  SettingsPage 
} from './pages';

export function TrakServiceRoutes() {
  return (
    <TrakServiceRouteGuard>
      <Routes>
        {/* Dashboard */}
        <Route index element={<TrakServiceDashboard />} />
        
        {/* Dispatch/Scheduling - requires dispatch feature */}
        <Route path="dispatch/*" element={
          <TrakServiceRouteGuard features={['dispatch']}>
            <DispatchPage />
          </TrakServiceRouteGuard>
        } />
        
        {/* Tracking - requires tracking feature */}
        <Route path="tracking/*" element={
          <TrakServiceRouteGuard features={['tracking']}>
            <TrackingPage />
          </TrakServiceRouteGuard>
        } />
        
        {/* Routes/Routing - requires routing feature */}
        <Route path="routes/*" element={
          <TrakServiceRouteGuard features={['routing']}>
            <RoutesPage />
          </TrakServiceRouteGuard>
        } />
        
        {/* Quotes - requires quotes feature */}
        <Route path="quotes/*" element={
          <TrakServiceRouteGuard features={['quotes']}>
            <QuotesPage />
          </TrakServiceRouteGuard>
        } />
        
        {/* Team management - no additional feature required */}
        <Route path="team/*" element={<TeamPage />} />
        
        {/* Settings - no additional feature required */}
        <Route path="settings/*" element={<SettingsPage />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/trakservice" replace />} />
      </Routes>
    </TrakServiceRouteGuard>
  );
}
