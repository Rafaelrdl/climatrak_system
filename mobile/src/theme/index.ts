// ============================================================
// ClimaTrak Mobile - Theme Configuration
// Design tokens matching the web frontend Design System
// ============================================================

import { Platform, ViewStyle } from 'react-native';

export const colors = {
  // Primary
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Neutral (Slate)
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  
  // Semantic - Status
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  
  // Asset/Equipment Status
  status: {
    online: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
    offline: '#64748b',
  },
  
  // Background
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
  },
  
  // Dark mode background
  backgroundDark: {
    primary: '#0f172a',
    secondary: '#1e293b',
    tertiary: '#334155',
  },
  
  // Text
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
  },
  
  textDark: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    tertiary: '#64748b',
    inverse: '#0f172a',
  },
  
  // Border
  border: {
    light: '#e2e8f0',
    medium: '#cbd5e1',
    dark: '#94a3b8',
  },
  
  borderDark: {
    light: '#334155',
    medium: '#475569',
    dark: '#64748b',
  },
} as const;

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;

export const typography = {
  // Font families (using system fonts)
  fontFamily: {
    sans: 'System',
    mono: 'Courier',
  },
  
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

// Cross-platform shadows (web uses boxShadow, native uses shadow* props)
const createShadow = (
  offsetY: number, 
  blur: number, 
  opacity: number, 
  elevation: number
): ViewStyle => {
  if (Platform.OS === 'web') {
    return {
      // @ts-expect-error - boxShadow is valid on web
      boxShadow: `0px ${offsetY}px ${blur}px rgba(0, 0, 0, ${opacity})`,
    };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  };
};

export const shadows = {
  sm: createShadow(1, 2, 0.05, 1),
  md: createShadow(2, 4, 0.1, 3),
  lg: createShadow(4, 8, 0.15, 5),
  xl: createShadow(8, 16, 0.2, 8),
} as const;

// Priority colors
export const priorityColors = {
  LOW: colors.neutral[500],
  MEDIUM: colors.info[500],
  HIGH: colors.warning[500],
  CRITICAL: colors.danger[500],
} as const;

// Status colors (Work Order)
export const workOrderStatusColors = {
  OPEN: colors.info[500],
  IN_PROGRESS: colors.warning[500],
  ON_HOLD: colors.neutral[500],
  COMPLETED: colors.success[500],
  CANCELLED: colors.danger[500],
  PENDING_REVIEW: colors.warning[600],
} as const;

// Asset status colors
export const assetStatusColors = {
  OK: colors.success[500],
  MAINTENANCE: colors.warning[500],
  STOPPED: colors.neutral[500],
  ALERT: colors.danger[500],
} as const;

// Alert severity colors
export const alertSeverityColors = {
  INFO: colors.info[500],
  WARNING: colors.warning[500],
  CRITICAL: colors.danger[500],
} as const;

// Theme object for useTheme hook
export const lightTheme = {
  colors: {
    primary: colors.primary[600],
    primaryLight: colors.primary[100],
    background: colors.background.primary,
    backgroundSecondary: colors.background.secondary,
    backgroundTertiary: colors.background.tertiary,
    text: colors.text.primary,
    textSecondary: colors.text.secondary,
    textTertiary: colors.text.tertiary,
    textInverse: colors.text.inverse,
    border: colors.border.light,
    borderMedium: colors.border.medium,
    success: colors.success[500],
    warning: colors.warning[500],
    danger: colors.danger[500],
    info: colors.info[500],
    card: colors.background.primary,
    notification: colors.danger[500],
  },
  spacing,
  typography,
  borderRadius,
  shadows,
} as const;

export const darkTheme = {
  colors: {
    primary: colors.primary[500],
    primaryLight: colors.primary[900],
    background: colors.backgroundDark.primary,
    backgroundSecondary: colors.backgroundDark.secondary,
    backgroundTertiary: colors.backgroundDark.tertiary,
    text: colors.textDark.primary,
    textSecondary: colors.textDark.secondary,
    textTertiary: colors.textDark.tertiary,
    textInverse: colors.textDark.inverse,
    border: colors.borderDark.light,
    borderMedium: colors.borderDark.medium,
    success: colors.success[500],
    warning: colors.warning[500],
    danger: colors.danger[500],
    info: colors.info[500],
    card: colors.backgroundDark.secondary,
    notification: colors.danger[500],
  },
  spacing,
  typography,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof lightTheme;

// Default theme export for easy imports
// This is the unified theme object used across the app
export const theme = {
  colors: {
    ...colors,
    // Semantic shortcuts for ease of use
    primary: colors.primary,
    neutral: colors.neutral,
    white: '#ffffff',
    black: '#000000',
    semantic: {
      success: colors.success[500],
      warning: colors.warning[500],
      error: colors.danger[500],
      info: colors.info[500],
    },
    alert: {
      // UPPERCASE keys to match AlertSeverity type
      CRITICAL: colors.danger[500],
      HIGH: colors.danger[400],
      MEDIUM: colors.warning[500],
      WARNING: colors.warning[500],
      LOW: colors.info[500],
      INFO: colors.neutral[500],
      // Also provide lowercase for backwards compatibility
      critical: colors.danger[500],
      high: colors.danger[400],
      medium: colors.warning[500],
      warning: colors.warning[500],
      low: colors.info[500],
      info: colors.neutral[500],
    },
    // WorkOrder status colors (UPPERCASE to match types)
    workOrder: {
      OPEN: colors.info[500],
      IN_PROGRESS: colors.warning[500],
      ON_HOLD: colors.neutral[500],
      COMPLETED: colors.success[500],
      CANCELLED: colors.danger[500],
      PENDING_REVIEW: colors.warning[600],
    },
    // Asset status colors (UPPERCASE to match types)
    asset: {
      OK: colors.success[500],
      MAINTENANCE: colors.warning[500],
      STOPPED: colors.neutral[500],
      ALERT: colors.danger[500],
    },
    // Priority colors (UPPERCASE to match types)
    priority: {
      LOW: colors.neutral[500],
      MEDIUM: colors.info[500],
      HIGH: colors.warning[500],
      CRITICAL: colors.danger[500],
    },
    // Criticality colors (UPPERCASE to match types, matches Portuguese)
    criticality: {
      BAIXA: colors.neutral[500],
      MEDIA: colors.info[500],
      ALTA: colors.warning[500],
      CRITICA: colors.danger[500],
    },
    status: colors.status,
    background: colors.background,
    text: colors.text,
    border: colors.border,
  },
  spacing,
  typography,
  borderRadius,
  shadows,
  priority: priorityColors,
  workOrderStatus: workOrderStatusColors,
  assetStatus: assetStatusColors,
  alertSeverity: alertSeverityColors,
} as const;
