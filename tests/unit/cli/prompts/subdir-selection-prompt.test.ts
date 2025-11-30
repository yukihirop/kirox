/**
 * Unit tests for Subdirectory Selection Prompt
 *
 * Tests the promptSubdirSelection function following TDD RED-GREEN-REFACTOR cycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DirectoryLocation } from '../../../../src/github/tree-based-dir-scanner.js';

// Mock searchable-checkbox
vi.mock('../../../../src/cli/prompts/searchable-checkbox.js', () => ({
  default: vi.fn(),
}));

describe('promptSubdirSelection', () => {
  let mockSearchableCheckbox: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const module = await import('../../../../src/cli/prompts/searchable-checkbox.js');
    mockSearchableCheckbox = module.default as ReturnType<typeof vi.fn>;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should display searchable checkbox with directory choices', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
        { path: 'lib', displayName: 'lib', sha: 'sha2' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['src']);

      await promptSubdirSelection(directories);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Select subdirectory'),
          choices: expect.arrayContaining([
            expect.objectContaining({ value: '(root)', name: '(root)' }),
            expect.objectContaining({ value: 'lib', name: 'lib' }),
            expect.objectContaining({ value: 'src', name: 'src' }),
          ]),
        })
      );
    });

    it('should return selected subdirectory path', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['src']);

      const result = await promptSubdirSelection(directories);

      expect(result).toEqual({ subdir: 'src' });
    });
  });

  describe('Root directory handling', () => {
    it('should always include root directory option', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['(root)']);

      await promptSubdirSelection(directories);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      // Root should be in choices
      expect(choices.some((c: { value: string }) => c.value === '(root)')).toBe(true);
    });

    it('should return empty string when root is selected', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['(root)']);

      const result = await promptSubdirSelection(directories);

      expect(result).toEqual({ subdir: '' });
    });

    it('should not duplicate root if already in directories', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: '', displayName: '(root)', sha: '' },
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['(root)']);

      await promptSubdirSelection(directories);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      // Count root occurrences
      const rootCount = choices.filter((c: { value: string }) => c.value === '(root)').length;
      expect(rootCount).toBe(1);
    });
  });

  describe('Directory sorting', () => {
    it('should sort root first, then others alphabetically', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'zebra', displayName: 'zebra', sha: 'sha3' },
        { path: 'alpha', displayName: 'alpha', sha: 'sha1' },
        { path: 'beta', displayName: 'beta', sha: 'sha2' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['(root)']);

      await promptSubdirSelection(directories);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      expect(choices[0].value).toBe('(root)');
      expect(choices[1].value).toBe('alpha');
      expect(choices[2].value).toBe('beta');
      expect(choices[3].value).toBe('zebra');
    });
  });

  describe('Validation', () => {
    it('should include validation function in prompt config', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['src']);

      await promptSubdirSelection(directories);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          validate: expect.any(Function),
        })
      );
    });

    it('should require exactly one selection', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['src']);

      await promptSubdirSelection(directories);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const validateFn = callArgs.validate;

      // Zero selections should be invalid
      const emptyResult = validateFn([]);
      expect(typeof emptyResult).toBe('string');
      expect(emptyResult).toContain('select a subdirectory');

      // One selection should be valid
      expect(validateFn([{ value: 'src', name: 'src' }])).toBe(true);

      // Multiple selections should be invalid
      const multipleResult = validateFn([
        { value: 'src', name: 'src' },
        { value: 'lib', name: 'lib' },
      ]);
      expect(typeof multipleResult).toBe('string');
      expect(multipleResult).toContain('only one');
    });
  });

  describe('Emoji integration', () => {
    it('should include emoji prefix in prompt message', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['src']);

      await promptSubdirSelection(directories);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('📁'),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should throw error when invalid directory is selected', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      // Mock returns displayName that doesn't exist
      mockSearchableCheckbox.mockResolvedValue(['non-existent']);

      await expect(promptSubdirSelection(directories)).rejects.toThrow(
        'Invalid directory selection'
      );
    });
  });

  describe('UI configuration', () => {
    it('should configure pageSize and loop options', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['src']);

      await promptSubdirSelection(directories);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 10,
          loop: true,
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty directory list', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [];

      mockSearchableCheckbox.mockResolvedValue(['(root)']);

      const result = await promptSubdirSelection(directories);

      expect(result).toEqual({ subdir: '' });
    });

    it('should handle directories with slashes', async () => {
      const { promptSubdirSelection } = await import(
        '../../../../src/cli/prompts/subdir-selection-prompt.js'
      );

      const directories: DirectoryLocation[] = [
        { path: 'src/cli', displayName: 'src/cli', sha: 'sha1' },
        { path: 'src/lib', displayName: 'src/lib', sha: 'sha2' },
      ];

      mockSearchableCheckbox.mockResolvedValue(['src/cli']);

      const result = await promptSubdirSelection(directories);

      expect(result).toEqual({ subdir: 'src/cli' });
    });
  });
});
