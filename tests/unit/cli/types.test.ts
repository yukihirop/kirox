import { describe, it, expect } from 'vitest';
import type { ParsedArguments, ValidationError, ValidationResult, ExecutionResult } from '@/cli/types';

describe('CLI Types', () => {
  describe('ParsedArguments', () => {
    it('should allow subdir field as optional string', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        project: 'my-project',
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: true,
        checkUpdates: false,
        update: false,
        subdir: 'packages/api',
      };

      expect(args.subdir).toBe('packages/api');
    });

    it('should allow subdir field to be undefined', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        project: 'my-project',
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: true,
        checkUpdates: false,
        update: false,
      };

      expect(args.subdir).toBeUndefined();
    });

    it('should maintain backward compatibility with existing fields', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        project: 'my-project',
        output: '.',
        force: true,
        dryRun: false,
        verbose: true,
        config: '/path/to/config',
        track: true,
        checkUpdates: false,
        update: false,
        subdir: undefined,
      };

      expect(args.repository).toBe('owner/repo');
      expect(args.project).toBe('my-project');
      expect(args.force).toBe(true);
      expect(args.verbose).toBe(true);
      expect(args.config).toBe('/path/to/config');
    });
  });

  describe('ValidationError', () => {
    it('should allow subdir field name', () => {
      const error: ValidationError = {
        field: 'subdir',
        message: '無効なサブディレクトリパスです',
      };

      expect(error.field).toBe('subdir');
      expect(error.message).toBe('無効なサブディレクトリパスです');
    });
  });
});
