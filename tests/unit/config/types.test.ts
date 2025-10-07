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
  });
});
