import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Sparkles,
  SkipForward,
  RotateCcw,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useCurrentRole } from '@/data/authStore';
import type { UserRole } from '@/models/user';

// ==================== TYPES ====================

export interface TourStep {
  id: string;
  title: string;
  content: string | React.ReactNode;
  target?: string; // CSS selector
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
  roles?: UserRole[];
  action?: {
    label: string;
    onClick: () => void;
  };
  beforeShow?: () => void | Promise<void>;
  afterShow?: () => void;
  disableInteraction?: boolean;
  highlightTarget?: boolean;
  waitForElement?: boolean;
  showSkipOnFirst?: boolean; // Show prominent skip button on first step
}

export interface TourConfig {
  id: string;
  name: string;
  description?: string;
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  onStepChange?: (stepIndex: number, step: TourStep) => void;
  allowSkip?: boolean;
  showProgress?: boolean;
  showStepNumbers?: boolean;
  persistProgress?: boolean;
  storageKey?: string;
}

interface InteractiveTourProps {
  config: TourConfig;
  isOpen: boolean;
  onClose: () => void;
  startStep?: number;
}

// ==================== TOUR OVERLAY ====================

function TourOverlay({
  targetRect,
  spotlightPadding = 8,
  onClick
}: {
  targetRect: DOMRect | null;
  spotlightPadding?: number;
  onClick?: () => void;
}) {
  if (!targetRect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onClick}
      />
    );
  }

  const padding = spotlightPadding;
  const { left, top, width, height } = targetRect;

  // Create spotlight cutout using clip-path
  const clipPath = `polygon(
    0% 0%,
    0% 100%,
    ${left - padding}px 100%,
    ${left - padding}px ${top - padding}px,
    ${left + width + padding}px ${top - padding}px,
    ${left + width + padding}px ${top + height + padding}px,
    ${left - padding}px ${top + height + padding}px,
    ${left - padding}px 100%,
    100% 100%,
    100% 0%
  )`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] pointer-events-auto"
      style={{ clipPath }}
      onClick={onClick}
    />
  );
}

// ==================== SPOTLIGHT RING ====================

function SpotlightRing({ targetRect, padding = 8 }: { targetRect: DOMRect | null; padding?: number }) {
  if (!targetRect) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        boxShadow: [
          '0 0 0 2px rgba(16, 185, 129, 0.5)',
          '0 0 0 4px rgba(16, 185, 129, 0.3)',
          '0 0 0 2px rgba(16, 185, 129, 0.5)'
        ]
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        boxShadow: { 
          repeat: Infinity, 
          duration: 2,
          ease: 'easeInOut'
        }
      }}
      className="fixed z-[9999] pointer-events-none rounded-lg border-2 border-primary"
      style={{
        left: targetRect.left - padding,
        top: targetRect.top - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }}
    />
  );
}

// ==================== TOUR TOOLTIP ====================

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrevious,
  onSkip,
  onClose,
  showProgress,
  showStepNumbers,
  isFirstStep,
  isLastStep,
  allowSkip
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onClose: () => void;
  showProgress?: boolean;
  showStepNumbers?: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  allowSkip?: boolean;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const placement = step.placement || 'bottom';

  // Calculate tooltip position
  useEffect(() => {
    if (!tooltipRef.current) return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 16;

    let top = 0;
    let left = 0;

    if (!targetRect || placement === 'center') {
      // Center in viewport
      top = (viewportHeight - tooltipRect.height) / 2;
      left = (viewportWidth - tooltipRect.width) / 2;
    } else {
      // Position relative to target
      switch (placement) {
        case 'top':
          top = targetRect.top - tooltipRect.height - gap;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + gap;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - gap;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + gap;
          break;
      }

      // Keep within viewport bounds
      if (left < gap) left = gap;
      if (left + tooltipRect.width > viewportWidth - gap) {
        left = viewportWidth - tooltipRect.width - gap;
      }
      if (top < gap) top = gap;
      if (top + tooltipRect.height > viewportHeight - gap) {
        top = viewportHeight - tooltipRect.height - gap;
      }
    }

    setPosition({ top, left });
  }, [targetRect, placement]);

  // Arrow direction icon
  const ArrowIcon = {
    top: ArrowDown,
    bottom: ArrowUp,
    left: ArrowRight,
    right: ArrowLeft,
    center: null
  }[placement];

  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, y: placement === 'top' ? 10 : -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: placement === 'top' ? 10 : -10, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed z-[10000] w-[360px] max-w-[calc(100vw-32px)]"
      style={{ top: position.top, left: position.left }}
    >
      <Card className="shadow-2xl border-primary/20">
        <CardHeader className="pb-3 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Fechar tour"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Step indicator */}
          {showStepNumbers && (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Passo {stepIndex + 1} de {totalSteps}
              </Badge>
            </div>
          )}

          <div className="flex items-start gap-3 pr-8">
            {targetRect && ArrowIcon && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ArrowIcon className="w-4 h-4 text-primary" />
              </div>
            )}
            {!targetRect && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-base">{step.title}</CardTitle>
              {step.content && (
                <CardDescription className="mt-1 text-sm">
                  {typeof step.content === 'string' ? step.content : step.content}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Progress bar */}
          {showProgress && (
            <div className="mb-4">
              <Progress value={progress} className="h-1" />
            </div>
          )}

          {/* Custom action button */}
          {step.action && (
            <Button
              variant="outline"
              size="sm"
              onClick={step.action.onClick}
              className="w-full mb-3"
            >
              {step.action.label}
            </Button>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2">
            {/* Special first step with prominent skip */}
            {isFirstStep && step.showSkipOnFirst ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSkip}
                  className="flex-1"
                >
                  Não, obrigado
                </Button>
                <Button
                  size="sm"
                  onClick={onNext}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Iniciar Tour
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {!isFirstStep && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onPrevious}
                      className="text-muted-foreground"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {allowSkip && !isLastStep && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onSkip}
                      className="text-muted-foreground"
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      Pular
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={onNext}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isLastStep ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Concluir
                      </>
                    ) : (
                      <>
                        Próximo
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export function InteractiveTour({
  config,
  isOpen,
  onClose,
  startStep = 0
}: InteractiveTourProps) {
  const [currentRole] = useCurrentRole();
  const [currentStepIndex, setCurrentStepIndex] = useState(startStep);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Filter steps based on user role
  const availableSteps = config.steps.filter(
    step => !step.roles || step.roles.includes(currentRole)
  );

  const currentStep = availableSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === availableSteps.length - 1;

  // Find and highlight target element
  const updateTargetElement = useCallback(() => {
    if (!currentStep?.target) {
      setTargetRect(null);
      setIsReady(true);
      return;
    }

    const element = document.querySelector(currentStep.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      setIsReady(true);

      // Scroll element into view if needed
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    } else if (currentStep.waitForElement) {
      // Retry after a delay
      setIsReady(false);
      const timer = setTimeout(updateTargetElement, 100);
      return () => clearTimeout(timer);
    } else {
      setTargetRect(null);
      setIsReady(true);
    }
  }, [currentStep]);

  // Update target on step change
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    // Call beforeShow hook
    if (currentStep.beforeShow) {
      Promise.resolve(currentStep.beforeShow()).then(() => {
        updateTargetElement();
      });
    } else {
      updateTargetElement();
    }

    // Call afterShow hook
    return () => {
      if (currentStep.afterShow) {
        currentStep.afterShow();
      }
    };
  }, [isOpen, currentStepIndex, currentStep, updateTargetElement]);

  // Handle window resize
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      updateTargetElement();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, updateTargetElement]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowRight':
        case 'Enter':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, isLastStep]);

  // Save progress
  useEffect(() => {
    if (config.persistProgress && config.storageKey) {
      localStorage.setItem(`tour:${config.storageKey}:step`, String(currentStepIndex));
    }
  }, [currentStepIndex, config.persistProgress, config.storageKey]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
      config.onStepChange?.(currentStepIndex + 1, availableSteps[currentStepIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
      config.onStepChange?.(currentStepIndex - 1, availableSteps[currentStepIndex - 1]);
    }
  };

  const handleSkip = () => {
    if (config.storageKey) {
      localStorage.setItem(`tour:${config.storageKey}:skipped`, 'true');
    }
    config.onSkip?.();
    onClose();
  };

  const handleComplete = () => {
    if (config.storageKey) {
      localStorage.setItem(`tour:${config.storageKey}:completed`, 'true');
      localStorage.removeItem(`tour:${config.storageKey}:step`);
    }
    config.onComplete?.();
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen || !currentStep) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && isReady && (
        <>
          {/* Overlay with spotlight cutout */}
          <TourOverlay
            targetRect={targetRect}
            spotlightPadding={currentStep.spotlightPadding}
            onClick={config.allowSkip ? handleSkip : undefined}
          />

          {/* Spotlight ring around target */}
          {currentStep.highlightTarget !== false && (
            <SpotlightRing
              targetRect={targetRect}
              padding={currentStep.spotlightPadding}
            />
          )}

          {/* Tooltip */}
          <TourTooltip
            step={currentStep}
            stepIndex={currentStepIndex}
            totalSteps={availableSteps.length}
            targetRect={targetRect}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
            onClose={handleClose}
            showProgress={config.showProgress}
            showStepNumbers={config.showStepNumbers}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            allowSkip={config.allowSkip}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ==================== HOOK ====================

export function useInteractiveTour(config: TourConfig) {
  const [isOpen, setIsOpen] = useState(false);
  const [startStep, setStartStep] = useState(0);

  // Check if tour was completed or skipped
  const hasCompleted = config.storageKey
    ? localStorage.getItem(`tour:${config.storageKey}:completed`) === 'true'
    : false;

  const hasSkipped = config.storageKey
    ? localStorage.getItem(`tour:${config.storageKey}:skipped`) === 'true'
    : false;

  // Get saved progress
  const savedStep = config.storageKey
    ? parseInt(localStorage.getItem(`tour:${config.storageKey}:step`) || '0', 10)
    : 0;

  const startTour = (fromStep?: number) => {
    setStartStep(fromStep ?? savedStep);
    setIsOpen(true);
  };

  const closeTour = () => {
    setIsOpen(false);
  };

  const resetTour = () => {
    if (config.storageKey) {
      localStorage.removeItem(`tour:${config.storageKey}:completed`);
      localStorage.removeItem(`tour:${config.storageKey}:skipped`);
      localStorage.removeItem(`tour:${config.storageKey}:step`);
    }
    setStartStep(0);
  };

  return {
    isOpen,
    startTour,
    closeTour,
    resetTour,
    hasCompleted,
    hasSkipped,
    savedStep,
    TourComponent: () => (
      <InteractiveTour
        config={config}
        isOpen={isOpen}
        onClose={closeTour}
        startStep={startStep}
      />
    )
  };
}
