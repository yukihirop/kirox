import { describe, it, expect, beforeEach, vi } from 'vitest';
import { execute } from '@/cli/entry.js';
import * as metadataManager from '@/tracking/metadata-manager.js';
import * as batchChecker from '@/tracking/batch-update-checker.js';
import * as batchUpdater from '@/tracking/batch-file-updater.js';
import type { Metadata } from '@/tracking/types.js';
import { UpdateStatus } from '@/tracking/update-checker.js';

// Unmock PinoLogger to allow actual implementation
vi.unmock('@/reporting/pino-logger.js');

describe('--update Command Flow Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful update execution', () => {
    it('should load metadata, check updates, and apply updates', async () => {
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
        upToDate: 0,
        updatable: 1,
        localEdited: 0,
        conflict: 0,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [
          {
            path: '.kiro/specs/test-project/file1.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'abc123',
            remoteSha: 'xyz789',
            recordedHash: 'hash123',
            currentHash: 'hash123',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
        ],
      };

      // Mock update apply results
      const mockApplyResult = {
        totalFiles: 1,
        updated: 1,
        skipped: 0,
        failed: 0,
        updatedFiles: [
          {
            path: '.kiro/specs/test-project/file1.md',
            oldSha: 'abc123',
            newSha: 'xyz789',
            newHash: 'newhash123',
            newSize: 150,
          },
        ],
        skippedFiles: [],
        failedFiles: [],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);
      vi.spyOn(batchUpdater, 'applyUpdates').mockResolvedValue(mockApplyResult);

      const result = await execute(['node', 'kirox', '--update']);

      expect(metadataManager.loadMetadata).toHaveBeenCalled();
      expect(batchChecker.checkAllFiles).toHaveBeenCalled();
      expect(batchUpdater.applyUpdates).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should skip locally edited files and show warnings', async () => {
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
        upToDate: 0,
        updatable: 1,
        localEdited: 0,
        conflict: 1,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [
          {
            path: '.kiro/specs/test-project/file1.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'abc123',
            remoteSha: 'xyz789',
            recordedHash: 'hash123',
            currentHash: 'hash123',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
          {
            path: '.kiro/specs/test-project/file2.md',
            status: UpdateStatus.CONFLICT,
            recordedSha: 'def456',
            remoteSha: 'uvw012',
            recordedHash: 'hash456',
            currentHash: 'modifiedhash',
            hasLocalEdit: true,
            hasRemoteUpdate: true,
          },
        ],
      };

      const mockApplyResult = {
        totalFiles: 2,
        updated: 1,
        skipped: 1,
        failed: 0,
        updatedFiles: [
          {
            path: '.kiro/specs/test-project/file1.md',
            oldSha: 'abc123',
            newSha: 'xyz789',
            newHash: 'newhash123',
            newSize: 150,
          },
        ],
        skippedFiles: [
          {
            path: '.kiro/specs/test-project/file2.md',
            reason: 'conflict' as const,
          },
        ],
        failedFiles: [],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);
      vi.spyOn(batchUpdater, 'applyUpdates').mockResolvedValue(mockApplyResult);

      const result = await execute(['node', 'kirox', '--update']);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should fail when metadata file does not exist', async () => {
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(
        new Error('Metadata file not found')
      );

      const result = await execute(['node', 'kirox', '--update']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });

    it('should handle update failures gracefully', async () => {
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

      const mockCheckResult = {
        totalFiles: 1,
        upToDate: 0,
        updatable: 1,
        localEdited: 0,
        conflict: 0,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [
          {
            path: '.kiro/specs/test-project/file1.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'abc123',
            remoteSha: 'xyz789',
            recordedHash: 'hash123',
            currentHash: 'hash123',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);
      vi.spyOn(batchUpdater, 'applyUpdates').mockRejectedValue(
        new Error('File write error')
      );

      const result = await execute(['node', 'kirox', '--update']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });
});
