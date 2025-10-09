/**
 * Configuration Merger Unit Tests
 *
 * Tests for config merge logic including multi-project support.
 * Task 6.2: 設定マージ処理を更新
 */

import { describe, it, expect } from 'vitest';
import { mergeConfig, mergeProjects } from '../../../src/config/merger.js';
import type { ParsedArguments } from '../../../src/cli/types.js';
import type { KiroxConfig } from '../../../src/config/types.js';

describe('Configuration Merger - Multi-Project Support', () => {
  const createBaseArgs = (): ParsedArguments => ({
    repository: 'owner/repo',
    projects: [],
    output: '.',
    force: false,
    dryRun: false,
    verbose: false,
    config: undefined,
    track: false,
    checkUpdates: false,
    update: false,
    subdir: undefined,
  });

  describe('mergeProjects function', () => {
    it('should use CLI projects when both CLI and config file have projects', () => {
      // RED: CLI should take precedence over config file
      const cliProjects = ['cli-project1', 'cli-project2'];
      const configProject = ['config-project1', 'config-project2'];

      const result = mergeProjects(cliProjects, configProject);

      expect(result).toEqual(['cli-project1', 'cli-project2']);
    });

    it('should use config file projects when CLI projects is empty', () => {
      // RED: Config file should be used when CLI has no projects
      const cliProjects: string[] = [];
      const configProject = ['config-project1', 'config-project2'];

      const result = mergeProjects(cliProjects, configProject);

      expect(result).toEqual(['config-project1', 'config-project2']);
    });

    it('should parse string format config file project to array', () => {
      // RED: String format should be parsed
      const cliProjects: string[] = [];
      const configProject = 'proj1,proj2,proj3';

      const result = mergeProjects(cliProjects, configProject);

      expect(result).toEqual(['proj1', 'proj2', 'proj3']);
    });

    it('should accept array format config file project directly', () => {
      // RED: Array format should be used directly
      const cliProjects: string[] = [];
      const configProject = ['array-proj1', 'array-proj2'];

      const result = mergeProjects(cliProjects, configProject);

      expect(result).toEqual(['array-proj1', 'array-proj2']);
    });

    it('should handle single project string from config file', () => {
      // RED: Single project string (backward compatibility)
      const cliProjects: string[] = [];
      const configProject = 'single-project';

      const result = mergeProjects(cliProjects, configProject);

      expect(result).toEqual(['single-project']);
    });

    it('should handle undefined project in config file', () => {
      // RED: No project in config file
      const cliProjects = ['cli-project'];
      const configProject = undefined;

      const result = mergeProjects(cliProjects, configProject);

      expect(result).toEqual(['cli-project']);
    });

    it('should prioritize CLI single project over config array', () => {
      // RED: CLI precedence test
      const cliProjects = ['cli-only'];
      const configProject = ['config1', 'config2', 'config3'];

      const result = mergeProjects(cliProjects, configProject);

      expect(result).toEqual(['cli-only']);
    });

    it('should return empty array when both are empty', () => {
      // RED: Empty case
      const cliProjects: string[] = [];
      const configProject = undefined;

      const result = mergeProjects(cliProjects, configProject);

      expect(result).toEqual([]);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain existing merge behavior for other fields', async () => {
      // RED: Ensure other fields are not affected
      const args = createBaseArgs();
      args.verbose = true;
      args.force = true;

      const config: KiroxConfig = {
        githubToken: 'test-token',
        outputDirectory: './custom',
        project: 'test-project',
      };

      const merged = mergeConfig(args, config);

      expect(merged.verbose).toBe(true);
      expect(merged.force).toBe(true);
      expect(merged.githubToken).toBe('test-token');
      expect(merged.outputDirectory).toBe('./custom');
    });
  });
});
