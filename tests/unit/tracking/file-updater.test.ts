/**
 * File Updater Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import type { Octokit } from 'octokit';
import { updateFile } from '../../../src/tracking/file-updater.js';
import type { FileMetadata } from '../../../src/tracking/types.js';

describe('FileUpdater', () => {
  const testDir = path.join(process.cwd(), 'test-temp-file-updater');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('updateFile - 基本動作', () => {
    it('GitHub APIから最新のファイルコンテンツを取得して書き込む', async () => {
      const localPath = path.join(testDir, 'test.md');
      const fileMetadata: FileMetadata = {
        path: '.kiro/specs/test-project/test.md',
        sha: 'old-sha-123',
        size: 100,
        localHash: 'old-hash-123',
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      // Mock Octokit client
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'file',
                sha: 'new-sha-456',
                size: 200,
                content: Buffer.from('New content from GitHub').toString('base64'),
                encoding: 'base64',
              },
            }),
          },
        },
      } as unknown as Octokit;

      const result = await updateFile(mockClient, 'owner', 'repo', localPath, fileMetadata);

      expect(result.success).toBe(true);
      expect(result.oldSha).toBe('old-sha-123');
      expect(result.newSha).toBe('new-sha-456');
      expect(result.newHash).toBeDefined();
      expect(result.newSize).toBe(200);

      // Verify file was written
      const writtenContent = await fs.readFile(localPath, 'utf-8');
      expect(writtenContent).toBe('New content from GitHub');

      // Verify mock was called correctly
      expect(mockClient.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: '.kiro/specs/test-project/test.md',
      });
    });

    it('取得したコンテンツの新しいハッシュを計算する', async () => {
      const localPath = path.join(testDir, 'hash-test.md');
      const fileMetadata: FileMetadata = {
        path: '.kiro/specs/test/hash-test.md',
        sha: 'sha-old',
        size: 50,
        localHash: 'hash-old',
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const content = 'Test content for hash calculation';
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'file',
                sha: 'sha-new',
                size: content.length,
                content: Buffer.from(content).toString('base64'),
                encoding: 'base64',
              },
            }),
          },
        },
      } as unknown as Octokit;

      const result = await updateFile(mockClient, 'owner', 'repo', localPath, fileMetadata);

      expect(result.success).toBe(true);
      expect(result.newHash).toBeDefined();
      // SHA-256 hash format - 64 characters, all lowercase hex digits
      expect(result.newHash).toHaveLength(64);
      expect(result.newHash.split('').every((c) => /[a-f0-9]/.test(c))).toBe(true);
    });

    it('書き込み成功後にメタデータを更新する', async () => {
      const localPath = path.join(testDir, 'metadata-test.md');
      const fileMetadata: FileMetadata = {
        path: '.kiro/specs/test/metadata-test.md',
        sha: 'old-sha',
        size: 100,
        localHash: 'old-hash',
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'file',
                sha: 'new-sha',
                size: 150,
                content: Buffer.from('Updated content').toString('base64'),
                encoding: 'base64',
              },
            }),
          },
        },
      } as unknown as Octokit;

      const result = await updateFile(mockClient, 'owner', 'repo', localPath, fileMetadata);

      expect(result.success).toBe(true);
      expect(result.updatedMetadata).toBeDefined();
      expect(result.updatedMetadata?.sha).toBe('new-sha');
      expect(result.updatedMetadata?.size).toBe(150);
      expect(result.updatedMetadata?.localHash).toBe(result.newHash);
      expect(result.updatedMetadata?.fetchedAt).toBeDefined();

      // Verify fetchedAt is recent (within last 10 seconds)
      const fetchedAt = new Date(result.updatedMetadata!.fetchedAt!);
      const now = new Date();
      const diffMs = now.getTime() - fetchedAt.getTime();
      expect(diffMs).toBeLessThan(10000); // Less than 10 seconds
    });
  });

  describe('updateFile - ディレクトリ作成', () => {
    it('存在しないディレクトリを自動作成する', async () => {
      const nestedPath = path.join(testDir, 'deep', 'nested', 'dir', 'file.md');
      const fileMetadata: FileMetadata = {
        path: '.kiro/specs/test/file.md',
        sha: 'sha-123',
        size: 50,
        localHash: 'hash-123',
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'file',
                sha: 'new-sha',
                size: 100,
                content: Buffer.from('Content in nested dir').toString('base64'),
                encoding: 'base64',
              },
            }),
          },
        },
      } as unknown as Octokit;

      const result = await updateFile(mockClient, 'owner', 'repo', nestedPath, fileMetadata);

      expect(result.success).toBe(true);

      // Verify directory was created
      const dirExists = await fs
        .access(path.dirname(nestedPath))
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);

      // Verify file was written
      const fileContent = await fs.readFile(nestedPath, 'utf-8');
      expect(fileContent).toBe('Content in nested dir');
    });
  });

  describe('updateFile - エラーハンドリング', () => {
    it('GitHub APIエラー時にエラー情報を返す', async () => {
      const localPath = path.join(testDir, 'error-test.md');
      const fileMetadata: FileMetadata = {
        path: '.kiro/specs/test/error-test.md',
        sha: 'sha-123',
        size: 50,
        localHash: 'hash-123',
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(new Error('Network error')),
          },
        },
      } as unknown as Octokit;

      const result = await updateFile(mockClient, 'owner', 'repo', localPath, fileMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Network error');
      expect(result.oldSha).toBe('sha-123');
      expect(result.newSha).toBeUndefined();
      expect(result.updatedMetadata).toBeUndefined();
    });

    it('ファイル書き込みエラー時にエラー情報を返す', async () => {
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true });

      // Create a read-only directory (permissions 0o444)
      await fs.chmod(readOnlyDir, 0o444);

      const localPath = path.join(readOnlyDir, 'file.md');
      const fileMetadata: FileMetadata = {
        path: '.kiro/specs/test/file.md',
        sha: 'sha-123',
        size: 50,
        localHash: 'hash-123',
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'file',
                sha: 'new-sha',
                size: 100,
                content: Buffer.from('Content').toString('base64'),
                encoding: 'base64',
              },
            }),
          },
        },
      } as unknown as Octokit;

      const result = await updateFile(mockClient, 'owner', 'repo', localPath, fileMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.updatedMetadata).toBeUndefined();

      // Restore permissions for cleanup
      await fs.chmod(readOnlyDir, 0o755);
    });

    it('無効なレスポンス形式の場合にエラーを返す', async () => {
      const localPath = path.join(testDir, 'invalid-response.md');
      const fileMetadata: FileMetadata = {
        path: '.kiro/specs/test/invalid.md',
        sha: 'sha-123',
        size: 50,
        localHash: 'hash-123',
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'dir', // Directory instead of file
              },
            }),
          },
        },
      } as unknown as Octokit;

      const result = await updateFile(mockClient, 'owner', 'repo', localPath, fileMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('directory');
    });

    it('エラー発生時に元のメタデータを保持する', async () => {
      const localPath = path.join(testDir, 'preserve-metadata.md');
      const fileMetadata: FileMetadata = {
        path: '.kiro/specs/test/preserve.md',
        sha: 'original-sha',
        size: 123,
        localHash: 'original-hash',
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(new Error('API Error')),
          },
        },
      } as unknown as Octokit;

      const result = await updateFile(mockClient, 'owner', 'repo', localPath, fileMetadata);

      expect(result.success).toBe(false);
      expect(result.oldSha).toBe('original-sha');
      expect(result.updatedMetadata).toBeUndefined();

      // Original metadata should not be modified
      expect(fileMetadata.sha).toBe('original-sha');
      expect(fileMetadata.localHash).toBe('original-hash');
      expect(fileMetadata.fetchedAt).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('UpdateResult構造', () => {
    it('成功時に正しい構造を持つ', async () => {
      const localPath = path.join(testDir, 'structure-test.md');
      const fileMetadata: FileMetadata = {
        path: '.kiro/specs/test/structure.md',
        sha: 'old-sha',
        size: 50,
        localHash: 'old-hash',
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'file',
                sha: 'new-sha',
                size: 100,
                content: Buffer.from('Content').toString('base64'),
                encoding: 'base64',
              },
            }),
          },
        },
      } as unknown as Octokit;

      const result = await updateFile(mockClient, 'owner', 'repo', localPath, fileMetadata);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('oldSha');
      expect(result).toHaveProperty('newSha');
      expect(result).toHaveProperty('newHash');
      expect(result).toHaveProperty('newSize');
      expect(result).toHaveProperty('updatedMetadata');
      expect(result.success).toBe(true);
    });

    it('失敗時に正しい構造を持つ', async () => {
      const localPath = path.join(testDir, 'failure-structure.md');
      const fileMetadata: FileMetadata = {
        path: '.kiro/specs/test/failure.md',
        sha: 'sha-123',
        size: 50,
        localHash: 'hash-123',
        fetchedAt: '2025-01-01T00:00:00Z',
      };

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(new Error('Test error')),
          },
        },
      } as unknown as Octokit;

      const result = await updateFile(mockClient, 'owner', 'repo', localPath, fileMetadata);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('oldSha');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
      expect(result.newSha).toBeUndefined();
      expect(result.updatedMetadata).toBeUndefined();
    });
  });
});
