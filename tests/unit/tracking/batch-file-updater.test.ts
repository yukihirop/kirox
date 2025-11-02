/**
 * Batch File Updater Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import type { Octokit } from 'octokit';
import { applyUpdates } from '../../../src/tracking/batch-file-updater.js';
import type { UpdateCheckResult } from '../../../src/tracking/update-checker.js';
import { UpdateStatus } from '../../../src/tracking/update-checker.js';

describe('BatchFileUpdater', () => {
  const testDir = path.join(process.cwd(), 'test-temp-batch-updater');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('applyUpdates - 基本動作', () => {
    it('すべての更新可能ファイルに対して更新処理を実行する', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'file1.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-1',
          remoteSha: 'new-sha-1',
          recordedHash: 'hash1',
          currentHash: 'hash1',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          path: 'file2.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-2',
          remoteSha: 'new-sha-2',
          recordedHash: 'hash2',
          currentHash: 'hash2',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
      ];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn((params) => {
              const path = params.path as string;
              if (path.endsWith('file1.md')) {
                return Promise.resolve({
                  data: {
                    type: 'file',
                    sha: 'new-sha-1',
                    size: 100,
                    content: Buffer.from('Updated content 1').toString('base64'),
                    encoding: 'base64',
                  },
                });
              } else if (path.endsWith('file2.md')) {
                return Promise.resolve({
                  data: {
                    type: 'file',
                    sha: 'new-sha-2',
                    size: 150,
                    content: Buffer.from('Updated content 2').toString('base64'),
                    encoding: 'base64',
                  },
                });
              }
              return Promise.reject(new Error('Unknown file'));
            }),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.totalFiles).toBe(2);
      expect(summary.updated).toBe(2);
      expect(summary.skipped).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.updatedFiles).toHaveLength(2);
    });

    it('更新成功ファイルの詳細情報を記録する', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'success-test.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha',
          remoteSha: 'new-sha',
          recordedHash: 'old-hash',
          currentHash: 'old-hash',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
      ];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'file',
                sha: 'new-sha-xyz',
                size: 200,
                content: Buffer.from('New content').toString('base64'),
                encoding: 'base64',
              },
            }),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.updatedFiles).toHaveLength(1);
      const updated = summary.updatedFiles[0];
      expect(updated?.path).toBe('success-test.md');
      expect(updated?.oldSha).toBe('old-sha');
      expect(updated?.newSha).toBe('new-sha-xyz');
      expect(updated?.newSize).toBe(200);
      expect(updated?.newHash).toBeDefined();
      // SHA-256 format - 64 characters, all lowercase hex digits
      expect(updated?.newHash).toHaveLength(64);
      expect(updated?.newHash.split('').every((c) => /[a-f0-9]/.test(c))).toBe(true);
    });
  });

  describe('applyUpdates - スキップ処理', () => {
    it('UP_TO_DATEファイルをスキップする', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'up-to-date.md',
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha-123',
          remoteSha: 'sha-123',
          recordedHash: 'hash-123',
          currentHash: 'hash-123',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
      ];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn(),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.totalFiles).toBe(1);
      expect(summary.updated).toBe(0);
      expect(summary.skipped).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.skippedFiles).toHaveLength(1);
      expect(summary?.skippedFiles?.[0]?.path).toBe('up-to-date.md');
      expect(summary?.skippedFiles?.[0]?.reason).toBe('up-to-date');

      // API should not be called for skipped files
      expect(mockClient.rest.repos.getContent).not.toHaveBeenCalled();
    });

    it('LOCAL_EDITEDファイルをスキップする', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'local-edited.md',
          status: UpdateStatus.LOCAL_EDITED,
          recordedSha: 'sha-123',
          remoteSha: 'sha-123',
          recordedHash: 'hash-old',
          currentHash: 'hash-new',
          hasLocalEdit: true,
          hasRemoteUpdate: false,
        },
      ];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn(),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.skipped).toBe(1);
      expect(summary?.skippedFiles?.[0]?.reason).toBe('local-edit');
      expect(mockClient.rest.repos.getContent).not.toHaveBeenCalled();
    });

    it('CONFLICTファイルをスキップする', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'conflict.md',
          status: UpdateStatus.CONFLICT,
          recordedSha: 'old-sha',
          remoteSha: 'new-sha',
          recordedHash: 'hash-old',
          currentHash: 'hash-modified',
          hasLocalEdit: true,
          hasRemoteUpdate: true,
        },
      ];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn(),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.skipped).toBe(1);
      expect(summary?.skippedFiles?.[0]?.reason).toBe('conflict');
    });

    it('スキップ理由を正しく記録する', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'up-to-date.md',
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha1',
          remoteSha: 'sha1',
          recordedHash: 'hash1',
          currentHash: 'hash1',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
        {
          path: 'local-edited.md',
          status: UpdateStatus.LOCAL_EDITED,
          recordedSha: 'sha2',
          remoteSha: 'sha2',
          recordedHash: 'hash2',
          currentHash: 'hash2-modified',
          hasLocalEdit: true,
          hasRemoteUpdate: false,
        },
        {
          path: 'conflict.md',
          status: UpdateStatus.CONFLICT,
          recordedSha: 'sha3-old',
          remoteSha: 'sha3-new',
          recordedHash: 'hash3',
          currentHash: 'hash3-modified',
          hasLocalEdit: true,
          hasRemoteUpdate: true,
        },
      ];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn(),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.skipped).toBe(3);
      expect(summary.skippedFiles).toHaveLength(3);

      const reasons = summary.skippedFiles.map((f) => f.reason);
      expect(reasons).toContain('up-to-date');
      expect(reasons).toContain('local-edit');
      expect(reasons).toContain('conflict');
    });
  });

  describe('applyUpdates - エラーハンドリング', () => {
    it('更新失敗ファイルをfailedFilesに記録する', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'will-fail.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha',
          remoteSha: 'new-sha',
          recordedHash: 'hash-old',
          currentHash: 'hash-old',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
      ];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(new Error('Network error')),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.totalFiles).toBe(1);
      expect(summary.updated).toBe(0);
      expect(summary.skipped).toBe(0);
      expect(summary.failed).toBe(1);
      expect(summary.failedFiles).toHaveLength(1);
      expect(summary?.failedFiles?.[0]?.path).toBe('will-fail.md');
      expect(summary?.failedFiles?.[0]?.error).toContain('Network error');
    });

    it('一部失敗しても他のファイルは更新を継続する', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'success.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-1',
          remoteSha: 'new-sha-1',
          recordedHash: 'hash1',
          currentHash: 'hash1',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          path: 'failure.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-2',
          remoteSha: 'new-sha-2',
          recordedHash: 'hash2',
          currentHash: 'hash2',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          path: 'success2.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-3',
          remoteSha: 'new-sha-3',
          recordedHash: 'hash3',
          currentHash: 'hash3',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
      ];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn((params) => {
              const path = params.path as string;
              if (path.includes('failure.md')) {
                return Promise.reject(new Error('API Error'));
              }
              return Promise.resolve({
                data: {
                  type: 'file',
                  sha: 'new-sha',
                  size: 100,
                  content: Buffer.from('Content').toString('base64'),
                  encoding: 'base64',
                },
              });
            }),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.totalFiles).toBe(3);
      expect(summary.updated).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.updatedFiles).toHaveLength(2);
      expect(summary.failedFiles).toHaveLength(1);
    });
  });

  describe('applyUpdates - サマリー集計', () => {
    it('更新成功数、スキップ数、失敗数を正しく集計する', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'updated1.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-1',
          remoteSha: 'new-sha-1',
          recordedHash: 'hash1',
          currentHash: 'hash1',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          path: 'updated2.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-2',
          remoteSha: 'new-sha-2',
          recordedHash: 'hash2',
          currentHash: 'hash2',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          path: 'skipped.md',
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha3',
          remoteSha: 'sha3',
          recordedHash: 'hash3',
          currentHash: 'hash3',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
        {
          path: 'failed.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-4',
          remoteSha: 'new-sha-4',
          recordedHash: 'hash4',
          currentHash: 'hash4',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
      ];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn((params) => {
              const path = params.path as string;
              if (path.includes('failed.md')) {
                return Promise.reject(new Error('Network error'));
              }
              return Promise.resolve({
                data: {
                  type: 'file',
                  sha: 'new-sha',
                  size: 100,
                  content: Buffer.from('Content').toString('base64'),
                  encoding: 'base64',
                },
              });
            }),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.totalFiles).toBe(4);
      expect(summary.updated).toBe(2);
      expect(summary.skipped).toBe(1);
      expect(summary.failed).toBe(1);
    });
  });

  describe('applyUpdates - エッジケース', () => {
    it('空の配列を処理する', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn(),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.totalFiles).toBe(0);
      expect(summary.updated).toBe(0);
      expect(summary.skipped).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.updatedFiles).toHaveLength(0);
      expect(summary.skippedFiles).toHaveLength(0);
      expect(summary.failedFiles).toHaveLength(0);
    });

    it('すべてスキップの場合', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'skip1.md',
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha1',
          remoteSha: 'sha1',
          recordedHash: 'hash1',
          currentHash: 'hash1',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
        {
          path: 'skip2.md',
          status: UpdateStatus.LOCAL_EDITED,
          recordedSha: 'sha2',
          remoteSha: 'sha2',
          recordedHash: 'hash2',
          currentHash: 'hash2-modified',
          hasLocalEdit: true,
          hasRemoteUpdate: false,
        },
      ];

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn(),
          },
        },
      } as unknown as Octokit;

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary.updated).toBe(0);
      expect(summary.skipped).toBe(2);
      expect(summary.failed).toBe(0);
      expect(mockClient.rest.repos.getContent).not.toHaveBeenCalled();
    });
  });

  describe('ApplySummary構造', () => {
    it('正しい構造を持つ', async () => {
      const results: Array<UpdateCheckResult & { path: string }> = [
        {
          path: 'test.md',
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha',
          remoteSha: 'new-sha',
          recordedHash: 'hash',
          currentHash: 'hash',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
      ];

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

      const summary = await applyUpdates(mockClient, 'owner', 'repo', testDir, results);

      expect(summary).toHaveProperty('totalFiles');
      expect(summary).toHaveProperty('updated');
      expect(summary).toHaveProperty('skipped');
      expect(summary).toHaveProperty('failed');
      expect(summary).toHaveProperty('updatedFiles');
      expect(summary).toHaveProperty('skippedFiles');
      expect(summary).toHaveProperty('failedFiles');
    });
  });
});
