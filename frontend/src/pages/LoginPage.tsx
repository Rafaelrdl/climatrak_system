import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Mail, Shield, BarChart3, Wrench, ThermometerSnowflake, CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login as loginService } from '@/services/authService';
import ClimatrakLogoUrl from '@/assets/images/logo_climatrak.svg';

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    
    if (!formData.email) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }
    
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getErrorMessage = (error: unknown) => {
    if (error instanceof AxiosError && error.response?.data) {
      const data: any = error.response.data;
      if (typeof data.detail === 'string') return data.detail;
      if (typeof data.error === 'string') return data.error;
      
      const emailError = Array.isArray(data.username_or_email) ? data.username_or_email[0] : null;
      const passwordError = Array.isArray(data.password) ? data.password[0] : null;
      
      if (typeof emailError === 'string') return emailError;
      if (typeof passwordError === 'string') return passwordError;
    }
    
    return 'Erro ao fazer login. Verifique suas credenciais.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      await loginService(formData.email, formData.password);
      toast.success('Login realizado com sucesso!');
      
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const features = [
    { icon: Wrench, title: 'Manutenção Inteligente', desc: 'Ordens de serviço automatizadas' },
    { icon: ThermometerSnowflake, title: 'Monitoramento HVAC', desc: 'Sensores IoT em tempo real' },
    { icon: BarChart3, title: 'Relatórios PMOC', desc: 'Conformidade com normas brasileiras' },
    { icon: Shield, title: 'Segurança Total', desc: 'Dados criptografados e seguros' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-between p-8 lg:p-12 bg-white">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          {/* Logo */}
          <div className="mb-10 flex justify-center">
            <img 
              src={ClimatrakLogoUrl} 
              alt="Climatrak" 
              className="h-28 w-auto"
            />
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                Bem-vindo de volta
              </h1>
              <p className="text-sm text-muted-foreground">
                Entre com suas credenciais para acessar a plataforma
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@empresa.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`h-11 pl-10 bg-muted/30 border-muted-foreground/20 focus:border-primary focus:ring-primary ${errors.email ? 'border-destructive' : ''}`}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                </div>
                {errors.email && (
                  <div id="email-error" role="alert" className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Senha
                  </Label>
                  <Link
                    to="/forgot-password"
                    state={{ email: formData.email }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`h-11 pr-10 bg-muted/30 border-muted-foreground/20 focus:border-primary focus:ring-primary ${errors.password ? 'border-destructive' : ''}`}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 py-0 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <div id="password-error" role="alert" className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </div>
                ) : 'Entrar'}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Problemas de acesso?{' '}
            <button 
              className="text-primary hover:text-primary/80 font-medium transition-colors"
              onClick={() => toast.info('Funcionalidade em desenvolvimento')}
            >
              Fale conosco
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Visual Hero */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/20" />
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary/40" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative Circles */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-20 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-accent/10 rounded-full blur-2xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          {/* Main Visual Card */}
          <div className="w-full max-w-2xl">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/50 mb-6">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-foreground">Sistema Online</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-bold text-foreground mb-4 leading-tight">
                Gestão Completa de<br />
                <span className="text-primary">Manutenção</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Monitore, gerencie e otimize a manutenção dos seus equipamentos com inteligência e eficiência.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/60 shadow-lg shadow-black/5 hover:bg-white/90 hover:shadow-xl transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Stats/Trust Banner */}
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/60">
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">99.9%</div>
                  <div className="text-xs text-muted-foreground">Uptime</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">+500</div>
                  <div className="text-xs text-muted-foreground">Equipamentos</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">24/7</div>
                  <div className="text-xs text-muted-foreground">Monitoramento</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center flex flex-col items-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mb-1" />
                  <div className="text-xs text-muted-foreground">ISO 27001</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements - Left Side (descendo) */}
        <div className="absolute top-24 left-8 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/60 animate-float-down">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">OS #1247 Concluída</div>
              <div className="text-[10px] text-muted-foreground">Agora mesmo</div>
            </div>
          </div>
        </div>

        <div className="absolute top-52 left-16 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/60 animate-float-down-delayed">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">Manutenção Preventiva</div>
              <div className="text-[10px] text-muted-foreground">Chiller 02 - Agendada</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-40 left-10 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/60 animate-float-down-slow">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">Relatório PMOC</div>
              <div className="text-[10px] text-muted-foreground">Gerado com sucesso</div>
            </div>
          </div>
        </div>

        {/* Floating Elements - Right Side (subindo) */}
        <div className="absolute top-32 right-12 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/60 animate-float-up">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ThermometerSnowflake className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">Sensor Ativo</div>
              <div className="text-[10px] text-muted-foreground">Temp: 22°C</div>
            </div>
          </div>
        </div>

        <div className="absolute top-56 right-20 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/60 animate-float-up-delayed">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">Eficiência Energética</div>
              <div className="text-[10px] text-muted-foreground">+15% este mês</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-32 right-14 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/60 animate-float-up-slow">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">Alerta Preventivo</div>
              <div className="text-[10px] text-muted-foreground">Filtro AC-03 - Trocar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float-down {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(12px); }
        }
        @keyframes float-down-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(10px); }
        }
        @keyframes float-down-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(8px); }
        }
        @keyframes float-up {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float-up-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-up-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float-down {
          animation: float-down 4s ease-in-out infinite;
        }
        .animate-float-down-delayed {
          animation: float-down-delayed 5s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        .animate-float-down-slow {
          animation: float-down-slow 6s ease-in-out infinite;
          animation-delay: 1s;
        }
        .animate-float-up {
          animation: float-up 4s ease-in-out infinite;
        }
        .animate-float-up-delayed {
          animation: float-up-delayed 5s ease-in-out infinite;
          animation-delay: 0.7s;
        }
        .animate-float-up-slow {
          animation: float-up-slow 6s ease-in-out infinite;
          animation-delay: 1.2s;
        }
      `}</style>
    </div>
  );
}
