import { appStorage, STORAGE_KEYS } from '@/lib/storage';

export type TourState = {
  completed: Record<string, boolean>;
  skipped: Record<string, boolean>;
  step: Record<string, number>;
};

const defaultState: TourState = {
  completed: {},
  skipped: {},
  step: {},
};

const getState = (): TourState => {
  return appStorage.get<TourState>(STORAGE_KEYS.TOUR_STATE) ?? { ...defaultState };
};

const setState = (state: TourState): void => {
  appStorage.set(STORAGE_KEYS.TOUR_STATE, state);
};

export const hasCompletedTour = (tourId: string): boolean => {
  const state = getState();
  return !!state.completed[tourId] || !!state.skipped[tourId];
};

export const setTourCompleted = (tourId: string): void => {
  const state = getState();
  state.completed[tourId] = true;
  delete state.skipped[tourId];
  delete state.step[tourId];
  setState(state);
};

export const setTourSkipped = (tourId: string): void => {
  const state = getState();
  state.skipped[tourId] = true;
  delete state.completed[tourId];
  delete state.step[tourId];
  setState(state);
};

export const setTourStep = (tourId: string, step: number): void => {
  const state = getState();
  state.step[tourId] = step;
  setState(state);
};

export const clearTour = (tourId: string): void => {
  const state = getState();
  delete state.completed[tourId];
  delete state.skipped[tourId];
  delete state.step[tourId];
  setState(state);
};

export const resetAllTours = (): void => {
  setState({ ...defaultState });
};

export const getTourState = (): TourState => getState();
