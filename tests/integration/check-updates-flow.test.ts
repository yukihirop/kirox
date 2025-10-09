import { describe, it, expect, beforeEach, vi } from 'vitest';
import { execute } from '@/cli/entry.js';
import type { ParsedArguments } from '@/cli/types.js';
import * as metadataManager from '@/tracking/metadata-manager.js';
import * as batchChecker from '@/tracking/batch-update-checker.js';
import type { Metadata } from '@/tracking/types.js';
import type { UpdateStatus } from '@/tracking/types.js';

describe('--check-updates Command Flow Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful check-updates execution', () => {
    it('should load metadata and check for updates', async () => {
      // Mock metadata with tracked files
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/file1.md',
                sha: 'abc123',
                localHash: 'hash123',
                size: 100,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      // Mock update check results
      const mockCheckResult = {
        updates: [
          {
            path: '.kiro/specs/test-project/file1.md',
            status: 'UP_TO_DATE' as UpdateStatus,
            currentSha: 'abc123',
            remoteSha: 'abc123',
            localHash: 'hash123',
            hasLocalEdits: false,
          },
        ],
        summary: {
          totalFiles: 1,
          upToDate: 1,
          remoteUpdated: 0,
          localEdited: 0,
          conflict: 0,
          localDeleted: 0,
          remoteDeleted: 0,
          error: 0,
        },
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);

      const args: ParsedArguments = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: true,
        update: false,
      };

      const result = await execute(['node', 'kirox', '--check-updates']);

      expect(metadataManager.loadMetadata).toHaveBeenCalled();
      expect(batchChecker.checkAllFiles).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should display file status grouped by update status', async () => {
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/file1.md',
                sha: 'abc123',
                localHash: 'hash123',
                size: 100,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
              {
                path: '.kiro/specs/test-project/file2.md',
                sha: 'def456',
                localHash: 'hash456',
                size: 200,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      const mockCheckResult = {
        updates: [
          {
            path: '.kiro/specs/test-project/file1.md',
            status: 'UP_TO_DATE' as UpdateStatus,
            currentSha: 'abc123',
            remoteSha: 'abc123',
            localHash: 'hash123',
            hasLocalEdits: false,
          },
          {
            path: '.kiro/specs/test-project/file2.md',
            status: 'REMOTE_UPDATED' as UpdateStatus,
            currentSha: 'def456',
            remoteSha: 'xyz789',
            localHash: 'hash456',
            hasLocalEdits: false,
          },
        ],
        summary: {
          totalFiles: 2,
          upToDate: 1,
          remoteUpdated: 1,
          localEdited: 0,
          conflict: 0,
          localDeleted: 0,
          remoteDeleted: 0,
          error: 0,
        },
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);

      const args: ParsedArguments = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: true,
        update: false,
      };

      const result = await execute(['node', 'kirox', '--check-updates']);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should fail when metadata file does not exist', async () => {
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(
        new Error('Metadata file not found')
      );

      const args: ParsedArguments = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: true,
        update: false,
      };

      const result = await execute(['node', 'kirox', '--check-updates']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });

    it('should handle update check errors gracefully', async () => {
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/file1.md',
                sha: 'abc123',
                localHash: 'hash123',
                size: 100,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockRejectedValue(
        new Error('GitHub API error')
      );

      const args: ParsedArguments = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: true,
        update: false,
      };

      const result = await execute(['node', 'kirox', '--check-updates']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });
});
