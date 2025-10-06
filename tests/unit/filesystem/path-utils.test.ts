/**
 * Unit tests for path conversion utilities
 */

import { describe, it, expect } from 'vitest';
import {
  convertRemoteToLocalPath,
  getSpecDirectoryPath,
  getSteeringDirectoryPath,
  isValidProjectName,
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
});
