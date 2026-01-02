// Debug utility for PDF.js configuration

export function debugPDFConfig() {
  // PDF.js debug logging removed
}

// Add to window for browser console access
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).debugPDFConfig = debugPDFConfig;
}