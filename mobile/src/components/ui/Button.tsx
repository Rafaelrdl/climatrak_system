/**
 * Button Component
 *
 * Componente de botão com variants espelhando o design system web (shadcn/ui).
 * @see frontend/src/components/ui/button.tsx
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { colors, spacing, radius, typography, componentSizes, transitions } from '../../theme/tokens';

export type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
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

  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    isDisabled && styles.textDisabled,
    textStyle,
  ].filter(Boolean) as TextStyle[];

  const getLoaderColor = (): string => {
    switch (variant) {
      case 'default':
      case 'destructive':
        return colors.white;
      case 'secondary':
      case 'outline':
      case 'ghost':
        return colors.primary.DEFAULT;
      case 'link':
        return colors.primary.DEFAULT;
      default:
        return colors.white;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={containerStyles}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLoaderColor()} />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          {typeof children === 'string' ? (
            <Text style={textStyles}>{children}</Text>
          ) : (
            children
          )}
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Base styles
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
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
  variant_ghost: {
    backgroundColor: colors.transparent,
  },
  variant_link: {
    backgroundColor: colors.transparent,
    paddingHorizontal: 0,
  },

  // Sizes
  size_sm: {
    height: componentSizes.buttonHeight.sm,
    paddingHorizontal: spacing[3],
  },
  size_md: {
    height: componentSizes.buttonHeight.md,
    paddingHorizontal: spacing[4],
  },
  size_lg: {
    height: componentSizes.buttonHeight.lg,
    paddingHorizontal: spacing[6],
  },
  size_icon: {
    height: componentSizes.buttonHeight.md,
    width: componentSizes.buttonHeight.md,
    paddingHorizontal: 0,
  },

  // Full width
  fullWidth: {
    width: '100%',
  },

  // Disabled
  disabled: {
    opacity: 0.5,
  },

  // Text styles
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
  text_ghost: {
    color: colors.foreground,
  },
  text_link: {
    color: colors.primary.DEFAULT,
    textDecorationLine: 'underline',
  },

  // Text sizes
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
