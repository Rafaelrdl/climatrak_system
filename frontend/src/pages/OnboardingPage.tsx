import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, User, Shield, Zap, Eye } from 'lucide-react';
import { inviteService, type InviteInfo } from '@/services/inviteService';
import { toast } from 'sonner';
import TrakNorLogoUrl from '@/assets/images/traknor-logo.svg';

interface OnboardingFormData {
  name: string;
  password: string;
  confirmPassword: string;
}

export function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [token] = useState(() => searchParams.get('token') || '');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'validate' | 'form' | 'complete'>('validate');
  const [error, setError] = useState<string>('');
  const [createdUser, setCreatedUser] = useState<{ tenant_slug: string } | null>(null);
  
  const [formData, setFormData] = useState<OnboardingFormData>({
    name: '',
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<OnboardingFormData>>({});

  // Validate invite token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token de convite não encontrado na URL');
        setLoading(false);
        return;
      }

      try {
        const inviteData = await inviteService.validateInvite(token);
        setInvite(inviteData);
        setStep('form');
      } catch (err: any) {
        const message = err.response?.data?.detail || 'Token de convite inválido ou expirado';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const validateForm = (): boolean => {
    const errors: Partial<OnboardingFormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.password) {
      errors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 8) {
      errors.password = 'Senha deve ter pelo menos 8 caracteres';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Senhas não coincidem';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    setError('');
    
    try {
      const result = await inviteService.acceptInvite({
        token,
        name: formData.name.trim(),
        password: formData.password,
      });
      
      setCreatedUser({ tenant_slug: result.membership.tenant_slug });
      setStep('complete');
      toast.success('Conta criada com sucesso!');
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof OnboardingFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'owner': return 'Proprietário';
      case 'technician': return 'Técnico';
      case 'operator': return 'Operador';
      case 'viewer': return 'Visualizador';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': 
      case 'owner': 
        return Shield;
      case 'technician': 
      case 'operator': 
        return Zap;
      case 'viewer': 
        return Eye;
      default: 
        return User;
    }
  };

  const handleGoToLogin = () => {
    if (createdUser?.tenant_slug) {
      // Redirect to tenant-specific login
      window.location.href = `http://${createdUser.tenant_slug}.localhost:5173/login`;
    } else {
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
              <div className="w-4 h-4 bg-primary rounded-full animate-pulse delay-75"></div>
              <div className="w-4 h-4 bg-primary rounded-full animate-pulse delay-150"></div>
            </div>
            <p className="text-center text-muted-foreground mt-4">
              Validando convite...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>
              Não foi possível validar seu convite
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              className="w-full mt-4" 
              onClick={() => navigate('/login')}
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={TrakNorLogoUrl} 
                alt="Logo TrakNor" 
                className="h-10 w-10"
              />
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-blue-700">TrakNor CMMS</span>
                <span className="text-xs text-muted-foreground">Gestão de Manutenção</span>
              </div>
            </div>
            <Progress 
              value={step === 'form' ? 50 : step === 'complete' ? 100 : 25} 
              className="w-32" 
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-md">
        {step === 'form' && invite && (
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4">
                <img 
                  src={TrakNorLogoUrl} 
                  alt="Logo TrakNor" 
                  className="h-16 w-16 mx-auto"
                />
              </div>
              <CardTitle className="text-2xl">Bem-vindo!</CardTitle>
              <CardDescription className="text-base">
                Você foi convidado para{' '}
                <span className="font-semibold text-foreground">
                  {invite.tenant_name}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-muted/50 rounded-xl border space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  {(() => {
                    const Icon = getRoleIcon(invite.role);
                    return <Icon className="w-5 h-5 text-primary" />;
                  })()}
                  <span className="font-semibold">
                    {getRoleDisplayName(invite.role)}
                  </span>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{invite.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Convidado por</span>
                    <span className="font-medium">{invite.invited_by_name}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    placeholder="Digite seu nome completo"
                    aria-describedby={formErrors.name ? "name-error" : undefined}
                    aria-invalid={!!formErrors.name}
                    className={formErrors.name ? "border-destructive" : ""}
                  />
                  {formErrors.name && (
                    <p id="name-error" role="alert" className="text-sm text-destructive">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    placeholder="Crie uma senha segura"
                    aria-describedby={formErrors.password ? "password-error" : "password-help"}
                    aria-invalid={!!formErrors.password}
                    className={formErrors.password ? "border-destructive" : ""}
                  />
                  {formErrors.password ? (
                    <p id="password-error" role="alert" className="text-sm text-destructive">
                      {formErrors.password}
                    </p>
                  ) : (
                    <p id="password-help" className="text-xs text-muted-foreground">
                      Mínimo 8 caracteres
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    placeholder="Digite a senha novamente"
                    aria-describedby={formErrors.confirmPassword ? "confirm-password-error" : undefined}
                    aria-invalid={!!formErrors.confirmPassword}
                    className={formErrors.confirmPassword ? "border-destructive" : ""}
                  />
                  {formErrors.confirmPassword && (
                    <p id="confirm-password-error" role="alert" className="text-sm text-destructive">
                      {formErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitting}
                >
                  {submitting ? 'Criando conta...' : 'Criar Conta'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'complete' && invite && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <div className="relative">
                  <img 
                    src={TrakNorLogoUrl} 
                    alt="Logo TrakNor" 
                    className="h-16 w-16 mx-auto"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl">Conta Criada!</CardTitle>
              <CardDescription className="text-base">
                Bem-vindo ao {invite.tenant_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Sua conta foi criada e você já pode acessar o sistema.
                </p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Organização:</span>{' '}
                    <span className="font-medium">{invite.tenant_name}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Função:</span>{' '}
                    <span className="font-medium">{getRoleDisplayName(invite.role)}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={handleGoToLogin}
                >
                  Fazer Login
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
