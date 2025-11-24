/**
 * Help message tests for CLI argument parser (task 13.1)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mainCommandOptions } from '@/cli/parser-config.js';

// Read the parser source file to verify help text configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const parserSource = readFileSync(
  join(__dirname, '../../../src/cli/parser.ts'),
  'utf-8'
);
const parserConfigSource = readFileSync(
  join(__dirname, '../../../src/cli/parser-config.ts'),
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

    it.skip('should have example of comma-separated multiple projects in help text', () => {
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
      // Task 6.2: After refactoring, check parser-config.ts instead of parser.ts
      // Verify: -p option description mentions it can accept multiple projects
      const projectOption = mainCommandOptions.find(opt => opt.flags.includes('--project'));
      expect(projectOption).toBeDefined();
      expect(projectOption?.flags).toContain('-p');
      expect(projectOption?.flags).toContain('--project');

      // Description should mention multiple projects or comma-separated
      const mentionsMultiple =
        projectOption?.description.includes('複数') ||
        projectOption?.description.includes('multiple') ||
        projectOption?.description.includes('カンマ') ||
        projectOption?.description.includes('comma');

      expect(mentionsMultiple).toBe(true);
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
      // Task 6.2: After refactoring, check parser-config.ts instead of parser.ts
      // Verify: --steering option is defined in the parser configuration
      const steeringOption = mainCommandOptions.find(opt => opt.flags.includes('--steering'));
      expect(steeringOption).toBeDefined();
      expect(steeringOption?.description).toBeDefined();
    });

    it('should have description "Fetch only .kiro/steering directory (skip project specs)" for --steering option', () => {
      // Task 6.2: After refactoring, check parser-config.ts instead of parser.ts
      // Verify: Description text is accurate (Requirement 8.3)
      const steeringOption = mainCommandOptions.find(opt => opt.flags.includes('--steering'));
      expect(steeringOption?.description).toBe('Fetch only .kiro/steering directory (skip project specs)');
    });

    it.skip('should have example of --steering in non-interactive mode', () => {
      // Verify: Help contains example with --steering flag (Requirement 8.5)
      // Should have pattern like: owner/repo --steering
      const repoIndex = parserSource.indexOf('owner/repo');
      const steeringIndex = parserSource.indexOf('--steering');
      const hasSteeringExample = repoIndex >= 0 && steeringIndex >= 0 && 
        Math.abs(steeringIndex - repoIndex) < 200;
      expect(hasSteeringExample).toBe(true);
    });

    it.skip('should have example of --steering with --subdir option', () => {
      // Verify: Help contains example with --steering + --subdir (Requirement 8.5)
      // Should have pattern like: --subdir packages/api --steering
      const subdirIndex = parserSource.indexOf('--subdir');
      const steeringIndex2 = parserSource.indexOf('--steering');
      const hasSteeringSubdirExample = subdirIndex >= 0 && steeringIndex2 >= 0 && 
        steeringIndex2 > subdirIndex && Math.abs(steeringIndex2 - subdirIndex) < 200;
      expect(hasSteeringSubdirExample).toBe(true);
    });

    it('should set default value to false for --steering option', () => {
      // Task 6.2: After refactoring, check parser-config.ts instead of parser.ts
      // Verify: Default value is false (Requirement 1.1)
      const steeringOption = mainCommandOptions.find(opt => opt.flags.includes('--steering'));
      expect(steeringOption?.defaultValue).toBe(false);
    });
  });
});
