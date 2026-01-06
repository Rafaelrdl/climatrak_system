/**
 * Skeleton Component
 *
 * Placeholder animado para estados de loading.
 * @see frontend/src/components/ui/skeleton.tsx
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from 'react-native';
import { colors, radius } from '../../theme/tokens';

export interface SkeletonProps {
  /** Largura do skeleton */
  width?: DimensionValue;
  /** Altura do skeleton */
  height?: DimensionValue;
  /** Border radius */
  borderRadius?: number;
  /** Skeleton circular (avatar) */
  circle?: boolean;
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Skeleton placeholder com animação pulse
 *
 * @example
 * // Texto
 * <Skeleton width={200} height={16} />
 *
 * @example
 * // Avatar
 * <Skeleton circle width={40} height={40} />
 *
 * @example
 * // Card
 * <Skeleton width="100%" height={120} borderRadius={12} />
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius: customRadius,
  circle = false,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  const computedRadius = circle
    ? typeof width === 'number'
      ? width / 2
      : 9999
    : customRadius ?? radius.md;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: computedRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

/**
 * Skeleton para texto (múltiplas linhas)
 */
export interface SkeletonTextProps {
  /** Número de linhas */
  lines?: number;
  /** Largura da última linha (porcentagem) */
  lastLineWidth?: DimensionValue;
  /** Gap entre linhas */
  gap?: number;
  /** Altura de cada linha */
  lineHeight?: number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastLineWidth = '60%',
  gap = 8,
  lineHeight = 14,
}) => {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </View>
  );
};

/**
 * Skeleton para card completo
 */
export interface SkeletonCardProps {
  /** Mostrar avatar */
  hasAvatar?: boolean;
  /** Número de linhas de texto */
  textLines?: number;
  /** Altura do card */
  height?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasAvatar = true,
  textLines = 2,
  height,
}) => {
  return (
    <View style={[styles.card, height ? { height } : undefined]}>
      <View style={styles.cardHeader}>
        {hasAvatar && <Skeleton circle width={40} height={40} />}
        <View style={styles.cardHeaderText}>
          <Skeleton height={16} width="70%" />
          <Skeleton height={12} width="40%" />
        </View>
      </View>
      <View style={styles.cardContent}>
        <SkeletonText lines={textLines} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.neutral[200],
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  cardHeaderText: {
    flex: 1,
    gap: 6,
  },

  cardContent: {
    gap: 8,
  },
});

export default Skeleton;
