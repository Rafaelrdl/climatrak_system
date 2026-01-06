// ============================================================
// ClimaTrak Mobile - Settings Screen (Migrated to Design System)
// ============================================================

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Building2,
  Wifi,
  WifiOff,
  CloudOff,
  Trash2,
  LogOut,
  ChevronRight,
  RefreshCw,
  Info,
  Shield,
} from 'lucide-react-native';
import { useAuthStore, useSyncStore } from '@/store';
import { cacheStorage } from '@/shared/storage';
import { colors, spacing, radius, typography, shadows, iconSizes } from '@/theme/tokens';
import { Card, CardContent, Button, Badge } from '@/components/ui';

export default function SettingsScreen() {
  const { user, tenant, logout } = useAuthStore();
  const { 
    isOnline, 
    pendingCount, 
    syncAll, 
    isSyncing,
    lastSyncAt,
  } = useSyncStore();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair? Os dados não sincronizados serão perdidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Limpar Cache',
      'Isso irá remover todos os dados em cache. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpar', 
          style: 'destructive',
          onPress: async () => {
            await cacheStorage.clearAll();
            Alert.alert('Sucesso', 'Cache limpo com sucesso');
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Você precisa estar online para sincronizar');
      return;
    }
    await syncAll();
    Alert.alert('Sucesso', 'Sincronização concluída');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* User Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          
          <Card style={styles.card}>
            <CardContent style={styles.cardContent}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <User size={iconSizes.lg} color={colors.primary[600]} />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
                  <Text style={styles.userEmail}>{user?.email}</Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Building2 size={iconSizes.sm} color={colors.neutral[500]} />
                  <Text style={styles.infoLabelText}>Organização</Text>
                </View>
                <Text style={styles.infoValue}>{tenant?.name}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Shield size={iconSizes.sm} color={colors.neutral[500]} />
                  <Text style={styles.infoLabelText}>Função</Text>
                </View>
                <Text style={styles.infoValue}>
                  {user?.role === 'technician' ? 'Técnico' : 
                   user?.role === 'admin' ? 'Administrador' : 
                   user?.role || 'N/A'}
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Sync Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sincronização</Text>
          
          <Card style={styles.card}>
            <CardContent style={styles.cardContent}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  {isOnline ? (
                    <Wifi size={iconSizes.sm} color={colors.status.online} />
                  ) : (
                    <WifiOff size={iconSizes.sm} color={colors.destructive.DEFAULT} />
                  )}
                  <Text style={styles.infoLabelText}>Conexão</Text>
                </View>
                <Badge 
                  variant={isOnline ? 'success' : 'destructive'}
                  size="sm"
                >
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <CloudOff size={iconSizes.sm} color={colors.neutral[500]} />
                  <Text style={styles.infoLabelText}>Pendentes</Text>
                </View>
                <Badge 
                  variant={pendingCount > 0 ? 'warning' : 'secondary'}
                  size="sm"
                >
                  {pendingCount} {pendingCount === 1 ? 'item' : 'itens'}
                </Badge>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <RefreshCw size={iconSizes.sm} color={colors.neutral[500]} />
                  <Text style={styles.infoLabelText}>Última sincronização</Text>
                </View>
                <Text style={styles.infoValue}>{formatDate(lastSyncAt)}</Text>
              </View>

              <View style={styles.divider} />

              <Button
                variant="secondary"
                onPress={handleSync}
                disabled={!isOnline || isSyncing}
                loading={isSyncing}
                leftIcon={<RefreshCw size={iconSizes.sm} color={isOnline ? colors.primary[600] : colors.neutral[400]} />}
                fullWidth
              >
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </Button>
            </CardContent>
          </Card>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aplicativo</Text>
          
          <Card style={styles.card}>
            <CardContent style={styles.cardContent}>
              <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
                <Trash2 size={iconSizes.sm} color={colors.neutral[600]} />
                <Text style={styles.menuItemText}>Limpar Cache</Text>
                <ChevronRight size={iconSizes.sm} color={colors.neutral[400]} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <View style={styles.menuItem}>
                <Info size={iconSizes.sm} color={colors.neutral[600]} />
                <Text style={styles.menuItemText}>Versão</Text>
                <Text style={styles.menuItemValue}>1.0.0</Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Logout Button */}
        <Button
          variant="destructive"
          onPress={handleLogout}
          leftIcon={<LogOut size={iconSizes.md} color={colors.white} />}
          fullWidth
          style={styles.logoutButton}
        >
          Sair da Conta
        </Button>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ClimaTrak Mobile</Text>
          <Text style={styles.footerSubtext}>© 2024 ClimaTrak</Text>
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
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  card: {
    ...shadows.sm,
  },
  cardContent: {
    padding: spacing[4],
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
  },
  userEmail: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  infoLabelText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral[900],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[3],
  },
  menuItemText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.neutral[700],
  },
  menuItemValue: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
  },
  logoutButton: {
    marginBottom: spacing[6],
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  footerText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral[400],
  },
  footerSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[300],
    marginTop: 4,
  },
});
