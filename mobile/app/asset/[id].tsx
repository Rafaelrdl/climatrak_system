// ============================================================
// ClimaTrak Mobile - Asset Detail Screen
// ============================================================

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Tag,
  MapPin,
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  ChevronRight,
  Calendar,
  Wrench,
  Thermometer,
  Info,
} from 'lucide-react-native';
import { assetService, alertService } from '@/shared/api';
import { theme } from '@/theme';
import type { Asset, WorkOrder, Alert } from '@/types';

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

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Fetch asset
  const { 
    data: asset, 
    isLoading, 
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetService.getById(id!),
    enabled: !!id,
  });

  // Fetch work order history
  const { data: workOrderHistory } = useQuery({
    queryKey: ['asset-work-orders', id],
    queryFn: () => assetService.getWorkOrderHistory(id!, 1, 5),
    enabled: !!id,
  });

  // Fetch active alerts
  const { data: alerts } = useQuery({
    queryKey: ['asset-alerts', id],
    queryFn: () => alertService.getByAsset(id!, 1, 5),
    enabled: !!id,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (error || !asset) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle size={48} color={theme.colors.semantic.error} />
        <Text style={styles.errorText}>Erro ao carregar ativo</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeAlerts = alerts?.results?.filter(a => a.status === 'active') || [];

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: asset.tag,
        }} 
      />
      
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.primary[500]]}
            />
          }
        >
          {/* Status Header */}
          <View style={styles.statusHeader}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: theme.colors.asset[asset.status] + '20' },
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: theme.colors.asset[asset.status] },
              ]} />
              <Text style={[
                styles.statusText,
                { color: theme.colors.asset[asset.status] },
              ]}>
                {STATUS_LABELS[asset.status]}
              </Text>
            </View>

            <View style={[
              styles.criticalityBadge,
              { backgroundColor: theme.colors.criticality[asset.criticality] + '15' },
            ]}>
              <AlertCircle size={14} color={theme.colors.criticality[asset.criticality]} />
              <Text style={[
                styles.criticalityText,
                { color: theme.colors.criticality[asset.criticality] },
              ]}>
                {CRITICALITY_LABELS[asset.criticality]}
              </Text>
            </View>
          </View>

          {/* Active Alerts Banner */}
          {activeAlerts.length > 0 && (
            <TouchableOpacity
              style={styles.alertBanner}
              onPress={() => router.push('/(tabs)/alerts')}
            >
              <AlertTriangle size={20} color={theme.colors.semantic.error} />
              <Text style={styles.alertBannerText}>
                {activeAlerts.length} alerta{activeAlerts.length > 1 ? 's' : ''} ativo{activeAlerts.length > 1 ? 's' : ''}
              </Text>
              <ChevronRight size={18} color={theme.colors.semantic.error} />
            </TouchableOpacity>
          )}

          {/* Title */}
          <Text style={styles.title}>{asset.name}</Text>

          {/* Description */}
          {asset.description && (
            <Text style={styles.description}>{asset.description}</Text>
          )}

          {/* Info Cards */}
          <View style={styles.infoSection}>
            {/* Tag */}
            <View style={styles.infoCard}>
              <Tag size={20} color={theme.colors.neutral[600]} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tag</Text>
                <Text style={styles.infoValue}>{asset.tag}</Text>
              </View>
            </View>

            {/* Type */}
            {asset.type && (
              <View style={styles.infoCard}>
                <Wrench size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tipo</Text>
                  <Text style={styles.infoValue}>{asset.type}</Text>
                </View>
              </View>
            )}

            {/* Location */}
            {asset.location_name && (
              <View style={styles.infoCard}>
                <MapPin size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Localização</Text>
                  <Text style={styles.infoValue}>{asset.location_name}</Text>
                </View>
              </View>
            )}

            {/* Manufacturer */}
            {asset.manufacturer && (
              <View style={styles.infoCard}>
                <Info size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Fabricante</Text>
                  <Text style={styles.infoValue}>{asset.manufacturer}</Text>
                </View>
              </View>
            )}

            {/* Model */}
            {asset.model && (
              <View style={styles.infoCard}>
                <Info size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Modelo</Text>
                  <Text style={styles.infoValue}>{asset.model}</Text>
                </View>
              </View>
            )}

            {/* Serial Number */}
            {asset.serial_number && (
              <View style={styles.infoCard}>
                <Info size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Número de Série</Text>
                  <Text style={styles.infoValue}>{asset.serial_number}</Text>
                </View>
              </View>
            )}

            {/* Installation Date */}
            {asset.installation_date && (
              <View style={styles.infoCard}>
                <Calendar size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Data de Instalação</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(asset.installation_date)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Work Order History */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Histórico de OS</Text>
              {workOrderHistory && workOrderHistory.count > 5 && (
                <TouchableOpacity>
                  <Text style={styles.seeAll}>Ver todas</Text>
                </TouchableOpacity>
              )}
            </View>

            {workOrderHistory?.results?.length === 0 ? (
              <View style={styles.emptyCard}>
                <ClipboardList size={32} color={theme.colors.neutral[300]} />
                <Text style={styles.emptyText}>Nenhuma OS registrada</Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {workOrderHistory?.results?.map((order) => (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.historyCard}
                    onPress={() => router.push(`/work-order/${order.id}`)}
                  >
                    <View style={[
                      styles.historyStatus,
                      { backgroundColor: theme.colors.workOrder[order.status] },
                    ]} />
                    <View style={styles.historyContent}>
                      <Text style={styles.historyTitle} numberOfLines={1}>
                        {order.title}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {order.number} • {formatDate(order.created_at)}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={theme.colors.neutral[400]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Create Work Order Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              // TODO: Navigate to create WO screen with asset pre-selected
              router.push('/(tabs)/work-orders');
            }}
          >
            <ClipboardList size={20} color={theme.colors.primary[600]} />
            <Text style={styles.createButtonText}>Criar Ordem de Serviço</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing[6],
    gap: 16,
  },
  errorText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '500',
    color: theme.colors.neutral[700],
  },
  retryButton: {
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.lg,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  statusHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing[4],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  criticalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  criticalityText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.semantic.error + '10',
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[4],
    gap: 8,
  },
  alertBannerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.semantic.error,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[2],
    lineHeight: 28,
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[600],
    lineHeight: 24,
    marginBottom: theme.spacing[4],
  },
  infoSection: {
    gap: 8,
    marginBottom: theme.spacing[6],
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    gap: 12,
    ...theme.shadows.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    color: theme.colors.neutral[900],
    marginTop: 2,
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.primary[600],
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing[8],
    borderRadius: theme.borderRadius.lg,
    gap: 8,
    ...theme.shadows.sm,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
  },
  historyList: {
    gap: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    gap: 12,
    ...theme.shadows.sm,
  },
  historyStatus: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.neutral[900],
  },
  historyMeta: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    borderStyle: 'dashed',
  },
  createButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
});
