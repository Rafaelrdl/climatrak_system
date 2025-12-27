import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/data/usersStore';
import { useCurrentRole } from '@/data/authStore';

interface OnboardingState {
  inviteAccepted: boolean;
  setupCompleted: boolean;
  tourCompleted: boolean;
  firstTimeGuideCompleted: boolean;
}

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUser();
  const [currentRole] = useCurrentRole();

  const getOnboardingState = (): OnboardingState => {
    return {
      inviteAccepted: !!localStorage.getItem('onboarding:inviteAccepted'),
      setupCompleted: !!localStorage.getItem('onboarding:setupCompleted'),
      tourCompleted: !!localStorage.getItem('onboarding:tourCompleted'),
      firstTimeGuideCompleted: !!localStorage.getItem('onboarding:firstTimeGuideCompleted'),
    };
  };

  const isNewUser = (): boolean => {
    if (!currentUser) return false;
    
    const userCreatedAt = new Date(currentUser.created_at);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return userCreatedAt > oneDayAgo;
  };

  const shouldRedirectToOnboarding = (): string | null => {
    const state = getOnboardingState();
    const isUserNew = isNewUser();
    
    // Skip onboarding for existing users
    if (!isUserNew) {
      return null;
    }

    // Skip onboarding if user is on login or onboarding pages
    const currentPath = location.pathname;
    if (currentPath.startsWith('/login') || 
        currentPath.startsWith('/onboarding') || 
        currentPath.startsWith('/welcome-tour') ||
        currentPath.startsWith('/quick-setup')) {
      return null;
    }

    // Determine next step in onboarding flow
    if (!state.setupCompleted) {
      return '/quick-setup';
    }
    
    // Tour is now handled as an interactive overlay on the dashboard
    // No redirect needed - TourProvider will auto-start the tour
    // if (!state.tourCompleted) {
    //   return '/welcome-tour';
    // }

    return null;
  };

  useEffect(() => {
    if (!currentUser) return;

    const redirectPath = shouldRedirectToOnboarding();
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

  const markStepCompleted = (step: keyof OnboardingState) => {
    const stepKey = `onboarding:${step}`;
    localStorage.setItem(stepKey, 'true');
  };

  const resetOnboarding = () => {
    const keys = [
      'onboarding:inviteAccepted',
      'onboarding:setupCompleted', 
      'onboarding:tourCompleted',
      'onboarding:firstTimeGuideCompleted'
    ];
    
    keys.forEach(key => localStorage.removeItem(key));
  };

  const getProgress = (): { completed: number; total: number; percentage: number } => {
    const state = getOnboardingState();
    // Only count visible steps (exclude inviteAccepted which is not shown to user)
    const visibleSteps = [state.setupCompleted, state.tourCompleted, state.firstTimeGuideCompleted];
    const completed = visibleSteps.filter(Boolean).length;
    const total = visibleSteps.length;
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, total, percentage };
  };

  return {
    getOnboardingState,
    isNewUser: isNewUser(),
    shouldRedirectToOnboarding,
    markStepCompleted,
    resetOnboarding,
    getProgress,
  };
}

// Component to handle onboarding redirects
export function OnboardingManager({ children }: { children: React.ReactNode }) {
  useOnboardingFlow();
  return <>{children}</>;
}

// Progress indicator component for onboarding steps
export function OnboardingProgress() {
  const { getProgress, getOnboardingState } = useOnboardingFlow();
  const progress = getProgress();
  const state = getOnboardingState();

  if (progress.completed === progress.total) {
    return null;
  }

  const steps = [
    { key: 'setupCompleted', label: 'Configuração', completed: state.setupCompleted },
    { key: 'tourCompleted', label: 'Tour', completed: state.tourCompleted },
    { key: 'firstTimeGuideCompleted', label: 'Guia', completed: state.firstTimeGuideCompleted },
  ];

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-primary">
          Configuração da Conta
        </h3>
        <span className="text-xs text-primary">
          {progress.completed}/{progress.total} completo
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="w-full bg-primary/20 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs">
          {steps.map((step) => (
            <span 
              key={step.key}
              className={`${
                step.completed ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              {step.completed ? '✓' : '○'} {step.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}