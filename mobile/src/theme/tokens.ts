/**
 * Design Tokens - ClimaTrak Mobile
 *
 * Tokens extraídos do design system web (frontend/src/index.css)
 * para garantir consistência visual entre plataformas.
 *
 * @see DESIGN_SNAPSHOT.md para referência completa
 */

/**
 * Paleta de cores semânticas
 * Equivalentes aos CSS variables do web (oklch → hex)
 */
export const colors = {
  // Cores de fundo
  background: '#f8fafc',
  foreground: '#0f172a',

  // Cards e superfícies
  card: '#ffffff',
  cardForeground: '#0f172a',

  // Primary (Blue) - Ações principais, links
  primary: {
    DEFAULT: '#2563eb',
    foreground: '#ffffff',
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

  // Secondary - Elementos de suporte
  secondary: {
    DEFAULT: '#f1f5f9',
    foreground: '#1e293b',
  },

  // Muted - Texto e elementos desabilitados
  muted: {
    DEFAULT: '#f1f5f9',
    foreground: '#64748b',
  },

  // Accent - Destaque, badges
  accent: {
    DEFAULT: '#f59e0b',
    foreground: '#ffffff',
  },

  // Destructive - Erros, ações perigosas
  destructive: {
    DEFAULT: '#ef4444',
    foreground: '#ffffff',
  },

  // Borders
  border: '#e2e8f0',
  input: '#e2e8f0',
  ring: '#2563eb',

  // Neutral (Slate) - Escala completa
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

  // Status colors (operacional)
  status: {
    online: '#22c55e',
    onlineLight: '#dcfce7',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    critical: '#ef4444',
    criticalLight: '#fee2e2',
    offline: '#64748b',
    offlineLight: '#f1f5f9',
    info: '#3b82f6',
    infoLight: '#dbeafe',
  },

  // Work Order status colors
  workOrder: {
    open: '#3b82f6',
    openBg: '#dbeafe',
    inProgress: '#f59e0b',
    inProgressBg: '#fef3c7',
    completed: '#22c55e',
    completedBg: '#dcfce7',
    cancelled: '#64748b',
    cancelledBg: '#f1f5f9',
  },

  // Priority colors
  priority: {
    low: '#22c55e',
    lowBg: '#dcfce7',
    medium: '#f59e0b',
    mediumBg: '#fef3c7',
    high: '#f97316',
    highBg: '#ffedd5',
    critical: '#ef4444',
    criticalBg: '#fee2e2',
  },

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Transparent
  transparent: 'transparent',

  // Pure colors
  white: '#ffffff',
  black: '#000000',
} as const;

/**
 * Espaçamento
 * Escala consistente para padding, margin, gaps
 */
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
} as const;

/**
 * Tipografia
 * Fontes e tamanhos do design system
 */
export const typography = {
  // Font families
  fonts: {
    sans: 'Inter',
    mono: 'RobotoMono',
  },

  // Font sizes
  sizes: {
    xs: 11,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 30,
    '5xl': 36,
  },

  // Line heights
  lineHeights: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Font weights
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Letter spacing
  tracking: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  },
} as const;

/**
 * Border Radius
 * Equivalente aos tokens Tailwind
 */
export const radius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

/**
 * Sombras (React Native elevation + shadow)
 */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

/**
 * Tamanhos de ícones
 */
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
} as const;

/**
 * Tamanhos de componentes
 */
export const componentSizes = {
  // Heights
  buttonHeight: {
    sm: 32,
    md: 36,
    lg: 40,
  },
  inputHeight: 36,
  badgeHeight: 24,

  // Touch targets (mínimo 44px para acessibilidade)
  touchTarget: 44,

  // Avatar
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  },
} as const;

/**
 * Transições/Animações
 */
export const transitions = {
  instant: 50,
  fast: 150,
  normal: 250,
  smooth: 350,
} as const;

/**
 * Z-Index layers
 */
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
} as const;

/**
 * Breakpoints (para responsividade em tablets)
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/**
 * Token types para TypeScript
 */
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
export type Radius = typeof radius;
export type Shadows = typeof shadows;
export type IconSizes = typeof iconSizes;
export type ComponentSizes = typeof componentSizes;
export type Transitions = typeof transitions;
export type ZIndex = typeof zIndex;
export type Breakpoints = typeof breakpoints;

/**
 * Theme object consolidado
 */
export const tokens = {
  colors,
  spacing,
  typography,
  radius,
  shadows,
  iconSizes,
  componentSizes,
  transitions,
  zIndex,
  breakpoints,
} as const;

export type Tokens = typeof tokens;

export default tokens;
