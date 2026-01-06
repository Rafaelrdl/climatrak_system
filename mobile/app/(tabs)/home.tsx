// ============================================================
// ClimaTrak Mobile - Home Screen (Platform Design System 2.0)
// ============================================================

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
  Zap,
} from 'lucide-react-native';

// Design system imports - Platform Design
import { colors, spacing, radius, typography, shadows, iconSizes } from '@/theme/tokens';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  StatusBadge,
  StatCard,
  StatRow,
} from '@/components/ui';
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
        {/* Header - Design System Platform */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Olá, {firstName} 👋</Text>
            <Text style={styles.tenantName}>{tenant?.name}</Text>
          </View>
          
          {/* Connection Status Badge */}
          <StatusBadge 
            status={isOnline ? 'online' : 'offline'} 
            size="sm"
          />
        </View>

        {/* Pending Sync Banner - Improved UX */}
        {pendingCount > 0 && (
          <Pressable 
            style={({ pressed }) => [
              styles.syncBanner,
              pressed && styles.syncBannerPressed,
            ]}
            onPress={syncAll}
            disabled={!isOnline || isSyncing}
          >
            <View style={styles.syncBannerContent}>
              <View style={styles.syncIconWrapper}>
                <Clock size={iconSizes.md} color={colors.warning.DEFAULT} />
              </View>
              <View style={styles.syncTextWrapper}>
                <Text style={styles.syncBannerTitle}>
                  {pendingCount} {pendingCount === 1 ? 'item pendente' : 'itens pendentes'}
                </Text>
                <Text style={styles.syncBannerSubtitle}>
                  {isSyncing ? 'Sincronizando...' : 'Toque para sincronizar'}
                </Text>
              </View>
            </View>
            {isOnline && !isSyncing && (
              <Zap size={iconSizes.md} color={colors.warning.DEFAULT} />
            )}
          </Pressable>
        )}

        {/* Quick Actions - Primary CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.quickActionButton,
            pressed && styles.quickActionPressed,
          ]}
          onPress={() => router.push('/scanner')}
        >
          <View style={styles.quickActionIcon}>
            <QrCode size={iconSizes.lg} color={colors.white} />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionText}>Escanear QR Code</Text>
            <Text style={styles.quickActionSubtext}>Acesso rápido ao ativo</Text>
          </View>
          <ChevronRight size={iconSizes.md} color={colors.primary[300]} />
        </Pressable>

        {/* Work Order Stats - Platform Design */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Minhas Ordens de Serviço</Text>
          <StatRow style={styles.statsRow}>
            <StatCard
              title="Pendentes"
              value={orderStats.pending}
              variant={orderStats.pending > 0 ? 'warning' : 'default'}
              compact
              onPress={() => router.push('/(tabs)/work-orders')}
              style={styles.statCardFlex}
            />
            <StatCard
              title="Em Andamento"
              value={orderStats.in_progress}
              variant={orderStats.in_progress > 0 ? 'primary' : 'default'}
              compact
              onPress={() => router.push('/(tabs)/work-orders')}
              style={styles.statCardFlex}
            />
          </StatRow>
        </View>

        {/* Active Alerts - Platform Design */}
        <Card variant="default" style={styles.sectionCard}>
          <CardHeader row>
            <View style={styles.cardTitleRow}>
              <AlertTriangle size={iconSizes.md} color={colors.status.critical} />
              <CardTitle size="sm">Alertas Ativos</CardTitle>
            </View>
            <Pressable 
              onPress={() => router.push('/(tabs)/alerts')}
              hitSlop={8}
            >
              <Text style={styles.cardAction}>Ver todos</Text>
            </Pressable>
          </CardHeader>
          <CardContent compact>
            {activeAlerts?.results?.length === 0 ? (
              <View style={styles.emptyState}>
                <CheckCircle2 size={iconSizes['2xl']} color={colors.status.online} />
                <Text style={styles.emptyStateText}>Nenhum alerta ativo</Text>
                <Text style={styles.emptyStateSubtext}>Todos os sistemas operando normalmente</Text>
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
          </CardContent>
        </Card>

        {/* Recent Work Orders - Platform Design */}
        <Card variant="default" style={styles.sectionCard}>
          <CardHeader row>
            <View style={styles.cardTitleRow}>
              <Clock size={iconSizes.md} color={colors.muted.foreground} />
              <CardTitle size="sm">OS Recentes</CardTitle>
            </View>
          </CardHeader>
          <CardContent compact>
            {myOrders?.results?.length === 0 ? (
              <View style={styles.emptyState}>
                <ClipboardList size={iconSizes['2xl']} color={colors.muted.foreground} />
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
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // === CONTAINER ===
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
    gap: spacing[4],
  },

  // === HEADER ===
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    letterSpacing: typography.tracking.tight,
  },
  tenantName: {
    fontSize: typography.sizes.sm,
    color: colors.muted.foreground,
    marginTop: spacing[0.5],
  },

  // === SYNC BANNER ===
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warning.background,
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning.light,
  },
  syncBannerPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  syncBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  syncIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.status.warningBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncTextWrapper: {
    flex: 1,
  },
  syncBannerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
  },
  syncBannerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.warning.dark,
    marginTop: spacing[0.5],
  },

  // === QUICK ACTION ===
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
    padding: spacing[4],
    borderRadius: radius.lg,
    gap: spacing[3],
    ...shadows.md,
  },
  quickActionPressed: {
    backgroundColor: colors.primary.dark,
    transform: [{ scale: 0.98 }],
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  quickActionSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.primary[200],
    marginTop: spacing[0.5],
  },

  // === STATS SECTION ===
  statsSection: {
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.muted.foreground,
    textTransform: 'uppercase',
    letterSpacing: typography.tracking.wide,
    marginLeft: spacing[1],
  },
  statsRow: {
    marginTop: spacing[1],
  },
  statCardFlex: {
    flex: 1,
  },

  // === CARDS ===
  sectionCard: {
    // Card styling handled by Card component
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  cardAction: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary.DEFAULT,
  },

  // === EMPTY STATE ===
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[2],
  },
  emptyStateText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },
  emptyStateSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.muted.foreground,
  },

  // === LISTS ===
  alertsList: {
    gap: spacing[2],
  },
  ordersList: {
    gap: spacing[2],
  },
});
