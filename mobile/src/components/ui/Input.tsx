/**
 * Input Component
 *
 * Campo de texto com estados e estilos do design system.
 * @see frontend/src/components/ui/input.tsx
 */

import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, radius, typography, componentSizes } from '../../theme/tokens';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Label do campo */
  label?: string;
  /** Mensagem de erro */
  error?: string;
  /** Texto de ajuda */
  helperText?: string;
  /** Ícone à esquerda */
  leftIcon?: React.ReactNode;
  /** Ícone à direita */
  rightIcon?: React.ReactNode;
  /** Ação ao clicar no ícone direito */
  onRightIconPress?: () => void;
  /** Container style */
  containerStyle?: ViewStyle;
  /** Input style override */
  inputStyle?: TextStyle;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Input reutilizável com suporte a label, erro e ícones
 *
 * @example
 * // Basic input
 * <Input
 *   label="Email"
 *   placeholder="seu@email.com"
 *   value={email}
 *   onChangeText={setEmail}
 * />
 *
 * @example
 * // Input with error
 * <Input
 *   label="Senha"
 *   secureTextEntry
 *   error="Senha inválida"
 *   value={password}
 *   onChangeText={setPassword}
 * />
 *
 * @example
 * // Input with icon
 * <Input
 *   placeholder="Buscar..."
 *   leftIcon={<SearchIcon />}
 *   rightIcon={<ClearIcon />}
 *   onRightIconPress={handleClear}
 * />
 */
export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      disabled,
      editable = true,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const isDisabled = disabled || !editable;
    const hasError = Boolean(error);

    const inputContainerStyles: ViewStyle[] = [
      styles.inputContainer,
      isFocused && styles.inputContainerFocused,
      hasError && styles.inputContainerError,
      isDisabled && styles.inputContainerDisabled,
    ].filter(Boolean) as ViewStyle[];

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}

        <View style={inputContainerStyles}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              leftIcon ? styles.inputWithLeftIcon : undefined,
              rightIcon ? styles.inputWithRightIcon : undefined,
              inputStyle,
            ].filter(Boolean) as TextStyle[]}
            placeholderTextColor={colors.muted.foreground}
            editable={!isDisabled}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {rightIcon && (
            <TouchableOpacity
              style={styles.iconRight}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
              activeOpacity={onRightIconPress ? 0.7 : 1}
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>

        {(error || helperText) && (
          <Text style={[styles.helperText, hasError && styles.errorText]}>
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    gap: spacing[1.5],
  },

  label: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: componentSizes.inputHeight,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
  },

  inputContainerFocused: {
    borderColor: colors.ring,
    borderWidth: 2,
  },

  inputContainerError: {
    borderColor: colors.destructive.DEFAULT,
  },

  inputContainerDisabled: {
    backgroundColor: colors.muted.DEFAULT,
    opacity: 0.5,
  },

  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing[3],
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.sans,
    color: colors.foreground,
  },

  inputWithLeftIcon: {
    paddingLeft: spacing[1],
  },

  inputWithRightIcon: {
    paddingRight: spacing[1],
  },

  iconLeft: {
    paddingLeft: spacing[3],
  },

  iconRight: {
    paddingRight: spacing[3],
  },

  helperText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    color: colors.muted.foreground,
  },

  errorText: {
    color: colors.destructive.DEFAULT,
  },
});

export default Input;
