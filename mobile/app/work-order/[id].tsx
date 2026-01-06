// ============================================================
// ClimaTrak Mobile - Work Order Detail Screen
// ============================================================

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  Camera,
  Wrench,
  ClipboardCheck,
  ChevronRight,
  Package,
} from 'lucide-react-native';
import { workOrderService } from '@/shared/api';
import { useSyncStore } from '@/store';
import { theme } from '@/theme';
import type { WorkOrder } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  ON_HOLD: 'Em Espera',
  PENDING_REVIEW: 'Aguardando Revisão',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Urgente',
};

const TYPE_LABELS: Record<string, string> = {
  CORRECTIVE: 'Corretiva',
  PREVENTIVE: 'Preventiva',
  PREDICTIVE: 'Preditiva',
  INSPECTION: 'Inspeção',
};

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isOnline } = useSyncStore();

  // Fetch work order
  const { data: workOrder, isLoading, error } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => workOrderService.getById(id!),
    enabled: !!id,
  });

  // Start mutation
  const startMutation = useMutation({
    mutationFn: () => workOrderService.start(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-work-orders'] });
      Alert.alert('Sucesso', 'OS iniciada');
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível iniciar a OS');
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: (notes?: string) => workOrderService.complete(id!, notes ? { notes } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-work-orders'] });
      Alert.alert('Sucesso', 'OS concluída', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível concluir a OS');
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (reason: string) => workOrderService.cancel(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-work-orders'] });
      Alert.alert('Sucesso', 'OS cancelada', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível cancelar a OS');
    },
  });

  const handleStart = () => {
    Alert.alert(
      'Iniciar OS',
      'Deseja iniciar esta ordem de serviço?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar', onPress: () => startMutation.mutate() },
      ]
    );
  };

  const handleComplete = () => {
    Alert.prompt(
      'Concluir OS',
      'Adicione observações (opcional):',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Concluir', 
          onPress: (notes) => completeMutation.mutate(notes),
        },
      ],
      'plain-text'
    );
  };

  const handleCancel = () => {
    Alert.prompt(
      'Cancelar OS',
      'Informe o motivo do cancelamento:',
      [
        { text: 'Voltar', style: 'cancel' },
        { 
          text: 'Cancelar OS', 
          style: 'destructive',
          onPress: (reason) => {
            if (reason?.trim()) {
              cancelMutation.mutate(reason);
            } else {
              Alert.alert('Atenção', 'Informe o motivo do cancelamento');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (error || !workOrder) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle size={48} color={theme.colors.semantic.error} />
        <Text style={styles.errorText}>Erro ao carregar OS</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canStart = workOrder.status === 'OPEN';
  const canComplete = workOrder.status === 'IN_PROGRESS';
  const canCancel = ['OPEN', 'IN_PROGRESS'].includes(workOrder.status);
  const isMutating = startMutation.isPending || completeMutation.isPending || cancelMutation.isPending;

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: workOrder.number,
        }} 
      />
      
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          {/* Status Header */}
          <View style={styles.statusHeader}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: theme.colors.workOrder[workOrder.status] + '20' },
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: theme.colors.workOrder[workOrder.status] },
              ]} />
              <Text style={[
                styles.statusText,
                { color: theme.colors.workOrder[workOrder.status] },
              ]}>
                {STATUS_LABELS[workOrder.status]}
              </Text>
            </View>

            <View style={[
              styles.priorityBadge,
              { backgroundColor: theme.colors.priority[workOrder.priority] + '15' },
            ]}>
              <Text style={[
                styles.priorityText,
                { color: theme.colors.priority[workOrder.priority] },
              ]}>
                {PRIORITY_LABELS[workOrder.priority]}
              </Text>
            </View>

            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>
                {TYPE_LABELS[workOrder.type]}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{workOrder.title}</Text>

          {/* Description */}
          {workOrder.description && (
            <Text style={styles.description}>{workOrder.description}</Text>
          )}

          {/* Info Cards */}
          <View style={styles.infoSection}>
            {/* Asset */}
            {workOrder.asset_id && (
              <TouchableOpacity
                style={styles.infoCard}
                onPress={() => router.push(`/asset/${workOrder.asset_id}`)}
              >
                <MapPin size={20} color={theme.colors.primary[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ativo</Text>
                  <Text style={styles.infoValue}>{workOrder.asset_name}</Text>
                </View>
                <ChevronRight size={18} color={theme.colors.neutral[400]} />
              </TouchableOpacity>
            )}

            {/* Assigned To */}
            {workOrder.assigned_to_name && (
              <View style={styles.infoCard}>
                <User size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Responsável</Text>
                  <Text style={styles.infoValue}>{workOrder.assigned_to_name}</Text>
                </View>
              </View>
            )}

            {/* Created At */}
            <View style={styles.infoCard}>
              <Calendar size={20} color={theme.colors.neutral[600]} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Criada em</Text>
                <Text style={styles.infoValue}>{formatDate(workOrder.created_at)}</Text>
              </View>
            </View>

            {/* Due Date */}
            {workOrder.due_date && (
              <View style={styles.infoCard}>
                <Clock size={20} color={theme.colors.neutral[600]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Prazo</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(workOrder.due_date)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          {workOrder.status !== 'COMPLETED' && workOrder.status !== 'CANCELLED' && (
            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>Ações Rápidas</Text>
              
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
                >
                  <Camera size={24} color={theme.colors.primary[600]} />
                  <Text style={styles.actionText}>Fotos</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
                >
                  <Clock size={24} color={theme.colors.primary[600]} />
                  <Text style={styles.actionText}>Tempo</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
                >
                  <Package size={24} color={theme.colors.primary[600]} />
                  <Text style={styles.actionText}>Peças</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
                >
                  <ClipboardCheck size={24} color={theme.colors.primary[600]} />
                  <Text style={styles.actionText}>Checklist</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {(canStart || canComplete || canCancel) && (
          <View style={styles.actionBar}>
            {canStart && (
              <TouchableOpacity
                style={[styles.primaryButton, isMutating && styles.buttonDisabled]}
                onPress={handleStart}
                disabled={isMutating}
              >
                {startMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <Play size={20} color={theme.colors.white} />
                    <Text style={styles.primaryButtonText}>Iniciar OS</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {canComplete && (
              <TouchableOpacity
                style={[styles.primaryButton, styles.successButton, isMutating && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={isMutating}
              >
                {completeMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <CheckCircle2 size={20} color={theme.colors.white} />
                    <Text style={styles.primaryButtonText}>Concluir</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {canCancel && (
              <TouchableOpacity
                style={[styles.secondaryButton, isMutating && styles.buttonDisabled]}
                onPress={handleCancel}
                disabled={isMutating}
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.semantic.error} />
                ) : (
                  <>
                    <XCircle size={20} color={theme.colors.semantic.error} />
                    <Text style={styles.secondaryButtonText}>Cancelar</Text>
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
  priorityBadge: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
  },
  priorityText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
  },
  typeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.neutral[600],
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
  quickActions: {
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing[3],
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    gap: 8,
    ...theme.shadows.sm,
  },
  actionText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
    color: theme.colors.neutral[700],
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.semantic.error + '10',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.semantic.error,
  },
});
