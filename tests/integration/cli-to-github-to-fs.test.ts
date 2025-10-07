/**
 * Integration tests for CLI → GitHub API → File System flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '@/cli/entry';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';

// Mock Octokit
vi.mock('octokit');

describe('CLI to GitHub to FileSystem Integration', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'integration', 'test-output');

  beforeEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, ignore
    }
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  describe('Full flow integration', () => {
    it('should fetch files from GitHub and write to local filesystem', async () => {
      // Mock Octokit responses
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock .kiro/specs/test-project directory listing
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock .kiro/steering directory listing
                data: [
                  {
                    name: 'product.md',
                    path: '.kiro/steering/product.md',
                    type: 'file',
                    sha: 'def456',
                    size: 200,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock spec.json file content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"test": "data"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'abc123',
                },
              })
              .mockResolvedValueOnce({
                // Mock product.md file content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Product Documentation', 'utf-8').toString('base64'),
                  size: 200,
                  path: '.kiro/steering/product.md',
                  sha: 'def456',
                },
              }),
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

      // Execute CLI command
      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);
      expect(result.filesFailed).toBe(0);

      // Verify files were written to filesystem
      const specJsonPath = path.join(testOutputDir, '.kiro/specs/test-project/spec.json');
      const productMdPath = path.join(testOutputDir, '.kiro/steering/product.md');

      const specJsonExists = await fs
        .access(specJsonPath)
        .then(() => true)
        .catch(() => false);
      const productMdExists = await fs
        .access(productMdPath)
        .then(() => true)
        .catch(() => false);

      expect(specJsonExists).toBe(true);
      expect(productMdExists).toBe(true);

      // Verify file contents
      const specJsonContent = await fs.readFile(specJsonPath, 'utf-8');
      const productMdContent = await fs.readFile(productMdPath, 'utf-8');

      expect(specJsonContent).toBe('{"test": "data"}');
      expect(productMdContent).toBe('# Product Documentation');
    });

    it('should handle partial failures gracefully', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock directory listing with 2 files
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/test-project/file1.md',
                    type: 'file',
                    sha: 'abc',
                    size: 100,
                  },
                  {
                    name: 'file2.md',
                    path: '.kiro/specs/test-project/file2.md',
                    type: 'file',
                    sha: 'def',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock empty steering directory
                data: [],
              })
              .mockResolvedValueOnce({
                // Mock file1.md content (success)
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 1', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/test-project/file1.md',
                  sha: 'abc',
                },
              })
              .mockRejectedValueOnce(new Error('File not found')), // file2.md fails
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

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      // Verify partial success
      expect(result.filesDownloaded).toBe(1);
      expect(result.filesFailed).toBe(1);
      expect(result.exitCode).toBe(1);

      // Verify successful file was written
      const file1Path = path.join(testOutputDir, '.kiro/specs/test-project/file1.md');
      const file1Exists = await fs
        .access(file1Path)
        .then(() => true)
        .catch(() => false);

      expect(file1Exists).toBe(true);
    });
  });

  describe('Directory creation', () => {
    it('should create nested directories automatically', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'deep.md',
                    path: '.kiro/specs/test-project/deep.md',
                    type: 'file',
                    sha: 'abc',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Deep content', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/test-project/deep.md',
                  sha: 'abc',
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
        'test-project',
        '-o',
        testOutputDir,
        '--force',
      ];

      await execute(argv);

      // Verify nested directory was created
      const deepFilePath = path.join(testOutputDir, '.kiro/specs/test-project/deep.md');
      const deepFileExists = await fs
        .access(deepFilePath)
        .then(() => true)
        .catch(() => false);

      expect(deepFileExists).toBe(true);
    });
  });

  describe('Branch specification integration', () => {
    it('should fetch files from specified branch using owner/repo#branch format', async () => {
      // Mock Octokit responses with ref parameter
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock .kiro/specs/test-project directory listing with ref
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'branch-abc',
                    size: 150,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock .kiro/steering directory listing with ref
                data: [
                  {
                    name: 'tech.md',
                    path: '.kiro/steering/tech.md',
                    type: 'file',
                    sha: 'branch-def',
                    size: 250,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock spec.json file content from branch
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"branch": "feature"}', 'utf-8').toString('base64'),
                  size: 150,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'branch-abc',
                },
              })
              .mockResolvedValueOnce({
                // Mock tech.md file content from branch
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Tech from feature branch', 'utf-8').toString('base64'),
                  size: 250,
                  path: '.kiro/steering/tech.md',
                  sha: 'branch-def',
                },
              }),
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

      // Execute CLI command with branch specification
      const argv = [
        'node',
        'kirox',
        'owner/repo#feature-branch',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);
      expect(result.filesFailed).toBe(0);

      // Verify that getContent was called with ref parameter
      const getContentCalls = mockOctokit.rest.repos.getContent.mock.calls;

      // Check first call (specs directory)
      expect(getContentCalls[0][0]).toMatchObject({
        owner: 'owner',
        repo: 'repo',
        path: '.kiro/specs/test-project',
        ref: 'feature-branch',
      });

      // Check second call (steering directory)
      expect(getContentCalls[1][0]).toMatchObject({
        owner: 'owner',
        repo: 'repo',
        path: '.kiro/steering',
        ref: 'feature-branch',
      });

      // Verify files were written to filesystem
      const specJsonPath = path.join(testOutputDir, '.kiro/specs/test-project/spec.json');
      const techMdPath = path.join(testOutputDir, '.kiro/steering/tech.md');

      const specJsonContent = await fs.readFile(specJsonPath, 'utf-8');
      const techMdContent = await fs.readFile(techMdPath, 'utf-8');

      expect(specJsonContent).toBe('{"branch": "feature"}');
      expect(techMdContent).toBe('# Tech from feature branch');
    });

    it('should fetch files from default branch when no branch specified', async () => {
      // Mock Octokit responses without ref parameter
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'default-abc',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"branch": "main"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'default-abc',
                },
              }),
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

      // Execute CLI command without branch specification
      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify that getContent was called WITHOUT ref parameter
      const getContentCalls = mockOctokit.rest.repos.getContent.mock.calls;

      // Check that ref is undefined (not passed)
      expect(getContentCalls[0][0].ref).toBeUndefined();
      expect(getContentCalls[1][0].ref).toBeUndefined();
    });

    it('should fetch files from specified branch and subdirectory', async () => {
      // Mock Octokit responses with both ref and subdir
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock subdir/.kiro/specs/test-project directory listing with ref
                data: [
                  {
                    name: 'spec.json',
                    path: 'packages/api/.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'subdir-branch-abc',
                    size: 200,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock subdir/.kiro/steering directory listing with ref
                data: [
                  {
                    name: 'product.md',
                    path: 'packages/api/.kiro/steering/product.md',
                    type: 'file',
                    sha: 'subdir-branch-def',
                    size: 300,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock spec.json file content from branch and subdir
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"branch": "develop", "subdir": "packages/api"}', 'utf-8').toString('base64'),
                  size: 200,
                  path: 'packages/api/.kiro/specs/test-project/spec.json',
                  sha: 'subdir-branch-abc',
                },
              })
              .mockResolvedValueOnce({
                // Mock product.md file content from branch and subdir
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Product from develop branch, packages/api', 'utf-8').toString('base64'),
                  size: 300,
                  path: 'packages/api/.kiro/steering/product.md',
                  sha: 'subdir-branch-def',
                },
              }),
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

      // Execute CLI command with branch and subdir
      const argv = [
        'node',
        'kirox',
        'owner/repo#develop',
        '-p',
        'test-project',
        '--subdir',
        'packages/api',
        '-o',
        testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);
      expect(result.filesFailed).toBe(0);

      // Verify that getContent was called with both ref and correct path
      const getContentCalls = mockOctokit.rest.repos.getContent.mock.calls;

      // Check first call (specs directory with subdir and ref)
      expect(getContentCalls[0][0]).toMatchObject({
        owner: 'owner',
        repo: 'repo',
        path: 'packages/api/.kiro/specs/test-project',
        ref: 'develop',
      });

      // Check second call (steering directory with subdir and ref)
      expect(getContentCalls[1][0]).toMatchObject({
        owner: 'owner',
        repo: 'repo',
        path: 'packages/api/.kiro/steering',
        ref: 'develop',
      });

      // Verify files were written to filesystem with subdir prefix
      const specJsonPath = path.join(testOutputDir, 'packages/api/.kiro/specs/test-project/spec.json');
      const productMdPath = path.join(testOutputDir, 'packages/api/.kiro/steering/product.md');

      const specJsonContent = await fs.readFile(specJsonPath, 'utf-8');
      const productMdContent = await fs.readFile(productMdPath, 'utf-8');

      expect(specJsonContent).toBe('{"branch": "develop", "subdir": "packages/api"}');
      expect(productMdContent).toBe('# Product from develop branch, packages/api');
    });

    it('should display branch info in verbose mode', async () => {
      // Mock Octokit responses
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'abc',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"test": "data"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'abc',
                },
              }),
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

      // Capture console output
      const consoleOutput: string[] = [];
      const originalLog = console.log;
      console.log = vi.fn((...args) => {
        consoleOutput.push(args.join(' '));
        originalLog(...args);
      });

      // Execute CLI command with verbose and branch
      const argv = [
        'node',
        'kirox',
        'owner/repo#feature',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--force',
        '--verbose',
      ];

      const result = await execute(argv);

      // Restore console.log
      console.log = originalLog;

      // Verify execution succeeded
      expect(result.success).toBe(true);

      // Verify that verbose output includes branch info in format: owner/repo#feature/<path>
      const hasVerboseWithBranch = consoleOutput.some((line) =>
        /owner\/repo#feature\//i.test(line) || /feature.*spec\.json/i.test(line)
      );

      // Note: This test verifies the expected format, implementation will add this feature
      expect(hasVerboseWithBranch).toBe(true);
    });
  });
});
