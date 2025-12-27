import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Sparkles, 
  ArrowRight, 
  BarChart3, 
  Wrench,
  ClipboardList,
  MessageSquare,
  Calendar,
  Package,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useCurrentRole } from '@/data/authStore';
import type { UserRole } from '@/models/user';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  roles: UserRole[];
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'dashboard',
    title: 'Ver KPIs',
    description: 'Acompanhe métricas em tempo real',
    icon: BarChart3,
    route: '/',
    roles: ['admin', 'technician', 'requester'],
    color: 'bg-blue-500'
  },
  {
    id: 'assets',
    title: 'Gerenciar Ativos',
    description: 'Cadastre equipamentos HVAC',
    icon: Wrench,
    route: '/ativos',
    roles: ['admin', 'technician'],
    color: 'bg-green-500'
  },
  {
    id: 'work-orders',
    title: 'Criar OS',
    description: 'Nova ordem de serviço',
    icon: ClipboardList,
    route: '/work-orders',
    roles: ['admin', 'technician'],
    color: 'bg-orange-500'
  },
  {
    id: 'requests',
    title: 'Solicitar Manutenção',
    description: 'Faça uma nova solicitação',
    icon: MessageSquare,
    route: '/requests',
    roles: ['admin', 'technician', 'requester'],
    color: 'bg-purple-500'
  },
  {
    id: 'plans',
    title: 'Planos Preventivos',
    description: 'Configure manutenções automáticas',
    icon: Calendar,
    route: '/plans',
    roles: ['admin', 'technician'],
    color: 'bg-indigo-500'
  },
  {
    id: 'inventory',
    title: 'Controlar Estoque',
    description: 'Gerencie materiais',
    icon: Package,
    route: '/inventory',
    roles: ['admin', 'technician'],
    color: 'bg-teal-500'
  }
];

export function WelcomeGuide() {
  const navigate = useNavigate();
  const [currentRole] = useCurrentRole();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show welcome guide if tour was recently completed
    const tourCompleted = localStorage.getItem('onboarding:tourCompleted');
    const guideShown = localStorage.getItem('onboarding:welcomeGuideShown');
    
    if (tourCompleted && !guideShown) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000); // Show after 1 second on dashboard

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding:welcomeGuideShown', 'true');
  };

  const handleActionClick = (route: string) => {
    handleClose();
    navigate(route);
  };

  const handleRetakeTour = () => {
    localStorage.removeItem('onboarding:tourCompleted');
    navigate('/welcome-tour');
  };

  const availableActions = quickActions.filter(action => 
    action.roles.includes(currentRole)
  );

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center relative">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted transition-colors"
            aria-label="Fechar guia"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          
          <CardTitle className="text-xl">
            🎉 Bem-vindo ao TrakNor CMMS!
          </CardTitle>
          <CardDescription className="text-base">
            Agora você está pronto para começar. Que tal experimentar uma dessas ações?
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {availableActions.slice(0, 4).map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.route)}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRetakeTour}
                className="flex-1"
              >
                Refazer Tour
              </Button>
              <Button 
                onClick={handleClose}
                className="flex-1"
              >
                Começar a Usar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="text-center">
            <Badge variant="secondary" className="text-xs">
              💡 Dica: Use Ctrl+? para ver atalhos de teclado
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}