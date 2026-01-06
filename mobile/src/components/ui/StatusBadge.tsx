/**
 * StatusBadge Component - Platform Design System
 *
 * Badge otimizado para exibição de status operacionais.
 * Cores semânticas para: online, offline, warning, critical, maintenance.
 * 
 * @see docs/design/DESIGN_SYSTEM.md - Seção 4.1 Status Operacional
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, radius, typography, iconSizes } from '../../theme/tokens';

// Tipos de status operacional
export type OperationalStatus = 
  | 'online' 
  | 'offline' 
  | 'warning' 
  | 'critical' 
  | 'info' 
  | 'maintenance'
  | 'pending'
  | 'unknown';

// Status de Work Order
export type WorkOrderStatus = 
  | 'open' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'on_hold';

// Prioridade
export type Priority = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'critical';

export type StatusBadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  /** Tipo de status */
  status: OperationalStatus | WorkOrderStatus | Priority;
  /** Texto do badge (opcional - usa label padrão se não informado) */
  label?: string;
  /** Tamanho do badge */
  size?: StatusBadgeSize;
  /** Mostrar ícone indicador */
  showDot?: boolean;
  /** Mostrar apenas o indicador (sem texto) */
  dotOnly?: boolean;
  /** Estilos customizados */
  style?: ViewStyle;
  /** Estilos do texto */
  textStyle?: TextStyle;
  /** Pulse animation para status crítico */
  pulse?: boolean;
}

// Labels padrão para cada status
const STATUS_LABELS: Record<string, string> = {
  // Operacional
  online: 'Online',
  offline: 'Offline',
  warning: 'Atenção',
  critical: 'Crítico',
  info: 'Info',
  maintenance: 'Manutenção',
  pending: 'Pendente',
  unknown: 'Desconhecido',
  // Work Order
  open: 'Aberta',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  on_hold: 'Em Espera',
  // Priority
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

// Mapeamento de cores por status
const getStatusColors = (status: string) => {
  const colorMap: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    // Status operacional
    online: {
      bg: colors.status.onlineBg,
      text: colors.status.online,
      dot: colors.status.online,
      border: 'transparent',
    },
    offline: {
      bg: colors.status.offlineBg,
      text: colors.status.offline,
      dot: colors.status.offline,
      border: 'transparent',
    },
    warning: {
      bg: colors.status.warningBg,
      text: colors.warning.dark,
      dot: colors.status.warning,
      border: 'transparent',
    },
    critical: {
      bg: colors.status.criticalBg,
      text: colors.destructive.dark,
      dot: colors.status.critical,
      border: 'transparent',
    },
    info: {
      bg: colors.status.infoBg,
      text: colors.primary.dark,
      dot: colors.status.info,
      border: 'transparent',
    },
    maintenance: {
      bg: colors.status.maintenanceBg,
      text: colors.accent.dark,
      dot: colors.status.maintenance,
      border: 'transparent',
    },
    pending: {
      bg: colors.status.warningBg,
      text: colors.warning.dark,
      dot: colors.warning.DEFAULT,
      border: 'transparent',
    },
    unknown: {
      bg: colors.neutral[100],
      text: colors.neutral[500],
      dot: colors.neutral[400],
      border: 'transparent',
    },
    // Work Order status
    open: {
      bg: colors.workOrder.openBg,
      text: colors.workOrder.open,
      dot: colors.workOrder.open,
      border: colors.workOrder.openBorder,
    },
    in_progress: {
      bg: colors.workOrder.inProgressBg,
      text: colors.warning.dark,
      dot: colors.workOrder.inProgress,
      border: colors.workOrder.inProgressBorder,
    },
    completed: {
      bg: colors.workOrder.completedBg,
      text: colors.success.dark,
      dot: colors.workOrder.completed,
      border: colors.workOrder.completedBorder,
    },
    cancelled: {
      bg: colors.workOrder.cancelledBg,
      text: colors.neutral[600],
      dot: colors.workOrder.cancelled,
      border: colors.workOrder.cancelledBorder,
    },
    on_hold: {
      bg: colors.workOrder.onHoldBg,
      text: colors.accent.dark,
      dot: colors.workOrder.onHold,
      border: colors.workOrder.onHoldBorder,
    },
    // Priority
    low: {
      bg: colors.priority.lowBg,
      text: colors.success.dark,
      dot: colors.priority.low,
      border: colors.priority.lowBorder,
    },
    medium: {
      bg: colors.priority.mediumBg,
      text: colors.warning.dark,
      dot: colors.priority.medium,
      border: colors.priority.mediumBorder,
    },
    high: {
      bg: colors.priority.highBg,
      text: '#c2410c', // orange-700
      dot: colors.priority.high,
      border: colors.priority.highBorder,
    },
  };

  return colorMap[status] || colorMap.unknown;
};

/**
 * StatusBadge - Badge semântico para status
 *
 * @example
 * // Status online
 * <StatusBadge status="online" />
 *
 * @example
 * // Work Order status com label customizado
 * <StatusBadge status="in_progress" label="Em execução" />
 *
 * @example
 * // Apenas indicador (dot)
 * <StatusBadge status="critical" dotOnly />
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  showDot = true,
  dotOnly = false,
  style,
  textStyle,
  pulse = false,
}) => {
  const statusColors = getStatusColors(status);
  const displayLabel = label || STATUS_LABELS[status] || status;

  // Dot only mode
  if (dotOnly) {
    return (
      <View
        style={[
          styles.dotOnly,
          styles[`dot_${size}` as keyof typeof styles],
          { backgroundColor: statusColors.dot },
          pulse && styles.pulse,
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.badge,
        styles[`badge_${size}` as keyof typeof styles],
        { backgroundColor: statusColors.bg },
        style,
      ]}
    >
      {showDot && (
        <View
          style={[
            styles.dot,
            styles[`dot_${size}` as keyof typeof styles],
            { backgroundColor: statusColors.dot },
            pulse && styles.pulse,
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          styles[`text_${size}` as keyof typeof styles],
          { color: statusColors.text },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // === BADGE CONTAINER ===
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
  },

  badge_sm: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    gap: spacing[1],
  },

  badge_md: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    gap: spacing[1.5],
  },

  badge_lg: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    gap: spacing[2],
  },

  // === DOT INDICATOR ===
  dot: {
    borderRadius: radius.full,
  },

  dot_sm: {
    width: 6,
    height: 6,
  },

  dot_md: {
    width: 8,
    height: 8,
  },

  dot_lg: {
    width: 10,
    height: 10,
  },

  // === DOT ONLY ===
  dotOnly: {
    borderRadius: radius.full,
  },

  // === TEXT ===
  text: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    letterSpacing: typography.tracking.tight,
  },

  text_sm: {
    fontSize: typography.sizes.xs,
  },

  text_md: {
    fontSize: typography.sizes.sm,
  },

  text_lg: {
    fontSize: typography.sizes.base,
  },

  // === PULSE ANIMATION (CSS-like, usar com Animated para efeito real) ===
  pulse: {
    // Em React Native real, usar Animated.loop com scale/opacity
  },
});

export default StatusBadge;
