/**
 * Badge Component
 *
 * Componente para labels, status e contadores.
 * @see frontend/src/components/ui/badge.tsx
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme/tokens';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

export interface BadgeProps {
  /** Texto do badge */
  children: React.ReactNode;
  /** Variante visual */
  variant?: BadgeVariant;
  /** Ícone à esquerda */
  icon?: React.ReactNode;
  /** Tamanho */
  size?: 'sm' | 'md';
  /** Estilo customizado do container */
  style?: ViewStyle;
  /** Estilo customizado do texto */
  textStyle?: TextStyle;
}

/**
 * Badge para status, labels e contadores
 *
 * @example
 * // Default badge
 * <Badge>Novo</Badge>
 *
 * @example
 * // Status badge
 * <Badge variant="success" icon={<CheckIcon />}>
 *   Ativo
 * </Badge>
 *
 * @example
 * // Warning badge
 * <Badge variant="warning">Pendente</Badge>
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  icon,
  size = 'md',
  style,
  textStyle,
}) => {
  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    textStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <View style={containerStyles}>
      {icon}
      <Text style={textStyles} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Base
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
    borderRadius: radius.full,
  },

  // Variants
  variant_default: {
    backgroundColor: colors.primary.DEFAULT,
  },
  variant_secondary: {
    backgroundColor: colors.secondary.DEFAULT,
  },
  variant_destructive: {
    backgroundColor: colors.destructive.DEFAULT,
  },
  variant_outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variant_success: {
    backgroundColor: colors.status.onlineLight,
  },
  variant_warning: {
    backgroundColor: colors.status.warningLight,
  },

  // Sizes
  size_sm: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
  },
  size_md: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },

  // Text
  text: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
  },
  text_default: {
    color: colors.primary.foreground,
  },
  text_secondary: {
    color: colors.secondary.foreground,
  },
  text_destructive: {
    color: colors.destructive.foreground,
  },
  text_outline: {
    color: colors.foreground,
  },
  text_success: {
    color: colors.status.online,
  },
  text_warning: {
    color: colors.status.warning,
  },

  // Text sizes
  textSize_sm: {
    fontSize: typography.sizes.xs,
  },
  textSize_md: {
    fontSize: typography.sizes.sm,
  },
});

export default Badge;
