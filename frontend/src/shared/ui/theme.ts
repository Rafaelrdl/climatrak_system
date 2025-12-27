/**
 * TrakSense Platform - Design System Tokens
 * 
 * Este arquivo define os tokens de design da plataforma unificada.
 * Usado por todos os módulos (CMMS e Monitor).
 * 
 * As cores usam OKLCH para melhor consistência perceptual.
 * Os valores base estão definidos em src/index.css como variáveis CSS.
 */

// ============================================================================
// CORES
// ============================================================================

export const colors = {
  // Cores primárias (Azul TrakNor)
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
    50: 'oklch(0.97 0.02 200)',
    100: 'oklch(0.93 0.04 200)',
    200: 'oklch(0.85 0.08 200)',
    300: 'oklch(0.75 0.12 200)',
    400: 'oklch(0.60 0.14 200)',
    500: 'oklch(0.45 0.15 200)', // Primary default
    600: 'oklch(0.38 0.14 200)',
    700: 'oklch(0.32 0.12 200)',
    800: 'oklch(0.26 0.10 200)',
    900: 'oklch(0.20 0.08 200)',
  },

  // Cores secundárias
  secondary: {
    DEFAULT: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
  },

  // Cores de estado
  success: {
    DEFAULT: 'oklch(0.65 0.2 145)',
    foreground: 'oklch(0.98 0 0)',
    light: 'oklch(0.92 0.05 145)',
    dark: 'oklch(0.45 0.15 145)',
  },

  warning: {
    DEFAULT: 'oklch(0.75 0.18 85)',
    foreground: 'oklch(0.20 0.05 85)',
    light: 'oklch(0.95 0.06 85)',
    dark: 'oklch(0.55 0.15 85)',
  },

  error: {
    DEFAULT: 'oklch(0.65 0.22 25)',
    foreground: 'oklch(0.98 0 0)',
    light: 'oklch(0.92 0.05 25)',
    dark: 'oklch(0.45 0.18 25)',
  },

  info: {
    DEFAULT: 'oklch(0.60 0.15 240)',
    foreground: 'oklch(0.98 0 0)',
    light: 'oklch(0.92 0.04 240)',
    dark: 'oklch(0.40 0.12 240)',
  },

  // Cores neutras
  neutral: {
    50: 'oklch(0.98 0.01 200)',
    100: 'oklch(0.96 0.01 200)',
    200: 'oklch(0.92 0.01 200)',
    300: 'oklch(0.87 0.01 200)',
    400: 'oklch(0.70 0.02 200)',
    500: 'oklch(0.55 0.02 200)',
    600: 'oklch(0.45 0.02 200)',
    700: 'oklch(0.35 0.02 200)',
    800: 'oklch(0.25 0.02 200)',
    900: 'oklch(0.15 0.02 200)',
  },

  // Cores semânticas (mapeadas para variáveis CSS)
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: 'hsl(var(--card))',
  cardForeground: 'hsl(var(--card-foreground))',
  popover: 'hsl(var(--popover))',
  popoverForeground: 'hsl(var(--popover-foreground))',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
  accent: 'hsl(var(--accent))',
  accentForeground: 'hsl(var(--accent-foreground))',
  destructive: 'hsl(var(--destructive))',
  destructiveForeground: 'hsl(var(--destructive-foreground))',
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
} as const;

// ============================================================================
// TIPOGRAFIA
// ============================================================================

export const typography = {
  // Font families
  fontFamily: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    serif: ['Noto Serif', 'ui-serif', 'Georgia', 'serif'],
    mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  },

  // Font sizes com line-height e letter-spacing
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
    sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
    base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
    lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.005em' }],
    xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
    '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],
    '5xl': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.03em' }],
  },

  // Font weights
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

// ============================================================================
// ESPAÇAMENTOS
// ============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================================================
// BORDAS E RADIUS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: 'calc(var(--radius) * 0.5)',   // 4px
  DEFAULT: 'var(--radius)',           // 8px
  md: 'var(--radius)',                // 8px
  lg: 'calc(var(--radius) * 1.5)',   // 12px
  xl: 'calc(var(--radius) * 2)',     // 16px
  '2xl': 'calc(var(--radius) * 3)',  // 24px
  '3xl': 'calc(var(--radius) * 4)',  // 32px
  full: '9999px',
} as const;

export const borderWidth = {
  DEFAULT: '1px',
  0: '0',
  2: '2px',
  4: '4px',
  8: '8px',
} as const;

// ============================================================================
// SOMBRAS
// ============================================================================

export const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

// ============================================================================
// ANIMAÇÕES
// ============================================================================

export const animation = {
  // Durations
  duration: {
    fastest: '50ms',
    faster: '100ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    slowest: '500ms',
  },

  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Spring-like
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// Z-INDEX
// ============================================================================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// ============================================================================
// TEMA COMPLETO
// ============================================================================

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  borderWidth,
  boxShadow,
  animation,
  breakpoints,
  zIndex,
} as const;

export type Theme = typeof theme;
export default theme;
