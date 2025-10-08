/**
 * Interactive Mode Config File Integration Tests
 *
 * Tests config file integration with interactive mode prompts.
 * Task 7.1: 設定ファイルとの統合
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptOutput, promptSubdir, promptMissingArguments } from '../../../src/cli/interactive-prompt.js';
import type { KiroxConfig } from '../../../src/config/types.js';
import type { ParsedArguments } from '../../../src/cli/types.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

describe('Interactive Mode Config File Integration', () => {
  let mockInput: ReturnType<typeof vi.fn>;
  let mockConfirm: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Import mocked functions
    const inquirerPrompts = await import('@inquirer/prompts');
    mockInput = inquirerPrompts.input as ReturnType<typeof vi.fn>;
    mockConfirm = inquirerPrompts.confirm as ReturnType<typeof vi.fn>;

    // Reset mocks
    mockInput.mockReset();
    mockConfirm.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('promptOutput with config file', () => {
    it('should use config file outputDirectory as default', async () => {
      // RED: Test for config file default value
      const configFile: KiroxConfig = {
        outputDirectory: './custom-output',
      };

      // Mock user pressing Enter (accepting default)
      mockInput.mockResolvedValueOnce('./custom-output');

      const result = await promptOutput(configFile);

      expect(result).toBe('./custom-output');
      expect(mockInput).toHaveBeenCalledWith({
        message: 'Enter output directory',
        default: './custom-output',
      });
    });

    it('should use "." as default when config file has no outputDirectory', async () => {
      const configFile: KiroxConfig = {};

      mockInput.mockResolvedValueOnce('.');

      const result = await promptOutput(configFile);

      expect(result).toBe('.');
      expect(mockInput).toHaveBeenCalledWith({
        message: 'Enter output directory',
        default: '.',
      });
    });

    it('should use "." as default when config file is undefined', async () => {
      mockInput.mockResolvedValueOnce('.');

      const result = await promptOutput(undefined);

      expect(result).toBe('.');
      expect(mockInput).toHaveBeenCalledWith({
        message: 'Enter output directory',
        default: '.',
      });
    });

    it('should allow user to override config file default', async () => {
      const configFile: KiroxConfig = {
        outputDirectory: './custom-output',
      };

      // Mock user input to override default
      mockInput.mockResolvedValueOnce('./user-override');

      const result = await promptOutput(configFile);

      expect(result).toBe('./user-override');
      expect(mockInput).toHaveBeenCalledWith({
        message: 'Enter output directory',
        default: './custom-output',
      });
    });
  });

  describe('promptSubdir with config file', () => {
    it('should use config file subdir as default', async () => {
      const configFile: KiroxConfig = {
        subdir: 'lib/components',
      };

      // Mock user pressing Enter (accepting default)
      mockInput.mockResolvedValueOnce('lib/components');

      const result = await promptSubdir(configFile);

      expect(result).toBe('lib/components');
      expect(mockInput).toHaveBeenCalledWith({
        message: 'Enter subdirectory in GitHub repository (optional)',
        default: 'lib/components',
      });
    });

    it('should use empty string as default when config file has no subdir', async () => {
      const configFile: KiroxConfig = {};

      mockInput.mockResolvedValueOnce('');

      const result = await promptSubdir(configFile);

      expect(result).toBeUndefined();
      expect(mockInput).toHaveBeenCalledWith({
        message: 'Enter subdirectory in GitHub repository (optional)',
        default: '',
      });
    });

    it('should use empty string as default when config file is undefined', async () => {
      mockInput.mockResolvedValueOnce('');

      const result = await promptSubdir(undefined);

      expect(result).toBeUndefined();
      expect(mockInput).toHaveBeenCalledWith({
        message: 'Enter subdirectory in GitHub repository (optional)',
        default: '',
      });
    });

    it('should allow user to override config file default', async () => {
      const configFile: KiroxConfig = {
        subdir: 'lib/components',
      };

      // Mock user input to override default
      mockInput.mockResolvedValueOnce('src/custom');

      const result = await promptSubdir(configFile);

      expect(result).toBe('src/custom');
      expect(mockInput).toHaveBeenCalledWith({
        message: 'Enter subdirectory in GitHub repository (optional)',
        default: 'lib/components',
      });
    });

    it('should return undefined when user enters empty string', async () => {
      const configFile: KiroxConfig = {
        subdir: 'lib/components',
      };

      // Mock user clearing the default and entering empty string
      mockInput.mockResolvedValueOnce('   ');

      const result = await promptSubdir(configFile);

      expect(result).toBeUndefined();
    });
  });

  describe('promptMissingArguments with config file', () => {
    it('should pass config file defaults to prompts', async () => {
      const configFile: KiroxConfig = {
        outputDirectory: './config-output',
        subdir: 'config/subdir',
      };

      const args: ParsedArguments = {
        repository: 'owner/repo',
        project: 'my-project',
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        subdir: undefined,
      };

      // Mock prompts
      mockInput.mockResolvedValueOnce('./config-output'); // promptOutput
      mockInput.mockResolvedValueOnce('config/subdir'); // promptSubdir
      mockConfirm.mockResolvedValueOnce(true); // confirmExecution

      const result = await promptMissingArguments(args, configFile);

      expect(result.output).toBe('./config-output');
      expect(result.subdir).toBe('config/subdir');

      // Verify config defaults were used
      expect(mockInput).toHaveBeenNthCalledWith(1, {
        message: 'Enter output directory',
        default: './config-output',
      });
      expect(mockInput).toHaveBeenNthCalledWith(2, {
        message: 'Enter subdirectory in GitHub repository (optional)',
        default: 'config/subdir',
      });
    });

    it('should prioritize user input over config file values', async () => {
      const configFile: KiroxConfig = {
        outputDirectory: './config-output',
        subdir: 'config/subdir',
      };

      const args: ParsedArguments = {
        repository: 'owner/repo',
        project: 'my-project',
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        subdir: undefined,
      };

      // Mock user overriding defaults
      mockInput.mockResolvedValueOnce('./user-output');
      mockInput.mockResolvedValueOnce('user/subdir');
      mockConfirm.mockResolvedValueOnce(true);

      const result = await promptMissingArguments(args, configFile);

      expect(result.output).toBe('./user-output');
      expect(result.subdir).toBe('user/subdir');
    });

    it('should work when config file does not exist', async () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        project: 'my-project',
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        subdir: undefined,
      };

      // Mock prompts without config file
      mockInput.mockResolvedValueOnce('./output');
      mockInput.mockResolvedValueOnce('');
      mockConfirm.mockResolvedValueOnce(true);

      const result = await promptMissingArguments(args, undefined);

      expect(result.output).toBe('./output');
      expect(result.subdir).toBeUndefined();

      // Verify default values were used
      expect(mockInput).toHaveBeenNthCalledWith(1, {
        message: 'Enter output directory',
        default: '.',
      });
      expect(mockInput).toHaveBeenNthCalledWith(2, {
        message: 'Enter subdirectory in GitHub repository (optional)',
        default: '',
      });
    });
  });
});
