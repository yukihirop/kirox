/**
 * Add Command & Update Integration Tests (Task 9.2)
 *
 * Test integration between `kirox add` and `kirox --update` functionality.
 * Verifies that projects added via the add command can be updated
 * using the --update mechanism.
 *
 * This test suite verifies that the existing metadata-manager and batch-updater
 * modules correctly handle projects added via the add command.
 *
 * Requirements: 7.2, 7.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { execute } from '@/cli/entry.js';
import * as metadataManager from '@/tracking/metadata-manager.js';
import * as batchChecker from '@/tracking/batch-update-checker.js';
import * as batchUpdater from '@/tracking/batch-file-updater.js';
import type { Metadata } from '@/tracking/types.js';
import { UpdateStatus } from '@/tracking/update-checker.js';

// Unmock PinoLogger to allow actual implementation
vi.unmock('@/reporting/pino-logger.js');

describe('Add Command & Update Integration (Task 9.2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Requirement 7.2: addコマンドで複数プロジェクトを追加後、--updateで全て更新可能
   */
  describe('Requirement 7.2: Add → Update Multiple Projects', () => {
    it('should update all projects added via add command when running --update', async () => {
      // ARRANGE: Mock metadata with multiple projects added via add command
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'project-a', // Added via add command
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project-a/requirements.md',
                sha: 'sha-a-old',
                localHash: 'hash-a',
                size: 100,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'project-b', // Added via add command
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project-b/requirements.md',
                sha: 'sha-b-old',
                localHash: 'hash-b',
                size: 200,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
        ],
      };

      // Mock update result showing both projects have updates available
      const mockCheckResult = {
        totalFiles: 2,
        upToDate: 0,
        updatable: 2,
        localEdited: 0,
        conflict: 0,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [
          {
            path: '.kiro/specs/project-a/requirements.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha-a-old',
            remoteSha: 'sha-a-new',
            recordedHash: 'hash-a',
            currentHash: 'hash-a',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
          {
            path: '.kiro/specs/project-b/requirements.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha-b-old',
            remoteSha: 'sha-b-new',
            recordedHash: 'hash-b',
            currentHash: 'hash-b',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
        ],
      };

      const mockApplyResult = {
        totalFiles: 2,
        updated: 2,
        skipped: 0,
        failed: 0,
        updatedFiles: [
          {
            path: '.kiro/specs/project-a/requirements.md',
            oldSha: 'sha-a-old',
            newSha: 'sha-a-new',
            newHash: 'newhash-a',
            newSize: 120,
          },
          {
            path: '.kiro/specs/project-b/requirements.md',
            oldSha: 'sha-b-old',
            newSha: 'sha-b-new',
            newHash: 'newhash-b',
            newSize: 220,
          },
        ],
        skippedFiles: [],
        failedFiles: [],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);
      vi.spyOn(batchUpdater, 'applyUpdates').mockResolvedValue(mockApplyResult);

      // ACT: Run --update
      const result = await execute(['node', 'kirox', '--update']);

      // ASSERT: Both projects added via add command are updated
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(metadataManager.loadMetadata).toHaveBeenCalled();
      expect(batchChecker.checkAllFiles).toHaveBeenCalled();
      expect(batchUpdater.applyUpdates).toHaveBeenCalled();
    });

    it('should successfully apply updates to all added projects', async () => {
      // ARRANGE: Mock metadata with 3 projects (all added via add)
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'proj1',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/proj1/design.md',
                sha: 'sha1-old',
                localHash: 'hash1',
                size: 100,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'proj2',
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/proj2/design.md',
                sha: 'sha2-old',
                localHash: 'hash2',
                size: 200,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'proj3',
            fetchedAt: '2025-01-03T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/proj3/design.md',
                sha: 'sha3-old',
                localHash: 'hash3',
                size: 300,
                fetchedAt: '2025-01-03T00:00:00Z',
              },
            ],
          },
        ],
      };

      const mockCheckResult = {
        totalFiles: 3,
        upToDate: 0,
        updatable: 3,
        localEdited: 0,
        conflict: 0,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [
          {
            path: '.kiro/specs/proj1/design.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha1-old',
            remoteSha: 'sha1-new',
            recordedHash: 'hash1',
            currentHash: 'hash1',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
          {
            path: '.kiro/specs/proj2/design.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha2-old',
            remoteSha: 'sha2-new',
            recordedHash: 'hash2',
            currentHash: 'hash2',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
          {
            path: '.kiro/specs/proj3/design.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha3-old',
            remoteSha: 'sha3-new',
            recordedHash: 'hash3',
            currentHash: 'hash3',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
        ],
      };

      const mockApplyResult = {
        totalFiles: 3,
        updated: 3,
        skipped: 0,
        failed: 0,
        updatedFiles: [
          {
            path: '.kiro/specs/proj1/design.md',
            oldSha: 'sha1-old',
            newSha: 'sha1-new',
            newHash: 'newhash1',
            newSize: 120,
          },
          {
            path: '.kiro/specs/proj2/design.md',
            oldSha: 'sha2-old',
            newSha: 'sha2-new',
            newHash: 'newhash2',
            newSize: 220,
          },
          {
            path: '.kiro/specs/proj3/design.md',
            oldSha: 'sha3-old',
            newSha: 'sha3-new',
            newHash: 'newhash3',
            newSize: 320,
          },
        ],
        skippedFiles: [],
        failedFiles: [],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);
      vi.spyOn(batchUpdater, 'applyUpdates').mockResolvedValue(mockApplyResult);

      // ACT: Run --update
      const result = await execute(['node', 'kirox', '--update']);

      // ASSERT: All 3 projects successfully updated
      expect(result.success).toBe(true);
      expect(batchChecker.checkAllFiles).toHaveBeenCalled();
      expect(batchUpdater.applyUpdates).toHaveBeenCalled();
    });
  });

  /**
   * Requirement 7.4: 既存プロジェクトと新規追加プロジェクトが混在している場合、両方が更新対象
   */
  describe('Requirement 7.4: Mixed Existing and Added Projects Update', () => {
    it('should update both existing and newly added projects when running --update', async () => {
      // ARRANGE: Mock metadata with mixed projects
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'existing-project', // Original project (not added via add)
            fetchedAt: '2024-12-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/existing-project/requirements.md',
                sha: 'sha-existing-old',
                localHash: 'hash-existing',
                size: 500,
                fetchedAt: '2024-12-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'added-project-1', // Added via add command
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/added-project-1/requirements.md',
                sha: 'sha-added1-old',
                localHash: 'hash-added1',
                size: 300,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'added-project-2', // Added via add command
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/added-project-2/requirements.md',
                sha: 'sha-added2-old',
                localHash: 'hash-added2',
                size: 400,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
        ],
      };

      // Mock update result showing all projects have updates
      const mockCheckResult = {
        totalFiles: 3,
        upToDate: 0,
        updatable: 3,
        localEdited: 0,
        conflict: 0,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [
          {
            path: '.kiro/specs/existing-project/requirements.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha-existing-old',
            remoteSha: 'sha-existing-new',
            recordedHash: 'hash-existing',
            currentHash: 'hash-existing',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
          {
            path: '.kiro/specs/added-project-1/requirements.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha-added1-old',
            remoteSha: 'sha-added1-new',
            recordedHash: 'hash-added1',
            currentHash: 'hash-added1',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
          {
            path: '.kiro/specs/added-project-2/requirements.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha-added2-old',
            remoteSha: 'sha-added2-new',
            recordedHash: 'hash-added2',
            currentHash: 'hash-added2',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
        ],
      };

      const mockApplyResult = {
        totalFiles: 3,
        updated: 3,
        skipped: 0,
        failed: 0,
        updatedFiles: [
          {
            path: '.kiro/specs/existing-project/requirements.md',
            oldSha: 'sha-existing-old',
            newSha: 'sha-existing-new',
            newHash: 'newhash-existing',
            newSize: 520,
          },
          {
            path: '.kiro/specs/added-project-1/requirements.md',
            oldSha: 'sha-added1-old',
            newSha: 'sha-added1-new',
            newHash: 'newhash-added1',
            newSize: 320,
          },
          {
            path: '.kiro/specs/added-project-2/requirements.md',
            oldSha: 'sha-added2-old',
            newSha: 'sha-added2-new',
            newHash: 'newhash-added2',
            newSize: 420,
          },
        ],
        skippedFiles: [],
        failedFiles: [],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);
      vi.spyOn(batchUpdater, 'applyUpdates').mockResolvedValue(mockApplyResult);

      // ACT: Run --update
      const result = await execute(['node', 'kirox', '--update']);

      // ASSERT: All projects (existing + added) are updated
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(metadataManager.loadMetadata).toHaveBeenCalled();
      expect(batchChecker.checkAllFiles).toHaveBeenCalled();
      expect(batchUpdater.applyUpdates).toHaveBeenCalled();
    });

    it('should handle partial update success for mixed projects', async () => {
      // ARRANGE: Mock metadata with existing + added projects
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'existing',
            fetchedAt: '2024-12-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/existing/file.md',
                sha: 'sha1',
                localHash: 'hash1',
                size: 100,
                fetchedAt: '2024-12-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'added',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/added/file.md',
                sha: 'sha2',
                localHash: 'hash2',
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
        updatable: 2,
        localEdited: 0,
        conflict: 0,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [
          {
            path: '.kiro/specs/existing/file.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha1',
            remoteSha: 'sha1-new',
            recordedHash: 'hash1',
            currentHash: 'hash1',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
          {
            path: '.kiro/specs/added/file.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha2',
            remoteSha: 'sha2-new',
            recordedHash: 'hash2',
            currentHash: 'hash2',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
        ],
      };

      // One succeeds, one fails
      const mockApplyResult = {
        totalFiles: 2,
        updated: 1,
        skipped: 0,
        failed: 1,
        updatedFiles: [
          {
            path: '.kiro/specs/existing/file.md',
            oldSha: 'sha1',
            newSha: 'sha1-new',
            newHash: 'newhash1',
            newSize: 120,
          },
        ],
        skippedFiles: [],
        failedFiles: [
          {
            path: '.kiro/specs/added/file.md',
            error: 'File write error',
          },
        ],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);
      vi.spyOn(batchUpdater, 'applyUpdates').mockResolvedValue(mockApplyResult);

      // ACT: Run --update
      const result = await execute(['node', 'kirox', '--update']);

      // ASSERT: Partial success handled gracefully (fails with error)
      expect(result.success).toBe(false);
      expect(batchChecker.checkAllFiles).toHaveBeenCalled();
      expect(batchUpdater.applyUpdates).toHaveBeenCalled();
    });

    it('should process updates for projects from different repositories', async () => {
      // ARRANGE: Mock metadata with projects from different repositories
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo1',
            projectName: 'proj-repo1',
            fetchedAt: '2024-12-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/proj-repo1/file.md',
                sha: 'sha-repo1',
                localHash: 'hash-repo1',
                size: 100,
                fetchedAt: '2024-12-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo2',
            projectName: 'proj-repo2', // Added from different repo
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/proj-repo2/file.md',
                sha: 'sha-repo2',
                localHash: 'hash-repo2',
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
        updatable: 2,
        localEdited: 0,
        conflict: 0,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [
          {
            path: '.kiro/specs/proj-repo1/file.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha-repo1',
            remoteSha: 'sha-repo1-new',
            recordedHash: 'hash-repo1',
            currentHash: 'hash-repo1',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
          {
            path: '.kiro/specs/proj-repo2/file.md',
            status: UpdateStatus.REMOTE_UPDATED,
            recordedSha: 'sha-repo2',
            remoteSha: 'sha-repo2-new',
            recordedHash: 'hash-repo2',
            currentHash: 'hash-repo2',
            hasLocalEdit: false,
            hasRemoteUpdate: true,
          },
        ],
      };

      const mockApplyResult = {
        totalFiles: 2,
        updated: 2,
        skipped: 0,
        failed: 0,
        updatedFiles: [
          {
            path: '.kiro/specs/proj-repo1/file.md',
            oldSha: 'sha-repo1',
            newSha: 'sha-repo1-new',
            newHash: 'newhash-repo1',
            newSize: 120,
          },
          {
            path: '.kiro/specs/proj-repo2/file.md',
            oldSha: 'sha-repo2',
            newSha: 'sha-repo2-new',
            newHash: 'newhash-repo2',
            newSize: 220,
          },
        ],
        skippedFiles: [],
        failedFiles: [],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);
      vi.spyOn(batchUpdater, 'applyUpdates').mockResolvedValue(mockApplyResult);

      // ACT: Run --update
      const result = await execute(['node', 'kirox', '--update']);

      // ASSERT: Projects from different repositories are both updated
      expect(result.success).toBe(true);
      expect(batchChecker.checkAllFiles).toHaveBeenCalled();
      expect(batchUpdater.applyUpdates).toHaveBeenCalled();
    });
  });

  /**
   * Edge Case: No updates available for added projects
   */
  describe('Edge Cases', () => {
    it('should handle no updates available for projects added via add command', async () => {
      // ARRANGE: Mock metadata where all added projects are up-to-date
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'added-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/added-project/file.md',
                sha: 'sha-current',
                localHash: 'hash-current',
                size: 100,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
        ],
      };

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
            path: '.kiro/specs/added-project/file.md',
            status: UpdateStatus.UP_TO_DATE,
            recordedSha: 'sha-current',
            remoteSha: 'sha-current',
            recordedHash: 'hash-current',
            currentHash: 'hash-current',
            hasLocalEdit: false,
            hasRemoteUpdate: false,
          },
        ],
      };

      const mockApplyResult = {
        totalFiles: 1,
        updated: 0,
        skipped: 1,
        failed: 0,
        updatedFiles: [],
        skippedFiles: [
          {
            path: '.kiro/specs/added-project/file.md',
            reason: 'up-to-date' as const,
          },
        ],
        failedFiles: [],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);
      vi.spyOn(batchUpdater, 'applyUpdates').mockResolvedValue(mockApplyResult);

      // ACT: Run --update
      const result = await execute(['node', 'kirox', '--update']);

      // ASSERT: No updates applied, but successful completion
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle empty metadata gracefully', async () => {
      // ARRANGE: Mock empty metadata (no projects added yet)
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [],
      };

      const mockCheckResult = {
        totalFiles: 0,
        upToDate: 0,
        updatable: 0,
        localEdited: 0,
        conflict: 0,
        localDeleted: 0,
        remoteDeleted: 0,
        errors: 0,
        files: [],
      };

      const mockApplyResult = {
        totalFiles: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        updatedFiles: [],
        skippedFiles: [],
        failedFiles: [],
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);
      vi.spyOn(batchUpdater, 'applyUpdates').mockResolvedValue(mockApplyResult);

      // ACT: Run --update
      const result = await execute(['node', 'kirox', '--update']);

      // ASSERT: Gracefully handles empty metadata
      expect(result.success).toBe(true);
    });
  });
});
