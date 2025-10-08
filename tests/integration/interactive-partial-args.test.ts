/**
 * Interactive Mode Partial Arguments Integration Tests
 *
 * Tests interactive mode behavior when partial arguments are provided.
 * Task 9.2: 部分的引数指定時の対話モード起動テスト
 *
 * Verifies that:
 * - When only repository is provided, only project prompt is shown
 * - When only project is provided, error handling works correctly
 * - Partial specification of optional parameters works
 * - Combinations with existing arguments work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execute } from '../../src/cli/entry.js';
import * as interactive from '../../src/cli/interactive-prompt.js';

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

describe('Interactive Mode Partial Arguments Integration', () => {
  let mockShouldEnterInteractiveMode: ReturnType<typeof vi.fn>;
  let mockPromptMissingArguments: ReturnType<typeof vi.fn>;
  let mockCheckTTYEnvironment: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset all mocks first
    vi.clearAllMocks();

    // Get mocked functions
    mockShouldEnterInteractiveMode = interactive.shouldEnterInteractiveMode as ReturnType<typeof vi.fn>;
    mockPromptMissingArguments = interactive.promptMissingArguments as ReturnType<typeof vi.fn>;
    mockCheckTTYEnvironment = interactive.checkTTYEnvironment as ReturnType<typeof vi.fn>;

    // Default successful TTY check
    mockCheckTTYEnvironment.mockReturnValue({ success: true });
  });

  describe('リポジトリのみ指定時の動作', () => {
    it('should prompt only for project when repository is provided', async () => {
      // RED: Test that when repository is provided, only project prompt is needed
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Initial args with only repository
      const initialArgs = {
        repository: 'owner/repo',
        project: '',
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

      // User provides missing project
      const completedArgs = {
        ...initialArgs,
        project: 'my-project',
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      await execute(['node', 'kirox', 'owner/repo']);

      // Verify interactive mode was entered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          project: '',
        })
      );

      // Verify promptMissingArguments was called with partial args
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          project: '',
        }),
        expect.any(Object) // config file
      );
    });

    it('should accept repository with branch specification in partial args', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo#feature-branch',
        project: 'my-project',
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

      await execute(['node', 'kirox', 'owner/repo#feature-branch']);

      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo#feature-branch',
          project: '',
        }),
        expect.any(Object)
      );
    });

    it('should handle repository with subdir option in partial args', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        project: 'my-project',
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

      await execute(['node', 'kirox', 'owner/repo', '--subdir', 'packages/api']);

      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          project: '',
          subdir: 'packages/api',
        }),
        expect.any(Object)
      );
    });
  });

  describe('プロジェクト名のみ指定時の動作', () => {
    it('should enter interactive mode when only project is provided', async () => {
      // RED: Test that project-only specification triggers interactive mode
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        project: 'my-project',
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

      await execute(['node', 'kirox', '-p', 'my-project']);

      expect(mockShouldEnterInteractiveMode).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: '',
          project: 'my-project',
        })
      );

      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: '',
          project: 'my-project',
        }),
        expect.any(Object)
      );
    });
  });

  describe('オプションパラメータの部分指定', () => {
    it('should prompt for required args when only output is specified', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        project: 'my-project',
        output: './custom-output',
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

      await execute(['node', 'kirox', '-o', './custom-output']);

      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: '',
          project: '',
          output: './custom-output',
        }),
        expect.any(Object)
      );
    });

    it('should handle boolean flags with partial args', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        project: 'my-project',
        output: '.',
        subdir: undefined,
        force: true,
        dryRun: false,
        verbose: true,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      await execute(['node', 'kirox', '--force', '--verbose']);

      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: '',
          project: '',
          force: true,
          verbose: true,
        }),
        expect.any(Object)
      );
    });
  });

  describe('既存の引数との組み合わせ', () => {
    it('should combine repository and options correctly', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        project: 'my-project',
        output: './output',
        subdir: 'src',
        force: false,
        dryRun: true,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      await execute(['node', 'kirox', 'owner/repo', '-o', './output', '--subdir', 'src', '--dry-run']);

      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          project: '',
          output: './output',
          subdir: 'src',
          dryRun: true,
        }),
        expect.any(Object)
      );
    });

    it('should combine project and options correctly', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        project: 'my-project',
        output: '.',
        subdir: undefined,
        force: true,
        dryRun: false,
        verbose: true,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      await execute(['node', 'kirox', '-p', 'my-project', '--force', '--verbose']);

      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: '',
          project: 'my-project',
          force: true,
          verbose: true,
        }),
        expect.any(Object)
      );
    });

    it('should handle complex combination of partial args', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo#develop',
        project: 'my-project',
        output: './dist',
        subdir: 'packages/core',
        force: false,
        dryRun: true,
        verbose: true,
        config: '/custom/config.json',
        checkUpdates: false,
        update: false,
        track: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      await execute([
        'node',
        'kirox',
        'owner/repo#develop',
        '-o',
        './dist',
        '--subdir',
        'packages/core',
        '--dry-run',
        '--verbose',
        '--config',
        '/custom/config.json',
      ]);

      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo#develop',
          project: '',
          output: './dist',
          subdir: 'packages/core',
          dryRun: true,
          verbose: true,
          config: '/custom/config.json',
        }),
        expect.any(Object)
      );
    });
  });

  describe('完全な引数指定時は対話モード非起動', () => {
    it('should not enter interactive mode when all required args are provided', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(false);

      await execute(['node', 'kirox', 'owner/repo', '-p', 'my-project']);

      // Should not enter interactive mode
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });

    it('should not prompt when repository and project with options are all provided', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(false);

      await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'my-project',
        '-o',
        './output',
        '--subdir',
        'src',
        '--verbose',
      ]);

      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });
  });
});
