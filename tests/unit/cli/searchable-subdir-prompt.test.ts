/**
 * Unit tests for SubdirectoryPromptService (Task 9.2)
 * Requirements: 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DirectoryLocation } from '../../../src/github/tree-based-dir-scanner.js';
import {
  promptSubdirSelection,
  type SubdirSelectionResult,
} from '../../../src/cli/searchable-subdir-prompt.js';

// Mock searchable-checkbox
vi.mock('../../../src/cli/prompts/searchable-checkbox.js', () => ({
  default: vi.fn(),
}));

// Import after mock setup
import searchableCheckbox from '../../../src/cli/prompts/searchable-checkbox.js';

describe('SubdirectoryPromptService (Task 9.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Root directory option (Requirement 9.3)', () => {
    it('should include root directory option in choices', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
        { path: 'lib', displayName: 'lib', sha: 'sha2' },
      ];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['(root)']);

      // Act
      await promptSubdirSelection(directories);

      // Assert
      expect(searchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({ value: '(root)' }),
          ]),
        })
      );
    });

    it('should return empty string when root is selected (Requirement 9.3)', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['(root)']);

      // Act
      const result: SubdirSelectionResult = await promptSubdirSelection(directories);

      // Assert
      expect(result.subdir).toBe('');
    });
  });

  describe('Directory sorting (Requirement 9.5)', () => {
    it('should sort directories with root first, then alphabetically', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src/cli', displayName: 'src/cli', sha: 'sha1' },
        { path: 'lib', displayName: 'lib', sha: 'sha2' },
        { path: 'src', displayName: 'src', sha: 'sha3' },
      ];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['src']);

      // Act
      await promptSubdirSelection(directories);

      // Assert
      const callArgs = (searchableCheckbox as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      const choices = callArgs.choices;

      // Root should be first
      expect(choices[0]!.value).toBe('(root)');

      // Then directories in alphabetical order
      expect(choices[1]!.value).toBe('lib');
      expect(choices[2]!.value).toBe('src');
      expect(choices[3]!.value).toBe('src/cli');
    });
  });

  describe('Directory selection (Requirement 9.6)', () => {
    it('should return selected directory path', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
        { path: 'lib', displayName: 'lib', sha: 'sha2' },
      ];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['src']);

      // Act
      const result: SubdirSelectionResult = await promptSubdirSelection(directories);

      // Assert
      expect(result.subdir).toBe('src');
    });

    it('should handle nested directory selection', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src/cli', displayName: 'src/cli', sha: 'sha1' },
        { path: 'src/github', displayName: 'src/github', sha: 'sha2' },
      ];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['src/github']);

      // Act
      const result: SubdirSelectionResult = await promptSubdirSelection(directories);

      // Assert
      expect(result.subdir).toBe('src/github');
    });
  });

  describe('Validation (Requirement 9.6)', () => {
    it('should display validation error when no directory is selected', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      // Mock validator to be called
      let validatorFn: ((choices: any[]) => string | boolean) | undefined;
      (searchableCheckbox as ReturnType<typeof vi.fn>).mockImplementationOnce((config) => {
        validatorFn = config.validate;
        return Promise.resolve(['src']);
      });

      // Act
      await promptSubdirSelection(directories);

      // Assert
      expect(validatorFn).toBeDefined();
      const validationResult = validatorFn!([]);
      expect(typeof validationResult).toBe('string');
      expect(validationResult).toContain('select a subdirectory');
    });

    it('should display validation error when multiple directories are selected', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
        { path: 'lib', displayName: 'lib', sha: 'sha2' },
      ];

      // Mock validator to be called
      let validatorFn: ((choices: any[]) => string | boolean) | undefined;
      (searchableCheckbox as ReturnType<typeof vi.fn>).mockImplementationOnce((config) => {
        validatorFn = config.validate;
        return Promise.resolve(['src']);
      });

      // Act
      await promptSubdirSelection(directories);

      // Assert
      expect(validatorFn).toBeDefined();
      const validationResult = validatorFn!(['src', 'lib']);
      expect(typeof validationResult).toBe('string');
      expect(validationResult).toContain('only one subdirectory');
    });

    it('should return true when exactly one directory is selected', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      // Mock validator to be called
      let validatorFn: ((choices: any[]) => string | boolean) | undefined;
      (searchableCheckbox as ReturnType<typeof vi.fn>).mockImplementationOnce((config) => {
        validatorFn = config.validate;
        return Promise.resolve(['src']);
      });

      // Act
      await promptSubdirSelection(directories);

      // Assert
      expect(validatorFn).toBeDefined();
      const validationResult = validatorFn!(['src']);
      expect(validationResult).toBe(true);
    });
  });

  describe('UI message (Requirement 9.5)', () => {
    it('should display searchable UI message similar to project selection', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['src']);

      // Act
      await promptSubdirSelection(directories);

      // Assert
      const callArgs = (searchableCheckbox as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(callArgs.message).toContain('📁 Select subdirectory');
      expect(callArgs.message).toContain('type to filter');
      expect(callArgs.message).toContain('space to select');
      expect(callArgs.message).toContain('enter to confirm');
    });

    it('should configure pageSize and loop options', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src', displayName: 'src', sha: 'sha1' },
      ];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['src']);

      // Act
      await promptSubdirSelection(directories);

      // Assert
      const callArgs = (searchableCheckbox as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(callArgs.pageSize).toBe(10);
      expect(callArgs.loop).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty directory list with only root option', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['(root)']);

      // Act
      const result: SubdirSelectionResult = await promptSubdirSelection(directories);

      // Assert
      expect(result.subdir).toBe('');
    });

    it('should handle directory path with special characters', async () => {
      // Arrange
      const directories: DirectoryLocation[] = [
        { path: 'src-v2', displayName: 'src-v2', sha: 'sha1' },
        { path: 'lib_test', displayName: 'lib_test', sha: 'sha2' },
      ];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['src-v2']);

      // Act
      const result: SubdirSelectionResult = await promptSubdirSelection(directories);

      // Assert
      expect(result.subdir).toBe('src-v2');
    });
  });

  describe('Bug fix: Root duplication (Task 11.1)', () => {
    it('should not duplicate root option when directories already contains root', async () => {
      // Arrange: directories array already contains root (path: '')
      const directories: DirectoryLocation[] = [
        { path: '', displayName: '(root)', sha: '' },
        { path: 'lib/a', displayName: 'lib/a', sha: 'sha1' },
        { path: 'lib/sample', displayName: 'lib/sample', sha: 'sha2' },
      ];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['lib/a']);

      // Act
      await promptSubdirSelection(directories);

      // Assert: choices should have exactly one root option
      const callArgs = (searchableCheckbox as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      const choices = callArgs.choices;

      // Count how many times "(root)" appears
      const rootCount = choices.filter((choice: any) => choice.value === '(root)').length;
      expect(rootCount).toBe(1);

      // Verify total choices count (should be 3, not 4)
      expect(choices.length).toBe(3);

      // Verify order: root first, then alphabetically
      expect(choices[0]!.value).toBe('(root)');
      expect(choices[1]!.value).toBe('lib/a');
      expect(choices[2]!.value).toBe('lib/sample');
    });

    it('should add root option when directories does not contain root', async () => {
      // Arrange: directories array does NOT contain root
      const directories: DirectoryLocation[] = [
        { path: 'lib/a', displayName: 'lib/a', sha: 'sha1' },
        { path: 'lib/sample', displayName: 'lib/sample', sha: 'sha2' },
      ];

      (searchableCheckbox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['lib/a']);

      // Act
      await promptSubdirSelection(directories);

      // Assert: choices should have exactly one root option added
      const callArgs = (searchableCheckbox as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      const choices = callArgs.choices;

      // Count how many times "(root)" appears
      const rootCount = choices.filter((choice: any) => choice.value === '(root)').length;
      expect(rootCount).toBe(1);

      // Verify total choices count (should be 3: root + 2 dirs)
      expect(choices.length).toBe(3);

      // Verify order: root first, then alphabetically
      expect(choices[0]!.value).toBe('(root)');
      expect(choices[1]!.value).toBe('lib/a');
      expect(choices[2]!.value).toBe('lib/sample');
    });
  });
});
