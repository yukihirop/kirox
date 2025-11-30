import { describe, it, expect } from 'vitest';
import {
  mainCommandOptions,
  addCommandOptions,
  completionCommandConfig,
  type CommandOption,
} from '@/cli/parser-config.js';

describe('ParserConfig', () => {
  describe('mainCommandOptions', () => {
    it('should define all required main command options', () => {
      expect(mainCommandOptions).toBeDefined();
      expect(Array.isArray(mainCommandOptions)).toBe(true);
      expect(mainCommandOptions.length).toBeGreaterThan(0);
    });

    it('should include project option with correct flags', () => {
      const projectOption = mainCommandOptions.find((opt) => opt.flags.includes('--project'));

      expect(projectOption).toBeDefined();
      expect(projectOption?.flags).toBe('-p, --project <name>');
      expect(projectOption?.description).toContain('Project name');
    });

    it('should include output option with default value', () => {
      const outputOption = mainCommandOptions.find((opt) => opt.flags.includes('--output'));

      expect(outputOption).toBeDefined();
      expect(outputOption?.flags).toBe('-o, --output <path>');
      expect(outputOption?.defaultValue).toBe('.');
    });

    it('should include boolean flags without default values in flags string', () => {
      const forceOption = mainCommandOptions.find((opt) => opt.flags.includes('--force'));

      expect(forceOption).toBeDefined();
      expect(forceOption?.flags).toBe('--force');
      expect(forceOption?.defaultValue).toBe(false);
    });

    it('should include all main command specific options', () => {
      const optionFlags = mainCommandOptions.map((opt) => opt.flags);

      expect(optionFlags).toContain('--track');
      expect(optionFlags).toContain('--check-updates');
      expect(optionFlags).toContain('--update');
      expect(optionFlags).toContain('--steering');
    });

    it('should have explicit types for all options', () => {
      mainCommandOptions.forEach((option) => {
        expect(option).toHaveProperty('flags');
        expect(option).toHaveProperty('description');
        expect(typeof option.flags).toBe('string');
        expect(typeof option.description).toBe('string');
      });
    });
  });

  describe('addCommandOptions', () => {
    it('should define all required add command options', () => {
      expect(addCommandOptions).toBeDefined();
      expect(Array.isArray(addCommandOptions)).toBe(true);
      expect(addCommandOptions.length).toBeGreaterThan(0);
    });

    it('should include shared options with main command', () => {
      const addFlags = addCommandOptions.map((opt) => opt.flags);

      expect(addFlags).toContain('-p, --project <name>');
      expect(addFlags).toContain('-o, --output <path>');
      expect(addFlags).toContain('--force');
      expect(addFlags).toContain('--verbose');
    });

    it('should include add-specific track option', () => {
      const trackOption = addCommandOptions.find((opt) => opt.flags.includes('--track'));

      expect(trackOption).toBeDefined();
      expect(trackOption?.defaultValue).toBe(false);
    });

    it('should not include main-command-only options', () => {
      const addFlags = addCommandOptions.map((opt) => opt.flags);

      expect(addFlags).not.toContain('--check-updates');
      expect(addFlags).not.toContain('--update');
      expect(addFlags).not.toContain('--steering');
    });

    it('should have consistent option structure with main command', () => {
      addCommandOptions.forEach((option) => {
        expect(option).toHaveProperty('flags');
        expect(option).toHaveProperty('description');
        expect(typeof option.flags).toBe('string');
        expect(typeof option.description).toBe('string');
      });
    });
  });

  describe('completionCommandConfig', () => {
    it('should define completion command configuration', () => {
      expect(completionCommandConfig).toBeDefined();
      expect(typeof completionCommandConfig).toBe('object');
    });

    it('should include command name and description', () => {
      expect(completionCommandConfig).toHaveProperty('name');
      expect(completionCommandConfig).toHaveProperty('description');
      expect(completionCommandConfig.name).toBe('kirox completion');
      expect(typeof completionCommandConfig.description).toBe('string');
    });

    it('should include argument definition', () => {
      expect(completionCommandConfig).toHaveProperty('argument');
      expect(completionCommandConfig.argument).toBeDefined();
      expect(typeof completionCommandConfig.argument?.syntax).toBe('string');
      expect(typeof completionCommandConfig.argument?.description).toBe('string');
    });

    it('should have explicit return type', () => {
      expect(completionCommandConfig.name).toBeDefined();
      expect(typeof completionCommandConfig.name).toBe('string');
    });
  });

  describe('CommandOption type', () => {
    it('should ensure type safety for option objects', () => {
      const testOption: CommandOption = {
        flags: '-t, --test <value>',
        description: 'Test option',
        defaultValue: 'default',
      };

      expect(testOption.flags).toBe('-t, --test <value>');
      expect(testOption.description).toBe('Test option');
      expect(testOption.defaultValue).toBe('default');
    });

    it('should allow optional defaultValue', () => {
      const testOption: CommandOption = {
        flags: '--test',
        description: 'Test flag',
      };

      expect(testOption.flags).toBe('--test');
      expect(testOption.description).toBe('Test flag');
      expect(testOption.defaultValue).toBeUndefined();
    });
  });
});
