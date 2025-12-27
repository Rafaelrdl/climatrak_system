import { useState, useCallback } from 'react';
import { Key, Shield, Eye, EyeOff, Copy, CheckCheck, Lock, AlertTriangle, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useUsers } from '@/data/usersStore';
import { changePassword } from '@/services/authService';
import { toast } from 'sonner';
import type { User } from '@/models/user';

interface SecurityFormProps {
  security: User['security'];
  onSave: (security: NonNullable<User['security']>) => void;
}

const defaultSecurity = {
  two_factor_enabled: false,
  recovery_codes: [],
};

export function SecurityForm({ security, onSave }: SecurityFormProps) {
  const [formData, setFormData] = useState({
    ...defaultSecurity,
    ...security,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState<Set<string>>(new Set());

  const { generateRecoveryCodes } = useUsers();

  // Password strength calculation
  const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;

    if (score < 40) return { score, label: 'Fraca', color: 'bg-red-500' };
    if (score < 70) return { score, label: 'Média', color: 'bg-yellow-500' };
    return { score, label: 'Forte', color: 'bg-green-500' };
  };

  const passwordStrength = calculatePasswordStrength(passwordData.newPassword);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('pelo menos 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('uma letra maiúscula');
    if (!/[0-9]/.test(password)) errors.push('um número');
    return errors;
  };

  const validatePasswordForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Senha atual é obrigatória';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Nova senha é obrigatória';
    } else {
      const passwordValidationErrors = validatePassword(passwordData.newPassword);
      if (passwordValidationErrors.length > 0) {
        newErrors.newPassword = `A senha deve conter: ${passwordValidationErrors.join(', ')}`;
      }
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmação da senha é obrigatória';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [passwordData]);

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validatePasswordForm()) return;

    setIsLoading(true);
    try {
      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
        passwordData.confirmPassword
      );
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      toast.success('Senha alterada com sucesso');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.old_password?.[0] ||
                          error.response?.data?.new_password?.[0] ||
                          'Erro ao alterar senha';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    if (enabled && !formData.two_factor_enabled) {
      const recoveryCodes = generateRecoveryCodes();
      const newSecurity = {
        ...formData,
        two_factor_enabled: true,
        recovery_codes: recoveryCodes,
      };
      
      setFormData(newSecurity);
      onSave(newSecurity);
      setShowRecoveryCodes(true);
      
      toast.success('Autenticação de dois fatores ativada');
    } else if (!enabled && formData.two_factor_enabled) {
      const newSecurity = {
        ...formData,
        two_factor_enabled: false,
        recovery_codes: [],
      };
      
      setFormData(newSecurity);
      onSave(newSecurity);
      
      toast.success('Autenticação de dois fatores desativada');
    }
  };

  const handleCopyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodes(prev => new Set([...prev, code]));
      
      setTimeout(() => {
        setCopiedCodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(code);
          return newSet;
        });
      }, 2000);
      
      toast.success('Código copiado');
    } catch (error) {
      toast.error('Erro ao copiar código');
    }
  }, []);

  const handleCopyAllCodes = useCallback(async () => {
    try {
      const allCodes = formData.recovery_codes?.join('\n') || '';
      await navigator.clipboard.writeText(allCodes);
      toast.success('Todos os códigos copiados');
    } catch (error) {
      toast.error('Erro ao copiar códigos');
    }
  }, [formData.recovery_codes]);

  return (
    <div
      role="tabpanel"
      aria-labelledby="tab-seguranca"
      id="panel-seguranca"
      className="space-y-6"
    >
      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Alterar Senha</CardTitle>
                <CardDescription>
                  Atualize sua senha regularmente para maior segurança
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-5">
            {/* Senha Atual */}
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-sm font-medium">
                Senha Atual <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  aria-invalid={!!passwordErrors.currentPassword}
                  className={cn(
                    'pr-10',
                    passwordErrors.currentPassword && 'border-destructive focus-visible:ring-destructive'
                  )}
                  placeholder="Digite sua senha atual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => togglePasswordVisibility('current')}
                  aria-label={showPasswords.current ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {passwordErrors.currentPassword}
                </p>
              )}
            </div>

            {/* Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium">
                Nova Senha <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  aria-invalid={!!passwordErrors.newPassword}
                  className={cn(
                    'pr-10',
                    passwordErrors.newPassword && 'border-destructive focus-visible:ring-destructive'
                  )}
                  placeholder="Digite sua nova senha"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => togglePasswordVisibility('new')}
                  aria-label={showPasswords.new ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              
              {/* Password Strength Indicator */}
              {passwordData.newPassword && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Força da senha:</span>
                    <span className={cn(
                      'font-medium',
                      passwordStrength.score < 40 && 'text-red-500',
                      passwordStrength.score >= 40 && passwordStrength.score < 70 && 'text-yellow-500',
                      passwordStrength.score >= 70 && 'text-green-500',
                    )}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <Progress 
                    value={passwordStrength.score} 
                    className="h-1.5"
                  />
                </div>
              )}
              
              {passwordErrors.newPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {passwordErrors.newPassword}
                </p>
              )}
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium">
                Confirmar Nova Senha <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  aria-invalid={!!passwordErrors.confirmPassword}
                  className={cn(
                    'pr-10',
                    passwordErrors.confirmPassword && 'border-destructive focus-visible:ring-destructive'
                  )}
                  placeholder="Confirme sua nova senha"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => togglePasswordVisibility('confirm')}
                  aria-label={showPasswords.confirm ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {passwordErrors.confirmPassword}
                </p>
              )}
              
              {/* Confirmation Match Indicator */}
              {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  As senhas coincidem
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Alterando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Alterar Senha
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Autenticação de Dois Fatores */}
      <Card className={cn(
        "transition-colors",
        formData.two_factor_enabled && "border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/20"
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                formData.two_factor_enabled 
                  ? "bg-green-500/10" 
                  : "bg-muted"
              )}>
                <Shield className={cn(
                  "h-5 w-5",
                  formData.two_factor_enabled ? "text-green-600" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Autenticação de Dois Fatores</CardTitle>
                  {formData.two_factor_enabled && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      Ativo
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Adicione uma camada extra de segurança à sua conta
                </CardDescription>
              </div>
            </div>
            
            <Switch
              checked={formData.two_factor_enabled}
              onCheckedChange={handleToggle2FA}
              aria-label="Ativar ou desativar autenticação de dois fatores"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {formData.two_factor_enabled ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-900">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Sua conta está protegida com autenticação de dois fatores
                </AlertDescription>
              </Alert>
              
              {formData.recovery_codes && formData.recovery_codes.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Códigos de Recuperação</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyAllCodes}
                      className="flex items-center gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar Todos
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Guarde estes códigos em local seguro. Use-os para recuperar acesso se perder seu dispositivo de autenticação.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {formData.recovery_codes.map((code, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-background p-2.5 rounded-md border text-sm font-mono"
                      >
                        <span className="text-muted-foreground">{code}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(code)}
                          className="h-7 w-7 p-0"
                          aria-label={`Copiar código ${code}`}
                        >
                          {copiedCodes.has(code) ? (
                            <CheckCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription>
                A autenticação de dois fatores adiciona uma camada extra de proteção. 
                Quando ativada, você precisará de um código além da sua senha para fazer login.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Modal de códigos de recuperação */}
      <Dialog open={showRecoveryCodes} onOpenChange={setShowRecoveryCodes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Códigos de Recuperação
            </DialogTitle>
            <DialogDescription>
              Guarde estes códigos em local seguro. Você precisará deles para acessar sua 
              conta se perder o acesso ao dispositivo de autenticação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta é a única vez que estes códigos serão exibidos. Copie-os agora!
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-2">
              {formData.recovery_codes?.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-muted p-2.5 rounded-md text-sm font-mono"
                >
                  <span>{code}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyCode(code)}
                    className="h-7 w-7 p-0"
                    aria-label={`Copiar código ${code}`}
                  >
                    {copiedCodes.has(code) ? (
                      <CheckCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleCopyAllCodes}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Todos
              </Button>
              
              <Button onClick={() => setShowRecoveryCodes(false)} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Já Salvei
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
