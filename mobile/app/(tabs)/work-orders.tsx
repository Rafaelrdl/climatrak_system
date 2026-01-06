// ============================================================
// ClimaTrak Mobile - Work Orders Screen (Migrated to Design System)
// ============================================================

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  X,
  Clock,
  User,
  MapPin,
  ChevronRight,
} from 'lucide-react-native';
import { workOrderService } from '@/shared/api';
import { useSyncStore } from '@/store';
import { colors, spacing, radius, typography, shadows, iconSizes } from '@/theme/tokens';
import { Badge } from '@/components/ui';
import type { WorkOrder, WorkOrderFilters } from '@/types';

type FilterTab = 'all' | 'mine' | 'pending' | 'in_progress';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  ON_HOLD: 'Em Espera',
  PENDING_REVIEW: 'Aguardando Revisão',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Urgente',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: colors.workOrder.open,
  IN_PROGRESS: colors.workOrder.inProgress,
  COMPLETED: colors.workOrder.completed,
  CANCELLED: colors.workOrder.cancelled,
  ON_HOLD: colors.neutral[500],
  PENDING_REVIEW: colors.status.warning,
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: colors.priority.low,
  MEDIUM: colors.priority.medium,
  HIGH: colors.priority.high,
  CRITICAL: colors.priority.critical,
};

export default function WorkOrdersScreen() {
  const router = useRouter();
  const { isOnline } = useSyncStore();
  
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('mine');

  // Build filters based on active tab
  const getFilters = (): WorkOrderFilters => {
    const filters: WorkOrderFilters = {};
    
    if (search.trim()) {
      filters.search = search.trim();
    }

    switch (activeTab) {
      case 'mine':
        filters.assigned_to_me = true;
        break;
      case 'pending':
        filters.status = ['OPEN'];
        break;
      case 'in_progress':
        filters.status = ['IN_PROGRESS'];
        break;
      // 'all' has no additional filters
    }

    return filters;
  };

  // Fetch work orders with infinite scroll
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['work-orders', activeTab, search],
    queryFn: async ({ pageParam = 1 }) => {
      const filters = getFilters();
      return workOrderService.list(filters, pageParam, 20);
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.next) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Flatten pages into single array
  const workOrders = data?.pages.flatMap(page => page.results) || [];

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderWorkOrder = useCallback(({ item }: { item: WorkOrder }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.neutral[500];
    const priorityColor = PRIORITY_COLORS[item.priority] || colors.neutral[500];
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/work-order/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderNumber}>
            <Text style={styles.orderNumberText}>{item.number}</Text>
          </View>
          <Badge 
            variant="outline"
            size="sm"
            style={{ backgroundColor: `${statusColor}20`, borderColor: statusColor }}
            textStyle={{ color: statusColor }}
          >
            {STATUS_LABELS[item.status]}
          </Badge>
        </View>

        <Text style={styles.orderTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.orderMeta}>
          <View style={styles.metaItem}>
            <MapPin size={iconSizes.xs} color={colors.neutral[400]} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.asset_name || 'Sem ativo'}
            </Text>
          </View>
          
          {item.assigned_to_name && (
            <View style={styles.metaItem}>
              <User size={iconSizes.xs} color={colors.neutral[400]} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.assigned_to_name}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.orderFooter}>
          <View style={[
            styles.priorityBadge,
            { backgroundColor: `${priorityColor}15` },
          ]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {PRIORITY_LABELS[item.priority]}
            </Text>
          </View>

          <View style={styles.dateContainer}>
            <Clock size={iconSizes.xs} color={colors.neutral[400]} />
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString('pt-BR')}
            </Text>
          </View>

          <ChevronRight size={iconSizes.sm} color={colors.neutral[400]} />
        </View>
      </TouchableOpacity>
    );
  }, [router]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Nenhuma OS encontrada</Text>
      <Text style={styles.emptySubtitle}>
        {search ? 'Tente uma busca diferente' : 'Não há ordens de serviço para exibir'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={iconSizes.md} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por número, título, ativo..."
            placeholderTextColor={colors.neutral[400]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={iconSizes.md} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mine' && styles.tabActive]}
          onPress={() => setActiveTab('mine')}
        >
          <Text style={[styles.tabText, activeTab === 'mine' && styles.tabTextActive]}>
            Minhas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pendentes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'in_progress' && styles.tabActive]}
          onPress={() => setActiveTab('in_progress')}
        >
          <Text style={[styles.tabText, activeTab === 'in_progress' && styles.tabTextActive]}>
            Em Andamento
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={workOrders}
        renderItem={renderWorkOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary.DEFAULT]}
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
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    height: 44,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.neutral[900],
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[1],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: radius.md,
  },
  tabActive: {
    backgroundColor: colors.primary[50],
  },
  tabText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    fontWeight: typography.weights.medium,
  },
  tabTextActive: {
    color: colors.primary[600],
  },
  listContent: {
    padding: spacing[4],
    paddingTop: spacing[3],
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing[4],
    ...shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  orderNumber: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
  },
  orderNumberText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[600],
  },
  orderTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.neutral[900],
    marginBottom: spacing[3],
    lineHeight: 22,
  },
  orderMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    maxWidth: '45%',
  },
  metaText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  priorityBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
  },
  priorityText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginLeft: 'auto',
    marginRight: spacing[2],
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  separator: {
    height: spacing[3],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
  },
  footer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
