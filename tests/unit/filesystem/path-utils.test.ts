/**
 * Unit tests for path conversion utilities
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  convertRemoteToLocalPath,
  getSpecDirectoryPath,
  getSteeringDirectoryPath,
  isValidProjectName,
  resolveOutputPath,
} from '@/filesystem/path-utils';

describe('PathUtils', () => {
  describe('isValidProjectName', () => {
    it('should return true for valid project name', () => {
      expect(isValidProjectName('my-project')).toBe(true);
      expect(isValidProjectName('project_name')).toBe(true);
      expect(isValidProjectName('project123')).toBe(true);
    });

    it('should return false for project name with path traversal', () => {
      expect(isValidProjectName('../etc')).toBe(false);
      expect(isValidProjectName('..\\windows')).toBe(false);
      expect(isValidProjectName('project/../secret')).toBe(false);
    });

    it('should return false for project name with slashes', () => {
      expect(isValidProjectName('project/name')).toBe(false);
      expect(isValidProjectName('project\\name')).toBe(false);
    });

    it('should return false for empty project name', () => {
      expect(isValidProjectName('')).toBe(false);
    });

    it('should return false for whitespace-only project name', () => {
      expect(isValidProjectName('   ')).toBe(false);
    });
  });

  describe('getSpecDirectoryPath', () => {
    it('should return correct spec directory path for project', () => {
      const result = getSpecDirectoryPath('my-project');
      expect(result).toBe('.kiro/specs/my-project');
    });

    it('should handle project names with hyphens', () => {
      const result = getSpecDirectoryPath('my-awesome-project');
      expect(result).toBe('.kiro/specs/my-awesome-project');
    });

    it('should handle project names with underscores', () => {
      const result = getSpecDirectoryPath('my_project_name');
      expect(result).toBe('.kiro/specs/my_project_name');
    });

    it('should throw error for invalid project name', () => {
      expect(() => getSpecDirectoryPath('../etc')).toThrow('Invalid project name');
    });

    it('should throw error for empty project name', () => {
      expect(() => getSpecDirectoryPath('')).toThrow('Invalid project name');
    });
  });

  describe('getSteeringDirectoryPath', () => {
    it('should return steering directory path', () => {
      const result = getSteeringDirectoryPath();
      expect(result).toBe('.kiro/steering');
    });
  });

  describe('convertRemoteToLocalPath', () => {
    it('should convert remote spec file path to local path', () => {
      const remotePath = '.kiro/specs/my-project/requirements.md';
      const result = convertRemoteToLocalPath(remotePath);
      expect(result).toBe('.kiro/specs/my-project/requirements.md');
    });

    it('should convert remote steering file path to local path', () => {
      const remotePath = '.kiro/steering/tech.md';
      const result = convertRemoteToLocalPath(remotePath);
      expect(result).toBe('.kiro/steering/tech.md');
    });

    it('should handle nested spec directories', () => {
      const remotePath = '.kiro/specs/project/subdir/file.md';
      const result = convertRemoteToLocalPath(remotePath);
      expect(result).toBe('.kiro/specs/project/subdir/file.md');
    });

    it('should handle nested steering directories', () => {
      const remotePath = '.kiro/steering/subdir/custom.md';
      const result = convertRemoteToLocalPath(remotePath);
      expect(result).toBe('.kiro/steering/subdir/custom.md');
    });

    it('should throw error for path outside .kiro directory', () => {
      expect(() => convertRemoteToLocalPath('src/index.ts')).toThrow(
        'Path must be within .kiro directory'
      );
    });

    it('should throw error for path traversal attempts', () => {
      expect(() => convertRemoteToLocalPath('.kiro/specs/../../../etc/passwd')).toThrow(
        'Invalid path: contains path traversal'
      );
    });

    it('should normalize paths with extra slashes', () => {
      const remotePath = '.kiro//specs//project//file.md';
      const result = convertRemoteToLocalPath(remotePath);
      expect(result).toBe('.kiro/specs/project/file.md');
    });
  });

  describe('resolveOutputPath', () => {
    it('should resolve output path with current directory', () => {
      const result = resolveOutputPath('.', '.kiro/specs/myapp/requirements.md');
      const expected = path.resolve('.', '.kiro/specs/myapp/requirements.md');
      expect(result).toBe(expected);
    });

    it('should resolve output path with relative directory', () => {
      const result = resolveOutputPath('./external', '.kiro/specs/myapp/requirements.md');
      const expected = path.resolve('./external', '.kiro/specs/myapp/requirements.md');
      expect(result).toBe(expected);
    });

    it('should resolve output path with absolute directory', () => {
      const result = resolveOutputPath('/tmp/test', '.kiro/steering/tech.md');
      const expected = path.normalize('/tmp/test/.kiro/steering/tech.md');
      expect(result).toBe(expected);
    });

    it('should handle nested relative paths', () => {
      const result = resolveOutputPath('../shared-specs', '.kiro/specs/project/file.md');
      const expected = path.resolve('../shared-specs', '.kiro/specs/project/file.md');
      expect(result).toBe(expected);
    });

    it('should throw error for empty output directory', () => {
      expect(() => resolveOutputPath('', '.kiro/specs/project/file.md')).toThrow(
        'Output directory must be a non-empty string'
      );
    });

    it('should throw error for invalid remote path', () => {
      expect(() => resolveOutputPath('.', 'src/index.ts')).toThrow(
        'Path must be within .kiro directory'
      );
    });

    it('should throw error for remote path with traversal', () => {
      // After normalization, '.kiro/specs/../../etc/passwd' becomes 'etc/passwd'
      // which doesn't start with '.kiro/', so it triggers "Path must be within .kiro directory"
      expect(() => resolveOutputPath('.', '.kiro/specs/../../etc/passwd')).toThrow(
        'Path must be within .kiro directory'
      );
    });

    it('should normalize paths correctly', () => {
      const result = resolveOutputPath('./output', '.kiro/specs/project/file.md');
      // Should be absolute path
      expect(path.isAbsolute(result)).toBe(true);
      // Should contain .kiro/specs/project/file.md
      expect(result).toContain('.kiro');
      expect(result).toContain('specs');
      expect(result).toContain('project');
      expect(result).toContain('file.md');
    });
  });
});
