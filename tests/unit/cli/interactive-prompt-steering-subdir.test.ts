/**
 * Unit tests for promptMissingArguments --steering subdirectory logic (Task 9.3)
 * Requirements: 9.1, 9.7, 9.8, 9.9
 *
 * Tests the integration of Tree API scanner and subdirectory selection UI
 * in --steering mode within the promptMissingArguments function.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Octokit } from 'octokit';
import type { Logger } from '../../../src/reporting/logger.js';
import type { ParsedArguments } from '../../../src/cli/types.js';
import { promptMissingArguments } from '../../../src/cli/interactive-prompt.js';

// Mock all dependencies
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../../../src/cli/validator.js', () => ({
  validateRepositoryFormat: vi.fn().mockReturnValue([]),
  validateProjectName: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../src/github/fetcher.js', () => ({
  parseRepositoryPath: vi.fn((repo: string) => {
    const [ownerRepo, branch] = repo.split('#');
    const [owner, repoName] = ownerRepo!.split('/');
    return {
      owner: owner!,
      repo: repoName!,
      branch: branch || 'main',
    };
  }),
  fetchBranches: vi.fn(),
  fetchDefaultBranch: vi.fn(),
}));

// Mock Tree API scanner (Task 9.1)
vi.mock('../../../src/github/tree-based-dir-scanner.js', () => ({
  scanDirectoriesAcrossRepo: vi.fn(),
}));

// Mock Subdirectory selection UI (Task 9.2)
vi.mock('../../../src/cli/searchable-subdir-prompt.js', () => ({
  promptSubdirSelection: vi.fn(),
}));

// Mock existing Tree API project scanner (not used in --steering mode)
vi.mock('../../../src/github/tree-based-project-scanner.js', () => ({
  scanProjectsAcrossSubdirs: vi.fn(),
}));

// Mock project suggester (not used in --steering mode)
vi.mock('../../../src/cli/project-suggester.js', () => ({
  suggestProjects: vi.fn(),
  promptMultipleProjectsWithValidation: vi.fn(),
  formatMultipleProjectsToString: vi.fn(),
}));

// Mock searchable project prompt (not used in --steering mode)
vi.mock('../../../src/cli/searchable-project-prompt.js', () => ({
  promptProjectSelection: vi.fn(),
}));

// Mock branch prompt
vi.mock('../../../src/cli/branch-prompt.js', () => ({
  promptBranch: vi.fn(),
}));

// Mock Octokit
vi.mock('octokit');

// Import after mock setup
import { input, confirm } from '@inquirer/prompts';
import { scanDirectoriesAcrossRepo } from '../../../src/github/tree-based-dir-scanner.js';
import { promptSubdirSelection } from '../../../src/cli/searchable-subdir-prompt.js';
import type { DirectoryLocation, DirectoryScanResult } from '../../../src/github/tree-based-dir-scanner.js';

describe('promptMissingArguments --steering subdirectory logic (Task 9.3)', () => {
  let mockLogger: Logger;
  let mockOctokit: Octokit;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      verbose: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    // Setup mock Octokit
    mockOctokit = new Octokit();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock implementations
    (input as ReturnType<typeof vi.fn>).mockResolvedValue('');
    (confirm as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 9.8: Tree APIスキャン統合 (--steering mode, no --subdir)', () => {
    it('should call scanDirectoriesAcrossRepo when --steering is true and --subdir is undefined', async () => {
      // Arrange
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: undefined, // Not specified - should trigger Tree API
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: false,
        steering: true, // --steering mode
      };

      const mockDirectories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
        { path: 'lib', displayName: 'lib', sha: 'sha2' },
      ];

      (scanDirectoriesAcrossRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        directories: mockDirectories,
        truncated: false,
      } as DirectoryScanResult);

      (promptSubdirSelection as ReturnType<typeof vi.fn>).mockResolvedValue({
        subdir: 'src',
      });

      // Act
      await promptMissingArguments(args, undefined, mockLogger, false);

      // Assert: scanDirectoriesAcrossRepo should be called with correct parameters
      expect(scanDirectoriesAcrossRepo).toHaveBeenCalledWith({
        repository: expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
        }),
        client: expect.any(Octokit),
        logger: mockLogger,
        verbose: false,
      });
    });

    it('should call promptSubdirSelection on Tree API success', async () => {
      // Arrange
      const args: ParsedArguments = {
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
        track: false,
        steering: true,
      };

      const mockDirectories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
        { path: 'lib', displayName: 'lib', sha: 'sha2' },
      ];

      (scanDirectoriesAcrossRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        directories: mockDirectories,
        truncated: false,
      });

      (promptSubdirSelection as ReturnType<typeof vi.fn>).mockResolvedValue({
        subdir: 'lib',
      });

      // Act
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      // Assert: promptSubdirSelection should be called with directory list
      expect(promptSubdirSelection).toHaveBeenCalledWith(mockDirectories);
      expect(result.subdir).toBe('lib');
    });

    it('should set subdir to empty string when root is selected', async () => {
      // Arrange
      const args: ParsedArguments = {
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
        track: false,
        steering: true,
      };

      (scanDirectoriesAcrossRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        directories: [
          { path: 'src', displayName: 'src', sha: 'sha1' },
        ],
        truncated: false,
      });

      // User selects "(root)" option
      (promptSubdirSelection as ReturnType<typeof vi.fn>).mockResolvedValue({
        subdir: '', // Empty string for root
      });

      // Act
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      // Assert: subdir should be empty string (root directory)
      expect(result.subdir).toBe('');
    });

    it('should log verbose messages when verbose=true', async () => {
      // Arrange
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: true, // Verbose mode
        config: undefined,
        checkUpdates: false,
        update: false,
        track: false,
        steering: true,
      };

      (scanDirectoriesAcrossRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        directories: [
          { path: 'src', displayName: 'src', sha: 'sha1' },
        ],
        truncated: false,
      });

      (promptSubdirSelection as ReturnType<typeof vi.fn>).mockResolvedValue({
        subdir: 'src',
      });

      // Act
      await promptMissingArguments(args, undefined, mockLogger, true);

      // Assert: scanDirectoriesAcrossRepo should receive verbose=true
      expect(scanDirectoriesAcrossRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          verbose: true,
        })
      );
    });
  });

  describe('Requirement 9.7: Tree APIフォールバック処理 (failure handling)', () => {
    it('should fallback to text input prompt on Tree API failure', async () => {
      // Arrange
      const args: ParsedArguments = {
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
        track: false,
        steering: true,
      };

      // Tree API fails
      (scanDirectoriesAcrossRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        directories: [],
        truncated: false,
        errorMessage: 'Repository not found',
      } as DirectoryScanResult);

      // User enters subdirectory via text input
      (input as ReturnType<typeof vi.fn>).mockResolvedValueOnce('manually-entered-subdir');

      // Act
      await promptMissingArguments(args, undefined, mockLogger, false);

      // Assert: promptSubdirSelection should NOT be called on failure
      expect(promptSubdirSelection).not.toHaveBeenCalled();

      // Assert: text input prompt should be called as fallback
      expect(input).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('subdirectory'),
        })
      );
    });

    it('should handle Tree API exception gracefully', async () => {
      // Arrange
      const args: ParsedArguments = {
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
        track: false,
        steering: true,
      };

      // Tree API throws exception
      (scanDirectoriesAcrossRepo as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      // User enters subdirectory via text input
      (input as ReturnType<typeof vi.fn>).mockResolvedValueOnce('fallback-subdir');

      // Act & Assert: Should not throw
      await expect(promptMissingArguments(args, undefined, mockLogger, false)).resolves.toBeDefined();

      // Assert: Fallback to text input prompt
      expect(promptSubdirSelection).not.toHaveBeenCalled();
    });

    it('should display error message on Tree API failure', async () => {
      // Arrange
      const args: ParsedArguments = {
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
        track: false,
        steering: true,
      };

      (scanDirectoriesAcrossRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        directories: [],
        truncated: false,
        errorMessage: 'Authentication error: Please set GITHUB_TOKEN',
      });

      (input as ReturnType<typeof vi.fn>).mockResolvedValueOnce('');

      // Act
      await promptMissingArguments(args, undefined, mockLogger, false);

      // Assert: Error message should be displayed
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Authentication error')
      );
    });
  });

  describe('Requirement 9.9: Tree APIスキップ条件 (skip conditions)', () => {
    it('should skip Tree API when --subdir is already specified', async () => {
      // Arrange
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: 'pre-specified-subdir', // Already specified
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: false,
        steering: true,
      };

      // Act
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      // Assert: Tree API should NOT be called
      expect(scanDirectoriesAcrossRepo).not.toHaveBeenCalled();
      expect(promptSubdirSelection).not.toHaveBeenCalled();

      // Assert: subdir value is preserved
      expect(result.subdir).toBe('pre-specified-subdir');
    });

    it('should skip Tree API when --steering is false (normal mode)', async () => {
      // Arrange
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['my-project'], // Projects required in normal mode
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: false,
        steering: false, // Normal mode
      };

      // Act
      await promptMissingArguments(args, undefined, mockLogger, false);

      // Assert: Tree API should NOT be called in normal mode
      expect(scanDirectoriesAcrossRepo).not.toHaveBeenCalled();
      expect(promptSubdirSelection).not.toHaveBeenCalled();
    });

    it('should skip Tree API when logger is not provided', async () => {
      // Arrange
      const args: ParsedArguments = {
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
        track: false,
        steering: true,
      };

      // Act: No logger provided
      await promptMissingArguments(args, undefined, undefined, false);

      // Assert: Tree API should NOT be called without logger
      expect(scanDirectoriesAcrossRepo).not.toHaveBeenCalled();
    });

    it('should skip Tree API when Octokit initialization fails', async () => {
      // Arrange
      const args: ParsedArguments = {
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
        track: false,
        steering: true,
      };

      // Mock Octokit constructor to throw
      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error('Octokit initialization failed');
      });

      // Act
      await promptMissingArguments(args, undefined, mockLogger, false);

      // Assert: Tree API should NOT be called when client initialization fails
      expect(scanDirectoriesAcrossRepo).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty directory list from Tree API', async () => {
      // Arrange
      const args: ParsedArguments = {
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
        track: false,
        steering: true,
      };

      // Tree API returns empty directory list
      (scanDirectoriesAcrossRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        directories: [], // No directories found
        truncated: false,
      });

      // promptSubdirSelection should still be called with empty array
      (promptSubdirSelection as ReturnType<typeof vi.fn>).mockResolvedValue({
        subdir: '', // User selects root
      });

      // Act
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      // Assert: promptSubdirSelection called with empty array
      expect(promptSubdirSelection).toHaveBeenCalledWith([]);
      expect(result.subdir).toBe('');
    });

    it('should handle truncated Tree API response', async () => {
      // Arrange
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: true,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: false,
        steering: true,
      };

      (scanDirectoriesAcrossRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        directories: [
          { path: 'dir1', displayName: 'dir1', sha: 'sha1' },
        ],
        truncated: true, // Large repository
      });

      (promptSubdirSelection as ReturnType<typeof vi.fn>).mockResolvedValue({
        subdir: 'dir1',
      });

      // Act
      const result = await promptMissingArguments(args, undefined, mockLogger, true);

      // Assert: Should display warning about truncated response
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Some directories may not be shown')
      );
      expect(result.subdir).toBe('dir1');
    });
  });
});
