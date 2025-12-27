import { useState } from 'react';
import { MoreHorizontal, Mail, UserCheck, UserX, RotateCcw, Shield, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { IfCan } from '@/components/auth/IfCan';
import { cn } from '@/lib/utils';
import type { User } from '@/models/user';
import type { Invite } from '@/models/invite';

interface TeamTableProps {
  users: User[];
  invites: Invite[];
  onResendInvite: (inviteId: string) => void;
  onRevokeInvite: (inviteId: string) => void;
  onToggleUserStatus: (userId: string, currentStatus: User['status']) => void;
  onChangeUserRole?: (userId: string, newRole: User['role']) => void;
  currentUserId: string;
  isAdmin?: boolean;
}

const statusVariants = {
  active: 'default',
  invited: 'secondary',
  disabled: 'destructive',
  pending: 'secondary',
} as const;

const roleLabels: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  operator: 'Operador',
  technician: 'Técnico',
  viewer: 'Visualizador',
  requester: 'Solicitante',
};

const roleColors: Record<string, { text: string; bg: string }> = {
  owner: { text: 'text-purple-600', bg: 'bg-purple-500/10' },
  admin: { text: 'text-red-600', bg: 'bg-red-500/10' },
  operator: { text: 'text-blue-600', bg: 'bg-blue-500/10' },
  technician: { text: 'text-green-600', bg: 'bg-green-500/10' },
  viewer: { text: 'text-gray-600', bg: 'bg-gray-500/10' },
  requester: { text: 'text-cyan-600', bg: 'bg-cyan-500/10' },
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  invited: 'Convidado',
  disabled: 'Desativado',
  inactive: 'Inativo',
  suspended: 'Suspenso',
  pending: 'Pendente',
};

export function TeamTable({
  users,
  invites,
  onResendInvite,
  onRevokeInvite,
  onToggleUserStatus,
  onChangeUserRole,
  currentUserId,
  isAdmin = false,
}: TeamTableProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleAction = async (actionId: string, action: () => Promise<void> | void) => {
    setLoadingStates(prev => ({ ...prev, [actionId]: true }));
    try {
      await action();
    } finally {
      setLoadingStates(prev => ({ ...prev, [actionId]: false }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Combinar usuários e convites pendentes para exibir na tabela
  const tableData = [
    ...users.map(user => ({ type: 'user' as const, data: user })),
    ...invites
      .filter(invite => invite.status === 'pending')
      .map(invite => ({ type: 'invite' as const, data: invite })),
  ].sort((a, b) => {
    // Ordenar por data de criação, mais recentes primeiro
    const dateA = new Date(a.data.created_at || a.data.sent_at).getTime();
    const dateB = new Date(b.data.created_at || b.data.sent_at).getTime();
    return dateB - dateA;
  });

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <div className="h-2 w-2 rounded-full bg-green-500" />;
      case 'pending':
      case 'invited':
        return <Clock className="h-3 w-3 text-amber-500" />;
      case 'disabled':
      case 'inactive':
        return <div className="h-2 w-2 rounded-full bg-red-500" />;
      default:
        return <div className="h-2 w-2 rounded-full bg-gray-400" />;
    }
  };

  const formatRelativeDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead scope="col" className="w-[300px] font-medium">Membro</TableHead>
              <TableHead scope="col" className="font-medium">Papel</TableHead>
              <TableHead scope="col" className="w-[100px] font-medium">Status</TableHead>
              <TableHead scope="col" className="w-[140px] font-medium">Último Acesso</TableHead>
              <TableHead scope="col" className="w-[48px]">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full bg-muted p-3">
                      <Mail className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Nenhum membro encontrado</p>
                      <p className="text-xs text-muted-foreground">
                        Convide membros para sua equipe
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
          ) : (
            tableData.map((item) => {
              const isUser = item.type === 'user';
              const data = item.data;
              const uniqueId = isUser ? `user-${data.id}` : `invite-${data.id}`;
              const userName = isUser ? (data as User).name : undefined;
              const isCurrentUser = isUser && data.id === currentUserId;
              
              return (
                <TableRow 
                  key={uniqueId}
                  className={cn(
                    "group transition-colors",
                    isCurrentUser && "bg-primary/5"
                  )}
                >
                  {/* Avatar + Nome + Email */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-9 w-9 border">
                          {isUser && (data as User).avatar_url ? (
                            <AvatarImage src={(data as User).avatar_url} alt={userName} />
                          ) : null}
                          <AvatarFallback className={cn(
                            "text-xs font-medium",
                            !isUser && "bg-amber-100 text-amber-700"
                          )}>
                            {getInitials(userName, data.email)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Status indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                          {getStatusIcon(data.status)}
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {userName || 'Convite Pendente'}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              Você
                            </Badge>
                          )}
                          {!isUser && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">
                              Pendente
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                          {data.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Papel */}
                  <TableCell>
                    {isUser && isAdmin && !isCurrentUser && onChangeUserRole ? (
                      <Select
                        value={data.role}
                        onValueChange={(newRole) => {
                          handleAction(
                            `role-${data.id}`,
                            () => onChangeUserRole(data.id, newRole as User['role'])
                          );
                        }}
                        disabled={loadingStates[`role-${data.id}`]}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-xs">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <Shield className={cn("h-3.5 w-3.5", roleColors[data.role]?.text || 'text-gray-500')} />
                              <span>{roleLabels[data.role] || data.role}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-red-500" />
                              Administrador
                            </div>
                          </SelectItem>
                          <SelectItem value="operator">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-blue-500" />
                              Operador
                            </div>
                          </SelectItem>
                          <SelectItem value="technician">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-green-500" />
                              Técnico
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-gray-500" />
                              Visualizador
                            </div>
                          </SelectItem>
                          <SelectItem value="requester">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-cyan-500" />
                              Solicitante
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                        roleColors[data.role]?.bg || 'bg-gray-100',
                        roleColors[data.role]?.text || 'text-gray-600'
                      )}>
                        <Shield className="h-3 w-3" />
                        {roleLabels[data.role] || data.role}
                      </div>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge 
                      variant={statusVariants[data.status] || 'secondary'}
                      className={cn(
                        "text-xs font-medium",
                        data.status === 'active' && "bg-green-100 text-green-700 border-green-200",
                        data.status === 'pending' && "bg-amber-100 text-amber-700 border-amber-200",
                        data.status === 'disabled' && "bg-red-100 text-red-700 border-red-200"
                      )}
                    >
                      {statusLabels[data.status] || data.status}
                    </Badge>
                  </TableCell>

                  {/* Último Acesso */}
                  <TableCell>
                    {isUser ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-default">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatRelativeDate((data as User).last_login_at) || 'Nunca'}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {(data as User).last_login_at 
                            ? formatDate((data as User).last_login_at)
                            : 'Nunca acessou'
                          }
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-default">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatRelativeDate((data as Invite).sent_at)}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Convite enviado em {formatDate((data as Invite).sent_at)}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>

                  {/* Ações */}
                  <TableCell>
                    <IfCan action="manage" subject="user">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Ações para ${data.email}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {!isUser && data.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleAction(
                                  `resend-${data.id}`,
                                  () => onResendInvite(data.id)
                                )}
                                disabled={loadingStates[`resend-${data.id}`]}
                                className="gap-2"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Reenviar Convite
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleAction(
                                  `revoke-${data.id}`,
                                  () => onRevokeInvite(data.id)
                                )}
                                disabled={loadingStates[`revoke-${data.id}`]}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <UserX className="h-4 w-4" />
                                Revogar Convite
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {isUser && !isCurrentUser && (
                            <DropdownMenuItem
                              onClick={() => handleAction(
                                `toggle-${data.id}`,
                                () => onToggleUserStatus(data.id, data.status)
                              )}
                              disabled={loadingStates[`toggle-${data.id}`]}
                              className={cn(
                                "gap-2",
                                data.status === 'active' && "text-destructive focus:text-destructive"
                              )}
                            >
                              {data.status === 'active' ? (
                                <>
                                  <UserX className="h-4 w-4" />
                                  Desativar Usuário
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4" />
                                  Ativar Usuário
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          
                          {isCurrentUser && (
                            <DropdownMenuItem disabled className="gap-2 text-muted-foreground">
                              <Shield className="h-4 w-4" />
                              Este é você
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </IfCan>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>
    </TooltipProvider>
  );
}