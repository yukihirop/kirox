/**
 * Unit tests for normalizeSubdirPath utility
 */

import { describe, it, expect } from 'vitest';
import { normalizeSubdirPath } from '@/filesystem/path-utils';

describe('normalizeSubdirPath', () => {
  describe('Leading character removal', () => {
    it('should remove leading forward slash', () => {
      expect(normalizeSubdirPath('/packages/api')).toBe('packages/api');
      expect(normalizeSubdirPath('//packages/api')).toBe('packages/api');
      expect(normalizeSubdirPath('///packages/api')).toBe('packages/api');
    });

    it('should remove leading ./ prefix', () => {
      expect(normalizeSubdirPath('./packages/api')).toBe('packages/api');
      expect(normalizeSubdirPath('./services/auth')).toBe('services/auth');
    });

    it('should handle combination of / and ./', () => {
      expect(normalizeSubdirPath('/./packages/api')).toBe('packages/api');
    });
  });

  describe('Trailing character removal', () => {
    it('should remove trailing forward slash', () => {
      expect(normalizeSubdirPath('packages/api/')).toBe('packages/api');
      expect(normalizeSubdirPath('packages/api//')).toBe('packages/api');
      expect(normalizeSubdirPath('packages/api///')).toBe('packages/api');
    });

    it('should handle both leading and trailing slashes', () => {
      expect(normalizeSubdirPath('/packages/api/')).toBe('packages/api');
      expect(normalizeSubdirPath('//packages/api//')).toBe('packages/api');
    });
  });

  describe('Backslash to forward slash conversion', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalizeSubdirPath('packages\\api')).toBe('packages/api');
      expect(normalizeSubdirPath('services\\auth\\module')).toBe('services/auth/module');
    });

    it('should handle mixed slashes and backslashes', () => {
      expect(normalizeSubdirPath('packages/api\\services')).toBe('packages/api/services');
      expect(normalizeSubdirPath('packages\\api/services')).toBe('packages/api/services');
    });
  });

  describe('Consecutive slash normalization', () => {
    it('should normalize consecutive forward slashes to single slash', () => {
      expect(normalizeSubdirPath('packages//api')).toBe('packages/api');
      expect(normalizeSubdirPath('packages///api')).toBe('packages/api');
      expect(normalizeSubdirPath('packages////api')).toBe('packages/api');
    });

    it('should normalize multiple consecutive slashes in path', () => {
      expect(normalizeSubdirPath('packages//api//services')).toBe('packages/api/services');
      expect(normalizeSubdirPath('a///b///c')).toBe('a/b/c');
    });
  });

  describe('Root directory handling', () => {
    it('should return empty string for dot', () => {
      expect(normalizeSubdirPath('.')).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(normalizeSubdirPath('')).toBe('');
    });

    it('should return empty string for whitespace-only string', () => {
      expect(normalizeSubdirPath('   ')).toBe('');
    });

    it('should return empty string for null-like inputs', () => {
      expect(normalizeSubdirPath(null as any)).toBe('');
      expect(normalizeSubdirPath(undefined as any)).toBe('');
    });
  });

  describe('Complex path normalization', () => {
    it('should handle complex path with all transformations', () => {
      expect(normalizeSubdirPath('/./packages//api\\')).toBe('packages/api');
      expect(normalizeSubdirPath('\\\\packages\\\\api//')).toBe('packages/api');
    });

    it('should preserve valid relative paths', () => {
      expect(normalizeSubdirPath('packages/api')).toBe('packages/api');
      expect(normalizeSubdirPath('services/auth/module')).toBe('services/auth/module');
      expect(normalizeSubdirPath('apps/frontend/src')).toBe('apps/frontend/src');
    });

    it('should trim whitespace', () => {
      expect(normalizeSubdirPath('  packages/api  ')).toBe('packages/api');
      expect(normalizeSubdirPath('\tpackages/api\t')).toBe('packages/api');
    });
  });

  describe('Edge cases', () => {
    it('should handle single character paths', () => {
      expect(normalizeSubdirPath('a')).toBe('a');
      expect(normalizeSubdirPath('/a/')).toBe('a');
    });

    it('should handle deeply nested paths', () => {
      expect(normalizeSubdirPath('a/b/c/d/e/f/g')).toBe('a/b/c/d/e/f/g');
    });

    it('should handle paths with dots in names', () => {
      expect(normalizeSubdirPath('packages/api.v2')).toBe('packages/api.v2');
      expect(normalizeSubdirPath('services/auth.service')).toBe('services/auth.service');
    });

    it('should handle paths with hyphens and underscores', () => {
      expect(normalizeSubdirPath('my-package/sub_module')).toBe('my-package/sub_module');
      expect(normalizeSubdirPath('api-v2/auth_service')).toBe('api-v2/auth_service');
    });
  });
});
