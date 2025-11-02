/**
 * Performance tests for large-scale file operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Octokit } from 'octokit';
import { fetchFilesInParallel } from '@/github/parallel-fetcher.js';
import { execute } from '@/cli/entry.js';
import { promises as fs } from 'fs';
import path from 'path';

vi.mock('octokit');

describe.skip('Performance Tests', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'performance', 'perf-output');

  beforeEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
    await fs.mkdir(testOutputDir, { recursive: true });
    vi.clearAllMocks();
  });

  describe('Large file count performance', () => {
    it('should fetch 50 files within 30 seconds', async () => {
      // Generate 50 mock files
      const fileCount = 50;
      const files = Array.from({ length: fileCount }, (_, i) => ({
        name: `file${i}.md`,
        path: `.kiro/specs/perf-test/file${i}.md`,
        type: 'file' as const,
        sha: `sha${i}`,
        size: 1000,
      }));

      const mockGetContent = vi.fn();

      // Mock directory listing
      mockGetContent.mockResolvedValueOnce({
        data: files,
      });

      // Mock empty steering directory
      mockGetContent.mockResolvedValueOnce({
        data: [],
      });

      // Mock file contents
      for (let i = 0; i < fileCount; i++) {
        mockGetContent.mockResolvedValueOnce({
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from(`Content for file ${i}`, 'utf-8').toString('base64'),
            size: 1000,
            path: `.kiro/specs/perf-test/file${i}.md`,
            sha: `sha${i}`,
          },
        });
      }

      const mockOctokit = {
        rest: {
          repos: {
            getContent: mockGetContent,
          },
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 5000,
                  limit: 5000,
                  reset: Date.now() / 1000 + 3600,
                },
              },
            }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const startTime = Date.now();

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'perf-test',
        '-o',
        testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(fileCount);
      expect(duration).toBeLessThan(30000); // 30 seconds

      console.log(`Fetched ${fileCount} files in ${duration}ms`);
    }, 35000); // Test timeout: 35 seconds

    it('should handle rate limiting gracefully for 100+ file operations', async () => {
      const fileCount = 101; // Exceeds 100 file limit
      const filePaths = Array.from({ length: fileCount }, (_, i) => `.kiro/specs/test/file${i}.md`);

      let apiCallCount = 0;

      const mockGetContent = vi.fn().mockImplementation(async () => {
        apiCallCount++;

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 5));

        return {
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('test content', 'utf-8').toString('base64'),
            size: 100,
            path: `test-${apiCallCount}.md`,
            sha: `sha-${apiCallCount}`,
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

      // Should throw error for >100 files
      await expect(
        fetchFilesInParallel(client, 'owner', 'repo', filePaths, 5)
      ).rejects.toThrow();

      // Verify API wasn't called (validation before fetching)
      expect(apiCallCount).toBe(0);
    });
  });

  describe('Memory usage', () => {
    it('should maintain reasonable memory usage for 50 files', async () => {
      const fileCount = 50;
      const files = Array.from({ length: fileCount }, (_, i) => ({
        name: `mem-test-${i}.md`,
        path: `.kiro/specs/mem-test/file${i}.md`,
        type: 'file' as const,
        sha: `sha${i}`,
        size: 500 * 1024, // 500KB per file
      }));

      const mockGetContent = vi.fn();

      mockGetContent.mockResolvedValueOnce({ data: files });
      mockGetContent.mockResolvedValueOnce({ data: [] });

      // Generate 500KB content per file
      const largeContent = 'x'.repeat(500 * 1024);

      for (let i = 0; i < fileCount; i++) {
        mockGetContent.mockResolvedValueOnce({
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from(largeContent, 'utf-8').toString('base64'),
            size: 500 * 1024,
            path: `.kiro/specs/mem-test/file${i}.md`,
            sha: `sha${i}`,
          },
        });
      }

      const mockOctokit = {
        rest: {
          repos: {
            getContent: mockGetContent,
          },
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: { remaining: 5000, limit: 5000, reset: Date.now() / 1000 + 3600 },
              },
            }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const memBefore = process.memoryUsage();

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'mem-test',
        '-o',
        testOutputDir,
        '--force',
      ];

      await execute(argv);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memAfter = process.memoryUsage();
      const heapUsedDelta = memAfter.heapUsed - memBefore.heapUsed;
      const heapUsedMB = heapUsedDelta / 1024 / 1024;

      console.log(`Memory usage delta: ${heapUsedMB.toFixed(2)}MB`);

      // Memory usage should be reasonable (not accumulating)
      // With 50 files * 500KB = 25MB of content, heap should be < 100MB
      expect(heapUsedMB).toBeLessThan(100);
    }, 60000); // Test timeout: 60 seconds
  });

  describe('Parallel execution', () => {
    it('should execute parallel fetches without resource contention', async () => {
      const fileCount = 20;
      const concurrentRequests: number[] = [];
      let activeCount = 0;

      const mockGetContent = vi.fn().mockImplementation(async () => {
        activeCount++;
        concurrentRequests.push(activeCount);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 50));

        activeCount--;

        return {
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('test', 'utf-8').toString('base64'),
            size: 10,
            path: 'test.md',
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
      const filePaths = Array.from({ length: fileCount }, (_, i) => `file${i}.md`);

      const result = await fetchFilesInParallel(client, 'owner', 'repo', filePaths, 5);

      expect(result.success).toHaveLength(fileCount);
      expect(result.failed).toHaveLength(0);

      // Verify concurrency was limited to 5
      const maxConcurrent = Math.max(...concurrentRequests);
      expect(maxConcurrent).toBeLessThanOrEqual(5);

      console.log(`Max concurrent requests: ${maxConcurrent}`);
    });

    it('should complete parallel operations efficiently', async () => {
      const fileCount = 30;

      const mockGetContent = vi.fn().mockImplementation(async () => {
        // Simulate fast API response
        await new Promise((resolve) => setTimeout(resolve, 10));

        return {
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('fast content', 'utf-8').toString('base64'),
            size: 50,
            path: 'test.md',
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
      const filePaths = Array.from({ length: fileCount }, (_, i) => `file${i}.md`);

      const startTime = Date.now();

      await fetchFilesInParallel(client, 'owner', 'repo', filePaths, 5);

      const duration = Date.now() - startTime;

      // With 30 files at 10ms each and max 5 concurrent:
      // Sequential would take 300ms, parallel should take ~60ms (30/5 * 10)
      expect(duration).toBeLessThan(200); // Allow some overhead

      console.log(`Parallel fetch of ${fileCount} files took ${duration}ms`);
    });
  });

  describe('Throughput metrics', () => {
    it('should maintain high throughput for multiple sequential operations', async () => {
      const operationCount = 10;
      const filesPerOperation = 5;

      const mockGetContent = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));

        return {
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('content', 'utf-8').toString('base64'),
            size: 20,
            path: 'test.md',
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
      const startTime = Date.now();

      for (let i = 0; i < operationCount; i++) {
        const filePaths = Array.from({ length: filesPerOperation }, (_, j) => `file${i}-${j}.md`);
        await fetchFilesInParallel(client, 'owner', 'repo', filePaths, 5);
      }

      const duration = Date.now() - startTime;
      const totalFiles = operationCount * filesPerOperation;
      const throughput = totalFiles / (duration / 1000); // files per second

      console.log(`Throughput: ${throughput.toFixed(2)} files/sec`);

      expect(throughput).toBeGreaterThan(10); // At least 10 files/sec
    });
  });
});
