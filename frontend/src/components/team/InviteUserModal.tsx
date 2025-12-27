import { useState, useCallback } from 'react';
import { Mail, Shield, Wrench, User, Eye, Info, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { UserRole } from '@/models/user';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: UserRole) => Promise<void>;
}

// Opções de papel com ícones e cores seguindo o Design System
const roleOptions = [
  { 
    value: 'admin' as UserRole, 
    label: 'Administrador', 
    description: 'Acesso completo ao sistema',
    icon: Shield,
    iconColor: 'text-red-500'
  },
  { 
    value: 'technician' as UserRole, 
    label: 'Técnico', 
    description: 'Pode executar e gerenciar ordens de serviço',
    icon: Wrench,
    iconColor: 'text-blue-500'
  },
  { 
    value: 'operator' as UserRole, 
    label: 'Operador', 
    description: 'Pode operar o sistema e criar solicitações',
    icon: User,
    iconColor: 'text-green-500'
  },
  { 
    value: 'viewer' as UserRole, 
    label: 'Visualizador', 
    description: 'Acesso somente leitura',
    icon: Eye,
    iconColor: 'text-gray-500'
  },
];

export function InviteUserModal({ isOpen, onClose, onInvite }: InviteUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: '' as UserRole | '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    if (!formData.role) {
      newErrors.role = 'Papel é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onInvite(formData.email.trim(), formData.role as UserRole);
      
      // Resetar formulário
      setFormData({
        email: '',
        role: '',
      });
      setErrors({});
    } catch (error: any) {
      // Erro já é tratado no componente pai
      console.error('Error inviting user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        email: '',
        role: '',
      });
      setErrors({});
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !isLoading) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[440px] p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header com ícone estilizado - Design System Section 5.1 */}
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Convidar Usuário
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-500">
                Envie um convite para uma nova pessoa se juntar à sua equipe.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Campo Email - Design System Section 5.2 */}
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : 'email-hint'}
                className={`pl-10 h-11 transition-all duration-200 ${
                  errors.email 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                    : 'focus:border-primary focus:ring-primary/20'
                }`}
                autoFocus
                autoComplete="email"
              />
            </div>
            {errors.email ? (
              <p id="email-error" role="alert" className="text-sm text-red-500 flex items-center gap-1.5">
                <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                {errors.email}
              </p>
            ) : (
              <p id="email-hint" className="text-xs text-gray-400">
                O convite será enviado para este endereço
              </p>
            )}
          </div>

          {/* Campo Papel - Design System Section 5.2 */}
          <div className="space-y-2">
            <Label htmlFor="invite-role" className="text-sm font-medium text-gray-700">
              Papel <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleInputChange('role', value)}
            >
              <SelectTrigger
                id="invite-role"
                className={`h-11 transition-all duration-200 ${
                  errors.role 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                    : 'focus:border-primary focus:ring-primary/20'
                }`}
                aria-invalid={!!errors.role}
                aria-describedby={errors.role ? 'role-error' : undefined}
              >
                <SelectValue placeholder="Selecione um papel" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="py-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center`}>
                          <Icon className={`h-4 w-4 ${option.iconColor}`} />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-gray-900">{option.label}</span>
                          <span className="text-xs text-gray-500">
                            {option.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.role && (
              <p id="role-error" role="alert" className="text-sm text-red-500 flex items-center gap-1.5">
                <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                {errors.role}
              </p>
            )}
          </div>

          {/* Info Box - Design System Section 4.4 (Info Status) */}
          <div className="flex gap-3 p-4 bg-cyan-50 border border-cyan-200 rounded-xl">
            <Info className="h-5 w-5 text-cyan-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-cyan-800">
              <p className="font-medium mb-1">Como funciona?</p>
              <p className="text-cyan-700 leading-relaxed">
                O convite será enviado por email e expira em <strong>7 dias</strong>. 
                A pessoa convidada poderá criar sua senha e acessar o sistema.
              </p>
            </div>
          </div>

          {/* Botões - Design System Section 5.1 */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="min-w-[100px] h-11 font-medium transition-all duration-200"
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={isLoading || !formData.email || !formData.role}
              className="min-w-[140px] h-11 font-medium transition-all duration-200 
                       bg-primary hover:bg-primary/90 
                       disabled:bg-gray-200 disabled:text-gray-500"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar Convite
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}