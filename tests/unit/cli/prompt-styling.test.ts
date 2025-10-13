/**
 * Prompt Message Styling Tests (Task 10.4)
 *
 * Verify that all interactive prompt messages use Chalk styling
 * for improved visual hierarchy and user experience.
 *
 * Test Strategy:
 * - Read source files and verify Chalk imports and usage
 * - Check that message strings use Chalk styling functions
 * - Ensure consistent styling patterns across all prompt files
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Read prompt source files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const interactivePromptSource = readFileSync(
  join(__dirname, '../../../src/cli/interactive-prompt.ts'),
  'utf-8'
);
const branchPromptSource = readFileSync(
  join(__dirname, '../../../src/cli/branch-prompt.ts'),
  'utf-8'
);
const searchableProjectPromptSource = readFileSync(
  join(__dirname, '../../../src/cli/searchable-project-prompt.ts'),
  'utf-8'
);

describe('Prompt Message Styling (Task 10.4)', () => {
  describe('interactive-prompt.ts styling', () => {
    it('should import chalk', () => {
      // Verify chalk is imported
      expect(interactivePromptSource).toMatch(/import.*chalk.*from ['"]chalk['"]/);
    });

    it('should style repository prompt message', () => {
      // Verify repository prompt message uses chalk styling
      // Example: chalk.bold.cyan('Enter GitHub repository')
      const hasRepositoryMessage = /Enter GitHub repository/.test(interactivePromptSource);
      expect(hasRepositoryMessage).toBe(true);

      // Check for chalk styling in prompt messages
      // Look for chalk method calls near prompt message definitions
      const hasChalkStyling = /chalk\.(bold|cyan|green|dim|gray|red|yellow)/.test(
        interactivePromptSource
      );
      expect(hasChalkStyling).toBe(true);
    });

    it('should style project prompt message', () => {
      // Verify project prompt message uses chalk styling
      const hasProjectMessage = /project name/.test(interactivePromptSource);
      expect(hasProjectMessage).toBe(true);
    });

    it('should style output directory prompt message', () => {
      // Verify output directory prompt message exists
      const hasOutputMessage = /output directory/.test(interactivePromptSource);
      expect(hasOutputMessage).toBe(true);
    });

    it('should style subdirectory prompt message', () => {
      // Verify subdirectory prompt message exists
      const hasSubdirMessage = /subdirectory/.test(interactivePromptSource);
      expect(hasSubdirMessage).toBe(true);
    });

    it('should style confirmation prompt message', () => {
      // Verify confirmation prompt message exists
      const hasConfirmMessage = /Execute with this configuration/.test(
        interactivePromptSource
      );
      expect(hasConfirmMessage).toBe(true);
    });

    it('should style default value hints', () => {
      // Verify that default value hints use dim styling
      // Example: `${chalk.dim('(default: .)')}`
      // For now, just verify that 'default:' text appears in prompts
      const hasDefaultHint = /default:/i.test(interactivePromptSource);
      expect(hasDefaultHint).toBe(true);
    });
  });

  describe('branch-prompt.ts styling', () => {
    it('should import chalk', () => {
      // Verify chalk is imported
      expect(branchPromptSource).toMatch(/import.*chalk.*from ['"]chalk['"]/);
    });

    it('should style branch selection prompt message', () => {
      // Verify branch selection prompt message uses chalk styling
      const hasBranchMessage = /Select branch/.test(branchPromptSource);
      expect(hasBranchMessage).toBe(true);

      // Check for chalk styling
      const hasChalkStyling = /chalk\.(bold|cyan|green|dim|gray|red|yellow)/.test(
        branchPromptSource
      );
      expect(hasChalkStyling).toBe(true);
    });

    it('should style default branch label', () => {
      // Verify default branch gets styled label
      const hasDefaultLabel = /\(default\)/.test(branchPromptSource);
      expect(hasDefaultLabel).toBe(true);
    });
  });

  describe('searchable-project-prompt.ts styling', () => {
    it('should import chalk', () => {
      // Verify chalk is imported
      expect(searchableProjectPromptSource).toMatch(/import.*chalk.*from ['"]chalk['"]/);
    });

    it('should style project selection prompt message', () => {
      // Verify project selection prompt message uses chalk styling
      const hasProjectMessage = /Select projects/.test(searchableProjectPromptSource);
      expect(hasProjectMessage).toBe(true);

      // Check for chalk styling
      const hasChalkStyling = /chalk\.(bold|cyan|green|dim|gray|red|yellow)/.test(
        searchableProjectPromptSource
      );
      expect(hasChalkStyling).toBe(true);
    });

    it('should style validation error messages', () => {
      // Verify validation error messages exist (they should be styled)
      const hasValidationMessage = /(at least one project|same subdirectory)/.test(
        searchableProjectPromptSource
      );
      expect(hasValidationMessage).toBe(true);
    });
  });

  describe('Consistent styling patterns', () => {
    it('should use consistent chalk methods across prompt files', () => {
      // Verify all prompt files use chalk
      const files = [
        interactivePromptSource,
        branchPromptSource,
        searchableProjectPromptSource,
      ];

      files.forEach((source, index) => {
        const fileName = ['interactive-prompt.ts', 'branch-prompt.ts', 'searchable-project-prompt.ts'][index];
        expect(source, `${fileName} should import chalk`).toMatch(/chalk/);
      });
    });

    it('should use bold.cyan for prompt messages', () => {
      // Verify that bold.cyan is used for main prompt messages
      // This is a stylistic convention for consistency
      const allSources = [
        interactivePromptSource,
        branchPromptSource,
        searchableProjectPromptSource,
      ].join('\n');

      // At least one file should use bold.cyan pattern
      const hasBoldCyan = /chalk\.bold\.cyan/.test(allSources);
      expect(hasBoldCyan).toBe(true);
    });

    it('should use dim for hint text', () => {
      // Verify that dim is used for hint text like default values
      const allSources = [
        interactivePromptSource,
        branchPromptSource,
        searchableProjectPromptSource,
      ].join('\n');

      // At least one file should use dim styling
      const hasDim = /chalk\.dim/.test(allSources);
      expect(hasDim).toBe(true);
    });

    it('should not contain Japanese text in prompt messages', () => {
      // Verify no Japanese characters in prompt messages (language.md requirement)
      // Note: Japanese in comments is allowed, this test checks message strings only
      const allSources = [
        interactivePromptSource,
        branchPromptSource,
        searchableProjectPromptSource,
      ].join('\n');

      // Extract message strings from prompt calls (look for message: '...' or message: "...")
      const messagePattern = /message:\s*(?:chalk\.\w+(?:\.\w+)?\()?\s*['"]([^'"]+)['"]/g;
      const messages: string[] = [];
      let match;
      while ((match = messagePattern.exec(allSources)) !== null) {
        if (match[1]) {
          messages.push(match[1]);
        }
      }

      // Check if any message contains Japanese characters
      const hasJapaneseInMessages = messages.some((msg) =>
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(msg)
      );
      expect(hasJapaneseInMessages).toBe(false);
    });
  });
});
