import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

interface PDFErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface PDFErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  onDownload?: () => void;
  fallbackMessage?: string;
}

export class PDFErrorBoundary extends React.Component<PDFErrorBoundaryProps, PDFErrorBoundaryState> {
  constructor(props: PDFErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PDFErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log PDF-specific errors with more context
    console.error('PDF Error Boundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // Check if it's a PDF.js worker related error
    if (error.message?.includes('workerSrc') || 
        error.message?.includes('GlobalWorkerOptions') ||
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('pdf.worker')) {
      console.error('This appears to be a PDF.js worker configuration error');
    }
  }

  handleRetry = () => {
    // Reset error state
    this.setState({ hasError: false, error: null });
    
    // Call retry callback if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      const isWorkerError = this.state.error?.message?.includes('workerSrc') ||
                           this.state.error?.message?.includes('GlobalWorkerOptions') ||
                           this.state.error?.message?.includes('Failed to fetch dynamically imported module');
      
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 border rounded-lg bg-muted/10">
          <div className="text-destructive text-lg font-medium">
            Erro ao exibir PDF
          </div>
          
          <div className="text-sm text-muted-foreground max-w-md">
            {isWorkerError ? (
              <>
                Ocorreu um problema ao carregar o processador de PDF. 
                Isso pode ser devido a restrições de rede ou problemas de conectividade.
              </>
            ) : (
              this.props.fallbackMessage || 
              'Não foi possível exibir o PDF. Verifique se o arquivo é válido.'
            )}
          </div>
          
          {import.meta.env.DEV && this.state.error && (
            <details className="text-xs text-muted-foreground text-left max-w-md">
              <summary className="cursor-pointer">Detalhes técnicos (dev)</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2">
            <Button onClick={this.handleRetry} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            
            {this.props.onDownload && (
              <Button onClick={this.props.onDownload} variant="default" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}