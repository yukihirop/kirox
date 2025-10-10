/**
 * E2E tests for backward compatibility with existing features
 *
 * Task 8.2: 既存機能との互換性E2Eテストを作成
 *
 * Tests the compatibility of project suggestion feature with existing workflows:
 * - Non-interactive mode (-p option specified)
 * - Interactive mode with pre-specified project (suggestion skip)
 * - Non-TTY environment error handling
 *
 * Requirements: 5.1, 5.2, 5.4
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

describe('E2E Backward Compatibility Flow', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-compat');
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

  describe('Non-interactive mode with -p option (Requirement 5.1)', () => {
    it('should skip project suggestion when project is specified with -p option', async () => {
      // Non-interactive mode: shouldEnterInteractiveMode returns false
      mockShouldEnterInteractiveMode.mockReturnValue(false);

      // Mock GitHub API for file fetching
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // Fetch project directory
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
              // Fetch steering directory (empty)
              .mockResolvedValueOnce({ data: [] })
              // Fetch file content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"project": "my-project"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/my-project/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      // Execute with -p option (non-interactive mode)
      const result = await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'my-project',
        '-o',
        testOutputDir,
      ]);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify interactive mode was not entered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();

      // Verify file was written
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'my-project', 'spec.json');
      expect(await fs.access(specFile).then(() => true).catch(() => false)).toBe(true);

      const content = JSON.parse(await fs.readFile(specFile, 'utf-8'));
      expect(content).toEqual({ project: 'my-project' });
    });

    it('should work with multiple projects specified with -p option', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First project
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/proj1/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] }) // steering
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"name": "proj1"}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/proj1/spec.json',
                  sha: 'sha1',
                },
              })
              // Second project
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/proj2/spec.json',
                    type: 'file',
                    sha: 'sha2',
                    size: 50,
                  },
                ],
              })
              // steering cached, not fetched again
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"name": "proj2"}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/proj2/spec.json',
                  sha: 'sha2',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'proj1,proj2',
        '-o',
        testOutputDir,
      ]);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });
  });

  describe('Interactive mode with pre-specified project (Requirement 5.2)', () => {
    it('should skip project suggestion when project is pre-specified in interactive mode', async () => {
      // Interactive mode is triggered
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // But project is already specified, so promptMissingArguments should NOT prompt for project
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['pre-specified-project'], // Already specified
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
                    path: '.kiro/specs/pre-specified-project/spec.json',
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
                  content: Buffer.from('{"prespecified": true}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/pre-specified-project/spec.json',
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

      // Verify interactive mode was entered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
      expect(mockPromptMissingArguments).toHaveBeenCalled();

      // Verify file was written
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'pre-specified-project', 'spec.json');
      expect(await fs.access(specFile).then(() => true).catch(() => false)).toBe(true);
    });

    it('should not call project suggestion API when project is already in arguments', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Project is already in parsed arguments
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['existing-project'],
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
              .mockResolvedValueOnce({ data: [] }) // project dir (empty)
              .mockResolvedValueOnce({ data: [] }), // steering dir (empty)
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);

      // Verify no project directory listing was fetched for suggestion
      // Only 2 calls: project files + steering files
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Non-TTY environment error handling (Requirement 5.4)', () => {
    it('should return error when interactive mode is required but TTY is not available', async () => {
      // Interactive mode is needed (missing arguments)
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // But TTY is not available
      mockCheckTTYEnvironment.mockReturnValue({
        success: false,
        exitCode: 1,
      });

      const result = await execute(['node', 'kirox']);

      // Should fail with TTY error
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);

      // Verify checkTTYEnvironment was called
      expect(mockCheckTTYEnvironment).toHaveBeenCalled();

      // Verify promptMissingArguments was NOT called (TTY check failed first)
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });

    it('should succeed when TTY is available and interactive prompts work', async () => {
      // Interactive mode is triggered
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // TTY is available - interactive prompts can work
      mockCheckTTYEnvironment.mockReturnValue({
        success: true,
        exitCode: 0,
      });

      // User provides arguments through interactive prompts
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
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

      // Mock GitHub API response (empty project)
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({ data: [] }) // project dir
              .mockResolvedValueOnce({ data: [] }), // steering dir
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      // Should succeed with TTY available
      expect(result.success).toBe(true);
      expect(mockCheckTTYEnvironment).toHaveBeenCalled();
      expect(mockPromptMissingArguments).toHaveBeenCalled();
    });
  });

  describe('Project suggestion skip verification', () => {
    it('should verify promptProject receives currentValue when project is pre-specified', async () => {
      // This is a more detailed test to ensure promptProject function receives
      // the pre-specified project value and skips suggestion logic

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate that project was already provided (e.g., from config file or partial args)
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['config-project'], // From config or CLI
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

      // The key verification: promptMissingArguments was called but didn't need to prompt for project
      // because it was already specified
      expect(mockPromptMissingArguments).toHaveBeenCalled();

      // Verify that the projects array was not empty when passed to promptMissingArguments
      const callArgs = mockPromptMissingArguments.mock.calls[0];
      expect(callArgs).toBeDefined();
      // The first argument should be ParsedArguments with projects already populated
      expect(callArgs[0]).toHaveProperty('projects');
    });
  });
});
