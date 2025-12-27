import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, ArrowUp, ArrowDown, Circle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

// Configuração de prioridades com cores consistentes com a página de configurações SLA
const priorityConfig = {
  CRITICAL: { 
    label: 'Crítica', 
    icon: AlertTriangle,
    textColor: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200'
  },
  HIGH: { 
    label: 'Alta', 
    icon: AlertCircle,
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200'
  },
  MEDIUM: { 
    label: 'Média', 
    icon: ArrowUp,
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200'
  },
  LOW: { 
    label: 'Baixa', 
    icon: ArrowDown,
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  },
};

// Configuração de status de OS com cores consistentes com a página de configurações
// Cores baseadas em: OPEN=#3b82f6 (azul), IN_PROGRESS=#f59e0b (laranja), COMPLETED=#22c55e (verde), CANCELLED=#6b7280 (cinza)
const workOrderStatusConfig = {
  OPEN: { 
    label: 'Aberta', 
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  },
  IN_PROGRESS: { 
    label: 'Em Execução', 
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200'
  },
  COMPLETED: { 
    label: 'Concluída', 
    textColor: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200'
  },
  CANCELLED: { 
    label: 'Cancelada', 
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200'
  },
};

// Configuração de tipos de OS com cores consistentes com a página de configurações
// Cores baseadas em: PREVENTIVE=#3b82f6 (azul), CORRECTIVE=#ef4444 (vermelho), REQUEST=#8b5cf6 (roxo)
const workOrderTypeConfig = {
  PREVENTIVE: { 
    label: 'Preventiva', 
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  },
  CORRECTIVE: { 
    label: 'Corretiva', 
    textColor: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200'
  },
  REQUEST: { 
    label: 'Solicitação', 
    textColor: 'text-violet-700',
    bgColor: 'bg-violet-100',
    borderColor: 'border-violet-200'
  },
};

const otherStatusConfig = {
  // Equipment statuses
  FUNCTIONING: { label: 'Funcionando', variant: 'outline' as const },
  MAINTENANCE: { label: 'Em Manutenção', variant: 'secondary' as const },
  STOPPED: { label: 'Parado', variant: 'destructive' as const },
  
  // Solicitation statuses
  'Nova': { label: 'Nova', variant: 'secondary' as const },
  'Em triagem': { label: 'Em triagem', variant: 'default' as const },
  'Convertida em OS': { label: 'Convertida em OS', variant: 'outline' as const }
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  // Verifica se é uma prioridade (usa estilo customizado com ícones e cores)
  const priorityInfo = priorityConfig[status as keyof typeof priorityConfig];
  
  if (priorityInfo) {
    const Icon = priorityInfo.icon;
    return (
      <Badge 
        variant="outline"
        className={cn(
          "gap-1.5 font-medium border",
          priorityInfo.bgColor,
          priorityInfo.textColor,
          priorityInfo.borderColor,
          className
        )}
      >
        <Icon className="h-3 w-3" />
        {priorityInfo.label}
      </Badge>
    );
  }

  // Verifica se é um status de ordem de serviço
  const woStatusInfo = workOrderStatusConfig[status as keyof typeof workOrderStatusConfig];
  
  if (woStatusInfo) {
    return (
      <Badge 
        variant="outline"
        className={cn(
          "gap-1.5 font-medium border",
          woStatusInfo.bgColor,
          woStatusInfo.textColor,
          woStatusInfo.borderColor,
          className
        )}
      >
        <Circle className="h-2 w-2 fill-current" />
        {woStatusInfo.label}
      </Badge>
    );
  }

  // Verifica se é um tipo de ordem de serviço
  const woTypeInfo = workOrderTypeConfig[status as keyof typeof workOrderTypeConfig];
  
  if (woTypeInfo) {
    return (
      <Badge 
        variant="outline"
        className={cn(
          "gap-1.5 font-medium border",
          woTypeInfo.bgColor,
          woTypeInfo.textColor,
          woTypeInfo.borderColor,
          className
        )}
      >
        {woTypeInfo.label}
      </Badge>
    );
  }
  
  // Para outros status, usa o estilo padrão
  const config = otherStatusConfig[status as keyof typeof otherStatusConfig];
  const badgeVariant = variant || config?.variant || 'outline';
  const label = config?.label || status;

  return (
    <Badge 
      variant={badgeVariant}
      className={cn(className)}
    >
      {label}
    </Badge>
  );
}