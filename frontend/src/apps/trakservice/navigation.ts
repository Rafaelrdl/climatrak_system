/**
 * TrakService Module Navigation Configuration
 * 
 * Defines navigation items for the TrakService (Field Service) module.
 * All items require trakservice.enabled feature to be visible.
 */

import {
  Home,
  Calendar,
  MapPin,
  Route,
  FileText,
  Users,
  Settings,
  Gauge,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  /** Additional TrakService feature required (beyond base trakservice.enabled) */
  requiresFeature?: 'dispatch' | 'tracking' | 'routing' | 'km' | 'quotes';
}

/**
 * Navigation items for TrakService module
 */
export const trakserviceNavigation: NavItem[] = [
  { name: 'Visão Geral', href: '/trakservice', icon: Home, exact: true },
  { 
    name: 'Agenda', 
    href: '/trakservice/dispatch', 
    icon: Calendar,
    requiresFeature: 'dispatch',
  },
  { 
    name: 'Rastreamento', 
    href: '/trakservice/tracking', 
    icon: MapPin,
    requiresFeature: 'tracking',
  },
  { 
    name: 'Rotas', 
    href: '/trakservice/routes', 
    icon: Route,
    requiresFeature: 'routing',
  },
  { 
    name: 'Quilometragem', 
    href: '/trakservice/mileage', 
    icon: Gauge,
    requiresFeature: 'km',
  },
  { 
    name: 'Orçamentos', 
    href: '/trakservice/quotes', 
    icon: FileText,
    requiresFeature: 'quotes',
  },
  { name: 'Equipe', href: '/trakservice/team', icon: Users },
  { name: 'Configurações', href: '/trakservice/settings', icon: Settings },
];

/**
 * Navigation items for KM/Mileage (shown inside Routes when km feature is enabled)
 * @deprecated Use main navigation with requiresFeature: 'km'
 */
export const kmSubNavigation: NavItem[] = [
  { 
    name: 'Quilometragem', 
    href: '/trakservice/mileage', 
    icon: Gauge,
    requiresFeature: 'km',
  },
];

/**
 * Module display name
 */
export const trakserviceModuleName = 'TrakService';

/**
 * Module theme colors
 */
export const trakserviceTheme = {
  primary: 'orange',
  borderColor: 'border-orange-200',
  bgColor: 'bg-orange-50',
  textColor: 'text-orange-700',
};
