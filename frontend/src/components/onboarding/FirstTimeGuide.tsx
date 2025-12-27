import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Lightbulb, ChevronRight } from 'lucide-react';
import { useCurrentRole } from '@/data/authStore';
import type { UserRole } from '@/models/user';

interface TourSpotlight {
  id: string;
  selector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  roles?: UserRole[];
  action?: () => void;
}

interface FirstTimeGuideProps {
  onComplete: () => void;
  onSkip: () => void;
}

const tourSpotlights: TourSpotlight[] = [
  {
    id: 'logo',
    selector: '[data-tour="logo"]',
    title: 'TrakNor CMMS',
    description: 'Este é o seu sistema de gestão de manutenção. Clique no logo para voltar ao dashboard a qualquer momento.',
    position: 'bottom',
    roles: ['admin', 'technician', 'requester']
  },
  {
    id: 'navigation',
    selector: '[data-tour="navigation"]',
    title: 'Menu de Navegação',
    description: 'Use esta barra para navegar entre as diferentes seções do sistema. Cada ícone representa uma área funcional.',
    position: 'bottom',
    roles: ['admin', 'technician', 'requester']
  },
  {
    id: 'user-menu',
    selector: '[data-tour="user-menu"]',
    title: 'Menu do Usuário',
    description: 'Acesse seu perfil, configurações e opções de logout através deste menu.',
    position: 'bottom',
    roles: ['admin', 'technician', 'requester']
  },
  {
    id: 'dashboard-kpis',
    selector: '[data-tour="dashboard-kpis"]',
    title: 'Indicadores (KPIs)',
    description: 'Acompanhe métricas importantes da manutenção em tempo real através destes cartões.',
    position: 'bottom',
    roles: ['admin', 'technician']
  },
  {
    id: 'dashboard-charts',
    selector: '[data-tour="dashboard-charts"]',
    title: 'Gráficos e Análises',
    description: 'Visualize tendências e padrões através de gráficos interativos que ajudam na tomada de decisões.',
    position: 'top',
    roles: ['admin', 'technician']
  },
  {
    id: 'next-maintenances',
    selector: '[data-tour="next-maintenances"]',
    title: 'Próximas Manutenções',
    description: 'Fique atento às manutenções programadas para os próximos dias.',
    position: 'top',
    roles: ['admin', 'technician']
  },
  {
    id: 'mobile-menu',
    selector: '[data-tour="mobile-menu"]',
    title: 'Menu Mobile',
    description: 'Em dispositivos móveis, use este botão para acessar o menu de navegação.',
    position: 'bottom',
    roles: ['admin', 'technician', 'requester']
  }
];

export function FirstTimeGuide({ onComplete, onSkip }: FirstTimeGuideProps) {
  const [currentRole] = useCurrentRole();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Filter spotlights based on user role
  const availableSpotlights = tourSpotlights.filter(spotlight => 
    !spotlight.roles || spotlight.roles.includes(currentRole)
  );

  const currentSpotlight = availableSpotlights[currentStep];

  useEffect(() => {
    if (!currentSpotlight || !isVisible) return;

    const findAndHighlightElement = () => {
      const element = document.querySelector(currentSpotlight.selector);
      if (element) {
        setTargetElement(element);
        
        const rect = element.getBoundingClientRect();
        const padding = 8;
        
        setOverlayStyle({
          clipPath: `polygon(
            0% 0%, 
            0% 100%, 
            ${rect.left - padding}px 100%, 
            ${rect.left - padding}px ${rect.top - padding}px, 
            ${rect.right + padding}px ${rect.top - padding}px, 
            ${rect.right + padding}px ${rect.bottom + padding}px, 
            ${rect.left - padding}px ${rect.bottom + padding}px, 
            ${rect.left - padding}px 100%, 
            100% 100%, 
            100% 0%
          )`,
        });

        // Scroll element into view if needed
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }
    };

    // Try to find element immediately
    findAndHighlightElement();

    // If not found, retry after a short delay (for dynamically loaded content)
    const timer = setTimeout(findAndHighlightElement, 100);

    return () => clearTimeout(timer);
  }, [currentStep, currentSpotlight, isVisible]);

  useEffect(() => {
    // Position tooltip based on target element and preferred position
    if (!targetElement || !tooltipRef.current || !currentSpotlight) return;

    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top = 0;
    let left = 0;
    
    switch (currentSpotlight.position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - 16;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + 16;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - 16;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + 16;
        break;
    }
    
    // Ensure tooltip stays within viewport
    left = Math.max(16, Math.min(left, viewportWidth - tooltipRect.width - 16));
    top = Math.max(16, Math.min(top, viewportHeight - tooltipRect.height - 16));
    
    tooltipRef.current.style.top = `${top}px`;
    tooltipRef.current.style.left = `${left}px`;
  }, [targetElement, currentSpotlight]);

  const handleNext = () => {
    if (currentStep < availableSpotlights.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsVisible(false);
    onSkip();
  };

  const getArrowIcon = (position: string) => {
    switch (position) {
      case 'top': return ArrowUp;
      case 'bottom': return ArrowDown;
      case 'left': return ArrowLeft;
      case 'right': return ArrowRight;
      default: return ArrowDown;
    }
  };

  if (!isVisible || !currentSpotlight) {
    return null;
  }

  const isLastStep = currentStep === availableSpotlights.length - 1;
  const isFirstStep = currentStep === 0;
  const ArrowIcon = getArrowIcon(currentSpotlight.position);

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-40 transition-all duration-300"
        style={overlayStyle}
        onClick={handleSkip}
      />
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 w-80 max-w-[calc(100vw-2rem)]"
        style={{ position: 'fixed' }}
      >
        <Card className="shadow-xl border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Lightbulb className="w-3 h-3 text-primary-foreground" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {currentStep + 1} de {availableSpotlights.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardTitle className="text-base flex items-center space-x-2">
              <span>{currentSpotlight.title}</span>
              <ArrowIcon className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm mb-4">
              {currentSpotlight.description}
            </CardDescription>
            
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={isFirstStep}
              >
                Anterior
              </Button>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                >
                  Pular
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="flex items-center space-x-1"
                >
                  <span>{isLastStep ? 'Concluir' : 'Próximo'}</span>
                  {!isLastStep && <ChevronRight className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Hook to manage first-time guide state
export function useFirstTimeGuide() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if user has completed first-time guide
    const hasCompletedGuide = localStorage.getItem('onboarding:firstTimeGuideCompleted');
    const hasCompletedSetup = localStorage.getItem('onboarding:setupCompleted');
    const hasCompletedTour = localStorage.getItem('onboarding:tourCompleted');
    
    // Show guide if setup and tour are completed but first-time guide is not
    if (hasCompletedSetup && hasCompletedTour && !hasCompletedGuide) {
      setShouldShow(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('onboarding:firstTimeGuideCompleted', 'true');
    setShouldShow(false);
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding:firstTimeGuideCompleted', 'true');
    setShouldShow(false);
  };

  return {
    shouldShow,
    handleComplete,
    handleSkip,
  };
}