/**
 * Tree API Project Scan Integration Tests
 *
 * Tests Tree API integration with promptMissingArguments function
 * Task 4.1: Tree API検索の統合とフォールバック分岐の実装
 * Task 4.2: プロジェクト選択からサブディレクトリパス自動抽出の実装
 * Task 4.3: 既存機能との互換性維持の実装
 *
 * Verifies that:
 * - Tree API is attempted when Logger is provided (Requirement 3.1)
 * - Subdirectory prompt is skipped on Tree API success (Requirement 3.1)
 * - Existing workflow is used on Tree API failure (Requirement 3.2)
 * - Subdirectory is auto-extracted from selected project (Requirements 3.3, 3.4)
 * - Loading and summary messages are displayed (Requirements 7.1-7.3)
 * - Truncated warning is displayed when response is truncated (Requirement 5.3)
 * - Tree API is skipped when subdirectory is already specified (Requirement 6.1)
 * - Tree API is skipped in non-TTY environment (Requirement 6.4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptMissingArguments } from '../../src/cli/interactive-prompt.js';
import type { ParsedArguments } from '../../src/cli/types.js';
import type { Logger } from '../../src/reporting/logger.js';
import * as treeScanner from '../../src/github/tree-based-project-scanner.js';
import * as searchablePrompt from '../../src/cli/searchable-project-prompt.js';
import * as projectSuggester from '../../src/cli/project-suggester.js';

// Mock modules
vi.mock('../../src/github/tree-based-project-scanner.js');
vi.mock('../../src/cli/searchable-project-prompt.js');
vi.mock('../../src/cli/project-suggester.js');
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

describe('Tree API Project Scan Integration (Task 4.1)', () => {
  let mockLogger: Logger;
  let mockScanProjectsAcrossSubdirs: ReturnType<typeof vi.fn>;
  let mockPromptProjectSelection: ReturnType<typeof vi.fn>;
  let mockSuggestProjects: ReturnType<typeof vi.fn>;
  let mockInput: ReturnType<typeof vi.fn>;
  let mockConfirm: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      verbose: vi.fn(),
    } as unknown as Logger;

    // Get mocked functions
    const inquirer = await import('@inquirer/prompts');
    mockInput = inquirer.input as ReturnType<typeof vi.fn>;
    mockConfirm = inquirer.confirm as ReturnType<typeof vi.fn>;

    mockScanProjectsAcrossSubdirs = treeScanner.scanProjectsAcrossSubdirs as ReturnType<typeof vi.fn>;
    mockPromptProjectSelection = searchablePrompt.promptProjectSelection as ReturnType<typeof vi.fn>;
    mockSuggestProjects = projectSuggester.suggestProjects as ReturnType<typeof vi.fn>;

    // Default mock for suggestProjects (fallback to empty projects)
    mockSuggestProjects.mockResolvedValue({
      projects: [],
      success: false,
      errorMessage: 'Project suggestion failed',
    });

    // Spy on console.log for loading/summary messages
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default: confirmation is true
    mockConfirm.mockResolvedValue(true);
  });

  describe('Tree API成功シナリオ (Requirement 3.1)', () => {
    it('should skip subdirectory prompt when Tree API succeeds', async () => {
      // Arrange: Initial args with only repository
      const initialArgs: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      // Mock Tree API success with 2 projects
      mockScanProjectsAcrossSubdirs.mockResolvedValue({
        projects: [
          { name: 'project-a', subdir: 'lib/a', displayName: 'lib/a/project-a' },
          { name: 'project-b', subdir: 'lib/b', displayName: 'lib/b/project-b' },
        ],
        success: true,
        truncated: false,
        entryCount: 100,
      });

      // Mock user selects project-a
      mockPromptProjectSelection.mockResolvedValue({
        projects: ['project-a'],
        subdir: 'lib/a',
      });

      // Act: Call promptMissingArguments with logger
      const result = await promptMissingArguments(initialArgs, undefined, mockLogger, false);

      // Assert: Tree API was called
      expect(mockScanProjectsAcrossSubdirs).toHaveBeenCalledWith({
        repository: expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
        }),
        client: expect.any(Object),
        logger: mockLogger,
        verbose: false,
      });

      // Assert: Searchable project selection was called
      expect(mockPromptProjectSelection).toHaveBeenCalledWith([
        { name: 'project-a', subdir: 'lib/a', displayName: 'lib/a/project-a' },
        { name: 'project-b', subdir: 'lib/b', displayName: 'lib/b/project-b' },
      ]);

      // Assert: Subdirectory prompt was NOT called
      // Note: mockInput may be called for output directory, but NOT for subdirectory
      const subdirCalls = mockInput.mock.calls.filter((call) =>
        call[0]?.message?.includes('subdirectory')
      );
      expect(subdirCalls).toHaveLength(0);

      // Assert: Result has auto-extracted subdirectory
      expect(result.projects).toEqual(['project-a']);
      expect(result.subdir).toBe('lib/a');
    });

    it('should display loading and summary messages (Requirements 7.1, 7.3)', async () => {
      const initialArgs: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      mockScanProjectsAcrossSubdirs.mockResolvedValue({
        projects: [
          { name: 'project-x', subdir: '', displayName: 'project-x' },
          { name: 'project-y', subdir: 'packages', displayName: 'packages/project-y' },
        ],
        success: true,
        truncated: false,
        entryCount: 50,
      });

      mockPromptProjectSelection.mockResolvedValue({
        projects: ['project-x'],
        subdir: '',
      });

      await promptMissingArguments(initialArgs, undefined, mockLogger, false);

      // Assert: Loading message was displayed (Requirement 7.1)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Scanning repository'));

      // Assert: Summary message was displayed (Requirement 7.3)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 2 projects'));
    });

    it('should auto-extract subdirectory from selected root project (Requirement 3.4)', async () => {
      const initialArgs: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      // Mock Tree API with root and subdir projects
      mockScanProjectsAcrossSubdirs.mockResolvedValue({
        projects: [
          { name: 'root-project', subdir: '', displayName: 'root-project' },
          { name: 'subdir-project', subdir: 'lib/a', displayName: 'lib/a/subdir-project' },
        ],
        success: true,
        truncated: false,
        entryCount: 50,
      });

      // Mock user selects root project
      mockPromptProjectSelection.mockResolvedValue({
        projects: ['root-project'],
        subdir: '',
      });

      const result = await promptMissingArguments(initialArgs, undefined, mockLogger, false);

      // Assert: Result has empty subdirectory for root project
      expect(result.projects).toEqual(['root-project']);
      expect(result.subdir).toBe('');
    });

    it('should display truncated warning when response is truncated (Requirement 5.3)', async () => {
      const initialArgs: ParsedArguments = {
        repository: 'owner/large-repo',
        projects: [],
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      // Mock Tree API with truncated response
      mockScanProjectsAcrossSubdirs.mockResolvedValue({
        projects: [
          { name: 'project-1', subdir: 'lib/a', displayName: 'lib/a/project-1' },
        ],
        success: true,
        truncated: true,
        entryCount: 100000,
      });

      mockPromptProjectSelection.mockResolvedValue({
        projects: ['project-1'],
        subdir: 'lib/a',
      });

      await promptMissingArguments(initialArgs, undefined, mockLogger, false);

      // Assert: Truncated warning was displayed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Large repository')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Some projects may not be displayed')
      );
    });
  });

  describe('既存機能との互換性 (Requirements 6.1, 6.3, 6.4)', () => {
    it('should skip Tree API when subdirectory is already specified (Requirement 6.1)', async () => {
      const initialArgs: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: 'lib/a', // Subdirectory already specified (non-interactive mode)
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      // Mock existing workflow: project prompt only
      mockInput.mockResolvedValueOnce('project-a'); // Project input

      await promptMissingArguments(initialArgs, undefined, mockLogger, false);

      // Assert: Tree API was NOT called (subdirectory already specified)
      expect(mockScanProjectsAcrossSubdirs).not.toHaveBeenCalled();

      // Assert: Project prompt WAS called (existing workflow)
      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('project name'),
        })
      );
    });

    it('should skip Tree API in non-TTY environment (Requirement 6.4)', async () => {
      // Save original value
      const originalIsTTY = process.stdin.isTTY;

      try {
        // Mock non-TTY environment
        Object.defineProperty(process.stdin, 'isTTY', {
          value: false,
          writable: true,
          configurable: true,
        });

        const initialArgs: ParsedArguments = {
          repository: 'owner/repo',
          projects: [],
          output: '.',
          subdir: undefined,
          force: false,
          dryRun: false,
          verbose: false,
          config: undefined,
          checkUpdates: false,
          update: false,
          track: true,
        };

        // Mock existing workflow
        mockInput
          .mockResolvedValueOnce('lib/a') // Subdirectory input
          .mockResolvedValueOnce('project-a'); // Project input

        await promptMissingArguments(initialArgs, undefined, mockLogger, false);

        // Assert: Tree API was NOT called (non-TTY environment)
        expect(mockScanProjectsAcrossSubdirs).not.toHaveBeenCalled();

        // Assert: Existing workflow was used
        expect(mockInput).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('subdirectory'),
          })
        );
      } finally {
        // Restore original value
        Object.defineProperty(process.stdin, 'isTTY', {
          value: originalIsTTY,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('Tree APIフォールバックシナリオ (Requirement 3.2)', () => {
    it('should fallback to existing workflow when Tree API fails', async () => {
      const initialArgs: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      // Mock Tree API failure
      mockScanProjectsAcrossSubdirs.mockResolvedValue({
        projects: [],
        success: false,
        truncated: false,
        entryCount: 0,
        errorMessage: 'Repository not found',
      });

      // Mock existing workflow: subdirectory prompt → project prompt
      mockInput
        .mockResolvedValueOnce('lib/a') // Subdirectory input
        .mockResolvedValueOnce('project-a'); // Project input

      await promptMissingArguments(initialArgs, undefined, mockLogger, false);

      // Assert: Tree API was attempted
      expect(mockScanProjectsAcrossSubdirs).toHaveBeenCalled();

      // Assert: Subdirectory prompt WAS called (fallback to existing workflow)
      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('subdirectory'),
        })
      );

      // Assert: Project prompt WAS called
      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('project name'),
        })
      );
    });

    it('should skip Tree API when Logger is not provided', async () => {
      const initialArgs: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      // Mock existing workflow
      mockInput
        .mockResolvedValueOnce('lib/a')
        .mockResolvedValueOnce('project-a');

      // Call without logger (logger = undefined)
      await promptMissingArguments(initialArgs, undefined, undefined, false);

      // Assert: Tree API was NOT called
      expect(mockScanProjectsAcrossSubdirs).not.toHaveBeenCalled();

      // Assert: Existing workflow was used
      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('subdirectory'),
        })
      );
    });

    it('should fallback when Tree API returns 0 projects', async () => {
      const initialArgs: ParsedArguments = {
        repository: 'owner/empty-specs',
        projects: [],
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      // Mock Tree API success but 0 projects
      mockScanProjectsAcrossSubdirs.mockResolvedValue({
        projects: [],
        success: true,
        truncated: false,
        entryCount: 0,
      });

      mockInput
        .mockResolvedValueOnce('src')
        .mockResolvedValueOnce('my-project');

      await promptMissingArguments(initialArgs, undefined, mockLogger, false);

      // Assert: Existing workflow was used
      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('subdirectory'),
        })
      );
    });
  });
});
