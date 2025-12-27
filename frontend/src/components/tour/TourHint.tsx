import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  X, 
  Lightbulb, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { useCurrentRole } from '@/data/authStore';

interface PageHint {
  path: string;
  title: string;
  hint: string;
  action?: {
    label: string;
    route: string;
  };
  roles?: string[];
}

const pageHints: PageHint[] = [
  {
    path: '/',
    title: 'Dashboard',
    hint: 'Aqui você tem uma visão geral de todas as atividades de manutenção. Os KPIs mostram o desempenho em tempo real.',
    action: { label: 'Ver Tour Completo', route: '/welcome-tour' }
  },
  {
    path: '/ativos',
    title: 'Gestão de Ativos',
    hint: 'Organize seus equipamentos HVAC hierarquicamente. Use a árvore à esquerda para navegar por empresas → setores → equipamentos.',
    roles: ['admin', 'technician']
  },
  {
    path: '/work-orders',
    title: 'Ordens de Serviço',
    hint: 'Alterne entre visualizações: Lista, Kanban e Painel. Use o Kanban para um fluxo visual das OS.',
    roles: ['admin', 'technician']
  },
  {
    path: '/requests',
    title: 'Solicitações',
    hint: 'Fluxo simplificado: Nova → Triagem → Conversão em OS. Você pode adicionar itens de estoque a cada solicitação.',
    roles: ['admin', 'technician', 'requester']
  },
  {
    path: '/plans',
    title: 'Planos de Manutenção',
    hint: 'Crie planos preventivos que geram OS automaticamente. Configure frequência e checklist para cada plano.',
    roles: ['admin', 'technician']
  },
  {
    path: '/metrics',
    title: 'Métricas e Indicadores',
    hint: 'Analise MTTR, MTBF e performance por técnico. Use os filtros de período para análises detalhadas.',
    roles: ['admin', 'technician']
  },
  {
    path: '/inventory',
    title: 'Controle de Estoque',
    hint: 'Gerencie materiais em 3 visualizações: Tabela, Cards e Análise. Configure alertas de reposição para cada item.',
    roles: ['admin', 'technician']
  },
  {
    path: '/procedures',
    title: 'Procedimentos',
    hint: 'Armazene PDFs e documentos Markdown. Use a visualização inline com zoom para consultar procedimentos rapidamente.',
    roles: ['admin', 'technician', 'requester']
  }
];

export function TourHint() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentRole] = useCurrentRole();
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentHint, setCurrentHint] = useState<PageHint | null>(null);

  useEffect(() => {
    // Check if user has dismissed hints permanently
    const hintsDisabled = localStorage.getItem('tour:hintsDisabled');
    if (hintsDisabled) return;

    // Find hint for current page
    const hint = pageHints.find(h => h.path === location.pathname);
    if (hint && (!hint.roles || hint.roles.includes(currentRole))) {
      setCurrentHint(hint);
      
      // Show hint after a delay, but only if tour was completed
      const tourCompleted = localStorage.getItem('onboarding:tourCompleted');
      if (tourCompleted) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 2000);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
      setCurrentHint(null);
    }
  }, [location.pathname, currentRole]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleDisable = () => {
    localStorage.setItem('tour:hintsDisabled', 'true');
    setIsVisible(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleRetakeTour = () => {
    localStorage.removeItem('onboarding:tourCompleted');
    navigate('/welcome-tour');
  };

  const handleActionClick = () => {
    if (currentHint?.action) {
      navigate(currentHint.action.route);
    }
  };

  if (!isVisible || !currentHint) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <Card className="shadow-lg border-primary/20 bg-card/95 backdrop-blur">
        {!isMinimized ? (
          <>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{currentHint.title}</h4>
                    <Badge variant="secondary" className="text-xs mt-1">
                      Dica
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMinimize}
                    className="h-6 w-6 p-0"
                  >
                    <HelpCircle className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {currentHint.hint}
              </p>

              <div className="flex flex-col gap-2">
                {currentHint.action && (
                  <Button
                    size="sm"
                    onClick={handleActionClick}
                    className="w-full justify-between"
                  >
                    <span>{currentHint.action.label}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetakeTour}
                    className="flex-1 text-xs"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Refazer Tour
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisable}
                    className="flex-1 text-xs"
                  >
                    Não mostrar mais
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMinimize}
              className="w-full justify-between"
            >
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span className="text-sm">Dica disponível</span>
              </div>
              <HelpCircle className="w-4 h-4" />
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}