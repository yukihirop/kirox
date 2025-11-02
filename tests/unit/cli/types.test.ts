import { describe, it, expect } from 'vitest';
import type { ParsedArguments, ValidationError } from '@/cli/types.js';

describe('CLI Types', () => {
  describe('ParsedArguments', () => {
    it('should allow subdir field as optional string', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['my-project'],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: true,
        checkUpdates: false,
        update: false,
        subdir: 'packages/api',
        steering: false,
      };

      expect(args.subdir).toBe('packages/api');
    });

    it('should allow subdir field to be undefined', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['my-project'],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: true,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      expect(args.subdir).toBeUndefined();
    });

    it('should maintain backward compatibility with existing fields', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['my-project'],
        output: '.',
        force: true,
        dryRun: false,
        verbose: true,
        config: '/path/to/config',
        track: true,
        checkUpdates: false,
        update: false,
        subdir: undefined,
        steering: false,
      };

      expect(args.repository).toBe('owner/repo');
      expect(args.projects).toEqual(['my-project']);
      expect(args.force).toBe(true);
      expect(args.verbose).toBe(true);
      expect(args.config).toBe('/path/to/config');
    });

    // Task 2.3: Multi-project support tests
    it('should support multiple projects in projects array', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['project-a', 'project-b', 'project-c'],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: true,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      expect(args.projects).toHaveLength(3);
      expect(args.projects).toEqual(['project-a', 'project-b', 'project-c']);
    });

    it('should support single project for backward compatibility', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['single-project'],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: true,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      expect(args.projects).toHaveLength(1);
      expect(args.projects[0]).toBe('single-project');
    });

    it('should allow empty projects array for interactive mode', () => {
      const args: ParsedArguments = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: true,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      expect(args.projects).toEqual([]);
      expect(args.projects).toHaveLength(0);
    });

    it('should support multiple projects with all optional fields', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo#branch',
        projects: ['proj1', 'proj2'],
        output: './output',
        subdir: 'packages',
        force: true,
        dryRun: true,
        verbose: true,
        config: '.kiroxrc.json',
        track: true,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      expect(args.projects).toEqual(['proj1', 'proj2']);
      expect(args.repository).toBe('owner/repo#branch');
      expect(args.subdir).toBe('packages');
      expect(args.output).toBe('./output');
      expect(args.steering).toBe(false);
    });

    // Task 1.1: Test steering flag
    it('should have steering field as boolean', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: true,
      };

      expect(args.steering).toBe(true);
      expect(typeof args.steering).toBe('boolean');
    });

    it('should default steering to false', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['project'],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      expect(args.steering).toBe(false);
    });

    it('should support steering mode with empty projects array', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: true,
      };

      expect(args.steering).toBe(true);
      expect(args.projects).toEqual([]);
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
