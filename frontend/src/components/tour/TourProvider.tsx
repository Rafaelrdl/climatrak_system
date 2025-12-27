import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { InteractiveTour, type TourConfig } from './InteractiveTour';
import { 
  welcomeTourConfig, 
  getTourForPage, 
  hasCompletedTour,
  resetAllTours,
  getTourProgress
} from './tourConfigs';

// ==================== TYPES ====================

interface TourContextValue {
  // State
  isOpen: boolean;
  currentTour: TourConfig | null;
  hasCompletedWelcomeTour: boolean;
  
  // Actions
  startTour: (tourId?: string) => void;
  startWelcomeTour: () => void;
  startPageTour: () => void;
  closeTour: () => void;
  resetTour: (tourId?: string) => void;
  resetAllTours: () => void;
  
  // Progress
  getProgress: () => { completed: number; total: number; percentage: number };
}

// ==================== CONTEXT ====================

const TourContext = createContext<TourContextValue | null>(null);

// ==================== PROVIDER ====================

interface TourProviderProps {
  children: ReactNode;
  autoStartWelcomeTour?: boolean;
}

export function TourProvider({ children, autoStartWelcomeTour = false }: TourProviderProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentTour, setCurrentTour] = useState<TourConfig | null>(null);
  const [hasCompletedWelcomeTour, setHasCompletedWelcomeTour] = useState(false);

  // Check initial state
  useEffect(() => {
    const completed = hasCompletedTour('welcome');
    setHasCompletedWelcomeTour(completed);

    // Check if we should start tour (from QuickSetupPage redirect)
    const shouldStartTour = localStorage.getItem('onboarding:shouldStartTour') === 'true';
    
    // Determine if we should auto-start
    const shouldAuto = autoStartWelcomeTour || shouldStartTour;

    // Auto-start welcome tour for new users
    if (shouldAuto && !completed) {
      const isOnboardingPath = 
        location.pathname.includes('/login') ||
        location.pathname.includes('/onboarding') ||
        location.pathname.includes('/welcome-tour') ||
        location.pathname.includes('/quick-setup');

      if (!isOnboardingPath) {
        // Clear the flag so it doesn't trigger again
        localStorage.removeItem('onboarding:shouldStartTour');
        
        // Delay to allow page to load
        const timer = setTimeout(() => {
          setCurrentTour(welcomeTourConfig);
          setIsOpen(true);
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [autoStartWelcomeTour, location.pathname]);

  // Start a specific tour by ID
  const startTour = useCallback((tourId?: string) => {
    if (tourId === 'welcome' || !tourId) {
      setCurrentTour(welcomeTourConfig);
    } else {
      const pageTour = getTourForPage(location.pathname);
      if (pageTour && pageTour.id === tourId) {
        setCurrentTour(pageTour);
      }
    }
    setIsOpen(true);
  }, [location.pathname]);

  // Start welcome tour
  const startWelcomeTour = useCallback(() => {
    setCurrentTour(welcomeTourConfig);
    setIsOpen(true);
  }, []);

  // Start tour for current page
  const startPageTour = useCallback(() => {
    const pageTour = getTourForPage(location.pathname);
    if (pageTour) {
      setCurrentTour(pageTour);
      setIsOpen(true);
    } else {
      // Fallback to welcome tour
      setCurrentTour(welcomeTourConfig);
      setIsOpen(true);
    }
  }, [location.pathname]);

  // Close tour
  const closeTour = useCallback(() => {
    setIsOpen(false);
    // Update completed state
    if (currentTour?.storageKey === 'welcome') {
      setHasCompletedWelcomeTour(true);
    }
  }, [currentTour]);

  // Reset a specific tour
  const resetTour = useCallback((tourId?: string) => {
    const key = tourId || currentTour?.storageKey || 'welcome';
    localStorage.removeItem(`tour:${key}:completed`);
    localStorage.removeItem(`tour:${key}:skipped`);
    localStorage.removeItem(`tour:${key}:step`);
    
    if (key === 'welcome') {
      setHasCompletedWelcomeTour(false);
    }
  }, [currentTour]);

  // Reset all tours
  const handleResetAllTours = useCallback(() => {
    resetAllTours();
    setHasCompletedWelcomeTour(false);
  }, []);

  // Get progress
  const getProgress = useCallback(() => {
    return getTourProgress();
  }, []);

  // Context value
  const value: TourContextValue = {
    isOpen,
    currentTour,
    hasCompletedWelcomeTour,
    startTour,
    startWelcomeTour,
    startPageTour,
    closeTour,
    resetTour,
    resetAllTours: handleResetAllTours,
    getProgress
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      
      {/* Render tour */}
      {currentTour && (
        <InteractiveTour
          config={{
            ...currentTour,
            onComplete: () => {
              currentTour.onComplete?.();
              closeTour();
            },
            onSkip: () => {
              currentTour.onSkip?.();
              closeTour();
            }
          }}
          isOpen={isOpen}
          onClose={closeTour}
        />
      )}
    </TourContext.Provider>
  );
}

// ==================== HOOK ====================

export function useTour() {
  const context = useContext(TourContext);
  
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  
  return context;
}

// ==================== HELPER COMPONENTS ====================

interface StartTourButtonProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: ReactNode;
  tourId?: string;
}

export function StartTourButton({ 
  className, 
  variant = 'outline', 
  size = 'default',
  children,
  tourId
}: StartTourButtonProps) {
  const { startTour } = useTour();

  return (
    <button
      onClick={() => startTour(tourId)}
      className={className}
    >
      {children || 'Iniciar Tour'}
    </button>
  );
}

interface TourTriggerProps {
  tourId?: string;
  children: (props: { startTour: () => void; hasCompleted: boolean }) => ReactNode;
}

export function TourTrigger({ tourId = 'welcome', children }: TourTriggerProps) {
  const { startTour } = useTour();
  const hasCompleted = hasCompletedTour(tourId);

  return <>{children({ startTour: () => startTour(tourId), hasCompleted })}</>;
}
