import { appStorage, STORAGE_KEYS } from '@/lib/storage';

export type OnboardingKey =
  | 'inviteAccepted'
  | 'setupCompleted'
  | 'tourCompleted'
  | 'firstTimeGuideCompleted'
  | 'shouldStartTour'
  | 'welcomeGuideShown'
  | 'interactiveTourCompleted'
  | 'interactiveTourSkipped';

const getState = (): Record<string, boolean> => {
  return appStorage.get<Record<string, boolean>>(STORAGE_KEYS.ONBOARDING_STATE) ?? {};
};

const setState = (state: Record<string, boolean>): void => {
  appStorage.set(STORAGE_KEYS.ONBOARDING_STATE, state);
};

export function getOnboardingValue(key: OnboardingKey): string | null {
  const state = getState();
  return state[key] ? 'true' : null;
}

export function isOnboardingCompleted(key: OnboardingKey): boolean {
  return getOnboardingValue(key) === 'true';
}

export function setOnboardingValue(key: OnboardingKey, value: string): void {
  const state = getState();
  state[key] = value === 'true';
  setState(state);
}

export function markOnboardingCompleted(key: OnboardingKey): void {
  setOnboardingValue(key, 'true');
}

export function removeOnboardingValue(key: OnboardingKey): void {
  const state = getState();
  delete state[key];
  setState(state);
}

export function resetOnboarding(): void {
  const keys: OnboardingKey[] = [
    'inviteAccepted',
    'setupCompleted',
    'tourCompleted',
    'firstTimeGuideCompleted',
    'shouldStartTour',
    'welcomeGuideShown',
    'interactiveTourCompleted',
    'interactiveTourSkipped',
  ];

  const state = getState();
  keys.forEach((key) => {
    delete state[key];
  });
  setState(state);
}

export function getOnboardingState() {
  return {
    inviteAccepted: isOnboardingCompleted('inviteAccepted'),
    setupCompleted: isOnboardingCompleted('setupCompleted'),
    tourCompleted: isOnboardingCompleted('tourCompleted'),
    firstTimeGuideCompleted: isOnboardingCompleted('firstTimeGuideCompleted'),
    shouldStartTour: isOnboardingCompleted('shouldStartTour'),
    welcomeGuideShown: isOnboardingCompleted('welcomeGuideShown'),
  };
}
