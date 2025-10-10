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
}));

describe('SearchableProjectPrompt (Task 3.1)', () => {
  const mockSearch = vi.mocked(inquirer.search);

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

        // Test case 4: Empty input (should return all projects)
        const allResults = await sourceFunction!('');
        expect(allResults).toHaveLength(3);
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
  });
});
