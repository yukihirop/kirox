/**
 * Performance tests for file fetching operations (Task 7.3)
 *
 * Tests performance requirements:
 * - 50 file fetch completes within 30 seconds (Requirement 6.7)
 * - 100 file fetch memory usage under 100MB (Requirement 6.7)
 * - Facade pattern overhead under 1ms (Requirement 6.7)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFilesInParallel } from '@/github/parallel-fetcher.js';
import { ProgressReporter } from '@/reporting/progress-reporter.js';
import { Octokit } from 'octokit';

vi.mock('octokit');

describe('File Fetching Performance Tests (Task 7.3)', () => {
  const createMockOctokit = () => {
    const mockGetContent = vi.fn().mockImplementation(async ({ path }: { path: string }) => {
      // Simulate network delay (10ms per file)
      await new Promise((resolve) => setTimeout(resolve, 10));

      return {
        data: {
          type: 'file',
          encoding: 'base64',
          content: Buffer.from(`content of ${path}`, 'utf-8').toString('base64'),
          size: 1024, // 1KB per file
          path,
          sha: `sha-${path}`,
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

    return { mockOctokit, mockGetContent };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 6.7: 50ファイル取得が30秒以内に完了する', () => {
    it('should fetch 50 files within 30 seconds', async () => {
      const { mockGetContent } = createMockOctokit();
      const client = new Octokit();
      const filePaths = Array.from({ length: 50 }, (_, i) => `file${i}.md`);

      const startTime = performance.now();

      const result = await fetchFilesInParallel(client, 'owner', 'repo', filePaths, 5);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toHaveLength(50);
      expect(mockGetContent).toHaveBeenCalledTimes(50);

      // Performance requirement: Must complete within 30000ms (30 seconds)
      expect(duration).toBeLessThan(30000);

      console.log(`50 files fetched in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Requirement 6.7: 100ファイル取得時のメモリ使用量が100MB以内', () => {
    it('should keep memory usage under 100MB for 100 files', async () => {
      const { mockGetContent } = createMockOctokit();
      const client = new Octokit();
      const filePaths = Array.from({ length: 100 }, (_, i) => `file${i}.md`);

      const initialMemory = process.memoryUsage().heapUsed;

      const result = await fetchFilesInParallel(client, 'owner', 'repo', filePaths, 5);

      // Force garbage collection if available
      if (global.gc) global.gc();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      expect(result.success).toHaveLength(100);
      expect(mockGetContent).toHaveBeenCalledTimes(100);

      // Performance requirement: Memory increase less than 100MB
      expect(memoryIncreaseMB).toBeLessThan(100);

      console.log(`Memory increase for 100 files: ${memoryIncreaseMB.toFixed(2)}MB`);
    });
  });

  describe('Requirement 6.7: ファサードパターンのオーバーヘッドが1ms以下', () => {
    it('should have minimal overhead for ProgressReporter facade', () => {
      const measurements: number[] = [];

      // Test ProgressReporter facade overhead
      for (let i = 0; i < 100; i++) {
        const reporter = new ProgressReporter({ useColor: false, verbose: false });

        const startTime = performance.now();
        reporter.reportProgress(i + 1, 100, `file${i}.md`);
        const endTime = performance.now();

        measurements.push(endTime - startTime);
      }

      const avgOverhead = measurements.reduce((a, b) => a + b) / measurements.length;

      // Performance requirement: Average overhead less than 1ms
      expect(avgOverhead).toBeLessThan(1);

      console.log(`ProgressReporter facade overhead - Avg: ${avgOverhead.toFixed(4)}ms`);
    });

    it('should have minimal overhead for multiple facade calls', () => {
      const reporter = new ProgressReporter({ useColor: false, verbose: false });
      const operations = 1000;

      const startTime = performance.now();

      for (let i = 0; i < operations; i++) {
        reporter.reportProgress(i + 1, operations, `file${i}.md`);
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgPerCall = totalDuration / operations;

      // Each call should be well under 1ms
      expect(avgPerCall).toBeLessThan(1);

      console.log(
        `${operations} facade calls completed in ${totalDuration.toFixed(2)}ms (avg: ${avgPerCall.toFixed(4)}ms per call)`
      );
    });
  });
});
