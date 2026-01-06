/**
 * Button Component - Platform Design System
 *
 * Botão com variants espelhando shadcn/ui + melhorias de UX mobile.
 * - Touch targets acessíveis (mínimo 44px)
 * - Feedback visual instantâneo (activeOpacity otimizado)
 * - Estados visuais claros (disabled, loading, pressed)
 * 
 * @see docs/design/DESIGN_SYSTEM.md
 * @see frontend/src/components/ui/button.tsx
 */

import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  PressableProps,
  View,
} from 'react-native';
import { colors, spacing, radius, typography, componentSizes, shadows } from '../../theme/tokens';

export type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  /** Variante visual do botão */
  variant?: ButtonVariant;
  /** Tamanho do botão */
  size?: ButtonSize;
  /** Texto do botão */
  children: React.ReactNode;
  /** Estado de loading */
  loading?: boolean;
  /** Ícone à esquerda */
  leftIcon?: React.ReactNode;
  /** Ícone à direita */
  rightIcon?: React.ReactNode;
  /** Estilos customizados para o container */
  style?: ViewStyle;
  /** Estilos customizados para o texto */
  textStyle?: TextStyle;
  /** Ocupar largura total */
  fullWidth?: boolean;
}

/**
 * Botão reutilizável com variants do design system
 *
 * @example
 * // Default button
 * <Button onPress={handlePress}>Salvar</Button>
 *
 * @example
 * // Destructive with loading
 * <Button variant="destructive" loading={isDeleting}>
 *   Excluir
 * </Button>
 *
 * @example
 * // Outline with icon
 * <Button variant="outline" leftIcon={<PlusIcon />}>
 *   Adicionar
 * </Button>
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  children,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  textStyle,
  fullWidth = false,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getLoaderColor = (): string => {
    switch (variant) {
      case 'default':
      case 'destructive':
      case 'success':
        return colors.white;
      default:
        return colors.primary.DEFAULT;
    }
  };

  // Estilos dinâmicos baseados no estado pressed
  const getContainerStyle = (pressed: boolean): ViewStyle[] => {
    const baseStyles: ViewStyle[] = [
      styles.base,
      styles[`variant_${variant}` as keyof typeof styles] as ViewStyle,
      styles[`size_${size}` as keyof typeof styles] as ViewStyle,
      fullWidth && styles.fullWidth,
      isDisabled && styles.disabled,
      // Estado pressed - feedback visual instantâneo
      pressed && !isDisabled && styles[`variant_${variant}_pressed` as keyof typeof styles] as ViewStyle,
      style,
    ].filter(Boolean) as ViewStyle[];
    
    return baseStyles;
  };

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`text_${variant}` as keyof typeof styles] as TextStyle,
    styles[`textSize_${size}` as keyof typeof styles] as TextStyle,
    isDisabled && styles.textDisabled,
    textStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => getContainerStyle(pressed)}
      android_ripple={{ 
        color: variant === 'default' || variant === 'destructive' || variant === 'success' 
          ? 'rgba(255, 255, 255, 0.2)' 
          : 'rgba(37, 99, 235, 0.1)',
        borderless: false,
      }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLoaderColor()} />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconWrapper}>{leftIcon}</View>}
          {typeof children === 'string' ? (
            <Text style={textStyles}>{children}</Text>
          ) : (
            children
          )}
          {rightIcon && <View style={styles.iconWrapper}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Base styles - Design System Platform
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },

  // Content wrapper
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },

  // Icon wrapper
  iconWrapper: {
    flexShrink: 0,
  },

  // === VARIANTS ===
  
  // Default (Primary)
  variant_default: {
    backgroundColor: colors.primary.DEFAULT,
    ...shadows.sm,
  },
  variant_default_pressed: {
    backgroundColor: colors.primary.dark,
    transform: [{ scale: 0.98 }],
  },

  // Secondary
  variant_secondary: {
    backgroundColor: colors.secondary.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variant_secondary_pressed: {
    backgroundColor: colors.neutral[200],
    transform: [{ scale: 0.98 }],
  },

  // Destructive
  variant_destructive: {
    backgroundColor: colors.destructive.DEFAULT,
    ...shadows.sm,
  },
  variant_destructive_pressed: {
    backgroundColor: colors.destructive.dark,
    transform: [{ scale: 0.98 }],
  },

  // Success (novo)
  variant_success: {
    backgroundColor: colors.success.DEFAULT,
    ...shadows.sm,
  },
  variant_success_pressed: {
    backgroundColor: colors.success.dark,
    transform: [{ scale: 0.98 }],
  },

  // Outline
  variant_outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variant_outline_pressed: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.neutral[300],
    transform: [{ scale: 0.98 }],
  },

  // Ghost
  variant_ghost: {
    backgroundColor: colors.transparent,
  },
  variant_ghost_pressed: {
    backgroundColor: colors.neutral[100],
  },

  // Link
  variant_link: {
    backgroundColor: colors.transparent,
    paddingHorizontal: 0,
    minHeight: 0,
  },
  variant_link_pressed: {
    opacity: 0.7,
  },

  // === SIZES ===
  
  // Extra small - Badges e ações compactas
  size_xs: {
    height: componentSizes.buttonHeight.xs,
    paddingHorizontal: spacing[2.5],
    borderRadius: radius.sm,
  },

  // Small
  size_sm: {
    height: componentSizes.buttonHeight.sm,
    paddingHorizontal: spacing[3],
    borderRadius: radius.sm,
  },

  // Medium (default) - Touch target acessível
  size_md: {
    height: componentSizes.buttonHeight.md,
    paddingHorizontal: spacing[4],
  },

  // Large - CTAs principais
  size_lg: {
    height: componentSizes.buttonHeight.lg,
    paddingHorizontal: spacing[6],
    borderRadius: radius.lg,
  },

  // Icon only
  size_icon: {
    height: componentSizes.buttonHeight.md,
    width: componentSizes.buttonHeight.md,
    paddingHorizontal: 0,
  },

  // Full width
  fullWidth: {
    width: '100%',
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
  },

  // === TEXT STYLES ===
  
  text: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    letterSpacing: typography.tracking.tight,
  },
  text_default: {
    color: colors.primary.foreground,
  },
  text_secondary: {
    color: colors.neutral[700],
  },
  text_destructive: {
    color: colors.destructive.foreground,
  },
  text_success: {
    color: colors.success.foreground,
  },
  text_outline: {
    color: colors.foreground,
  },
  text_ghost: {
    color: colors.foreground,
  },
  text_link: {
    color: colors.primary.DEFAULT,
    textDecorationLine: 'underline',
  },

  // Text sizes
  textSize_xs: {
    fontSize: typography.sizes.xs,
  },
  textSize_sm: {
    fontSize: typography.sizes.sm,
  },
  textSize_md: {
    fontSize: typography.sizes.base,
  },
  textSize_lg: {
    fontSize: typography.sizes.lg,
  },
  textSize_icon: {
    fontSize: typography.sizes.base,
  },

  // Disabled text
  textDisabled: {
    opacity: 0.7,
  },
});

export default Button;
