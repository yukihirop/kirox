import { describe, it, expect } from 'vitest';
import { generateCompletionScript, type CompletionMetadata } from '@/cli/completion/generator';

/**
 * Tests for Bash Template
 *
 * Task 4.1: BashTemplate implementation
 *
 * Requirements tested:
 * - 1.2: Bash shell script generation
 * - 3.1: Script syntax correctness
 * - 3.2: Subcommand completion
 * - 3.3: Option completion
 *
 * Test coverage:
 * - Bash completion syntax (_init_completion, compgen, COMPREPLY)
 * - Shebang line (#!/usr/bin/env bash)
 * - complete -F function registration
 * - Subcommand completion logic
 * - Option completion logic
 * - Metadata injection (program name, subcommands, options)
 */
describe('Bash Template (Task 4.1)', () => {
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
        options: [],
      },
    ],
    globalOptions: [
      { flag: '--force', description: 'Force operation' },
      { flag: '--dry-run', description: 'Dry run mode' },
      { flag: '--verbose', description: 'Verbose output' },
      { flag: '-h, --help', description: 'Display help' },
    ],
  };

  describe('Bash syntax requirements', () => {
    it('should start with proper shebang line', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Must start with shebang
      expect(script).toMatch(/^#!\/usr\/bin\/env bash/);
    });

    it('should define completion function with proper naming', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should define _<programName>_completion function
      expect(script).toContain('_kirox_completion()');
    });

    it('should use _init_completion for bash-completion compatibility', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should call _init_completion or equivalent
      expect(script).toContain('_init_completion');
    });

    it('should use compgen for generating completions', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should use compgen command
      expect(script).toContain('compgen');
    });

    it('should set COMPREPLY array for completion results', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should set COMPREPLY array
      expect(script).toContain('COMPREPLY');
    });

    it('should register completion with complete -F', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should register completion function
      expect(script).toMatch(/complete -F _kirox_completion kirox/);
    });

    it('should use bash local variables (cur, prev, words, cword)', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should declare local variables
      expect(script).toContain('local cur');
    });
  });

  describe('Program name injection', () => {
    it('should inject program name into function name', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      expect(script).toContain('_testcli_completion()');
      expect(script).toMatch(/complete -F _testcli_completion testcli/);
    });

    it('should inject program name with hyphen correctly', () => {
      const metadata: CompletionMetadata = {
        programName: 'my-cli',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      // Function name should use underscores or handle hyphens correctly
      expect(script).toContain('my-cli');
    });
  });

  describe('Subcommand completion', () => {
    it('should include all subcommand names in completion', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should contain both subcommands
      expect(script).toContain('add');
      expect(script).toContain('completion');
    });

    it('should complete subcommands at first argument position', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should check for first argument position (cword -eq 1)
      expect(script).toMatch(/cword.*eq.*1/);
    });

    it('should handle empty subcommands list', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('bash', metadata);

      // Should still generate valid script
      expect(script.length).toBeGreaterThan(0);
      expect(script).toContain('_testcli_completion');
    });

    it('should handle subcommands with special characters', () => {
      const metadata: CompletionMetadata = {
        programName: 'cli',
        subcommands: [
          { name: 'cmd-one', description: 'Command one', options: [] },
          { name: 'cmd_two', description: 'Command two', options: [] },
        ],
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      expect(script).toContain('cmd-one');
      expect(script).toContain('cmd_two');
    });
  });

  describe('Option completion', () => {
    it('should include all global options', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should contain all global options
      expect(script).toContain('--force');
      expect(script).toContain('--dry-run');
      expect(script).toContain('--verbose');
      expect(script).toContain('--help');
      expect(script).toContain('-h');
    });

    it('should include subcommand-specific options', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should contain add subcommand options
      expect(script).toContain('--project');
      expect(script).toContain('-p');
      expect(script).toContain('--track');
    });

    it('should complete options when current word starts with dash', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should check if cur starts with dash
      expect(script).toMatch(/cur.*==.*-\*/);
    });

    it('should extract flags from combined flag strings', () => {
      const metadata: CompletionMetadata = {
        programName: 'cli',
        subcommands: [],
        globalOptions: [
          { flag: '-v, --verbose', description: 'Verbose' },
          { flag: '-h, --help', description: 'Help' },
        ],
      };

      const script = generateCompletionScript('bash', metadata);

      // Should extract both short and long flags
      expect(script).toContain('-v');
      expect(script).toContain('--verbose');
      expect(script).toContain('-h');
      expect(script).toContain('--help');
    });

    it('should remove parameter placeholders from flags', () => {
      const metadata: CompletionMetadata = {
        programName: 'cli',
        subcommands: [],
        globalOptions: [
          { flag: '-o, --output <file>', description: 'Output file' },
          { flag: '--config [path]', description: 'Config path' },
        ],
      };

      const script = generateCompletionScript('bash', metadata);

      // Should extract flags without placeholders
      expect(script).toContain('-o');
      expect(script).toContain('--output');
      expect(script).toContain('--config');

      // Should NOT contain placeholders
      expect(script).not.toContain('<file>');
      expect(script).not.toContain('[path]');
    });

    it('should handle empty options list', () => {
      const metadata: CompletionMetadata = {
        programName: 'cli',
        subcommands: [{ name: 'cmd', description: 'Command', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      // Should still generate valid script
      expect(script.length).toBeGreaterThan(0);
      expect(script).toContain('_cli_completion');
    });
  });

  describe('Script structure', () => {
    it('should have proper function structure', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should have function opening and closing
      expect(script).toMatch(/_kirox_completion\(\) \{/);
      expect(script).toMatch(/^}/m);
    });

    it('should include comment header', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should include descriptive comment
      expect(script).toMatch(/# Bash completion script for kirox/);
    });

    it('should have complete command registration at the end', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // complete command should be after function definition
      const lines = script.split('\n');
      const functionDefLine = lines.findIndex((line) => line.includes('_kirox_completion()'));
      const completeCommandLine = lines.findIndex((line) => line.includes('complete -F'));

      expect(completeCommandLine).toBeGreaterThan(functionDefLine);
    });

    it('should not have trailing whitespace in lines', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      const lines = script.split('\n');

      // Check each non-empty line doesn't end with whitespace
      lines
        .filter((line) => line.length > 0)
        .forEach((line) => {
          expect(line).not.toMatch(/\s$/);
        });
    });

    it('should use Unix line endings', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should not contain Windows line endings
      expect(script).not.toContain('\r\n');
    });
  });

  describe('Edge cases', () => {
    it('should handle program name with numbers', () => {
      const metadata: CompletionMetadata = {
        programName: 'cli2tool',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      expect(script).toContain('_cli2tool_completion');
      expect(script).toMatch(/complete -F _cli2tool_completion cli2tool/);
    });

    it('should handle many subcommands', () => {
      const metadata: CompletionMetadata = {
        programName: 'cli',
        subcommands: Array.from({ length: 20 }, (_, i) => ({
          name: `cmd${i}`,
          description: `Command ${i}`,
          options: [],
        })),
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      // Should include all 20 subcommands
      for (let i = 0; i < 20; i++) {
        expect(script).toContain(`cmd${i}`);
      }
    });

    it('should handle many options', () => {
      const metadata: CompletionMetadata = {
        programName: 'cli',
        subcommands: [],
        globalOptions: Array.from({ length: 15 }, (_, i) => ({
          flag: `--option${i}`,
          description: `Option ${i}`,
        })),
      };

      const script = generateCompletionScript('bash', metadata);

      // Should include all 15 options
      for (let i = 0; i < 15; i++) {
        expect(script).toContain(`--option${i}`);
      }
    });
  });

  describe('Real-world Kirox CLI metadata', () => {
    it('should generate valid completion for Kirox CLI', () => {
      // This is the actual metadata used by Kirox
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

      const script = generateCompletionScript('bash', kiroxMetadata);

      // Verify essential elements
      expect(script).toContain('#!/usr/bin/env bash');
      expect(script).toContain('_kirox_completion');
      expect(script).toContain('complete -F _kirox_completion kirox');
      expect(script).toContain('add');
      expect(script).toContain('completion');
      expect(script).toContain('--project');
      expect(script).toContain('--track');
      expect(script).toContain('--help');
      expect(script).toContain('--version');
    });
  });
});
