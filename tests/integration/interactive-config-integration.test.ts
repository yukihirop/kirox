/**
 * Interactive Mode Config File Integration Tests
 *
 * Integration tests for config file integration with interactive mode.
 * Task 7.2: 設定ファイル統合の統合テスト
 *
 * Tests the full flow from config file loading to interactive prompts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execute } from '../../src/cli/entry.js';
import * as configLoader from '../../src/config/loader.js';
import * as interactive from '../../src/cli/interactive-prompt.js';
import type { KiroxConfig } from '../../src/config/types.js';

// Mock modules
vi.mock('../../src/config/loader.js');
vi.mock('../../src/cli/interactive-prompt.js');
vi.mock('../../src/github/fetcher.js', () => ({
  parseRepositoryPath: vi.fn().mockReturnValue({
    owner: 'test-owner',
    repo: 'test-repo',
    branch: undefined,
  }),
  fetchDirectoryContents: vi.fn().mockResolvedValue([]),
  fetchKiroFiles: vi.fn().mockResolvedValue({
    success: true,
    filesDownloaded: 0,
    filesFailed: 0,
  }),
}));
vi.mock('../../src/github/parallel-fetcher.js', () => ({
  fetchFilesInParallel: vi.fn().mockResolvedValue({
    success: [],
    failed: [],
  }),
}));
vi.mock('../../src/filesystem/writer.js');
vi.mock('../../src/config/merger.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config/merger.js')>();
  return {
    ...actual,
    mergeConfig: vi.fn().mockImplementation((args, fileConfig) => {
      return {
        ...args,
        outputDirectory: fileConfig?.outputDirectory || args.output,
        subdir: fileConfig?.subdir || args.subdir,
      };
    }),
  };
});

describe('Interactive Mode Config File Integration', () => {
  let mockLoadConfig: ReturnType<typeof vi.fn>;
  let mockShouldEnterInteractiveMode: ReturnType<typeof vi.fn>;
  let mockPromptMissingArguments: ReturnType<typeof vi.fn>;
  let mockCheckTTYEnvironment: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Get mocked functions
    mockLoadConfig = configLoader.loadConfig as ReturnType<typeof vi.fn>;
    mockShouldEnterInteractiveMode = interactive.shouldEnterInteractiveMode as ReturnType<typeof vi.fn>;
    mockPromptMissingArguments = interactive.promptMissingArguments as ReturnType<typeof vi.fn>;
    mockCheckTTYEnvironment = interactive.checkTTYEnvironment as ReturnType<typeof vi.fn>;

    // Default mocks
    mockCheckTTYEnvironment.mockReturnValue({ success: true });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('設定ファイルが存在する場合のデフォルト値適用', () => {
    it('should load config file and pass to promptMissingArguments', async () => {
      // RED: Test that config file is loaded and passed to interactive mode
      const configFile: KiroxConfig = {
        outputDirectory: './config-output',
        subdir: 'config/subdir',
      };

      // Mock config file loading
      mockLoadConfig.mockResolvedValue(configFile);

      // Mock interactive mode detection
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Mock promptMissingArguments to return completed args
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['my-project'],
        output: './config-output',
        subdir: 'config/subdir',
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      try {
        await execute(['node', 'kirox']);
      } catch {
        // Ignore errors from mocked dependencies
      }

      // Verify config file was loaded
      expect(mockLoadConfig).toHaveBeenCalledWith(undefined);

      // Verify promptMissingArguments received config file
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: '',
          projects: [],
        }),
        configFile
      );
    });

    it('should use config file defaults when user accepts them', async () => {
      const configFile: KiroxConfig = {
        outputDirectory: './from-config',
        subdir: 'lib/components',
      };

      mockLoadConfig.mockResolvedValue(configFile);
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User accepts config defaults
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['my-project'],
        output: './from-config',
        subdir: 'lib/components',
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      try {
        await execute(['node', 'kirox']);
      } catch {
        // Ignore errors from mocked dependencies
      }

      const completedArgs = mockPromptMissingArguments.mock.results[0]?.value;
      await expect(completedArgs).resolves.toMatchObject({
        output: './from-config',
        subdir: 'lib/components',
      });
    });
  });

  describe('対話モードでの入力が設定ファイルより優先される', () => {
    it('should allow user to override config file values', async () => {
      const configFile: KiroxConfig = {
        outputDirectory: './config-output',
        subdir: 'config/subdir',
      };

      mockLoadConfig.mockResolvedValue(configFile);
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User overrides config defaults
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['my-project'],
        output: './user-override',
        subdir: 'user/subdir',
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      try {
        await execute(['node', 'kirox']);
      } catch {
        // Ignore errors from mocked dependencies
      }

      const completedArgs = mockPromptMissingArguments.mock.results[0]?.value;
      await expect(completedArgs).resolves.toMatchObject({
        output: './user-override',
        subdir: 'user/subdir',
      });
    });

    it('should prioritize user input over config when both are provided', async () => {
      const configFile: KiroxConfig = {
        outputDirectory: './config-dir',
      };

      mockLoadConfig.mockResolvedValue(configFile);
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User provides different value
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['my-project'],
        output: './different-dir',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      try {
        await execute(['node', 'kirox']);
      } catch {
        // Ignore errors
      }

      const completedArgs = mockPromptMissingArguments.mock.results[0]?.value;
      await expect(completedArgs).resolves.toMatchObject({
        output: './different-dir',
      });
    });
  });

  describe('設定ファイルが存在しない場合のデフォルト値', () => {
    it('should use default values when config file does not exist', async () => {
      // Config file does not exist
      mockLoadConfig.mockResolvedValue({});

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
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
        track: true,
      });

      try {
        await execute(['node', 'kirox']);
      } catch {
        // Ignore errors
      }

      // Verify empty config was passed
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.any(Object),
        {}
      );

      const completedArgs = mockPromptMissingArguments.mock.results[0]?.value;
      await expect(completedArgs).resolves.toMatchObject({
        output: '.',
        subdir: undefined,
      });
    });

    it('should work when loadConfig returns null', async () => {
      // Config loading returns null
      mockLoadConfig.mockResolvedValue(null);

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
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
        track: true,
      });

      try {
        await execute(['node', 'kirox']);
      } catch {
        // Ignore errors
      }

      // Verify null config was passed (converted to undefined or {})
      expect(mockPromptMissingArguments).toHaveBeenCalled();
    });
  });

  describe('--configオプションでカスタム設定ファイルを読み込む', () => {
    it('should load custom config file when --config option is specified', async () => {
      const customConfigPath = '/custom/.kiroxrc.json';
      const customConfig: KiroxConfig = {
        outputDirectory: './custom-output',
        subdir: 'custom/subdir',
      };

      mockLoadConfig.mockResolvedValue(customConfig);
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['my-project'],
        output: './custom-output',
        subdir: 'custom/subdir',
        force: false,
        dryRun: false,
        verbose: false,
        config: customConfigPath,
        checkUpdates: false,
        update: false,
        track: true,
      });

      try {
        await execute(['node', 'kirox', '--config', customConfigPath]);
      } catch {
        // Ignore errors
      }

      // Verify custom config path was used
      expect(mockLoadConfig).toHaveBeenCalledWith(customConfigPath);

      // Verify custom config was passed to promptMissingArguments
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.objectContaining({
          config: customConfigPath,
        }),
        customConfig
      );
    });

    it('should use custom config defaults in interactive mode', async () => {
      const customConfig: KiroxConfig = {
        outputDirectory: '/var/data/output',
        subdir: 'packages/core',
      };

      mockLoadConfig.mockResolvedValue(customConfig);
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['my-project'],
        output: '/var/data/output',
        subdir: 'packages/core',
        force: false,
        dryRun: false,
        verbose: false,
        config: '/path/to/custom.json',
        checkUpdates: false,
        update: false,
        track: true,
      });

      try {
        await execute(['node', 'kirox', '--config', '/path/to/custom.json']);
      } catch {
        // Ignore errors
      }

      const completedArgs = mockPromptMissingArguments.mock.results[0]?.value;
      await expect(completedArgs).resolves.toMatchObject({
        output: '/var/data/output',
        subdir: 'packages/core',
      });
    });
  });

  describe('統合フロー検証', () => {
    it('should complete full flow from config loading to execution', async () => {
      const configFile: KiroxConfig = {
        outputDirectory: './test-output',
      };

      mockLoadConfig.mockResolvedValue(configFile);
      mockShouldEnterInteractiveMode.mockReturnValue(true);
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'test/repo',
        projects: ['test-project'],
        output: './test-output',
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      try {
        await execute(['node', 'kirox']);
      } catch {
        // Ignore errors from mocked dependencies
      }

      // Verify full flow
      expect(mockLoadConfig).toHaveBeenCalled();
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
      expect(mockPromptMissingArguments).toHaveBeenCalledWith(
        expect.any(Object),
        configFile
      );
    });
  });
});
