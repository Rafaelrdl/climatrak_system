// ============================================================
// ClimaTrak Mobile - Alerts Screen
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
import {
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle,
  Bell,
} from 'lucide-react-native';
import { alertService } from '@/shared/api';
import { theme } from '@/theme';
import type { Alert, AlertFilters, AlertStatus } from '@/types';

type FilterTab = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'all';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  ACKNOWLEDGED: 'Reconhecido',
  RESOLVED: 'Resolvido',
};

const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'Crítico',
  HIGH: 'Alto',
  MEDIUM: 'Médio',
  LOW: 'Baixo',
};

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
  const alerts = data?.pages.flatMap(page => page.results) || [];

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}min atrás`;
    } else if (diffHours < 24) {
      return `${diffHours}h atrás`;
    } else {
      return `${diffDays}d atrás`;
    }
  };

  const renderAlert = useCallback(({ item }: { item: Alert }) => (
    <TouchableOpacity
      style={styles.alertCard}
      onPress={() => router.push(`/alert/${item.id}`)}
      activeOpacity={0.7}
    >
      {/* Severity indicator */}
      <View style={[
        styles.severityBar,
        { backgroundColor: theme.colors.alert[item.severity] },
      ]} />

      <View style={styles.alertContent}>
        <View style={styles.alertHeader}>
          <View style={[
            styles.severityBadge,
            { backgroundColor: theme.colors.alert[item.severity] + '15' },
          ]}>
            <AlertTriangle size={14} color={theme.colors.alert[item.severity]} />
            <Text style={[
              styles.severityText,
              { color: theme.colors.alert[item.severity] },
            ]}>
              {SEVERITY_LABELS[item.severity]}
            </Text>
          </View>

          <View style={[
            styles.statusBadge,
            { backgroundColor: 
              item.status === 'ACTIVE' 
                ? theme.colors.semantic.error + '15'
                : item.status === 'ACKNOWLEDGED'
                  ? theme.colors.semantic.warning + '15'
                  : theme.colors.semantic.success + '15'
            },
          ]}>
            {item.status === 'RESOLVED' ? (
              <CheckCircle size={12} color={theme.colors.semantic.success} />
            ) : (
              <Bell size={12} color={
                item.status === 'ACTIVE' 
                  ? theme.colors.semantic.error 
                  : theme.colors.semantic.warning
              } />
            )}
            <Text style={[
              styles.statusText,
              { color: 
                item.status === 'ACTIVE' 
                  ? theme.colors.semantic.error
                  : item.status === 'ACKNOWLEDGED'
                    ? theme.colors.semantic.warning
                    : theme.colors.semantic.success
              },
            ]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <Text style={styles.alertTitle} numberOfLines={2}>
          {item.rule_name || 'Alerta do Sistema'}
        </Text>

        {item.message && (
          <Text style={styles.alertMessage} numberOfLines={2}>
            {item.message}
          </Text>
        )}

        <View style={styles.alertMeta}>
          {item.asset_name && (
            <View style={styles.metaItem}>
              <MapPin size={14} color={theme.colors.neutral[400]} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.asset_name}
              </Text>
            </View>
          )}

          <View style={styles.metaItem}>
            <Clock size={14} color={theme.colors.neutral[400]} />
            <Text style={styles.metaText}>
              {formatTimeAgo(item.triggered_at)}
            </Text>
          </View>
        </View>

        <View style={styles.alertFooter}>
          {item.sensor_name && (
            <Text style={styles.sensorText} numberOfLines={1}>
              Sensor: {item.sensor_name}
            </Text>
          )}
          <ChevronRight size={18} color={theme.colors.neutral[400]} />
        </View>
      </View>
    </TouchableOpacity>
  ), [router]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <CheckCircle size={48} color={theme.colors.semantic.success} />
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

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
      </View>
    );
  };

  // Count active alerts
  const activeCount = activeTab === 'ACTIVE' ? alerts.length : 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ACTIVE' && styles.tabActive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
            Ativos
          </Text>
          {activeCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ACKNOWLEDGED' && styles.tabActive]}
          onPress={() => setActiveTab('ACKNOWLEDGED')}
        >
          <Text style={[styles.tabText, activeTab === 'ACKNOWLEDGED' && styles.tabTextActive]}>
            Reconhecidos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'RESOLVED' && styles.tabActive]}
          onPress={() => setActiveTab('RESOLVED')}
        >
          <Text style={[styles.tabText, activeTab === 'RESOLVED' && styles.tabTextActive]}>
            Resolvidos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary[500]]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: theme.spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  tabActive: {
    backgroundColor: theme.colors.primary[50],
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.primary[600],
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.semantic.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
  listContent: {
    padding: theme.spacing[4],
    paddingTop: theme.spacing[3],
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  severityBar: {
    width: 4,
  },
  alertContent: {
    flex: 1,
    padding: theme.spacing[4],
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  severityText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  alertTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[1],
    lineHeight: 22,
  },
  alertMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
    marginBottom: theme.spacing[3],
    lineHeight: 20,
  },
  alertMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: theme.spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
  },
  sensorText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
  },
  separator: {
    height: theme.spacing[3],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing[12],
    gap: 12,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  footer: {
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
