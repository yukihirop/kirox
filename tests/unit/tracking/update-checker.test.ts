/**
 * Update Checker Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import type { Octokit } from 'octokit';
import {
  checkFileUpdate,
  UpdateCheckResult,
  UpdateStatus,
} from '../../../src/tracking/update-checker.js';
import type { FileMetadata } from '../../../src/tracking/types.js';

describe('UpdateChecker - checkFileUpdate', () => {
  const testDir = path.join(process.cwd(), '.test-update-checker');
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

  describe('正常系: 更新なし（最新）', () => {
    it('リモートSHA一致 & ローカル編集なしの場合にUP_TO_DATEを返す', async () => {
      // Arrange
      const localPath = path.join(testDir, 'unchanged.md');
      const content = 'original content';
      await fs.writeFile(localPath, content, 'utf-8');

      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');

      const recordedMetadata: FileMetadata = {
        path: '.kiro/specs/feature/requirements.md',
        sha: 'remote-sha-123',
        localHash: hash,
        size: 1024,
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          path: '.kiro/specs/feature/requirements.md',
          sha: 'remote-sha-123', // Same as recorded
          size: 1024,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result.status).toBe(UpdateStatus.UP_TO_DATE);
      expect(result.remoteSha).toBe('remote-sha-123');
      expect(result.recordedSha).toBe('remote-sha-123');
      expect(result.hasLocalEdit).toBe(false);
      expect(result.hasRemoteUpdate).toBe(false);
    });
  });

  describe('正常系: リモート更新あり（ローカル編集なし）', () => {
    it('リモートSHA不一致 & ローカル編集なしの場合にREMOTE_UPDATEDを返す', async () => {
      // Arrange
      const localPath = path.join(testDir, 'outdated.md');
      const content = 'original content';
      await fs.writeFile(localPath, content, 'utf-8');

      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');

      const recordedMetadata: FileMetadata = {
        path: '.kiro/specs/feature/design.md',
        sha: 'old-sha-456',
        localHash: hash,
        size: 1024,
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          path: '.kiro/specs/feature/design.md',
          sha: 'new-sha-789', // Different from recorded
          size: 2048,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result.status).toBe(UpdateStatus.REMOTE_UPDATED);
      expect(result.remoteSha).toBe('new-sha-789');
      expect(result.recordedSha).toBe('old-sha-456');
      expect(result.hasLocalEdit).toBe(false);
      expect(result.hasRemoteUpdate).toBe(true);
    });
  });

  describe('正常系: ローカル編集あり（リモート更新なし）', () => {
    it('リモートSHA一致 & ローカル編集ありの場合にLOCAL_EDITEDを返す', async () => {
      // Arrange
      const localPath = path.join(testDir, 'edited.md');
      const modifiedContent = 'modified content';
      await fs.writeFile(localPath, modifiedContent, 'utf-8');

      const crypto = await import('crypto');
      const originalHash = crypto
        .createHash('sha256')
        .update('original content', 'utf-8')
        .digest('hex');

      const recordedMetadata: FileMetadata = {
        path: '.kiro/steering/tech.md',
        sha: 'remote-sha-abc',
        hash: originalHash, // Hash of original content
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          path: '.kiro/steering/tech.md',
          sha: 'remote-sha-abc', // Same as recorded
          size: 1024,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result.status).toBe(UpdateStatus.LOCAL_EDITED);
      expect(result.remoteSha).toBe('remote-sha-abc');
      expect(result.recordedSha).toBe('remote-sha-abc');
      expect(result.hasLocalEdit).toBe(true);
      expect(result.hasRemoteUpdate).toBe(false);
    });
  });

  describe('正常系: 競合（両方とも変更あり）', () => {
    it('リモートSHA不一致 & ローカル編集ありの場合にCONFLICTを返す', async () => {
      // Arrange
      const localPath = path.join(testDir, 'conflict.md');
      const modifiedContent = 'locally modified content';
      await fs.writeFile(localPath, modifiedContent, 'utf-8');

      const crypto = await import('crypto');
      const originalHash = crypto
        .createHash('sha256')
        .update('original content', 'utf-8')
        .digest('hex');

      const recordedMetadata: FileMetadata = {
        path: '.kiro/specs/feature/tasks.md',
        sha: 'old-remote-sha',
        hash: originalHash,
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          path: '.kiro/specs/feature/tasks.md',
          sha: 'new-remote-sha', // Different from recorded
          size: 2048,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result.status).toBe(UpdateStatus.CONFLICT);
      expect(result.remoteSha).toBe('new-remote-sha');
      expect(result.recordedSha).toBe('old-remote-sha');
      expect(result.hasLocalEdit).toBe(true);
      expect(result.hasRemoteUpdate).toBe(true);
    });
  });

  describe('異常系: ローカルファイル削除', () => {
    it('ローカルファイルが削除されている場合にLOCAL_DELETEDを返す', async () => {
      // Arrange
      const localPath = path.join(testDir, 'deleted.md');
      // File does not exist

      const recordedMetadata: FileMetadata = {
        path: '.kiro/steering/product.md',
        sha: 'remote-sha-def',
        localHash: 'some-hash',
        size: 1024,
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          path: '.kiro/steering/product.md',
          sha: 'remote-sha-def',
          size: 1024,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result.status).toBe(UpdateStatus.LOCAL_DELETED);
      expect(result.hasLocalEdit).toBe(true);
      expect(result.currentHash).toBeUndefined();
    });
  });

  describe('異常系: リモートファイル削除', () => {
    it('リモートファイルが削除されている場合にREMOTE_DELETEDを返す', async () => {
      // Arrange
      const localPath = path.join(testDir, 'exists.md');
      const content = 'local content';
      await fs.writeFile(localPath, content, 'utf-8');

      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');

      const recordedMetadata: FileMetadata = {
        path: '.kiro/specs/deleted/file.md',
        sha: 'old-sha',
        localHash: hash,
        size: 1024,
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;
      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(notFoundError);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result.status).toBe(UpdateStatus.REMOTE_DELETED);
      expect(result.hasRemoteUpdate).toBe(true);
      expect(result.remoteSha).toBeUndefined();
    });
  });

  describe('異常系: GitHub APIエラー', () => {
    it('レート制限エラー時にERRORステータスを返す', async () => {
      // Arrange
      const localPath = path.join(testDir, 'file.md');
      const content = 'content';
      await fs.writeFile(localPath, content, 'utf-8');

      const recordedMetadata: FileMetadata = {
        path: '.kiro/specs/feature/file.md',
        sha: 'sha',
        localHash: 'hash',
        size: 1024,
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 403;
      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(rateLimitError);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result.status).toBe(UpdateStatus.ERROR);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Rate limit');
    });

    it('ネットワークエラー時にERRORステータスを返す', async () => {
      // Arrange
      const localPath = path.join(testDir, 'file.md');
      const content = 'content';
      await fs.writeFile(localPath, content, 'utf-8');

      const recordedMetadata: FileMetadata = {
        path: '.kiro/specs/feature/file.md',
        sha: 'sha',
        localHash: 'hash',
        size: 1024,
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const networkError = new Error('Network error');
      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(networkError);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result.status).toBe(UpdateStatus.ERROR);
      expect(result.error).toContain('Network error');
    });
  });

  describe('結果オブジェクトの構造', () => {
    it('すべての必須フィールドを含む', async () => {
      // Arrange
      const localPath = path.join(testDir, 'file.md');
      const content = 'content';
      await fs.writeFile(localPath, content, 'utf-8');

      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');

      const recordedMetadata: FileMetadata = {
        path: '.kiro/file.md',
        sha: 'sha123',
        localHash: hash,
        size: 1024,
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          path: '.kiro/file.md',
          sha: 'sha123',
          size: 1024,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('remoteSha');
      expect(result).toHaveProperty('recordedSha');
      expect(result).toHaveProperty('currentHash');
      expect(result).toHaveProperty('recordedHash');
      expect(result).toHaveProperty('hasLocalEdit');
      expect(result).toHaveProperty('hasRemoteUpdate');
    });

    it('ローカル削除時はcurrentHashが未定義', async () => {
      // Arrange
      const localPath = path.join(testDir, 'deleted.md');

      const recordedMetadata: FileMetadata = {
        path: '.kiro/deleted.md',
        sha: 'sha',
        localHash: 'hash',
        size: 1024,
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          path: '.kiro/deleted.md',
          sha: 'sha',
          size: 1024,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result.currentHash).toBeUndefined();
    });

    it('リモート削除時はremoteShaが未定義', async () => {
      // Arrange
      const localPath = path.join(testDir, 'file.md');
      await fs.writeFile(localPath, 'content', 'utf-8');

      const recordedMetadata: FileMetadata = {
        path: '.kiro/file.md',
        sha: 'old-sha',
        localHash: 'hash',
        size: 1024,
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;
      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(notFoundError);

      // Act
      const result = await checkFileUpdate(
        mockOctokit,
        'owner',
        'repo',
        localPath,
        recordedMetadata
      );

      // Assert
      expect(result.remoteSha).toBeUndefined();
    });
  });
});
