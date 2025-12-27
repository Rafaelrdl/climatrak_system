import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  Snowflake,
  Shield,
  Key
} from 'lucide-react';
import { validateResetToken, confirmPasswordReset } from '@/services/authService';
import climatrakLogo from '@/assets/images/logo_climatrak.svg';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Password strength indicators
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // Validate token on mount
  useEffect(() => {
    const doValidateToken = async () => {
      if (!token) {
        setTokenError('Token não fornecido');
        setIsValidating(false);
        return;
      }

      try {
        const data = await validateResetToken(token);
        if (data.valid) {
          setIsTokenValid(true);
        } else {
          setTokenError('Token inválido ou expirado');
        }
      } catch (err) {
        if (err instanceof AxiosError) {
          setTokenError(err.response?.data?.error || 'Token inválido ou expirado');
        } else {
          setTokenError('Erro ao validar token');
        }
      } finally {
        setIsValidating(false);
      }
    };

    doValidateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (passwordStrength < 4) {
      setError('A senha não atende aos requisitos mínimos');
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(token!, password, confirmPassword);
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.error || 'Erro ao redefinir senha');
      } else {
        setError('Erro de conexão. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validando token...</p>
        </motion.div>
      </div>
    );
  }

  // Invalid token state
  if (!isTokenValid && !isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Link inválido
          </h2>
          <p className="text-muted-foreground mb-6">
            {tokenError || 'Este link de redefinição de senha é inválido ou expirou.'}
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Links de redefinição de senha expiram após 1 hora por motivos de segurança.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/forgot-password')}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium"
            >
              Solicitar novo link
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full h-12"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

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
                  Criar nova senha
                </h1>
                <p className="text-muted-foreground">
                  Digite sua nova senha abaixo
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

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Nova senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua nova senha"
                      className="pl-10 pr-10 h-12 bg-muted/50 border-border focus:border-primary focus:ring-primary"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              passwordStrength >= level
                                ? passwordStrength === 4
                                  ? 'bg-green-500'
                                  : passwordStrength >= 3
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`flex items-center gap-1 ${passwordChecks.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordChecks.length ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Mínimo 8 caracteres
                        </div>
                        <div className={`flex items-center gap-1 ${passwordChecks.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordChecks.uppercase ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Letra maiúscula
                        </div>
                        <div className={`flex items-center gap-1 ${passwordChecks.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordChecks.lowercase ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Letra minúscula
                        </div>
                        <div className={`flex items-center gap-1 ${passwordChecks.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordChecks.number ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Número
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirmar nova senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme sua nova senha"
                      className={`pl-10 pr-10 h-12 bg-muted/50 border-border focus:border-primary focus:ring-primary ${
                        confirmPassword.length > 0 && !passwordsMatch ? 'border-red-500' : ''
                      }`}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordsMatch ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Senhas coincidem
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Senhas não coincidem
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium transition-all duration-200"
                  disabled={isLoading || passwordStrength < 4 || !passwordsMatch}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Redefinindo...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-5 w-5" />
                      Redefinir senha
                    </>
                  )}
                </Button>
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
              <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Senha redefinida!
              </h2>
              <p className="text-muted-foreground mb-8">
                Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium"
              >
                Ir para o login
              </Button>
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

        {/* Floating Security Icons */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="absolute top-[20%] left-[15%] animate-float-down"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Segurança</p>
                <p className="text-white/70 text-xs">Dados protegidos</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="absolute bottom-[15%] right-[8%] animate-float-up"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600">
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Senha forte</p>
                <p className="text-white/70 text-xs">Proteção avançada</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full text-center px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm">
              <Lock className="h-10 w-10 text-teal-400" />
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6">
              Proteja sua conta
            </h2>
            <p className="text-xl text-white/80 max-w-lg mb-8">
              Crie uma senha forte e segura para proteger seus dados e ativos HVAC.
            </p>
          </motion.div>

          {/* Security Tips */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-left max-w-sm space-y-3"
          >
            <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <CheckCircle2 className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
              <p className="text-white/90 text-sm">Use uma combinação de letras maiúsculas, minúsculas e números</p>
            </div>
            <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <CheckCircle2 className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
              <p className="text-white/90 text-sm">Evite usar informações pessoais como datas ou nomes</p>
            </div>
            <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <CheckCircle2 className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
              <p className="text-white/90 text-sm">Não reutilize senhas de outros serviços</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
