import { useState } from 'react';
import { 
  MoreHorizontal, 
  Mail, 
  UserCheck, 
  UserX, 
  RotateCcw, 
  Shield, 
  Calendar,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IfCan } from '@/components/auth/IfCan';
import { cn } from '@/lib/utils';
import type { User, UserRole } from '@/models/user';
import type { Invite } from '@/models/invite';

interface TeamMemberCardProps {
  user?: User;
  invite?: Invite;
  onResendInvite?: (inviteId: string) => void;
  onRevokeInvite?: (inviteId: string) => void;
  onToggleUserStatus?: (userId: string, currentStatus: User['status']) => void;
  onChangeUserRole?: (userId: string, newRole: UserRole) => void;
  currentUserId: string;
  isAdmin?: boolean;
  isLoading?: boolean;
}

const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  owner: { label: 'Proprietário', color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  admin: { label: 'Administrador', color: 'text-red-600', bgColor: 'bg-red-500/10' },
  operator: { label: 'Operador', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  technician: { label: 'Técnico', color: 'text-green-600', bgColor: 'bg-green-500/10' },
  viewer: { label: 'Visualizador', color: 'text-gray-600', bgColor: 'bg-gray-500/10' },
  requester: { label: 'Solicitante', color: 'text-cyan-600', bgColor: 'bg-cyan-500/10' },
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  invited: { label: 'Convidado', variant: 'secondary' },
  disabled: { label: 'Desativado', variant: 'destructive' },
  inactive: { label: 'Inativo', variant: 'secondary' },
  suspended: { label: 'Suspenso', variant: 'destructive' },
  pending: { label: 'Pendente', variant: 'secondary' },
};

export function TeamMemberCard({
  user,
  invite,
  onResendInvite,
  onRevokeInvite,
  onToggleUserStatus,
  onChangeUserRole,
  currentUserId,
  isAdmin = false,
  isLoading = false,
}: TeamMemberCardProps) {
  const isInvite = !user && !!invite;
  const data = user || invite;
  const isCurrentUser = user?.id === currentUserId;
  
  if (!data) return null;

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return email?.[0]?.toUpperCase() || '?';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Garantir valores seguros com verificação de tipos
  const role = isInvite ? invite!.role : user!.role;
  const roleInfo = roleConfig[role] || roleConfig.viewer;
  const status = isInvite ? 'pending' as const : user!.status;
  const statusInfo = statusConfig[status] || statusConfig.active;

  return (
    <Card className={cn(
      "group relative transition-all duration-200 hover:shadow-md",
      isInvite && "border-dashed border-primary/30 bg-primary/5",
      isCurrentUser && "ring-2 ring-primary/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className={cn(
              "h-12 w-12 border-2",
              isInvite ? "border-dashed border-primary/50" : "border-background"
            )}>
              {!isInvite && user?.avatar_url && (
                <AvatarImage src={user.avatar_url} alt={user.name} />
              )}
              <AvatarFallback className={cn(
                "text-sm font-semibold",
                isInvite ? "bg-primary/10 text-primary" : "bg-muted"
              )}>
                {isInvite ? <Mail className="h-5 w-5" /> : getInitials(user?.name, data.email)}
              </AvatarFallback>
            </Avatar>
            
            {/* Status indicator */}
            {!isInvite && user && (
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background",
                user.status === 'active' && "bg-green-500",
                user.status === 'disabled' && "bg-red-500",
              )} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              {isInvite ? (
                <span className="font-medium text-primary truncate">
                  Convite pendente
                </span>
              ) : (
                <span className="font-medium truncate">
                  {user?.name}
                </span>
              )}
              
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs shrink-0">
                  Você
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {data.email}
            </p>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Role Badge */}
              <Badge 
                variant="outline" 
                className={cn("text-xs", roleInfo.color, roleInfo.bgColor)}
              >
                <Shield className="h-3 w-3 mr-1" />
                {roleInfo.label}
              </Badge>
              
              {/* Status Badge */}
              <Badge variant={statusInfo.variant} className="text-xs">
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <IfCan action="manage" subject="user">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isLoading}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isInvite && invite.status === 'pending' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onResendInvite?.(invite.id)}
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reenviar Convite
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onRevokeInvite?.(invite!.id)}
                      disabled={isLoading}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Revogar Convite
                    </DropdownMenuItem>
                  </>
                )}
                
                {!isInvite && !isCurrentUser && user && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onToggleUserStatus?.(user.id, user.status)}
                      disabled={isLoading}
                    >
                      {user.status === 'active' ? (
                        <>
                          <UserX className="h-4 w-4 mr-2" />
                          Desativar Usuário
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Ativar Usuário
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
                
                {isCurrentUser && (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    Você mesmo
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </IfCan>
        </div>

        {/* Footer Info */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {isInvite 
                ? `Enviado em ${formatDate(invite?.sent_at)}`
                : `Membro desde ${formatDate(user?.created_at)}`
              }
            </span>
          </div>
          
          {isInvite && invite?.expires_at && (
            <div className="flex items-center gap-1 text-amber-600">
              <Clock className="h-3 w-3" />
              <span>Expira em {formatDate(invite.expires_at)}</span>
            </div>
          )}
          
          {!isInvite && user?.last_login_at && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Último acesso: {formatDate(user.last_login_at)}</span>
            </div>
          )}
        </div>

        {/* Role Selector for Admins */}
        {!isInvite && isAdmin && !isCurrentUser && onChangeUserRole && user && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Alterar papel:</span>
              <Select
                value={user.role}
                onValueChange={(newRole) => onChangeUserRole(user.id, newRole as UserRole)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="technician">Técnico</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
