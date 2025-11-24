/**
 * Unit tests for Repository Prompt
 *
 * Tests the promptRepository function following TDD RED-GREEN-REFACTOR cycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as inquirer from '@inquirer/prompts';
import type { Metadata } from '../../../../src/tracking/types.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

// Mock validator module
vi.mock('../../../../src/cli/validator.js', () => ({
  validateRepositoryFormat: vi.fn((value: string) => {
    if (!value || value.trim() === '' || !/^[\w-]+\/[\w-]+(?:#[\w/-]+)?$/.test(value)) {
      return [
        {
          field: 'repository',
          message: 'Repository must be in format "owner/repo" (e.g., "facebook/react")',
        },
      ];
    }
    return [];
  }),
}));

describe('promptRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should return current value immediately if non-empty', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      const result = await promptRepository('owner/repo');

      expect(result).toBe('owner/repo');
      expect(inquirer.input).not.toHaveBeenCalled();
    });

    it('should return current value with branch if non-empty', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      const result = await promptRepository('owner/repo#develop');

      expect(result).toBe('owner/repo#develop');
      expect(inquirer.input).not.toHaveBeenCalled();
    });

    it('should skip prompt if value contains only whitespace but treat as empty', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      (inquirer.input as ReturnType<typeof vi.fn>).mockResolvedValue('owner/repo');

      const result = await promptRepository('   ');

      expect(result).toBe('owner/repo');
      expect(inquirer.input).toHaveBeenCalled();
    });
  });

  describe('Interactive prompt', () => {
    it('should display prompt when current value is empty', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      (inquirer.input as ReturnType<typeof vi.fn>).mockResolvedValue('owner/repo');

      const result = await promptRepository('');

      expect(inquirer.input).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('GitHub repository'),
        })
      );
      expect(result).toBe('owner/repo');
    });

    it('should include validation function in prompt config', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      (inquirer.input as ReturnType<typeof vi.fn>).mockResolvedValue('owner/repo');

      await promptRepository('');

      expect(inquirer.input).toHaveBeenCalledWith(
        expect.objectContaining({
          validate: expect.any(Function),
        })
      );
    });
  });

  describe('Metadata default value suggestion', () => {
    it('should suggest last used repository as default when metadata is provided', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      const metadata: Metadata = {
        version: 1,
        projects: [
          {
            repository: 'old/repo',
            projectName: 'old-project',
            lastFetchedAt: '2024-01-01T00:00:00.000Z',
            files: [],
          },
          {
            repository: 'recent/repo',
            projectName: 'recent-project',
            lastFetchedAt: '2024-01-02T00:00:00.000Z',
            files: [],
          },
        ],
      };

      (inquirer.input as ReturnType<typeof vi.fn>).mockResolvedValue('recent/repo');

      await promptRepository('', metadata);

      expect(inquirer.input).toHaveBeenCalledWith(
        expect.objectContaining({
          default: 'recent/repo',
        })
      );
    });

    it('should not include default value when metadata is empty', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      const metadata: Metadata = {
        version: 1,
        projects: [],
      };

      (inquirer.input as ReturnType<typeof vi.fn>).mockResolvedValue('owner/repo');

      await promptRepository('', metadata);

      expect(inquirer.input).toHaveBeenCalledWith(
        expect.not.objectContaining({
          default: expect.anything(),
        })
      );
    });

    it('should not include default value when metadata is not provided', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      (inquirer.input as ReturnType<typeof vi.fn>).mockResolvedValue('owner/repo');

      await promptRepository('');

      expect(inquirer.input).toHaveBeenCalledWith(
        expect.not.objectContaining({
          default: expect.anything(),
        })
      );
    });
  });

  describe('Validation integration', () => {
    it('should use validateRepositoryFormat for validation', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');
      const { validateRepositoryFormat } = await import('../../../../src/cli/validator.js');

      (inquirer.input as ReturnType<typeof vi.fn>).mockResolvedValue('owner/repo');

      await promptRepository('');

      const callArgs = (inquirer.input as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const validateFn = callArgs.validate;

      // Test validation function
      expect(validateFn('owner/repo')).toBe(true);

      const emptyResult = validateFn('');
      expect(typeof emptyResult).toBe('string');
      expect(emptyResult).toContain('Repository must be in format');

      const invalidResult = validateFn('invalid');
      expect(typeof invalidResult).toBe('string');
      expect(invalidResult).toContain('Repository must be in format');
    });
  });

  describe('Emoji integration', () => {
    it('should include emoji prefix in prompt message', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      (inquirer.input as ReturnType<typeof vi.fn>).mockResolvedValue('owner/repo');

      await promptRepository('');

      expect(inquirer.input).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('📦'),
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle repository with branch in metadata', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      const metadata: Metadata = {
        version: 1,
        projects: [
          {
            repository: 'owner/repo#feature/branch',
            projectName: 'project',
            lastFetchedAt: '2024-01-01T00:00:00.000Z',
            files: [],
          },
        ],
      };

      (inquirer.input as ReturnType<typeof vi.fn>).mockResolvedValue('owner/repo#feature/branch');

      await promptRepository('', metadata);

      expect(inquirer.input).toHaveBeenCalledWith(
        expect.objectContaining({
          default: 'owner/repo#feature/branch',
        })
      );
    });

    it('should trim whitespace from current value before checking', async () => {
      const { promptRepository } = await import('../../../../src/cli/prompts/repository-prompt.js');

      const result = await promptRepository('  owner/repo  ');

      expect(result).toBe('  owner/repo  ');
      expect(inquirer.input).not.toHaveBeenCalled();
    });
  });
});
