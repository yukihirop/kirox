/**
 * E2E tests for error scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '@/cli/entry';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';

vi.mock('octokit');

describe('E2E Error Scenarios', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-errors');

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

  describe('Repository not found', () => {
    it('should fail with clear error message when repository does not exist', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(
              Object.assign(new Error('Not Found'), { status: 404 })
            ),
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

      const argv = [
        'node',
        'kirox',
        'nonexistent/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
      ];

      const result = await execute(argv);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.filesDownloaded).toBe(0);
    });
  });

  describe('Project not found', () => {
    it('should fail when project directory does not exist', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(
              Object.assign(new Error('Not Found'), { status: 404 })
            ),
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

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'nonexistent-project',
        '-o',
        testOutputDir,
      ];

      const result = await execute(argv);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });

  describe('Invalid arguments', () => {
    it('should fail with validation error for invalid repository format', async () => {
      const argv = ['node', 'kirox', 'invalid-repo-format', '-p', 'project'];

      const result = await execute(argv);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1); // User error
    });

    it('should fail when project name contains path traversal', async () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', '../malicious'];

      const result = await execute(argv);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('Partial failure scenarios', () => {
    it('should download successful files and report failures', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Directory listing
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/test/file1.md',
                    type: 'file',
                    sha: 'a',
                    size: 100,
                  },
                  {
                    name: 'file2.md',
                    path: '.kiro/specs/test/file2.md',
                    type: 'file',
                    sha: 'b',
                    size: 100,
                  },
                  {
                    name: 'file3.md',
                    path: '.kiro/specs/test/file3.md',
                    type: 'file',
                    sha: 'c',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] }) // Empty steering
              .mockResolvedValueOnce({
                // file1.md success
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 1', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/test/file1.md',
                  sha: 'a',
                },
              })
              .mockRejectedValueOnce(new Error('Network timeout')) // file2.md fails
              .mockResolvedValueOnce({
                // file3.md success
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 3', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/test/file3.md',
                  sha: 'c',
                },
              }),
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

      const argv = ['node', 'kirox', 'owner/repo', '-p', 'test', '-o', testOutputDir, '--force'];

      const result = await execute(argv);

      // Should have partial success
      expect(result.filesDownloaded).toBe(2);
      expect(result.filesFailed).toBe(1);
      expect(result.success).toBe(false); // Overall failure due to some files failing
      expect(result.exitCode).toBe(1);

      // Verify successful files exist
      const file1Exists = await fs
        .access(path.join(testOutputDir, '.kiro/specs/test/file1.md'))
        .then(() => true)
        .catch(() => false);
      const file3Exists = await fs
        .access(path.join(testOutputDir, '.kiro/specs/test/file3.md'))
        .then(() => true)
        .catch(() => false);

      expect(file1Exists).toBe(true);
      expect(file3Exists).toBe(true);
    });
  });

  describe('Access denied', () => {
    it('should fail with clear message when access is denied', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(
              Object.assign(new Error('Forbidden'), { status: 403 })
            ),
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

      const argv = ['node', 'kirox', 'owner/private-repo', '-p', 'project', '-o', testOutputDir];

      const result = await execute(argv);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });

  describe('All projects not found (task 9.2)', () => {
    it('should fail with clear error when all specified projects do not exist', async () => {
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
        'non-existent-proj1,non-existent-proj2,non-existent-proj3',
        '-o',
        testOutputDir,
      ];

      const result = await execute(argv);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.filesDownloaded).toBe(0);
    });

    it('should display error message when all projects not found', async () => {
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
        'proj1,proj2',
        '-o',
        testOutputDir,
      ];

      await execute(argv);

      const errorCalls = consoleErrorSpy.mock.calls.flat();
      const hasAllProjectsNotFoundMessage = errorCalls.some((arg) =>
        String(arg).includes('指定されたプロジェクトがいずれも見つかりません')
      );

      expect(hasAllProjectsNotFoundMessage).toBe(true);

      consoleErrorSpy.mockRestore();
    });

    it('should continue when only some projects fail (partial success)', async () => {
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
                    name: 'spec.json',
                    path: '.kiro/specs/proj2/spec.json',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              // Third call: proj2/spec.json file content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from(JSON.stringify({ name: 'proj2' })).toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj2/spec.json',
                  sha: 'abc123',
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
        'proj1,proj2',
        '-o',
        testOutputDir,
      ];

      const result = await execute(argv);

      // Should continue processing but mark as failed due to proj1 failure (partial failure)
      expect(result.filesDownloaded).toBeGreaterThan(0);
      expect(result.success).toBe(false); // Overall failure due to proj1 error
      expect(result.exitCode).toBe(1); // Partial failure
    });
  });
});
