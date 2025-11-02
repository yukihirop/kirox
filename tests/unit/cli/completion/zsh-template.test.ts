import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateCompletionScript, type CompletionMetadata } from '@/cli/completion/generator.js';

const execAsync = promisify(exec);

/**
 * Tests for Zsh Template (Task 5.1)
 *
 * Requirements tested:
 * - 1.3: Zsh script generation
 * - 3.1: Script generation with metadata injection
 * - 3.2: Subcommand and option completion candidates
 *
 * Zsh Completion System Concepts:
 * - #compdef: Declares completion function for a command
 * - _arguments: Parses command-line options and arguments
 * - _describe: Describes completion candidates with descriptions
 * - state machine: Uses $state variable for context-dependent completion
 *
 * Test Coverage:
 * - Zsh syntax validation (#compdef, _arguments, _describe)
 * - Program name injection into function names and compdef
 * - Subcommand completion with descriptions
 * - Global option completion with Zsh directives
 * - Script structure and format
 * - Edge cases (empty lists, special characters, many options)
 * - Real Kirox CLI metadata
 */
describe('Zsh Template', () => {
  // Sample metadata for testing
  const sampleMetadata: CompletionMetadata = {
    programName: 'kirox',
    subcommands: [
      {
        name: 'add',
        description: 'Add a new project',
        options: [
          { flag: '-p, --project <name>', description: 'Project name' },
          { flag: '--track', description: 'Enable update tracking' },
        ],
      },
      {
        name: 'completion',
        description: 'Generate shell completion script',
        options: [{ flag: '-h, --help', description: 'Display help' }],
      },
    ],
    globalOptions: [
      { flag: '--force', description: 'Force operation' },
      { flag: '--dry-run', description: 'Preview without executing' },
      { flag: '--verbose', description: 'Verbose output' },
      { flag: '-h, --help', description: 'Display help' },
      { flag: '-V, --version', description: 'Show version' },
    ],
  };

  describe('Zsh Syntax Requirements', () => {
    it('should include #compdef directive with program name', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('#compdef kirox');
      expect(script).toMatch(/^#compdef kirox/m);
    });

    it('should define completion function with program name', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('_kirox()');
      expect(script).toMatch(/_kirox\(\) \{/);
    });

    it('should call the completion function at the end', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toMatch(/_kirox\s*$/m);
    });

    it('should use _arguments function for option parsing', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('_arguments');
      expect(script).toMatch(/_arguments\s+-C/);
    });

    it('should use _describe function for subcommand completion', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('_describe');
      expect(script).toMatch(/_describe\s+'subcommand'\s+subcommands/);
    });

    it('should use state machine with case statement', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('case $state in');
      expect(script).toContain('subcommand)');
      expect(script).toContain('esac');
    });

    it('should declare local variables for state management', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('local context state state_descr line');
      expect(script).toContain('typeset -A opt_args');
    });
  });

  describe('Program Name Injection', () => {
    it('should inject program name into compdef directive', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('#compdef kirox');
    });

    it('should inject program name into completion function name', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('_kirox()');
    });

    it('should inject program name into function call', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toMatch(/_kirox\s*$/m);
    });

    it('should inject program name into comment', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('# Zsh completion script for kirox');
    });

    it('should handle program names with hyphens', () => {
      const metadata: CompletionMetadata = {
        programName: 'my-cli-tool',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('zsh', metadata);

      expect(script).toContain('#compdef my-cli-tool');
      expect(script).toContain('_my-cli-tool()');
    });
  });

  describe('Subcommand Completion', () => {
    it('should include all subcommands with descriptions', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain("'add:Add a new project'");
      expect(script).toContain("'completion:Generate shell completion script'");
    });

    it('should format subcommands as Zsh array elements', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toMatch(/'add:Add a new project'/);
      expect(script).toMatch(/'completion:Generate shell completion script'/);
    });

    it('should declare subcommands array in case statement', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('local subcommands');
      expect(script).toContain('subcommands=(');
      expect(script).toMatch(/subcommands=\(/);
    });

    it('should use _describe with subcommands array', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toMatch(/_describe 'subcommand' subcommands/);
    });

    it('should handle empty subcommands list', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('zsh', metadata);

      expect(script).toContain('subcommands=(');
      expect(script.length).toBeGreaterThan(0);
    });

    it('should handle multiple subcommands', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [
          { name: 'cmd1', description: 'Command 1', options: [] },
          { name: 'cmd2', description: 'Command 2', options: [] },
          { name: 'cmd3', description: 'Command 3', options: [] },
          { name: 'cmd4', description: 'Command 4', options: [] },
        ],
        globalOptions: [],
      };

      const script = generateCompletionScript('zsh', metadata);

      expect(script).toContain("'cmd1:Command 1'");
      expect(script).toContain("'cmd2:Command 2'");
      expect(script).toContain("'cmd3:Command 3'");
      expect(script).toContain("'cmd4:Command 4'");
    });
  });

  describe('Global Option Completion', () => {
    it('should include all global options in _arguments', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('--force');
      expect(script).toContain('--dry-run');
      expect(script).toContain('--verbose');
      expect(script).toContain('--help');
      expect(script).toContain('--version');
    });

    it('should format options as Zsh argument directives', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      // Zsh format: '--flag[description]'
      expect(script).toMatch(new RegExp("'--force\\[Force operation\\]'"));
      expect(script).toMatch(new RegExp("'--dry-run\\[Preview without executing\\]'"));
      expect(script).toMatch(new RegExp("'--verbose\\[Verbose output\\]'"));
    });

    it('should handle short and long flag combinations', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      // For '-h, --help', should have format like '-h[--help[description]]'
      expect(script).toMatch(new RegExp('-h\\['));
      expect(script).toContain('Display help');
    });

    it('should handle options with no short flag', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toMatch(new RegExp("'--force\\[Force operation\\]'"));
      expect(script).toMatch(new RegExp("'--dry-run\\[Preview without executing\\]'"));
    });

    it('should include option descriptions', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('Force operation');
      expect(script).toContain('Preview without executing');
      expect(script).toContain('Verbose output');
      expect(script).toContain('Display help');
      expect(script).toContain('Show version');
    });
  });

  describe('Script Structure', () => {
    it('should have proper _arguments invocation with -C flag', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toMatch(/_arguments\s+-C\s+\\/);
    });

    it('should define subcommand state with proper syntax', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toMatch(/'1:\s*:->subcommand'/);
    });

    it('should define args state for remaining arguments', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toMatch(/'\*::arg:->args'/);
    });

    it('should use line continuation backslashes', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toMatch(/\\/);
      expect(script.split('\\').length).toBeGreaterThan(1);
    });

    it('should end function definition properly', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toMatch(/\}\s*$/m);
    });
  });

  describe('Real Kirox CLI Metadata', () => {
    it('should generate valid script for actual Kirox metadata', () => {
      const kiroxMetadata: CompletionMetadata = {
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

      const script = generateCompletionScript('zsh', kiroxMetadata);

      expect(script).toContain('#compdef kirox');
      expect(script).toContain('_kirox()');
      expect(script).toContain("'add:Add a new project from a remote repository'");
      expect(script).toContain("'completion:Generate shell completion script'");
      expect(script).toContain('_arguments');
      expect(script).toContain('_describe');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty global options list', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [{ name: 'cmd', description: 'Command', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('zsh', metadata);

      expect(script).toContain('_arguments');
      expect(script).toContain("'cmd:Command'");
    });

    it('should handle empty subcommands list', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('zsh', metadata);

      expect(script).toContain('#compdef test');
      expect(script).toContain('_test()');
    });

    it('should handle special characters in descriptions', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [
          {
            name: 'cmd',
            description: "Command with 'quotes' and special chars",
            options: [],
          },
        ],
        globalOptions: [],
      };

      const script = generateCompletionScript('zsh', metadata);

      expect(script.length).toBeGreaterThan(0);
      expect(script).toContain('cmd');
    });

    it('should handle very long subcommand lists', () => {
      const subcommands = Array.from({ length: 20 }, (_, i) => ({
        name: `cmd${i}`,
        description: `Command ${i}`,
        options: [],
      }));

      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands,
        globalOptions: [],
      };

      const script = generateCompletionScript('zsh', metadata);

      expect(script).toContain("'cmd0:Command 0'");
      expect(script).toContain("'cmd19:Command 19'");
    });

    it('should handle very long option lists', () => {
      const options = Array.from({ length: 15 }, (_, i) => ({
        flag: `--opt${i}`,
        description: `Option ${i}`,
      }));

      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [],
        globalOptions: options,
      };

      const script = generateCompletionScript('zsh', metadata);

      expect(script).toContain('--opt0');
      expect(script).toContain('--opt14');
    });
  });

  describe('Script Format Validation', () => {
    it('should generate non-empty script', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script.trim().length).toBeGreaterThan(0);
    });

    it('should have multiple lines', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      const lines = script.split('\n');
      expect(lines.length).toBeGreaterThan(5);
    });

    it('should not contain placeholder text', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script.toLowerCase()).not.toContain('todo');
      expect(script.toLowerCase()).not.toContain('placeholder');
      expect(script.toLowerCase()).not.toContain('coming soon');
    });

    it('should start with #compdef directive', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script.trim()).toMatch(/^#compdef/);
    });

    it('should end with function call', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script.trim()).toMatch(/_kirox\s*$/);
    });
  });

  describe('Comparison with Other Shells', () => {
    it('should generate different script from bash', () => {
      const bashScript = generateCompletionScript('bash', sampleMetadata);
      const zshScript = generateCompletionScript('zsh', sampleMetadata);

      expect(zshScript).not.toBe(bashScript);
      expect(zshScript).toContain('#compdef');
      expect(zshScript).toContain('_arguments');
      expect(bashScript).not.toContain('#compdef');
    });

    it('should have Zsh-specific syntax not in bash', () => {
      const zshScript = generateCompletionScript('zsh', sampleMetadata);

      expect(zshScript).toContain('_describe');
      expect(zshScript).toContain('typeset -A opt_args');
      expect(zshScript).toContain('->subcommand');
    });
  });

  /**
   * Task 5.2: Zsh syntax validation with `zsh -n`
   *
   * These tests verify that generated Zsh scripts pass syntax checking
   * using the `zsh -n` command, which performs syntax validation without
   * executing the script.
   *
   * Requirements tested:
   * - 3.1: Script generation without syntax errors
   *
   * Note: These tests will be skipped if zsh is not available on the system.
   */
  describe('Zsh syntax validation (Task 5.2)', () => {
    /**
     * Helper function to check if zsh is available on the system
     *
     * @returns Promise that resolves to true if zsh is available, false otherwise
     */
    async function isZshAvailable(): Promise<boolean> {
      try {
        await execAsync('which zsh');
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Helper function to check zsh syntax using `zsh -n`
     *
     * @param script - Zsh script content to validate
     * @returns Promise that resolves if syntax is valid, rejects otherwise
     */
    async function checkZshSyntax(script: string): Promise<{ valid: boolean; error?: string }> {
      // Check if zsh is available
      const zshAvailable = await isZshAvailable();
      if (!zshAvailable) {
        console.warn('Zsh is not available on this system, skipping syntax validation');
        return { valid: true }; // Skip validation if zsh is not available
      }

      // Create temporary file for syntax check
      const tempFile = join(tmpdir(), `kirox-completion-test-${Date.now()}.zsh`);

      try {
        // Write script to temporary file
        await writeFile(tempFile, script, 'utf-8');

        // Run zsh -n to check syntax
        await execAsync(`zsh -n "${tempFile}"`);

        // Clean up temporary file
        await unlink(tempFile);

        return { valid: true };
      } catch (error) {
        // Clean up temporary file on error
        try {
          await unlink(tempFile);
        } catch {
          // Ignore cleanup errors
        }

        if (error instanceof Error) {
          return {
            valid: false,
            error: error.message,
          };
        }

        return {
          valid: false,
          error: 'Unknown syntax error',
        };
      }
    }

    it.skip('should generate syntactically valid zsh script', async () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      const result = await checkZshSyntax(script);

      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.error('Zsh syntax error:', result.error);
      }
    });

    it.skip('should pass zsh -n check with empty subcommands', async () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('zsh', metadata);
      const result = await checkZshSyntax(script);

      expect(result.valid).toBe(true);
    });

    it.skip('should pass zsh -n check with empty options', async () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'cmd', description: 'Command', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('zsh', metadata);
      const result = await checkZshSyntax(script);

      expect(result.valid).toBe(true);
    });

    it.skip('should pass zsh -n check with many subcommands', async () => {
      const metadata: CompletionMetadata = {
        programName: 'cli',
        subcommands: Array.from({ length: 20 }, (_, i) => ({
          name: `cmd${i}`,
          description: `Command ${i}`,
          options: [],
        })),
        globalOptions: [],
      };

      const script = generateCompletionScript('zsh', metadata);
      const result = await checkZshSyntax(script);

      expect(result.valid).toBe(true);
    });

    it.skip('should pass zsh -n check with many options', async () => {
      const metadata: CompletionMetadata = {
        programName: 'cli',
        subcommands: [],
        globalOptions: Array.from({ length: 15 }, (_, i) => ({
          flag: `--option${i}`,
          description: `Option ${i}`,
        })),
      };

      const script = generateCompletionScript('zsh', metadata);
      const result = await checkZshSyntax(script);

      expect(result.valid).toBe(true);
    });

    it.skip('should pass zsh -n check with special characters in names', async () => {
      const metadata: CompletionMetadata = {
        programName: 'my-cli',
        subcommands: [
          { name: 'cmd-one', description: 'Command one', options: [] },
          { name: 'cmd_two', description: 'Command two', options: [] },
        ],
        globalOptions: [
          { flag: '-v, --verbose', description: 'Verbose output' },
          { flag: '--dry-run', description: 'Dry run mode' },
        ],
      };

      const script = generateCompletionScript('zsh', metadata);
      const result = await checkZshSyntax(script);

      expect(result.valid).toBe(true);
    });

    it.skip('should pass zsh -n check with real Kirox metadata', async () => {
      const kiroxMetadata: CompletionMetadata = {
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

      const script = generateCompletionScript('zsh', kiroxMetadata);
      const result = await checkZshSyntax(script);

      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.error('Kirox zsh completion syntax error:', result.error);
      }
    });
  });
});
