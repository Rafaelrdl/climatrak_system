// Development utilities for the Procedures module

import { initializeStorage, createSampleFiles } from '@/data/proceduresStore';
import { appStorage, STORAGE_KEYS } from '@/lib/storage';
import { getTenantSlug } from '@/lib/tenantStorage';

/**
 * Initialize procedures data for development
 * This should be called once when the app starts
 */
export async function initializeProceduresForDev() {
  try {
    // Initialize storage with mock data
    initializeStorage();
    
    // Create sample files in IndexedDB
    await createSampleFiles();

  } catch (error) {
    console.warn('⚠️ Error initializing procedures module:', error);
  }
}

/**
 * Clear all procedures data (useful for testing)
 */
export function clearProceduresData() {
  appStorage.remove(STORAGE_KEYS.PROCEDURES_LIST);
  appStorage.remove(STORAGE_KEYS.PROCEDURES_CATEGORIES);
  appStorage.remove(STORAGE_KEYS.PROCEDURES_VERSIONS);
  appStorage.remove(STORAGE_KEYS.PROCEDURES_ANNOTATIONS);
  appStorage.remove(STORAGE_KEYS.PROCEDURES_COMMENTS);

  const request = indexedDB.deleteDatabase(`ProceduresDB_${getTenantSlug()}`);
  request.onsuccess = () => {
  };
  request.onerror = (error) => {
    console.warn('Error clearing procedures data:', error);
  };
}

/**
 * Development helper to log current procedures state
 */
export function debugProceduresState() {
  const procedures = appStorage.get(STORAGE_KEYS.PROCEDURES_LIST) ?? [];
  const categories = appStorage.get(STORAGE_KEYS.PROCEDURES_CATEGORIES) ?? [];
  
  console.log('[proceduresDevUtils] procedures:', procedures);
  console.log('[proceduresDevUtils] categories:', categories);
}

// Make utilities available in development
if (import.meta.env.DEV) {
  (window as any).proceduresDevUtils = {
    initialize: initializeProceduresForDev,
    clear: clearProceduresData,
    debug: debugProceduresState,
  };
}
