import type { CSSProperties } from 'react';

type PriorityVariant = 'default' | 'selected';

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const PRIORITY_DOT_CLASSES: Record<PriorityVariant, Record<string, string>> = {
  default: {
    LOW: 'bg-blue-500',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
    DEFAULT: 'bg-gray-500',
  },
  selected: {
    LOW: 'bg-blue-200 border border-blue-300',
    MEDIUM: 'bg-yellow-200 border border-yellow-300',
    HIGH: 'bg-orange-200 border border-orange-300',
    CRITICAL: 'bg-red-200 border border-red-300',
    DEFAULT: 'bg-gray-200 border border-gray-300',
  },
};

const HEX_COLOR = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const FALLBACK_RGB = { r: 107, g: 114, b: 128 };
const FALLBACK_COLOR = '#6b7280';

export function getPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function getPriorityDotClass(
  priority: string,
  variant: PriorityVariant = 'default'
): string {
  const variantMap = PRIORITY_DOT_CLASSES[variant];
  return variantMap[priority] ?? variantMap.DEFAULT;
}

export function hexToRgba(hex: string, alpha: number): string {
  const result = HEX_COLOR.exec(hex);
  const rgb = result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : FALLBACK_RGB;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function buildBadgeStyle(
  color: string,
  backgroundAlpha = 0.15,
  borderAlpha = 0.3
): CSSProperties {
  const normalizedColor = HEX_COLOR.test(color)
    ? (color.startsWith('#') ? color : `#${color}`)
    : FALLBACK_COLOR;

  return {
    backgroundColor: hexToRgba(normalizedColor, backgroundAlpha),
    borderColor: hexToRgba(normalizedColor, borderAlpha),
    color: normalizedColor,
  };
}
