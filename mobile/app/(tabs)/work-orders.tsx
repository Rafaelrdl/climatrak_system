// ============================================================
// ClimaTrak Mobile - Work Orders Screen
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
  Filter,
  X,
  Clock,
  User,
  MapPin,
  ChevronRight,
} from 'lucide-react-native';
import { workOrderService } from '@/shared/api';
import { useSyncStore } from '@/store';
import { theme } from '@/theme';
import type { WorkOrder, WorkOrderFilters } from '@/types';

type FilterTab = 'all' | 'mine' | 'pending' | 'in_progress';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
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
        filters.status = ['pending'];
        break;
      case 'in_progress':
        filters.status = ['in_progress'];
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

  const renderWorkOrder = useCallback(({ item }: { item: WorkOrder }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/work-order/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderNumber}>
          <Text style={styles.orderNumberText}>{item.number}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: theme.colors.workOrder[item.status] + '20' },
        ]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: theme.colors.workOrder[item.status] },
          ]} />
          <Text style={[
            styles.statusText,
            { color: theme.colors.workOrder[item.status] },
          ]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.orderTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <View style={styles.orderMeta}>
        <View style={styles.metaItem}>
          <MapPin size={14} color={theme.colors.neutral[400]} />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.asset_name || 'Sem ativo'}
          </Text>
        </View>
        
        {item.assigned_to_name && (
          <View style={styles.metaItem}>
            <User size={14} color={theme.colors.neutral[400]} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.assigned_to_name}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.orderFooter}>
        <View style={[
          styles.priorityBadge,
          { backgroundColor: theme.colors.priority[item.priority] + '15' },
        ]}>
          <Text style={[
            styles.priorityText,
            { color: theme.colors.priority[item.priority] },
          ]}>
            {PRIORITY_LABELS[item.priority]}
          </Text>
        </View>

        <View style={styles.dateContainer}>
          <Clock size={14} color={theme.colors.neutral[400]} />
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
        </View>

        <ChevronRight size={18} color={theme.colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  ), [router]);

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
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={theme.colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por número, título, ativo..."
            placeholderTextColor={theme.colors.neutral[400]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={20} color={theme.colors.neutral[400]} />
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
  searchContainer: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[3],
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[900],
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[2],
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing[2],
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
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
  listContent: {
    padding: theme.spacing[4],
    paddingTop: theme.spacing[3],
  },
  orderCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    ...theme.shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  orderNumber: {
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  orderNumberText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.neutral[600],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  orderTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[3],
    lineHeight: 22,
  },
  orderMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: theme.spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '45%',
  },
  metaText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
  },
  priorityBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  priorityText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    marginRight: theme.spacing[2],
  },
  dateText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
  },
  separator: {
    height: theme.spacing[3],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing[12],
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[2],
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
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
