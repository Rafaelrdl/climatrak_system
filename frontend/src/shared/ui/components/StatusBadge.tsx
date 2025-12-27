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

// Configuração de status por categoria
const statusConfigs = {
  // Status de Ordem de Serviço
  workOrder: {
    OPEN: { 
      label: 'Aberta', 
      variant: 'secondary' as const, 
      icon: Circle,
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    IN_PROGRESS: { 
      label: 'Em Execução', 
      variant: 'default' as const, 
      icon: Play,
      className: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    ON_HOLD: { 
      label: 'Em Espera', 
      variant: 'secondary' as const, 
      icon: Pause,
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    },
    COMPLETED: { 
      label: 'Concluída', 
      variant: 'outline' as const, 
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    CANCELLED: { 
      label: 'Cancelada', 
      variant: 'destructive' as const, 
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-200'
    },
  },

  // Status de Equipamento/Ativo
  equipment: {
    FUNCTIONING: { 
      label: 'Funcionando', 
      variant: 'outline' as const, 
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    MAINTENANCE: { 
      label: 'Em Manutenção', 
      variant: 'secondary' as const, 
      icon: Wrench,
      className: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    STOPPED: { 
      label: 'Parado', 
      variant: 'destructive' as const, 
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-200'
    },
    OFFLINE: { 
      label: 'Offline', 
      variant: 'outline' as const, 
      icon: Circle,
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    },
  },

  // Níveis de Prioridade
  priority: {
    LOW: { 
      label: 'Baixa', 
      variant: 'outline' as const, 
      icon: Circle,
      className: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    MEDIUM: { 
      label: 'Média', 
      variant: 'secondary' as const, 
      icon: AlertCircle,
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    HIGH: { 
      label: 'Alta', 
      variant: 'default' as const, 
      icon: AlertTriangle,
      className: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    CRITICAL: { 
      label: 'Crítica', 
      variant: 'destructive' as const, 
      icon: AlertCircle,
      className: 'bg-red-100 text-red-800 border-red-200'
    },
  },

  // Tipos de Manutenção
  maintenanceType: {
    PREVENTIVE: { 
      label: 'Preventiva', 
      variant: 'outline' as const, 
      icon: Clock,
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    CORRECTIVE: { 
      label: 'Corretiva', 
      variant: 'secondary' as const, 
      icon: Wrench,
      className: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    PREDICTIVE: { 
      label: 'Preditiva', 
      variant: 'outline' as const, 
      icon: AlertCircle,
      className: 'bg-purple-100 text-purple-800 border-purple-200'
    },
  },

  // Status de Solicitação
  request: {
    'Nova': { 
      label: 'Nova', 
      variant: 'secondary' as const, 
      icon: Circle,
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    'Em triagem': { 
      label: 'Em triagem', 
      variant: 'default' as const, 
      icon: Clock,
      className: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    'Convertida em OS': { 
      label: 'Convertida em OS', 
      variant: 'outline' as const, 
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-800 border-green-200'
    },
  },

  // Status de Alerta (TrakSense Monitor)
  alert: {
    ACTIVE: { 
      label: 'Ativo', 
      variant: 'destructive' as const, 
      icon: AlertCircle,
      className: 'bg-red-100 text-red-800 border-red-200'
    },
    ACKNOWLEDGED: { 
      label: 'Reconhecido', 
      variant: 'secondary' as const, 
      icon: CheckCircle2,
      className: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    RESOLVED: { 
      label: 'Resolvido', 
      variant: 'outline' as const, 
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-800 border-green-200'
    },
  },

  // Status de Conexão (TrakSense Monitor)
  connection: {
    ONLINE: { 
      label: 'Online', 
      variant: 'outline' as const, 
      icon: Circle,
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    OFFLINE: { 
      label: 'Offline', 
      variant: 'secondary' as const, 
      icon: Circle,
      className: 'bg-gray-100 text-gray-600 border-gray-200'
    },
    UNSTABLE: { 
      label: 'Instável', 
      variant: 'secondary' as const, 
      icon: AlertTriangle,
      className: 'bg-amber-100 text-amber-800 border-amber-200'
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
