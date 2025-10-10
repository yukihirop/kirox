/**
 * Unit tests for Tree Response Parser
 *
 * Tests filtering and parsing of GitHub Tree API responses (task 1.2)
 */

import { describe, it, expect } from 'vitest';
import { parseTreeResponse } from '../../../src/github/tree-response-parser.js';

describe('Tree Response Parser', () => {
  describe('parseTreeResponse', () => {
    describe('filtering .kiro/specs/ paths', () => {
      it('should extract paths containing .kiro/specs/', () => {
        // Arrange
        const treeItems = [
          { path: '.kiro/specs/project-a', type: 'tree' as const, mode: '040000', sha: 'abc123', url: '' },
          { path: 'src/index.ts', type: 'blob' as const, mode: '100644', sha: 'def456', url: '' },
          { path: 'lib/utils/.kiro/specs/project-b', type: 'tree' as const, mode: '040000', sha: 'ghi789', url: '' },
          { path: 'README.md', type: 'blob' as const, mode: '100644', sha: 'jkl012', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toHaveLength(2);
        expect(result.map(p => p.path)).toEqual([
          '.kiro/specs/project-a',
          'lib/utils/.kiro/specs/project-b',
        ]);
      });

      it('should filter out blob (file) entries, only keeping tree (directory) entries', () => {
        // Arrange
        const treeItems = [
          { path: '.kiro/specs/project-a', type: 'tree' as const, mode: '040000', sha: 'abc', url: '' },
          { path: '.kiro/specs/project-a/spec.json', type: 'blob' as const, mode: '100644', sha: 'def', url: '' },
          { path: '.kiro/specs/project-a/design.md', type: 'blob' as const, mode: '100644', sha: 'ghi', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('tree');
        expect(result[0].path).toBe('.kiro/specs/project-a');
      });

      it('should exclude paths that do not match .kiro/specs/<project> pattern', () => {
        // Arrange
        const treeItems = [
          { path: '.kiro/specs/project-a', type: 'tree' as const, mode: '040000', sha: 'abc', url: '' },
          { path: '.kiro/steering', type: 'tree' as const, mode: '040000', sha: 'def', url: '' },
          { path: '.kiro/specs', type: 'tree' as const, mode: '040000', sha: 'ghi', url: '' },
          { path: 'docs/.kiro', type: 'tree' as const, mode: '040000', sha: 'jkl', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe('.kiro/specs/project-a');
      });
    });

    describe('regex pattern matching', () => {
      it('should match root-level .kiro/specs/project-name', () => {
        // Arrange
        const treeItems = [
          { path: '.kiro/specs/my-project', type: 'tree' as const, mode: '040000', sha: 'abc', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          path: '.kiro/specs/my-project',
          projectName: 'my-project',
          subdir: '',
        });
      });

      it('should match subdirectory pattern: subdir/.kiro/specs/project-name', () => {
        // Arrange
        const treeItems = [
          { path: 'lib/a/.kiro/specs/project-x', type: 'tree' as const, mode: '040000', sha: 'abc', url: '' },
          { path: 'packages/core/.kiro/specs/project-y', type: 'tree' as const, mode: '040000', sha: 'def', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          path: 'lib/a/.kiro/specs/project-x',
          projectName: 'project-x',
          subdir: 'lib/a',
        });
        expect(result[1]).toMatchObject({
          path: 'packages/core/.kiro/specs/project-y',
          projectName: 'project-y',
          subdir: 'packages/core',
        });
      });

      it('should handle project names with hyphens and underscores', () => {
        // Arrange
        const treeItems = [
          { path: '.kiro/specs/my-awesome_project', type: 'tree' as const, mode: '040000', sha: 'abc', url: '' },
          { path: 'lib/.kiro/specs/test_project-v2', type: 'tree' as const, mode: '040000', sha: 'def', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].projectName).toBe('my-awesome_project');
        expect(result[1].projectName).toBe('test_project-v2');
      });

      it('should NOT match paths with extra subdirectories after project name', () => {
        // Arrange: These should NOT match because they have extra path segments
        const treeItems = [
          { path: '.kiro/specs/project-a/subdir', type: 'tree' as const, mode: '040000', sha: 'abc', url: '' },
          { path: 'lib/.kiro/specs/project-b/nested/deep', type: 'tree' as const, mode: '040000', sha: 'def', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toHaveLength(0);
      });
    });

    describe('efficiency and early skipping', () => {
      it('should handle empty tree array', () => {
        // Arrange
        const treeItems: any[] = [];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toEqual([]);
      });

      it('should skip all entries when none match .kiro/specs/ pattern', () => {
        // Arrange
        const treeItems = [
          { path: 'src/index.ts', type: 'blob' as const, mode: '100644', sha: 'abc', url: '' },
          { path: 'dist/bundle.js', type: 'blob' as const, mode: '100644', sha: 'def', url: '' },
          { path: 'node_modules', type: 'tree' as const, mode: '040000', sha: 'ghi', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toEqual([]);
      });

      it('should efficiently process large arrays by filtering early', () => {
        // Arrange: Create a large array with mostly irrelevant entries
        const treeItems = [
          { path: '.kiro/specs/project-a', type: 'tree' as const, mode: '040000', sha: 'match1', url: '' },
          ...Array.from({ length: 1000 }, (_, i) => ({
            path: `irrelevant/path/${i}.js`,
            type: 'blob' as const,
            mode: '100644',
            sha: `sha${i}`,
            url: '',
          })),
          { path: 'lib/b/.kiro/specs/project-b', type: 'tree' as const, mode: '040000', sha: 'match2', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].projectName).toBe('project-a');
        expect(result[1].projectName).toBe('project-b');
      });
    });

    describe('parsed result structure', () => {
      it('should return parsed results with all required fields', () => {
        // Arrange
        const treeItems = [
          {
            path: 'lib/a/.kiro/specs/my-project',
            type: 'tree' as const,
            mode: '040000',
            sha: 'abc123',
            url: 'https://api.github.com/...'
          },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result[0]).toEqual({
          path: 'lib/a/.kiro/specs/my-project',
          projectName: 'my-project',
          subdir: 'lib/a',
          type: 'tree',
          mode: '040000',
          sha: 'abc123',
          url: 'https://api.github.com/...',
        });
      });

      it('should preserve all original tree item properties', () => {
        // Arrange
        const treeItems = [
          {
            path: '.kiro/specs/test-project',
            type: 'tree' as const,
            mode: '040000',
            sha: 'xyz789',
            url: 'https://example.com',
            size: undefined,
          },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result[0]).toMatchObject({
          path: '.kiro/specs/test-project',
          type: 'tree',
          mode: '040000',
          sha: 'xyz789',
          url: 'https://example.com',
        });
      });
    });

    describe('edge cases', () => {
      it('should handle deeply nested subdirectories', () => {
        // Arrange
        const treeItems = [
          { path: 'packages/libs/utils/core/.kiro/specs/deep-project', type: 'tree' as const, mode: '040000', sha: 'abc', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          projectName: 'deep-project',
          subdir: 'packages/libs/utils/core',
        });
      });

      it('should handle project names with numbers', () => {
        // Arrange
        const treeItems = [
          { path: '.kiro/specs/project-v1', type: 'tree' as const, mode: '040000', sha: 'abc', url: '' },
          { path: '.kiro/specs/app2024', type: 'tree' as const, mode: '040000', sha: 'def', url: '' },
        ];

        // Act
        const result = parseTreeResponse(treeItems);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].projectName).toBe('project-v1');
        expect(result[1].projectName).toBe('app2024');
      });
    });
  });
});
