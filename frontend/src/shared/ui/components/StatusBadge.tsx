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
import { type VariantProps } from 'class-variance-authority';
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
import { ReactNode } from 'react';

const statusTokenClasses = {
  info: 'bg-[color:var(--status-info-bg)] text-[color:var(--status-info-fg)] border-[color:var(--status-info-border)]',
  warning: 'bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning-fg)] border-[color:var(--status-warning-border)]',
  success: 'bg-[color:var(--status-success-bg)] text-[color:var(--status-success-fg)] border-[color:var(--status-success-border)]',
  danger: 'bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger-fg)] border-[color:var(--status-danger-border)]',
  neutral: 'bg-[color:var(--status-neutral-bg)] text-[color:var(--status-neutral-fg)] border-[color:var(--status-neutral-border)]',
  neutralMuted: 'bg-[color:var(--status-neutral-bg)] text-[color:var(--status-neutral-muted-fg)] border-[color:var(--status-neutral-border)]',
  accent: 'bg-[color:var(--status-accent-bg)] text-[color:var(--status-accent-fg)] border-[color:var(--status-accent-border)]',
};

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
      label: 'Em Manuten??o',
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
} as const;

type StatusType = keyof typeof statusConfigs;
type StatusValue<T extends StatusType> = keyof typeof statusConfigs[T];
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface StatusBadgeProps {
  /** Valor do status */
  status: string;
  /** Tipo/categoria do status (para lookup automático) */
  type?: StatusType;
  /** Variant manual (sobrescreve lookup) */
  variant?: BadgeVariant;
  /** Classes CSS adicionais */
  className?: string;
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
  variant, 
  className,
  showIcon = false,
  size = 'md',
  icon: customIcon
}: StatusBadgeProps) {
  // Encontrar configuração do status
  let config: { label: string; variant: BadgeVariant; icon?: any; className?: string } | undefined;
  
  if (type && statusConfigs[type]) {
    config = (statusConfigs[type] as any)[status];
  }
  
  // Se não encontrou pelo tipo, buscar em todas as categorias
  if (!config) {
    for (const category of Object.values(statusConfigs)) {
      if ((category as any)[status]) {
        config = (category as any)[status];
        break;
      }
    }
  }

  const badgeVariant = variant || config?.variant || 'outline';
  const label = config?.label || status;
  const Icon = config?.icon;

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
