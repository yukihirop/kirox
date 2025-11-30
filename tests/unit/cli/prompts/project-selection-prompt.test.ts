/**
 * Unit tests for Project Selection Prompt
 *
 * Tests the promptProjectSelection function following TDD RED-GREEN-REFACTOR cycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ProjectLocation } from '../../../../src/github/project-location-builder.js';

// Mock searchable-checkbox
vi.mock('../../../../src/cli/prompts/searchable-checkbox.js', () => ({
  default: vi.fn(),
}));

describe('promptProjectSelection', () => {
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
    it('should display searchable checkbox with project choices', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'project-a',
          subdir: '',
          displayName: 'project-a',
          directoryPath: '.kiro/specs/project-a',
        },
        {
          name: 'project-b',
          subdir: 'lib',
          displayName: 'lib/project-b',
          directoryPath: '.kiro/specs/project-b',
        },
      ];

      mockSearchableCheckbox.mockResolvedValue(['project-a']);

      await promptProjectSelection(projectLocations);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Select projects'),
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'project-a', name: 'project-a' }),
            expect.objectContaining({ value: 'lib/project-b', name: 'lib/project-b' }),
          ]),
        })
      );
    });

    it('should return selected projects with subdirectory', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'project-a',
          subdir: '',
          displayName: 'project-a',
          directoryPath: '.kiro/specs/project-a',
        },
      ];

      mockSearchableCheckbox.mockResolvedValue(['project-a']);

      const result = await promptProjectSelection(projectLocations);

      expect(result).toEqual({
        projects: ['project-a'],
        subdir: '',
      });
    });
  });

  describe('Project sorting', () => {
    it('should sort root projects first, then subdirectory projects', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'sub-project',
          subdir: 'lib/a',
          displayName: 'lib/a/sub-project',
          directoryPath: '.kiro/specs/sub-project',
        },
        {
          name: 'root-project',
          subdir: '',
          displayName: 'root-project',
          directoryPath: '.kiro/specs/root-project',
        },
      ];

      mockSearchableCheckbox.mockResolvedValue(['root-project']);

      await promptProjectSelection(projectLocations);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      // Root project should appear first
      expect(choices[0].value).toBe('root-project');
      expect(choices[1].value).toBe('lib/a/sub-project');
    });

    it('should sort projects alphabetically within same level', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'zebra',
          subdir: '',
          displayName: 'zebra',
          directoryPath: '.kiro/specs/zebra',
        },
        {
          name: 'alpha',
          subdir: '',
          displayName: 'alpha',
          directoryPath: '.kiro/specs/alpha',
        },
      ];

      mockSearchableCheckbox.mockResolvedValue(['alpha']);

      await promptProjectSelection(projectLocations);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const choices = callArgs.choices;

      expect(choices[0].value).toBe('alpha');
      expect(choices[1].value).toBe('zebra');
    });
  });

  describe('Multiple project selection', () => {
    it('should allow selecting multiple projects from same subdirectory', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'project-a',
          subdir: 'lib',
          displayName: 'lib/project-a',
          directoryPath: '.kiro/specs/project-a',
        },
        {
          name: 'project-b',
          subdir: 'lib',
          displayName: 'lib/project-b',
          directoryPath: '.kiro/specs/project-b',
        },
      ];

      mockSearchableCheckbox.mockResolvedValue(['lib/project-a', 'lib/project-b']);

      const result = await promptProjectSelection(projectLocations);

      expect(result).toEqual({
        projects: ['project-a', 'project-b'],
        subdir: 'lib',
      });
    });
  });

  describe('Validation', () => {
    it('should include validation function in prompt config', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'project-a',
          subdir: '',
          displayName: 'project-a',
          directoryPath: '.kiro/specs/project-a',
        },
      ];

      mockSearchableCheckbox.mockResolvedValue(['project-a']);

      await promptProjectSelection(projectLocations);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          validate: expect.any(Function),
        })
      );
    });

    it('should validate at least one project is selected', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'project-a',
          subdir: '',
          displayName: 'project-a',
          directoryPath: '.kiro/specs/project-a',
        },
      ];

      mockSearchableCheckbox.mockResolvedValue(['project-a']);

      await promptProjectSelection(projectLocations);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const validateFn = callArgs.validate;

      // Test validation with empty selection
      const emptyResult = validateFn([]);
      expect(typeof emptyResult).toBe('string');
      expect(emptyResult).toContain('at least one');
    });

    it('should validate all projects are in same subdirectory', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'project-a',
          subdir: 'lib',
          displayName: 'lib/project-a',
          directoryPath: '.kiro/specs/project-a',
        },
        {
          name: 'project-b',
          subdir: 'src',
          displayName: 'src/project-b',
          directoryPath: '.kiro/specs/project-b',
        },
      ];

      mockSearchableCheckbox.mockResolvedValue(['lib/project-a']);

      await promptProjectSelection(projectLocations);

      const callArgs = mockSearchableCheckbox.mock.calls[0][0];
      const validateFn = callArgs.validate;

      // Test validation with different subdirectories
      const mixedResult = validateFn([
        { value: 'lib/project-a', name: 'lib/project-a' },
        { value: 'src/project-b', name: 'src/project-b' },
      ]);

      expect(typeof mixedResult).toBe('string');
      expect(mixedResult).toContain('same subdirectory');
    });
  });

  describe('Emoji integration', () => {
    it('should include emoji prefix in prompt message', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'project-a',
          subdir: '',
          displayName: 'project-a',
          directoryPath: '.kiro/specs/project-a',
        },
      ];

      mockSearchableCheckbox.mockResolvedValue(['project-a']);

      await promptProjectSelection(projectLocations);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('📋'),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should throw error when no valid projects selected', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'project-a',
          subdir: '',
          displayName: 'project-a',
          directoryPath: '.kiro/specs/project-a',
        },
      ];

      // Mock returns displayName that doesn't exist in projectLocations
      mockSearchableCheckbox.mockResolvedValue(['non-existent']);

      await expect(promptProjectSelection(projectLocations)).rejects.toThrow(
        'No valid projects selected'
      );
    });
  });

  describe('UI configuration', () => {
    it('should configure pageSize and loop options', async () => {
      const { promptProjectSelection } = await import(
        '../../../../src/cli/prompts/project-selection-prompt.js'
      );

      const projectLocations: ProjectLocation[] = [
        {
          name: 'project-a',
          subdir: '',
          displayName: 'project-a',
          directoryPath: '.kiro/specs/project-a',
        },
      ];

      mockSearchableCheckbox.mockResolvedValue(['project-a']);

      await promptProjectSelection(projectLocations);

      expect(mockSearchableCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 10,
          loop: true,
        })
      );
    });
  });
});
