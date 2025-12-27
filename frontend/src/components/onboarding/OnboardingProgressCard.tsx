import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, Sparkles, ArrowRight, Play } from 'lucide-react';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useTour } from '@/components/tour';

export function OnboardingProgressCard() {
  const navigate = useNavigate();
  const { getOnboardingState, getProgress, isNewUser } = useOnboardingFlow();
  const { startWelcomeTour } = useTour();

  // Don't show for existing users or if all steps are completed
  if (!isNewUser) {
    return null;
  }

  const state = getOnboardingState();
  const progress = getProgress();

  // Don't show if fully completed
  if (progress.percentage === 100) {
    return null;
  }

  const steps = [
    {
      key: 'setupCompleted',
      label: 'Configuração Inicial',
      description: 'Configure suas preferências pessoais',
      completed: state.setupCompleted,
      action: () => navigate('/quick-setup')
    },
    {
      key: 'tourCompleted', 
      label: 'Tour do Sistema',
      description: 'Conheça as principais funcionalidades',
      completed: state.tourCompleted,
      action: () => startWelcomeTour() // Start interactive tour overlay
    },
    {
      key: 'firstTimeGuideCompleted',
      label: 'Guia Interativo',
      description: 'Navegação guiada pela interface',
      completed: state.firstTimeGuideCompleted,
      action: () => startWelcomeTour() // Also starts the tour
    }
  ];

  const nextStep = steps.find(step => !step.completed);

  const handleContinue = () => {
    if (nextStep) {
      nextStep.action();
    }
  };

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Bem-vindo ao TrakNor!</CardTitle>
              <CardDescription>
                Complete sua configuração inicial para aproveitar ao máximo o sistema
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {progress.completed}/{progress.total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso da configuração</span>
            <span className="font-medium">{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>

        {/* Steps List */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                step.completed 
                  ? 'bg-green-50 dark:bg-green-950/20' 
                  : step === nextStep 
                    ? 'bg-primary/5' 
                    : 'bg-muted/50'
              }`}
            >
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className={`w-5 h-5 ${
                    step === nextStep ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  step.completed ? 'text-green-700 dark:text-green-400' : ''
                }`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>
              {step.completed && (
                <Badge variant="secondary" className="text-xs">
                  Concluído
                </Badge>
              )}
              {!step.completed && step === nextStep && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    step.action();
                  }}
                  className="text-xs h-7"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Iniciar
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Action Button */}
        {nextStep && (
          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Próximo: {nextStep.label}
            </p>
            <Button onClick={handleContinue} size="sm" className="flex items-center space-x-1">
              <span>Continuar</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Fallback button to restart tour even if all completed */}
        {!nextStep && (
          <div className="flex justify-center pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={startWelcomeTour}
              className="flex items-center space-x-1"
            >
              <Play className="w-3 h-3" />
              <span>Reiniciar Tour</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}