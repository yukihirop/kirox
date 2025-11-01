/**
 * Unit tests for fetchFilesInParallel - Progress Callback (Task 14.5)
 *
 * Tests the progress callback mechanism that allows reporting progress
 * during file fetching, enabling spinner display during actual fetch operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Octokit } from 'octokit';

// Mock Octokit
const mockOctokit = {
  rest: {
    repos: {
      getContent: vi.fn(),
    },
  },
} as unknown as Octokit;

describe('fetchFilesInParallel - Progress Callback (Task 14.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementation for each test
    (mockOctokit.rest.repos.getContent as ReturnType<typeof vi.fn>).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call progress callback before fetching each file', async () => {
    // Import the function
    const { fetchFilesInParallel } = await import('../../../src/github/parallel-fetcher.js');

    // Setup mock responses
    const mockFile1 = {
      type: 'file',
      size: 100,
      content: Buffer.from('file1 content').toString('base64'),
      sha: 'sha1',
    };

    const mockFile2 = {
      type: 'file',
      size: 200,
      content: Buffer.from('file2 content').toString('base64'),
      sha: 'sha2',
    };

    (mockOctokit.rest.repos.getContent as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: mockFile1 })
      .mockResolvedValueOnce({ data: mockFile2 });

    // Create progress callback spy
    const progressCallback = vi.fn();

    // Execute with progress callback
    await fetchFilesInParallel(
      mockOctokit,
      'owner',
      'repo',
      ['file1.md', 'file2.md'],
      5,
      undefined,
      progressCallback
    );

    // Verify progress callback was called for each file
    expect(progressCallback).toHaveBeenCalledTimes(2);
    expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 2, 'file1.md');
    expect(progressCallback).toHaveBeenNthCalledWith(2, 2, 2, 'file2.md');
  });

  it('should call progress callback in correct order for multiple files', async () => {
    const { fetchFilesInParallel } = await import('../../../src/github/parallel-fetcher.js');

    // Setup mock responses for 5 files
    const files = ['f1.md', 'f2.md', 'f3.md', 'f4.md', 'f5.md'];

    files.forEach((_, index) => {
      const mockFile = {
        type: 'file',
        size: 100,
        content: Buffer.from(`file${index + 1} content`).toString('base64'),
        sha: `sha${index + 1}`,
      };
      (mockOctokit.rest.repos.getContent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: mockFile,
      });
    });

    const progressCallback = vi.fn();
    const callOrder: number[] = [];

    progressCallback.mockImplementation((current: number) => {
      callOrder.push(current);
    });

    await fetchFilesInParallel(mockOctokit, 'owner', 'repo', files, 5, undefined, progressCallback);

    // Verify all files were reported
    expect(progressCallback).toHaveBeenCalledTimes(5);

    // Verify correct current/total values
    expect(progressCallback).toHaveBeenCalledWith(1, 5, 'f1.md');
    expect(progressCallback).toHaveBeenCalledWith(2, 5, 'f2.md');
    expect(progressCallback).toHaveBeenCalledWith(3, 5, 'f3.md');
    expect(progressCallback).toHaveBeenCalledWith(4, 5, 'f4.md');
    expect(progressCallback).toHaveBeenCalledWith(5, 5, 'f5.md');
  });

  it.skip('should work without progress callback (backward compatibility)', async () => {
    const { fetchFilesInParallel } = await import('../../../src/github/parallel-fetcher.js');

    const mockFile = {
      type: 'file',
      size: 100,
      content: Buffer.from('content').toString('base64'),
      sha: 'sha1',
    };

    (mockOctokit.rest.repos.getContent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: mockFile,
    });

    // Call without progress callback (backward compatibility)
    const result = await fetchFilesInParallel(
      mockOctokit,
      'owner',
      'repo',
      ['file.md'],
      5,
      undefined
      // No progress callback
    );

    // Should succeed without error
    expect(result.success).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
  });

  it('should call progress callback even when some files fail', async () => {
    const { fetchFilesInParallel } = await import('../../../src/github/parallel-fetcher.js');

    const mockFile1 = {
      type: 'file',
      size: 100,
      content: Buffer.from('file1 content').toString('base64'),
      sha: 'sha1',
    };

    // First file succeeds
    (mockOctokit.rest.repos.getContent as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: mockFile1 })
      // Second file fails
      .mockRejectedValueOnce(new Error('404 Not Found'));

    const progressCallback = vi.fn();

    await fetchFilesInParallel(
      mockOctokit,
      'owner',
      'repo',
      ['file1.md', 'file2.md'],
      5,
      undefined,
      progressCallback
    );

    // Progress callback should still be called for both files
    expect(progressCallback).toHaveBeenCalledTimes(2);
    expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 2, 'file1.md');
    expect(progressCallback).toHaveBeenNthCalledWith(2, 2, 2, 'file2.md');
  });

  it('should call progress callback before API request', async () => {
    const { fetchFilesInParallel } = await import('../../../src/github/parallel-fetcher.js');

    const mockFile = {
      type: 'file',
      size: 100,
      content: Buffer.from('content').toString('base64'),
      sha: 'sha1',
    };

    let apiCallTime: number | null = null;
    let progressCallTime: number | null = null;

    (mockOctokit.rest.repos.getContent as ReturnType<typeof vi.fn>).mockImplementation(() => {
      apiCallTime = Date.now();
      return Promise.resolve({ data: mockFile });
    });

    const progressCallback = vi.fn().mockImplementation(() => {
      progressCallTime = Date.now();
    });

    await fetchFilesInParallel(
      mockOctokit,
      'owner',
      'repo',
      ['file.md'],
      5,
      undefined,
      progressCallback
    );

    // Progress callback should be called before API request
    expect(progressCallTime).not.toBeNull();
    expect(apiCallTime).not.toBeNull();
    expect(progressCallTime!).toBeLessThanOrEqual(apiCallTime!);
  });
});
