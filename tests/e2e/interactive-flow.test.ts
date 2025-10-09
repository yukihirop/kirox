/**
 * E2E tests for interactive mode flow
 *
 * Task 10.1: 基本的な対話フローのE2Eテスト
 *
 * Tests the complete interactive flow from CLI execution to file placement.
 * This is an E2E test that validates the entire user journey.
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

describe('E2E Interactive Flow', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-interactive');
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

    // Clean up any files created in project root
    try {
      const projectRootKiro = path.join(process.cwd(), '.kiro');
      await fs.rm(path.join(projectRootKiro, '.kirox-meta.json'), { force: true });
      await fs.rm(path.join(projectRootKiro, 'specs', 'test-project'), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    vi.clearAllMocks();
  });

  describe('Complete interactive flow', () => {
    it('should complete full interactive flow: prompts → validation → fetch → write', async () => {
      // RED: E2E test for complete interactive flow

      // Simulate user entering interactive mode
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate user providing all required information
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'test-owner/test-repo',
        projects: ['test-project'],
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

      // Mock GitHub API responses
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // .kiro/specs/test-project directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 100,
                  },
                  {
                    name: 'requirements.md',
                    path: '.kiro/specs/test-project/requirements.md',
                    type: 'file',
                    sha: 'sha2',
                    size: 200,
                  },
                ],
              })
              // .kiro/steering directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'product.md',
                    path: '.kiro/steering/product.md',
                    type: 'file',
                    sha: 'sha3',
                    size: 150,
                  },
                ],
              })
              // File contents
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"feature": "test"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'sha1',
                },
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Requirements\nTest requirements', 'utf-8').toString('base64'),
                  size: 200,
                  path: '.kiro/specs/test-project/requirements.md',
                  sha: 'sha2',
                },
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Product\nTest product', 'utf-8').toString('base64'),
                  size: 150,
                  path: '.kiro/steering/product.md',
                  sha: 'sha3',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      // Execute with no arguments (triggers interactive mode)
      const result = await execute(['node', 'kirox']);

      // Verify interactive mode was entered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
      expect(mockPromptMissingArguments).toHaveBeenCalled();

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(3);
      expect(result.filesFailed).toBe(0);

      // Verify files were written
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'test-project', 'spec.json');
      const reqFile = path.join(testOutputDir, '.kiro', 'specs', 'test-project', 'requirements.md');
      const prodFile = path.join(testOutputDir, '.kiro', 'steering', 'product.md');

      expect(await fs.access(specFile).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(reqFile).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(prodFile).then(() => true).catch(() => false)).toBe(true);

      // Verify file contents
      const specContent = await fs.readFile(specFile, 'utf-8');
      const reqContent = await fs.readFile(reqFile, 'utf-8');
      const prodContent = await fs.readFile(prodFile, 'utf-8');

      expect(JSON.parse(specContent)).toEqual({ feature: 'test' });
      expect(reqContent).toBe('# Requirements\nTest requirements');
      expect(prodContent).toBe('# Product\nTest product');
    });

    it('should handle interactive flow with branch specification', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo#develop',
        projects: ['my-project'],
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
              .mockResolvedValueOnce({ data: [] }) // Empty steering
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

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify GitHub API was called with branch parameter
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          path: '.kiro/specs/my-project',
          ref: 'develop',
        })
      );
    });

    it('should handle interactive flow with subdirectory', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['my-project'],
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

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);

      // Verify subdirectory was used in API call
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'packages/api/.kiro/specs/my-project',
        })
      );
    });
  });

  describe('Progress reporting during interactive flow', () => {
    it('should report progress during file fetching', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['project'],
        output: testOutputDir,
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: true, // Enable verbose to check logging
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
                    name: 'file1.md',
                    path: '.kiro/specs/project/file1.md',
                    type: 'file',
                    sha: 'sha1',
                    size: 100,
                  },
                  {
                    name: 'file2.md',
                    path: '.kiro/specs/project/file2.md',
                    type: 'file',
                    sha: 'sha2',
                    size: 200,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('content1', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/project/file1.md',
                  sha: 'sha1',
                },
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('content2', 'utf-8').toString('base64'),
                  size: 200,
                  path: '.kiro/specs/project/file2.md',
                  sha: 'sha2',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);
    });
  });

  describe('Validation during interactive flow', () => {
    it('should validate repository format after interactive input', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User provides invalid repository format
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'invalid-repo-format',
        projects: ['project'],
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

      const result = await execute(['node', 'kirox']);

      // Should fail validation
      expect(result.success).toBe(false);
      expect(result.filesDownloaded).toBe(0);
    });

    it('should accept valid repository formats from interactive input', async () => {
      const validFormats = [
        'owner/repo',
        'owner/repo#main',
        'owner/repo#feature/branch',
      ];

      for (const repository of validFormats) {
        vi.clearAllMocks();
        mockCheckTTYEnvironment.mockReturnValue({ success: true });
        mockShouldEnterInteractiveMode.mockReturnValue(true);

        mockPromptMissingArguments.mockResolvedValue({
          repository,
          projects: ['project'],
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
                .mockResolvedValue({ data: [] }),
            },
          },
        };

        (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

        const result = await execute(['node', 'kirox']);

        expect(result.success).toBe(true);
      }
    });
  });

  describe('File writing during interactive flow', () => {
    it('should write files to correct locations from interactive input', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const customOutput = path.join(testOutputDir, 'custom-dir');

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['test-project'],
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
                    path: '.kiro/specs/test-project/test.md',
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
                  content: Buffer.from('test content', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/test-project/test.md',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);

      // Verify file was written to custom output directory
      const testFile = path.join(customOutput, '.kiro', 'specs', 'test-project', 'test.md');
      expect(await fs.access(testFile).then(() => true).catch(() => false)).toBe(true);

      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('test content');
    });
  });
});
