import { v4 as uuidv4 } from 'uuid';
import { 
  Procedure, 
  ProcedureCategory, 
  ProcedureFileRef, 
  ProcedureStatus, 
  ProcedureVersion,
  VersionChangeType,
  ProcedureDiff,
  VersionComparison,
  DocumentAnnotation,
  Comment,
  AnnotationThread,
  ProcedureWithAnnotations,
  AnnotationType,
  CommentStatus
} from '@/models/procedure';
import proceduresData from '@/mocks/procedures.json';
import categoriesData from '@/mocks/procedure_categories.json';
import annotationsData from '@/mocks/procedure_annotations.json';
import commentsData from '@/mocks/procedure_comments.json';

const PROCEDURES_KEY = 'procedures:db';
const CATEGORIES_KEY = 'procedure_categories:db';
const VERSIONS_KEY = 'procedure_versions:db';
const ANNOTATIONS_KEY = 'procedure_annotations:db';
const COMMENTS_KEY = 'procedure_comments:db';
const DB_NAME = 'ProceduresDB';
const DB_VERSION = 2;
const FILE_STORE_NAME = 'files';

// Simple checksum function for file comparison
function calculateChecksum(content: ArrayBuffer): string {
  const view = new Uint8Array(content);
  let hash = 0;
  for (let i = 0; i < view.length; i++) {
    hash = ((hash << 5) - hash + view[i]) & 0xffffffff;
  }
  return hash.toString(16);
}

// IndexedDB for file storage
class FileStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(FILE_STORE_NAME)) {
          db.createObjectStore(FILE_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async putFile(file: File): Promise<ProcedureFileRef> {
    if (!this.db) await this.init();
    
    const fileId = uuidv4();
    const buffer = await file.arrayBuffer();
    const checksum = calculateChecksum(buffer);
    
    const fileRef: ProcedureFileRef = {
      id: fileId,
      name: file.name,
      type: file.name.endsWith('.pdf') ? 'pdf' : 'md',
      size: file.size,
      checksum
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(FILE_STORE_NAME);
      
      const fileData = {
        id: fileId,
        blob: file,
        metadata: fileRef
      };
      
      const request = store.put(fileData);
      request.onsuccess = () => resolve(fileRef);
      request.onerror = () => reject(request.error);
    });
  }

  async getFileBlob(fileId: string): Promise<Blob | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(FILE_STORE_NAME);
      const request = store.get(fileId);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(FILE_STORE_NAME);
      const request = store.delete(fileId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const fileStorage = new FileStorage();

// Helper functions
function load<T>(key: string, seed: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : seed;
  } catch {
    return seed;
  }
}

function save<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Categories
export function listCategories(): ProcedureCategory[] {
  return load(CATEGORIES_KEY, categoriesData as ProcedureCategory[]);
}

export function getCategoryById(id: string): ProcedureCategory | null {
  const categories = listCategories();
  return categories.find(cat => cat.id === id) || null;
}

// Versions
export function listVersions(procedureId?: string): ProcedureVersion[] {
  const versions = load(VERSIONS_KEY, [] as ProcedureVersion[]);
  return procedureId 
    ? versions.filter(v => v.procedure_id === procedureId).sort((a, b) => b.version_number - a.version_number)
    : versions;
}

export function createVersion(
  procedure: Procedure, 
  changeType: VersionChangeType,
  changeSummary?: string
): ProcedureVersion {
  const versions = load(VERSIONS_KEY, [] as ProcedureVersion[]);
  
  const version: ProcedureVersion = {
    id: uuidv4(),
    procedure_id: procedure.id,
    version_number: procedure.version,
    title: procedure.title,
    description: procedure.description,
    category_id: procedure.category_id,
    status: procedure.status,
    tags: procedure.tags,
    file: procedure.file,
    change_type: changeType,
    change_summary: changeSummary,
    created_at: new Date().toISOString()
  };
  
  versions.push(version);
  save(VERSIONS_KEY, versions);
  return version;
}

export function getVersionById(versionId: string): ProcedureVersion | null {
  const versions = listVersions();
  return versions.find(v => v.id === versionId) || null;
}

// Compare two versions and return differences
export function compareVersions(
  fromVersionId: string, 
  toVersionId: string
): VersionComparison | null {
  const fromVersion = getVersionById(fromVersionId);
  const toVersion = getVersionById(toVersionId);
  
  if (!fromVersion || !toVersion) {
    return null;
  }
  
  const diffs: ProcedureDiff[] = [];
  
  // Compare title
  if (fromVersion.title !== toVersion.title) {
    diffs.push({
      field: 'title',
      label: 'Título',
      oldValue: fromVersion.title,
      newValue: toVersion.title,
      changeType: 'modified'
    });
  }
  
  // Compare description
  if (fromVersion.description !== toVersion.description) {
    diffs.push({
      field: 'description',
      label: 'Descrição',
      oldValue: fromVersion.description || '',
      newValue: toVersion.description || '',
      changeType: fromVersion.description && toVersion.description ? 'modified' :
                  fromVersion.description ? 'removed' : 'added'
    });
  }
  
  // Compare category
  if (fromVersion.category_id !== toVersion.category_id) {
    const fromCategory = fromVersion.category_id ? getCategoryById(fromVersion.category_id) : null;
    const toCategory = toVersion.category_id ? getCategoryById(toVersion.category_id) : null;
    
    diffs.push({
      field: 'category_id',
      label: 'Categoria',
      oldValue: fromCategory?.name || 'Nenhuma',
      newValue: toCategory?.name || 'Nenhuma',
      changeType: 'modified'
    });
  }
  
  // Compare status
  if (fromVersion.status !== toVersion.status) {
    diffs.push({
      field: 'status',
      label: 'Status',
      oldValue: fromVersion.status,
      newValue: toVersion.status,
      changeType: 'modified'
    });
  }
  
  // Compare tags
  const fromTags = fromVersion.tags || [];
  const toTags = toVersion.tags || [];
  const tagsChanged = JSON.stringify(fromTags.sort()) !== JSON.stringify(toTags.sort());
  
  if (tagsChanged) {
    diffs.push({
      field: 'tags',
      label: 'Tags',
      oldValue: fromTags.join(', ') || 'Nenhuma',
      newValue: toTags.join(', ') || 'Nenhuma',
      changeType: 'modified'
    });
  }
  
  // Compare file (based on checksum if available)
  const hasFileChanges = fromVersion.file.checksum !== toVersion.file.checksum ||
                        fromVersion.file.name !== toVersion.file.name ||
                        fromVersion.file.size !== toVersion.file.size;
  
  if (hasFileChanges) {
    diffs.push({
      field: 'file',
      label: 'Arquivo',
      oldValue: `${fromVersion.file.name} (${(fromVersion.file.size / 1024).toFixed(1)} KB)`,
      newValue: `${toVersion.file.name} (${(toVersion.file.size / 1024).toFixed(1)} KB)`,
      changeType: 'modified'
    });
  }
  
  return {
    fromVersion,
    toVersion,
    diffs,
    hasFileChanges
  };
}

// Rollback procedure to a specific version
export async function rollbackToVersion(procedureId: string, versionId: string): Promise<Procedure | null> {
  const version = getVersionById(versionId);
  if (!version || version.procedure_id !== procedureId) {
    return null;
  }
  
  const procedures = listProcedures();
  const procedureIndex = procedures.findIndex(p => p.id === procedureId);
  
  if (procedureIndex === -1) {
    return null;
  }
  
  // Create new version for current state before rollback
  const currentProcedure = procedures[procedureIndex];
  createVersion(currentProcedure, 'updated', `Rollback para versão ${version.version_number}`);
  
  // Update procedure with version data
  const updatedProcedure: Procedure = {
    ...currentProcedure,
    title: version.title,
    description: version.description,
    category_id: version.category_id,
    status: version.status,
    tags: version.tags,
    file: version.file,
    version: currentProcedure.version + 1,
    updated_at: new Date().toISOString()
  };
  
  procedures[procedureIndex] = updatedProcedure;
  save(PROCEDURES_KEY, procedures);
  
  // Create rollback version entry
  createVersion(updatedProcedure, 'updated', `Restaurado da versão ${version.version_number}`);
  
  return updatedProcedure;
}
// Procedures
export function listProcedures(): Procedure[] {
  return load(PROCEDURES_KEY, proceduresData as Procedure[]);
}

export function createProcedure(
  data: Omit<Procedure, 'id' | 'created_at' | 'updated_at' | 'version'> & { version?: number }
): Procedure {
  const procedures = listProcedures();
  const now = new Date().toISOString();
  
  const newProcedure: Procedure = {
    ...data,
    id: uuidv4(),
    version: data.version || 1,
    created_at: now,
    updated_at: now,
  };
  
  procedures.push(newProcedure);
  save(PROCEDURES_KEY, procedures);
  
  // Create initial version
  createVersion(newProcedure, 'created', 'Criação inicial do procedimento');
  
  return newProcedure;
}

export function updateProcedure(
  procedure: Procedure, 
  changeType: VersionChangeType = 'updated',
  changeSummary?: string
): Procedure {
  const procedures = listProcedures();
  const index = procedures.findIndex(p => p.id === procedure.id);
  
  if (index === -1) {
    throw new Error('Procedure not found');
  }
  
  const updatedProcedure = {
    ...procedure,
    updated_at: new Date().toISOString(),
  };
  
  procedures[index] = updatedProcedure;
  save(PROCEDURES_KEY, procedures);
  
  // Create version entry
  createVersion(updatedProcedure, changeType, changeSummary);
  
  return updatedProcedure;
}

export function deleteProcedure(id: string): void {
  const procedures = listProcedures();
  const procedure = procedures.find(p => p.id === id);
  
  if (procedure) {
    // Delete file from IndexedDB
    fileStorage.deleteFile(procedure.file.id).catch(console.error);
    
    // Remove from procedures list
    const filtered = procedures.filter(p => p.id !== id);
    save(PROCEDURES_KEY, filtered);
  }
}

export function bumpVersion(procedure: Procedure, changeSummary?: string): Procedure {
  return updateProcedure({
    ...procedure,
    version: procedure.version + 1,
  }, 'file_updated', changeSummary || 'Arquivo atualizado');
}

export function filterProcedures(filters: {
  category_id?: string | null;
  status?: ProcedureStatus;
  q?: string;
}): Procedure[] {
  const procedures = listProcedures();
  
  return procedures.filter(procedure => {
    // Category filter
    if (filters.category_id && procedure.category_id !== filters.category_id) {
      return false;
    }
    
    // Status filter
    if (filters.status && procedure.status !== filters.status) {
      return false;
    }
    
    // Search query
    if (filters.q) {
      const query = filters.q.toLowerCase();
      const searchableText = [
        procedure.title,
        procedure.description || '',
        ...(procedure.tags || [])
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }
    
    return true;
  });
}

// File operations
export async function putFile(file: File): Promise<ProcedureFileRef> {
  return fileStorage.putFile(file);
}

export async function getFileBlob(fileId: string): Promise<Blob | null> {
  return fileStorage.getFileBlob(fileId);
}

export async function deleteFile(fileId: string): Promise<void> {
  return fileStorage.deleteFile(fileId);
}

// Initialize storage on first load
export function initializeStorage(): void {
  // Ensure categories, procedures, versions, annotations, and comments are loaded with defaults
  if (!localStorage.getItem(CATEGORIES_KEY)) {
    save(CATEGORIES_KEY, categoriesData as ProcedureCategory[]);
  }
  if (!localStorage.getItem(PROCEDURES_KEY)) {
    save(PROCEDURES_KEY, proceduresData as Procedure[]);
  }
  if (!localStorage.getItem(VERSIONS_KEY)) {
    save(VERSIONS_KEY, [] as ProcedureVersion[]);
  }
  if (!localStorage.getItem(ANNOTATIONS_KEY)) {
    save(ANNOTATIONS_KEY, annotationsData as DocumentAnnotation[]);
  }
  if (!localStorage.getItem(COMMENTS_KEY)) {
    save(COMMENTS_KEY, commentsData as Comment[]);
  }
}

// Create sample files for existing procedures (mock data)
export async function createSampleFiles(): Promise<void> {
  const procedures = listProcedures();
  
  for (const procedure of procedures) {
    try {
      // Check if file already exists
      const existingBlob = await getFileBlob(procedure.file.id);
      if (existingBlob) continue;
      
      // Create sample content based on file type
      let content: string;
      let mimeType: string;
      
      if (procedure.file.type === 'md') {
        content = `# ${procedure.title}

## Descrição
${procedure.description || 'Sem descrição disponível'}

## Tags
${(procedure.tags || []).map(tag => `- ${tag}`).join('\n')}

## Procedimento
Este é um arquivo de exemplo para demonstração do sistema de procedimentos.

### Passos principais:
1. Primeiro passo do procedimento
2. Segundo passo do procedimento  
3. Terceiro passo do procedimento

### Observações importantes:
- Observe sempre as normas de segurança
- Utilize os EPIs adequados
- Documente todas as ações realizadas

### Conclusão
Após concluir todos os passos, registre a execução no sistema.
`;
        mimeType = 'text/markdown';
      } else {
        // For PDF, we'll create a simple text content as placeholder
        content = `Procedimento: ${procedure.title}\n\nEste é um arquivo PDF de exemplo para demonstração.`;
        mimeType = 'text/plain';
      }
      
      const blob = new Blob([content], { type: mimeType });
      const file = new File([blob], procedure.file.name, { type: mimeType });
      
      // Store in IndexedDB with the expected ID
      await fileStorage.init();
      const transaction = fileStorage.db!.transaction([FILE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(FILE_STORE_NAME);
      
      const fileData = {
        id: procedure.file.id,
        blob: file,
        metadata: procedure.file
      };
      
      store.put(fileData);
    } catch (error) {
      console.warn(`Failed to create sample file for procedure ${procedure.id}:`, error);
    }
  }
}

// ============================================================================
// ANNOTATION AND COMMENT FUNCTIONS
// ============================================================================

// Annotations
export function listAnnotations(procedureId?: string, versionNumber?: number): DocumentAnnotation[] {
  const annotations = load(ANNOTATIONS_KEY, [] as DocumentAnnotation[]);
  
  if (procedureId && versionNumber) {
    return annotations.filter(a => a.procedure_id === procedureId && a.version_number === versionNumber);
  }
  
  if (procedureId) {
    return annotations.filter(a => a.procedure_id === procedureId);
  }
  
  return annotations;
}

export function createAnnotation(
  data: Omit<DocumentAnnotation, 'id' | 'created_at' | 'updated_at'>
): DocumentAnnotation {
  const annotations = listAnnotations();
  const now = new Date().toISOString();
  
  const newAnnotation: DocumentAnnotation = {
    ...data,
    id: uuidv4(),
    created_at: now,
    updated_at: now,
  };
  
  annotations.push(newAnnotation);
  save(ANNOTATIONS_KEY, annotations);
  
  return newAnnotation;
}

export function updateAnnotation(
  id: string, 
  updates: Partial<Omit<DocumentAnnotation, 'id' | 'created_at' | 'updated_at'>>
): DocumentAnnotation | null {
  const annotations = listAnnotations();
  const index = annotations.findIndex(a => a.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const updatedAnnotation = {
    ...annotations[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  annotations[index] = updatedAnnotation;
  save(ANNOTATIONS_KEY, annotations);
  
  return updatedAnnotation;
}

export function deleteAnnotation(id: string): boolean {
  const annotations = listAnnotations();
  const filtered = annotations.filter(a => a.id !== id);
  
  if (filtered.length === annotations.length) {
    return false; // Not found
  }
  
  save(ANNOTATIONS_KEY, filtered);
  
  // Also delete related comments
  const comments = listComments();
  const filteredComments = comments.filter(c => c.annotation_id !== id);
  save(COMMENTS_KEY, filteredComments);
  
  return true;
}

// Comments
export function listComments(annotationId?: string, procedureId?: string): Comment[] {
  const comments = load(COMMENTS_KEY, [] as Comment[]);
  
  if (annotationId) {
    return comments.filter(c => c.annotation_id === annotationId);
  }
  
  if (procedureId) {
    return comments.filter(c => c.procedure_id === procedureId);
  }
  
  return comments;
}

export function createComment(
  data: Omit<Comment, 'id' | 'created_at' | 'updated_at'>
): Comment {
  const comments = listComments();
  const now = new Date().toISOString();
  
  const newComment: Comment = {
    ...data,
    id: uuidv4(),
    created_at: now,
    updated_at: now,
  };
  
  comments.push(newComment);
  save(COMMENTS_KEY, comments);
  
  return newComment;
}

export function updateComment(
  id: string, 
  updates: Partial<Omit<Comment, 'id' | 'created_at' | 'updated_at'>>
): Comment | null {
  const comments = listComments();
  const index = comments.findIndex(c => c.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const updatedComment = {
    ...comments[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  comments[index] = updatedComment;
  save(COMMENTS_KEY, comments);
  
  return updatedComment;
}

export function deleteComment(id: string): boolean {
  const comments = listComments();
  const filtered = comments.filter(c => c.id !== id);
  
  if (filtered.length === comments.length) {
    return false; // Not found
  }
  
  save(COMMENTS_KEY, filtered);
  return true;
}

// Utility functions
export function getProcedureWithAnnotations(procedureId: string, versionNumber?: number): ProcedureWithAnnotations | null {
  const procedure = listProcedures().find(p => p.id === procedureId);
  if (!procedure) {
    return null;
  }
  
  const version = versionNumber || procedure.version;
  const annotations = listAnnotations(procedureId, version);
  const allComments = listComments(undefined, procedureId);
  
  // Group comments by annotation
  const annotationThreads: AnnotationThread[] = annotations.map(annotation => {
    const comments = allComments
      .filter(c => c.annotation_id === annotation.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    return {
      annotation,
      comments,
      unread_count: 0 // TODO: Implement read tracking
    };
  });
  
  return {
    ...procedure,
    annotations,
    annotation_threads: annotationThreads,
    total_comments: allComments.filter(c => c.procedure_id === procedureId).length,
    unresolved_annotations: annotations.filter(a => !a.is_resolved).length
  };
}

export function exportAnnotations(procedureId: string, versionNumber?: number): {
  procedure: Procedure;
  annotations: DocumentAnnotation[];
  comments: Comment[];
  export_date: string;
} {
  const procedure = listProcedures().find(p => p.id === procedureId);
  if (!procedure) {
    throw new Error('Procedure not found');
  }
  
  const version = versionNumber || procedure.version;
  const annotations = listAnnotations(procedureId, version);
  const comments = listComments(undefined, procedureId);
  
  return {
    procedure,
    annotations,
    comments,
    export_date: new Date().toISOString()
  };
}

export function getAnnotationStats(procedureId?: string): {
  total: number;
  by_type: Record<AnnotationType, number>;
  resolved: number;
  unresolved: number;
  with_comments: number;
  total_comments: number;
} {
  const annotations = procedureId ? listAnnotations(procedureId) : listAnnotations();
  const comments = procedureId ? listComments(undefined, procedureId) : listComments();
  
  const by_type: Record<AnnotationType, number> = {
    highlight: 0,
    note: 0,
    question: 0,
    correction: 0,
    warning: 0
  };
  
  let resolved = 0;
  let with_comments = 0;
  
  annotations.forEach(annotation => {
    by_type[annotation.type]++;
    if (annotation.is_resolved) resolved++;
    
    const hasComments = comments.some(c => c.annotation_id === annotation.id);
    if (hasComments) with_comments++;
  });
  
  return {
    total: annotations.length,
    by_type,
    resolved,
    unresolved: annotations.length - resolved,
    with_comments,
    total_comments: comments.length
  };
}