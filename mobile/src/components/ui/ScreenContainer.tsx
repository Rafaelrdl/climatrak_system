/**
 * ScreenContainer Component
 *
 * Container base para todas as telas do app.
 * Gerencia SafeArea, scroll, loading e empty states.
 */

import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ViewStyle,
  StatusBar,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme/tokens';

export interface ScreenContainerProps {
  /** Conteúdo da tela */
  children: React.ReactNode;
  /** Se deve ter scroll */
  scroll?: boolean;
  /** Se está carregando (loading inicial) */
  loading?: boolean;
  /** Componente de loading customizado */
  loadingComponent?: React.ReactNode;
  /** Se está em pull-to-refresh */
  refreshing?: boolean;
  /** Callback do pull-to-refresh */
  onRefresh?: () => void;
  /** Estado vazio */
  empty?: boolean;
  /** Componente de empty state */
  emptyComponent?: React.ReactNode;
  /** Título do empty state */
  emptyTitle?: string;
  /** Descrição do empty state */
  emptyDescription?: string;
  /** Padding horizontal */
  horizontalPadding?: boolean;
  /** Padding vertical */
  verticalPadding?: boolean;
  /** Cor de fundo */
  backgroundColor?: string;
  /** Estilo customizado do container */
  style?: ViewStyle;
  /** Estilo customizado do content */
  contentStyle?: ViewStyle;
  /** Edges do SafeArea */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * Container base para telas
 *
 * @example
 * // Tela simples
 * <ScreenContainer>
 *   <Text>Conteúdo</Text>
 * </ScreenContainer>
 *
 * @example
 * // Com loading
 * <ScreenContainer loading={isLoading}>
 *   <DataList />
 * </ScreenContainer>
 *
 * @example
 * // Com pull-to-refresh
 * <ScreenContainer
 *   scroll
 *   refreshing={refreshing}
 *   onRefresh={handleRefresh}
 * >
 *   <DataList />
 * </ScreenContainer>
 *
 * @example
 * // Com empty state
 * <ScreenContainer
 *   empty={items.length === 0}
 *   emptyTitle="Nenhum item"
 *   emptyDescription="Adicione um novo item para começar"
 * >
 *   <ItemList items={items} />
 * </ScreenContainer>
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scroll = true,
  loading = false,
  loadingComponent,
  refreshing = false,
  onRefresh,
  empty = false,
  emptyComponent,
  emptyTitle = 'Nenhum item encontrado',
  emptyDescription,
  horizontalPadding = true,
  verticalPadding = true,
  backgroundColor = colors.background,
  style,
  contentStyle,
  edges = ['top', 'bottom'],
}) => {
  const contentPadding: ViewStyle = {
    paddingHorizontal: horizontalPadding ? spacing[4] : 0,
    paddingVertical: verticalPadding ? spacing[4] : 0,
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
        <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
        {loadingComponent || (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Empty state
  if (empty && !loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
        <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
        {emptyComponent || (
          <View style={[styles.centered, contentPadding]}>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            {emptyDescription && (
              <Text style={styles.emptyDescription}>{emptyDescription}</Text>
            )}
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Content with scroll
  if (scroll) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
        <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[contentPadding, contentStyle]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary.DEFAULT]}
                tintColor={colors.primary.DEFAULT}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Content without scroll
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <View style={[styles.content, contentPadding, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    flex: 1,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing[2],
  },

  emptyDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    color: colors.muted.foreground,
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default ScreenContainer;
