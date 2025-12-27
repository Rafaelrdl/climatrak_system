import { User, Mail, Phone, Shield, Calendar, BadgeCheck, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { User as UserType, UserRole } from '@/models/user';

interface ProfileHeaderProps {
  user: UserType;
  onAvatarClick?: () => void;
}

const roleConfig: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Shield }> = {
  admin: { label: 'Administrador', variant: 'destructive', icon: Shield },
  technician: { label: 'Técnico', variant: 'default', icon: BadgeCheck },
  operator: { label: 'Operador', variant: 'secondary', icon: BadgeCheck },
  viewer: { label: 'Visualizador', variant: 'outline', icon: BadgeCheck },
};

export function ProfileHeader({ user, onAvatarClick }: ProfileHeaderProps) {
  const role = roleConfig[user.role] || roleConfig.viewer;
  const RoleIcon = role.icon;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
      
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar Section */}
          <div className="relative group">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background shadow-xl ring-2 ring-primary/20">
              <AvatarImage src={user.avatar_url} alt={user.name} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            
            {onAvatarClick && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={onAvatarClick}
                aria-label="Alterar foto do perfil"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {user.name}
                </h1>
                <Badge 
                  variant={role.variant}
                  className="flex items-center gap-1"
                >
                  <RoleIcon className="h-3 w-3" />
                  {role.label}
                </Badge>
              </div>
              
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {user.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {user.phone}
                </span>
              )}
              
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Membro desde {formatDate(user.created_at)}
              </span>
              
              {user.last_login_at && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Último acesso: {formatDate(user.last_login_at)}
                </span>
              )}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="hidden lg:flex flex-col items-end gap-2">
            {user.security?.two_factor_enabled && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                <Shield className="h-3 w-3 mr-1" />
                2FA Ativo
              </Badge>
            )}
            
            <Badge 
              variant="outline" 
              className={cn(
                user.status === 'active' && 'bg-green-500/10 text-green-600 border-green-200',
                user.status === 'invited' && 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
                user.status === 'disabled' && 'bg-red-500/10 text-red-600 border-red-200',
              )}
            >
              {user.status === 'active' && 'Conta Ativa'}
              {user.status === 'invited' && 'Convite Pendente'}
              {user.status === 'disabled' && 'Conta Desativada'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
