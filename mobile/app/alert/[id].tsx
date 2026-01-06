// ============================================================
// ClimaTrak Mobile - Alert Detail Screen
// ============================================================

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  ChevronRight,
  Bell,
  BellOff,
  ClipboardList,
  Thermometer,
  Activity,
} from 'lucide-react-native';
import { alertService } from '@/shared/api';
import { useSyncStore } from '@/store';
import { theme } from '@/theme';

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  acknowledged: 'Reconhecido',
  resolved: 'Resolvido',
};

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isOnline } = useSyncStore();

  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);

  // Fetch alert
  const { data: alert, isLoading, error } = useQuery({
    queryKey: ['alert', id],
    queryFn: () => alertService.getById(id!),
    enabled: !!id,
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (notes?: string) => alertService.acknowledge(id!, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert', id] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      RNAlert.alert('Sucesso', 'Alerta reconhecido');
      setShowNotesInput(false);
      setNotes('');
    },
    onError: () => {
      RNAlert.alert('Erro', 'Não foi possível reconhecer o alerta');
    },
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: (resolution_notes: string) => alertService.resolve(id!, resolution_notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert', id] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      RNAlert.alert('Sucesso', 'Alerta resolvido', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      RNAlert.alert('Erro', 'Não foi possível resolver o alerta');
    },
  });

  const handleAcknowledge = () => {
    if (showNotesInput) {
      acknowledgeMutation.mutate(notes || undefined);
    } else {
      setShowNotesInput(true);
    }
  };

  const handleResolve = () => {
    RNAlert.prompt(
      'Resolver Alerta',
      'Descreva a resolução do problema:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Resolver', 
          onPress: (resolution) => {
            if (resolution?.trim()) {
              resolveMutation.mutate(resolution);
            } else {
              RNAlert.alert('Atenção', 'Descreva a resolução do problema');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleCreateWorkOrder = async () => {
    if (!alert) return;

    try {
      const result = await alertService.createWorkOrder(id!, {
        title: `Correção: ${alert.rule_name || 'Alerta do Sistema'}`,
        description: alert.message || '',
        priority: alert.severity === 'critical' ? 'urgent' : 
                  alert.severity === 'high' ? 'high' : 'medium',
        type: 'corrective',
      });

      RNAlert.alert(
        'Sucesso',
        'Ordem de serviço criada',
        [
          { 
            text: 'Ver OS', 
            onPress: () => router.push(`/work-order/${result.work_order_id}`),
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      RNAlert.alert('Erro', 'Não foi possível criar a ordem de serviço');
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} minuto${diffMins !== 1 ? 's' : ''} atrás`;
    } else if (diffHours < 24) {
      return `${diffHours} hora${diffHours !== 1 ? 's' : ''} atrás`;
    } else {
      return `${diffDays} dia${diffDays !== 1 ? 's' : ''} atrás`;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (error || !alert) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle size={48} color={theme.colors.semantic.error} />
        <Text style={styles.errorText}>Erro ao carregar alerta</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canAcknowledge = alert.status === 'active';
  const canResolve = alert.status !== 'resolved';
  const isMutating = acknowledgeMutation.isPending || resolveMutation.isPending;

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Detalhes do Alerta',
        }} 
      />
      
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          {/* Severity Card */}
          <View style={[
            styles.severityCard,
            { backgroundColor: theme.colors.alert[alert.severity] + '15' },
          ]}>
            <View style={[
              styles.severityIconContainer,
              { backgroundColor: theme.colors.alert[alert.severity] },
            ]}>
              <AlertTriangle size={28} color={theme.colors.white} />
            </View>
            <View style={styles.severityContent}>
              <Text style={[
                styles.severityLabel,
                { color: theme.colors.alert[alert.severity] },
              ]}>
                {SEVERITY_LABELS[alert.severity]}
              </Text>
              <Text style={styles.severityTime}>
                {formatTimeAgo(alert.triggered_at)}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: 
                alert.status === 'active' 
                  ? theme.colors.semantic.error + '20'
                  : alert.status === 'acknowledged'
                    ? theme.colors.semantic.warning + '20'
                    : theme.colors.semantic.success + '20'
              },
            ]}>
              {alert.status === 'resolved' ? (
                <CheckCircle size={14} color={theme.colors.semantic.success} />
              ) : alert.status === 'acknowledged' ? (
                <BellOff size={14} color={theme.colors.semantic.warning} />
              ) : (
                <Bell size={14} color={theme.colors.semantic.error} />
              )}
              <Text style={[
                styles.statusText,
                { color: 
                  alert.status === 'active' 
                    ? theme.colors.semantic.error
                    : alert.status === 'acknowledged'
                      ? theme.colors.semantic.warning
                      : theme.colors.semantic.success
                },
              ]}>
                {STATUS_LABELS[alert.status]}
              </Text>
            </View>
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>
            {alert.rule_name || 'Alerta do Sistema'}
          </Text>

          {alert.message && (
            <Text style={styles.message}>{alert.message}</Text>
          )}

          {/* Info Cards */}
          <View style={styles.infoSection}>
            {/* Asset */}
            {alert.asset_id && (
              <TouchableOpacity
                style={styles.infoCard}
                onPress={() => router.push(`/asset/${alert.asset_id}`)}
              >
                <MapPin size={20} color={theme.colors.primary[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ativo</Text>
                  <Text style={styles.infoValue}>{alert.asset_name}</Text>
                </View>
                <ChevronRight size={18} color={theme.colors.neutral[400]} />
              </TouchableOpacity>
            )}

            {/* Sensor */}
            {alert.sensor_name && (
              <View style={styles.infoCard}>
                <Thermometer size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Sensor</Text>
                  <Text style={styles.infoValue}>{alert.sensor_name}</Text>
                </View>
              </View>
            )}

            {/* Value */}
            {alert.value !== undefined && (
              <View style={styles.infoCard}>
                <Activity size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Valor registrado</Text>
                  <Text style={styles.infoValue}>
                    {alert.value} {alert.unit || ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Triggered At */}
            <View style={styles.infoCard}>
              <Clock size={20} color={theme.colors.neutral[600]} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Disparado em</Text>
                <Text style={styles.infoValue}>
                  {formatDateTime(alert.triggered_at)}
                </Text>
              </View>
            </View>

            {/* Acknowledged At */}
            {alert.acknowledged_at && (
              <View style={styles.infoCard}>
                <BellOff size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Reconhecido em</Text>
                  <Text style={styles.infoValue}>
                    {formatDateTime(alert.acknowledged_at)}
                  </Text>
                </View>
              </View>
            )}

            {/* Resolved At */}
            {alert.resolved_at && (
              <View style={styles.infoCard}>
                <CheckCircle size={20} color={theme.colors.semantic.success} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Resolvido em</Text>
                  <Text style={styles.infoValue}>
                    {formatDateTime(alert.resolved_at)}
                  </Text>
                </View>
              </View>
            )}

            {/* Resolution Notes */}
            {alert.resolution_notes && (
              <View style={styles.notesCard}>
                <Text style={styles.notesLabel}>Notas de Resolução</Text>
                <Text style={styles.notesText}>{alert.resolution_notes}</Text>
              </View>
            )}
          </View>

          {/* Notes Input */}
          {showNotesInput && (
            <View style={styles.notesInputContainer}>
              <Text style={styles.notesInputLabel}>Observações (opcional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Adicione observações..."
                placeholderTextColor={theme.colors.neutral[400]}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* Create Work Order */}
          {alert.status !== 'resolved' && (
            <TouchableOpacity
              style={styles.createWOButton}
              onPress={handleCreateWorkOrder}
            >
              <ClipboardList size={20} color={theme.colors.primary[600]} />
              <Text style={styles.createWOText}>Criar Ordem de Serviço</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {(canAcknowledge || canResolve) && (
          <View style={styles.actionBar}>
            {canAcknowledge && (
              <TouchableOpacity
                style={[styles.primaryButton, isMutating && styles.buttonDisabled]}
                onPress={handleAcknowledge}
                disabled={isMutating}
              >
                {acknowledgeMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <BellOff size={20} color={theme.colors.white} />
                    <Text style={styles.primaryButtonText}>
                      {showNotesInput ? 'Confirmar' : 'Reconhecer'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {canResolve && (
              <TouchableOpacity
                style={[
                  styles.primaryButton, 
                  styles.successButton,
                  isMutating && styles.buttonDisabled,
                ]}
                onPress={handleResolve}
                disabled={isMutating}
              >
                {resolveMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <CheckCircle size={20} color={theme.colors.white} />
                    <Text style={styles.primaryButtonText}>Resolver</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
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
  severityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[4],
    gap: 12,
  },
  severityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityContent: {
    flex: 1,
  },
  severityLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
  },
  severityTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[2],
    lineHeight: 28,
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[600],
    lineHeight: 24,
    marginBottom: theme.spacing[4],
  },
  infoSection: {
    gap: 8,
    marginBottom: theme.spacing[4],
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
  notesCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  notesLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing[2],
  },
  notesText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[700],
    lineHeight: 22,
  },
  notesInputContainer: {
    marginBottom: theme.spacing[4],
  },
  notesInputLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing[2],
  },
  notesInput: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[900],
    minHeight: 80,
    textAlignVertical: 'top',
  },
  createWOButton: {
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
    marginBottom: theme.spacing[4],
  },
  createWOText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  actionBar: {
    flexDirection: 'row',
    padding: theme.spacing[4],
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    gap: 8,
  },
  successButton: {
    backgroundColor: theme.colors.semantic.success,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.white,
  },
});
