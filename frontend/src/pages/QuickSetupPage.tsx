import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  ChevronLeft, 
  ChevronRight, 
  User as UserIcon, 
  Settings, 
  Bell, 
  CheckCircle,
  Upload
} from 'lucide-react';
import { useCurrentUser, useUpdateCurrentUser } from '@/data/usersStore';
import { toast } from 'sonner';
import type { User } from '@/models/user';

interface SetupData {
  // Profile
  name: string;
  phone: string;
  avatar: string;
  
  // Preferences
  theme: 'system' | 'light' | 'dark';
  language: 'pt-BR' | 'en-US';
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '24h' | '12h';
  
  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
}

const setupSteps = [
  {
    id: 'profile',
    title: 'Perfil',
    description: 'Complete suas informações pessoais',
    icon: UserIcon
  },
  {
    id: 'preferences',
    title: 'Preferências',
    description: 'Configure a aparência do sistema',
    icon: Settings
  },
  {
    id: 'notifications',
    title: 'Notificações',
    description: 'Escolha como deseja ser notificado',
    icon: Bell
  }
];

export function QuickSetupPage() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const updateUser = useUpdateCurrentUser();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<SetupData>({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    avatar: currentUser?.avatar_url || '',
    theme: currentUser?.preferences?.theme || 'system',
    language: currentUser?.preferences?.language || 'pt-BR',
    dateFormat: currentUser?.preferences?.date_format || 'DD/MM/YYYY',
    timeFormat: currentUser?.preferences?.time_format || '24h',
    emailNotifications: currentUser?.preferences?.notifications?.email ?? true,
    pushNotifications: currentUser?.preferences?.notifications?.push ?? true,
  });

  const progress = ((currentStep + 1) / setupSteps.length) * 100;
  const isLastStep = currentStep === setupSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = async () => {
    if (isLastStep) {
      await handleFinishSetup();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleInputChange = (field: keyof SetupData, value: any) => {
    setSetupData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        handleInputChange('avatar', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinishSetup = async () => {
    setLoading(true);
    try {
      const updatedUser: Partial<User> = {
        name: setupData.name,
        phone: setupData.phone,
        avatar_url: setupData.avatar,
        preferences: {
          theme: setupData.theme,
          language: setupData.language,
          date_format: setupData.dateFormat,
          time_format: setupData.timeFormat,
          notifications: {
            email: setupData.emailNotifications,
            push: setupData.pushNotifications,
          },
        },
      };

      updateUser(updatedUser);
      
      // Mark setup as completed
      localStorage.setItem('onboarding:setupCompleted', 'true');
      
      toast.success('Configuração concluída com sucesso!');
      // Mark that interactive tour should start on dashboard
      localStorage.setItem('onboarding:shouldStartTour', 'true');
      navigate('/');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipSetup = () => {
    localStorage.setItem('onboarding:setupCompleted', 'true');
    // Mark that interactive tour should start on dashboard
    localStorage.setItem('onboarding:shouldStartTour', 'true');
    navigate('/');
  };

  const renderProfileStep = () => (
    <div className="space-y-6">
      {/* Avatar Upload */}
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="w-24 h-24">
          <AvatarImage src={setupData.avatar} />
          <AvatarFallback className="text-lg">
            {setupData.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="text-center">
          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('avatar-upload')?.click()}
            className="flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Alterar Foto</span>
          </Button>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo</Label>
        <Input
          id="name"
          value={setupData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Digite seu nome completo"
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone (Opcional)</Label>
        <Input
          id="phone"
          type="tel"
          value={setupData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </div>
    </div>
  );

  const renderPreferencesStep = () => (
    <div className="space-y-6">
      {/* Date Format */}
      <div className="space-y-2">
        <Label htmlFor="dateFormat">Formato de Data</Label>
        <Select 
          value={setupData.dateFormat} 
          onValueChange={(value) => handleInputChange('dateFormat', value)}
        >
          <SelectTrigger id="dateFormat">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DD/MM/YYYY">DD/MM/AAAA (31/12/2024)</SelectItem>
            <SelectItem value="YYYY-MM-DD">AAAA-MM-DD (2024-12-31)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time Format */}
      <div className="space-y-2">
        <Label htmlFor="timeFormat">Formato de Hora</Label>
        <Select 
          value={setupData.timeFormat} 
          onValueChange={(value) => handleInputChange('timeFormat', value)}
        >
          <SelectTrigger id="timeFormat">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 horas (14:30)</SelectItem>
            <SelectItem value="12h">12 horas (2:30 PM)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderNotificationsStep = () => (
    <div className="space-y-6">
      <div className="text-center text-muted-foreground text-sm">
        Configure quando e como deseja receber notificações do sistema
      </div>

      {/* Email Notifications */}
      <div className="flex items-center justify-between p-4 rounded-lg border">
        <div className="flex-1">
          <h3 className="font-medium">Notificações por Email</h3>
          <p className="text-sm text-muted-foreground">
            Receba atualizações importantes por email
          </p>
        </div>
        <Switch
          checked={setupData.emailNotifications}
          onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
        />
      </div>

      {/* Push Notifications */}
      <div className="flex items-center justify-between p-4 rounded-lg border">
        <div className="flex-1">
          <h3 className="font-medium">Notificações Push</h3>
          <p className="text-sm text-muted-foreground">
            Receba notificações em tempo real no navegador
          </p>
        </div>
        <Switch
          checked={setupData.pushNotifications}
          onCheckedChange={(checked) => handleInputChange('pushNotifications', checked)}
        />
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Resumo das suas preferências:</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Nome: {setupData.name || 'Não informado'}</li>
          <li>• Formato de Data: {setupData.dateFormat === 'DD/MM/YYYY' ? 'DD/MM/AAAA' : 'AAAA-MM-DD'}</li>
          <li>• Formato de Hora: {setupData.timeFormat === '24h' ? '24 horas' : '12 horas'}</li>
          <li>• Email: {setupData.emailNotifications ? 'Ativado' : 'Desativado'}</li>
          <li>• Push: {setupData.pushNotifications ? 'Ativado' : 'Desativado'}</li>
        </ul>
      </div>
    </div>
  );

  const currentStepData = setupSteps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Configuração Rápida</h1>
                <p className="text-sm text-muted-foreground">
                  {currentStepData.description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Progress value={progress} className="w-32" />
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} de {setupSteps.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <StepIcon className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>{currentStepData.title}</CardTitle>
              <CardDescription>{currentStepData.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {currentStep === 0 && renderProfileStep()}
              {currentStep === 1 && renderPreferencesStep()}
              {currentStep === 2 && renderNotificationsStep()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSkipSetup}
            >
              Pular
            </Button>

            <Button 
              onClick={handleNext}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {isLastStep ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{loading ? 'Salvando...' : 'Concluir'}</span>
                </>
              ) : (
                <>
                  <span>Próximo</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}