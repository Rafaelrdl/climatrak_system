/**
 * AttachmentUploader Component
 * 
 * Upload e listagem de anexos (NF, cotação, relatório).
 * Baseado em: docs/frontend/finance/03-componentes-base.md
 */

import { useState, useRef, useCallback, type ChangeEvent } from 'react';
import {
  Upload,
  X,
  FileText,
  FileImage,
  File,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ==================== Types ====================

export interface Attachment {
  /** URL ou identificador do arquivo */
  url: string;
  /** Nome do arquivo */
  name: string;
  /** Tipo MIME */
  type?: string;
  /** Tamanho em bytes */
  size?: number;
}

export interface AttachmentUploaderProps {
  /** Lista de anexos existentes */
  attachments: Attachment[];
  /** Callback quando anexos mudam */
  onChange: (attachments: Attachment[]) => void;
  /** Função para fazer upload (retorna URL) */
  onUpload?: (file: File) => Promise<string>;
  /** Tipos de arquivo aceitos */
  accept?: string;
  /** Máximo de arquivos */
  maxFiles?: number;
  /** Tamanho máximo em bytes */
  maxSize?: number;
  /** Desabilitado */
  disabled?: boolean;
  /** Somente leitura (não permite upload/delete) */
  readOnly?: boolean;
  /** Classes CSS adicionais */
  className?: string;
  /** Texto do placeholder */
  placeholder?: string;
}

// ==================== Helpers ====================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type?: string) {
  if (!type) return File;
  if (type.startsWith('image/')) return FileImage;
  if (type.includes('pdf') || type.includes('document')) return FileText;
  return File;
}

function getFileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('/').pop() || 'arquivo';
  } catch {
    return url.split('/').pop() || 'arquivo';
  }
}

// ==================== Component ====================

export function AttachmentUploader({
  attachments,
  onChange,
  onUpload,
  accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx',
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  readOnly = false,
  className,
  placeholder = 'Arraste arquivos ou clique para selecionar',
}: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAddMore = attachments.length < maxFiles;

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);

    // Validate file count
    if (attachments.length + fileArray.length > maxFiles) {
      setError(`Máximo de ${maxFiles} arquivos permitido`);
      return;
    }

    // Validate file sizes
    const oversizedFile = fileArray.find(f => f.size > maxSize);
    if (oversizedFile) {
      setError(`Arquivo "${oversizedFile.name}" excede ${formatFileSize(maxSize)}`);
      return;
    }

    // Upload files
    setIsUploading(true);
    try {
      const newAttachments: Attachment[] = [];

      for (const file of fileArray) {
        let url: string;
        
        if (onUpload) {
          url = await onUpload(file);
        } else {
          // Fallback: create object URL (for preview only)
          url = URL.createObjectURL(file);
        }

        newAttachments.push({
          url,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      }

      onChange([...attachments, ...newAttachments]);
    } catch (err) {
      setError('Erro ao fazer upload. Tente novamente.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [attachments, maxFiles, maxSize, onChange, onUpload]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled || readOnly || !canAddMore) return;
    
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, readOnly, canAddMore, handleFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !readOnly && canAddMore) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    onChange(newAttachments);
  };

  const handleClick = () => {
    if (!disabled && !readOnly && canAddMore) {
      inputRef.current?.click();
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      {!readOnly && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            isDragging && 'border-primary bg-primary/5',
            !isDragging && 'border-muted-foreground/25 hover:border-muted-foreground/50',
            (disabled || !canAddMore) && 'opacity-50 cursor-not-allowed',
            !disabled && canAddMore && 'cursor-pointer'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled || !canAddMore}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Enviando...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className={cn(
                'h-8 w-8',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )} />
              <div className="text-sm">
                <span className="text-muted-foreground">{placeholder}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {!canAddMore 
                  ? `Limite de ${maxFiles} arquivos atingido`
                  : `Máx. ${formatFileSize(maxSize)} por arquivo`
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <X className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => {
            const Icon = getFileIcon(attachment.type);
            const displayName = attachment.name || getFileNameFromUrl(attachment.url);

            return (
              <div
                key={`${attachment.url}-${index}`}
                className="flex items-center gap-3 p-2 rounded-md border bg-muted/30 group"
              >
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  {attachment.size && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    asChild
                  >
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state for readOnly */}
      {readOnly && attachments.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Nenhum anexo
        </div>
      )}
    </div>
  );
}

export default AttachmentUploader;
