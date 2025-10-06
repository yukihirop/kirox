import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mergeConfig } from '@/config/merger';
import type { ParsedArguments } from '@/cli/types';
import type { KiroxConfig } from '@/config/types';

describe('ConfigMerger', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('mergeConfig', () => {
    const createDefaultArgs = (): ParsedArguments => ({
      repository: 'owner/repo',
      project: 'test-project',
      force: false,
      dryRun: false,
      verbose: false,
    });

    it('should use default values when no other sources provided', () => {
      const args = createDefaultArgs();
      const config = mergeConfig(args, {});

      expect(config.concurrency).toBe(5);
      expect(config.outputDirectory).toBe(process.cwd());
      expect(config.verbose).toBe(false);
      expect(config.force).toBe(false);
      expect(config.dryRun).toBe(false);
    });

    it('should merge CLI options with highest priority', () => {
      const args = createDefaultArgs();
      args.force = true;
      args.verbose = true;

      const fileConfig: KiroxConfig = {
        force: false,
        verbose: false,
      };

      const config = mergeConfig(args, fileConfig);
      expect(config.force).toBe(true);
      expect(config.verbose).toBe(true);
    });

    it('should use config file values when CLI options not specified', () => {
      const args = createDefaultArgs();
      const fileConfig: KiroxConfig = {
        defaultConcurrency: 10,
        verbose: true,
      };

      const config = mergeConfig(args, fileConfig);
      expect(config.concurrency).toBe(10);
      expect(config.verbose).toBe(true);
    });

    it('should read GitHub token from environment variable', () => {
      process.env.GITHUB_TOKEN = 'env-token-123';

      const args = createDefaultArgs();
      const config = mergeConfig(args, {});

      expect(config.githubToken).toBe('env-token-123');
    });

    it('should prioritize config file token over environment variable', () => {
      process.env.GITHUB_TOKEN = 'env-token';

      const args = createDefaultArgs();
      const fileConfig: KiroxConfig = {
        githubToken: 'file-token',
      };

      const config = mergeConfig(args, fileConfig);
      expect(config.githubToken).toBe('file-token');
    });

    it('should use config file output directory', () => {
      const args = createDefaultArgs();
      const fileConfig: KiroxConfig = {
        outputDirectory: '/custom/output',
      };

      const config = mergeConfig(args, fileConfig);
      expect(config.outputDirectory).toBe('/custom/output');
    });

    it('should respect dry-run flag from CLI', () => {
      const args = createDefaultArgs();
      args.dryRun = true;

      const config = mergeConfig(args, {});
      expect(config.dryRun).toBe(true);
    });

    it('should validate concurrency range (1-10)', () => {
      const args = createDefaultArgs();
      const fileConfig: KiroxConfig = {
        defaultConcurrency: 15,
      };

      const config = mergeConfig(args, fileConfig);
      // Should clamp to max value of 10
      expect(config.concurrency).toBeLessThanOrEqual(10);
    });

    it('should handle all priority levels correctly', () => {
      process.env.GITHUB_TOKEN = 'env-token';

      const args = createDefaultArgs();
      args.verbose = true; // CLI priority

      const fileConfig: KiroxConfig = {
        githubToken: 'file-token', // Config file priority
        defaultConcurrency: 7,
        force: true,
      };

      const config = mergeConfig(args, fileConfig);

      expect(config.verbose).toBe(true); // CLI wins
      expect(config.githubToken).toBe('file-token'); // Config file wins over env
      expect(config.concurrency).toBe(7); // Config file value
      expect(config.force).toBe(true); // Config file value
    });

    it('should merge all config sources comprehensively', () => {
      process.env.GITHUB_TOKEN = 'env-token';

      const args = createDefaultArgs();
      args.force = true;
      args.dryRun = true;

      const fileConfig: KiroxConfig = {
        defaultConcurrency: 3,
        verbose: true,
        outputDirectory: '/tmp/output',
      };

      const config = mergeConfig(args, fileConfig);

      expect(config.force).toBe(true);
      expect(config.dryRun).toBe(true);
      expect(config.verbose).toBe(true);
      expect(config.concurrency).toBe(3);
      expect(config.outputDirectory).toBe('/tmp/output');
      expect(config.githubToken).toBe('env-token');
    });
  });
});
