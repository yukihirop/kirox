/**
 * E2E tests for interactive mode with partial arguments
 *
 * Task 10.2: 部分的引数指定フローのE2Eテスト
 *
 * Tests the interactive flow when partial arguments are provided.
 * This validates that only missing prompts are shown and the flow completes successfully.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '../../src/cli/entry.js';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';
import * as interactive from '../../src/cli/interactive-prompt.js';

vi.mock('octokit');
vi.mock('../../src/cli/interactive-prompt.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/cli/interactive-prompt.js')>();
  return {
    ...actual,
    shouldEnterInteractiveMode: vi.fn(),
    promptMissingArguments: vi.fn(),
    checkTTYEnvironment: vi.fn(),
  };
});

describe('E2E Interactive Partial Arguments Flow', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-partial');
  let mockShouldEnterInteractiveMode: ReturnType<typeof vi.fn>;
  let mockPromptMissingArguments: ReturnType<typeof vi.fn>;
  let mockCheckTTYEnvironment: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, ignore
    }
    await fs.mkdir(testOutputDir, { recursive: true });

    // Get mocked functions
    mockShouldEnterInteractiveMode = interactive.shouldEnterInteractiveMode as ReturnType<typeof vi.fn>;
    mockPromptMissingArguments = interactive.promptMissingArguments as ReturnType<typeof vi.fn>;
    mockCheckTTYEnvironment = interactive.checkTTYEnvironment as ReturnType<typeof vi.fn>;

    // Default TTY check success
    mockCheckTTYEnvironment.mockReturnValue({ success: true });

    vi.clearAllMocks();
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

  describe('Repository only specification', () => {
    it('should complete E2E flow with repository provided, prompting only for project', async () => {
      // RED: E2E test for repository-only partial args

      // Simulate repository provided via CLI
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User provides missing project name
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'test-owner/test-repo',
        project: 'my-project',
        output: testOutputDir,
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      // Mock GitHub API
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/my-project/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"feature": "test"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/my-project/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      // Execute with repository argument only
      const result = await execute(['node', 'kirox', 'test-owner/test-repo']);

      // Verify interactive mode was triggered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'test-owner/test-repo',
          project: '',
        })
      );

      // Verify prompt was called with repository pre-filled
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'test-owner/test-repo',
          project: '',
        }),
        expect.any(Object)
      );

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify file was written
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'my-project', 'spec.json');
      expect(await fs.access(specFile).then(() => true).catch(() => false)).toBe(true);
    });

    it('should handle repository with branch in partial args', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo#feature',
        project: 'my-project',
        output: testOutputDir,
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'test.md',
                    path: '.kiro/specs/my-project/test.md',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('test', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/my-project/test.md',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox', 'owner/repo#feature']);

      expect(result.success).toBe(true);

      // Verify branch was passed to API
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: 'feature',
        })
      );
    });
  });

  describe('Repository with options', () => {
    it('should handle repository with --subdir option', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        project: 'my-project',
        output: testOutputDir,
        subdir: 'packages/api',
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: 'packages/api/.kiro/specs/my-project/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{}', 'utf-8').toString('base64'),
                  size: 50,
                  path: 'packages/api/.kiro/specs/my-project/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox', 'owner/repo', '--subdir', 'packages/api']);

      expect(result.success).toBe(true);

      // Verify subdir was used
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'packages/api/.kiro/specs/my-project',
        })
      );
    });

    it('should handle repository with --output option', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const customOutput = path.join(testOutputDir, 'custom');

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        project: 'my-project',
        output: customOutput,
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'test.md',
                    path: '.kiro/specs/my-project/test.md',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('content', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/my-project/test.md',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox', 'owner/repo', '-o', customOutput]);

      expect(result.success).toBe(true);

      // Verify file was written to custom output
      const testFile = path.join(customOutput, '.kiro', 'specs', 'my-project', 'test.md');
      expect(await fs.access(testFile).then(() => true).catch(() => false)).toBe(true);
    });

    it('should handle repository with boolean flags', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        project: 'my-project',
        output: testOutputDir,
        subdir: undefined,
        force: true,
        dryRun: false,
        verbose: true,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox', 'owner/repo', '--force', '--verbose']);

      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          force: true,
          verbose: true,
        }),
        expect.any(Object)
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Project only specification', () => {
    it('should complete E2E flow with project provided, prompting for repository', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User provides missing repository
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        project: 'my-project',
        output: testOutputDir,
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/my-project/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/my-project/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox', '-p', 'my-project']);

      expect(mockShouldEnterInteractiveMode).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: '',
          project: 'my-project',
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Options only specification', () => {
    it('should prompt for both repository and project when only options provided', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        project: 'my-project',
        output: './custom',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox', '-o', './custom']);

      expect(mockShouldEnterInteractiveMode).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: '',
          project: '',
          output: './custom',
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Integration with existing functionality', () => {
    it('should not enter interactive mode when all required args provided', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/my-project/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/my-project/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox', 'owner/repo', '-p', 'my-project']);

      // Should not prompt
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();

      expect(result.success).toBe(true);
    });

    it('should work with existing --dry-run option', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        project: 'my-project',
        output: testOutputDir,
        subdir: undefined,
        force: false,
        dryRun: true,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'test.md',
                    path: '.kiro/specs/my-project/test.md',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('test', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/my-project/test.md',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox', 'owner/repo', '--dry-run']);

      expect(result.success).toBe(true);

      // In dry-run mode, files should not be written
      const testFile = path.join(testOutputDir, '.kiro', 'specs', 'my-project', 'test.md');
      expect(await fs.access(testFile).then(() => true).catch(() => false)).toBe(false);
    });
  });
});
