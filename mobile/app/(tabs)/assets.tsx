// ============================================================
// ClimaTrak Mobile - Assets Screen
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
  QrCode,
  MapPin,
  AlertCircle,
  ChevronRight,
  Tag,
} from 'lucide-react-native';
import { assetService } from '@/shared/api';
import { theme } from '@/theme';
import type { Asset, AssetFilters } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  operational: 'Operacional',
  maintenance: 'Manutenção',
  offline: 'Offline',
  decommissioned: 'Desativado',
};

const CRITICALITY_LABELS: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

export default function AssetsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  // Build filters
  const getFilters = (): AssetFilters => {
    const filters: AssetFilters = {};
    
    if (search.trim()) {
      filters.search = search.trim();
    }

    return filters;
  };

  // Fetch assets with infinite scroll
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['assets', search],
    queryFn: async ({ pageParam = 1 }) => {
      const filters = getFilters();
      return assetService.list(filters, pageParam, 20);
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
  const assets = data?.pages.flatMap(page => page.results) || [];

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleScan = () => {
    router.push('/scanner');
  };

  const renderAsset = useCallback(({ item }: { item: Asset }) => (
    <TouchableOpacity
      style={styles.assetCard}
      onPress={() => router.push(`/asset/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.assetHeader}>
        <View style={styles.assetTag}>
          <Tag size={14} color={theme.colors.neutral[600]} />
          <Text style={styles.assetTagText}>{item.tag}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: theme.colors.asset[item.status] + '20' },
        ]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: theme.colors.asset[item.status] },
          ]} />
          <Text style={[
            styles.statusText,
            { color: theme.colors.asset[item.status] },
          ]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.assetName} numberOfLines={2}>
        {item.name}
      </Text>

      {item.description && (
        <Text style={styles.assetDescription} numberOfLines={1}>
          {item.description}
        </Text>
      )}

      <View style={styles.assetMeta}>
        {item.location_name && (
          <View style={styles.metaItem}>
            <MapPin size={14} color={theme.colors.neutral[400]} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.location_name}
            </Text>
          </View>
        )}
        
        {item.type && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Tipo:</Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {item.type}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.assetFooter}>
        <View style={[
          styles.criticalityBadge,
          { backgroundColor: theme.colors.criticality[item.criticality] + '15' },
        ]}>
          <AlertCircle size={12} color={theme.colors.criticality[item.criticality]} />
          <Text style={[
            styles.criticalityText,
            { color: theme.colors.criticality[item.criticality] },
          ]}>
            {CRITICALITY_LABELS[item.criticality]}
          </Text>
        </View>

        {item.manufacturer && (
          <Text style={styles.manufacturerText} numberOfLines={1}>
            {item.manufacturer}
          </Text>
        )}

        <ChevronRight size={18} color={theme.colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  ), [router]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Nenhum ativo encontrado</Text>
      <Text style={styles.emptySubtitle}>
        {search ? 'Tente uma busca diferente' : 'Não há ativos cadastrados'}
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
            placeholder="Buscar por tag, nome, fabricante..."
            placeholderTextColor={theme.colors.neutral[400]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={20} color={theme.colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={handleScan}
        >
          <QrCode size={20} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={assets}
        renderItem={renderAsset}
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
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    gap: 12,
  },
  searchBar: {
    flex: 1,
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
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: theme.spacing[4],
    paddingTop: theme.spacing[3],
  },
  assetCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    ...theme.shadows.sm,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  assetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  assetTagText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.neutral[700],
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
  assetName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[1],
    lineHeight: 22,
  },
  assetDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing[3],
  },
  assetMeta: {
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
  metaLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[400],
  },
  metaText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
  },
  assetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    gap: 8,
  },
  criticalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  criticalityText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  manufacturerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    textAlign: 'right',
    marginRight: theme.spacing[1],
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
