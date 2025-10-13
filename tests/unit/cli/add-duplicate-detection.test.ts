/**
 * Add Command Duplicate Project Detection Tests (Task 11.2)
 *
 * Verify that add command properly detects and handles duplicate projects:
 * - Accurately detects duplicate projects (same repository + projectName + subdir)
 * - Treats projects with different subdirectories as separate projects
 * - Handles --force option to allow overwriting duplicate projects
 *
 * Requirements: Testing Strategy - Unit Tests, Requirements 1.3, 3.2, 3.3, 3.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeAddCommand } from '@/cli/add-command-entry.js';
import * as metadataManager from '@/tracking/metadata-manager.js';
import * as fetcher from '@/github/fetcher.js';
import * as parallelFetcher from '@/github/parallel-fetcher.js';

describe('Add Command Duplicate Project Detection (Task 11.2)', () => {
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock metadata save
    vi.spyOn(metadataManager, 'saveMetadata').mockResolvedValue(undefined);

    // Mock GitHub fetcher with basic success response
    vi.spyOn(fetcher, 'fetchDirectoryContents').mockResolvedValue([
      {
        name: 'requirements.md',
        path: '.kiro/specs/test-project/requirements.md',
        type: 'file',
        sha: 'sha1',
        size: 100
      },
    ]);
    vi.spyOn(parallelFetcher, 'fetchFilesInParallel').mockResolvedValue({
      success: [
        {
          path: '.kiro/specs/test-project/requirements.md',
          content: 'test content',
          sha: 'sha1',
          size: 100,
        },
      ],
      failed: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 3.2: Duplicate project detection', () => {
    it('should detect duplicate project with same repository, projectName, and subdir', async () => {
      // Existing metadata with a project
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'test-project',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/requirements.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Should detect duplicate and skip (without --force)
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);

      // Should display warning about duplicate
      // Logger.warn() uses console.log, not console.error
      const logCalls = (console.log as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasWarning = logCalls.some((msg: string) =>
        msg.includes('already exists') || msg.includes('--force')
      );
      expect(hasWarning).toBe(true);
    });

    it('should treat projects with different subdirectories as separate projects', async () => {
      // Existing metadata with a project in 'packages/api' subdirectory
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'test-project',
            repository: 'owner/repo',
            subdir: 'packages/api',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/requirements.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      // Try to add same project name but from different subdirectory ('packages/web')
      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '--subdir',
        'packages/web',
      ]);

      // Should NOT be treated as duplicate (different subdir)
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should treat projects with no subdir vs empty string subdir as duplicates', async () => {
      // Existing metadata with a project (no subdir specified = empty string)
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'test-project',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/requirements.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      // Try to add same project without specifying subdir (should default to '')
      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Should be treated as duplicate (empty string subdir matches)
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should not detect duplicate for different project names', async () => {
      // Existing metadata with 'project-a'
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'project-a',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project-a/requirements.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      // Try to add 'project-b'
      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'project-b',
      ]);

      // Should NOT be treated as duplicate (different project name)
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should not detect duplicate for different repositories', async () => {
      // Existing metadata with 'owner1/repo'
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'test-project',
            repository: 'owner1/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/requirements.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      // Try to add same project name from 'owner2/repo'
      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner2/repo',
        '-p',
        'test-project',
      ]);

      // Should NOT be treated as duplicate (different repository)
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Requirement 3.3: --force option behavior', () => {
    it('should allow overwriting duplicate project when --force is specified', async () => {
      // Existing metadata with a project
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'test-project',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/requirements.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '--force',
      ]);

      // Should succeed with --force
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should display verbose log when overwriting with --force', async () => {
      // Existing metadata with a project
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'test-project',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/requirements.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '--force',
        '--verbose',
      ]);

      // Should log verbose message about overwriting
      const logCalls = (console.log as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasOverwriteLog = logCalls.some((msg: string) =>
        msg.includes('overwrite') || msg.includes('Overwriting') || msg.includes('force')
      );
      expect(hasOverwriteLog).toBe(true);
    });

    it('should skip duplicate without --force and display warning', async () => {
      // Existing metadata with a project
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'test-project',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/requirements.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Should fail without --force
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);

      // Should display warning message
      // Logger.warn() uses console.log, not console.error
      const logCalls = (console.log as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasWarning = logCalls.some((msg: string) =>
        msg.includes('exists') || msg.includes('--force')
      );
      expect(hasWarning).toBe(true);
    });
  });

  describe('Requirement 3.4: Multiple duplicate detection', () => {
    it('should handle multiple projects with some duplicates', async () => {
      // Existing metadata with 'project-a'
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'project-a',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project-a/requirements.md',
                sha: 'sha-a',
                localHash: 'hash-a',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      // Try to add 'project-a' (duplicate) and 'project-b' (new)
      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'project-a,project-b',
      ]);

      // Should fail because project-a is duplicate (without --force)
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should skip all duplicate projects when multiple duplicates exist', async () => {
      // Existing metadata with both projects
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'project-a',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project-a/requirements.md',
                sha: 'sha-a',
                localHash: 'hash-a',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
          {
            projectName: 'project-b',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project-b/requirements.md',
                sha: 'sha-b',
                localHash: 'hash-b',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      // Try to add both projects (both duplicates)
      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'project-a,project-b',
      ]);

      // Should fail (all projects are duplicates)
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('Edge cases and validation', () => {
    it('should not perform duplicate check for new metadata (no existing projects)', async () => {
      // New metadata (empty projects array)
      const newMetadata = {
        version: '1.0',
        projects: [],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(newMetadata);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Should succeed (no duplicates to check)
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle case-sensitive project names correctly', async () => {
      // Existing metadata with 'Test-Project' (capital T and P)
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'Test-Project',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/Test-Project/requirements.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      // Try to add 'test-project' (lowercase)
      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Should NOT be treated as duplicate (case-sensitive)
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle branch differences correctly (same repo + project, different branch)', async () => {
      // Existing metadata with project from default branch (no branch specified in repository field)
      const existingMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'test-project',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/requirements.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 50,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(existingMetadata);

      // Try to add same project from 'feature' branch
      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo#feature',
        '-p',
        'test-project',
      ]);

      // Branch IS part of duplicate detection (stored in repository field)
      // 'owner/repo#feature' != 'owner/repo', so NOT treated as duplicate
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });
});
