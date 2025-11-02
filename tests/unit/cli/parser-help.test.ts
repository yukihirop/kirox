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
      // Check for pattern like -p proj1,proj2
      const optionIndex = parserSource.indexOf('-p');
      expect(optionIndex).toBeGreaterThanOrEqual(0);
      if (optionIndex >= 0) {
        const section = parserSource.substring(optionIndex, optionIndex + 50);
        const commaIndex = section.indexOf(',');
        const hasMultiProjectExample = commaIndex >= 0 && 
          section.substring(0, commaIndex).includes('proj') &&
          section.substring(commaIndex + 1).includes('proj');
        expect(hasMultiProjectExample).toBe(true);
      }
    });

    it('should maintain existing single project examples', () => {
      // Verify: Existing single project example is maintained
      expect(parserSource).toContain('owner/repo -p my-project');
    });

    it('should have updated -p option description', () => {
      // Verify: -p option description mentions it can accept multiple projects
      // Look for the option definition line
      const optionIndex = parserSource.indexOf('.option(');
      expect(optionIndex).toBeGreaterThanOrEqual(0);
      
      if (optionIndex >= 0) {
        // Find the closing parenthesis for this .option( call
        let depth = 0;
        let currentIndex = optionIndex + '.option('.length;
        let optionEndIndex = -1;
        
        for (let i = currentIndex; i < parserSource.length; i++) {
          if (parserSource[i] === '(') depth++;
          if (parserSource[i] === ')') {
            if (depth === 0) {
              optionEndIndex = i;
              break;
            }
            depth--;
          }
        }
        
        expect(optionEndIndex).toBeGreaterThanOrEqual(0);
        if (optionEndIndex >= 0) {
          const optionText = parserSource.substring(optionIndex, optionEndIndex + 1);
          expect(optionText.includes('-p')).toBe(true);
          expect(optionText.includes('--project')).toBe(true);
          
          // Description should mention multiple projects or comma-separated
          const mentionsMultiple =
            optionText.includes('複数') ||
            optionText.includes('multiple') ||
            optionText.includes('カンマ') ||
            optionText.includes('comma');

          expect(mentionsMultiple).toBe(true);
        }
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

  // Task 6.1: --steering option help message tests (Requirements 1.1, 8.1, 8.2)
  describe('--steering option help text (Task 6.1)', () => {
    it('should have --steering option definition with description', () => {
      // Verify: --steering option is defined in the parser
      const hasSteeringOption = parserSource.includes('.option') && parserSource.includes('--steering');
      expect(hasSteeringOption).toBe(true);
    });

    it('should have description "Fetch only .kiro/steering directory (skip project specs)" for --steering option', () => {
      // Verify: Description text is accurate (Requirement 8.3)
      expect(parserSource).toContain('Fetch only .kiro/steering directory (skip project specs)');
    });

    it('should have example of --steering in non-interactive mode', () => {
      // Verify: Help contains example with --steering flag (Requirement 8.5)
      // Should have pattern like: owner/repo --steering
      const repoIndex = parserSource.indexOf('owner/repo');
      const steeringIndex = parserSource.indexOf('--steering');
      const hasSteeringExample = repoIndex >= 0 && steeringIndex >= 0 && 
        Math.abs(steeringIndex - repoIndex) < 200;
      expect(hasSteeringExample).toBe(true);
    });

    it('should have example of --steering with --subdir option', () => {
      // Verify: Help contains example with --steering + --subdir (Requirement 8.5)
      // Should have pattern like: --subdir packages/api --steering
      const subdirIndex = parserSource.indexOf('--subdir');
      const steeringIndex2 = parserSource.indexOf('--steering');
      const hasSteeringSubdirExample = subdirIndex >= 0 && steeringIndex2 >= 0 && 
        steeringIndex2 > subdirIndex && Math.abs(steeringIndex2 - subdirIndex) < 200;
      expect(hasSteeringSubdirExample).toBe(true);
    });

    it('should set default value to false for --steering option', () => {
      // Verify: Default value is false (Requirement 1.1)
      // Look for the option definition with default value
      // Pattern: .option('--steering', '...', false) or .option("--steering", "...", false)
      const hasDefaultFalse = parserSource.includes("'--steering', 'Fetch only .kiro/steering directory (skip project specs)', false");
      expect(hasDefaultFalse).toBe(true);
    });
  });
});
