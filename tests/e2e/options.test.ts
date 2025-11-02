/**
 * E2E tests for CLI options
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '@/cli/entry.js';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';

vi.mock('octokit');

describe('E2E CLI Options', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-options');

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

  describe('--dry-run option', () => {
    it('should not write files when --dry-run is specified', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'test.md',
                    path: '.kiro/specs/test/test.md',
                    type: 'file',
                    sha: 'a',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Test content', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/test/test.md',
                  sha: 'a',
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

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test',
        '-o',
        testOutputDir,
        '--dry-run',
      ];

      const result = await execute(argv);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);

      // Verify no files were written
      const fileExists = await fs
        .access(path.join(testOutputDir, '.kiro/specs/test/test.md'))
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(false);
    });
  });

  describe('--force option', () => {
    it('should overwrite existing files without confirmation when --force is specified', async () => {
      // Create existing file
      const targetPath = path.join(testOutputDir, '.kiro/specs/test/existing.md');
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, 'Old content', 'utf-8');

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'existing.md',
                    path: '.kiro/specs/test/existing.md',
                    type: 'file',
                    sha: 'a',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('New content', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/test/existing.md',
                  sha: 'a',
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

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify file was overwritten
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe('New content');
    });
  });

  describe('--verbose option', () => {
    it('should execute successfully with verbose logging', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file.md',
                    path: '.kiro/specs/test/file.md',
                    type: 'file',
                    sha: 'a',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/test/file.md',
                  sha: 'a',
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

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test',
        '-o',
        testOutputDir,
        '--force',
        '--verbose',
      ];

      const result = await execute(argv);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);
    });
  });

  describe('-o/--output option', () => {
    it('should write files to custom output directory', async () => {
      const customOutput = path.join(testOutputDir, 'custom-dir');

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file.md',
                    path: '.kiro/specs/test/file.md',
                    type: 'file',
                    sha: 'a',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Custom dir content', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/test/file.md',
                  sha: 'a',
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

      const argv = ['node', 'kirox', 'owner/repo', '-p', 'test', '-o', customOutput, '--force'];

      const result = await execute(argv);

      expect(result.success).toBe(true);

      // Verify file was written to custom directory
      const filePath = path.join(customOutput, '.kiro/specs/test/file.md');
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });
  });

  describe('Combined options', () => {
    it('should handle multiple options together', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'multi.md',
                    path: '.kiro/specs/test/multi.md',
                    type: 'file',
                    sha: 'a',
                    size: 80,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Multi options test', 'utf-8').toString('base64'),
                  size: 80,
                  path: '.kiro/specs/test/multi.md',
                  sha: 'a',
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

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test',
        '-o',
        testOutputDir,
        '--force',
        '--verbose',
      ];

      const result = await execute(argv);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('--help option', () => {
    it('should display repository format with branch support', async () => {
      const argv = ['node', 'kirox', '--help'];

      // Commander.js exits with code 0 on --help, which throws in test environment
      // We need to capture stdout to verify the help message
      let helpOutput = '';
      const originalWrite = process.stdout.write;
      process.stdout.write = vi.fn((chunk: any) => {
        helpOutput += chunk.toString();
        return true;
      }) as any;

      try {
        await execute(argv);
      } catch (_error: any) {
        // Expected: Commander.js calls process.exit() on --help
        // We catch this to continue testing
      }

      // Restore stdout
      process.stdout.write = originalWrite;

      // Verify help message includes branch format
      expect(helpOutput).toMatch(/owner\/repo#branch/i);
      expect(helpOutput).toMatch(/owner\/repo/);
    });

    it('should display branch usage examples in help message', async () => {
      const argv = ['node', 'kirox', '--help'];

      let helpOutput = '';
      const originalWrite = process.stdout.write;
      process.stdout.write = vi.fn((chunk: any) => {
        helpOutput += chunk.toString();
        return true;
      }) as any;

      try {
        await execute(argv);
      } catch (_error: any) {
        // Expected: Commander.js calls process.exit() on --help
      }

      // Restore stdout
      process.stdout.write = originalWrite;

      // Verify help message includes usage examples with branch
      expect(helpOutput).toMatch(/npx kirox owner\/repo#feature\/new-api -p my-project/i);
      expect(helpOutput).toMatch(/owner\/repo#develop/i);
    });

    it('should display branch specification explanation in help message', async () => {
      const argv = ['node', 'kirox', '--help'];

      let helpOutput = '';
      const originalWrite = process.stdout.write;
      process.stdout.write = vi.fn((chunk: any) => {
        helpOutput += chunk.toString();
        return true;
      }) as any;

      try {
        await execute(argv);
      } catch (_error: any) {
        // Expected: Commander.js calls process.exit() on --help
      }

      // Restore stdout
      process.stdout.write = originalWrite;

      // Verify help message includes explanation about branch specification (English after Task 10.3)
      expect(helpOutput).toMatch(/branch.*after.*#|specify.*branch.*#/i);
    });
  });
});
