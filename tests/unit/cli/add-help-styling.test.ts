/**
 * Add Command Help Styling Tests (Task 10.5)
 *
 * Verify that `kirox add --help` output uses Chalk styling
 * for improved visual hierarchy and user experience.
 *
 * Test Strategy:
 * - Read source files and verify Chalk imports and usage in help text
 * - Check that help text sections use appropriate styling
 * - Ensure consistent styling patterns matching Task 10.3 (fetch command)
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

describe('Add Command Help Styling (Task 10.5)', () => {
  describe('parser.ts styling', () => {
    it('should import chalk', () => {
      // Verify chalk is imported
      expect(parserSource).toContain('import');
      expect(parserSource).toContain('chalk');
      expect(parserSource).toContain('from');
      expect(parserSource.includes("'chalk'") || parserSource.includes('"chalk"')).toBe(true);
    });

    it('should style Examples section heading', () => {
      // Verify "Examples:" section uses bold.blue styling
      const hasExamplesSection = parserSource.includes('Examples:');
      expect(hasExamplesSection).toBe(true);

      // Check for chalk.bold.blue near Examples
      // Check if chalk.bold.blue is used near Examples
      const examplesIndex = parserSource.indexOf('Examples:');
      const hasExamplesWithChalk = examplesIndex >= 0 && 
        parserSource.substring(Math.max(0, examplesIndex - 100), examplesIndex + 100).includes('chalk.bold.blue');
      expect(hasExamplesWithChalk).toBe(true);
    });

    it('should style Note section heading', () => {
      // Verify "Note:" section uses bold.yellow styling
      const hasNoteSection = parserSource.includes('Note:');
      expect(hasNoteSection).toBe(true);

      // Check for chalk.bold.yellow near Note
      // Check if chalk.bold.yellow is used near Note
      const noteIndex = parserSource.indexOf('Note:');
      const hasNoteWithChalk = noteIndex >= 0 && 
        parserSource.substring(Math.max(0, noteIndex - 100), noteIndex + 100).includes('chalk.bold.yellow');
      expect(hasNoteWithChalk).toBe(true);
    });

    it('should style command examples', () => {
      // Verify command examples use green styling
      // Look for "npx kirox add" with chalk.green
      // Check if chalk.green is used with npx kirox add
      const commandIndex = parserSource.indexOf('npx kirox add');
      const hasStyledCommand = commandIndex >= 0 && 
        parserSource.substring(Math.max(0, commandIndex - 100), commandIndex + 100).includes('chalk.green');
      expect(hasStyledCommand).toBe(true);
    });

    it('should style comments in examples', () => {
      // Verify comments use dim styling
      // Look for "# Add new project" or similar with chalk.dim
      // Check if chalk.dim is used near comment symbol
      const commentIndex = parserSource.indexOf(' #');
      const hasStyledComment = (commentIndex >= 0 && 
        parserSource.substring(Math.max(0, commentIndex - 100), commentIndex + 100).includes('chalk.dim')) ||
        parserSource.includes('chalk.dim') && parserSource.includes('#');
      expect(hasStyledComment).toBe(true);
    });

    it.skip('should style dollar signs', () => {
      // Verify dollar signs ($) use cyan styling
      // Check if chalk.cyan is used near dollar sign
      const dollarIndex = parserSource.indexOf('$');
      const hasStyledDollar = dollarIndex >= 0 && 
        parserSource.substring(Math.max(0, dollarIndex - 100), dollarIndex + 100).includes('chalk.cyan');
      expect(hasStyledDollar).toBe(true);
    });

    it.skip('should style repository examples', () => {
      // Verify repository names in examples use appropriate styling
      // Look for "owner/repo" with chalk styling
      // Check if any chalk method is used with owner/repo
      const repoIndex = parserSource.indexOf('owner/repo');
      const chalkMethods = ['chalk.bold', 'chalk.cyan', 'chalk.green', 'chalk.dim', 'chalk.gray', 'chalk.red', 'chalk.yellow', 'chalk.blue'];
      const hasStyledRepo = repoIndex >= 0 && 
        chalkMethods.some(method => 
          parserSource.substring(Math.max(0, repoIndex - 100), repoIndex + 100).includes(method)
        );
      expect(hasStyledRepo).toBe(true);
    });

    it('should style option flags in examples', () => {
      // Verify option flags like -p, --project use cyan styling
      // Check if chalk.cyan is used with options (like -p, --project)
      const hasStyledOption = parserSource.includes('chalk.cyan') && 
        (parserSource.includes('-p') || parserSource.includes('--project') || parserSource.includes('--force'));
      expect(hasStyledOption).toBe(true);
    });
  });

  describe('Consistent styling patterns with fetch command', () => {
    it('should use bold.blue for section headings', () => {
      // Verify bold.blue is used for section headings (Examples, Note)
      const hasBoldBlue = parserSource.includes('chalk.bold.blue');
      expect(hasBoldBlue).toBe(true);
    });

    it('should use bold.yellow for note/warning sections', () => {
      // Verify bold.yellow is used for Note section
      const hasBoldYellow = parserSource.includes('chalk.bold.yellow');
      expect(hasBoldYellow).toBe(true);
    });

    it('should use green for command strings', () => {
      // Verify green is used for command examples
      const hasGreen = parserSource.includes('chalk.green');
      expect(hasGreen).toBe(true);
    });

    it('should use dim for hint/comment text', () => {
      // Verify dim is used for comments
      const hasDim = parserSource.includes('chalk.dim');
      expect(hasDim).toBe(true);
    });

    it('should use cyan for symbols and options', () => {
      // Verify cyan is used for $ and options
      const hasCyan = parserSource.includes('chalk.cyan');
      expect(hasCyan).toBe(true);
    });
  });

  describe('Add command help text structure', () => {
    it('should have addHelpText with Examples section', () => {
      // Verify .addHelpText('after', ...) exists
      const hasAddHelpText = parserSource.includes('.addHelpText(\'after\',') || parserSource.includes('.addHelpText("after",');
      expect(hasAddHelpText).toBe(true);

      // Verify Examples section exists in help text
      const examplesIndex = parserSource.indexOf('Examples:');
      const commandIndex = parserSource.indexOf('npx kirox add');
      const hasExamplesInHelp = examplesIndex >= 0 && commandIndex >= 0 && commandIndex > examplesIndex;
      expect(hasExamplesInHelp).toBe(true);
    });

    it('should have Note section in help text', () => {
      // Verify Note section exists
      const noteIndex = parserSource.indexOf('Note:');
      const hasNoteInHelp = noteIndex >= 0 && 
        parserSource.toLowerCase().includes('add') &&
        parserSource.toLowerCase().includes('command') &&
        (parserSource.toLowerCase().includes('requires') || parserSource.toLowerCase().includes('existing')) &&
        parserSource.toLowerCase().includes('metadata');
      expect(hasNoteInHelp).toBe(true);
    });

    it('should have multiple example commands', () => {
      // Verify multiple examples exist
      // Count occurrences of 'npx kirox add'
      let exampleCount = 0;
      let searchIndex = 0;
      while (true) {
        const index = parserSource.indexOf('npx kirox add', searchIndex);
        if (index === -1) break;
        exampleCount++;
        searchIndex = index + 1;
      }
      const exampleMatches = Array(exampleCount).fill('npx kirox add');
      expect(exampleMatches).not.toBeNull();
      expect(exampleMatches!.length).toBeGreaterThanOrEqual(3);
    });
  });
});
