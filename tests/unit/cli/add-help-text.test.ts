/**
 * Add Command Help Text Tests (Task 10.1)
 *
 * Verify that `kirox add --help` displays appropriate help text
 * with description, options, and usage examples.
 *
 * Requirements: 9.1
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

describe('Add Command Help Text (Task 10.1)', () => {
  describe('Requirement 9.1: addサブコマンドのヘルプテキスト実装', () => {
    it('should have .description() for add command', () => {
      // Verify .description() is present
      expect(parserSource).toContain('.description(');
      expect(parserSource).toContain('Add new projects to existing metadata');
    });

    it('should have .addHelpText() with Examples section', () => {
      // Verify .addHelpText('after', ...) exists
      const hasAddHelpText = /\.addHelpText\(['\"]after['\"],/.test(parserSource);
      expect(hasAddHelpText).toBe(true);

      // Verify Examples section exists
      expect(parserSource).toContain('Examples:');
    });

    it('should include usage examples in help text', () => {
      // Verify multiple example commands exist
      const exampleMatches = parserSource.match(/npx kirox add/g);
      expect(exampleMatches).not.toBeNull();
      expect(exampleMatches!.length).toBeGreaterThanOrEqual(5); // At least 5 examples
    });

    it('should include Note section about metadata requirement', () => {
      // Verify Note section exists
      expect(parserSource).toContain('Note:');
      expect(parserSource).toContain('existing metadata');
      expect(parserSource).toContain('.kirox-meta.json');
    });
  });

  describe('Example commands in help text', () => {
    it('should include example: Add new project', () => {
      // Check for basic add example
      expect(parserSource).toContain('Add new project');
    });

    it('should include example: Add multiple projects', () => {
      // Check for multiple projects example
      expect(parserSource).toContain('Add multiple projects');
      expect(parserSource).toContain('proj1,proj2,proj3');
    });

    it('should include example: Add project from specific branch', () => {
      // Check for branch specification example
      expect(parserSource).toContain('specific branch');
      expect(parserSource).toContain('#feature');
    });

    it('should include example: Add project with subdirectory', () => {
      // Check for subdirectory example
      expect(parserSource).toContain('subdirectory');
      expect(parserSource).toContain('--subdir');
    });

    it('should include example: Force overwrite', () => {
      // Check for force overwrite example
      expect(parserSource).toContain('Force overwrite');
      expect(parserSource).toContain('--force');
    });

    it('should include example: Interactive mode', () => {
      // Check for interactive mode example
      expect(parserSource).toContain('Interactive mode');
    });
  });

  describe('Options documentation', () => {
    it('should document -p, --project option', () => {
      expect(parserSource).toContain('-p, --project');
      expect(parserSource).toContain('Project names');
    });

    it('should document -o, --output option', () => {
      expect(parserSource).toContain('-o, --output');
      expect(parserSource).toContain('Output directory');
    });

    it('should document -s, --subdir option', () => {
      expect(parserSource).toContain('-s, --subdir');
      expect(parserSource).toContain('Subdirectory path');
    });

    it('should document --force option', () => {
      expect(parserSource).toContain('--force');
      expect(parserSource).toContain('Overwrite existing projects');
    });

    it('should document --dry-run option', () => {
      expect(parserSource).toContain('--dry-run');
      expect(parserSource).toContain('Dry-run mode');
    });

    it('should document --verbose option', () => {
      expect(parserSource).toContain('--verbose');
      expect(parserSource).toContain('Verbose logging');
    });

    it('should document --config option', () => {
      expect(parserSource).toContain('--config');
      expect(parserSource).toContain('Custom config file path');
    });
  });

  describe('Help text structure', () => {
    it('should have proper command name', () => {
      expect(parserSource).toContain('.name(\'kirox add\')');
    });

    it('should specify repository argument format', () => {
      expect(parserSource).toContain('owner/repo');
      expect(parserSource).toContain('owner/repo#branch');
    });

    it('should include metadata requirement warning', () => {
      // Verify warning about requiring existing metadata
      expect(parserSource).toContain('requires existing metadata');
      expect(parserSource).toContain('Run regular fetch command first');
    });
  });

  describe('Chalk styling (Task 10.5 enhancement)', () => {
    it('should use chalk for styling', () => {
      // Verify chalk is imported
      expect(parserSource).toMatch(/import.*chalk.*from ['\"]chalk['\"]/);
    });

    it('should include styled sections', () => {
      // Verify that chalk is used in help text (detailed styling tests in add-help-styling.test.ts)
      expect(parserSource).toContain('chalk.bold.blue');
      expect(parserSource).toContain('chalk.bold.yellow');
      expect(parserSource).toContain('chalk.green');
      expect(parserSource).toContain('chalk.dim');
      expect(parserSource).toContain('chalk.cyan');
    });
  });
});
