/**
 * StatCard Component - Platform Design System
 *
 * Card otimizado para exibição de métricas e KPIs.
 * Design denso para dashboards operacionais.
 * 
 * @see docs/design/DESIGN_SYSTEM.md - Seção 5.1 Widgets
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../theme/tokens';

export type StatTrend = 'up' | 'down' | 'neutral';
export type StatVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

interface StatCardProps {
  /** Título/label da métrica */
  title: string;
  /** Valor principal */
  value: string | number;
  /** Ícone (opcional) */
  icon?: React.ReactNode;
  /** Texto de variação/trend */
  trend?: string;
  /** Direção do trend */
  trendDirection?: StatTrend;
  /** Descrição adicional */
  description?: string;
  /** Variante de cor */
  variant?: StatVariant;
  /** Card compacto */
  compact?: boolean;
  /** Ação ao pressionar */
  onPress?: () => void;
  /** Estilos customizados */
  style?: ViewStyle;
}

// Cores por variante
const getVariantColors = (variant: StatVariant) => {
  const variants = {
    default: {
      icon: colors.neutral[400],
      value: colors.foreground,
      accent: colors.primary.DEFAULT,
    },
    primary: {
      icon: colors.primary.DEFAULT,
      value: colors.primary.DEFAULT,
      accent: colors.primary.light,
    },
    success: {
      icon: colors.success.DEFAULT,
      value: colors.success.dark,
      accent: colors.success.light,
    },
    warning: {
      icon: colors.warning.DEFAULT,
      value: colors.warning.dark,
      accent: colors.warning.light,
    },
    danger: {
      icon: colors.destructive.DEFAULT,
      value: colors.destructive.dark,
      accent: colors.destructive.light,
    },
  };
  return variants[variant];
};

// Cores de trend
const getTrendColor = (direction: StatTrend) => {
  const trendColors = {
    up: colors.success.DEFAULT,
    down: colors.destructive.DEFAULT,
    neutral: colors.neutral[500],
  };
  return trendColors[direction];
};

/**
 * StatCard - Card de métrica/KPI
 *
 * @example
 * // Métrica simples
 * <StatCard title="Pendentes" value={12} />
 *
 * @example
 * // Com trend e ícone
 * <StatCard
 *   title="Alertas Ativos"
 *   value={5}
 *   icon={<AlertTriangle />}
 *   trend="+2 hoje"
 *   trendDirection="up"
 *   variant="warning"
 * />
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendDirection = 'neutral',
  description,
  variant = 'default',
  compact = false,
  onPress,
  style,
}) => {
  const variantColors = getVariantColors(variant);

  const content = (
    <>
      {/* Header com ícone */}
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${variantColors.icon}15` }]}>
            {React.cloneElement(icon as React.ReactElement, {
              size: compact ? 16 : 20,
              color: variantColors.icon,
            })}
          </View>
        )}
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Valor principal */}
      <Text 
        style={[
          styles.value, 
          compact && styles.valueCompact,
          { color: variantColors.value },
        ]}
      >
        {value}
      </Text>

      {/* Trend e descrição */}
      {(trend || description) && (
        <View style={styles.footer}>
          {trend && (
            <Text style={[styles.trend, { color: getTrendColor(trendDirection) }]}>
              {trend}
            </Text>
          )}
          {description && (
            <Text style={styles.description} numberOfLines={1}>
              {description}
            </Text>
          )}
        </View>
      )}
    </>
  );

  const containerStyle = [
    styles.container,
    compact && styles.containerCompact,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...containerStyle,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{content}</View>;
};

/**
 * StatRow - Container para múltiplos StatCards em linha
 */
export const StatRow: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ 
  children, 
  style 
}) => (
  <View style={[styles.row, style]}>{children}</View>
);

const styles = StyleSheet.create({
  // === CONTAINER ===
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    ...shadows.sm,
  },

  containerCompact: {
    padding: spacing[3],
  },

  pressed: {
    backgroundColor: colors.neutral[50],
    transform: [{ scale: 0.98 }],
  },

  // === HEADER ===
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },

  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    color: colors.muted.foreground,
    letterSpacing: typography.tracking.tight,
  },

  titleCompact: {
    fontSize: typography.sizes.xs,
  },

  // === VALUE ===
  value: {
    fontSize: typography.sizes['3xl'],
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.tracking.tight,
    marginBottom: spacing[1],
  },

  valueCompact: {
    fontSize: typography.sizes['2xl'],
  },

  // === FOOTER ===
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },

  trend: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
  },

  description: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.normal,
    color: colors.muted.foreground,
  },

  // === ROW CONTAINER ===
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
});

export default StatCard;
