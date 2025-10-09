import { describe, it, expect } from 'vitest';
import type { KiroxConfig, MergedConfig } from '@/config/types';

describe('Config Types', () => {
  describe('KiroxConfig', () => {
    it('should allow subdir field as optional string', () => {
      const config: KiroxConfig = {
        githubToken: 'ghp_test_token',
        defaultConcurrency: 5,
        outputDirectory: './output',
        verbose: true,
        force: false,
        subdir: 'packages/api',
      };

      expect(config.subdir).toBe('packages/api');
    });

    it('should allow subdir field to be undefined', () => {
      const config: KiroxConfig = {
        githubToken: 'ghp_test_token',
      };

      expect(config.subdir).toBeUndefined();
    });

    it('should allow empty subdir field', () => {
      const config: KiroxConfig = {
        subdir: '',
      };

      expect(config.subdir).toBe('');
    });

    it('should maintain backward compatibility with existing fields', () => {
      const config: KiroxConfig = {
        githubToken: 'ghp_test_token',
        defaultConcurrency: 10,
        outputDirectory: './custom',
        verbose: false,
        force: true,
      };

      expect(config.githubToken).toBe('ghp_test_token');
      expect(config.defaultConcurrency).toBe(10);
      expect(config.outputDirectory).toBe('./custom');
    });

    // Task 4.1: Branch field support tests
    it('should allow branch field as optional string', () => {
      const config: KiroxConfig = {
        branch: 'develop',
      };

      expect(config.branch).toBe('develop');
    });

    it('should allow branch field to be undefined', () => {
      const config: KiroxConfig = {
        githubToken: 'ghp_test_token',
      };

      expect(config.branch).toBeUndefined();
    });

    it('should allow empty branch field', () => {
      const config: KiroxConfig = {
        branch: '',
      };

      expect(config.branch).toBe('');
    });

    it('should allow branch field with slash (feature/new-api)', () => {
      const config: KiroxConfig = {
        branch: 'feature/new-api',
      };

      expect(config.branch).toBe('feature/new-api');
    });

    it('should allow branch field with version tag (v1.2.3)', () => {
      const config: KiroxConfig = {
        branch: 'v1.2.3',
      };

      expect(config.branch).toBe('v1.2.3');
    });

    it('should allow branch field alongside other fields', () => {
      const config: KiroxConfig = {
        githubToken: 'ghp_test_token',
        defaultConcurrency: 5,
        branch: 'release/v2.0',
        subdir: 'packages/core',
      };

      expect(config.branch).toBe('release/v2.0');
      expect(config.subdir).toBe('packages/core');
    });

    // Task 2.2: Project field support tests (string | string[])
    it('should allow project field as a single string', () => {
      const config: KiroxConfig = {
        project: 'my-project',
      };

      expect(config.project).toBe('my-project');
    });

    it('should allow project field as an array of strings', () => {
      const config: KiroxConfig = {
        project: ['project-a', 'project-b'],
      };

      expect(config.project).toEqual(['project-a', 'project-b']);
    });

    it('should allow project field as an array with one element', () => {
      const config: KiroxConfig = {
        project: ['single-project'],
      };

      expect(config.project).toEqual(['single-project']);
    });

    it('should allow project field to be undefined', () => {
      const config: KiroxConfig = {
        githubToken: 'ghp_test_token',
      };

      expect(config.project).toBeUndefined();
    });

    it('should allow project field alongside other fields', () => {
      const config: KiroxConfig = {
        githubToken: 'ghp_test_token',
        defaultConcurrency: 5,
        project: ['proj1', 'proj2'],
        branch: 'main',
        subdir: 'packages',
      };

      expect(config.project).toEqual(['proj1', 'proj2']);
      expect(config.branch).toBe('main');
      expect(config.subdir).toBe('packages');
    });
  });

  describe('MergedConfig', () => {
    it('should allow subdir field as optional string', () => {
      const config: MergedConfig = {
        concurrency: 5,
        outputDirectory: '.',
        verbose: false,
        force: false,
        dryRun: false,
        subdir: 'services/auth',
      };

      expect(config.subdir).toBe('services/auth');
    });

    it('should allow subdir field to be undefined', () => {
      const config: MergedConfig = {
        concurrency: 5,
        outputDirectory: '.',
        verbose: false,
        force: false,
        dryRun: false,
      };

      expect(config.subdir).toBeUndefined();
    });

    it('should allow empty subdir field for root directory', () => {
      const config: MergedConfig = {
        concurrency: 5,
        outputDirectory: '.',
        verbose: false,
        force: false,
        dryRun: false,
        subdir: '',
      };

      expect(config.subdir).toBe('');
    });

    it('should maintain backward compatibility with existing fields', () => {
      const config: MergedConfig = {
        githubToken: 'ghp_test_token',
        concurrency: 3,
        outputDirectory: './output',
        verbose: true,
        force: true,
        dryRun: true,
        subdir: 'apps/frontend',
      };

      expect(config.githubToken).toBe('ghp_test_token');
      expect(config.concurrency).toBe(3);
      expect(config.verbose).toBe(true);
      expect(config.dryRun).toBe(true);
    });

    // Task 4.1: Branch field support tests for MergedConfig
    it('should allow branch field as optional string', () => {
      const config: MergedConfig = {
        concurrency: 5,
        outputDirectory: '.',
        verbose: false,
        force: false,
        dryRun: false,
        branch: 'main',
      };

      expect(config.branch).toBe('main');
    });

    it('should allow branch field to be undefined', () => {
      const config: MergedConfig = {
        concurrency: 5,
        outputDirectory: '.',
        verbose: false,
        force: false,
        dryRun: false,
      };

      expect(config.branch).toBeUndefined();
    });

    it('should allow empty branch field for default branch', () => {
      const config: MergedConfig = {
        concurrency: 5,
        outputDirectory: '.',
        verbose: false,
        force: false,
        dryRun: false,
        branch: '',
      };

      expect(config.branch).toBe('');
    });

    it('should allow branch field with slash (feature/new-feature)', () => {
      const config: MergedConfig = {
        concurrency: 5,
        outputDirectory: '.',
        verbose: false,
        force: false,
        dryRun: false,
        branch: 'feature/new-feature',
      };

      expect(config.branch).toBe('feature/new-feature');
    });

    it('should allow branch field alongside subdir', () => {
      const config: MergedConfig = {
        concurrency: 5,
        outputDirectory: '.',
        verbose: false,
        force: false,
        dryRun: false,
        branch: 'develop',
        subdir: 'packages/api',
      };

      expect(config.branch).toBe('develop');
      expect(config.subdir).toBe('packages/api');
    });
  });
});
