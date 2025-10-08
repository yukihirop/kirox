/**
 * Interactive Mode to Execution Flow Integration Tests
 *
 * Tests the transition from interactive mode to non-interactive execution.
 * Task 9.1: 対話モードから非対話モードへの遷移テスト
 *
 * Verifies that after interactive prompts complete, the execution flow
 * continues correctly with validation, GitHub fetching, and file writing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execute } from '../../src/cli/entry.js';
import * as interactive from '../../src/cli/interactive-prompt.js';
import * as validator from '../../src/cli/validator.js';
import * as githubFetcher from '../../src/github/fetcher.js';

// Mock modules
vi.mock('../../src/cli/interactive-prompt.js');
vi.mock('../../src/github/fetcher.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/github/fetcher.js')>();
  return {
    ...actual,
    fetchDirectoryContents: vi.fn().mockResolvedValue([
      { type: 'file', name: 'spec.json', path: '.kiro/specs/test-project/spec.json' },
      { type: 'file', name: 'requirements.md', path: '.kiro/specs/test-project/requirements.md' },
    ]),
  };
});
vi.mock('../../src/github/parallel-fetcher.js', () => ({
  fetchFilesInParallel: vi.fn().mockResolvedValue({
    success: [
      { path: '.kiro/specs/test-project/spec.json', content: '{}', sha: 'abc123', size: 2 },
      { path: '.kiro/specs/test-project/requirements.md', content: '# Requirements', sha: 'def456', size: 14 },
    ],
    failed: [],
  }),
}));
vi.mock('../../src/filesystem/writer.js', () => ({
  writeFile: vi.fn().mockResolvedValue({ written: true }),
}));
vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../src/tracking/metadata-manager.js', () => ({
  loadMetadata: vi.fn().mockResolvedValue({ projects: [] }),
  upsertProject: vi.fn(),
  upsertFile: vi.fn(),
}));

describe('Interactive to Execution Flow Integration', () => {
  let mockShouldEnterInteractiveMode: ReturnType<typeof vi.fn>;
  let mockPromptMissingArguments: ReturnType<typeof vi.fn>;
  let mockCheckTTYEnvironment: ReturnType<typeof vi.fn>;
  let mockFetchDirectoryContents: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset all mocks first
    vi.clearAllMocks();

    // Get mocked functions
    mockShouldEnterInteractiveMode = interactive.shouldEnterInteractiveMode as ReturnType<typeof vi.fn>;
    mockPromptMissingArguments = interactive.promptMissingArguments as ReturnType<typeof vi.fn>;
    mockCheckTTYEnvironment = interactive.checkTTYEnvironment as ReturnType<typeof vi.fn>;

    // Get the mocked fetchDirectoryContents function
    const fetcherModule = await import('../../src/github/fetcher.js');
    mockFetchDirectoryContents = fetcherModule.fetchDirectoryContents as ReturnType<typeof vi.fn>;

    // Default successful TTY check
    mockCheckTTYEnvironment.mockReturnValue({ success: true });
  });

  describe('promptMissingArguments後のexecute関数呼び出し', () => {
    it('should call fetchDirectoryContents with completed arguments after interactive prompts', async () => {
      // RED: Test that interactive mode completion leads to execution
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Mock completed arguments from interactive mode
      const completedArgs = {
        repository: 'owner/repo',
        project: 'test-project',
        output: './output',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      const result = await execute(['node', 'kirox']);

      // Verify interactive mode was entered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
      expect(mockPromptMissingArguments).toHaveBeenCalled();

      // Verify execution continued with completed arguments
      // fetchDirectoryContents is called for both spec and steering directories
      expect(mockFetchDirectoryContents).toHaveBeenCalled();
      expect(mockFetchDirectoryContents).toHaveBeenCalledWith(
        expect.any(Object), // octokit
        'owner',
        'repo',
        '.kiro/specs/test-project',
        undefined // branch
      );

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);
    });

    it('should pass through branch specification from interactive mode', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo#feature-branch',
        project: 'test-project',
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

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      await execute(['node', 'kirox']);

      // Verify branch was parsed correctly and passed to fetchDirectoryContents
      expect(mockFetchDirectoryContents).toHaveBeenCalledWith(
        expect.any(Object), // octokit
        'owner',
        'repo',
        '.kiro/specs/test-project',
        'feature-branch'
      );
    });

    it('should pass subdirectory from interactive mode to fetcher', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        project: 'test-project',
        output: '.',
        subdir: 'packages/api',
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      await execute(['node', 'kirox']);

      // Verify subdirectory is included in path
      expect(mockFetchDirectoryContents).toHaveBeenCalledWith(
        expect.any(Object),
        'owner',
        'repo',
        'packages/api/.kiro/specs/test-project',
        undefined
      );
    });
  });

  describe('ParsedArgumentsの正しい構築', () => {
    it('should construct valid ParsedArguments from interactive input', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'test/repo',
        project: 'my-project',
        output: './custom-dir',
        subdir: 'src',
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      await execute(['node', 'kirox']);

      // Verify all fields are passed correctly
      expect(mockFetchDirectoryContents).toHaveBeenCalledWith(
        expect.any(Object),
        'test',
        'repo',
        'src/.kiro/specs/my-project',
        undefined
      );
    });

    it('should handle optional fields correctly when not provided', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        project: 'project',
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

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      await execute(['node', 'kirox']);

      // Verify path without subdir
      expect(mockFetchDirectoryContents).toHaveBeenCalledWith(
        expect.any(Object),
        'owner',
        'repo',
        '.kiro/specs/project',
        undefined
      );
    });
  });

  describe('バリデーション機構の動作確認', () => {
    it('should reject invalid repository format from interactive mode', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Interactive mode should validate, but let's test the flow
      const completedArgs = {
        repository: 'invalid-format',
        project: 'project',
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

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      const result = await execute(['node', 'kirox']);

      // Should fail validation
      expect(result.success).toBe(false);
      expect(mockFetchDirectoryContents).not.toHaveBeenCalled();
    });

    it('should accept valid repository formats', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const testCases = [
        'owner/repo',
        'owner/repo#main',
        'owner/repo#feature/branch',
      ];

      for (const repository of testCases) {
        vi.clearAllMocks();
        mockCheckTTYEnvironment.mockReturnValue({ success: true });

        mockPromptMissingArguments.mockResolvedValue({
          repository,
          project: 'test',
          output: '.',
          subdir: undefined,
          force: false,
          dryRun: false,
          verbose: false,
          config: undefined,
          checkUpdates: false,
          update: false,
          track: true,
        });

        await execute(['node', 'kirox']);

        expect(mockFetchDirectoryContents).toHaveBeenCalled();
      }
    });
  });

  describe('実行フロー全体の検証', () => {
    it('should complete full flow: interactive -> validation -> fetch -> result', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo#test',
        project: 'full-flow-test',
        output: './test-output',
        subdir: 'lib',
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      const result = await execute(['node', 'kirox']);

      // Verify complete flow
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
      expect(mockPromptMissingArguments).toHaveBeenCalled();
      expect(mockFetchDirectoryContents).toHaveBeenCalled();

      // Verify result includes execution details
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);
      expect(result.exitCode).toBe(0);
    });

    it('should handle fetch failures gracefully', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        project: 'test',
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      // Mock fetchDirectoryContents to throw an error
      mockFetchDirectoryContents.mockRejectedValueOnce(
        new Error('Repository not found')
      );

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
    });
  });
});
