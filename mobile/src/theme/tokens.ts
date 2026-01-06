/**
 * Design Tokens - ClimaTrak Mobile
 *
 * Tokens alinhados com DESIGN_SYSTEM.md - Platform-First Design
 * Otimizado para uso contínuo, densidade informacional e acessibilidade.
 *
 * @see docs/design/DESIGN_SYSTEM.md para referência completa
 * @version 2.0.0 - Atualizado conforme padrões de plataforma
 */

/**
 * Paleta de cores semânticas - Platform Mode
 * Cores profissionais otimizadas para uso prolongado (8+ horas/dia)
 */
export const colors = {
  // Cores de fundo - Reduzido contraste para fadiga visual
  background: '#f8fafc',
  foreground: '#0f172a',

  // Cards e superfícies - Elevação sutil
  card: '#ffffff',
  cardForeground: '#0f172a',
  cardBorder: '#e2e8f0', // Borda sutil para definição

  // Primary (Blue) - Ações principais, links, CTAs
  primary: {
    DEFAULT: '#2563eb',
    light: '#3b82f6',
    dark: '#1d4ed8',
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
    DEFAULT: '#64748b',
    light: '#94a3b8',
    dark: '#475569',
    foreground: '#ffffff',
    background: '#f1f5f9',
  },

  // Muted - Texto e elementos desabilitados
  muted: {
    DEFAULT: '#f1f5f9',
    foreground: '#64748b',
  },

  // Accent (Purple) - Destaque especial conforme Design System
  accent: {
    DEFAULT: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    foreground: '#ffffff',
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    500: '#8b5cf6',
  },

  // Success - Confirmações, ações positivas
  success: {
    DEFAULT: '#10b981',
    light: '#34d399',
    dark: '#059669',
    foreground: '#ffffff',
    background: '#ecfdf5',
  },

  // Warning - Atenção necessária
  warning: {
    DEFAULT: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    foreground: '#ffffff',
    background: '#fffbeb',
  },

  // Destructive - Erros, ações perigosas
  destructive: {
    DEFAULT: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    foreground: '#ffffff',
    background: '#fef2f2',
  },

  // Borders - Hierarquia visual
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderStrong: '#cbd5e1',
  input: '#e2e8f0',
  ring: '#2563eb',
  ringOffset: '#ffffff',

  // Neutral (Slate) - Escala completa para UI
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

  // Status colors (operacional) - Conforme Design System 4.1
  status: {
    online: '#10b981',      // Alterado para consistência
    onlineLight: '#dcfce7',
    onlineBg: 'rgba(16, 185, 129, 0.1)',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    warningBg: 'rgba(245, 158, 11, 0.1)',
    critical: '#ef4444',
    criticalLight: '#fee2e2',
    criticalBg: 'rgba(239, 68, 68, 0.1)',
    offline: '#6b7280',     // Alterado para consistência
    offlineLight: '#f3f4f6',
    offlineBg: 'rgba(107, 114, 128, 0.1)',
    info: '#3b82f6',
    infoLight: '#dbeafe',
    infoBg: 'rgba(59, 130, 246, 0.1)',
    maintenance: '#8b5cf6',  // Novo - manutenção programada
    maintenanceLight: '#ede9fe',
    maintenanceBg: 'rgba(139, 92, 246, 0.1)',
  },

  // Alert severity colors - Platform Design System
  alert: {
    critical: '#ef4444',
    criticalBg: 'rgba(239, 68, 68, 0.1)',
    warning: '#f59e0b',
    warningBg: 'rgba(245, 158, 11, 0.1)',
    info: '#3b82f6',
    infoBg: 'rgba(59, 130, 246, 0.1)',
  },

  // Work Order status colors - Semântica operacional
  workOrder: {
    open: '#3b82f6',
    openBg: 'rgba(59, 130, 246, 0.1)',
    openBorder: '#93c5fd',
    inProgress: '#f59e0b',
    inProgressBg: 'rgba(245, 158, 11, 0.1)',
    inProgressBorder: '#fcd34d',
    completed: '#10b981',
    completedBg: 'rgba(16, 185, 129, 0.1)',
    completedBorder: '#6ee7b7',
    cancelled: '#6b7280',
    cancelledBg: 'rgba(107, 114, 128, 0.1)',
    cancelledBorder: '#d1d5db',
    onHold: '#8b5cf6',
    onHoldBg: 'rgba(139, 92, 246, 0.1)',
    onHoldBorder: '#c4b5fd',
  },

  // Priority colors - Hierarquia visual clara
  priority: {
    low: '#10b981',
    lowBg: 'rgba(16, 185, 129, 0.1)',
    lowBorder: '#6ee7b7',
    medium: '#f59e0b',
    mediumBg: 'rgba(245, 158, 11, 0.1)',
    mediumBorder: '#fcd34d',
    high: '#f97316',
    highBg: 'rgba(249, 115, 22, 0.1)',
    highBorder: '#fdba74',
    critical: '#ef4444',
    criticalBg: 'rgba(239, 68, 68, 0.1)',
    criticalBorder: '#fca5a5',
  },

  // Overlay - Modais e drawers
  overlay: 'rgba(15, 23, 42, 0.6)',
  overlayLight: 'rgba(15, 23, 42, 0.4)',

  // Transparent
  transparent: 'transparent',

  // Pure colors
  white: '#ffffff',
  black: '#000000',
} as const;

/**
 * Espaçamento - Platform Design
 * Escala 4px para densidade informacional otimizada
 */
export const spacing = {
  0: 0,
  px: 1,
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
 * Tipografia - Platform Design
 * Otimizada para leitura prolongada conforme Design System 4.2
 */
export const typography = {
  // Font families - UI e dados
  fonts: {
    sans: 'Inter',        // --font-ui
    mono: 'RobotoMono',   // --font-data (valores numéricos)
    display: 'Inter',     // --font-display (títulos)
  },

  // Font sizes - Densidade otimizada
  sizes: {
    '2xs': 10,   // Micro labels
    xs: 11,      // --text-xs - badges, labels
    sm: 13,      // --text-sm - dados secundários
    base: 14,    // --text-base - texto padrão (14px como base)
    md: 15,      // Intermediário
    lg: 16,      // --text-lg - títulos de seção
    xl: 18,      // --text-xl - headers
    '2xl': 20,   // Títulos principais
    '3xl': 24,   // Hero text
    '4xl': 30,   // Display
    '5xl': 36,   // Display large
  },

  // Line heights - Otimizado para legibilidade
  lineHeights: {
    none: 1,
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
    extrabold: '800' as const,
  },

  // Letter spacing
  tracking: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
    widest: 1,
  },
} as const;

/**
 * Border Radius - Platform Design
 * Cantos mais sutis para aparência profissional
 */
export const radius = {
  none: 0,
  xs: 2,
  sm: 4,
  DEFAULT: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

/**
 * Sombras - Platform Design
 * Sombras sutis para hierarquia visual profissional
 */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  DEFAULT: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  '2xl': {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  // Sombra interna para inputs focados
  inner: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 0,
  },
} as const;

/**
 * Tamanhos de ícones - Escala consistente
 */
export const iconSizes = {
  '2xs': 10,
  xs: 12,
  sm: 16,
  md: 20,
  DEFAULT: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

/**
 * Tamanhos de componentes - Platform Design
 * Touch targets otimizados para acessibilidade (mínimo 44px)
 */
export const componentSizes = {
  // Button heights - Escala de 8px
  buttonHeight: {
    xs: 28,
    sm: 32,
    md: 40,
    lg: 44,
    xl: 48,
  },
  
  // Input heights
  inputHeight: {
    sm: 32,
    md: 40,
    lg: 44,
  },
  
  // Badge/chip sizes
  badgeHeight: {
    sm: 20,
    md: 24,
    lg: 28,
  },

  // Touch targets - Acessibilidade
  touchTarget: {
    min: 44,     // Mínimo WCAG
    comfortable: 48,
    spacious: 56,
  },

  // Avatar sizes
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
  },
  
  // Header/navbar heights
  header: {
    mobile: 56,
    tablet: 64,
  },
  
  // Tab bar height
  tabBar: 56,
} as const;

/**
 * Transições/Animações - Platform Design 8.1
 * Durações otimizadas para feedback instantâneo
 */
export const transitions = {
  instant: 50,    // --transition-instant: Hover em botões
  fast: 150,      // --transition-fast: Mudanças de estado
  normal: 250,    // --transition-normal: Animações padrão
  smooth: 350,    // --transition-smooth: Modais, painéis
  slow: 500,      // Transições de página
} as const;

/**
 * Curvas de animação (Easing)
 */
export const easing = {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  // Custom springs para React Native Animated
  spring: {
    gentle: { tension: 120, friction: 14 },
    wobbly: { tension: 180, friction: 12 },
    stiff: { tension: 210, friction: 20 },
    slow: { tension: 280, friction: 60 },
  },
} as const;

/**
 * Z-Index layers - Hierarquia de sobreposição
 */
export const zIndex = {
  hide: -1,
  base: 0,
  raised: 1,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modalBackdrop: 50,
  modal: 60,
  popover: 70,
  tooltip: 80,
  toast: 90,
  max: 9999,
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
