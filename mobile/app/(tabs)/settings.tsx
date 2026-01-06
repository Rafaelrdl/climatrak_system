// ============================================================
// ClimaTrak Mobile - Settings Screen
// ============================================================

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Building2,
  Bell,
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
import { cacheStorage, syncQueueStorage } from '@/shared/storage';
import { theme } from '@/theme';

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
          
          <View style={styles.card}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <User size={24} color={theme.colors.primary[600]} />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Building2 size={18} color={theme.colors.neutral[500]} />
                <Text style={styles.infoLabelText}>Organização</Text>
              </View>
              <Text style={styles.infoValue}>{tenant?.name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Shield size={18} color={theme.colors.neutral[500]} />
                <Text style={styles.infoLabelText}>Função</Text>
              </View>
              <Text style={styles.infoValue}>
                {user?.role === 'technician' ? 'Técnico' : 
                 user?.role === 'admin' ? 'Administrador' : 
                 user?.role || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sync Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sincronização</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                {isOnline ? (
                  <Wifi size={18} color={theme.colors.semantic.success} />
                ) : (
                  <WifiOff size={18} color={theme.colors.semantic.error} />
                )}
                <Text style={styles.infoLabelText}>Conexão</Text>
              </View>
              <View style={[
                styles.statusBadge,
                isOnline ? styles.statusOnline : styles.statusOffline,
              ]}>
                <Text style={[
                  styles.statusText,
                  isOnline ? styles.statusTextOnline : styles.statusTextOffline,
                ]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <CloudOff size={18} color={theme.colors.neutral[500]} />
                <Text style={styles.infoLabelText}>Pendentes</Text>
              </View>
              <Text style={[
                styles.infoValue,
                pendingCount > 0 && { color: theme.colors.semantic.warning },
              ]}>
                {pendingCount} {pendingCount === 1 ? 'item' : 'itens'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <RefreshCw size={18} color={theme.colors.neutral[500]} />
                <Text style={styles.infoLabelText}>Última sincronização</Text>
              </View>
              <Text style={styles.infoValue}>{formatDate(lastSyncAt)}</Text>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[
                styles.actionButton,
                (!isOnline || isSyncing) && styles.actionButtonDisabled,
              ]}
              onPress={handleSync}
              disabled={!isOnline || isSyncing}
            >
              <RefreshCw 
                size={18} 
                color={isOnline ? theme.colors.primary[600] : theme.colors.neutral[400]} 
              />
              <Text style={[
                styles.actionButtonText,
                (!isOnline || isSyncing) && styles.actionButtonTextDisabled,
              ]}>
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aplicativo</Text>
          
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
              <Trash2 size={18} color={theme.colors.neutral[600]} />
              <Text style={styles.menuItemText}>Limpar Cache</Text>
              <ChevronRight size={18} color={theme.colors.neutral[400]} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.menuItem}>
              <Info size={18} color={theme.colors.neutral[600]} />
              <Text style={styles.menuItemText}>Versão</Text>
              <Text style={styles.menuItemValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={theme.colors.semantic.error} />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

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
    backgroundColor: theme.colors.neutral[50],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing[2],
    marginLeft: theme.spacing[1],
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    ...theme.shadows.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  userEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.neutral[100],
    marginVertical: theme.spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabelText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
  },
  infoValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.neutral[900],
  },
  statusBadge: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
  },
  statusOnline: {
    backgroundColor: theme.colors.semantic.success + '15',
  },
  statusOffline: {
    backgroundColor: theme.colors.semantic.error + '15',
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  statusTextOnline: {
    color: theme.colors.semantic.success,
  },
  statusTextOffline: {
    color: theme.colors.semantic.error,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: theme.colors.neutral[100],
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  actionButtonTextDisabled: {
    color: theme.colors.neutral[400],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[700],
  },
  menuItemValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.semantic.error + '10',
    gap: 8,
    marginBottom: theme.spacing[6],
  },
  logoutText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.semantic.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.neutral[400],
  },
  footerSubtext: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[300],
    marginTop: 4,
  },
});
