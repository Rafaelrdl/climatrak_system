/**
 * Centralized storage utilities for onboarding state.
 * Keys are scoped by tenant + user to ensure isolation between users/tenants.
 */

export type OnboardingKey = 
  | 'inviteAccepted'
  | 'setupCompleted'
  | 'tourCompleted'
  | 'firstTimeGuideCompleted'
  | 'shouldStartTour'
  | 'welcomeGuideShown';

/**
 * Get the storage prefix for onboarding keys.
 * Format: onboarding:{tenantSchema}:{userId}
 */
export function getStoragePrefix(): string {
  const tenantSchema = localStorage.getItem('auth:tenant_schema');
  const userDataStr = localStorage.getItem('auth:user');
  
  let userId = 'unknown';
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      userId = userData.id?.toString() || 'unknown';
    } catch {
      // ignore parse errors
    }
  }
  
  if (!tenantSchema || !userId || userId === 'unknown') {
    return 'onboarding';
  }
  
  return `onboarding:${tenantSchema}:${userId}`;
}

/**
 * Get an onboarding value from localStorage.
 */
export function getOnboardingValue(key: OnboardingKey): string | null {
  const prefix = getStoragePrefix();
  const fullKey = `${prefix}:${key}`;
  return localStorage.getItem(fullKey);
}

/**
 * Check if an onboarding step is completed.
 */
export function isOnboardingCompleted(key: OnboardingKey): boolean {
  return getOnboardingValue(key) === 'true';
}

/**
 * Set an onboarding value in localStorage.
 */
export function setOnboardingValue(key: OnboardingKey, value: string): void {
  const prefix = getStoragePrefix();
  const fullKey = `${prefix}:${key}`;
  localStorage.setItem(fullKey, value);
}

/**
 * Mark an onboarding step as completed.
 */
export function markOnboardingCompleted(key: OnboardingKey): void {
  setOnboardingValue(key, 'true');
}

/**
 * Remove an onboarding value from localStorage.
 */
export function removeOnboardingValue(key: OnboardingKey): void {
  const prefix = getStoragePrefix();
  localStorage.removeItem(`${prefix}:${key}`);
}

/**
 * Reset all onboarding state for current user/tenant.
 */
export function resetOnboarding(): void {
  const keys: OnboardingKey[] = [
    'inviteAccepted',
    'setupCompleted',
    'tourCompleted',
    'firstTimeGuideCompleted',
    'shouldStartTour',
    'welcomeGuideShown'
  ];
  
  keys.forEach(key => removeOnboardingValue(key));
}

/**
 * Get all onboarding state for current user/tenant.
 */
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
