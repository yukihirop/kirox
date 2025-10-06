/**
 * Unit tests for parallel file fetching functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Octokit } from 'octokit';

// Placeholder imports - will be implemented in GREEN phase
// These imports will fail initially (RED phase)
import {
  fetchFileContents,
  fetchFilesInParallel,
  validateFileSize,
  validateTotalFileCount,
  decodeBase64Content,
} from '@/github/parallel-fetcher';

describe('ParallelFileFetcher', () => {
  describe('decodeBase64Content', () => {
    it('should decode base64 encoded content to UTF-8 string', () => {
      const base64 = Buffer.from('Hello, World!', 'utf-8').toString('base64');
      const decoded = decodeBase64Content(base64);

      expect(decoded).toBe('Hello, World!');
    });

    it('should decode multi-line content correctly', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const base64 = Buffer.from(content, 'utf-8').toString('base64');
      const decoded = decodeBase64Content(base64);

      expect(decoded).toBe(content);
    });

    it('should handle Japanese text (UTF-8)', () => {
      const content = 'こんにちは、世界！';
      const base64 = Buffer.from(content, 'utf-8').toString('base64');
      const decoded = decodeBase64Content(base64);

      expect(decoded).toBe(content);
    });

    it('should throw error for invalid base64 string', () => {
      expect(() => decodeBase64Content('!!invalid-base64!!')).toThrow();
    });
  });

  describe('validateFileSize', () => {
    it('should return true for files under 1MB', () => {
      const size = 500 * 1024; // 500KB
      expect(validateFileSize(size)).toBe(true);
    });

    it('should return true for file exactly 1MB', () => {
      const size = 1024 * 1024; // 1MB
      expect(validateFileSize(size)).toBe(true);
    });

    it('should return false for files over 1MB', () => {
      const size = 1024 * 1024 + 1; // 1MB + 1 byte
      expect(validateFileSize(size)).toBe(false);
    });

    it('should return false for very large files', () => {
      const size = 10 * 1024 * 1024; // 10MB
      expect(validateFileSize(size)).toBe(false);
    });
  });

  describe('validateTotalFileCount', () => {
    it('should return true for file count under 100', () => {
      expect(validateTotalFileCount(50)).toBe(true);
    });

    it('should return true for exactly 100 files', () => {
      expect(validateTotalFileCount(100)).toBe(true);
    });

    it('should return false for over 100 files', () => {
      expect(validateTotalFileCount(101)).toBe(false);
    });

    it('should return false for very large file counts', () => {
      expect(validateTotalFileCount(1000)).toBe(false);
    });
  });

  describe('fetchFileContents', () => {
    it('should fetch single file content from GitHub API', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'file',
                name: 'test.md',
                path: 'test.md',
                content: Buffer.from('Test content', 'utf-8').toString('base64'),
                encoding: 'base64',
                size: 12,
                sha: 'abc123',
              },
            }),
          },
        },
      } as unknown as Octokit;

      const result = await fetchFileContents(
        mockClient,
        'owner',
        'repo',
        'test.md'
      );

      expect(result.path).toBe('test.md');
      expect(result.content).toBe('Test content');
      expect(result.size).toBe(12);
    });

    it('should throw error if file size exceeds 1MB', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'file',
                name: 'large.md',
                path: 'large.md',
                content: 'base64content',
                encoding: 'base64',
                size: 1024 * 1024 + 1, // 1MB + 1 byte
                sha: 'abc123',
              },
            }),
          },
        },
      } as unknown as Octokit;

      await expect(
        fetchFileContents(mockClient, 'owner', 'repo', 'large.md')
      ).rejects.toThrow('File size exceeds 1MB limit');
    });

    it('should throw error if content is not base64 encoded', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                type: 'file',
                name: 'test.md',
                path: 'test.md',
                content: 'plain text',
                encoding: 'utf-8', // Wrong encoding
                size: 10,
                sha: 'abc123',
              },
            }),
          },
        },
      } as unknown as Octokit;

      await expect(
        fetchFileContents(mockClient, 'owner', 'repo', 'test.md')
      ).rejects.toThrow();
    });
  });

  describe('fetchFilesInParallel', () => {
    it('should fetch multiple files with max 5 concurrent requests', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockImplementation((params) => {
              return Promise.resolve({
                data: {
                  type: 'file',
                  name: params.path,
                  path: params.path,
                  content: Buffer.from(`Content of ${params.path}`, 'utf-8').toString('base64'),
                  encoding: 'base64',
                  size: 20,
                  sha: 'abc123',
                },
              });
            }),
          },
        },
      } as unknown as Octokit;

      const filePaths = Array.from({ length: 10 }, (_, i) => `file${i}.md`);

      const results = await fetchFilesInParallel(
        mockClient,
        'owner',
        'repo',
        filePaths,
        5 // max concurrency
      );

      expect(results.success).toHaveLength(10);
      expect(results.failed).toHaveLength(0);
      expect(mockClient.rest.repos.getContent).toHaveBeenCalledTimes(10);
    });

    it('should handle partial failures gracefully (Promise.allSettled)', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockImplementation((params) => {
              if (params.path === 'error.md') {
                return Promise.reject(new Error('Network error'));
              }
              return Promise.resolve({
                data: {
                  type: 'file',
                  name: params.path,
                  path: params.path,
                  content: Buffer.from(`Content of ${params.path}`, 'utf-8').toString('base64'),
                  encoding: 'base64',
                  size: 20,
                  sha: 'abc123',
                },
              });
            }),
          },
        },
      } as unknown as Octokit;

      const filePaths = ['file1.md', 'error.md', 'file2.md'];

      const results = await fetchFilesInParallel(
        mockClient,
        'owner',
        'repo',
        filePaths,
        5
      );

      expect(results.success).toHaveLength(2);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].path).toBe('error.md');
    });

    it('should throw error if total file count exceeds 100', async () => {
      const mockClient = {} as Octokit;
      const filePaths = Array.from({ length: 101 }, (_, i) => `file${i}.md`);

      await expect(
        fetchFilesInParallel(mockClient, 'owner', 'repo', filePaths, 5)
      ).rejects.toThrow('Total file count exceeds 100 files limit');
    });

    it('should respect max concurrency limit (semaphore)', async () => {
      let currentConcurrent = 0;
      let maxConcurrentObserved = 0;

      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockImplementation(async (params) => {
              currentConcurrent++;
              maxConcurrentObserved = Math.max(maxConcurrentObserved, currentConcurrent);

              // Simulate async delay
              await new Promise((resolve) => setTimeout(resolve, 10));

              currentConcurrent--;

              return {
                data: {
                  type: 'file',
                  name: params.path,
                  path: params.path,
                  content: Buffer.from(`Content of ${params.path}`, 'utf-8').toString('base64'),
                  encoding: 'base64',
                  size: 20,
                  sha: 'abc123',
                },
              };
            }),
          },
        },
      } as unknown as Octokit;

      const filePaths = Array.from({ length: 20 }, (_, i) => `file${i}.md`);

      await fetchFilesInParallel(mockClient, 'owner', 'repo', filePaths, 3);

      // Max concurrent should not exceed 3
      expect(maxConcurrentObserved).toBeLessThanOrEqual(3);
    });

    it('should skip files exceeding size limit with warning', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockImplementation((params) => {
              if (params.path === 'large.md') {
                return Promise.resolve({
                  data: {
                    type: 'file',
                    name: params.path,
                    path: params.path,
                    content: 'base64',
                    encoding: 'base64',
                    size: 1024 * 1024 + 1, // Over 1MB
                    sha: 'abc123',
                  },
                });
              }
              return Promise.resolve({
                data: {
                  type: 'file',
                  name: params.path,
                  path: params.path,
                  content: Buffer.from(`Content of ${params.path}`, 'utf-8').toString('base64'),
                  encoding: 'base64',
                  size: 20,
                  sha: 'abc123',
                },
              });
            }),
          },
        },
      } as unknown as Octokit;

      const filePaths = ['file1.md', 'large.md', 'file2.md'];

      const results = await fetchFilesInParallel(
        mockClient,
        'owner',
        'repo',
        filePaths,
        5
      );

      expect(results.success).toHaveLength(2);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].path).toBe('large.md');
      expect(results.failed[0].error).toContain('size');
    });
  });
});
