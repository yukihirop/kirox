/**
 * Unit tests for Branch Prompt
 *
 * Tests the promptBranch function following TDD RED-GREEN-REFACTOR cycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock searchable-checkbox
vi.mock('../../../../src/cli/prompts/searchable-checkbox.js', () => ({
  default: vi.fn(),
}));

describe('promptBranch', () => {
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
    it('should display searchable checkbox with branch choices', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main', 'develop', 'feature/auth'];
      mockSearchableCheckbox.mockResolvedValue(['main']);

      await promptBranch(branches);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Select branch'),
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'main' }),
            expect.objectContaining({ value: 'develop' }),
            expect.objectContaining({ value: 'feature/auth' }),
          ]),
        })
      );
    });

    it('should return selected branch name', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main', 'develop'];
      mockSearchableCheckbox.mockResolvedValue(['develop']);

      const result = await promptBranch(branches);

      expect(result).toBe('develop');
    });

    it('should return undefined when no branch is selected', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main', 'develop'];
      mockSearchableCheckbox.mockResolvedValue([]);

      const result = await promptBranch(branches);

      expect(result).toBeUndefined();
    });
  });

  describe('Default branch handling', () => {
    it('should sort default branch first', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['develop', 'main', 'feature/auth'];
      const defaultBranch = 'main';

      mockSearchableCheckbox.mockResolvedValue(['main']);

      await promptBranch(branches, defaultBranch);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      // Default branch should be first
      expect(choices[0].value).toBe('main');
    });

    it('should label default branch with "(default)" suffix', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main', 'develop'];
      const defaultBranch = 'main';

      mockSearchableCheckbox.mockResolvedValue(['main']);

      await promptBranch(branches, defaultBranch);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      // Default branch choice should contain "(default)"
      const mainChoice = choices.find((c: { value: string }) => c.value === 'main');
      expect(mainChoice.name).toContain('(default)');
    });

    it('should not label non-default branches', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main', 'develop'];
      const defaultBranch = 'main';

      mockSearchableCheckbox.mockResolvedValue(['develop']);

      await promptBranch(branches, defaultBranch);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      // Non-default branch should not contain "(default)"
      const developChoice = choices.find((c: { value: string }) => c.value === 'develop');
      expect(developChoice.name).not.toContain('(default)');
    });
  });

  describe('Branch sorting', () => {
    it('should sort non-default branches alphabetically', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['zebra', 'alpha', 'beta'];
      mockSearchableCheckbox.mockResolvedValue(['alpha']);

      await promptBranch(branches);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      expect(choices[0].value).toBe('alpha');
      expect(choices[1].value).toBe('beta');
      expect(choices[2].value).toBe('zebra');
    });

    it('should sort default branch first, then others alphabetically', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['zebra', 'alpha', 'beta'];
      const defaultBranch = 'beta';

      mockSearchableCheckbox.mockResolvedValue(['beta']);

      await promptBranch(branches, defaultBranch);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      expect(choices[0].value).toBe('beta'); // Default first
      expect(choices[1].value).toBe('alpha'); // Then alphabetically
      expect(choices[2].value).toBe('zebra');
    });
  });

  describe('Validation', () => {
    it('should include validation function in prompt config', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main'];
      mockSearchableCheckbox.mockResolvedValue(['main']);

      await promptBranch(branches);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          validate: expect.any(Function),
        })
      );
    });

    it('should allow zero selections (use default)', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main'];
      mockSearchableCheckbox.mockResolvedValue(['main']);

      await promptBranch(branches);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const validateFn = callArgs.validate;

      // Zero selections should be valid
      expect(validateFn([])).toBe(true);
    });

    it('should allow one selection', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main'];
      mockSearchableCheckbox.mockResolvedValue(['main']);

      await promptBranch(branches);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const validateFn = callArgs.validate;

      // One selection should be valid
      expect(validateFn([{ value: 'main', name: 'main' }])).toBe(true);
    });

    it('should reject multiple selections', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main', 'develop'];
      mockSearchableCheckbox.mockResolvedValue(['main']);

      await promptBranch(branches);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const validateFn = callArgs.validate;

      // Multiple selections should be invalid
      const result = validateFn([
        { value: 'main', name: 'main' },
        { value: 'develop', name: 'develop' },
      ]);

      expect(typeof result).toBe('string');
      expect(result).toContain('only one');
    });
  });

  describe('Emoji integration', () => {
    it('should include emoji prefix in prompt message', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main'];
      mockSearchableCheckbox.mockResolvedValue(['main']);

      await promptBranch(branches);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('🌿'),
        })
      );
    });
  });

  describe('UI configuration', () => {
    it('should configure pageSize and loop options', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main'];
      mockSearchableCheckbox.mockResolvedValue(['main']);

      await promptBranch(branches);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 10,
          loop: true,
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle branches with slashes', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['feature/auth', 'feature/api', 'main'];
      mockSearchableCheckbox.mockResolvedValue(['feature/auth']);

      const result = await promptBranch(branches);

      expect(result).toBe('feature/auth');
    });

    it('should handle single branch', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main'];
      mockSearchableCheckbox.mockResolvedValue(['main']);

      const result = await promptBranch(branches);

      expect(result).toBe('main');
    });

    it('should handle no default branch specified', async () => {
      const { promptBranch } = await import('../../../../src/cli/prompts/branch-prompt.js');

      const branches = ['main', 'develop'];
      mockSearchableCheckbox.mockResolvedValue(['main']);

      await promptBranch(branches); // No defaultBranch parameter

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      // Without default, all branches should be plain (no "(default)" suffix)
      choices.forEach((choice: { name: string }) => {
        expect(choice.name).not.toContain('(default)');
      });
    });
  });
});
