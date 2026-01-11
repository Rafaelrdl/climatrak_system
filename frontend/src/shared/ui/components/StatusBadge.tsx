/**
 * StatusBadge - Badge de status com cores semânticas
 * 
 * Exibe status de entidades com cores consistentes em toda a plataforma.
 * 
 * @example
 * ```tsx
 * <StatusBadge status="IN_PROGRESS" />
 * <StatusBadge status="critical" type="priority" />
 * <StatusBadge status="online" type="connection" />
 * ```
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { buildBadgeStyle } from '../statusBadgeUtils';
import { 
  Circle, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock, 
  Wrench,
  Pause,
  Play,
  AlertTriangle
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
const statusTokenClasses = {
  info: 'bg-[color:var(--status-info-bg)] text-[color:var(--status-info-fg)] border-[color:var(--status-info-border)]',
  warning: 'bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning-fg)] border-[color:var(--status-warning-border)]',
  success: 'bg-[color:var(--status-success-bg)] text-[color:var(--status-success-fg)] border-[color:var(--status-success-border)]',
  danger: 'bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger-fg)] border-[color:var(--status-danger-border)]',
  neutral: 'bg-[color:var(--status-neutral-bg)] text-[color:var(--status-neutral-fg)] border-[color:var(--status-neutral-border)]',
  neutralMuted: 'bg-[color:var(--status-neutral-bg)] text-[color:var(--status-neutral-muted-fg)] border-[color:var(--status-neutral-border)]',
  accent: 'bg-[color:var(--status-accent-bg)] text-[color:var(--status-accent-fg)] border-[color:var(--status-accent-border)]',
};
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
type StatusConfigItem = {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ElementType;
  className?: string;
  style?: CSSProperties;
};
type StatusConfigMap = Record<string, StatusConfigItem>;

interface CmmsSettings {
  statuses: Array<{ id: string; label: string; color: string }>;
  types: Array<{ id: string; label: string; color: string }>;
}

// Configuração de status por categoria
const statusConfigs = {
  // Status de Ordem de Serviço
  workOrder: {
    OPEN: { 
      label: 'Aberta', 
      variant: 'secondary' as const, 
      icon: Circle,
      className: statusTokenClasses.info
    },
    IN_PROGRESS: { 
      label: 'Em Execução', 
      variant: 'default' as const, 
      icon: Play,
      className: statusTokenClasses.warning
    },
    ON_HOLD: { 
      label: 'Em Espera', 
      variant: 'secondary' as const, 
      icon: Pause,
      className: statusTokenClasses.neutral
    },
    COMPLETED: { 
      label: 'Concluída', 
      variant: 'outline' as const, 
      icon: CheckCircle2,
      className: statusTokenClasses.success
    },
    CANCELLED: { 
      label: 'Cancelada', 
      variant: 'destructive' as const, 
      icon: XCircle,
      className: statusTokenClasses.danger
    },
  },
  // Status de Equipamento/Ativo
  equipment: {
    OK: {
      label: 'Operacional',
      variant: 'outline' as const,
      icon: CheckCircle2,
      className: statusTokenClasses.success
    },
    MAINTENANCE: {
      label: 'Em Manutenção',
      variant: 'secondary' as const,
      icon: Wrench,
      className: statusTokenClasses.warning
    },
    ALERT: {
      label: 'Alerta',
      variant: 'outline' as const,
      icon: AlertTriangle,
      className: statusTokenClasses.warning
    },
    STOPPED: {
      label: 'Parado',
      variant: 'destructive' as const,
      icon: XCircle,
      className: statusTokenClasses.danger
    },
    OFFLINE: {
      label: 'Offline',
      variant: 'outline' as const,
      icon: Circle,
      className: statusTokenClasses.neutral
    },
    ACTIVE: {
      label: 'Operacional',
      variant: 'outline' as const,
      icon: CheckCircle2,
      className: statusTokenClasses.success
    },
    OPERATIONAL: {
      label: 'Operacional',
      variant: 'outline' as const,
      icon: CheckCircle2,
      className: statusTokenClasses.success
    },
    INACTIVE: {
      label: 'Inativo',
      variant: 'destructive' as const,
      icon: XCircle,
      className: statusTokenClasses.neutral
    },
    WARNING: {
      label: 'Atenção',
      variant: 'outline' as const,
      icon: AlertTriangle,
      className: statusTokenClasses.warning
    },
    CRITICAL: {
      label: 'Crítico',
      variant: 'destructive' as const,
      icon: AlertCircle,
      className: statusTokenClasses.danger
    },
    ERROR: {
      label: 'Erro',
      variant: 'destructive' as const,
      icon: XCircle,
      className: statusTokenClasses.danger
    },
    Maintenance: {
      label: 'Em Manutenção',
      variant: 'secondary' as const,
      icon: Wrench,
      className: statusTokenClasses.warning
    },
    Alert: {
      label: 'Alerta',
      variant: 'outline' as const,
      icon: AlertTriangle,
      className: statusTokenClasses.warning
    },
    Stopped: {
      label: 'Parado',
      variant: 'destructive' as const,
      icon: XCircle,
      className: statusTokenClasses.danger
    },
  },
  // Níveis de Prioridade
  priority: {
    LOW: { 
      label: 'Baixa', 
      variant: 'outline' as const, 
      icon: Circle,
      className: statusTokenClasses.neutralMuted
    },
    MEDIUM: { 
      label: 'Média', 
      variant: 'secondary' as const, 
      icon: AlertCircle,
      className: statusTokenClasses.info
    },
    HIGH: { 
      label: 'Alta', 
      variant: 'default' as const, 
      icon: AlertTriangle,
      className: statusTokenClasses.warning
    },
    CRITICAL: { 
      label: 'Crítica', 
      variant: 'destructive' as const, 
      icon: AlertCircle,
      className: statusTokenClasses.danger
    },
  },
  // Tipos de Manutenção
  maintenanceType: {
    PREVENTIVE: { 
      label: 'Preventiva', 
      variant: 'outline' as const, 
      icon: Clock,
      className: statusTokenClasses.info
    },
    CORRECTIVE: { 
      label: 'Corretiva', 
      variant: 'secondary' as const, 
      icon: Wrench,
      className: statusTokenClasses.warning
    },
    EMERGENCY: {
      label: 'Emergência',
      variant: 'destructive' as const,
      icon: AlertTriangle,
      className: statusTokenClasses.danger
    },
    REQUEST: {
      label: 'Solicitação',
      variant: 'outline' as const,
      icon: AlertCircle,
      className: statusTokenClasses.accent
    },
    PREDICTIVE: { 
      label: 'Preditiva', 
      variant: 'outline' as const, 
      icon: AlertCircle,
      className: statusTokenClasses.accent
    },
  },
  // Status de Solicitação
  request: {
    'Nova': { 
      label: 'Nova', 
      variant: 'secondary' as const, 
      icon: Circle,
      className: statusTokenClasses.info
    },
    'Em triagem': { 
      label: 'Em triagem', 
      variant: 'default' as const, 
      icon: Clock,
      className: statusTokenClasses.warning
    },
    'Convertida em OS': { 
      label: 'Convertida em OS', 
      variant: 'outline' as const, 
      icon: CheckCircle2,
      className: statusTokenClasses.success
    },
    'Rejeitada': {
      label: 'Rejeitada',
      variant: 'destructive' as const,
      icon: XCircle,
      className: statusTokenClasses.danger
    },
  },
  // Status de Alerta (TrakSense Monitor)
  alert: {
    ACTIVE: { 
      label: 'Ativo', 
      variant: 'destructive' as const, 
      icon: AlertCircle,
      className: statusTokenClasses.danger
    },
    ACKNOWLEDGED: { 
      label: 'Reconhecido', 
      variant: 'secondary' as const, 
      icon: CheckCircle2,
      className: statusTokenClasses.warning
    },
    RESOLVED: { 
      label: 'Resolvido', 
      variant: 'outline' as const, 
      icon: CheckCircle2,
      className: statusTokenClasses.success
    },
  },
  // Status de Conexão (TrakSense Monitor)
  connection: {
    ONLINE: { 
      label: 'Online', 
      variant: 'outline' as const, 
      icon: Circle,
      className: statusTokenClasses.success
    },
    OFFLINE: { 
      label: 'Offline', 
      variant: 'secondary' as const, 
      icon: Circle,
      className: statusTokenClasses.neutralMuted
    },
    UNSTABLE: { 
      label: 'Instável', 
      variant: 'secondary' as const, 
      icon: AlertTriangle,
      className: statusTokenClasses.warning
    },
  },
} satisfies Record<string, StatusConfigMap>;
type StatusType = keyof typeof statusConfigs;

const buildCmmsConfig = (settings?: CmmsSettings): Partial<Record<StatusType, StatusConfigMap>> => {
  if (!settings) {
    return {};
  }

  const workOrder = settings.statuses.reduce((acc, status) => {
    acc[status.id] = {
      label: status.label,
      variant: 'outline',
      style: buildBadgeStyle(status.color),
    };
    return acc;
  }, {} as StatusConfigMap);

  const maintenanceType = settings.types.reduce((acc, type) => {
    acc[type.id] = {
      label: type.label,
      variant: 'outline',
      style: buildBadgeStyle(type.color),
    };
    return acc;
  }, {} as StatusConfigMap);

  return {
    workOrder,
    maintenanceType,
  };
};
export interface StatusBadgeProps {
  /** Valor do status */
  status: string;
  /** Tipo/categoria do status (para lookup automático) */
  type?: StatusType;
  /** CMMS settings for work order status/type */
  cmmsSettings?: CmmsSettings;
  /** Variant manual (sobrescreve lookup) */
  variant?: BadgeVariant;
  /** Classes CSS adicionais */
  className?: string;
  /** Inline styles (override config styles) */
  style?: CSSProperties;
  /** Mostrar ícone */
  showIcon?: boolean;
  /** Tamanho do badge */
  size?: 'sm' | 'md' | 'lg';
  /** Ícone customizado */
  icon?: ReactNode;
}
export function StatusBadge({ 
  status, 
  type,
  cmmsSettings,
  variant, 
  className,
  style,
  showIcon = false,
  size = 'md',
  icon: customIcon
}: StatusBadgeProps) {
  // Encontrar configuração do status
  const cmmsConfig = buildCmmsConfig(cmmsSettings);
  let config: StatusConfigItem | undefined;

  const getConfigMap = (statusType: StatusType): StatusConfigMap | undefined => {
    if (statusType === 'workOrder' && cmmsConfig.workOrder) {
      return cmmsConfig.workOrder;
    }
    if (statusType === 'maintenanceType' && cmmsConfig.maintenanceType) {
      return cmmsConfig.maintenanceType;
    }
    return statusConfigs[statusType];
  };
  
  if (type) {
    const configMap = getConfigMap(type);
    config = configMap?.[status];
  }
  
  // Se não encontrou pelo tipo, buscar em todas as categorias
  if (!config) {
    const categories: StatusConfigMap[] = [
      (cmmsConfig.workOrder || statusConfigs.workOrder),
      statusConfigs.equipment,
      statusConfigs.priority,
      (cmmsConfig.maintenanceType || statusConfigs.maintenanceType),
      statusConfigs.request,
      statusConfigs.alert,
      statusConfigs.connection
    ];

    for (const category of categories) {
      if (category[status]) {
        config = category[status];
        break;
      }
    }
  }
  const badgeVariant = variant || config?.variant || 'outline';
  const label = config?.label || status;
  const Icon = config?.icon;
  const mergedStyle = {
    ...config?.style,
    ...style,
  };
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };
  return (
    <Badge 
      variant={badgeVariant}
      className={cn(
        sizeClasses[size],
        config?.className,
        className
      )}
      style={mergedStyle}
    >
      {(showIcon && Icon) || customIcon ? (
        <span className="flex items-center gap-1.5">
          {customIcon || (Icon && <Icon className="h-3 w-3" />)}
          <span>{label}</span>
        </span>
      ) : (
        label
      )}
    </Badge>
  );
}
// Export tipo para uso externo
export type { StatusType };
