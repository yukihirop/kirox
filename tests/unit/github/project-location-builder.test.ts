/**
 * Unit tests for Project Location Builder
 *
 * Tests construction of ProjectLocation objects from parsed tree items (task 1.3)
 */

import { describe, it, expect } from 'vitest';
import { buildProjectLocations } from '../../../src/github/project-location-builder.js';
import type { ParsedTreeItem } from '../../../src/github/tree-response-parser.js';

describe('Project Location Builder', () => {
  describe('buildProjectLocations', () => {
    describe('displayName generation', () => {
      it('should set displayName to project name only for root directory projects', () => {
        // Arrange
        const parsedItems: ParsedTreeItem[] = [
          {
            path: '.kiro/specs/project-a',
            projectName: 'project-a',
            subdir: '',
            type: 'tree',
            mode: '040000',
            sha: 'abc123',
            url: '',
          },
        ];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          name: 'project-a',
          subdir: '',
          displayName: 'project-a',
        });
      });

      it('should set displayName to "subdir/project" format for subdirectory projects', () => {
        // Arrange
        const parsedItems: ParsedTreeItem[] = [
          {
            path: 'lib/a/.kiro/specs/project-x',
            projectName: 'project-x',
            subdir: 'lib/a',
            type: 'tree',
            mode: '040000',
            sha: 'abc123',
            url: '',
          },
          {
            path: 'packages/core/.kiro/specs/project-y',
            projectName: 'project-y',
            subdir: 'packages/core',
            type: 'tree',
            mode: '040000',
            sha: 'def456',
            url: '',
          },
        ];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          name: 'project-x',
          subdir: 'lib/a',
          displayName: 'lib/a/project-x',
        });
        expect(result[1]).toMatchObject({
          name: 'project-y',
          subdir: 'packages/core',
          displayName: 'packages/core/project-y',
        });
      });

      it('should correctly format displayName for deeply nested subdirectories', () => {
        // Arrange
        const parsedItems: ParsedTreeItem[] = [
          {
            path: 'packages/libs/utils/core/.kiro/specs/deep-project',
            projectName: 'deep-project',
            subdir: 'packages/libs/utils/core',
            type: 'tree',
            mode: '040000',
            sha: 'abc123',
            url: '',
          },
        ];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert
        expect(result[0].displayName).toBe('packages/libs/utils/core/deep-project');
      });
    });

    describe('duplicate project name detection', () => {
      it('should detect duplicate project names in different subdirectories', () => {
        // Arrange: Same project name "api-spec" in different subdirectories
        const parsedItems: ParsedTreeItem[] = [
          {
            path: 'lib/a/.kiro/specs/api-spec',
            projectName: 'api-spec',
            subdir: 'lib/a',
            type: 'tree',
            mode: '040000',
            sha: 'abc123',
            url: '',
          },
          {
            path: 'lib/b/.kiro/specs/api-spec',
            projectName: 'api-spec',
            subdir: 'lib/b',
            type: 'tree',
            mode: '040000',
            sha: 'def456',
            url: '',
          },
        ];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert: Both should have displayName with subdirectory to distinguish them
        expect(result).toHaveLength(2);
        expect(result[0].displayName).toBe('lib/a/api-spec');
        expect(result[1].displayName).toBe('lib/b/api-spec');
      });

      it('should NOT modify displayName when project names are unique', () => {
        // Arrange: All project names are unique
        const parsedItems: ParsedTreeItem[] = [
          {
            path: '.kiro/specs/project-a',
            projectName: 'project-a',
            subdir: '',
            type: 'tree',
            mode: '040000',
            sha: 'abc123',
            url: '',
          },
          {
            path: 'lib/a/.kiro/specs/project-b',
            projectName: 'project-b',
            subdir: 'lib/a',
            type: 'tree',
            mode: '040000',
            sha: 'def456',
            url: '',
          },
        ];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert: displayName should follow standard rules
        expect(result[0].displayName).toBe('project-a'); // Root project
        expect(result[1].displayName).toBe('lib/a/project-b'); // Subdirectory project
      });

      it('should handle duplicate project names with one in root and one in subdirectory', () => {
        // Arrange: Same project name "core" in root and subdirectory
        const parsedItems: ParsedTreeItem[] = [
          {
            path: '.kiro/specs/core',
            projectName: 'core',
            subdir: '',
            type: 'tree',
            mode: '040000',
            sha: 'abc123',
            url: '',
          },
          {
            path: 'lib/a/.kiro/specs/core',
            projectName: 'core',
            subdir: 'lib/a',
            type: 'tree',
            mode: '040000',
            sha: 'def456',
            url: '',
          },
        ];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert: Both should maintain standard displayName format
        // Root project stays as "core", subdirectory shows "lib/a/core"
        expect(result[0].displayName).toBe('core'); // Root
        expect(result[1].displayName).toBe('lib/a/core'); // Subdirectory
      });
    });

    describe('mixed scenarios', () => {
      it('should handle mix of root, subdirectory, and duplicate projects', () => {
        // Arrange: Complex scenario with multiple patterns
        const parsedItems: ParsedTreeItem[] = [
          {
            path: '.kiro/specs/auth',
            projectName: 'auth',
            subdir: '',
            type: 'tree',
            mode: '040000',
            sha: 'sha1',
            url: '',
          },
          {
            path: 'lib/a/.kiro/specs/api',
            projectName: 'api',
            subdir: 'lib/a',
            type: 'tree',
            mode: '040000',
            sha: 'sha2',
            url: '',
          },
          {
            path: 'lib/b/.kiro/specs/api',
            projectName: 'api',
            subdir: 'lib/b',
            type: 'tree',
            mode: '040000',
            sha: 'sha3',
            url: '',
          },
          {
            path: 'packages/utils/.kiro/specs/helpers',
            projectName: 'helpers',
            subdir: 'packages/utils',
            type: 'tree',
            mode: '040000',
            sha: 'sha4',
            url: '',
          },
        ];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert
        expect(result).toHaveLength(4);
        expect(result[0].displayName).toBe('auth'); // Unique root project
        expect(result[1].displayName).toBe('lib/a/api'); // Duplicate subdirectory project
        expect(result[2].displayName).toBe('lib/b/api'); // Duplicate subdirectory project
        expect(result[3].displayName).toBe('packages/utils/helpers'); // Unique subdirectory project
      });

      it('should preserve all original ParsedTreeItem properties', () => {
        // Arrange
        const parsedItems: ParsedTreeItem[] = [
          {
            path: 'lib/a/.kiro/specs/test-project',
            projectName: 'test-project',
            subdir: 'lib/a',
            type: 'tree',
            mode: '040000',
            sha: 'xyz789',
            url: 'https://api.github.com/repos/owner/repo/git/trees/xyz789',
          },
        ];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert: All ParsedTreeItem properties should be preserved
        expect(result[0]).toMatchObject({
          name: 'test-project',
          subdir: 'lib/a',
          displayName: 'lib/a/test-project',
          path: 'lib/a/.kiro/specs/test-project',
          projectName: 'test-project',
          type: 'tree',
          mode: '040000',
          sha: 'xyz789',
          url: 'https://api.github.com/repos/owner/repo/git/trees/xyz789',
        });
      });
    });

    describe('edge cases', () => {
      it('should handle empty array', () => {
        // Arrange
        const parsedItems: ParsedTreeItem[] = [];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle single project', () => {
        // Arrange
        const parsedItems: ParsedTreeItem[] = [
          {
            path: '.kiro/specs/solo-project',
            projectName: 'solo-project',
            subdir: '',
            type: 'tree',
            mode: '040000',
            sha: 'abc123',
            url: '',
          },
        ];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].displayName).toBe('solo-project');
      });

      it('should handle three or more projects with the same name', () => {
        // Arrange: Triple duplicate
        const parsedItems: ParsedTreeItem[] = [
          {
            path: 'lib/a/.kiro/specs/common',
            projectName: 'common',
            subdir: 'lib/a',
            type: 'tree',
            mode: '040000',
            sha: 'sha1',
            url: '',
          },
          {
            path: 'lib/b/.kiro/specs/common',
            projectName: 'common',
            subdir: 'lib/b',
            type: 'tree',
            mode: '040000',
            sha: 'sha2',
            url: '',
          },
          {
            path: 'lib/c/.kiro/specs/common',
            projectName: 'common',
            subdir: 'lib/c',
            type: 'tree',
            mode: '040000',
            sha: 'sha3',
            url: '',
          },
        ];

        // Act
        const result = buildProjectLocations(parsedItems);

        // Assert: All should be distinguished by subdirectory
        expect(result).toHaveLength(3);
        expect(result[0].displayName).toBe('lib/a/common');
        expect(result[1].displayName).toBe('lib/b/common');
        expect(result[2].displayName).toBe('lib/c/common');
      });
    });
  });
});
