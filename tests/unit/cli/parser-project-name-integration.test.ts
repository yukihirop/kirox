import { describe, it, expect } from 'vitest';
import { parseArguments } from '@/cli/parser.js';
import { parseProjects } from '@/cli/project-name-parser.js';

/**
 * Test suite for parser.ts and project-name-parser.ts integration
 *
 * Task 6.4: Verify that parser.ts properly uses project-name-parser.ts
 * and no duplicate project parsing logic exists
 */
describe('Parser - Project Name Parser Integration (Task 6.4)', () => {
  describe('parseProjects integration in main command', () => {
    it('should use parseProjects for single project name', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'my-project'];
      const result = parseArguments(argv);

      // Verify result matches parseProjects behavior
      const expected = parseProjects('my-project');
      expect(result.projects).toEqual(expected);
      expect(result.projects).toEqual(['my-project']);
    });

    it('should use parseProjects for comma-separated multiple projects', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2,proj3'];
      const result = parseArguments(argv);

      // Verify result matches parseProjects behavior
      const expected = parseProjects('proj1,proj2,proj3');
      expect(result.projects).toEqual(expected);
      expect(result.projects).toEqual(['proj1', 'proj2', 'proj3']);
    });

    it('should use parseProjects for projects with whitespace', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'proj1, proj2 , proj3'];
      const result = parseArguments(argv);

      // Verify result matches parseProjects behavior
      const expected = parseProjects('proj1, proj2 , proj3');
      expect(result.projects).toEqual(expected);
      expect(result.projects).toEqual(['proj1', 'proj2', 'proj3']);
    });

    it('should use parseProjects to handle empty project name', () => {
      const argv = ['node', 'kirox', 'owner/repo'];
      const result = parseArguments(argv);

      // Verify result matches parseProjects behavior with empty string
      const expected = parseProjects('');
      expect(result.projects).toEqual(expected);
      expect(result.projects).toEqual([]);
    });

    it('should use parseProjects to filter out empty strings', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'proj1,,proj3'];
      const result = parseArguments(argv);

      // Verify result matches parseProjects behavior
      const expected = parseProjects('proj1,,proj3');
      expect(result.projects).toEqual(expected);
      expect(result.projects).toEqual(['proj1', 'proj3']);
    });
  });

  describe('parseProjects integration in add subcommand', () => {
    it('should use parseProjects for single project in add command', () => {
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'new-project'];
      const result = parseArguments(argv);

      // Verify result matches parseProjects behavior
      const expected = parseProjects('new-project');
      expect(result.projects).toEqual(expected);
      expect(result.projects).toEqual(['new-project']);
    });

    it('should use parseProjects for multiple projects in add command', () => {
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'proj1,proj2,proj3'];
      const result = parseArguments(argv);

      // Verify result matches parseProjects behavior
      const expected = parseProjects('proj1,proj2,proj3');
      expect(result.projects).toEqual(expected);
      expect(result.projects).toEqual(['proj1', 'proj2', 'proj3']);
    });

    it('should use parseProjects to handle empty project in add command', () => {
      const argv = ['node', 'kirox', 'add', 'owner/repo'];
      const result = parseArguments(argv);

      // Verify result matches parseProjects behavior with empty string
      const expected = parseProjects('');
      expect(result.projects).toEqual(expected);
      expect(result.projects).toEqual([]);
    });
  });

  describe('No duplicate parsing logic', () => {
    it('should produce consistent results between direct parseProjects and parser', () => {
      const testCases = [
        'project1',
        'proj1,proj2',
        'proj1, proj2, proj3',
        'proj1,,proj3',
        '',
      ];

      testCases.forEach((projectInput) => {
        const argv = ['node', 'kirox', 'owner/repo', '-p', projectInput];
        const parserResult = parseArguments(argv);
        const directResult = parseProjects(projectInput);

        expect(parserResult.projects).toEqual(directResult);
      });
    });

    it('should delegate all project parsing to parseProjects module', () => {
      // This test verifies that parser.ts uses parseProjects
      // by checking that the behavior is consistent
      const complexInput = ' proj1 , proj2,, proj3 , ';
      const argv = ['node', 'kirox', 'owner/repo', '-p', complexInput];
      const parserResult = parseArguments(argv);
      const parseProjectsResult = parseProjects(complexInput);

      // Both should produce the same result
      expect(parserResult.projects).toEqual(parseProjectsResult);
      expect(parserResult.projects).toEqual(['proj1', 'proj2', 'proj3']);
    });
  });

  describe('Edge cases handled by parseProjects', () => {
    it('should handle project name with only commas', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', ',,,'];
      const result = parseArguments(argv);

      const expected = parseProjects(',,,');
      expect(result.projects).toEqual(expected);
      expect(result.projects).toEqual([]);
    });

    it('should handle project name with mixed whitespace', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', '  proj1  ,  proj2  '];
      const result = parseArguments(argv);

      const expected = parseProjects('  proj1  ,  proj2  ');
      expect(result.projects).toEqual(expected);
      expect(result.projects).toEqual(['proj1', 'proj2']);
    });
  });
});
