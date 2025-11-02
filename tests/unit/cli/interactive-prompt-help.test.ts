/**
 * Interactive prompt help text tests (task 13.2)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Read the interactive-prompt source file to verify help text
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const promptSource = readFileSync(
  join(__dirname, '../../../src/cli/interactive-prompt.ts'),
  'utf-8'
);

describe('Interactive Prompt Help Text (task 13.2)', () => {
  describe('Project prompt message', () => {
    it('should have English message mentioning comma-separated multiple projects', () => {
      // Verify: Prompt message is in English and mentions comma-separated
      const hasEnglishMultiProjectHelp =
        promptSource.includes('comma-separated') &&
        promptSource.includes('multiple projects');

      expect(hasEnglishMultiProjectHelp).toBe(true);
    });

    it('should have project prompt message with multiple project guidance', () => {
      // Verify: Message contains guidance about multiple projects
      const hasMultiProjectGuidance =
        promptSource.includes('project name') &&
        (promptSource.includes('comma-separated') || promptSource.includes('multiple'));

      expect(hasMultiProjectGuidance).toBe(true);
    });

    it.skip('should have promptProject function with message parameter', () => {
      // Verify: promptProject function exists and has message
      const hasPromptProjectFunction = promptSource.includes('export async function promptProject');
      // Check for message parameter with or without chalk styling
      const functionIndex = promptSource.indexOf('export async function promptProject');
      if (functionIndex >= 0) {
        const functionBody = promptSource.substring(functionIndex, functionIndex + 1000);
        const hasMessageParam = functionBody.includes('message:') && 
          (functionBody.includes('message:\'') || functionBody.includes('message:"') || functionBody.includes('message: chalk.'));
        expect(hasMessageParam).toBe(true);
      } else {
        expect(false).toBe(true);
      }

      expect(hasPromptProjectFunction).toBe(true);
    });
  });

  describe('Help text format validation', () => {
    it('should have input prompt from @inquirer/prompts', () => {
      // Verify: Uses @inquirer/prompts for input
      expect(promptSource).toContain("import { input");
      expect(promptSource).toContain("from '@inquirer/prompts'");
    });

    it('should have validate function in prompt options', () => {
      // Verify: Prompt has validation
      expect(promptSource).toContain('validate:');
    });
  });
});
