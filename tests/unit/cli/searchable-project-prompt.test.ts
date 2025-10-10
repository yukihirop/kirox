/**
 * Unit tests for SearchableProjectPrompt service
 *
 * Tests the new single-step searchable checkbox UI for project selection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptProjectSelection } from '../../../src/cli/searchable-project-prompt.js';
import type { ProjectLocation } from '../../../src/github/project-location-builder.js';

// Mock searchable-checkbox custom prompt
vi.mock('../../../src/cli/prompts/searchable-checkbox.js', () => ({
  default: vi.fn(),
}));

// Import the mocked module
import searchableCheckbox from '../../../src/cli/prompts/searchable-checkbox.js';

describe('SearchableProjectPrompt (Task 3.1)', () => {
  const mockSearchableCheckbox = vi.mocked(searchableCheckbox);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('promptProjectSelection', () => {
    describe('single project selection', () => {
      it('should call searchableCheckbox with correct configuration', async () => {
        // Arrange: Create test project locations
        const projectLocations: ProjectLocation[] = [
          {
            name: 'project-a',
            subdir: '',
            displayName: 'project-a',
            projectName: 'project-a',
            path: '.kiro/specs/project-a',
            type: 'tree',
            mode: '040000',
            sha: 'sha-a',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-a',
          },
          {
            name: 'project-b',
            subdir: 'lib/a',
            displayName: 'lib/a/project-b',
            projectName: 'project-b',
            path: 'lib/a/.kiro/specs/project-b',
            type: 'tree',
            mode: '040000',
            sha: 'sha-b',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-b',
          },
        ];

        // Mock user selection: select "lib/a/project-b"
        mockSearchableCheckbox.mockResolvedValueOnce(['lib/a/project-b']);

        // Act: Call promptProjectSelection
        const result = await promptProjectSelection(projectLocations);

        // Assert: searchableCheckbox was called with correct configuration
        expect(mockSearchableCheckbox).toHaveBeenCalledTimes(1);
        expect(mockSearchableCheckbox).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Select projects'),
            choices: expect.arrayContaining([
              { value: 'project-a', name: 'project-a' },
              { value: 'lib/a/project-b', name: 'lib/a/project-b' },
            ]),
            validate: expect.any(Function),
            pageSize: 10,
            loop: true,
          })
        );

        // Assert: result contains selected project and subdirectory
        expect(result).toEqual({
          projects: ['project-b'],
          subdir: 'lib/a',
        });
      });

      it('should extract project name and subdirectory from root-level project', async () => {
        // Arrange: Root-level project
        const projectLocations: ProjectLocation[] = [
          {
            name: 'root-project',
            subdir: '',
            displayName: 'root-project',
            projectName: 'root-project',
            path: '.kiro/specs/root-project',
            type: 'tree',
            mode: '040000',
            sha: 'sha-root',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-root',
          },
        ];

        // Mock: User selects root-level project
        mockSearchableCheckbox.mockResolvedValueOnce(['root-project']);

        // Act
        const result = await promptProjectSelection(projectLocations);

        // Assert: subdir should be empty string for root projects
        expect(result).toEqual({
          projects: ['root-project'],
          subdir: '',
        });
      });

      it('should extract project name and subdirectory from nested project', async () => {
        // Arrange: Nested project
        const projectLocations: ProjectLocation[] = [
          {
            name: 'nested-project',
            subdir: 'packages/sub',
            displayName: 'packages/sub/nested-project',
            projectName: 'nested-project',
            path: 'packages/sub/.kiro/specs/nested-project',
            type: 'tree',
            mode: '040000',
            sha: 'sha-nested',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-nested',
          },
        ];

        // Mock: User selects nested project
        mockSearchableCheckbox.mockResolvedValueOnce(['packages/sub/nested-project']);

        // Act
        const result = await promptProjectSelection(projectLocations);

        // Assert: subdir should be extracted from displayName
        expect(result).toEqual({
          projects: ['nested-project'],
          subdir: 'packages/sub',
        });
      });
    });

    describe('multiple project selection', () => {
      const createTestProjects = (): ProjectLocation[] => [
        {
          name: 'project-a',
          subdir: 'lib/a',
          displayName: 'lib/a/project-a',
          projectName: 'project-a',
          path: 'lib/a/.kiro/specs/project-a',
          type: 'tree',
          mode: '040000',
          sha: 'sha-a',
          url: 'https://api.github.com/repos/owner/repo/git/trees/sha-a',
        },
        {
          name: 'project-b',
          subdir: 'lib/a',
          displayName: 'lib/a/project-b',
          projectName: 'project-b',
          path: 'lib/a/.kiro/specs/project-b',
          type: 'tree',
          mode: '040000',
          sha: 'sha-b',
          url: 'https://api.github.com/repos/owner/repo/git/trees/sha-b',
        },
        {
          name: 'project-c',
          subdir: 'lib/b',
          displayName: 'lib/b/project-c',
          projectName: 'project-c',
          path: 'lib/b/.kiro/specs/project-c',
          type: 'tree',
          mode: '040000',
          sha: 'sha-c',
          url: 'https://api.github.com/repos/owner/repo/git/trees/sha-c',
        },
      ];

      it('should allow selecting multiple projects in same subdirectory', async () => {
        const projectLocations = createTestProjects();

        // Mock: User selects 2 projects in lib/a
        mockSearchableCheckbox.mockResolvedValueOnce(['lib/a/project-a', 'lib/a/project-b']);

        const result = await promptProjectSelection(projectLocations);

        // Assert: result contains multiple projects
        expect(result).toEqual({
          projects: ['project-a', 'project-b'],
          subdir: 'lib/a',
        });
      });
    });

    describe('validation', () => {
      const createTestProjects = (): ProjectLocation[] => [
        {
          name: 'project-a',
          subdir: 'lib/a',
          displayName: 'lib/a/project-a',
          projectName: 'project-a',
          path: 'lib/a/.kiro/specs/project-a',
          type: 'tree',
          mode: '040000',
          sha: 'sha-a',
          url: 'https://api.github.com/repos/owner/repo/git/trees/sha-a',
        },
        {
          name: 'project-b',
          subdir: 'lib/a',
          displayName: 'lib/a/project-b',
          projectName: 'project-b',
          path: 'lib/a/.kiro/specs/project-b',
          type: 'tree',
          mode: '040000',
          sha: 'sha-b',
          url: 'https://api.github.com/repos/owner/repo/git/trees/sha-b',
        },
        {
          name: 'project-c',
          subdir: 'lib/b',
          displayName: 'lib/b/project-c',
          projectName: 'project-c',
          path: 'lib/b/.kiro/specs/project-c',
          type: 'tree',
          mode: '040000',
          sha: 'sha-c',
          url: 'https://api.github.com/repos/owner/repo/git/trees/sha-c',
        },
      ];

      it('should validate that at least one project is selected', async () => {
        const projectLocations = createTestProjects();

        mockSearchableCheckbox.mockResolvedValueOnce(['lib/a/project-a']);

        await promptProjectSelection(projectLocations);

        // Get validate function from mock call
        expect(mockSearchableCheckbox).toHaveBeenCalledTimes(1);
        const config = mockSearchableCheckbox.mock.calls[0][0];
        expect(config.validate).toBeDefined();

        const validateFn = config.validate!;

        // Empty selection: should fail
        const emptyResult = validateFn([]);
        expect(typeof emptyResult).toBe('string');
        expect(emptyResult).toContain('at least one project');

        // Valid selection: should pass
        const validResult = validateFn([{ value: 'lib/a/project-a', name: 'lib/a/project-a', short: 'lib/a/project-a', disabled: false, checked: true }]);
        expect(validResult).toBe(true);
      });

      it('should validate same subdirectory constraint', async () => {
        const projectLocations = createTestProjects();

        mockSearchableCheckbox.mockResolvedValueOnce(['lib/a/project-a', 'lib/a/project-b']);

        await promptProjectSelection(projectLocations);

        // Get validate function from mock call
        const config = mockSearchableCheckbox.mock.calls[0][0];
        const validateFn = config.validate!;

        // Same subdirectory: should pass
        const sameSubdirResult = validateFn([
          { value: 'lib/a/project-a', name: 'lib/a/project-a', short: 'lib/a/project-a', disabled: false, checked: true },
          { value: 'lib/a/project-b', name: 'lib/a/project-b', short: 'lib/a/project-b', disabled: false, checked: true },
        ]);
        expect(sameSubdirResult).toBe(true);

        // Different subdirectories: should fail
        const differentSubdirResult = validateFn([
          { value: 'lib/a/project-a', name: 'lib/a/project-a', short: 'lib/a/project-a', disabled: false, checked: true },
          { value: 'lib/b/project-c', name: 'lib/b/project-c', short: 'lib/b/project-c', disabled: false, checked: true },
        ]);
        expect(typeof differentSubdirResult).toBe('string');
        expect(differentSubdirResult).toContain('same subdirectory');
        expect(differentSubdirResult).toContain('lib/a');
        expect(differentSubdirResult).toContain('lib/b');
      });

      it('should allow root-level projects only when selected together', async () => {
        const projectLocations: ProjectLocation[] = [
          {
            name: 'root-project',
            subdir: '',
            displayName: 'root-project',
            projectName: 'root-project',
            path: '.kiro/specs/root-project',
            type: 'tree',
            mode: '040000',
            sha: 'sha-root',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-root',
          },
          ...createTestProjects(),
        ];

        mockSearchableCheckbox.mockResolvedValueOnce(['root-project']);

        await promptProjectSelection(projectLocations);

        const config = mockSearchableCheckbox.mock.calls[0][0];
        const validateFn = config.validate!;

        // Root only: should pass
        const rootOnlyResult = validateFn([
          { value: 'root-project', name: 'root-project', short: 'root-project', disabled: false, checked: true },
        ]);
        expect(rootOnlyResult).toBe(true);

        // Root + subdirectory project: should fail
        const mixedResult = validateFn([
          { value: 'root-project', name: 'root-project', short: 'root-project', disabled: false, checked: true },
          { value: 'lib/a/project-a', name: 'lib/a/project-a', short: 'lib/a/project-a', disabled: false, checked: true },
        ]);
        expect(typeof mixedResult).toBe('string');
        expect(mixedResult).toContain('same subdirectory');
        expect(mixedResult).toContain('root');
      });
    });

    describe('project sorting (Task 2.5)', () => {
      it('should sort projects alphabetically by subdirectory first, then by project name', async () => {
        // Arrange: Unsorted projects with various subdirectories
        const projectLocations: ProjectLocation[] = [
          {
            name: 'zebra-project',
            subdir: 'lib/b',
            displayName: 'lib/b/zebra-project',
            projectName: 'zebra-project',
            path: 'lib/b/.kiro/specs/zebra-project',
            type: 'tree',
            mode: '040000',
            sha: 'sha-z',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-z',
          },
          {
            name: 'alpha-project',
            subdir: '',
            displayName: 'alpha-project',
            projectName: 'alpha-project',
            path: '.kiro/specs/alpha-project',
            type: 'tree',
            mode: '040000',
            sha: 'sha-a',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-a',
          },
          {
            name: 'charlie-project',
            subdir: 'lib/a',
            displayName: 'lib/a/charlie-project',
            projectName: 'charlie-project',
            path: 'lib/a/.kiro/specs/charlie-project',
            type: 'tree',
            mode: '040000',
            sha: 'sha-c',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-c',
          },
          {
            name: 'bravo-project',
            subdir: 'lib/a',
            displayName: 'lib/a/bravo-project',
            projectName: 'bravo-project',
            path: 'lib/a/.kiro/specs/bravo-project',
            type: 'tree',
            mode: '040000',
            sha: 'sha-b',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-b',
          },
          {
            name: 'zulu-project',
            subdir: '',
            displayName: 'zulu-project',
            projectName: 'zulu-project',
            path: '.kiro/specs/zulu-project',
            type: 'tree',
            mode: '040000',
            sha: 'sha-zu',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-zu',
          },
        ];

        mockSearchableCheckbox.mockResolvedValueOnce(['alpha-project']);

        await promptProjectSelection(projectLocations);

        // Get choices from mock call
        expect(mockSearchableCheckbox).toHaveBeenCalledTimes(1);
        const config = mockSearchableCheckbox.mock.calls[0][0];
        const choices = config.choices as Array<{ value: string; name: string }>;

        // Assert: Choices should be sorted:
        // 1. Root projects first (empty subdir), sorted alphabetically by name
        // 2. Then subdirectory projects, sorted by subdirectory, then by name within same subdirectory
        expect(choices.map(c => c.value)).toEqual([
          'alpha-project',        // root, alphabetically first
          'zulu-project',         // root, alphabetically second
          'lib/a/bravo-project',  // lib/a, bravo before charlie
          'lib/a/charlie-project',// lib/a, charlie after bravo
          'lib/b/zebra-project',  // lib/b
        ]);
      });

      it('should handle projects with deeply nested subdirectories', async () => {
        const projectLocations: ProjectLocation[] = [
          {
            name: 'project-3',
            subdir: 'packages/z/deep',
            displayName: 'packages/z/deep/project-3',
            projectName: 'project-3',
            path: 'packages/z/deep/.kiro/specs/project-3',
            type: 'tree',
            mode: '040000',
            sha: 'sha-3',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-3',
          },
          {
            name: 'project-1',
            subdir: 'packages/a',
            displayName: 'packages/a/project-1',
            projectName: 'project-1',
            path: 'packages/a/.kiro/specs/project-1',
            type: 'tree',
            mode: '040000',
            sha: 'sha-1',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-1',
          },
          {
            name: 'project-2',
            subdir: 'packages/a/nested',
            displayName: 'packages/a/nested/project-2',
            projectName: 'project-2',
            path: 'packages/a/nested/.kiro/specs/project-2',
            type: 'tree',
            mode: '040000',
            sha: 'sha-2',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-2',
          },
        ];

        mockSearchableCheckbox.mockResolvedValueOnce(['packages/a/project-1']);

        await promptProjectSelection(projectLocations);

        const config = mockSearchableCheckbox.mock.calls[0][0];
        const choices = config.choices as Array<{ value: string; name: string }>;

        // Should be sorted by subdirectory path alphabetically
        expect(choices.map(c => c.value)).toEqual([
          'packages/a/project-1',
          'packages/a/nested/project-2',
          'packages/z/deep/project-3',
        ]);
      });
    });
  });
});
