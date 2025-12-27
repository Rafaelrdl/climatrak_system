export type ProcedureStatus = 'Ativo' | 'Inativo';
export type ProcedureFileType = 'pdf' | 'md';
export type VersionChangeType = 'created' | 'updated' | 'file_updated' | 'status_changed' | 'category_changed';

export interface ProcedureCategory {
  id: string;         // uuid
  name: string;       // ex.: "Elétrico", "Higienização", "Chiller"
  color?: string;     // badge opcional
}

export interface ProcedureFileRef {
  id: string;         // key do IndexedDB (uuid)
  name: string;       // nome original
  type: ProcedureFileType;
  size: number;       // bytes
  checksum?: string;  // para detectar mudanças no arquivo
}

export interface ProcedureVersion {
  id: string;                    // uuid da versão
  procedure_id: string;          // referência ao procedimento
  version_number: number;        // número da versão
  title: string;
  description?: string;
  category_id?: string | null;
  status: ProcedureStatus;
  tags?: string[];
  file: ProcedureFileRef;        // arquivo desta versão
  change_type: VersionChangeType;
  change_summary?: string;       // resumo das mudanças
  created_by?: string;           // usuário que criou a versão
  created_at: string;            // ISO
}

export interface Procedure {
  id: string;                    // uuid
  title: string;
  description?: string;
  category_id?: string | null;
  status: ProcedureStatus;       // Ativo/Inativo
  tags?: string[];               // opcional p/ busca
  version: number;               // versão atual
  file: ProcedureFileRef;        // arquivo da versão atual
  created_at: string;            // ISO
  updated_at: string;            // ISO
}

export interface ProcedureDiff {
  field: string;
  label: string;
  oldValue?: any;
  newValue?: any;
  changeType: 'added' | 'removed' | 'modified';
}

export interface VersionComparison {
  fromVersion: ProcedureVersion;
  toVersion: ProcedureVersion;
  diffs: ProcedureDiff[];
  hasFileChanges: boolean;
}

// Annotation and Comment models
export type AnnotationType = 'highlight' | 'note' | 'question' | 'correction' | 'warning';
export type CommentStatus = 'open' | 'resolved' | 'archived';

export interface AnnotationPosition {
  // For PDF annotations
  pageNumber?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  
  // For Markdown annotations
  lineStart?: number;
  lineEnd?: number;
  charStart?: number;
  charEnd?: number;
}

export interface DocumentAnnotation {
  id: string;                    // uuid
  procedure_id: string;          // referência ao procedimento
  version_number: number;        // versão do procedimento anotado
  type: AnnotationType;
  position: AnnotationPosition;
  content: string;               // texto da anotação
  selected_text?: string;        // texto selecionado (para highlights)
  color: string;                 // cor da anotação
  author: string;                // quem criou a anotação
  created_at: string;            // ISO
  updated_at: string;            // ISO
  is_resolved: boolean;          // para anotações que podem ser resolvidas
}

export interface Comment {
  id: string;                    // uuid
  annotation_id?: string;        // referência à anotação (opcional)
  procedure_id: string;          // referência ao procedimento
  version_number: number;        // versão do procedimento
  parent_id?: string;            // para respostas a comentários
  content: string;               // texto do comentário
  author: string;                // quem criou o comentário
  status: CommentStatus;
  created_at: string;            // ISO
  updated_at: string;            // ISO
  mentions?: string[];           // usuários mencionados (@username)
}

export interface AnnotationThread {
  annotation: DocumentAnnotation;
  comments: Comment[];
  unread_count: number;
}

export interface ProcedureWithAnnotations extends Procedure {
  annotations: DocumentAnnotation[];
  annotation_threads: AnnotationThread[];
  total_comments: number;
  unresolved_annotations: number;
}