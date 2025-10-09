import { describe, it, expect } from 'vitest';
import { parseProjects } from '@/cli/project-name-parser';

describe('ProjectNameParser', () => {
  describe('parseProjects', () => {
    it('should parse single project name as array with one element', () => {
      const result = parseProjects('project1');
      expect(result).toEqual(['project1']);
    });

    it('should parse comma-separated multiple project names as array', () => {
      const result = parseProjects('project1,project2,project3');
      expect(result).toEqual(['project1', 'project2', 'project3']);
    });

    it('should trim whitespace from project names', () => {
      const result = parseProjects(' project1 , project2 , project3 ');
      expect(result).toEqual(['project1', 'project2', 'project3']);
    });

    it('should filter out empty string elements', () => {
      const result = parseProjects('project1,,project3');
      expect(result).toEqual(['project1', 'project3']);
    });

    it('should filter out empty strings after trimming', () => {
      const result = parseProjects('project1,  ,project3');
      expect(result).toEqual(['project1', 'project3']);
    });

    it('should return empty array for empty string input', () => {
      const result = parseProjects('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only input', () => {
      const result = parseProjects('   ');
      expect(result).toEqual([]);
    });

    it('should handle project names with hyphens', () => {
      const result = parseProjects('my-project-1,my-project-2');
      expect(result).toEqual(['my-project-1', 'my-project-2']);
    });

    it('should handle project names with underscores', () => {
      const result = parseProjects('my_project_1,my_project_2');
      expect(result).toEqual(['my_project_1', 'my_project_2']);
    });

    it('should handle mixed whitespace patterns', () => {
      const result = parseProjects('project1,  project2  ,project3,  project4');
      expect(result).toEqual(['project1', 'project2', 'project3', 'project4']);
    });

    it('should handle consecutive commas', () => {
      const result = parseProjects('project1,,,project2');
      expect(result).toEqual(['project1', 'project2']);
    });

    it('should handle leading and trailing commas', () => {
      const result = parseProjects(',project1,project2,');
      expect(result).toEqual(['project1', 'project2']);
    });

    it('should return empty array when input is only commas', () => {
      const result = parseProjects(',,,');
      expect(result).toEqual([]);
    });

    it('should handle project names with numbers', () => {
      const result = parseProjects('project1,project2,project3');
      expect(result).toEqual(['project1', 'project2', 'project3']);
    });

    it('should handle long project names', () => {
      const longName1 = 'my-very-long-project-name-with-multiple-parts';
      const longName2 = 'another-extremely-long-project-name';
      const result = parseProjects(`${longName1},${longName2}`);
      expect(result).toEqual([longName1, longName2]);
    });
  });
});
