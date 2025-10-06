/**
 * Unit tests for buildRemotePath utility
 */

import { describe, it, expect } from 'vitest';
import { buildRemotePath } from '@/filesystem/path-utils';

describe('buildRemotePath', () => {
  describe('Specs type with subdirectory', () => {
    it('should build path with subdirectory for specs', () => {
      const result = buildRemotePath('packages/api', 'my-project', 'specs');
      expect(result).toBe('packages/api/.kiro/specs/my-project');
    });

    it('should build path with deeply nested subdirectory for specs', () => {
      const result = buildRemotePath('apps/frontend/src', 'ui-spec', 'specs');
      expect(result).toBe('apps/frontend/src/.kiro/specs/ui-spec');
    });

    it('should build path with single-level subdirectory for specs', () => {
      const result = buildRemotePath('services', 'auth-spec', 'specs');
      expect(result).toBe('services/.kiro/specs/auth-spec');
    });
  });

  describe('Specs type without subdirectory (root)', () => {
    it('should build root path for specs when subdir is empty string', () => {
      const result = buildRemotePath('', 'my-project', 'specs');
      expect(result).toBe('.kiro/specs/my-project');
    });

    it('should build root path for specs with different project name', () => {
      const result = buildRemotePath('', 'another-project', 'specs');
      expect(result).toBe('.kiro/specs/another-project');
    });
  });

  describe('Steering type with subdirectory', () => {
    it('should build path with subdirectory for steering', () => {
      const result = buildRemotePath('packages/api', '', 'steering');
      expect(result).toBe('packages/api/.kiro/steering');
    });

    it('should build path with deeply nested subdirectory for steering', () => {
      const result = buildRemotePath('apps/backend/core', '', 'steering');
      expect(result).toBe('apps/backend/core/.kiro/steering');
    });

    it('should ignore project name for steering type', () => {
      const result = buildRemotePath('services', 'ignored-project', 'steering');
      expect(result).toBe('services/.kiro/steering');
    });
  });

  describe('Steering type without subdirectory (root)', () => {
    it('should build root path for steering when subdir is empty string', () => {
      const result = buildRemotePath('', '', 'steering');
      expect(result).toBe('.kiro/steering');
    });

    it('should build root path for steering even with project name', () => {
      const result = buildRemotePath('', 'ignored-project', 'steering');
      expect(result).toBe('.kiro/steering');
    });
  });

  describe('Invalid project name detection', () => {
    it('should throw error for project name with path traversal', () => {
      expect(() => buildRemotePath('packages/api', '../etc', 'specs')).toThrow(
        '無効なプロジェクト名です: "../etc"'
      );
    });

    it('should throw error for project name with forward slash', () => {
      expect(() => buildRemotePath('packages/api', 'my/project', 'specs')).toThrow(
        '無効なプロジェクト名です: "my/project"'
      );
    });

    it('should throw error for project name with backslash', () => {
      expect(() => buildRemotePath('packages/api', 'my\\project', 'specs')).toThrow(
        '無効なプロジェクト名です: "my\\project"'
      );
    });

    it('should throw error for empty project name', () => {
      expect(() => buildRemotePath('packages/api', '', 'specs')).toThrow(
        '無効なプロジェクト名です: ""'
      );
    });

    it('should throw error for whitespace-only project name', () => {
      expect(() => buildRemotePath('packages/api', '   ', 'specs')).toThrow(
        '無効なプロジェクト名です: "   "'
      );
    });
  });

  describe('Edge cases', () => {
    it('should accept project name with hyphens', () => {
      const result = buildRemotePath('packages', 'my-project-name', 'specs');
      expect(result).toBe('packages/.kiro/specs/my-project-name');
    });

    it('should accept project name with underscores', () => {
      const result = buildRemotePath('packages', 'my_project_name', 'specs');
      expect(result).toBe('packages/.kiro/specs/my_project_name');
    });

    it('should accept project name with dots', () => {
      const result = buildRemotePath('packages', 'project.v2', 'specs');
      expect(result).toBe('packages/.kiro/specs/project.v2');
    });

    it('should accept project name with numbers', () => {
      const result = buildRemotePath('packages', 'project123', 'specs');
      expect(result).toBe('packages/.kiro/specs/project123');
    });
  });
});
