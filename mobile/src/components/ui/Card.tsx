/**
 * Card Component
 *
 * Container para conteúdo com estilo consistente.
 * @see frontend/src/components/ui/card.tsx
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, radius, shadows, typography } from '../../theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Card container principal
 *
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Título</CardTitle>
 *     <CardDescription>Descrição</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     Conteúdo aqui
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Ação</Button>
 *   </CardFooter>
 * </Card>
 */
export const Card: React.FC<CardProps> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

/**
 * Header do Card
 */
export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

/**
 * Título do Card
 */
export const CardTitle: React.FC<CardTitleProps> = ({ children, style }) => (
  <Text style={[styles.title, style]}>{children}</Text>
);

/**
 * Descrição do Card
 */
export const CardDescription: React.FC<CardDescriptionProps> = ({ children, style }) => (
  <Text style={[styles.description, style]}>{children}</Text>
);

/**
 * Conteúdo principal do Card
 */
export const CardContent: React.FC<CardContentProps> = ({ children, style }) => (
  <View style={[styles.content, style]}>{children}</View>
);

/**
 * Footer do Card (geralmente contém ações)
 */
export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },

  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[2],
    gap: spacing[1.5],
  },

  title: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    color: colors.cardForeground,
    lineHeight: typography.sizes.lg * typography.lineHeights.tight,
  },

  description: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.normal,
    color: colors.muted.foreground,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },

  content: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[6],
    paddingTop: spacing[2],
    gap: spacing[2],
  },
});

export default Card;
