import { describe, it, expect } from 'vitest';
import { generateCompletionScript, type CompletionMetadata } from '@/cli/completion/generator.js';
import type { SupportedShell } from '@/cli/completion/shell-validator.js';

/**
 * Tests for Generator
 *
 * Task 3.1: Generator implementation
 *
 * Requirements tested:
 * - 1.1: Basic script generation functionality
 * - 3.2: Subcommand completion candidates
 * - 3.3: Option completion candidates
 *
 * Test coverage:
 * - CompletionMetadata structure and validation
 * - Script generation for each supported shell
 * - Template selection logic
 * - Metadata injection into templates
 * - Error handling for edge cases
 */
describe('Generator', () => {
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
      { flag: '--dry-run', description: 'Preview without executing' },
      { flag: '--verbose', description: 'Verbose output' },
      { flag: '-h, --help', description: 'Display help' },
    ],
  };

  describe('CompletionMetadata structure', () => {
    it('should accept valid metadata with all required fields', () => {
      const metadata: CompletionMetadata = {
        programName: 'kirox',
        subcommands: [],
        globalOptions: [],
      };

      expect(metadata.programName).toBe('kirox');
      expect(metadata.subcommands).toEqual([]);
      expect(metadata.globalOptions).toEqual([]);
    });

    it('should accept metadata with subcommands and options', () => {
      const metadata: CompletionMetadata = sampleMetadata;

      expect(metadata.subcommands).toHaveLength(2);
      expect(metadata.subcommands[0]?.name).toBe('add');
      expect(metadata.subcommands[0]?.options).toHaveLength(2);
      expect(metadata.globalOptions).toHaveLength(4);
    });
  });

  describe('Script generation for bash', () => {
    it('should generate bash completion script', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Script should be non-empty
      expect(script.length).toBeGreaterThan(0);

      // Should contain bash-specific syntax
      expect(script).toMatch(/#!/);
      expect(script).toMatch(/complete/i);
    });

    it('should include program name in bash script', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      expect(script).toContain('kirox');
    });

    it('should include subcommands in bash script', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      expect(script).toContain('add');
      expect(script).toContain('completion');
    });

    it('should include global options in bash script', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      expect(script).toContain('--force');
      expect(script).toContain('--dry-run');
      expect(script).toContain('--verbose');
    });
  });

  describe('Script generation for zsh', () => {
    it('should generate zsh completion script', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script.length).toBeGreaterThan(0);

      // Should contain zsh-specific syntax
      expect(script).toMatch(/#compdef|_arguments/);
    });

    it('should include program name in zsh script', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('kirox');
    });

    it('should include subcommands in zsh script', () => {
      const script = generateCompletionScript('zsh', sampleMetadata);

      expect(script).toContain('add');
      expect(script).toContain('completion');
    });
  });

  describe('Script generation for fish', () => {
    it('should generate fish completion script', () => {
      const script = generateCompletionScript('fish', sampleMetadata);

      expect(script.length).toBeGreaterThan(0);

      // Should contain fish-specific syntax
      expect(script).toMatch(/complete -c/);
    });

    it('should include program name in fish script', () => {
      const script = generateCompletionScript('fish', sampleMetadata);

      expect(script).toContain('kirox');
    });

    it('should include subcommands in fish script', () => {
      const script = generateCompletionScript('fish', sampleMetadata);

      expect(script).toContain('add');
      expect(script).toContain('completion');
    });
  });

  describe('Script generation for powershell', () => {
    it('should generate powershell completion script', () => {
      const script = generateCompletionScript('powershell', sampleMetadata);

      expect(script.length).toBeGreaterThan(0);

      // Should contain PowerShell-specific syntax
      expect(script).toMatch(/Register-ArgumentCompleter|param/i);
    });

    it('should include program name in powershell script', () => {
      const script = generateCompletionScript('powershell', sampleMetadata);

      expect(script).toContain('kirox');
    });

    it('should include subcommands in powershell script', () => {
      const script = generateCompletionScript('powershell', sampleMetadata);

      expect(script).toContain('add');
      expect(script).toContain('completion');
    });
  });

  describe('Script generation for elvish', () => {
    it('should generate elvish completion script', () => {
      const script = generateCompletionScript('elvish', sampleMetadata);

      expect(script.length).toBeGreaterThan(0);

      // Should contain Elvish-specific syntax
      expect(script).toMatch(/edit:completion:arg-completer|fn/);
    });

    it('should include program name in elvish script', () => {
      const script = generateCompletionScript('elvish', sampleMetadata);

      expect(script).toContain('kirox');
    });

    it('should include subcommands in elvish script', () => {
      const script = generateCompletionScript('elvish', sampleMetadata);

      expect(script).toContain('add');
      expect(script).toContain('completion');
    });
  });

  describe('Template selection', () => {
    it('should generate different scripts for different shells', () => {
      const bashScript = generateCompletionScript('bash', sampleMetadata);
      const zshScript = generateCompletionScript('zsh', sampleMetadata);
      const fishScript = generateCompletionScript('fish', sampleMetadata);

      // Scripts should be different
      expect(bashScript).not.toBe(zshScript);
      expect(bashScript).not.toBe(fishScript);
      expect(zshScript).not.toBe(fishScript);
    });

    it('should select appropriate template based on shell type', () => {
      const shells: SupportedShell[] = ['bash', 'zsh', 'fish', 'powershell', 'elvish'];

      for (const shell of shells) {
        const script = generateCompletionScript(shell, sampleMetadata);

        // Each shell should get a non-empty script
        expect(script.length).toBeGreaterThan(0);
        expect(script).toContain('kirox');
      }
    });
  });

  describe('Metadata injection', () => {
    it('should inject all subcommands into script', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [
          { name: 'cmd1', description: 'Command 1', options: [] },
          { name: 'cmd2', description: 'Command 2', options: [] },
          { name: 'cmd3', description: 'Command 3', options: [] },
        ],
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      expect(script).toContain('cmd1');
      expect(script).toContain('cmd2');
      expect(script).toContain('cmd3');
    });

    it('should inject all global options into script', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [],
        globalOptions: [
          { flag: '--opt1', description: 'Option 1' },
          { flag: '--opt2', description: 'Option 2' },
          { flag: '-o, --opt3', description: 'Option 3' },
        ],
      };

      const script = generateCompletionScript('bash', metadata);

      expect(script).toContain('--opt1');
      expect(script).toContain('--opt2');
      expect(script).toContain('--opt3');
    });

    it('should inject subcommand-specific options', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [
          {
            name: 'add',
            description: 'Add command',
            options: [
              { flag: '--sub-opt1', description: 'Subcommand option 1' },
              { flag: '--sub-opt2', description: 'Subcommand option 2' },
            ],
          },
        ],
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      expect(script).toContain('--sub-opt1');
      expect(script).toContain('--sub-opt2');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty subcommands list', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [],
        globalOptions: [{ flag: '--help', description: 'Help' }],
      };

      const script = generateCompletionScript('bash', metadata);

      expect(script.length).toBeGreaterThan(0);
      expect(script).toContain('test');
    });

    it('should handle empty global options list', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [{ name: 'cmd', description: 'Command', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      expect(script.length).toBeGreaterThan(0);
      expect(script).toContain('cmd');
    });

    it('should handle subcommand with no options', () => {
      const metadata: CompletionMetadata = {
        programName: 'test',
        subcommands: [{ name: 'simple', description: 'Simple command', options: [] }],
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      expect(script).toContain('simple');
    });

    it('should handle special characters in program name', () => {
      const metadata: CompletionMetadata = {
        programName: 'test-cli',
        subcommands: [],
        globalOptions: [],
      };

      const script = generateCompletionScript('bash', metadata);

      expect(script).toContain('test-cli');
    });
  });

  describe('Script format validation', () => {
    it('should generate non-empty scripts', () => {
      const shells: SupportedShell[] = ['bash', 'zsh', 'fish', 'powershell', 'elvish'];

      for (const shell of shells) {
        const script = generateCompletionScript(shell, sampleMetadata);
        expect(script.trim().length).toBeGreaterThan(0);
      }
    });

    it('should not include placeholder text in production scripts', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should not contain "TODO" or "placeholder" (case-insensitive)
      expect(script.toLowerCase()).not.toContain('todo');
      expect(script.toLowerCase()).not.toContain('placeholder');
      expect(script.toLowerCase()).not.toContain('coming soon');
    });

    it('should generate scripts with proper line endings', () => {
      const script = generateCompletionScript('bash', sampleMetadata);

      // Should have multiple lines
      const lines = script.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    });
  });
});
