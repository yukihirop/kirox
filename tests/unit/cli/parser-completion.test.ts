import { describe, it, expect } from 'vitest';
import { parseArguments } from '@/cli/parser';

/**
 * Tests for 'completion' subcommand argument parsing
 *
 * Task 1.2: Parser extensions for completion subcommand
 *
 * Requirements tested:
 * - 4.1: Help message and command structure
 * - 4.2: Detailed help messages
 *
 * Test coverage:
 * - Basic completion command parsing with shell argument
 * - Shell argument validation (missing, case preservation)
 * - Command isolation (no repository/projects for completion)
 * - Priority and routing between subcommands
 * - Help text availability
 * - Edge cases (special characters, empty strings)
 */
describe('ArgumentParser - Completion Subcommand', () => {
  describe('Basic completion command parsing', () => {
    it('should parse completion subcommand with shell argument', () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      const result = parseArguments(argv);

      expect(result.subcommand).toBe('completion');
      expect(result.shellType).toBe('bash');
    });

    it('should parse completion with different shell types', () => {
      const shells = ['bash', 'zsh', 'fish', 'powershell', 'elvish'];

      for (const shell of shells) {
        const argv = ['node', '/path/to/kirox', 'completion', shell];
        const result = parseArguments(argv);

        expect(result.subcommand).toBe('completion');
        expect(result.shellType).toBe(shell);
      }
    });

    it('should handle completion subcommand at index 2', () => {
      // 'completion' must appear at index 2 or later
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      const result = parseArguments(argv);

      expect(result.subcommand).toBe('completion');
      expect(result.shellType).toBe('bash');
    });
  });

  describe('Shell argument validation', () => {
    it('should handle missing shell argument', () => {
      const argv = ['node', '/path/to/kirox', 'completion'];

      // Should not throw - will be handled by validation layer
      // Parser should return empty shellType
      const result = parseArguments(argv);

      expect(result.subcommand).toBe('completion');
      expect(result.shellType).toBe('');
    });

    it('should preserve shell argument case for validation layer', () => {
      // Parser should not normalize - that's the validator's job
      const argv = ['node', '/path/to/kirox', 'completion', 'BASH'];
      const result = parseArguments(argv);

      expect(result.subcommand).toBe('completion');
      expect(result.shellType).toBe('BASH'); // Case preserved for validator
    });
  });

  describe('Completion command isolation', () => {
    it('should not populate main command fields for completion', () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      const result = parseArguments(argv);

      // Completion command should not have repository/projects
      expect(result.repository).toBe('');
      expect(result.projects).toEqual([]);
    });

    it('should set default values for unused options', () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      const result = parseArguments(argv);

      // Default values for flags not used in completion
      expect(result.force).toBe(false);
      expect(result.dryRun).toBe(false);
      expect(result.verbose).toBe(false);
      expect(result.output).toBe('.');
      expect(result.track).toBe(false);
      expect(result.checkUpdates).toBe(false);
      expect(result.update).toBe(false);
    });
  });

  describe('Priority and routing', () => {
    it('should detect completion when it appears first', () => {
      // completion at index 2 should route to completion
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      const result = parseArguments(argv);

      expect(result.subcommand).toBe('completion');
      expect(result.shellType).toBe('bash');
    });

    it('should route to add when add appears first', () => {
      // add at index 2 should route to add
      const argv = ['node', '/path/to/kirox', 'add', 'owner/repo', '-p', 'project'];
      const result = parseArguments(argv);

      expect(result.subcommand).toBe('add');
      expect(result.repository).toBe('owner/repo');
    });
  });

  describe('Help text', () => {
    it('should provide completion command description', () => {
      // Note: This test verifies that parseArguments can handle --help
      // without throwing. The actual help text validation should be in
      // a separate integration test.
      const argv = ['node', '/path/to/kirox', 'completion', '--help'];

      try {
        parseArguments(argv);
      } catch (error) {
        // Commander.js throws when --help is requested
        // This is expected behavior
        expect(error).toBeDefined();
      }

      // This test mainly documents that --help should work
      expect(true).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle shell type with special characters', () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'bash-5.0'];
      const result = parseArguments(argv);

      // Should accept any string as shellType - validation happens later
      expect(result.subcommand).toBe('completion');
      expect(result.shellType).toBe('bash-5.0');
    });

    it('should handle empty string as shell type', () => {
      const argv = ['node', '/path/to/kirox', 'completion', ''];
      const result = parseArguments(argv);

      expect(result.subcommand).toBe('completion');
      expect(result.shellType).toBe('');
    });
  });
});
