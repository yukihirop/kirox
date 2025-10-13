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
      expect(parserSource).toMatch(/import.*chalk.*from ['"]chalk['"]/);
    });

    it('should style Examples section heading', () => {
      // Verify "Examples:" section uses bold.blue styling
      const hasExamplesSection = /Examples:/.test(parserSource);
      expect(hasExamplesSection).toBe(true);

      // Check for chalk.bold.blue near Examples
      const hasExamplesWithChalk = /chalk\.bold\.blue\([^)]*Examples[^)]*\)/.test(parserSource);
      expect(hasExamplesWithChalk).toBe(true);
    });

    it('should style Note section heading', () => {
      // Verify "Note:" section uses bold.yellow styling
      const hasNoteSection = /Note:/.test(parserSource);
      expect(hasNoteSection).toBe(true);

      // Check for chalk.bold.yellow near Note
      const hasNoteWithChalk = /chalk\.bold\.yellow\([^)]*Note[^)]*\)/.test(parserSource);
      expect(hasNoteWithChalk).toBe(true);
    });

    it('should style command examples', () => {
      // Verify command examples use green styling
      // Look for "npx kirox add" with chalk.green
      const hasStyledCommand = /chalk\.green\([^)]*npx kirox add[^)]*\)/.test(parserSource);
      expect(hasStyledCommand).toBe(true);
    });

    it('should style comments in examples', () => {
      // Verify comments use dim styling
      // Look for "# Add new project" or similar with chalk.dim
      const hasStyledComment = /chalk\.dim\([^)]*#[^)]*\)/.test(parserSource);
      expect(hasStyledComment).toBe(true);
    });

    it('should style dollar signs', () => {
      // Verify dollar signs ($) use cyan styling
      const hasStyledDollar = /chalk\.cyan\([^)]*\$[^)]*\)/.test(parserSource);
      expect(hasStyledDollar).toBe(true);
    });

    it('should style repository examples', () => {
      // Verify repository names in examples use appropriate styling
      // Look for "owner/repo" with chalk styling
      const hasStyledRepo = /chalk\.\w+\([^)]*owner\/repo[^)]*\)/.test(parserSource);
      expect(hasStyledRepo).toBe(true);
    });

    it('should style option flags in examples', () => {
      // Verify option flags like -p, --project use cyan styling
      const hasStyledOption = /chalk\.cyan\([^)]*-[a-z][^)]*\)/.test(parserSource);
      expect(hasStyledOption).toBe(true);
    });
  });

  describe('Consistent styling patterns with fetch command', () => {
    it('should use bold.blue for section headings', () => {
      // Verify bold.blue is used for section headings (Examples, Note)
      const hasBoldBlue = /chalk\.bold\.blue/.test(parserSource);
      expect(hasBoldBlue).toBe(true);
    });

    it('should use bold.yellow for note/warning sections', () => {
      // Verify bold.yellow is used for Note section
      const hasBoldYellow = /chalk\.bold\.yellow/.test(parserSource);
      expect(hasBoldYellow).toBe(true);
    });

    it('should use green for command strings', () => {
      // Verify green is used for command examples
      const hasGreen = /chalk\.green/.test(parserSource);
      expect(hasGreen).toBe(true);
    });

    it('should use dim for hint/comment text', () => {
      // Verify dim is used for comments
      const hasDim = /chalk\.dim/.test(parserSource);
      expect(hasDim).toBe(true);
    });

    it('should use cyan for symbols and options', () => {
      // Verify cyan is used for $ and options
      const hasCyan = /chalk\.cyan/.test(parserSource);
      expect(hasCyan).toBe(true);
    });
  });

  describe('Add command help text structure', () => {
    it('should have addHelpText with Examples section', () => {
      // Verify .addHelpText('after', ...) exists
      const hasAddHelpText = /\.addHelpText\(['"]after['"],/.test(parserSource);
      expect(hasAddHelpText).toBe(true);

      // Verify Examples section exists in help text
      const hasExamplesInHelp = /Examples:.*npx kirox add/s.test(parserSource);
      expect(hasExamplesInHelp).toBe(true);
    });

    it('should have Note section in help text', () => {
      // Verify Note section exists
      const hasNoteInHelp = /Note:.*add.*command.*requires.*existing.*metadata/s.test(parserSource);
      expect(hasNoteInHelp).toBe(true);
    });

    it('should have multiple example commands', () => {
      // Verify multiple examples exist
      const exampleMatches = parserSource.match(/npx kirox add/g);
      expect(exampleMatches).not.toBeNull();
      expect(exampleMatches!.length).toBeGreaterThanOrEqual(3);
    });
  });
});
