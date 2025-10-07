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

    describe('subdir configuration merge', () => {
      it('should prioritize CLI subdir option over config file', () => {
        const args = createDefaultArgs();
        args.subdir = 'packages/cli';

        const fileConfig: KiroxConfig = {
          subdir: 'packages/api',
        };

        const config = mergeConfig(args, fileConfig);
        expect(config.subdir).toBe('packages/cli');
      });

      it('should use config file subdir when CLI option not specified', () => {
        const args = createDefaultArgs();
        // subdir not set in args

        const fileConfig: KiroxConfig = {
          subdir: 'packages/api',
        };

        const config = mergeConfig(args, fileConfig);
        expect(config.subdir).toBe('packages/api');
      });

      it('should handle empty string subdir in CLI as root directory', () => {
        const args = createDefaultArgs();
        args.subdir = '';

        const fileConfig: KiroxConfig = {
          subdir: 'packages/api',
        };

        const config = mergeConfig(args, fileConfig);
        expect(config.subdir).toBe('');
      });

      it('should handle empty string subdir in config file as root directory', () => {
        const args = createDefaultArgs();

        const fileConfig: KiroxConfig = {
          subdir: '',
        };

        const config = mergeConfig(args, fileConfig);
        expect(config.subdir).toBe('');
      });

      it('should leave subdir undefined when not specified anywhere', () => {
        const args = createDefaultArgs();
        const fileConfig: KiroxConfig = {};

        const config = mergeConfig(args, fileConfig);
        expect(config.subdir).toBeUndefined();
      });

      it('should prioritize CLI empty string over config file subdir', () => {
        const args = createDefaultArgs();
        args.subdir = '';

        const fileConfig: KiroxConfig = {
          subdir: 'packages/api',
        };

        const config = mergeConfig(args, fileConfig);
        expect(config.subdir).toBe('');
      });
    });

    // Task 4.2: Branch configuration merge tests
    describe('branch configuration merge', () => {
      it('should use config file branch when CLI has no branch', () => {
        const args = createDefaultArgs();
        // No branch in repository (owner/repo format)

        const fileConfig: KiroxConfig = {
          branch: 'develop',
        };

        const config = mergeConfig(args, fileConfig);
        expect(config.branch).toBe('develop');
      });

      it('should prioritize CLI branch over config file branch', () => {
        const args = createDefaultArgs();
        args.repository = 'owner/repo#feature-branch';

        const fileConfig: KiroxConfig = {
          branch: 'develop',
        };

        const config = mergeConfig(args, fileConfig);
        expect(config.branch).toBe('feature-branch');
      });

      it('should leave branch undefined when not specified anywhere', () => {
        const args = createDefaultArgs();
        // No branch in repository or config

        const fileConfig: KiroxConfig = {};

        const config = mergeConfig(args, fileConfig);
        expect(config.branch).toBeUndefined();
      });

      it('should normalize empty string branch to undefined', () => {
        const args = createDefaultArgs();

        const fileConfig: KiroxConfig = {
          branch: '',
        };

        const config = mergeConfig(args, fileConfig);
        expect(config.branch).toBeUndefined();
      });

      it('should normalize empty string branch from CLI to undefined', () => {
        const args = createDefaultArgs();
        args.repository = 'owner/repo#'; // Empty branch after #

        const fileConfig: KiroxConfig = {};

        const config = mergeConfig(args, fileConfig);
        expect(config.branch).toBeUndefined();
      });

      it('should handle branch with slashes (feature/new-api)', () => {
        const args = createDefaultArgs();

        const fileConfig: KiroxConfig = {
          branch: 'feature/new-api',
        };

        const config = mergeConfig(args, fileConfig);
        expect(config.branch).toBe('feature/new-api');
      });

      it('should handle version tag (v1.2.3)', () => {
        const args = createDefaultArgs();
        args.repository = 'owner/repo#v1.2.3';

        const fileConfig: KiroxConfig = {};

        const config = mergeConfig(args, fileConfig);
        expect(config.branch).toBe('v1.2.3');
      });

      it('should merge branch alongside other config values', () => {
        const args = createDefaultArgs();
        args.verbose = true;
        args.repository = 'owner/repo#release/v2.0';

        const fileConfig: KiroxConfig = {
          branch: 'develop',
          subdir: 'packages/core',
          defaultConcurrency: 3,
        };

        const config = mergeConfig(args, fileConfig);
        expect(config.branch).toBe('release/v2.0');
        expect(config.subdir).toBe('packages/core');
        expect(config.concurrency).toBe(3);
        expect(config.verbose).toBe(true);
      });
    });
  });
});
