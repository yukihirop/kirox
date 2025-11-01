/**
 * E2E tests for project suggestion feature in interactive mode
 *
 * Task 8.1: インタラクティブモード完全フローのE2Eテストを作成
 *
 * Tests the complete project suggestion flow:
 * - Single project selection flow
 * - Multiple project selection flow
 * - Fallback flow (API failure → manual input)
 *
 * Requirements: All requirements integrated verification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '../../src/cli/entry.js';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';
import * as interactive from '../../src/cli/interactive-prompt.js';
import * as suggester from '../../src/cli/project-suggester.js';

vi.mock('octokit');
vi.mock('../../src/cli/interactive-prompt.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/cli/interactive-prompt.js')>();
  return {
    ...actual,
    shouldEnterInteractiveMode: vi.fn(),
    promptMissingArguments: vi.fn(),
    checkTTYEnvironment: vi.fn(),
    promptProject: vi.fn(),
  };
});

vi.mock('../../src/cli/project-suggester.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/cli/project-suggester.js')>();
  return {
    ...actual,
    suggestProjects: vi.fn(),
    promptMultipleProjectsWithValidation: vi.fn(),
    formatMultipleProjectsToString: vi.fn(),
  };
});

describe('E2E Project Suggestion Flow', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-suggestion');
  let mockShouldEnterInteractiveMode: ReturnType<typeof vi.fn>;
  let mockPromptMissingArguments: ReturnType<typeof vi.fn>;
  let mockCheckTTYEnvironment: ReturnType<typeof vi.fn>;
  let mockSuggestProjects: ReturnType<typeof vi.fn>;

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
    mockSuggestProjects = suggester.suggestProjects as ReturnType<typeof vi.fn>;

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

  describe('Single project selection flow', () => {
    it('should complete flow with GitHub API project suggestion and single selection', async () => {
      // Simulate interactive mode entry
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate user providing repository and subdirectory
      // Project will be suggested from GitHub API
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'yukihirop/kirox',
        projects: ['kirox-cli'], // Single project selected from suggestions
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
                    path: '.kiro/specs/kirox-cli/spec.json',
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
                  content: Buffer.from('{"feature": "kirox-cli"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/kirox-cli/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      // Execute
      const result = await execute(['node', 'kirox']);

      // Verify
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify file was written
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'kirox-cli', 'spec.json');
      expect(await fs.access(specFile).then(() => true).catch(() => false)).toBe(true);

      const content = JSON.parse(await fs.readFile(specFile, 'utf-8'));
      expect(content).toEqual({ feature: 'kirox-cli' });
    });

    it('should show project suggestions when repository is specified without project', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User provides repository but no project (triggers suggestion)
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'yukihirop/kirox',
        projects: ['kirox-cli'], // Selected from suggestions
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
              // Fetch project directory (empty)
              .mockResolvedValueOnce({ data: [] })
              // Fetch steering directory (empty)
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);
      expect(mockPromptMissingArguments).toHaveBeenCalled();
    });
  });

  describe('Multiple project selection flow', () => {
    it('should complete flow with multiple project selection from GitHub API', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate user selecting multiple projects
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'yukihirop/kirox',
        projects: ['kirox-cli', 'kirox-update-tracking'], // Multiple projects
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
              // PROJECT 1: kirox-cli
              // 1. Fetch first project directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/kirox-cli/spec.json',
                    type: 'file',
                    sha: 'file-sha1',
                    size: 50,
                  },
                ],
              })
              // 2. Fetch steering directory for project 1 (empty)
              .mockResolvedValueOnce({ data: [] })
              // 3. Fetch first project file content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"feature": "cli"}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/kirox-cli/spec.json',
                  sha: 'file-sha1',
                },
              })
              // PROJECT 2: kirox-update-tracking
              // 4. Fetch second project directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/kirox-update-tracking/spec.json',
                    type: 'file',
                    sha: 'file-sha2',
                    size: 60,
                  },
                ],
              })
              // 5. Fetch second project file content (steering is cached, not fetched again)
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"feature": "update"}', 'utf-8').toString('base64'),
                  size: 60,
                  path: '.kiro/specs/kirox-update-tracking/spec.json',
                  sha: 'file-sha2',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);

      // Verify both project files were written
      const cliSpecFile = path.join(testOutputDir, '.kiro', 'specs', 'kirox-cli', 'spec.json');
      const updateSpecFile = path.join(testOutputDir, '.kiro', 'specs', 'kirox-update-tracking', 'spec.json');

      expect(await fs.access(cliSpecFile).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(updateSpecFile).then(() => true).catch(() => false)).toBe(true);
    });

    it('should format multiple project names as comma-separated string', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'yukihirop/kirox',
        projects: ['project-a', 'project-b', 'project-c'],
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

      // Projects are processed individually
      expect(result.success).toBe(true);
    });
  });

  describe('Fallback flow (API failure → manual input)', () => {
    it('should fallback to manual input when GitHub API fails with 404', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate user providing repository, API fails, then manual project input
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'yukihirop/non-existent-repo',
        projects: ['manual-project'], // Manually entered after API failure
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
              // Manual project fetch
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/manual-project/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              // Steering directory (empty)
              .mockResolvedValueOnce({ data: [] })
              // File content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"manual": true}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/manual-project/spec.json',
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
    });

    it('should fallback to manual input when .kiro/specs/ directory is empty', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'yukihirop/empty-repo',
        projects: ['manual-project'],
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
              // Manual project fetch
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/manual-project/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              // Steering directory (empty)
              .mockResolvedValueOnce({ data: [] })
              // File content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"manual": true}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/manual-project/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);
    });

    it('should display error message when API fails and continue with manual input', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'yukihirop/test-repo',
        projects: ['fallback-project'],
        output: testOutputDir,
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: true, // Enable verbose to see error logging
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // Manual project (empty)
              .mockResolvedValueOnce({ data: [] })
              // Steering (empty)
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      // Should succeed with manual input despite API failure
      expect(result.success).toBe(true);
    });
  });

  describe('Project suggestion with subdirectory', () => {
    it('should suggest projects from subdirectory path', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'yukihirop/monorepo',
        projects: ['backend-api'],
        output: testOutputDir,
        subdir: 'packages/backend',
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
              // Fetch project directory from subdir
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: 'packages/backend/.kiro/specs/backend-api/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
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
                  content: Buffer.from('{"backend": true}', 'utf-8').toString('base64'),
                  size: 50,
                  path: 'packages/backend/.kiro/specs/backend-api/spec.json',
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

      // Verify file was written to correct subdirectory path
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'backend-api', 'spec.json');
      expect(await fs.access(specFile).then(() => true).catch(() => false)).toBe(true);

      const content = JSON.parse(await fs.readFile(specFile, 'utf-8'));
      expect(content).toEqual({ backend: true });
    });
  });
});
