// ============================================================
// ClimaTrak Mobile - Home Screen (Dashboard)
// ============================================================

import { useEffect } from 'react';
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
  AlertTriangle,
  Box,
  Wifi,
  WifiOff,
  QrCode,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuthStore, useSyncStore } from '@/store';
import { workOrderService, alertService } from '@/shared/api';
import { theme } from '@/theme';

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
            colors={[theme.colors.primary[500]]}
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
              <Wifi size={14} color={theme.colors.semantic.success} />
            ) : (
              <WifiOff size={14} color={theme.colors.semantic.error} />
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
              <Clock size={18} color={theme.colors.semantic.warning} />
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
              <QrCode size={24} color={theme.colors.white} />
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
              <ClipboardList size={20} color={theme.colors.primary[600]} />
              <Text style={styles.cardTitle}>Minhas OS</Text>
            </View>
            <ChevronRight size={20} color={theme.colors.neutral[400]} />
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{orderStats.pending}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.semantic.warning }]}>
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
              <AlertTriangle size={20} color={theme.colors.semantic.error} />
              <Text style={styles.cardTitle}>Alertas Ativos</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/alerts')}>
              <Text style={styles.cardAction}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {activeAlerts?.results?.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle2 size={32} color={theme.colors.semantic.success} />
              <Text style={styles.emptyStateText}>Nenhum alerta ativo</Text>
            </View>
          ) : (
            <View style={styles.alertsList}>
              {activeAlerts?.results?.slice(0, 3).map((alert) => (
                <TouchableOpacity
                  key={alert.id}
                  style={styles.alertItem}
                  onPress={() => router.push(`/alert/${alert.id}`)}
                >
                  <View style={[
                    styles.alertSeverity,
                    { backgroundColor: theme.colors.alert[alert.severity] },
                  ]} />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle} numberOfLines={1}>
                      {alert.rule_name || 'Alerta'}
                    </Text>
                    <Text style={styles.alertAsset} numberOfLines={1}>
                      {alert.asset_name}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.neutral[400]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Recent Work Orders */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Clock size={20} color={theme.colors.neutral[600]} />
              <Text style={styles.cardTitle}>OS Recentes</Text>
            </View>
          </View>

          {myOrders?.results?.length === 0 ? (
            <View style={styles.emptyState}>
              <ClipboardList size={32} color={theme.colors.neutral[300]} />
              <Text style={styles.emptyStateText}>Nenhuma OS atribuída</Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {myOrders?.results?.slice(0, 5).map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderItem}
                  onPress={() => router.push(`/work-order/${order.id}`)}
                >
                  <View style={[
                    styles.orderStatus,
                    { backgroundColor: theme.colors.workOrder[order.status] },
                  ]} />
                  <View style={styles.orderContent}>
                    <Text style={styles.orderTitle} numberOfLines={1}>
                      {order.title}
                    </Text>
                    <Text style={styles.orderInfo} numberOfLines={1}>
                      {order.asset_name} • {order.number}
                    </Text>
                  </View>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: theme.colors.priority[order.priority] + '20' },
                  ]}>
                    <Text style={[
                      styles.priorityText,
                      { color: theme.colors.priority[order.priority] },
                    ]}>
                      {order.priority === 'CRITICAL' ? 'Urgente' :
                       order.priority === 'HIGH' ? 'Alta' :
                       order.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                    </Text>
                  </View>
                </TouchableOpacity>
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
    backgroundColor: theme.colors.neutral[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[4],
  },
  greeting: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  tenantName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  online: {
    backgroundColor: theme.colors.semantic.success + '15',
  },
  offline: {
    backgroundColor: theme.colors.semantic.error + '15',
  },
  connectionText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  onlineText: {
    color: theme.colors.semantic.success,
  },
  offlineText: {
    color: theme.colors.semantic.error,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.semantic.warning + '15',
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[4],
  },
  syncBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBannerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[700],
  },
  syncBannerAction: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.semantic.warning,
  },
  quickActions: {
    marginBottom: theme.spacing[4],
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    gap: 12,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.white,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  cardAction: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.primary[600],
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
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: '700',
    color: theme.colors.neutral[900],
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.neutral[200],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
    gap: 8,
  },
  emptyStateText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
  },
  alertsList: {
    gap: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    gap: 12,
  },
  alertSeverity: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.neutral[900],
  },
  alertAsset: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  ordersList: {
    gap: 8,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    gap: 12,
  },
  orderStatus: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  orderContent: {
    flex: 1,
  },
  orderTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.neutral[900],
  },
  orderInfo: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
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
});
