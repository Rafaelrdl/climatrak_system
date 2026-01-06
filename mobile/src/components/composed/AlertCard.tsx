/**
 * AlertCard Component
 *
 * Card composto para exibição de alertas.
 * Usa os primitivos Card e Badge do design system.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle,
  Bell,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '../../theme/tokens';
import { Badge } from '../ui/Badge';
import type { Alert, AlertSeverity, AlertStatus } from '../../types';

export interface AlertCardProps {
  /** Dados do alerta */
  alert: Alert;
  /** Callback ao pressionar o card */
  onPress?: (alert: Alert) => void;
  /** Variante de exibição */
  variant?: 'default' | 'compact';
}

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  CRITICAL: 'Crítico',
  HIGH: 'Alto',
  WARNING: 'Alerta',
  MEDIUM: 'Médio',
  LOW: 'Baixo',
  INFO: 'Info',
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  ACTIVE: 'Ativo',
  ACKNOWLEDGED: 'Reconhecido',
  RESOLVED: 'Resolvido',
};

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  CRITICAL: colors.destructive.DEFAULT,
  HIGH: '#f97316', // orange-500
  WARNING: colors.status.warning,
  MEDIUM: colors.status.warning,
  LOW: colors.primary.DEFAULT,
  INFO: colors.neutral[500],
};

const STATUS_COLORS: Record<AlertStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: colors.status.criticalLight, text: colors.status.critical },
  ACKNOWLEDGED: { bg: colors.status.warningLight, text: colors.status.warning },
  RESOLVED: { bg: colors.status.onlineLight, text: colors.status.online },
};

/**
 * Formata tempo relativo
 */
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins}min atrás`;
  } else if (diffHours < 24) {
    return `${diffHours}h atrás`;
  } else {
    return `${diffDays}d atrás`;
  }
};

/**
 * AlertCard para listagem de alertas
 *
 * @example
 * <AlertCard
 *   alert={alertData}
 *   onPress={(alert) => router.push(`/alert/${alert.id}`)}
 * />
 */
export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onPress,
  variant = 'default',
}) => {
  const severityColor = SEVERITY_COLORS[alert.severity] || colors.neutral[400];
  const statusColors = STATUS_COLORS[alert.status];

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={() => onPress?.(alert)}
        activeOpacity={0.7}
      >
        <View style={[styles.severityBarCompact, { backgroundColor: severityColor }]} />
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {alert.rule_name || 'Alerta'}
          </Text>
          <Text style={styles.compactAsset} numberOfLines={1}>
            {alert.asset_name}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.neutral[400]} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(alert)}
      activeOpacity={0.7}
    >
      {/* Severity indicator bar */}
      <View style={[styles.severityBar, { backgroundColor: severityColor }]} />

      <View style={styles.content}>
        {/* Header with badges */}
        <View style={styles.header}>
          <View style={[styles.severityBadge, { backgroundColor: severityColor + '15' }]}>
            <AlertTriangle size={14} color={severityColor} />
            <Text style={[styles.severityText, { color: severityColor }]}>
              {SEVERITY_LABELS[alert.severity]}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            {alert.status === 'RESOLVED' ? (
              <CheckCircle size={12} color={statusColors.text} />
            ) : (
              <Bell size={12} color={statusColors.text} />
            )}
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {STATUS_LABELS[alert.status]}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {alert.rule_name || 'Alerta do Sistema'}
        </Text>

        {/* Message */}
        {alert.message && (
          <Text style={styles.message} numberOfLines={2}>
            {alert.message}
          </Text>
        )}

        {/* Meta info */}
        <View style={styles.meta}>
          {alert.asset_name && (
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.muted.foreground} />
              <Text style={styles.metaText} numberOfLines={1}>
                {alert.asset_name}
              </Text>
            </View>
          )}

          <View style={styles.metaItem}>
            <Clock size={14} color={colors.muted.foreground} />
            <Text style={styles.metaText}>
              {formatTimeAgo(alert.triggered_at)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {alert.sensor_name && (
            <Text style={styles.sensorText} numberOfLines={1}>
              Sensor: {alert.sensor_name}
            </Text>
          )}
          <ChevronRight size={18} color={colors.neutral[400]} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * AlertCardSkeleton para loading state
 */
export const AlertCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <View style={[styles.severityBar, { backgroundColor: colors.neutral[200] }]} />
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={[styles.skeletonBadge, { width: 80 }]} />
        <View style={[styles.skeletonBadge, { width: 60 }]} />
      </View>
      <View style={[styles.skeletonLine, { width: '80%', height: 18 }]} />
      <View style={[styles.skeletonLine, { width: '100%', height: 14 }]} />
      <View style={[styles.skeletonLine, { width: '60%', height: 14 }]} />
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

  severityBar: {
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

  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    gap: 4,
  },

  severityText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    gap: 4,
  },

  statusText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
  },

  title: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    color: colors.foreground,
    marginBottom: spacing[1],
    lineHeight: 22,
  },

  message: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    color: colors.muted.foreground,
    marginBottom: spacing[3],
    lineHeight: 20,
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
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  sensorText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    color: colors.muted.foreground,
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

  severityBarCompact: {
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

  compactAsset: {
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

export default AlertCard;
