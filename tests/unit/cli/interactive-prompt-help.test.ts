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
    it('should have Japanese message mentioning comma-separated multiple projects', () => {
      // Verify: Prompt message is in Japanese and mentions comma-separated
      const hasJapaneseMultiProjectHelp =
        promptSource.includes('カンマ区切り') &&
        promptSource.includes('複数');

      expect(hasJapaneseMultiProjectHelp).toBe(true);
    });

    it('should have project prompt message with multiple project guidance', () => {
      // Verify: Message contains guidance about multiple projects
      const hasMultiProjectGuidance =
        promptSource.includes('プロジェクト名') &&
        (promptSource.includes('カンマ区切り') || promptSource.includes('複数指定'));

      expect(hasMultiProjectGuidance).toBe(true);
    });

    it('should have promptProject function with message parameter', () => {
      // Verify: promptProject function exists and has message
      const hasPromptProjectFunction = /export async function promptProject/.test(promptSource);
      const hasMessageParam = /message:\s*['"](.*?)['"]/s.test(promptSource);

      expect(hasPromptProjectFunction).toBe(true);
      expect(hasMessageParam).toBe(true);
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
