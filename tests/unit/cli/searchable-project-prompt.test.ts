/**
 * Unit tests for SearchableProjectPrompt service
 *
 * Tests real-time filtering, case-insensitive search, and project selection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptProjectSelection } from '../../../src/cli/searchable-project-prompt.js';
import type { ProjectLocation } from '../../../src/github/project-location-builder.js';
import * as inquirer from '@inquirer/prompts';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  search: vi.fn(),
  checkbox: vi.fn(),
}));

describe('SearchableProjectPrompt (Task 3.1)', () => {
  const mockSearch = vi.mocked(inquirer.search);
  const mockCheckbox = vi.mocked(inquirer.checkbox);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('promptProjectSelection', () => {
    describe('basic search functionality (requirement 2.5)', () => {
      it('should display searchable project list with displayName as choice values', async () => {
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
        mockSearch.mockResolvedValueOnce('lib/a/project-b');

        // Act: Call promptProjectSelection
        const result = await promptProjectSelection(projectLocations);

        // Assert: search prompt was called with correct configuration
        expect(mockSearch).toHaveBeenCalledTimes(1);
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Select a project'),
            source: expect.any(Function),
          })
        );

        // Assert: result contains selected project and subdirectory
        expect(result).toEqual({
          projects: ['project-b'],
          subdir: 'lib/a',
        });
      });

      it('should filter projects based on user input (case-insensitive partial match)', async () => {
        // Arrange: Create test project locations
        const projectLocations: ProjectLocation[] = [
          {
            name: 'project-alpha',
            subdir: '',
            displayName: 'project-alpha',
            projectName: 'project-alpha',
            path: '.kiro/specs/project-alpha',
            type: 'tree',
            mode: '040000',
            sha: 'sha-alpha',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-alpha',
          },
          {
            name: 'project-beta',
            subdir: 'lib/a',
            displayName: 'lib/a/project-beta',
            projectName: 'project-beta',
            path: 'lib/a/.kiro/specs/project-beta',
            type: 'tree',
            mode: '040000',
            sha: 'sha-beta',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-beta',
          },
          {
            name: 'test-alpha',
            subdir: 'lib/b',
            displayName: 'lib/b/test-alpha',
            projectName: 'test-alpha',
            path: 'lib/b/.kiro/specs/test-alpha',
            type: 'tree',
            mode: '040000',
            sha: 'sha-test',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-test',
          },
        ];

        // Mock: Capture source function from search call
        let sourceFunction: ((input: string) => Promise<Array<{ value: string; name: string }>>) | undefined;
        mockSearch.mockImplementationOnce(async (config) => {
          sourceFunction = config.source;
          return 'project-alpha'; // User selects first project
        });

        // Act: Call promptProjectSelection (this triggers search)
        await promptProjectSelection(projectLocations);

        // Assert: Verify source function filters correctly
        expect(sourceFunction).toBeDefined();

        // Test case 1: Filter by "alpha" (case-insensitive, should match 2 projects)
        const alphaResults = await sourceFunction!('alpha');
        expect(alphaResults).toHaveLength(2);
        expect(alphaResults.map(r => r.value)).toEqual(['project-alpha', 'lib/b/test-alpha']);

        // Test case 2: Filter by "BETA" (uppercase, should match 1 project)
        const betaResults = await sourceFunction!('BETA');
        expect(betaResults).toHaveLength(1);
        expect(betaResults[0].value).toBe('lib/a/project-beta');

        // Test case 3: Filter by "lib/a" (subdirectory match, should match 1 project)
        const libAResults = await sourceFunction!('lib/a');
        expect(libAResults).toHaveLength(1);
        expect(libAResults[0].value).toBe('lib/a/project-beta');

        // Test case 4: Empty input (should return all projects + multiple selection option)
        const allResults = await sourceFunction!('');
        expect(allResults).toHaveLength(4); // 1 multiple option + 3 projects
        expect(allResults[0].value).toBe('__select_multiple__'); // First item is multiple selection option
      });
    });

    describe('case-insensitive search (requirement 2.6)', () => {
      it('should perform case-insensitive search across displayName', async () => {
        // Arrange: Create test project locations with mixed case
        const projectLocations: ProjectLocation[] = [
          {
            name: 'MyProject',
            subdir: 'Lib/A',
            displayName: 'Lib/A/MyProject',
            projectName: 'MyProject',
            path: 'Lib/A/.kiro/specs/MyProject',
            type: 'tree',
            mode: '040000',
            sha: 'sha-my',
            url: 'https://api.github.com/repos/owner/repo/git/trees/sha-my',
          },
        ];

        // Mock: Capture source function
        let sourceFunction: ((input: string) => Promise<Array<{ value: string; name: string }>>) | undefined;
        mockSearch.mockImplementationOnce(async (config) => {
          sourceFunction = config.source;
          return 'Lib/A/MyProject';
        });

        // Act
        await promptProjectSelection(projectLocations);

        // Assert: All these searches should match the same project (case-insensitive)
        expect(await sourceFunction!('myproject')).toHaveLength(1);
        expect(await sourceFunction!('MYPROJECT')).toHaveLength(1);
        expect(await sourceFunction!('lib/a')).toHaveLength(1);
        expect(await sourceFunction!('LIB/A')).toHaveLength(1);
        expect(await sourceFunction!('lib/a/my')).toHaveLength(1);
      });
    });

    describe('result extraction', () => {
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
        mockSearch.mockResolvedValueOnce('root-project');

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
        mockSearch.mockResolvedValueOnce('packages/sub/nested-project');

        // Act
        const result = await promptProjectSelection(projectLocations);

        // Assert: subdir should be extracted from displayName
        expect(result).toEqual({
          projects: ['nested-project'],
          subdir: 'packages/sub',
        });
      });
    });

    describe('empty search results (Task 3.2)', () => {
      describe('no matching projects message (requirement 2.7)', () => {
        it('should include "No matching projects found" message when filter returns empty', async () => {
          // Arrange: Create test project locations
          const projectLocations: ProjectLocation[] = [
            {
              name: 'project-alpha',
              subdir: '',
              displayName: 'project-alpha',
              projectName: 'project-alpha',
              path: '.kiro/specs/project-alpha',
              type: 'tree',
              mode: '040000',
              sha: 'sha-alpha',
              url: 'https://api.github.com/repos/owner/repo/git/trees/sha-alpha',
            },
            {
              name: 'project-beta',
              subdir: 'lib/a',
              displayName: 'lib/a/project-beta',
              projectName: 'project-beta',
              path: 'lib/a/.kiro/specs/project-beta',
              type: 'tree',
              mode: '040000',
              sha: 'sha-beta',
              url: 'https://api.github.com/repos/owner/repo/git/trees/sha-beta',
            },
          ];

          // Mock: Capture source function from search call
          let sourceFunction: ((input: string | undefined) => Promise<Array<{ value: string; name: string }>>) | undefined;
          mockSearch.mockImplementationOnce(async (config) => {
            sourceFunction = config.source;
            return 'project-alpha';
          });

          // Act: Call promptProjectSelection
          await promptProjectSelection(projectLocations);

          // Assert: Verify source function returns message when no matches
          expect(sourceFunction).toBeDefined();

          // Test: Search for non-existent project "xyz" (should return 1 entry: the message)
          const noMatchResults = await sourceFunction!('xyz', { signal: new AbortController().signal });
          expect(noMatchResults).toHaveLength(1);
          expect(noMatchResults[0].name).toContain('No matching projects found');
          expect(noMatchResults[0].value).toBe('__no_match__');
        });

        it('should redisplay all projects when search text is cleared after empty result', async () => {
          // Arrange: Create test project locations
          const projectLocations: ProjectLocation[] = [
            {
              name: 'project-alpha',
              subdir: '',
              displayName: 'project-alpha',
              projectName: 'project-alpha',
              path: '.kiro/specs/project-alpha',
              type: 'tree',
              mode: '040000',
              sha: 'sha-alpha',
              url: 'https://api.github.com/repos/owner/repo/git/trees/sha-alpha',
            },
            {
              name: 'project-beta',
              subdir: 'lib/a',
              displayName: 'lib/a/project-beta',
              projectName: 'project-beta',
              path: 'lib/a/.kiro/specs/project-beta',
              type: 'tree',
              mode: '040000',
              sha: 'sha-beta',
              url: 'https://api.github.com/repos/owner/repo/git/trees/sha-beta',
            },
          ];

          // Mock: Capture source function
          let sourceFunction: ((input: string | undefined) => Promise<Array<{ value: string; name: string }>>) | undefined;
          mockSearch.mockImplementationOnce(async (config) => {
            sourceFunction = config.source;
            return 'project-alpha';
          });

          // Act
          await promptProjectSelection(projectLocations);

          // Assert: Verify re-display behavior (Requirement 2.8)
          expect(sourceFunction).toBeDefined();

          // Step 1: Search for non-existent "xyz" → Empty message
          const noMatchResults = await sourceFunction!('xyz', { signal: new AbortController().signal });
          expect(noMatchResults).toHaveLength(1);
          expect(noMatchResults[0].value).toBe('__no_match__');

          // Step 2: Clear search text (empty string) → All projects re-displayed with multiple selection option
          const allResults = await sourceFunction!('', { signal: new AbortController().signal });
          expect(allResults).toHaveLength(3); // 1 multiple option + 2 projects
          expect(allResults[0].value).toBe('__select_multiple__');
          expect(allResults.slice(1).map(r => r.value)).toEqual(['project-alpha', 'lib/a/project-beta']);
        });

        it('should redisplay all projects when search text is cleared (undefined)', async () => {
          // Arrange: Create test project locations
          const projectLocations: ProjectLocation[] = [
            {
              name: 'project-gamma',
              subdir: 'packages',
              displayName: 'packages/project-gamma',
              projectName: 'project-gamma',
              path: 'packages/.kiro/specs/project-gamma',
              type: 'tree',
              mode: '040000',
              sha: 'sha-gamma',
              url: 'https://api.github.com/repos/owner/repo/git/trees/sha-gamma',
            },
          ];

          // Mock: Capture source function
          let sourceFunction: ((input: string | undefined) => Promise<Array<{ value: string; name: string }>>) | undefined;
          mockSearch.mockImplementationOnce(async (config) => {
            sourceFunction = config.source;
            return 'packages/project-gamma';
          });

          // Act
          await promptProjectSelection(projectLocations);

          // Assert: undefined input should display all projects (Requirement 2.8)
          expect(sourceFunction).toBeDefined();
          const allResults = await sourceFunction!(undefined, { signal: new AbortController().signal });
          expect(allResults).toHaveLength(1);
          expect(allResults[0].value).toBe('packages/project-gamma');
        });
      });
    });

    describe('multiple selection mode (Tasks 3.3-3.6)', () => {
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

      describe('multiple selection mode trigger (task 3.3, requirement 4.1)', () => {
        it('should include "[Select multiple projects...]" option in search choices', async () => {
          const projectLocations = createTestProjects();

          let sourceFunction: ((input: string | undefined) => Promise<Array<{ value: string; name: string }>>) | undefined;
          mockSearch.mockImplementationOnce(async (config) => {
            sourceFunction = config.source;
            return 'lib/a/project-a';
          });

          await promptProjectSelection(projectLocations);

          expect(sourceFunction).toBeDefined();
          const results = await sourceFunction!('', { signal: new AbortController().signal });

          // Should include special option at the beginning
          expect(results[0].value).toBe('__select_multiple__');
          expect(results[0].name).toContain('[Select multiple projects');
        });

        it('should switch to checkbox prompt when user selects multiple mode', async () => {
          const projectLocations = createTestProjects();

          // User selects "[Select multiple projects...]" option
          mockSearch.mockResolvedValueOnce('__select_multiple__');
          // Then selects 2 projects in checkbox
          mockCheckbox.mockResolvedValueOnce(['lib/a/project-a', 'lib/a/project-b']);

          const result = await promptProjectSelection(projectLocations);

          // Assert: checkbox was called
          expect(mockCheckbox).toHaveBeenCalledTimes(1);
          expect(mockCheckbox).toHaveBeenCalledWith(
            expect.objectContaining({
              message: expect.any(String),
              choices: expect.any(Array), // Static array, not a function
              validate: expect.any(Function), // Validation for subdirectory constraint
            })
          );

          // Assert: result contains multiple projects
          expect(result).toEqual({
            projects: ['project-a', 'project-b'],
            subdir: 'lib/a',
          });
        });
      });

      describe('selection validation (task 3.6, requirement 4.7)', () => {
        it('should validate that at least one project is selected', async () => {
          const projectLocations = createTestProjects();

          mockSearch.mockResolvedValueOnce('__select_multiple__');

          // Mock checkbox to return valid selection
          mockCheckbox.mockResolvedValueOnce(['lib/a/project-a']);

          const result = await promptProjectSelection(projectLocations);

          // Assert: checkbox was called once
          expect(mockCheckbox).toHaveBeenCalledTimes(1);

          // Assert: validate function was provided
          const firstCall = mockCheckbox.mock.calls[0][0];
          expect(firstCall.validate).toBeDefined();

          // Assert: validate function rejects empty selection
          const validateFn = firstCall.validate as (value: string[]) => boolean | string;
          expect(validateFn([])).toContain('at least one project');
          expect(validateFn(['lib/a/project-a'])).toBe(true);

          expect(result).toEqual({
            projects: ['project-a'],
            subdir: 'lib/a',
          });
        });
      });

      describe('subdirectory constraint validation (task 3.4, requirements 4.2-4.4, 4.8)', () => {
        it('should display all projects as static choices array', async () => {
          const projectLocations = createTestProjects();

          mockSearch.mockResolvedValueOnce('__select_multiple__');
          mockCheckbox.mockResolvedValueOnce(['lib/a/project-a', 'lib/a/project-b']);

          await promptProjectSelection(projectLocations);

          // Get choices from mock call
          expect(mockCheckbox).toHaveBeenCalledTimes(1);
          const checkboxConfig = mockCheckbox.mock.calls[0][0];
          expect(checkboxConfig.choices).toBeDefined();

          // Choices should be static array (not a function)
          expect(Array.isArray(checkboxConfig.choices)).toBe(true);
          const choices = checkboxConfig.choices as Array<{ value: string; name: string }>;

          // All projects should be displayed
          expect(choices).toHaveLength(3);
          expect(choices.map(c => c.value)).toEqual([
            'lib/a/project-a',
            'lib/a/project-b',
            'lib/b/project-c',
          ]);
        });

        it('should validate same subdirectory constraint via validate function', async () => {
          const projectLocations = createTestProjects();

          mockSearch.mockResolvedValueOnce('__select_multiple__');
          mockCheckbox.mockResolvedValueOnce(['lib/a/project-a', 'lib/a/project-b']);

          await promptProjectSelection(projectLocations);

          // Get validate function from mock call
          expect(mockCheckbox).toHaveBeenCalledTimes(1);
          const checkboxConfig = mockCheckbox.mock.calls[0][0];
          expect(checkboxConfig.validate).toBeDefined();

          const validateFn = checkboxConfig.validate as (value: string[]) => boolean | string;

          // Same subdirectory: should pass validation
          expect(validateFn(['lib/a/project-a', 'lib/a/project-b'])).toBe(true);

          // Different subdirectories: should fail validation
          const result = validateFn(['lib/a/project-a', 'lib/b/project-c']);
          expect(typeof result).toBe('string');
          expect(result).toContain('same subdirectory');
          expect(result).toContain('lib/a');
          expect(result).toContain('lib/b');
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

          mockSearch.mockResolvedValueOnce('__select_multiple__');
          mockCheckbox.mockResolvedValueOnce(['root-project']);

          await promptProjectSelection(projectLocations);

          const checkboxConfig = mockCheckbox.mock.calls[0][0];
          const validateFn = checkboxConfig.validate as (value: string[]) => boolean | string;

          // Root only: should pass
          expect(validateFn(['root-project'])).toBe(true);

          // Root + subdirectory project: should fail
          const result = validateFn(['root-project', 'lib/a/project-a']);
          expect(typeof result).toBe('string');
          expect(result).toContain('same subdirectory');
          expect(result).toContain('root');
        });
      });
    });
  });
});
