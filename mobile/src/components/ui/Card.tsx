/**
 * Card Component - Platform Design System
 *
 * Container para conteúdo com hierarquia visual profissional.
 * Suporta variantes, estados interativos e densidade configurável.
 * 
 * @see docs/design/DESIGN_SYSTEM.md - Seção 5.1 Widgets
 * @see frontend/src/components/ui/card.tsx
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Pressable } from 'react-native';
import { colors, spacing, radius, shadows, typography } from '../../theme/tokens';

// Variantes de Card
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'interactive';

// Props com melhorias
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Variante visual do card */
  variant?: CardVariant;
  /** Padding interno (compact para densidade alta) */
  padding?: 'none' | 'compact' | 'default' | 'spacious';
  /** Card clicável */
  onPress?: () => void;
  /** Desabilitar interação */
  disabled?: boolean;
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Header com row layout (título + ação) */
  row?: boolean;
}

interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
  /** Tamanho do título */
  size?: 'sm' | 'md' | 'lg';
}

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Padding compacto para densidade */
  compact?: boolean;
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Alinhamento do footer */
  align?: 'start' | 'center' | 'end' | 'between';
}

// Mapeamento de padding
const paddingMap = {
  none: 0,
  compact: spacing[3],
  default: spacing[4],
  spacious: spacing[6],
};

/**
 * Card container principal - Platform Design
 *
 * @example
 * // Card padrão
 * <Card>
 *   <CardContent>Conteúdo</CardContent>
 * </Card>
 *
 * @example
 * // Card interativo
 * <Card variant="interactive" onPress={handlePress}>
 *   <CardHeader row>
 *     <CardTitle>Título</CardTitle>
 *     <ChevronRight />
 *   </CardHeader>
 * </Card>
 */
export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  variant = 'default',
  padding = 'default',
  onPress,
  disabled = false,
}) => {
  // Mapeamento de variantes para estilos
  const variantStyles: Record<CardVariant, ViewStyle> = {
    default: styles.variant_default,
    elevated: styles.variant_elevated,
    outlined: styles.variant_outlined,
    filled: styles.variant_filled,
    interactive: styles.variant_interactive,
  };

  const baseCardStyles: ViewStyle[] = [
    styles.card,
    variantStyles[variant],
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  // Card interativo (Pressable)
  if (onPress || variant === 'interactive') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          ...baseCardStyles,
          pressed && styles.cardPressed,
          disabled && styles.cardDisabled,
        ] as ViewStyle[]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={baseCardStyles}>{children}</View>;
};

/**
 * Header do Card - Suporta layout em row
 */
export const CardHeader: React.FC<CardHeaderProps> = ({ children, style, row = false }) => (
  <View style={[styles.header, row && styles.headerRow, style]}>{children}</View>
);

/**
 * Título do Card - Com tamanhos configuráveis
 */
export const CardTitle: React.FC<CardTitleProps> = ({ children, style, size = 'md' }) => {
  const sizeStyles: Record<'sm' | 'md' | 'lg', TextStyle> = {
    sm: styles.title_sm,
    md: styles.title_md,
    lg: styles.title_lg,
  };
  
  return (
    <Text style={[styles.title, sizeStyles[size], style]}>
      {children}
    </Text>
  );
};

/**
 * Descrição do Card
 */
export const CardDescription: React.FC<CardDescriptionProps> = ({ children, style }) => (
  <Text style={[styles.description, style]}>{children}</Text>
);

/**
 * Conteúdo principal do Card
 */
export const CardContent: React.FC<CardContentProps> = ({ children, style, compact = false }) => (
  <View style={[styles.content, compact && styles.contentCompact, style]}>{children}</View>
);

/**
 * Footer do Card - Com alinhamento flexível
 */
export const CardFooter: React.FC<CardFooterProps> = ({ children, style, align = 'end' }) => {
  const alignStyles: Record<'start' | 'center' | 'end' | 'between', ViewStyle> = {
    start: styles.footer_start,
    center: styles.footer_center,
    end: styles.footer_end,
    between: styles.footer_between,
  };
  
  return (
    <View style={[styles.footer, alignStyles[align], style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  // === BASE CARD ===
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
  } as ViewStyle,

  // === VARIANTES ===
  
  // Default - Borda sutil + sombra leve
  variant_default: {
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },

  // Elevated - Mais destaque visual
  variant_elevated: {
    borderWidth: 0,
    ...shadows.md,
  },

  // Outlined - Apenas borda
  variant_outlined: {
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.none,
  },

  // Filled - Background preenchido
  variant_filled: {
    backgroundColor: colors.neutral[50],
    borderWidth: 0,
    ...shadows.none,
  },

  // Interactive - Para cards clicáveis
  variant_interactive: {
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },

  // Estado pressed
  cardPressed: {
    backgroundColor: colors.neutral[50],
    transform: [{ scale: 0.99 }],
  },

  // Estado disabled
  cardDisabled: {
    opacity: 0.6,
  },

  // === HEADER ===
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[1],
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // === TITLE ===
  title: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    color: colors.cardForeground,
    letterSpacing: typography.tracking.tight,
  },

  title_sm: {
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.tight,
  },

  title_md: {
    fontSize: typography.sizes.lg,
    lineHeight: typography.sizes.lg * typography.lineHeights.tight,
  },

  title_lg: {
    fontSize: typography.sizes.xl,
    lineHeight: typography.sizes.xl * typography.lineHeights.tight,
  },

  // === DESCRIPTION ===
  description: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.normal,
    color: colors.muted.foreground,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },

  // === CONTENT ===
  content: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },

  contentCompact: {
    paddingVertical: spacing[2],
  },

  // === FOOTER ===
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[2],
  },

  footer_start: {
    justifyContent: 'flex-start',
  },

  footer_center: {
    justifyContent: 'center',
  },

  footer_end: {
    justifyContent: 'flex-end',
  },

  footer_between: {
    justifyContent: 'space-between',
  },
});

export default Card;
