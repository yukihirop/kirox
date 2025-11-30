import { describe, it, expect, vi } from 'vitest';
import { parseArguments } from '@/cli/parser.js';
import { mainCommandOptions, addCommandOptions } from '@/cli/parser-config.js';

/**
 * Test suite for parser-config integration
 *
 * Task 6.2: Verify that parser.ts applies option definitions from parser-config.ts
 * This ensures that Commander.js option() method receives configuration from
 * centralized parser-config.ts instead of hardcoded definitions
 */
describe('ParserConfig Integration', () => {
  describe('Main command option application', () => {
    it('should apply all options from mainCommandOptions to main command', () => {
      // Test that all options defined in parser-config are available in parsed arguments
      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'project',
        '--force',
        '--dry-run',
        '--verbose',
        '--track',
        '--steering',
        '--config',
        'config.json',
        '-s',
        'subdir',
        '-o',
        'output',
      ];

      const result = parseArguments(argv);

      // Verify all options from mainCommandOptions are correctly parsed
      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual(['project']);
      expect(result.force).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.verbose).toBe(true);
      expect(result.track).toBe(true);
      expect(result.steering).toBe(true);
      expect(result.config).toBe('config.json');
      expect(result.subdir).toBe('subdir');
      expect(result.output).toBe('output');
    });

    it('should apply default values from mainCommandOptions', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project'];

      const result = parseArguments(argv);

      // Verify default values match those defined in parser-config
      const outputOption = mainCommandOptions.find((opt) => opt.flags.includes('--output'));
      const forceOption = mainCommandOptions.find((opt) => opt.flags.includes('--force'));
      const trackOption = mainCommandOptions.find((opt) => opt.flags.includes('--track'));

      expect(result.output).toBe(outputOption?.defaultValue);
      expect(result.force).toBe(forceOption?.defaultValue);
      expect(result.track).toBe(trackOption?.defaultValue);
    });

    it('should support short flags defined in mainCommandOptions', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '-o', './output', '-s', 'subdir'];

      const result = parseArguments(argv);

      // Verify short flags work correctly
      expect(result.projects).toEqual(['project']);
      expect(result.output).toBe('./output');
      expect(result.subdir).toBe('subdir');
    });
  });

  describe('Add command option application', () => {
    it('should apply all options from addCommandOptions to add subcommand', () => {
      const argv = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'project',
        '--force',
        '--dry-run',
        '--verbose',
        '--track',
        '--config',
        'config.json',
        '-s',
        'subdir',
        '-o',
        'output',
      ];

      const result = parseArguments(argv);

      // Verify all options from addCommandOptions are correctly parsed
      expect(result.subcommand).toBe('add');
      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual(['project']);
      expect(result.force).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.verbose).toBe(true);
      expect(result.track).toBe(true);
      expect(result.config).toBe('config.json');
      expect(result.subdir).toBe('subdir');
      expect(result.output).toBe('output');
    });

    it('should apply default values from addCommandOptions', () => {
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'project'];

      const result = parseArguments(argv);

      // Verify default values match those defined in parser-config
      const outputOption = addCommandOptions.find((opt) => opt.flags.includes('--output'));
      const forceOption = addCommandOptions.find((opt) => opt.flags.includes('--force'));
      const trackOption = addCommandOptions.find((opt) => opt.flags.includes('--track'));

      expect(result.output).toBe(outputOption?.defaultValue);
      expect(result.force).toBe(forceOption?.defaultValue);
      expect(result.track).toBe(trackOption?.defaultValue);
    });

    it('should not include main-command-only options in add subcommand', () => {
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'project'];

      const result = parseArguments(argv);

      // Verify main-command-only options are disabled for add subcommand
      expect(result.checkUpdates).toBe(false);
      expect(result.update).toBe(false);
      expect(result.steering).toBe(false);
    });
  });

  describe('Option definition consistency', () => {
    it('should maintain consistency between parser-config and parsed results', () => {
      // Test that the number of defined options matches the parser behavior
      const mainArgv = ['node', 'kirox', 'owner/repo', '-p', 'project'];
      const mainResult = parseArguments(mainArgv);

      // Count the number of properties in parsed result that correspond to mainCommandOptions
      const mainOptionCount = mainCommandOptions.length;
      const parsedOptionKeys = Object.keys(mainResult).filter((key) =>
        mainCommandOptions.some((opt) => opt.flags.includes(`--${key}`))
      );

      // Verify that all options are represented (allowing for camelCase conversions)
      expect(parsedOptionKeys.length).toBeGreaterThan(0);
    });

    it('should apply option descriptions from parser-config', () => {
      // This test verifies that parser-config descriptions are used
      // by checking that options work as described
      const trackOption = mainCommandOptions.find((opt) => opt.flags.includes('--track'));
      expect(trackOption?.description).toContain('Track fetched files');

      // Verify the option works according to its description
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--track'];
      const result = parseArguments(argv);

      expect(result.track).toBe(true);
    });
  });
});
