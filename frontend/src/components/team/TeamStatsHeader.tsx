import { Users, UserPlus, UserCheck, Clock, Mail, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TeamStatsHeaderProps {
  activeMembers: number;
  pendingInvites: number;
  acceptedInvites: number;
  expiredInvites: number;
  totalMembers?: number;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
  trend?: string;
  color: 'primary' | 'success' | 'warning' | 'muted';
}

const colorClasses = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    icon: 'text-primary',
    border: 'border-primary/20',
  },
  success: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    icon: 'text-green-500',
    border: 'border-green-200',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    icon: 'text-amber-500',
    border: 'border-amber-200',
  },
  muted: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground',
    border: 'border-border',
  },
};

function StatCard({ title, value, icon: Icon, description, trend, color }: StatCardProps) {
  const colors = colorClasses[color];
  
  return (
    <Card className={cn("relative overflow-hidden transition-all hover:shadow-md", colors.border)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold tracking-tight", colors.text)}>
                {value}
              </span>
              {trend && (
                <span className="text-xs text-green-600 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  {trend}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", colors.bg)}>
            <Icon className={cn("h-6 w-6", colors.icon)} />
          </div>
        </div>
      </CardContent>
      
      {/* Decorative accent */}
      <div className={cn("absolute bottom-0 left-0 right-0 h-1", colors.bg)} />
    </Card>
  );
}

export function TeamStatsHeader({
  activeMembers,
  pendingInvites,
  acceptedInvites,
  expiredInvites,
  totalMembers,
}: TeamStatsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {totalMembers ?? activeMembers} membros
              </h2>
              <p className="text-sm text-muted-foreground">
                Gerencie sua equipe e controle acessos
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-sm">
              <UserCheck className="h-4 w-4" />
              <span>{activeMembers} ativos</span>
            </div>
            {pendingInvites > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                <Mail className="h-4 w-4" />
                <span>{pendingInvites} pendentes</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Usuários Ativos"
          value={activeMembers}
          icon={UserCheck}
          description="Membros com acesso ao sistema"
          color="success"
        />
        
        <StatCard
          title="Convites Pendentes"
          value={pendingInvites}
          icon={Mail}
          description="Aguardando aceitação"
          color="primary"
        />
        
        <StatCard
          title="Convites Aceitos"
          value={acceptedInvites}
          icon={UserPlus}
          description="Nos últimos 30 dias"
          color="success"
        />
        
        <StatCard
          title="Convites Expirados"
          value={expiredInvites}
          icon={Clock}
          description="Não foram aceitos a tempo"
          color="warning"
        />
      </div>
    </div>
  );
}
