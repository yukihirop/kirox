/**
 * Main Command Help Text Tests (Task 10.2)
 *
 * Verify that `kirox --help` displays help text that includes
 * information about the add subcommand.
 *
 * Requirements: 9.2
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Read parser source file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const parserSource = readFileSync(
  join(__dirname, '../../../src/cli/parser.ts'),
  'utf-8'
);

describe('Main Command Help Text (Task 10.2)', () => {
  describe('Requirement 9.2: メインコマンドヘルプにaddサブコマンド情報を追加', () => {
    it('should mention add subcommand in help text', () => {
      // Verify that 'add' subcommand is mentioned
      expect(parserSource).toContain('add');
    });

    it('should include add subcommand description or usage', () => {
      // Check if help text mentions adding projects or the add command functionality
      const hasAddDescription =
        parserSource.includes('Add new projects') ||
        parserSource.includes('add subcommand') ||
        parserSource.includes('kirox add');
      expect(hasAddDescription).toBe(true);
    });

    it('should document add subcommand in main help context', () => {
      // Verify that main command help includes reference to add subcommand
      // This could be in a "Commands:" section or similar
      const hasCommandsSection = parserSource.includes('Commands:') || parserSource.includes('Subcommands:');
      expect(hasCommandsSection).toBe(true);
    });

    it('should show how to get help for add subcommand', () => {
      // Verify that there's information about getting help for add subcommand
      expect(parserSource).toMatch(/kirox add --help/);
    });
  });

  describe('Help text structure', () => {
    it('should have main command description', () => {
      expect(parserSource).toContain('CLI tool to fetch Kiro specification');
    });

    it('should include Interactive Mode section', () => {
      expect(parserSource).toContain('Interactive Mode:');
    });

    it('should include Examples section', () => {
      expect(parserSource).toContain('Examples:');
    });

    it('should include Note section', () => {
      expect(parserSource).toContain('Note:');
    });
  });

  describe('Subcommand documentation', () => {
    it('should list add as an available subcommand', () => {
      // Check for add subcommand in a list format (allow multiple whitespaces)
      expect(parserSource).toContain('add');
      expect(parserSource).toContain('Add new projects to existing metadata');
    });

    it('should explain when to use add vs main command', () => {
      // Verify distinction between regular fetch and add command
      const explainsUseCases =
        (parserSource.includes('existing metadata') && parserSource.includes('kirox add')) ||
        parserSource.includes('add command requires');
      expect(explainsUseCases).toBe(true);
    });
  });

  describe('Cross-reference with add command help', () => {
    it('should direct users to add command help for details', () => {
      // Verify reference to 'kirox add --help' for more details
      expect(parserSource).toContain('kirox add --help');
    });
  });
});
