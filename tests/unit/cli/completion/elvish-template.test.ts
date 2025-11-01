/**
 * Elvish Template Tests
 *
 * Tests for Elvish completion script generation
 * Task 8.1: ElvishTemplate implementation
 * Task 8.2: Elvish syntax validation
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { generateCompletionScript, type CompletionMetadata } from '@/cli/completion/generator.js';

describe('Elvish Template Generation', () => {
  describe('Basic Script Structure', () => {
    it('should generate a valid Elvish completion script', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build project', options: [] }],
        globalOptions: [{ flag: '--help', description: 'Display help' }],
      };

      const script = generateCompletionScript('elvish', metadata);

      // Elvish script header
      expect(script).toContain('# Elvish completion script for testcli');

      // arg-completer definition
      expect(script).toContain('set edit:completion:arg-completer[testcli]');

      // Lambda syntax with @args
      expect(script).toContain('{|@args|');

      // has-subcommand function
      expect(script).toContain('fn has-subcommand');

      // Conditional logic
      expect(script).toContain('if (not (has-subcommand))');

      // put statements for completion
      expect(script).toContain('put');
    });

    it('should use arg-completer syntax', () => {
      const metadata: CompletionMetadata = {
        programName: 'kirox',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('set edit:completion:arg-completer[kirox] = {|@args|');
      expect(script).toContain('}');
    });

    it('should define has-subcommand function', () => {
      const metadata: CompletionMetadata = {
        programName: 'testapp',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('fn has-subcommand {');
      expect(script).toContain('for arg $args {');
      expect(script).toContain('if (and (not (has-prefix $arg \'-\'))');
      expect(script).toContain('put $true');
      expect(script).toContain('return');
      expect(script).toContain('put $false');
    });
  });

  describe('Program Name Injection', () => {
    it('should inject program name into header comment', () => {
      const metadata: CompletionMetadata = {
        programName: 'mycli',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('# Elvish completion script for mycli');
    });

    it('should inject program name into arg-completer', () => {
      const metadata: CompletionMetadata = {
        programName: 'customapp',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('set edit:completion:arg-completer[customapp]');
    });

    it('should inject program name into has-subcommand check', () => {
      const metadata: CompletionMetadata = {
        programName: 'myapp',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain("(not-eq $arg 'myapp')");
    });

    it('should handle program names with hyphens', () => {
      const metadata: CompletionMetadata = {
        programName: 'my-cli-tool',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('# Elvish completion script for my-cli-tool');
      expect(script).toContain('set edit:completion:arg-completer[my-cli-tool]');
      expect(script).toContain("(not-eq $arg 'my-cli-tool')");
    });
  });

  describe('Subcommand Completion', () => {
    it('should include single subcommand', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'init', description: 'Initialize project', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('put init');
    });

    it('should include multiple subcommands separated by space', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [
          { name: 'build', description: 'Build project', options: [] },
          { name: 'test', description: 'Run tests', options: [] },
          { name: 'deploy', description: 'Deploy app', options: [] },
        ],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('put build test deploy');
    });

    it('should complete subcommands only when no subcommand detected', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build project', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('if (not (has-subcommand)) {');
      expect(script).toContain('put build');
      expect(script).toContain('return');
    });

    it('should handle empty subcommands array', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('elvish', metadata);

      // Empty put statement
      expect(script).toMatch(/put\s+\n/);
    });
  });

  describe('Option Completion', () => {
    it('should include single global option', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '--verbose', description: 'Verbose output' }],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('put --verbose');
    });

    it('should include multiple global options separated by space', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [
          { flag: '--help', description: 'Display help' },
          { flag: '--version', description: 'Show version' },
          { flag: '--verbose', description: 'Verbose output' },
        ],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('put --help --version --verbose');
    });

    it('should extract short and long flags from option definition', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '-h, --help', description: 'Display help' }],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('-h');
      expect(script).toContain('--help');
    });

    it('should remove parameter placeholders from flags', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [
          { flag: '-p, --project <name>', description: 'Project name' },
          { flag: '--config [file]', description: 'Config file' },
        ],
      };

      const script = generateCompletionScript('elvish', metadata);

      // Should have flags without placeholders
      expect(script).toContain('-p');
      expect(script).toContain('--project');
      expect(script).toContain('--config');

      // Should not contain placeholders
      expect(script).not.toContain('<name>');
      expect(script).not.toContain('[file]');
    });

    it('should include both global and subcommand-specific options', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [
          {
            name: 'build',
            description: 'Build project',
            options: [{ flag: '--watch', description: 'Watch mode' }],
          },
        ],
        globalOptions: [{ flag: '--verbose', description: 'Verbose output' }],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('--verbose');
      expect(script).toContain('--watch');
    });

    it('should deduplicate options across subcommands', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [
          {
            name: 'build',
            description: 'Build project',
            options: [{ flag: '--force', description: 'Force build' }],
          },
          {
            name: 'deploy',
            description: 'Deploy app',
            options: [{ flag: '--force', description: 'Force deploy' }],
          },
        ],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      // Should appear only once in the option completion section
      const forceMatches = script.match(/--force/g) || [];
      expect(forceMatches.length).toBe(1);
    });

    it('should complete options after subcommand detection', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build', options: [] }],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('elvish', metadata);

      // Options are shown after the subcommand completion block
      const lines = script.split('\n');
      const subcommandReturnIndex = lines.findIndex((l) => l.includes('return') && l.trim() === 'return');
      const optionPutIndex = lines.findIndex((l, i) => i > subcommandReturnIndex && l.includes('put --help'));

      expect(optionPutIndex).toBeGreaterThan(subcommandReturnIndex);
    });

    it('should handle empty options array', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      // Should still have a put statement for options (empty)
      expect(script).toContain('# Complete options');
    });
  });

  describe('Context-Aware Completion Logic', () => {
    it('should use has-prefix to detect option flags', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'test', description: 'Run tests', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain("(not (has-prefix $arg '-'))");
    });

    it('should use not-eq to exclude program name', () => {
      const metadata: CompletionMetadata = {
        programName: 'myapp',
        subcommands: [{ name: 'start', description: 'Start', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain("(not-eq $arg 'myapp')");
    });

    it('should use and operator for compound conditions', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('if (and (not (has-prefix $arg \'-\'))');
    });

    it('should return true when subcommand detected', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'test', description: 'Test', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('put $true');
      expect(script).toContain('return');
    });

    it('should return false when no subcommand detected', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'test', description: 'Test', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('put $false');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal metadata (no subcommands or options)', () => {
      const metadata: CompletionMetadata = {
        programName: 'minimal',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('# Elvish completion script for minimal');
      expect(script).toContain('set edit:completion:arg-completer[minimal]');
      expect(script).toContain('fn has-subcommand');
    });

    it('should handle subcommands with special characters in names', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build-prod', description: 'Build production', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('put build-prod');
    });

    it('should handle many subcommands (10+)', () => {
      const metadata: CompletionMetadata = {
        programName: 'bigcli',
        subcommands: Array.from({ length: 15 }, (_, i) => ({
          name: `cmd${i + 1}`,
          description: `Command ${i + 1}`,
          options: [],
        })),
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('cmd1');
      expect(script).toContain('cmd10');
      expect(script).toContain('cmd15');
    });

    it('should handle many options (20+)', () => {
      const metadata: CompletionMetadata = {
        programName: 'bigcli',
        subcommands: [],
        globalOptions: Array.from({ length: 25 }, (_, i) => ({
          flag: `--option${i + 1}`,
          description: `Option ${i + 1}`,
        })),
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(script).toContain('--option1');
      expect(script).toContain('--option20');
      expect(script).toContain('--option25');
    });

    it('should handle subcommands with single quotes in descriptions', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'test', description: "Run project's tests", options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      // Subcommand name should still appear in completion
      expect(script).toContain('put test');
    });
  });

  describe('Real-world Kirox CLI', () => {
    it('should generate correct Elvish script for Kirox CLI', () => {
      const metadata: CompletionMetadata = {
        programName: 'kirox',
        subcommands: [
          {
            name: 'add',
            description: 'Add a new project from a remote repository',
            options: [
              { flag: '-p, --project <name>', description: 'Project name to add' },
              { flag: '--track', description: 'Enable update tracking for this project' },
              { flag: '--force', description: 'Force overwrite existing project' },
              { flag: '--dry-run', description: 'Preview without executing' },
              { flag: '--verbose', description: 'Verbose output' },
            ],
          },
          {
            name: 'completion',
            description: 'Generate shell completion script',
            options: [{ flag: '-h, --help', description: 'Display help for completion command' }],
          },
        ],
        globalOptions: [
          { flag: '-h, --help', description: 'Display help information' },
          { flag: '-V, --version', description: 'Output version number' },
        ],
      };

      const script = generateCompletionScript('elvish', metadata);

      // Program name
      expect(script).toContain('# Elvish completion script for kirox');
      expect(script).toContain('set edit:completion:arg-completer[kirox]');
      expect(script).toContain("(not-eq $arg 'kirox')");

      // Subcommands
      expect(script).toContain('add');
      expect(script).toContain('completion');

      // Options (should be deduplicated)
      expect(script).toContain('-p');
      expect(script).toContain('--project');
      expect(script).toContain('--track');
      expect(script).toContain('--force');
      expect(script).toContain('--dry-run');
      expect(script).toContain('--verbose');
      expect(script).toContain('-h');
      expect(script).toContain('--help');
      expect(script).toContain('-V');
      expect(script).toContain('--version');

      // Structure
      expect(script).toContain('fn has-subcommand');
      expect(script).toContain('if (not (has-subcommand))');
      expect(script).toContain('put add completion');
    });
  });

  describe('Comparison with Other Shells', () => {
    it('should have Elvish-specific syntax', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build', options: [] }],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const elvishScript = generateCompletionScript('elvish', metadata);

      // Elvish-specific
      expect(elvishScript).toContain('edit:completion:arg-completer');
      expect(elvishScript).toContain('{|@args|');
      expect(elvishScript).toContain('has-prefix');
      expect(elvishScript).toContain('not-eq');

      // NOT Bash
      expect(elvishScript).not.toContain('_init_completion');
      expect(elvishScript).not.toContain('COMPREPLY');

      // NOT Zsh
      expect(elvishScript).not.toContain('#compdef');
      expect(elvishScript).not.toContain('_arguments');

      // NOT Fish
      expect(elvishScript).not.toContain('complete -c');
      expect(elvishScript).not.toContain('__fish_use_subcommand');

      // NOT PowerShell
      expect(elvishScript).not.toContain('Register-ArgumentCompleter');
      expect(elvishScript).not.toContain('CompletionResult');
    });
  });

  describe('Elvish Syntax Validation (Task 8.2)', () => {
    /**
     * Helper function to check if Elvish is available on the system
     */
    function isElvishAvailable(): boolean {
      try {
        execSync('elvish -version', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Helper function to validate Elvish script syntax
     * Uses `elvish -compileonly` to check syntax without executing
     */
    function validateElvishSyntax(script: string): void {
      if (!isElvishAvailable()) {
        console.warn('Elvish is not available on this system, skipping syntax validation');
        return;
      }

      try {
        execSync('elvish -compileonly', {
          input: script,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (error) {
        throw new Error(`Elvish syntax validation failed: ${error}`);
      }
    }

    it('should generate syntactically valid Elvish script', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build project', options: [] }],
        globalOptions: [{ flag: '--help', description: 'Display help' }],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(() => validateElvishSyntax(script)).not.toThrow();
    });

    it('should pass Elvish syntax check with empty subcommands', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(() => validateElvishSyntax(script)).not.toThrow();
    });

    it('should pass Elvish syntax check with empty options', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'test', description: 'Run tests', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(() => validateElvishSyntax(script)).not.toThrow();
    });

    it('should pass Elvish syntax check with many subcommands', () => {
      const metadata: CompletionMetadata = {
        programName: 'bigcli',
        subcommands: Array.from({ length: 20 }, (_, i) => ({
          name: `cmd${i + 1}`,
          description: `Command ${i + 1}`,
          options: [],
        })),
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(() => validateElvishSyntax(script)).not.toThrow();
    });

    it('should pass Elvish syntax check with many options', () => {
      const metadata: CompletionMetadata = {
        programName: 'bigcli',
        subcommands: [{ name: 'test', description: 'Test', options: [] }],
        globalOptions: Array.from({ length: 30 }, (_, i) => ({
          flag: `--option${i + 1}`,
          description: `Option ${i + 1}`,
        })),
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(() => validateElvishSyntax(script)).not.toThrow();
    });

    it('should pass Elvish syntax check with special characters in names', () => {
      const metadata: CompletionMetadata = {
        programName: 'my-cli-tool',
        subcommands: [
          { name: 'build-prod', description: 'Build production', options: [] },
          { name: 'test-unit', description: 'Run unit tests', options: [] },
        ],
        globalOptions: [
          { flag: '--dry-run', description: 'Dry run mode' },
          { flag: '--no-cache', description: 'Disable cache' },
        ],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(() => validateElvishSyntax(script)).not.toThrow();
    });

    it('should pass Elvish syntax check with real Kirox metadata', () => {
      const metadata: CompletionMetadata = {
        programName: 'kirox',
        subcommands: [
          {
            name: 'add',
            description: 'Add a new project from a remote repository',
            options: [
              { flag: '-p, --project <name>', description: 'Project name to add' },
              { flag: '--track', description: 'Enable update tracking for this project' },
              { flag: '--force', description: 'Force overwrite existing project' },
              { flag: '--dry-run', description: 'Preview without executing' },
              { flag: '--verbose', description: 'Verbose output' },
            ],
          },
          {
            name: 'completion',
            description: 'Generate shell completion script',
            options: [{ flag: '-h, --help', description: 'Display help for completion command' }],
          },
        ],
        globalOptions: [
          { flag: '-h, --help', description: 'Display help information' },
          { flag: '-V, --version', description: 'Output version number' },
        ],
      };

      const script = generateCompletionScript('elvish', metadata);

      expect(() => validateElvishSyntax(script)).not.toThrow();
    });
  });
});
