/**
 * Help message tests for CLI argument parser (task 13.1)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Read the parser source file to verify help text configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const parserSource = readFileSync(
  join(__dirname, '../../../src/cli/parser.ts'),
  'utf-8'
);

describe('CLI Help Message (task 13.1)', () => {
  describe('Multiple project help text in source', () => {
    it('should have help text mentioning comma-separated project specification', () => {
      // Verify: Help text mentions comma-separated or multiple projects
      const hasMultiProjectHelp =
        parserSource.includes('カンマ区切り') ||
        parserSource.includes('comma-separated') ||
        parserSource.includes('multiple project');

      expect(hasMultiProjectHelp).toBe(true);
    });

    it('should have example of comma-separated multiple projects in help text', () => {
      // Verify: Help contains example with comma-separated projects
      // Should have pattern like: -p proj1,proj2
      const hasMultiProjectExample = /-p\s+\w+,\w+/.test(parserSource);

      expect(hasMultiProjectExample).toBe(true);
    });

    it('should maintain existing single project examples', () => {
      // Verify: Existing single project example is maintained
      expect(parserSource).toContain('owner/repo -p my-project');
    });

    it('should have updated -p option description', () => {
      // Verify: -p option description mentions it can accept multiple projects
      // Look for the option definition line
      const optionLineMatch = parserSource.match(/\.option\([^)]*-p,\s*--project[^)]*\)/);

      expect(optionLineMatch).not.toBeNull();

      if (optionLineMatch) {
        const optionText = optionLineMatch[0];
        // Description should mention multiple projects or comma-separated
        const mentionsMultiple =
          optionText.includes('複数') ||
          optionText.includes('multiple') ||
          optionText.includes('カンマ') ||
          optionText.includes('comma');

        expect(mentionsMultiple).toBe(true);
      }
    });
  });

  describe('Help text structure validation', () => {
    it('should have Examples section in addHelpText', () => {
      // Verify: Examples section exists
      expect(parserSource).toContain('Examples:');
    });

    it('should have Interactive Mode section in addHelpText', () => {
      // Verify: Interactive Mode section exists
      expect(parserSource).toContain('Interactive Mode:');
    });
  });
});
