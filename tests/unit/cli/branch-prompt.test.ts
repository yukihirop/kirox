import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptBranch } from '@/cli/branch-prompt';

// Mock the searchable-checkbox module
vi.mock('@/cli/prompts/searchable-checkbox.js', () => ({
  default: vi.fn(),
}));

import searchableCheckbox from '@/cli/prompts/searchable-checkbox.js';

describe('promptBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Branch selection', () => {
    it('should return selected branch name', async () => {
      // Mock user selecting "develop"
      vi.mocked(searchableCheckbox).mockResolvedValue(['develop']);

      const branches = ['main', 'develop', 'feature/auth'];
      const result = await promptBranch(branches, 'main');

      expect(result).toBe('develop');
    });

    it('should return undefined when no branch selected (0 selections)', async () => {
      // Mock user pressing Enter without selecting anything
      vi.mocked(searchableCheckbox).mockResolvedValue([]);

      const branches = ['main', 'develop'];
      const result = await promptBranch(branches, 'main');

      expect(result).toBeUndefined();
    });
  });

  describe('Default branch labeling', () => {
    it('should add "(default)" label to default branch', async () => {
      vi.mocked(searchableCheckbox).mockResolvedValue(['main']);

      const branches = ['main', 'develop'];
      await promptBranch(branches, 'main');

      expect(searchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [
            { value: 'main', name: 'main (default)' },
            { value: 'develop', name: 'develop' },
          ],
        })
      );
    });

    it('should not add "(default)" label when no default branch provided', async () => {
      vi.mocked(searchableCheckbox).mockResolvedValue(['main']);

      const branches = ['main', 'develop'];
      await promptBranch(branches, undefined);

      expect(searchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [
            { value: 'develop', name: 'develop' },
            { value: 'main', name: 'main' },
          ],
        })
      );
    });
  });

  describe('Branch sorting', () => {
    it('should sort branches with default first, others alphabetically', async () => {
      vi.mocked(searchableCheckbox).mockResolvedValue(['main']);

      const branches = ['feature/auth', 'main', 'develop', 'bugfix/123'];
      await promptBranch(branches, 'main');

      expect(searchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [
            { value: 'main', name: 'main (default)' },
            { value: 'bugfix/123', name: 'bugfix/123' },
            { value: 'develop', name: 'develop' },
            { value: 'feature/auth', name: 'feature/auth' },
          ],
        })
      );
    });

    it('should sort all branches alphabetically when no default specified', async () => {
      vi.mocked(searchableCheckbox).mockResolvedValue(['develop']);

      const branches = ['zeta', 'alpha', 'beta'];
      await promptBranch(branches, undefined);

      expect(searchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [
            { value: 'alpha', name: 'alpha' },
            { value: 'beta', name: 'beta' },
            { value: 'zeta', name: 'zeta' },
          ],
        })
      );
    });
  });

  describe('Validation', () => {
    it('should accept 0 selections (returns true)', async () => {
      vi.mocked(searchableCheckbox).mockResolvedValue([]);

      const branches = ['main', 'develop'];
      await promptBranch(branches, 'main');

      const callArgs = vi.mocked(searchableCheckbox).mock.calls[0][0];
      const validateFn = callArgs.validate;

      // Test validation with 0 selections
      const result = validateFn?.([]);
      expect(result).toBe(true);
    });

    it('should accept 1 selection (returns true)', async () => {
      vi.mocked(searchableCheckbox).mockResolvedValue(['main']);

      const branches = ['main', 'develop'];
      await promptBranch(branches, 'main');

      const callArgs = vi.mocked(searchableCheckbox).mock.calls[0][0];
      const validateFn = callArgs.validate;

      // Test validation with 1 selection
      const result = validateFn?.([{ value: 'main', name: 'main (default)' }]);
      expect(result).toBe(true);
    });

    it('should reject multiple selections with error message', async () => {
      vi.mocked(searchableCheckbox).mockResolvedValue(['main']);

      const branches = ['main', 'develop', 'feature/auth'];
      await promptBranch(branches, 'main');

      const callArgs = vi.mocked(searchableCheckbox).mock.calls[0][0];
      const validateFn = callArgs.validate;

      // Test validation with 2 selections
      const result = validateFn?.([
        { value: 'main', name: 'main (default)' },
        { value: 'develop', name: 'develop' },
      ]);
      expect(result).toBe('Please select only one branch');
    });
  });

  describe('UI Configuration', () => {
    it('should use correct prompt message', async () => {
      vi.mocked(searchableCheckbox).mockResolvedValue(['main']);

      const branches = ['main'];
      await promptBranch(branches, 'main');

      expect(searchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select branch (type to filter, space to select, enter to confirm):',
        })
      );
    });

    it('should configure pageSize and loop options', async () => {
      vi.mocked(searchableCheckbox).mockResolvedValue(['main']);

      const branches = ['main'];
      await promptBranch(branches, 'main');

      expect(searchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 10,
          loop: true,
        })
      );
    });
  });
});
