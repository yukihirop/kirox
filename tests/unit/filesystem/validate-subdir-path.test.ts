/**
 * Unit tests for validateSubdirPath utility
 */

import { describe, it, expect } from 'vitest';
import { validateSubdirPath } from '@/filesystem/path-utils';

describe('validateSubdirPath', () => {
  describe('Valid paths', () => {
    it('should accept empty string (root directory)', () => {
      expect(() => validateSubdirPath('')).not.toThrow();
    });

    it('should accept valid relative path', () => {
      expect(() => validateSubdirPath('packages/api')).not.toThrow();
    });

    it('should accept deeply nested path', () => {
      expect(() => validateSubdirPath('apps/frontend/src/components')).not.toThrow();
    });

    it('should accept path with hyphens and underscores', () => {
      expect(() => validateSubdirPath('my-package/sub_module')).not.toThrow();
    });

    it('should accept single directory', () => {
      expect(() => validateSubdirPath('packages')).not.toThrow();
    });
  });

  describe('Path traversal detection', () => {
    it('should reject path with .. in the middle', () => {
      expect(() => validateSubdirPath('packages/../etc')).toThrow(
        '無効なサブディレクトリパスです: パストラバーサルは禁止されています'
      );
    });

    it('should reject path starting with ..', () => {
      expect(() => validateSubdirPath('../packages')).toThrow(
        '無効なサブディレクトリパスです: パストラバーサルは禁止されています'
      );
    });

    it('should reject path ending with ..', () => {
      expect(() => validateSubdirPath('packages/..')).toThrow(
        '無効なサブディレクトリパスです: パストラバーサルは禁止されています'
      );
    });

    it('should reject path with only ..', () => {
      expect(() => validateSubdirPath('..')).toThrow(
        '無効なサブディレクトリパスです: パストラバーサルは禁止されています'
      );
    });

    it('should reject path with multiple ..', () => {
      expect(() => validateSubdirPath('../../etc/passwd')).toThrow(
        '無効なサブディレクトリパスです: パストラバーサルは禁止されています'
      );
    });
  });

  describe('Absolute path detection', () => {
    it('should reject Unix absolute path', () => {
      expect(() => validateSubdirPath('/etc/passwd')).toThrow(
        '無効なサブディレクトリパスです: 絶対パスは禁止されています'
      );
    });

    it('should reject Windows absolute path with drive letter', () => {
      expect(() => validateSubdirPath('C:/Windows/System32')).toThrow(
        '無効なサブディレクトリパスです: 絶対パスは禁止されています'
      );
    });

    it('should reject Windows UNC path', () => {
      expect(() => validateSubdirPath('//server/share')).toThrow(
        '無効なサブディレクトリパスです: 絶対パスは禁止されています'
      );
    });

    it('should reject absolute path starting with /', () => {
      expect(() => validateSubdirPath('/packages/api')).toThrow(
        '無効なサブディレクトリパスです: 絶対パスは禁止されています'
      );
    });
  });

  describe('Edge cases', () => {
    it('should accept path with dots in names', () => {
      expect(() => validateSubdirPath('packages/api.v2')).not.toThrow();
    });

    it('should reject path with .. but not at boundary', () => {
      // This should still be rejected as it contains ..
      expect(() => validateSubdirPath('pack..ages/api')).toThrow(
        '無効なサブディレクトリパスです: パストラバーサルは禁止されています'
      );
    });
  });
});
