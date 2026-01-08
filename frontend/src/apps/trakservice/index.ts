/**
 * TrakService Module Exports
 */

export { TrakServiceRoutes } from './routes';
export { trakserviceNavigation, trakserviceModuleName, trakserviceTheme } from './navigation';
export type { NavItem } from './navigation';

// Re-export pages for direct access if needed
export { TrakServiceDashboard } from './pages/Dashboard';
export { 
  DispatchPage, 
  TrackingPage, 
  RoutesPage, 
  QuotesPage, 
  TeamPage, 
  SettingsPage 
} from './pages';

// Types
export * from './types';

// Hooks
export * from './hooks';

// Services
export * from './services';
