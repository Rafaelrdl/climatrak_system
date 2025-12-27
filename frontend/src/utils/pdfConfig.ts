// PDF.js worker configuration utility
import { pdfjs } from 'react-pdf';

// Configure PDF.js worker for react-pdf version 10.x
export function configurePDFWorker() {
  if (typeof window === 'undefined') return;
  
  // For react-pdf v10.x with pdfjs-dist@5.3.31
  const pdfjsVersion = '5.3.31';
  
  // Try jsdelivr first as it's more reliable in cloud environments
  const primaryWorkerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`;
  
  // Set the worker source
  pdfjs.GlobalWorkerOptions.workerSrc = primaryWorkerUrl;
  


  
  return pdfjs.GlobalWorkerOptions.workerSrc;
}

// Enhanced error handling and fallback configuration
export function configurePDFWorkerWithFallback() {
  if (typeof window === 'undefined') return;
  
  const pdfjsVersion = '5.3.31';
  
  // Multiple fallback URLs in order of preference
  const workerUrls = [
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`,
    `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.31/build/pdf.worker.min.js`,
    `https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.js`,
    // Latest versions as last resort
    'https://cdn.jsdelivr.net/npm/pdfjs-dist/build/pdf.worker.min.js',
    'https://unpkg.com/pdfjs-dist/build/pdf.worker.min.js',
  ];
  
  // Try to set the primary URL
  const selectedUrl = workerUrls[0];
  pdfjs.GlobalWorkerOptions.workerSrc = selectedUrl;
  

  
  // Test worker availability asynchronously
  testWorkerUrls(workerUrls).then(workingUrl => {
    if (workingUrl && workingUrl !== selectedUrl) {
      pdfjs.GlobalWorkerOptions.workerSrc = workingUrl;

    }
  }).catch(error => {
    console.warn('PDF.js worker URL testing failed:', error);
    // Use the original primary URL as fallback
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrls[0];
  });
  
  return pdfjs.GlobalWorkerOptions.workerSrc;
}

// Test which worker URLs are accessible
async function testWorkerUrls(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      // Use a lightweight HEAD request to test accessibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // Avoid CORS issues
      });
      
      clearTimeout(timeoutId);
      
      // For no-cors mode, we can't check response status, so assume success

      return url;
    } catch (error) {
      console.warn(`PDF.js worker URL test failed for ${url}:`, error);
      continue;
    }
  }
  
  return null;
}

// Initialize immediately if in browser
if (typeof window !== 'undefined') {
  // Use the simple version first, fallback can be called if needed
  configurePDFWorker();
}

// Debugging helper
export function checkPDFWorkerStatus() {
  // PDF.js Configuration Status logging removed
  
  return {
    version: pdfjs.version,
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: !!pdfjs.GlobalWorkerOptions.workerSrc,
  };
}