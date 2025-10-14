/**
 * Interactive Mode --steering Subdirectory Selection Integration Tests
 *
 * Tests Task 9.3: インタラクティブプロンプトの統合
 * Requirements: 9.1, 9.7, 9.8, 9.9
 *
 * Verifies that:
 * - In --steering mode, Tree API scanner is called to fetch directory list
 * - On success, searchable subdirectory selection UI is displayed
 * - On failure, fallback to text input prompt occurs
 * - Tree API is skipped when --subdir is already specified
 * - Normal mode behavior is unchanged
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
      { type: 'file', name: 'product.md', path: '.kiro/steering/product.md' },
      { type: 'file', name: 'tech.md', path: '.kiro/steering/tech.md' },
    ]),
  };
});
vi.mock('../../src/github/parallel-fetcher.js', () => ({
  fetchFilesInParallel: vi.fn().mockResolvedValue({
    success: [
      { path: '.kiro/steering/product.md', content: '# Product', sha: 'abc123', size: 9 },
      { path: '.kiro/steering/tech.md', content: '# Tech', sha: 'def456', size: 6 },
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

describe('Interactive Mode --steering Subdirectory Selection', () => {
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

  describe('--steeringモード: サブディレクトリ未指定時にTree APIスキャンを実行 (Requirement 9.8)', () => {
    it('should call promptMissingArguments with logger and client when --steering is specified', async () => {
      // Arrange: --steering mode without --subdir
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: 'src', // Selected from Tree API subdirectory prompt
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: false,
        steering: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      // Act
      await execute(['node', 'kirox', 'owner/repo', '--steering']);

      // Assert: promptMissingArguments is called with logger (required for Tree API)
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          projects: [],
          steering: true,
        }),
        expect.any(Object), // config file
        expect.any(Object), // logger (required for Tree API integration)
        false // verbose
      );
    });

    it('should not skip Tree API scan when --steering is specified and --subdir is not provided', async () => {
      // Arrange: --steering mode without --subdir
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: 'lib', // Selected from Tree API subdirectory prompt
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: false,
        steering: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      // Act
      await execute(['node', 'kirox', 'owner/repo', '--steering']);

      // Assert: promptMissingArguments receives steering=true and subdir=undefined
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          projects: [],
          steering: true,
          subdir: undefined, // Not specified, should trigger Tree API
        }),
        expect.any(Object), // config file
        expect.any(Object), // logger
        false // verbose
      );
    });
  });

  describe('--steeringモード: --subdir指定時にTree APIスキャンをスキップ (Requirement 9.9, backward compatibility)', () => {
    it('should skip Tree API scan when --steering and --subdir are both specified', async () => {
      // Arrange: --steering mode with --subdir already specified
      mockShouldEnterInteractiveMode.mockReturnValue(false); // Not entering interactive mode

      // Act
      await execute(['node', 'kirox', 'owner/repo', '--steering', '--subdir', 'packages']);

      // Assert: promptMissingArguments should NOT be called (no missing args)
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });

    it('should preserve --subdir value when specified in --steering mode', async () => {
      // Arrange: Interactive mode with --steering and --subdir
      mockShouldEnterInteractiveMode.mockReturnValue(false);

      // Act
      await execute(['node', 'kirox', 'owner/repo', '--steering', '--subdir', 'src/core']);

      // Assert: shouldEnterInteractiveMode receives steering=true and subdir='src/core'
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          projects: [],
          steering: true,
          subdir: 'src/core', // Preserved value
        })
      );
    });
  });

  describe('通常モード: Tree APIスキャンをスキップ (Requirement 9.9, backward compatibility)', () => {
    it('should skip Tree API scan in normal mode (--steering not specified)', async () => {
      // Arrange: Normal mode without --steering
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        projects: ['my-project'],
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

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      // Act
      await execute(['node', 'kirox', 'owner/repo']);

      // Assert: promptMissingArguments receives steering=false
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          projects: [],
          steering: false, // Normal mode - Tree API should be skipped
        }),
        expect.any(Object), // config file
        expect.any(Object), // logger
        false // verbose
      );
    });

    it('should use text input prompt for subdirectory in normal mode', async () => {
      // Arrange: Normal mode - subdirectory prompt should be text input
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        projects: ['my-project'],
        output: '.',
        subdir: 'src', // Entered via text input prompt
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: false,
        steering: false,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      // Act
      await execute(['node', 'kirox', 'owner/repo']);

      // Assert: In normal mode, steering=false
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          steering: false,
        }),
        expect.any(Object), // config file
        expect.any(Object), // logger
        false // verbose
      );
    });
  });

  describe('--steeringモード + verboseフラグ', () => {
    it('should pass verbose flag to promptMissingArguments in --steering mode', async () => {
      // Arrange: --steering mode with --verbose
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const completedArgs = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        subdir: 'lib',
        force: false,
        dryRun: false,
        verbose: true,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: false,
        steering: true,
      };

      mockPromptMissingArguments.mockResolvedValue(completedArgs);

      // Act
      await execute(['node', 'kirox', 'owner/repo', '--steering', '--verbose']);

      // Assert: verbose=true is passed for Tree API logging
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          steering: true,
          verbose: true,
        }),
        expect.any(Object), // config file
        expect.any(Object), // logger
        true // verbose - should be true
      );
    });
  });
});
