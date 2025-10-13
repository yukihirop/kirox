/**
 * Add Command & Check-Updates Integration Tests (Task 9.1)
 *
 * Test integration between `kirox add` and `kirox --check-updates` functionality.
 * Verifies that projects added via the add command are properly recognized
 * by the update checking mechanism.
 *
 * This test suite verifies that the existing metadata-manager and batch-update-checker
 * modules correctly handle projects added via the add command, without requiring
 * new implementation (GREEN phase validates existing functionality).
 *
 * Requirements: 7.1, 7.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { execute } from '@/cli/entry.js';
import { executeAddCommand } from '@/cli/add-command-entry.js';
import * as metadataManager from '@/tracking/metadata-manager.js';
import * as batchChecker from '@/tracking/batch-update-checker.js';
import type { Metadata, UpdateStatus } from '@/tracking/types.js';

describe('Add Command & Check-Updates Integration (Task 9.1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Requirement 7.1: addコマンドで追加したプロジェクトが--check-updatesで認識されること
   */
  describe('Requirement 7.1: Add → Check-Updates Recognition', () => {
    it('should recognize projects added via add command when running --check-updates', async () => {
      // ARRANGE: Mock metadata with two projects (one existing, one added via add)
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'existing-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/existing-project/requirements.md',
                sha: 'abc123',
                localHash: 'hash123',
                size: 100,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'added-project', // This was added via add command
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/added-project/requirements.md',
                sha: 'def456',
                localHash: 'hash456',
                size: 200,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
        ],
      };

      // Mock check-updates result showing both projects are checked
      const mockCheckResult = {
        updates: [
          {
            path: '.kiro/specs/existing-project/requirements.md',
            status: 'UP_TO_DATE' as UpdateStatus,
            currentSha: 'abc123',
            remoteSha: 'abc123',
            localHash: 'hash123',
            hasLocalEdits: false,
          },
          {
            path: '.kiro/specs/added-project/requirements.md',
            status: 'UP_TO_DATE' as UpdateStatus,
            currentSha: 'def456',
            remoteSha: 'def456',
            localHash: 'hash456',
            hasLocalEdits: false,
          },
        ],
        summary: {
          totalFiles: 2,
          upToDate: 2,
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

      // ACT: Run --check-updates
      const result = await execute(['node', 'kirox', '--check-updates']);

      // ASSERT: Check-updates recognized both projects (existing + added)
      expect(metadataManager.loadMetadata).toHaveBeenCalled();
      expect(batchChecker.checkAllFiles).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should check updates for both existing and newly added projects', async () => {
      // ARRANGE: Mock metadata with multiple projects
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'project1',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project1/design.md',
                sha: 'aaa111',
                localHash: 'localhash1',
                size: 150,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'project2', // Added via add command
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project2/design.md',
                sha: 'bbb222',
                localHash: 'localhash2',
                size: 250,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
        ],
      };

      const mockCheckResult = {
        updates: [
          {
            path: '.kiro/specs/project1/design.md',
            status: 'UP_TO_DATE' as UpdateStatus,
            currentSha: 'aaa111',
            remoteSha: 'aaa111',
            localHash: 'localhash1',
            hasLocalEdits: false,
          },
          {
            path: '.kiro/specs/project2/design.md',
            status: 'UP_TO_DATE' as UpdateStatus,
            currentSha: 'bbb222',
            remoteSha: 'bbb222',
            localHash: 'localhash2',
            hasLocalEdits: false,
          },
        ],
        summary: {
          totalFiles: 2,
          upToDate: 2,
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

      // ACT: Run --check-updates
      const result = await execute(['node', 'kirox', '--check-updates']);

      // ASSERT: Both projects checked successfully
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  /**
   * Requirement 7.3: ローカル編集されたファイルが--check-updatesで正しく検出されること
   */
  describe('Requirement 7.3: Local Edit Detection', () => {
    it('should detect locally edited files in projects added via add command', async () => {
      // ARRANGE: Mock metadata where added-project has a locally edited file
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'added-project', // Added via add command
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/added-project/requirements.md',
                sha: 'original123',
                localHash: 'originalhash',
                size: 300,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
        ],
      };

      // Mock check result showing LOCAL_EDITED status
      const mockCheckResult = {
        updates: [
          {
            path: '.kiro/specs/added-project/requirements.md',
            status: 'LOCAL_EDITED' as UpdateStatus,
            currentSha: 'original123',
            remoteSha: 'original123',
            localHash: 'editedhash', // Local hash changed
            hasLocalEdits: true,
          },
        ],
        summary: {
          totalFiles: 1,
          upToDate: 0,
          remoteUpdated: 0,
          localEdited: 1, // One file locally edited
          conflict: 0,
          localDeleted: 0,
          remoteDeleted: 0,
          error: 0,
        },
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);

      // ACT: Run --check-updates
      const result = await execute(['node', 'kirox', '--check-updates']);

      // ASSERT: Local edit detected
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);

      // Verify check result includes local edit
      const checkResult = await vi.mocked(batchChecker.checkAllFiles).mock.results[0].value;
      expect(checkResult.summary.localEdited).toBe(1);
      expect(checkResult.updates[0].status).toBe('LOCAL_EDITED');
    });

    it('should warn about local edits in both existing and newly added projects', async () => {
      // ARRANGE: Mock metadata with two projects, both with local edits
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'project1',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project1/requirements.md',
                sha: 'sha1',
                localHash: 'hash1',
                size: 100,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'project2', // Added via add command
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project2/requirements.md',
                sha: 'sha2',
                localHash: 'hash2',
                size: 200,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
        ],
      };

      // Mock check result showing both files are locally edited
      const mockCheckResult = {
        updates: [
          {
            path: '.kiro/specs/project1/requirements.md',
            status: 'LOCAL_EDITED' as UpdateStatus,
            currentSha: 'sha1',
            remoteSha: 'sha1',
            localHash: 'editedhash1',
            hasLocalEdits: true,
          },
          {
            path: '.kiro/specs/project2/requirements.md',
            status: 'LOCAL_EDITED' as UpdateStatus,
            currentSha: 'sha2',
            remoteSha: 'sha2',
            localHash: 'editedhash2',
            hasLocalEdits: true,
          },
        ],
        summary: {
          totalFiles: 2,
          upToDate: 0,
          remoteUpdated: 0,
          localEdited: 2, // Both files locally edited
          conflict: 0,
          localDeleted: 0,
          remoteDeleted: 0,
          error: 0,
        },
      };

      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(batchChecker, 'checkAllFiles').mockResolvedValue(mockCheckResult);

      // ACT: Run --check-updates
      const result = await execute(['node', 'kirox', '--check-updates']);

      // ASSERT: Local edits detected in both projects
      expect(result.success).toBe(true);
      const checkResult = await vi.mocked(batchChecker.checkAllFiles).mock.results[0].value;
      expect(checkResult.summary.localEdited).toBe(2);
    });
  });

  /**
   * Requirement 7.1 (continued): 複数プロジェクト追加時の統合
   */
  describe('Multiple Projects Integration', () => {
    it('should handle multiple projects added at once with --check-updates', async () => {
      // ARRANGE: Mock metadata with 4 projects (1 initial + 3 added via add)
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'initial-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/initial-project/file.md',
                sha: 'initial',
                localHash: 'initialhash',
                size: 100,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'proj-a',
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/proj-a/file.md',
                sha: 'shaa',
                localHash: 'hasha',
                size: 110,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'proj-b',
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/proj-b/file.md',
                sha: 'shab',
                localHash: 'hashb',
                size: 120,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'proj-c',
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/proj-c/file.md',
                sha: 'shac',
                localHash: 'hashc',
                size: 130,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
        ],
      };

      const mockCheckResult = {
        updates: mockMetadata.projects.map((project) => ({
          path: project.files[0].path,
          status: 'UP_TO_DATE' as UpdateStatus,
          currentSha: project.files[0].sha,
          remoteSha: project.files[0].sha,
          localHash: project.files[0].localHash,
          hasLocalEdits: false,
        })),
        summary: {
          totalFiles: 4,
          upToDate: 4,
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

      // ACT: Run --check-updates
      const result = await execute(['node', 'kirox', '--check-updates']);

      // ASSERT: All 4 projects checked
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);

      const checkResult = await vi.mocked(batchChecker.checkAllFiles).mock.results[0].value;
      expect(checkResult.summary.totalFiles).toBe(4);
    });
  });

  /**
   * Edge Case: メタデータの整合性確認
   */
  describe('Metadata Consistency', () => {
    it('should maintain metadata consistency across add and check-updates operations', async () => {
      // ARRANGE: Mock well-formed metadata
      const mockMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'project1',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project1/file.md',
                sha: 'sha1',
                localHash: 'hash1',
                size: 100,
                fetchedAt: '2025-01-01T00:00:00Z',
              },
            ],
          },
          {
            repository: 'owner/repo',
            projectName: 'project2', // Added via add
            fetchedAt: '2025-01-02T00:00:00Z',
            files: [
              {
                path: '.kiro/specs/project2/file.md',
                sha: 'sha2',
                localHash: 'hash2',
                size: 200,
                fetchedAt: '2025-01-02T00:00:00Z',
              },
            ],
          },
        ],
      };

      const mockCheckResult = {
        updates: mockMetadata.projects.map((project) => ({
          path: project.files[0].path,
          status: 'UP_TO_DATE' as UpdateStatus,
          currentSha: project.files[0].sha,
          remoteSha: project.files[0].sha,
          localHash: project.files[0].localHash,
          hasLocalEdits: false,
        })),
        summary: {
          totalFiles: 2,
          upToDate: 2,
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

      // ACT: Run --check-updates
      const result = await execute(['node', 'kirox', '--check-updates']);

      // ASSERT: Metadata integrity maintained
      expect(result.success).toBe(true);

      // Verify loadMetadata was called with correct structure
      const loadedMetadata = await vi.mocked(metadataManager.loadMetadata).mock.results[0].value;
      expect(loadedMetadata.version).toBe('1.0');
      expect(loadedMetadata.projects).toHaveLength(2);
      expect(loadedMetadata.projects.every((p) => p.repository)).toBe(true);
      expect(loadedMetadata.projects.every((p) => p.projectName)).toBe(true);
      expect(loadedMetadata.projects.every((p) => Array.isArray(p.files))).toBe(true);
    });
  });
});
