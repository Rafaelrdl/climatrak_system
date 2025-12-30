import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: (type?: string) => string;
  fromDataURL: (dataUrl: string) => void;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
  className?: string;
  penColor?: string;
  backgroundColor?: string;
  disabled?: boolean;
  onChange?: (isEmpty: boolean) => void;
  initialValue?: string;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  (
    {
      width = 500,
      height = 200,
      className,
      penColor = '#000000',
      backgroundColor = '#ffffff',
      disabled = false,
      onChange,
      initialValue,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [history, setHistory] = useState<ImageData[]>([]);

    // Inicializar canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Configurar tamanho real do canvas (para alta resolução)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // Configurar estilo do canvas
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Configurar contexto
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Carregar valor inicial se existir
      if (initialValue) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          setIsEmpty(false);
          onChange?.(false);
        };
        img.src = initialValue;
      }
    }, [width, height, backgroundColor, penColor, initialValue, onChange]);

    // Funções de desenho
    const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      
      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
      
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const saveState = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory(prev => [...prev.slice(-10), imageData]); // Manter últimos 10 estados
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      
      const coords = getCoordinates(e);
      if (!coords) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      saveState();
      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return;

      const coords = getCoordinates(e);
      if (!coords) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      if (isEmpty) {
        setIsEmpty(false);
        onChange?.(false);
      }
    };

    const stopDrawing = () => {
      if (isDrawing) {
        setIsDrawing(false);
      }
    };

    const clear = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
      setIsEmpty(true);
      setHistory([]);
      onChange?.(true);
    };

    const undo = () => {
      if (history.length === 0) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      const lastState = history[history.length - 1];
      ctx.putImageData(lastState, 0, 0);
      setHistory(prev => prev.slice(0, -1));

      // Verificar se está vazio após undo
      checkIfEmpty();
    };

    const checkIfEmpty = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Verificar se todos os pixels são da cor de fundo
      let hasContent = false;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Se não for branco (cor de fundo), tem conteúdo
        if (r !== 255 || g !== 255 || b !== 255) {
          hasContent = true;
          break;
        }
      }

      setIsEmpty(!hasContent);
      onChange?.(!hasContent);
    };

    const toDataURL = (type = 'image/png') => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL(type);
    };

    const fromDataURL = (dataUrl: string) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        setIsEmpty(false);
        onChange?.(false);
      };
      img.src = dataUrl;
    };

    // Expor métodos via ref
    useImperativeHandle(ref, () => ({
      clear,
      isEmpty: () => isEmpty,
      toDataURL,
      fromDataURL,
    }));

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <div className="relative border rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className={cn(
              'touch-none cursor-crosshair',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            style={{ width, height }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {isEmpty && !disabled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-muted-foreground/50 text-sm">
                Assine aqui
              </span>
            </div>
          )}
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={history.length === 0}
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Desfazer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clear}
              disabled={isEmpty}
            >
              <Eraser className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          </div>
        )}
      </div>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';
