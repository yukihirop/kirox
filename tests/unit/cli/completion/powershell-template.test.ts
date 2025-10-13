/**
 * PowerShell Template Tests
 *
 * Tests for PowerShell completion script generation
 * Task 7.1: PowerShellTemplate implementation
 */

import { describe, it, expect } from 'vitest';
import { generateCompletionScript, type CompletionMetadata } from '@/cli/completion/generator.js';

describe('PowerShell Template Generation', () => {
  describe('Basic Script Structure', () => {
    it('should generate a valid PowerShell completion script', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build project', options: [] }],
        globalOptions: [{ flag: '--help', description: 'Display help' }],
      };

      const script = generateCompletionScript('powershell', metadata);

      // PowerShell script header
      expect(script).toContain('# PowerShell completion script for testcli');

      // Register-ArgumentCompleter with correct command name
      expect(script).toContain('Register-ArgumentCompleter -CommandName testcli -ScriptBlock');

      // ScriptBlock parameters
      expect(script).toContain('param($commandName, $wordToComplete, $commandAst, $fakeBoundParameters)');

      // PowerShell arrays for subcommands and options
      expect(script).toContain('$subcommands = @(');
      expect(script).toContain('$options = @(');

      // Completion logic with Where-Object and ForEach-Object
      expect(script).toContain('Where-Object');
      expect(script).toContain('ForEach-Object');

      // CompletionResult class usage
      expect(script).toContain('[System.Management.Automation.CompletionResult]::new');
    });

    it('should use Register-ArgumentCompleter syntax', () => {
      const metadata: CompletionMetadata = {
        programName: 'kirox',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain('Register-ArgumentCompleter -CommandName kirox -ScriptBlock {');
      expect(script).toContain('}');
    });

    it('should define ScriptBlock parameters correctly', () => {
      const metadata: CompletionMetadata = {
        programName: 'testapp',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      // All four standard parameters
      expect(script).toContain('$commandName');
      expect(script).toContain('$wordToComplete');
      expect(script).toContain('$commandAst');
      expect(script).toContain('$fakeBoundParameters');
    });
  });

  describe('Program Name Injection', () => {
    it('should inject program name into header comment', () => {
      const metadata: CompletionMetadata = {
        programName: 'mycli',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain('# PowerShell completion script for mycli');
    });

    it('should inject program name into Register-ArgumentCompleter', () => {
      const metadata: CompletionMetadata = {
        programName: 'customapp',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain('Register-ArgumentCompleter -CommandName customapp');
    });

    it('should handle program names with hyphens', () => {
      const metadata: CompletionMetadata = {
        programName: 'my-cli-tool',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain('# PowerShell completion script for my-cli-tool');
      expect(script).toContain('Register-ArgumentCompleter -CommandName my-cli-tool');
    });
  });

  describe('Subcommand Completion', () => {
    it('should include single subcommand in PowerShell array', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'init', description: 'Initialize project', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain("$subcommands = @('init')");
    });

    it('should include multiple subcommands in PowerShell array', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [
          { name: 'build', description: 'Build project', options: [] },
          { name: 'test', description: 'Run tests', options: [] },
          { name: 'deploy', description: 'Deploy app', options: [] },
        ],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain("$subcommands = @('build', 'test', 'deploy')");
    });

    it('should use Where-Object for subcommand filtering', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build project', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain("if ($wordToComplete -notmatch '^-')");
      expect(script).toContain('$subcommands | Where-Object { $_ -like "$wordToComplete*" }');
    });

    it('should use CompletionResult with ParameterValue type for subcommands', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'start', description: 'Start service', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      // Check for ParameterValue in subcommand section
      const lines = script.split('\n');
      const subcommandSection = lines
        .slice(lines.findIndex((l) => l.includes("if ($wordToComplete -notmatch '^-')")))
        .join('\n');

      expect(subcommandSection).toContain(
        "[System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)"
      );
    });

    it('should handle empty subcommands array', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain('$subcommands = @()');
    });
  });

  describe('Option Completion', () => {
    it('should include single global option in PowerShell array', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '--verbose', description: 'Verbose output' }],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain("$options = @('--verbose')");
    });

    it('should include multiple global options in PowerShell array', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [
          { flag: '--help', description: 'Display help' },
          { flag: '--version', description: 'Show version' },
          { flag: '--verbose', description: 'Verbose output' },
        ],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain("$options = @('--help', '--version', '--verbose')");
    });

    it('should extract short and long flags from option definition', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '-h, --help', description: 'Display help' }],
      };

      const script = generateCompletionScript('powershell', metadata);

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

      const script = generateCompletionScript('powershell', metadata);

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

      const script = generateCompletionScript('powershell', metadata);

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

      const script = generateCompletionScript('powershell', metadata);

      // Should appear only once
      const forceCount = (script.match(/--force/g) || []).length;
      expect(forceCount).toBe(1);
    });

    it('should use Where-Object for option filtering', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain('else {');
      expect(script).toContain('$options | Where-Object { $_ -like "$wordToComplete*" }');
    });

    it('should use CompletionResult with ParameterName type for options', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [],
        globalOptions: [{ flag: '--verbose', description: 'Verbose' }],
      };

      const script = generateCompletionScript('powershell', metadata);

      // Check for ParameterName in option section
      const lines = script.split('\n');
      const optionSection = lines.slice(lines.findIndex((l) => l.includes('else {'))).join('\n');

      expect(optionSection).toContain(
        "[System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterName', $_)"
      );
    });

    it('should handle empty options array', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain('$options = @()');
    });
  });

  describe('Conditional Logic', () => {
    it('should separate subcommand and option completion with regex check', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'test', description: 'Run tests', options: [] }],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('powershell', metadata);

      // Check for if-else structure
      expect(script).toContain("if ($wordToComplete -notmatch '^-')");
      expect(script).toContain('else {');
    });

    it('should use -notmatch to detect non-option words', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'start', description: 'Start', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain("if ($wordToComplete -notmatch '^-')");
    });

    it('should use -like with wildcard for prefix matching', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build', description: 'Build', options: [] }],
        globalOptions: [{ flag: '--verbose', description: 'Verbose' }],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain('$_ -like "$wordToComplete*"');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal metadata (no subcommands or options)', () => {
      const metadata: CompletionMetadata = {
        programName: 'minimal',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain('# PowerShell completion script for minimal');
      expect(script).toContain('$subcommands = @()');
      expect(script).toContain('$options = @()');
    });

    it('should handle subcommands with special characters in names', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'build-prod', description: 'Build production', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain("'build-prod'");
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

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain("'cmd1'");
      expect(script).toContain("'cmd10'");
      expect(script).toContain("'cmd15'");
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

      const script = generateCompletionScript('powershell', metadata);

      expect(script).toContain("'--option1'");
      expect(script).toContain("'--option20'");
      expect(script).toContain("'--option25'");
    });

    it('should handle subcommands with single quotes in descriptions', () => {
      const metadata: CompletionMetadata = {
        programName: 'testcli',
        subcommands: [{ name: 'test', description: "Run project's tests", options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('powershell', metadata);

      // Subcommand name should still be quoted properly
      expect(script).toContain("'test'");
    });
  });

  describe('Real-world Kirox CLI', () => {
    it('should generate correct PowerShell script for Kirox CLI', () => {
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

      const script = generateCompletionScript('powershell', metadata);

      // Program name
      expect(script).toContain('# PowerShell completion script for kirox');
      expect(script).toContain('Register-ArgumentCompleter -CommandName kirox');

      // Subcommands
      expect(script).toContain("'add'");
      expect(script).toContain("'completion'");

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
      expect(script).toContain('$subcommands = @(');
      expect(script).toContain('$options = @(');
      expect(script).toContain('Where-Object');
      expect(script).toContain('ForEach-Object');
      expect(script).toContain('[System.Management.Automation.CompletionResult]::new');
    });
  });
});
