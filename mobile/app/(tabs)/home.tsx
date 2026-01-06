// ============================================================
// ClimaTrak Mobile - Home Screen (Migrated to Design System)
// ============================================================

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ClipboardList,
  Wifi,
  WifiOff,
  QrCode,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';

// Design system imports
import { colors, spacing, radius, typography, shadows } from '@/theme/tokens';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { AlertCard, WorkOrderCard } from '@/components/composed';
import { useAuthStore, useSyncStore } from '@/store';
import { workOrderService, alertService } from '@/shared/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user, tenant } = useAuthStore();
  const { isOnline, pendingCount, syncAll, isSyncing } = useSyncStore();

  // Fetch my work orders
  const { 
    data: myOrders, 
    isLoading: loadingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['my-work-orders'],
    queryFn: () => workOrderService.getMyOrders(),
  });

  // Fetch active alerts
  const { 
    data: activeAlerts, 
    isLoading: loadingAlerts,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['active-alerts'],
    queryFn: () => alertService.getActive(1, 5),
  });

  const isLoading = loadingOrders || loadingAlerts;

  const handleRefresh = async () => {
    if (isOnline) {
      await Promise.all([refetchOrders(), refetchAlerts()]);
    }
  };

  // Get first name
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Técnico';

  // Count orders by status
  const orderStats = {
    pending: myOrders?.results?.filter(o => o.status === 'OPEN').length || 0,
    in_progress: myOrders?.results?.filter(o => o.status === 'IN_PROGRESS').length || 0,
    total: myOrders?.count || 0,
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[colors.primary.DEFAULT]}
            tintColor={colors.primary.DEFAULT}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {firstName} 👋</Text>
            <Text style={styles.tenantName}>{tenant?.name}</Text>
          </View>
          
          {/* Connection Status */}
          <View style={[
            styles.connectionBadge,
            isOnline ? styles.online : styles.offline,
          ]}>
            {isOnline ? (
              <Wifi size={14} color={colors.status.online} />
            ) : (
              <WifiOff size={14} color={colors.status.critical} />
            )}
            <Text style={[
              styles.connectionText,
              isOnline ? styles.onlineText : styles.offlineText,
            ]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Pending Sync Banner */}
        {pendingCount > 0 && (
          <TouchableOpacity 
            style={styles.syncBanner}
            onPress={syncAll}
            disabled={!isOnline || isSyncing}
          >
            <View style={styles.syncBannerContent}>
              <Clock size={18} color={colors.status.warning} />
              <Text style={styles.syncBannerText}>
                {pendingCount} {pendingCount === 1 ? 'item pendente' : 'itens pendentes'} de sincronização
              </Text>
            </View>
            {isOnline && !isSyncing && (
              <Text style={styles.syncBannerAction}>Sincronizar</Text>
            )}
            {isSyncing && (
              <Text style={styles.syncBannerAction}>Sincronizando...</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/scanner')}
          >
            <View style={styles.quickActionIcon}>
              <QrCode size={24} color={colors.white} />
            </View>
            <Text style={styles.quickActionText}>Escanear QR</Text>
          </TouchableOpacity>
        </View>

        {/* My Work Orders Summary */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(tabs)/work-orders')}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <ClipboardList size={20} color={colors.primary[600]} />
              <Text style={styles.cardTitle}>Minhas OS</Text>
            </View>
            <ChevronRight size={20} color={colors.muted.foreground} />
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{orderStats.pending}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.status.warning }]}>
                {orderStats.in_progress}
              </Text>
              <Text style={styles.statLabel}>Em Andamento</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{orderStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Active Alerts */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <AlertTriangle size={20} color={colors.status.critical} />
              <Text style={styles.cardTitle}>Alertas Ativos</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/alerts')}>
              <Text style={styles.cardAction}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {activeAlerts?.results?.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle2 size={32} color={colors.status.online} />
              <Text style={styles.emptyStateText}>Nenhum alerta ativo</Text>
            </View>
          ) : (
            <View style={styles.alertsList}>
              {activeAlerts?.results?.slice(0, 3).map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  variant="compact"
                  onPress={() => router.push(`/alert/${alert.id}`)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Recent Work Orders */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Clock size={20} color={colors.muted.foreground} />
              <Text style={styles.cardTitle}>OS Recentes</Text>
            </View>
          </View>

          {myOrders?.results?.length === 0 ? (
            <View style={styles.emptyState}>
              <ClipboardList size={32} color={colors.muted.foreground} />
              <Text style={styles.emptyStateText}>Nenhuma OS atribuída</Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {myOrders?.results?.slice(0, 5).map((order) => (
                <WorkOrderCard
                  key={order.id}
                  workOrder={order}
                  variant="compact"
                  onPress={() => router.push(`/work-order/${order.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  greeting: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    color: colors.foreground,
  },
  tenantName: {
    fontSize: typography.sizes.sm,
    color: colors.muted.foreground,
    marginTop: 2,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    gap: 4,
  },
  online: {
    backgroundColor: colors.status.online + '15',
  },
  offline: {
    backgroundColor: colors.status.critical + '15',
  },
  connectionText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  onlineText: {
    color: colors.status.online,
  },
  offlineText: {
    color: colors.status.critical,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.status.warning + '15',
    padding: spacing[3],
    borderRadius: radius.lg,
    marginBottom: spacing[4],
  },
  syncBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBannerText: {
    fontSize: typography.sizes.sm,
    color: colors.foreground,
  },
  syncBannerAction: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.status.warning,
  },
  quickActions: {
    marginBottom: spacing[4],
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
    padding: spacing[4],
    borderRadius: radius.lg,
    gap: 12,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: '#ffffff',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  cardAction: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.primary.DEFAULT,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    color: colors.foreground,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.muted.foreground,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: 8,
  },
  emptyStateText: {
    fontSize: typography.sizes.sm,
    color: colors.muted.foreground,
  },
  alertsList: {
    gap: 8,
  },
  ordersList: {
    gap: 8,
  },
});
