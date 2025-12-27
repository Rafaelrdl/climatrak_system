import { describe, it, expect, beforeEach } from 'vitest';
import { 
  initializeStorage,
  createProcedure,
  updateProcedure,
  listVersions,
  compareVersions,
  rollbackToVersion,
} from '@/data/proceduresStore';
import { Procedure, ProcedureFileRef } from '@/models/procedure';

// Mock UUID
const mockUuid = () => Math.random().toString(36).substring(2, 15);

describe('Version Comparison Functionality', () => {
  let testProcedure: Procedure;
  let mockFile: ProcedureFileRef;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Initialize storage
    initializeStorage();
    
    // Create mock file reference
    mockFile = {
      id: mockUuid(),
      name: 'test-procedure.md',
      type: 'md',
      size: 1024,
      checksum: 'abc123'
    };
  });

  it('should create initial version when procedure is created', async () => {
    const procedureData = {
      title: 'Test Procedure',
      description: 'Initial description',
      category_id: null,
      status: 'Ativo' as const,
      tags: ['test'],
      file: mockFile
    };

    testProcedure = createProcedure(procedureData);
    
    // Check if initial version was created
    const versions = listVersions(testProcedure.id);
    expect(versions).toHaveLength(1);
    expect(versions[0].change_type).toBe('created');
    expect(versions[0].title).toBe('Test Procedure');
    expect(versions[0].version_number).toBe(1);
  });

  it('should create new version when procedure is updated', async () => {
    // Create initial procedure
    testProcedure = createProcedure({
      title: 'Test Procedure',
      description: 'Initial description',
      category_id: null,
      status: 'Ativo' as const,
      tags: ['test'],
      file: mockFile
    });

    // Update the procedure
    const updatedProcedure = updateProcedure({
      ...testProcedure,
      title: 'Updated Test Procedure',
      description: 'Updated description',
      version: 2
    }, 'updated', 'Updated title and description');

    // Check versions
    const versions = listVersions(testProcedure.id);
    expect(versions).toHaveLength(2);
    
    // Latest version should be first (sorted by version_number desc)
    expect(versions[0].version_number).toBe(2);
    expect(versions[0].title).toBe('Updated Test Procedure');
    expect(versions[0].change_type).toBe('updated');
    expect(versions[0].change_summary).toBe('Updated title and description');
    
    expect(versions[1].version_number).toBe(1);
    expect(versions[1].title).toBe('Test Procedure');
    expect(versions[1].change_type).toBe('created');
  });

  it('should compare two versions correctly', async () => {
    // Create initial procedure
    testProcedure = createProcedure({
      title: 'Original Title',
      description: 'Original description',
      category_id: null,
      status: 'Ativo' as const,
      tags: ['original'],
      file: mockFile
    });

    // Update the procedure
    updateProcedure({
      ...testProcedure,
      title: 'Updated Title',
      description: 'Updated description',
      tags: ['updated', 'new'],
      version: 2
    }, 'updated', 'Major update');

    // Get versions
    const versions = listVersions(testProcedure.id);
    expect(versions).toHaveLength(2);

    // Compare versions
    const comparison = compareVersions(versions[1].id, versions[0].id);
    expect(comparison).not.toBeNull();

    if (comparison) {
      expect(comparison.fromVersion.version_number).toBe(1);
      expect(comparison.toVersion.version_number).toBe(2);
      
      // Should have differences
      expect(comparison.diffs).toHaveLength(3); // title, description, tags
      
      const titleDiff = comparison.diffs.find(d => d.field === 'title');
      expect(titleDiff).toBeDefined();
      expect(titleDiff?.oldValue).toBe('Original Title');
      expect(titleDiff?.newValue).toBe('Updated Title');
      expect(titleDiff?.changeType).toBe('modified');
      
      const descriptionDiff = comparison.diffs.find(d => d.field === 'description');
      expect(descriptionDiff).toBeDefined();
      expect(descriptionDiff?.oldValue).toBe('Original description');
      expect(descriptionDiff?.newValue).toBe('Updated description');
      
      const tagsDiff = comparison.diffs.find(d => d.field === 'tags');
      expect(tagsDiff).toBeDefined();
      expect(tagsDiff?.oldValue).toBe('original');
      expect(tagsDiff?.newValue).toBe('new, updated');
    }
  });

  it('should detect file changes when checksum differs', async () => {
    const originalFile = { ...mockFile, checksum: 'original' };
    const updatedFile = { ...mockFile, checksum: 'updated' };
    
    // Create initial procedure
    testProcedure = createProcedure({
      title: 'Test Procedure',
      description: 'Test description',
      category_id: null,
      status: 'Ativo' as const,
      tags: ['test'],
      file: originalFile
    });

    // Update with new file
    updateProcedure({
      ...testProcedure,
      file: updatedFile,
      version: 2
    }, 'file_updated', 'File updated');

    // Compare versions
    const versions = listVersions(testProcedure.id);
    const comparison = compareVersions(versions[1].id, versions[0].id);
    
    expect(comparison?.hasFileChanges).toBe(true);
    const fileDiff = comparison?.diffs.find(d => d.field === 'file');
    expect(fileDiff).toBeDefined();
    expect(fileDiff?.changeType).toBe('modified');
  });

  it('should rollback to previous version correctly', async () => {
    // Create initial procedure
    testProcedure = createProcedure({
      title: 'Original Title',
      description: 'Original description',
      category_id: null,
      status: 'Ativo' as const,
      tags: ['original'],
      file: mockFile
    });

    // Update the procedure
    const updatedProcedure = updateProcedure({
      ...testProcedure,
      title: 'Updated Title',
      description: 'Updated description',
      version: 2
    }, 'updated');

    // Get the original version
    const versions = listVersions(testProcedure.id);
    const originalVersion = versions.find(v => v.version_number === 1);
    expect(originalVersion).toBeDefined();

    // Rollback to original version
    const rolledBackProcedure = await rollbackToVersion(testProcedure.id, originalVersion!.id);
    
    expect(rolledBackProcedure).not.toBeNull();
    expect(rolledBackProcedure?.title).toBe('Original Title');
    expect(rolledBackProcedure?.description).toBe('Original description');
    expect(rolledBackProcedure?.version).toBe(3); // New version created for rollback
    
    // Should have 4 versions now: original, update, rollback backup, rollback
    const finalVersions = listVersions(testProcedure.id);
    expect(finalVersions).toHaveLength(4);
  });

  it('should handle empty comparisons when no differences exist', async () => {
    // Create procedure
    testProcedure = createProcedure({
      title: 'Same Title',
      description: 'Same description',
      category_id: null,
      status: 'Ativo' as const,
      tags: ['same'],
      file: mockFile
    });

    // Create another version with the same data (simulating no real changes)
    const sameVersion = updateProcedure({
      ...testProcedure,
      version: 2
    }, 'updated', 'No changes');

    const versions = listVersions(testProcedure.id);
    const comparison = compareVersions(versions[1].id, versions[0].id);
    
    expect(comparison).not.toBeNull();
    expect(comparison?.diffs).toHaveLength(0);
    expect(comparison?.hasFileChanges).toBe(false);
  });

  it('should return null for invalid version comparisons', async () => {
    const invalidComparison = compareVersions('invalid-id', 'another-invalid-id');
    expect(invalidComparison).toBeNull();
  });
});