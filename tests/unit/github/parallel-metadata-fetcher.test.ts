/**
 * Parallel Metadata Fetcher Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Octokit } from 'octokit';
import {
  fetchMultipleMetadata,
  MetadataFetchResult,
  ProgressCallback,
} from '../../../src/github/parallel-metadata-fetcher.js';
import { GitHubMetadataErrorType } from '../../../src/github/metadata-fetcher.js';

describe('ParallelMetadataFetcher - fetchMultipleMetadata', () => {
  let mockOctokit: Octokit;

  beforeEach(() => {
    // Create mock Octokit client
    mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn(),
        },
      },
    } as unknown as Octokit;
  });

  describe('正常系: 複数ファイルの並列取得', () => {
    it('複数ファイルのメタデータを並列取得できる', async () => {
      // Arrange
      const owner = 'test-owner';
      const repo = 'test-repo';
      const paths = [
        '.kiro/specs/feature1/requirements.md',
        '.kiro/specs/feature2/design.md',
        '.kiro/steering/tech.md',
      ];

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        return {
          data: {
            name: path.split('/').pop(),
            path,
            sha: `sha-${path}`,
            size: 1024,
            type: 'file',
          },
          status: 200,
          url: 'https://api.github.com',
          headers: {},
        } as any;
      });

      // Act
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.successful[0]).toEqual({
        path: '.kiro/specs/feature1/requirements.md',
        sha: 'sha-.kiro/specs/feature1/requirements.md',
        size: 1024,
      });
      expect(result.successful[1]).toEqual({
        path: '.kiro/specs/feature2/design.md',
        sha: 'sha-.kiro/specs/feature2/design.md',
        size: 1024,
      });
      expect(result.successful[2]).toEqual({
        path: '.kiro/steering/tech.md',
        sha: 'sha-.kiro/steering/tech.md',
        size: 1024,
      });
    });

    it('空の配列の場合は空の結果を返す', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths: string[] = [];

      // Act
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(mockOctokit.rest.repos.getContent).not.toHaveBeenCalled();
    });

    it('単一ファイルでも動作する', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = ['file.md'];

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          name: 'file.md',
          path: 'file.md',
          sha: 'sha123',
          size: 512,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('正常系: 部分的な失敗の許容', () => {
    it('一部失敗しても成功したファイルは返す', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = ['success1.md', 'failure.md', 'success2.md'];

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        if (path === 'failure.md') {
          const error = new Error('Not Found');
          (error as any).status = 404;
          throw error;
        }
        return {
          data: {
            name: path,
            path,
            sha: `sha-${path}`,
            size: 1024,
            type: 'file',
          },
          status: 200,
          url: 'https://api.github.com',
          headers: {},
        } as any;
      });

      // Act
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.successful[0].path).toBe('success1.md');
      expect(result.successful[1].path).toBe('success2.md');
      expect(result.failed[0]).toMatchObject({
        path: 'failure.md',
        errorType: GitHubMetadataErrorType.FILE_NOT_FOUND,
      });
    });

    it('すべて失敗した場合は空の成功配列を返す', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = ['fail1.md', 'fail2.md'];

      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;
      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(notFoundError);

      // Act
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
    });
  });

  describe('正常系: 並列度制御（セマフォ）', () => {
    it('最大5並列でリクエストを実行する', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = Array.from({ length: 10 }, (_, i) => `file${i}.md`);

      let concurrentCount = 0;
      let maxConcurrent = 0;

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);

        // Simulate async delay
        await new Promise((resolve) => setTimeout(resolve, 10));

        concurrentCount--;

        return {
          data: {
            name: path,
            path,
            sha: `sha-${path}`,
            size: 1024,
            type: 'file',
          },
          status: 200,
          url: 'https://api.github.com',
          headers: {},
        } as any;
      });

      // Act
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(result.successful).toHaveLength(10);
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });

    it('デフォルトの並列度は5である', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = Array.from({ length: 20 }, (_, i) => `file${i}.md`);

      let activeTasks = 0;
      let maxActiveTasks = 0;

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        activeTasks++;
        maxActiveTasks = Math.max(maxActiveTasks, activeTasks);

        await new Promise((resolve) => setTimeout(resolve, 5));

        activeTasks--;

        return {
          data: {
            name: path,
            path,
            sha: `sha-${path}`,
            size: 1024,
            type: 'file',
          },
          status: 200,
          url: 'https://api.github.com',
          headers: {},
        } as any;
      });

      // Act
      await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(maxActiveTasks).toBeLessThanOrEqual(5);
    });

    it('カスタム並列度を指定できる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = Array.from({ length: 10 }, (_, i) => `file${i}.md`);
      const maxConcurrency = 3;

      let activeTasks = 0;
      let maxActiveTasks = 0;

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        activeTasks++;
        maxActiveTasks = Math.max(maxActiveTasks, activeTasks);

        await new Promise((resolve) => setTimeout(resolve, 10));

        activeTasks--;

        return {
          data: {
            name: path,
            path,
            sha: `sha-${path}`,
            size: 1024,
            type: 'file',
          },
          status: 200,
          url: 'https://api.github.com',
          headers: {},
        } as any;
      });

      // Act
      await fetchMultipleMetadata(mockOctokit, owner, repo, paths, { maxConcurrency });

      // Assert
      expect(maxActiveTasks).toBeLessThanOrEqual(3);
    });
  });

  describe('正常系: 進捗コールバック', () => {
    it('進捗コールバックが呼ばれる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = ['file1.md', 'file2.md', 'file3.md'];

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        return {
          data: {
            name: path,
            path,
            sha: `sha-${path}`,
            size: 1024,
            type: 'file',
          },
          status: 200,
          url: 'https://api.github.com',
          headers: {},
        } as any;
      });

      const progressCalls: Array<{ completed: number; total: number; path: string }> = [];
      const onProgress: ProgressCallback = (completed, total, path) => {
        progressCalls.push({ completed, total, path });
      };

      // Act
      await fetchMultipleMetadata(mockOctokit, owner, repo, paths, { onProgress });

      // Assert
      expect(progressCalls).toHaveLength(3);
      expect(progressCalls[0]).toEqual({ completed: 1, total: 3, path: 'file1.md' });
      expect(progressCalls[1]).toEqual({ completed: 2, total: 3, path: 'file2.md' });
      expect(progressCalls[2]).toEqual({ completed: 3, total: 3, path: 'file3.md' });
    });

    it('失敗時も進捗コールバックが呼ばれる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = ['success.md', 'failure.md'];

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        if (path === 'failure.md') {
          const error = new Error('Not Found');
          (error as any).status = 404;
          throw error;
        }
        return {
          data: {
            name: path,
            path,
            sha: `sha-${path}`,
            size: 1024,
            type: 'file',
          },
          status: 200,
          url: 'https://api.github.com',
          headers: {},
        } as any;
      });

      const progressCalls: Array<{ completed: number; total: number; path: string }> = [];
      const onProgress: ProgressCallback = (completed, total, path) => {
        progressCalls.push({ completed, total, path });
      };

      // Act
      await fetchMultipleMetadata(mockOctokit, owner, repo, paths, { onProgress });

      // Assert
      expect(progressCalls).toHaveLength(2);
      expect(progressCalls[0].path).toBe('success.md');
      expect(progressCalls[1].path).toBe('failure.md');
    });

    it('進捗コールバックなしでも動作する', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = ['file1.md', 'file2.md'];

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        return {
          data: {
            name: path,
            path,
            sha: `sha-${path}`,
            size: 1024,
            type: 'file',
          },
          status: 200,
          url: 'https://api.github.com',
          headers: {},
        } as any;
      });

      // Act
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(result.successful).toHaveLength(2);
    });
  });

  describe('失敗情報の構造', () => {
    it('失敗情報にはパス、エラータイプ、メッセージが含まれる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = ['not-found.md'];

      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;
      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(notFoundError);

      // Act
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toHaveProperty('path');
      expect(result.failed[0]).toHaveProperty('errorType');
      expect(result.failed[0]).toHaveProperty('message');
      expect(result.failed[0].path).toBe('not-found.md');
      expect(result.failed[0].errorType).toBe(GitHubMetadataErrorType.FILE_NOT_FOUND);
    });

    it('異なるエラータイプを正しく分類する', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = ['not-found.md', 'rate-limit.md'];

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        if (path === 'not-found.md') {
          const error = new Error('Not Found');
          (error as any).status = 404;
          throw error;
        }
        if (path === 'rate-limit.md') {
          const error = new Error('Rate limit exceeded');
          (error as any).status = 403;
          throw error;
        }
        throw new Error('Unexpected error');
      });

      // Act
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].errorType).toBe(GitHubMetadataErrorType.FILE_NOT_FOUND);
      expect(result.failed[1].errorType).toBe(GitHubMetadataErrorType.RATE_LIMIT);
    });
  });

  describe('エッジケース', () => {
    it('大量のファイル（100個）を処理できる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = Array.from({ length: 100 }, (_, i) => `file${i}.md`);

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        return {
          data: {
            name: path,
            path,
            sha: `sha-${path}`,
            size: 1024,
            type: 'file',
          },
          status: 200,
          url: 'https://api.github.com',
          headers: {},
        } as any;
      });

      // Act
      const startTime = Date.now();
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);
      const duration = Date.now() - startTime;

      // Assert
      expect(result.successful).toHaveLength(100);
      expect(result.failed).toHaveLength(0);
      // Should complete reasonably fast (parallel execution)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('重複パスがある場合も正しく処理する', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const paths = ['file.md', 'file.md', 'other.md'];

      vi.mocked(mockOctokit.rest.repos.getContent).mockImplementation(async ({ path }) => {
        return {
          data: {
            name: path,
            path,
            sha: `sha-${path}`,
            size: 1024,
            type: 'file',
          },
          status: 200,
          url: 'https://api.github.com',
          headers: {},
        } as any;
      });

      // Act
      const result = await fetchMultipleMetadata(mockOctokit, owner, repo, paths);

      // Assert
      expect(result.successful).toHaveLength(3);
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(3);
    });
  });
});
