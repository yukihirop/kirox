/**
 * Batch Update Checker Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import type { Octokit } from 'octokit';
import {
  checkAllFiles,
  UpdateSummary,
} from '../../../src/tracking/batch-update-checker.js';
import type { ProjectMetadata } from '../../../src/tracking/types.js';
import { UpdateStatus } from '../../../src/tracking/update-checker.js';

describe('BatchUpdateChecker - checkAllFiles', () => {
  const testDir = path.join(process.cwd(), '.test-batch-checker');
  let mockOctokit: Octokit;

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    // Create mock Octokit client
    mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn(),
        },
      },
    } as unknown as Octokit;
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('正常系: 全ファイルチェック', () => {
    it('複数ファイルをチェックしてサマリーを生成できる', async () => {
      // Arrange
      const baseDir = testDir;

      // Create test files
      const file1Path = path.join(baseDir, 'file1.md');
      const file2Path = path.join(baseDir, 'file2.md');
      const file3Path = path.join(baseDir, 'file3.md');

      await fs.writeFile(file1Path, 'content1', 'utf-8');
      await fs.writeFile(file2Path, 'content2', 'utf-8');
      await fs.writeFile(file3Path, 'modified content', 'utf-8');

      const crypto = await import('crypto');
      const hash1 = crypto.createHash('sha256').update('content1', 'utf-8').digest('hex');
      const hash2 = crypto.createHash('sha256').update('content2', 'utf-8').digest('hex');
      const hash3 = crypto.createHash('sha256').update('content3', 'utf-8').digest('hex'); // Original

      const project: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-01-01T00:00:00Z',
        files: [
          {
            path: 'file1.md',
            sha: 'sha1',
            localHash: hash1,
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
          {
            path: 'file2.md',
            sha: 'sha2-old',
            localHash: hash2,
            size: 200,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
          {
            path: 'file3.md',
            sha: 'sha3',
            localHash: hash3,
            size: 300,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
        ],
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        if (path === 'file1.md') {
          return {
            data: { path, sha: 'sha1', size: 100, type: 'file' },
            status: 200,
            url: 'https://api.github.com',
            headers: {},
          } as any;
        }
        if (path === 'file2.md') {
          return {
            data: { path, sha: 'sha2-new', size: 200, type: 'file' },
            status: 200,
            url: 'https://api.github.com',
            headers: {},
          } as any;
        }
        if (path === 'file3.md') {
          return {
            data: { path, sha: 'sha3', size: 300, type: 'file' },
            status: 200,
            url: 'https://api.github.com',
            headers: {},
          } as any;
        }
        throw new Error('Unexpected path');
      });

      // Act
      const result = await checkAllFiles(mockOctokit, 'owner', 'repo', baseDir, project);

      // Assert
      expect(result.totalFiles).toBe(3);
      expect(result.upToDate).toBe(1); // file1
      expect(result.updatable).toBe(1); // file2
      expect(result.localEdited).toBe(1); // file3
      expect(result.conflict).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.files).toHaveLength(3);
    });

    it('空のファイルリストの場合は空のサマリーを返す', async () => {
      // Arrange
      const project: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'empty-project',
        fetchedAt: '2025-01-01T00:00:00Z',
        files: [],
      };

      // Act
      const result = await checkAllFiles(mockOctokit, 'owner', 'repo', testDir, project);

      // Assert
      expect(result.totalFiles).toBe(0);
      expect(result.upToDate).toBe(0);
      expect(result.updatable).toBe(0);
      expect(result.localEdited).toBe(0);
      expect(result.conflict).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.files).toHaveLength(0);
    });
  });

  describe('正常系: ステータス別分類', () => {
    it('各ステータスのファイル数を正しくカウントする', async () => {
      // Arrange
      const baseDir = testDir;

      const upToDatePath = path.join(baseDir, 'up-to-date.md');
      const updatablePath = path.join(baseDir, 'updatable.md');
      const localEditedPath = path.join(baseDir, 'local-edited.md');
      const conflictPath = path.join(baseDir, 'conflict.md');

      await fs.writeFile(upToDatePath, 'unchanged', 'utf-8');
      await fs.writeFile(updatablePath, 'unchanged', 'utf-8');
      await fs.writeFile(localEditedPath, 'locally modified', 'utf-8');
      await fs.writeFile(conflictPath, 'locally modified', 'utf-8');

      const crypto = await import('crypto');
      const unchangedHash = crypto.createHash('sha256').update('unchanged', 'utf-8').digest('hex');
      const originalHash = crypto.createHash('sha256').update('original', 'utf-8').digest('hex');

      const project: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-01-01T00:00:00Z',
        files: [
          {
            path: 'up-to-date.md',
            sha: 'sha-same',
            localHash: unchangedHash,
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
          {
            path: 'updatable.md',
            sha: 'sha-old',
            localHash: unchangedHash,
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
          {
            path: 'local-edited.md',
            sha: 'sha-same',
            localHash: originalHash,
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
          {
            path: 'conflict.md',
            sha: 'sha-old',
            localHash: originalHash,
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
        ],
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        if (path === 'up-to-date.md') {
          return {
            data: { path, sha: 'sha-same', size: 100, type: 'file' },
            status: 200,
            url: 'https://api.github.com',
            headers: {},
          } as any;
        }
        if (path === 'updatable.md') {
          return {
            data: { path, sha: 'sha-new', size: 100, type: 'file' },
            status: 200,
            url: 'https://api.github.com',
            headers: {},
          } as any;
        }
        if (path === 'local-edited.md') {
          return {
            data: { path, sha: 'sha-same', size: 100, type: 'file' },
            status: 200,
            url: 'https://api.github.com',
            headers: {},
          } as any;
        }
        if (path === 'conflict.md') {
          return {
            data: { path, sha: 'sha-new', size: 100, type: 'file' },
            status: 200,
            url: 'https://api.github.com',
            headers: {},
          } as any;
        }
        throw new Error('Unexpected path');
      });

      // Act
      const result = await checkAllFiles(mockOctokit, 'owner', 'repo', baseDir, project);

      // Assert
      expect(result.totalFiles).toBe(4);
      expect(result.upToDate).toBe(1);
      expect(result.updatable).toBe(1);
      expect(result.localEdited).toBe(1);
      expect(result.conflict).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('削除されたファイルもカウントする', async () => {
      // Arrange
      const baseDir = testDir;

      const existsPath = path.join(baseDir, 'exists.md');
      await fs.writeFile(existsPath, 'content', 'utf-8');

      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update('content', 'utf-8').digest('hex');

      const project: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-01-01T00:00:00Z',
        files: [
          {
            path: 'exists.md',
            sha: 'sha1',
            localHash: hash,
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
          {
            path: 'local-deleted.md',
            sha: 'sha2',
            localHash: 'hash2',
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
          {
            path: 'remote-deleted.md',
            sha: 'sha3',
            localHash: hash,
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
        ],
      };

      const remoteDeletedPath = path.join(baseDir, 'remote-deleted.md');
      await fs.writeFile(remoteDeletedPath, 'content', 'utf-8');

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        if (path === 'exists.md') {
          return {
            data: { path, sha: 'sha1', size: 100, type: 'file' },
            status: 200,
            url: 'https://api.github.com',
            headers: {},
          } as any;
        }
        if (path === 'local-deleted.md') {
          return {
            data: { path, sha: 'sha2', size: 100, type: 'file' },
            status: 200,
            url: 'https://api.github.com',
            headers: {},
          } as any;
        }
        if (path === 'remote-deleted.md') {
          const error = new Error('Not Found');
          (error as any).status = 404;
          throw error;
        }
        throw new Error('Unexpected path');
      });

      // Act
      const result = await checkAllFiles(mockOctokit, 'owner', 'repo', baseDir, project);

      // Assert
      expect(result.totalFiles).toBe(3);
      expect(result.localDeleted).toBeGreaterThan(0);
      expect(result.remoteDeleted).toBeGreaterThan(0);
    });
  });

  describe('異常系: GitHub APIエラー', () => {
    it('一部のファイルでエラーが発生してもカウントする', async () => {
      // Arrange
      const baseDir = testDir;

      const okPath = path.join(baseDir, 'ok.md');
      await fs.writeFile(okPath, 'content', 'utf-8');

      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update('content', 'utf-8').digest('hex');

      const project: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-01-01T00:00:00Z',
        files: [
          {
            path: 'ok.md',
            sha: 'sha1',
            localHash: hash,
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
          {
            path: 'error.md',
            sha: 'sha2',
            localHash: hash,
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
        ],
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        if (path === 'ok.md') {
          return {
            data: { path, sha: 'sha1', size: 100, type: 'file' },
            status: 200,
            url: 'https://api.github.com',
            headers: {},
          } as any;
        }
        if (path === 'error.md') {
          const error = new Error('Rate limit exceeded');
          (error as any).status = 403;
          throw error;
        }
        throw new Error('Unexpected path');
      });

      // Act
      const result = await checkAllFiles(mockOctokit, 'owner', 'repo', baseDir, project);

      // Assert
      expect(result.totalFiles).toBe(2);
      expect(result.errors).toBe(1);
      expect(result.files).toHaveLength(2);
      expect(result.files.some((f) => f.status === UpdateStatus.ERROR)).toBe(true);
    });

    it('エラーの詳細を含む', async () => {
      // Arrange
      const baseDir = testDir;

      const project: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-01-01T00:00:00Z',
        files: [
          {
            path: 'rate-limit.md',
            sha: 'sha1',
            localHash: 'hash1',
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
        ],
      };

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 403;
      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(rateLimitError);

      // Act
      const result = await checkAllFiles(mockOctokit, 'owner', 'repo', baseDir, project);

      // Assert
      expect(result.errors).toBe(1);
      const errorFile = result.files.find((f) => f.status === UpdateStatus.ERROR);
      expect(errorFile).toBeDefined();
      expect(errorFile?.error).toBeDefined();
    });
  });

  describe('サマリー構造', () => {
    it('すべての必須フィールドを含む', async () => {
      // Arrange
      const project: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-01-01T00:00:00Z',
        files: [],
      };

      // Act
      const result = await checkAllFiles(mockOctokit, 'owner', 'repo', testDir, project);

      // Assert
      expect(result).toHaveProperty('totalFiles');
      expect(result).toHaveProperty('upToDate');
      expect(result).toHaveProperty('updatable');
      expect(result).toHaveProperty('localEdited');
      expect(result).toHaveProperty('conflict');
      expect(result).toHaveProperty('localDeleted');
      expect(result).toHaveProperty('remoteDeleted');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('files');
    });

    it('ファイル詳細情報を含む', async () => {
      // Arrange
      const baseDir = testDir;
      const filePath = path.join(baseDir, 'test.md');
      await fs.writeFile(filePath, 'content', 'utf-8');

      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update('content', 'utf-8').digest('hex');

      const project: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-01-01T00:00:00Z',
        files: [
          {
            path: 'test.md',
            sha: 'sha1',
            localHash: hash,
            size: 100,
            fetchedAt: '2025-01-01T00:00:00Z',
          },
        ],
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: { path: 'test.md', sha: 'sha1', size: 100, type: 'file' },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await checkAllFiles(mockOctokit, 'owner', 'repo', baseDir, project);

      // Assert
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toHaveProperty('path');
      expect(result.files[0]).toHaveProperty('status');
      expect(result.files[0]).toHaveProperty('hasLocalEdit');
      expect(result.files[0]).toHaveProperty('hasRemoteUpdate');
    });
  });
});
