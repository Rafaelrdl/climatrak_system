// ============================================================
// ClimaTrak Mobile - Assets Screen (Migrated to Design System)
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
import { colors, spacing, radius, typography, shadows, iconSizes } from '@/theme/tokens';
import { Card, Badge } from '@/components/ui';
import type { Asset, AssetFilters } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  OK: 'Operacional',
  MAINTENANCE: 'Manutenção',
  STOPPED: 'Parado',
  ALERT: 'Em Alerta',
};

const CRITICALITY_LABELS: Record<string, string> = {
  CRITICA: 'Crítico',
  ALTA: 'Alto',
  MEDIA: 'Médio',
  BAIXA: 'Baixo',
};

const STATUS_COLORS: Record<string, string> = {
  OK: colors.status.online,
  MAINTENANCE: colors.status.warning,
  STOPPED: colors.status.offline,
  ALERT: colors.status.critical,
};

const CRITICALITY_COLORS: Record<string, string> = {
  CRITICA: colors.priority.critical,
  ALTA: colors.priority.high,
  MEDIA: colors.priority.medium,
  BAIXA: colors.priority.low,
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

  const renderAsset = useCallback(({ item }: { item: Asset }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.neutral[500];
    const criticalityColor = CRITICALITY_COLORS[item.criticality] || colors.neutral[500];
    
    return (
      <TouchableOpacity
        style={styles.assetCard}
        onPress={() => router.push(`/asset/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.assetHeader}>
          <View style={styles.assetTag}>
            <Tag size={iconSizes.xs} color={colors.neutral[600]} />
            <Text style={styles.assetTagText}>{item.tag}</Text>
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
              <MapPin size={iconSizes.xs} color={colors.neutral[400]} />
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
            { backgroundColor: `${criticalityColor}15` },
          ]}>
            <AlertCircle size={iconSizes.xs} color={criticalityColor} />
            <Text style={[styles.criticalityText, { color: criticalityColor }]}>
              {CRITICALITY_LABELS[item.criticality]}
            </Text>
          </View>

          {item.manufacturer && (
            <Text style={styles.manufacturerText} numberOfLines={1}>
              {item.manufacturer}
            </Text>
          )}

          <ChevronRight size={iconSizes.sm} color={colors.neutral[400]} />
        </View>
      </TouchableOpacity>
    );
  }, [router]);

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
            placeholder="Buscar por tag, nome, fabricante..."
            placeholderTextColor={colors.neutral[400]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={iconSizes.md} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={handleScan}
        >
          <QrCode size={iconSizes.md} color={colors.white} />
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
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    gap: spacing[3],
  },
  searchBar: {
    flex: 1,
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
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing[4],
    paddingTop: spacing[3],
  },
  assetCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing[4],
    ...shadows.sm,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  assetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    gap: spacing[1],
  },
  assetTagText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[700],
  },
  assetName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.neutral[900],
    marginBottom: spacing[1],
    lineHeight: 22,
  },
  assetDescription: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginBottom: spacing[3],
  },
  assetMeta: {
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
  metaLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[400],
  },
  metaText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
  },
  assetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: spacing[2],
  },
  criticalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    gap: spacing[1],
  },
  criticalityText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  manufacturerText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textAlign: 'right',
    marginRight: spacing[1],
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
