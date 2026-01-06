/**
 * WorkOrderCard Component
 *
 * Card composto para exibição de ordens de serviço.
 * Usa os primitivos Card e Badge do design system.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  ClipboardList,
  Clock,
  User,
  ChevronRight,
  MapPin,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '../../theme/tokens';
import { Badge } from '../ui/Badge';
import type { WorkOrder, WorkOrderStatus, WorkOrderPriority } from '../../types';

export interface WorkOrderCardProps {
  /** Dados da ordem de serviço */
  workOrder: WorkOrder;
  /** Callback ao pressionar o card */
  onPress?: (workOrder: WorkOrder) => void;
  /** Variante de exibição */
  variant?: 'default' | 'compact';
}

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em Andamento',
  ON_HOLD: 'Pausada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  PENDING_REVIEW: 'Aguardando Revisão',
};

const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Urgente',
};

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  OPEN: colors.workOrder.open,
  IN_PROGRESS: colors.workOrder.inProgress,
  ON_HOLD: colors.neutral[500],
  COMPLETED: colors.workOrder.completed,
  CANCELLED: colors.workOrder.cancelled,
  PENDING_REVIEW: colors.status.warning,
};

const PRIORITY_COLORS: Record<WorkOrderPriority, { bg: string; text: string }> = {
  LOW: { bg: colors.priority.lowBg, text: colors.priority.low },
  MEDIUM: { bg: colors.priority.mediumBg, text: colors.priority.medium },
  HIGH: { bg: colors.priority.highBg, text: colors.priority.high },
  CRITICAL: { bg: colors.priority.criticalBg, text: colors.priority.critical },
};

/**
 * Formata data relativa ou absoluta
 */
const formatDueDate = (dateString?: string): string | null => {
  if (!dateString) return null;

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Atrasada ${Math.abs(diffDays)}d`;
  } else if (diffDays === 0) {
    return 'Vence hoje';
  } else if (diffDays === 1) {
    return 'Vence amanhã';
  } else if (diffDays <= 7) {
    return `Vence em ${diffDays}d`;
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
};

/**
 * WorkOrderCard para listagem de OSs
 *
 * @example
 * <WorkOrderCard
 *   workOrder={orderData}
 *   onPress={(order) => router.push(`/work-order/${order.id}`)}
 * />
 */
export const WorkOrderCard: React.FC<WorkOrderCardProps> = ({
  workOrder,
  onPress,
  variant = 'default',
}) => {
  const statusColor = STATUS_COLORS[workOrder.status];
  const priorityColors = PRIORITY_COLORS[workOrder.priority];
  const dueDate = formatDueDate(workOrder.due_date);
  const isOverdue = workOrder.due_date && new Date(workOrder.due_date) < new Date();

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={() => onPress?.(workOrder)}
        activeOpacity={0.7}
      >
        <View style={[styles.statusBarCompact, { backgroundColor: statusColor }]} />
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {workOrder.title}
          </Text>
          <Text style={styles.compactInfo} numberOfLines={1}>
            {workOrder.asset_name} • {workOrder.number}
          </Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColors.bg }]}>
          <Text style={[styles.priorityText, { color: priorityColors.text }]}>
            {PRIORITY_LABELS[workOrder.priority]}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(workOrder)}
      activeOpacity={0.7}
    >
      {/* Status indicator bar */}
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

      <View style={styles.content}>
        {/* Header with number and priority */}
        <View style={styles.header}>
          <View style={styles.numberContainer}>
            <ClipboardList size={14} color={colors.muted.foreground} />
            <Text style={styles.number}>{workOrder.number}</Text>
          </View>

          <View style={[styles.priorityBadge, { backgroundColor: priorityColors.bg }]}>
            <Text style={[styles.priorityText, { color: priorityColors.text }]}>
              {PRIORITY_LABELS[workOrder.priority]}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {workOrder.title}
        </Text>

        {/* Status badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[workOrder.status]}
            </Text>
          </View>
        </View>

        {/* Meta info */}
        <View style={styles.meta}>
          {workOrder.asset_name && (
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.muted.foreground} />
              <Text style={styles.metaText} numberOfLines={1}>
                {workOrder.asset_name}
              </Text>
            </View>
          )}

          {workOrder.assigned_to_name && (
            <View style={styles.metaItem}>
              <User size={14} color={colors.muted.foreground} />
              <Text style={styles.metaText} numberOfLines={1}>
                {workOrder.assigned_to_name}
              </Text>
            </View>
          )}
        </View>

        {/* Footer with due date */}
        <View style={styles.footer}>
          {dueDate && (
            <View style={styles.dueDateContainer}>
              <Clock size={14} color={isOverdue ? colors.destructive.DEFAULT : colors.muted.foreground} />
              <Text style={[styles.dueDateText, isOverdue ? styles.overdueText : undefined]}>
                {dueDate}
              </Text>
            </View>
          )}
          <ChevronRight size={18} color={colors.neutral[400]} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * WorkOrderCardSkeleton para loading state
 */
export const WorkOrderCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <View style={[styles.statusBar, { backgroundColor: colors.neutral[200] }]} />
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={[styles.skeletonLine, { width: 80, height: 16 }]} />
        <View style={[styles.skeletonBadge, { width: 60 }]} />
      </View>
      <View style={[styles.skeletonLine, { width: '90%', height: 20 }]} />
      <View style={[styles.skeletonLine, { width: '60%', height: 24 }]} />
      <View style={[styles.skeletonLine, { width: '70%', height: 14 }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  // Default card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },

  statusBar: {
    width: 4,
  },

  content: {
    flex: 1,
    padding: spacing[4],
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },

  numberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  number: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    color: colors.muted.foreground,
  },

  title: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
    marginBottom: spacing[2],
    lineHeight: 22,
  },

  statusContainer: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    gap: 6,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
  },

  priorityBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
  },

  priorityText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
  },

  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[3],
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metaText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    color: colors.muted.foreground,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  dueDateText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    color: colors.muted.foreground,
  },

  overdueText: {
    color: colors.destructive.DEFAULT,
    fontWeight: typography.weights.medium,
  },

  // Compact variant
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    gap: spacing[3],
  },

  statusBarCompact: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },

  compactContent: {
    flex: 1,
  },

  compactTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
  },

  compactInfo: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    color: colors.muted.foreground,
    marginTop: 2,
  },

  // Skeleton
  skeletonBadge: {
    height: 24,
    backgroundColor: colors.neutral[200],
    borderRadius: radius.sm,
  },

  skeletonLine: {
    backgroundColor: colors.neutral[200],
    borderRadius: radius.sm,
    marginBottom: spacing[2],
  },
});

export default WorkOrderCard;
