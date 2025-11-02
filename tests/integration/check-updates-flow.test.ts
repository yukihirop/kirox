import { describe, it, expect, beforeEach, vi } from 'vitest';
import { execute } from '@/cli/entry.js';
import * as metadataManager from '@/tracking/metadata-manager.js';
import * as batchChecker from '@/tracking/batch-update-checker.js';
import type { Metadata } from '@/tracking/types.js';
import { UpdateStatus } from '@/tracking/update-checker.js';

// Unmock PinoLogger to allow actual implementation
vi.unmock('@/reporting/pino-logger.js');

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
        totalFiles: 1,
        upToDate: 1,
        updatable: 0,
        localEdited: 0,
        conflict: 0,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [
          {
            path: '.kiro/specs/test-project/file1.md',
            status: UpdateStatus.UP_TO_DATE,
            recordedSha: 'abc123',
            remoteSha: 'abc123',
            recordedHash: 'hash123',
            currentHash: 'hash123',
            hasLocalEdit: false,
            hasRemoteUpdate: false,
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);

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
        totalFiles: 2,
        upToDate: 1,
        updatable: 1,
        localEdited: 0,
        conflict: 0,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [
          {
            path: '.kiro/specs/test-project/file1.md',
            status: UpdateStatus.UP_TO_DATE,
            recordedSha: 'abc123',
            remoteSha: 'abc123',
            recordedHash: 'hash123',
            currentHash: 'hash123',
            hasLocalEdit: false,
            hasRemoteUpdate: false,
          },
          {
            path: '.kiro/specs/test-project/file2.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'def456',
            remoteSha: 'xyz789',
            recordedHash: 'hash456',
            currentHash: 'hash456',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);

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

      const result = await execute(['node', 'kirox', '--check-updates']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });
});
