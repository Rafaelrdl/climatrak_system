// ============================================================
// ClimaTrak Mobile - Alerts Screen (Migrated to Design System)
// ============================================================

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle } from 'lucide-react-native';

// Design system imports
import { colors, spacing, radius, typography } from '@/theme/tokens';
import { AlertCard, AlertCardSkeleton } from '@/components/composed';
import { alertService } from '@/shared/api';
import type { Alert, AlertFilters, AlertStatus } from '@/types';

type FilterTab = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'all';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ACTIVE', label: 'Ativos' },
  { key: 'ACKNOWLEDGED', label: 'Reconhecidos' },
  { key: 'RESOLVED', label: 'Resolvidos' },
  { key: 'all', label: 'Todos' },
];

export default function AlertsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>('ACTIVE');

  // Build filters based on active tab
  const getFilters = (): AlertFilters => {
    const filters: AlertFilters = {};
    if (activeTab !== 'all') {
      filters.status = [activeTab as AlertStatus];
    }
    return filters;
  };

  // Fetch alerts with infinite scroll
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['alerts', activeTab],
    queryFn: async ({ pageParam = 1 }) => {
      const filters = getFilters();
      return alertService.list(filters, pageParam, 20);
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.next) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Flatten pages
  const alerts = data?.pages.flatMap(page => page.results).filter(Boolean) || [];

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleAlertPress = useCallback((alert: Alert) => {
    router.push(`/alert/${alert.id}`);
  }, [router]);

  // Render alert using AlertCard component
  const renderAlert = useCallback(({ item }: { item: Alert }) => {
    if (!item) return null;
    return <AlertCard alert={item} onPress={handleAlertPress} />;
  }, [handleAlertPress]);

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <CheckCircle size={48} color={colors.status.online} />
      <Text style={styles.emptyTitle}>
        {activeTab === 'ACTIVE' 
          ? 'Nenhum alerta ativo' 
          : 'Nenhum alerta encontrado'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'ACTIVE' 
          ? 'Todos os sistemas operando normalmente'
          : 'Não há alertas nesta categoria'}
      </Text>
    </View>
  );

  // Loading skeletons
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      {[1, 2, 3].map((i) => (
        <AlertCardSkeleton key={i} />
      ))}
    </View>
  );

  // Footer loading
  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
      </View>
    );
  };

  // Active count for badge
  const activeCount = activeTab === 'ACTIVE' ? alerts.length : 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
              {label}
            </Text>
            {key === 'ACTIVE' && activeCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{activeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        renderLoading()
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={(item, index) => item?.id?.toString() || `alert-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary.DEFAULT]}
              tintColor={colors.primary.DEFAULT}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[1],
  },

  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    gap: spacing[1],
  },

  tabActive: {
    backgroundColor: colors.primary[50],
  },

  tabText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    color: colors.muted.foreground,
  },

  tabTextActive: {
    color: colors.primary[600],
  },

  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.destructive.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
  },

  tabBadgeText: {
    fontSize: 10,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },

  // List
  listContent: {
    padding: spacing[4],
    paddingTop: spacing[3],
    flexGrow: 1,
  },

  separator: {
    height: spacing[3],
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[12],
    gap: spacing[3],
  },

  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
  },

  emptySubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    color: colors.muted.foreground,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Loading
  loadingContainer: {
    padding: spacing[4],
    gap: spacing[3],
  },

  footer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
});
