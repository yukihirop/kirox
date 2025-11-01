/**
 * Integration tests for multi-project error handling (task 9.4)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '@/cli/entry.js';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';

vi.mock('octokit');

describe('Multi-Project Error Handling Integration', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'integration', 'test-output-errors');

  beforeEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }

    // Clean up any files created in project root
    try {
      const projectRootKiro = path.join(process.cwd(), '.kiro');
      await fs.rm(path.join(projectRootKiro, '.kirox-meta.json'), { force: true });
    } catch {
      // Ignore cleanup errors
    }

    vi.clearAllMocks();
  });

  describe('Partial project failure handling', () => {
    it('should continue processing when some projects are not found', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First call: proj1 spec directory - fails (404)
              .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { status: 404 }))
              // Second call: proj2 spec directory - succeeds
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/proj2/file1.md',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              // Third call: proj2/file1.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 2').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj2/file1.md',
                  sha: 'abc123',
                },
              })
              // Fourth call: proj3 spec directory - succeeds
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file2.md',
                    path: '.kiro/specs/proj3/file2.md',
                    type: 'file',
                    sha: 'def456',
                    size: 100,
                  },
                ],
              })
              // Fifth call: proj3/file2.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 3').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj3/file2.md',
                  sha: 'def456',
                },
              }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'proj1,proj2,proj3',
        '-o',
        testOutputDir,
      ];

      const result = await execute(argv);

      // Should continue despite proj1 failure
      expect(result.filesDownloaded).toBe(2); // proj2 and proj3 files
      expect(result.success).toBe(false); // Overall failure due to proj1
      expect(result.exitCode).toBe(1);

      // Verify successful files exist
      const file1Exists = await fs
        .access(path.join(testOutputDir, '.kiro/specs/proj2/file1.md'))
        .then(() => true)
        .catch(() => false);
      const file2Exists = await fs
        .access(path.join(testOutputDir, '.kiro/specs/proj3/file2.md'))
        .then(() => true)
        .catch(() => false);

      expect(file1Exists).toBe(true);
      expect(file2Exists).toBe(true);
    });

    it('should record project-specific errors when GitHub API fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First call: proj1 spec directory - API error
              .mockRejectedValueOnce(
                Object.assign(new Error('API rate limit exceeded'), { status: 429 })
              )
              // Second call: proj2 spec directory - succeeds
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/proj2/file1.md',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              // Third call: proj2/file1.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj2/file1.md',
                  sha: 'abc123',
                },
              }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const argv = ['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2', '-o', testOutputDir];

      const result = await execute(argv);

      // Should continue despite proj1 API error
      expect(result.filesDownloaded).toBe(1); // proj2 files only
      expect(result.success).toBe(false); // Overall failure
      expect(result.exitCode).toBe(1);

      // Verify project-specific error was reported
      const errorCalls = consoleErrorSpy.mock.calls.flat();
      const hasProjectError = errorCalls.some(
        (arg) => String(arg).includes('[proj1]') && String(arg).includes('Error')
      );

      expect(hasProjectError).toBe(true);

      consoleErrorSpy.mockRestore();
    });

    it('should report partial failure summary with failed and successful projects', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First call: proj1 spec directory - fails
              .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { status: 404 }))
              // Second call: proj2 spec directory - succeeds
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/proj2/file1.md',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              // Third call: proj2/file1.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj2/file1.md',
                  sha: 'abc123',
                },
              })
              // Fourth call: proj3 spec directory - fails
              .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { status: 404 })),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'proj1,proj2,proj3',
        '-o',
        testOutputDir,
      ];

      await execute(argv);

      const logCalls = consoleLogSpy.mock.calls.flat();

      // Verify partial failure summary is displayed (English per language policy)
      const hasFailedProjectsHeader = logCalls.some((arg) =>
        String(arg).includes('Failed projects')
      );
      const hasSuccessfulProjectsHeader = logCalls.some((arg) =>
        String(arg).includes('Successful projects')
      );
      const hasProj1Failed = logCalls.some((arg) => String(arg).includes('proj1'));
      const hasProj2Success = logCalls.some((arg) => String(arg).includes('proj2'));
      const hasProj3Failed = logCalls.some((arg) => String(arg).includes('proj3'));

      expect(hasFailedProjectsHeader).toBe(true);
      expect(hasSuccessfulProjectsHeader).toBe(true);
      expect(hasProj1Failed).toBe(true);
      expect(hasProj2Success).toBe(true);
      expect(hasProj3Failed).toBe(true);

      consoleLogSpy.mockRestore();
    });
  });

  describe('All projects failure handling', () => {
    it('should fail gracefully when all projects are not found', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(
              Object.assign(new Error('Not Found'), { status: 404 })
            ),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'non-existent1,non-existent2,non-existent3',
        '-o',
        testOutputDir,
      ];

      const result = await execute(argv);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.filesDownloaded).toBe(0);

      // Verify all-projects-not-found error message (English per language policy)
      const errorCalls = consoleErrorSpy.mock.calls.flat();
      const hasAllProjectsNotFoundMessage = errorCalls.some((arg) =>
        String(arg).includes('None of the specified projects were found')
      );

      expect(hasAllProjectsNotFoundMessage).toBe(true);

      consoleErrorSpy.mockRestore();
    });

    it('should report individual project errors when all projects fail with different errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First call: proj1 - 404
              .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { status: 404 }))
              // Second call: proj2 - 403
              .mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }))
              // Third call: proj3 - 500
              .mockRejectedValueOnce(
                Object.assign(new Error('Internal Server Error'), { status: 500 })
              ),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'proj1,proj2,proj3',
        '-o',
        testOutputDir,
      ];

      const result = await execute(argv);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.filesDownloaded).toBe(0);

      // Verify each project error is reported
      const errorCalls = consoleErrorSpy.mock.calls.flat();
      const hasProj1Error = errorCalls.some(
        (arg) => String(arg).includes('[proj1]') && String(arg).includes('Error')
      );
      const hasProj2Error = errorCalls.some(
        (arg) => String(arg).includes('[proj2]') && String(arg).includes('Error')
      );
      const hasProj3Error = errorCalls.some(
        (arg) => String(arg).includes('[proj3]') && String(arg).includes('Error')
      );

      expect(hasProj1Error).toBe(true);
      expect(hasProj2Error).toBe(true);
      expect(hasProj3Error).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('File write error handling', () => {
    it('should record file write failures in project summary', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First call: proj1 spec directory - succeeds
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/proj1/file1.md',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              // Second call: proj1/file1.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj1/file1.md',
                  sha: 'abc123',
                },
              }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      // Create a read-only directory to cause write failure
      const readOnlyDir = path.join(testOutputDir, '.kiro/specs/proj1');
      await fs.mkdir(readOnlyDir, { recursive: true });
      await fs.chmod(readOnlyDir, 0o444); // Read-only

      const argv = ['node', 'kirox', 'owner/repo', '-p', 'proj1', '-o', testOutputDir, '--force'];

      const result = await execute(argv);

      // Should fail due to write error
      expect(result.filesFailed).toBeGreaterThan(0);

      // Restore permissions for cleanup
      await fs.chmod(readOnlyDir, 0o755);
    });
  });

  describe('GitHub API error continuation', () => {
    it('should continue processing other projects when one project has API error', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First call: proj1 spec directory - rate limit error
              .mockRejectedValueOnce(
                Object.assign(new Error('API rate limit exceeded'), { status: 429 })
              )
              // Second call: proj2 spec directory - succeeds
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/proj2/file1.md',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              // Third call: proj2/file1.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 2').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj2/file1.md',
                  sha: 'abc123',
                },
              })
              // Fourth call: proj3 spec directory - succeeds
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file2.md',
                    path: '.kiro/specs/proj3/file2.md',
                    type: 'file',
                    sha: 'def456',
                    size: 100,
                  },
                ],
              })
              // Fifth call: proj3/file2.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 3').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj3/file2.md',
                  sha: 'def456',
                },
              }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'proj1,proj2,proj3',
        '-o',
        testOutputDir,
      ];

      const result = await execute(argv);

      // Should continue despite proj1 API error
      expect(result.filesDownloaded).toBe(2); // proj2 and proj3 files
      expect(result.success).toBe(false); // Overall failure
      expect(result.exitCode).toBe(1);

      // Verify successful files exist
      const file1Exists = await fs
        .access(path.join(testOutputDir, '.kiro/specs/proj2/file1.md'))
        .then(() => true)
        .catch(() => false);
      const file2Exists = await fs
        .access(path.join(testOutputDir, '.kiro/specs/proj3/file2.md'))
        .then(() => true)
        .catch(() => false);

      expect(file1Exists).toBe(true);
      expect(file2Exists).toBe(true);
    });
  });
});
