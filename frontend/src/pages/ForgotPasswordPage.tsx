import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Mail, 
  ArrowLeft, 
  CheckCircle2,
  Loader2,
  Snowflake,
  Thermometer,
  Wind,
  AlertTriangle
} from 'lucide-react';
import { requestPasswordReset } from '@/services/authService';
import climatrakLogo from '@/assets/images/logo_climatrak.svg';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState((location.state as { email?: string })?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.error || 'Erro ao processar solicitação');
      } else {
        setError('Erro de conexão. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Floating cards data
  const floatingCards = [
    {
      icon: Snowflake,
      title: 'Chiller',
      subtitle: 'Operando 100%',
      color: 'from-cyan-500 to-blue-600',
      position: 'top-[12%] left-[8%]',
      animation: 'animate-float-down',
      delay: '0s'
    },
    {
      icon: Thermometer,
      title: 'Temperatura',
      subtitle: '22°C ideal',
      color: 'from-orange-500 to-red-600',
      position: 'bottom-[35%] left-[3%]',
      animation: 'animate-float-down',
      delay: '1s'
    },
    {
      icon: Wind,
      title: 'Ventilação',
      subtitle: 'Fluxo normal',
      color: 'from-teal-500 to-emerald-600',
      position: 'bottom-[10%] left-[8%]',
      animation: 'animate-float-down',
      delay: '2s'
    },
    {
      icon: AlertTriangle,
      title: 'Manutenção',
      subtitle: 'Em dia',
      color: 'from-amber-500 to-yellow-600',
      position: 'top-[20%] right-[8%]',
      animation: 'animate-float-up',
      delay: '0.5s'
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <img 
              src={climatrakLogo} 
              alt="Climatrak" 
              className="h-28 w-auto"
            />
          </motion.div>

          {!isSuccess ? (
            <>
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-center mb-8"
              >
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Esqueceu sua senha?
                </h1>
                <p className="text-muted-foreground">
                  Digite seu email e enviaremos instruções para redefinir sua senha
                </p>
              </motion.div>

              {/* Form */}
              <motion.form 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10 h-12 bg-muted/50 border-border focus:border-primary focus:ring-primary"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-5 w-5" />
                      Enviar instruções
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Link 
                    to="/login" 
                    className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o login
                  </Link>
                </div>
              </motion.form>
            </>
          ) : (
            /* Success State */
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-5 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-green-500/30">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Email enviado!
              </h2>
              <p className="text-muted-foreground mb-6">
                Se existe uma conta com o email <strong className="text-foreground">{email}</strong>, 
                você receberá as instruções para redefinir sua senha.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Não recebeu o email? Verifique sua pasta de spam ou tente novamente em alguns minutos.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  Voltar para o login
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail('');
                  }}
                  className="w-full h-12"
                >
                  Tentar com outro email
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Right Panel - Visual Hero */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Floating Cards */}
        {floatingCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: card.animation === 'animate-float-down' ? -20 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
            className={`absolute ${card.position} ${card.animation}`}
            style={{ animationDelay: card.delay }}
          >
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl min-w-[160px]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${card.color}`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{card.title}</p>
                  <p className="text-white/70 text-xs">{card.subtitle}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Center Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full text-center px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6">
              Recupere seu acesso
            </h2>
            <p className="text-xl text-white/80 max-w-lg mb-8">
              Em poucos passos você poderá redefinir sua senha e voltar a gerenciar seus ativos HVAC.
            </p>
          </motion.div>

          {/* Steps */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col gap-4 text-left max-w-sm"
          >
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500 text-white font-bold text-sm">1</div>
              <p className="text-white/90">Digite seu email cadastrado</p>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500 text-white font-bold text-sm">2</div>
              <p className="text-white/90">Acesse o link enviado por email</p>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500 text-white font-bold text-sm">3</div>
              <p className="text-white/90">Crie uma nova senha segura</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
