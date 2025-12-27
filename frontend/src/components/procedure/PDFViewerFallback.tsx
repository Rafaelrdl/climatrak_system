import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';

interface PDFViewerFallbackProps {
  fileBlob: Blob;
  fileName: string;
  onDownload: () => void;
}

/**
 * Fallback PDF viewer that uses an iframe or object element
 * This is used when react-pdf fails to load due to worker issues
 */
export function PDFViewerFallback({ fileBlob, fileName, onDownload }: PDFViewerFallbackProps) {
  // Create a blob URL for the PDF
  const pdfUrl = URL.createObjectURL(fileBlob);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">Visualização simplificada</div>
          <div className="text-xs text-muted-foreground">
            Usando visualizador alternativo
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => window.open(pdfUrl, '_blank')} 
            variant="outline" 
            size="sm"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir em nova aba
          </Button>
          <Button onClick={onDownload} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Baixar
          </Button>
        </div>
      </div>
      
      {/* Iframe fallback */}
      <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '70vh' }}>
        <iframe
          src={pdfUrl}
          title={`PDF: ${fileName}`}
          className="w-full h-full"
          onError={(e) => {
            console.error('PDF iframe failed to load:', e);
          }}
        />
      </div>
      
      {/* Fallback message if iframe also fails */}
      <div className="text-center text-sm text-muted-foreground">
        Se o PDF não aparecer acima, use os botões "Abrir em nova aba" ou "Baixar"
      </div>
    </div>
  );
}