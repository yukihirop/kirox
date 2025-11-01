/**
 * Integration tests for parallel fetching and semaphore control
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Octokit } from 'octokit';
import { fetchFilesInParallel } from '@/github/parallel-fetcher.js';

vi.mock('octokit');

describe('Parallel Fetching Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Semaphore concurrency control', () => {
    it('should limit concurrent requests to maxConcurrency', async () => {
      let activeRequests = 0;
      let maxConcurrentRequests = 0;

      const mockGetContent = vi.fn().mockImplementation(async () => {
        activeRequests++;
        maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 10));

        activeRequests--;

        return {
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('test content', 'utf-8').toString('base64'),
            size: 100,
            path: 'test.md',
            sha: 'abc123',
          },
        };
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: mockGetContent,
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const client = new Octokit();
      const filePaths = Array.from({ length: 20 }, (_, i) => `file${i}.md`);

      await fetchFilesInParallel(client, 'owner', 'repo', filePaths, 5);

      // Verify max concurrent requests never exceeded 5
      expect(maxConcurrentRequests).toBeLessThanOrEqual(5);
      expect(mockGetContent).toHaveBeenCalledTimes(20);
    });

    it('should fetch all files even with failures', async () => {
      const mockGetContent = vi.fn()
        .mockResolvedValueOnce({
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('file1', 'utf-8').toString('base64'),
            size: 5,
            path: 'file1.md',
            sha: 'a',
          },
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('file3', 'utf-8').toString('base64'),
            size: 5,
            path: 'file3.md',
            sha: 'c',
          },
        });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: mockGetContent,
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const client = new Octokit();
      const result = await fetchFilesInParallel(
        client,
        'owner',
        'repo',
        ['file1.md', 'file2.md', 'file3.md'],
        3
      );

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]?.path).toBe('file2.md');
    });
  });

  describe('Progress tracking', () => {
    it('should track progress for multiple file fetches', async () => {
      const filesProcessed: string[] = [];

      const mockGetContent = vi.fn().mockImplementation(async ({ path }: { path: string }) => {
        filesProcessed.push(path);
        return {
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from(`content of ${path}`, 'utf-8').toString('base64'),
            size: 100,
            path,
            sha: 'abc',
          },
        };
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: mockGetContent,
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const client = new Octokit();
      const filePaths = ['file1.md', 'file2.md', 'file3.md'];

      await fetchFilesInParallel(client, 'owner', 'repo', filePaths, 2);

      // Verify all files were processed
      expect(filesProcessed).toHaveLength(3);
      expect(filesProcessed).toEqual(expect.arrayContaining(filePaths));
    });
  });

  describe('File size validation', () => {
    it('should reject files exceeding 1MB limit', async () => {
      const mockGetContent = vi.fn()
        .mockResolvedValueOnce({
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('small file', 'utf-8').toString('base64'),
            size: 1000,
            path: 'small.md',
            sha: 'a',
          },
        })
        .mockResolvedValueOnce({
          data: {
            type: 'file',
            encoding: 'base64',
            content: 'dummy',
            size: 2 * 1024 * 1024, // 2MB
            path: 'large.md',
            sha: 'b',
          },
        });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: mockGetContent,
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const client = new Octokit();
      const result = await fetchFilesInParallel(client, 'owner', 'repo', ['small.md', 'large.md'], 2);

      expect(result.success).toHaveLength(1);
      expect(result.success[0]?.path).toBe('small.md');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]?.path).toBe('large.md');
      expect(result.failed[0]?.error).toContain('1MB limit');
    });

    it('should reject when total file count exceeds 100', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn(),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const client = new Octokit();
      const filePaths = Array.from({ length: 101 }, (_, i) => `file${i}.md`);

      await expect(fetchFilesInParallel(client, 'owner', 'repo', filePaths, 5)).rejects.toThrow(
        '100 files limit'
      );
    });
  });
});
