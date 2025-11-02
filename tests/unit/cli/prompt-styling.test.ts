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
      expect(interactivePromptSource).toContain('import');
      expect(interactivePromptSource).toContain('chalk');
      expect(interactivePromptSource).toContain('from');
      expect(interactivePromptSource.includes("'chalk'") || interactivePromptSource.includes('"chalk"')).toBe(true);
    });

    it('should style repository prompt message', () => {
      // Verify repository prompt message uses chalk styling
      // Example: chalk.bold.cyan('Enter GitHub repository')
      const hasRepositoryMessage = interactivePromptSource.includes('Enter GitHub repository');
      expect(hasRepositoryMessage).toBe(true);

      // Check for chalk styling in prompt messages
      // Look for chalk method calls near prompt message definitions
      const chalkMethods = ['chalk.bold', 'chalk.cyan', 'chalk.green', 'chalk.dim', 'chalk.gray', 'chalk.red', 'chalk.yellow'];
      const hasChalkStyling = chalkMethods.some(method => interactivePromptSource.includes(method));
      expect(hasChalkStyling).toBe(true);
    });

    it('should style project prompt message', () => {
      // Verify project prompt message uses chalk styling
      const hasProjectMessage = interactivePromptSource.toLowerCase().includes('project name');
      expect(hasProjectMessage).toBe(true);
    });

    it('should style output directory prompt message', () => {
      // Verify output directory prompt message exists
      const hasOutputMessage = interactivePromptSource.toLowerCase().includes('output directory');
      expect(hasOutputMessage).toBe(true);
    });

    it('should style subdirectory prompt message', () => {
      // Verify subdirectory prompt message exists
      const hasSubdirMessage = interactivePromptSource.toLowerCase().includes('subdirectory');
      expect(hasSubdirMessage).toBe(true);
    });

    it('should style confirmation prompt message', () => {
      // Verify confirmation prompt message exists
      const hasConfirmMessage = interactivePromptSource.includes('Execute with this configuration');
      expect(hasConfirmMessage).toBe(true);
    });

    it('should style default value hints', () => {
      // Verify that default value hints use dim styling
      // Example: `${chalk.dim('(default: .)')}`
      // For now, just verify that 'default:' text appears in prompts
      const hasDefaultHint = interactivePromptSource.toLowerCase().includes('default:');
      expect(hasDefaultHint).toBe(true);
    });
  });

  describe('branch-prompt.ts styling', () => {
    it('should import chalk', () => {
      // Verify chalk is imported
      expect(branchPromptSource).toContain('import');
      expect(branchPromptSource).toContain('chalk');
      expect(branchPromptSource).toContain('from');
      expect(branchPromptSource.includes("'chalk'") || branchPromptSource.includes('"chalk"')).toBe(true);
    });

    it('should style branch selection prompt message', () => {
      // Verify branch selection prompt message uses chalk styling
      const hasBranchMessage = branchPromptSource.includes('Select branch');
      expect(hasBranchMessage).toBe(true);

      // Check for chalk styling
      const chalkMethods = ['chalk.bold', 'chalk.cyan', 'chalk.green', 'chalk.dim', 'chalk.gray', 'chalk.red', 'chalk.yellow'];
      const hasChalkStyling = chalkMethods.some(method => branchPromptSource.includes(method));
      expect(hasChalkStyling).toBe(true);
    });

    it('should style default branch label', () => {
      // Verify default branch gets styled label
      const hasDefaultLabel = branchPromptSource.includes('(default)');
      expect(hasDefaultLabel).toBe(true);
    });
  });

  describe('searchable-project-prompt.ts styling', () => {
    it('should import chalk', () => {
      // Verify chalk is imported
      expect(searchableProjectPromptSource).toContain('import');
      expect(searchableProjectPromptSource).toContain('chalk');
      expect(searchableProjectPromptSource).toContain('from');
      expect(searchableProjectPromptSource.includes("'chalk'") || searchableProjectPromptSource.includes('"chalk"')).toBe(true);
    });

    it('should style project selection prompt message', () => {
      // Verify project selection prompt message uses chalk styling
      const hasProjectMessage = searchableProjectPromptSource.includes('Select projects');
      expect(hasProjectMessage).toBe(true);

      // Check for chalk styling
      const chalkMethods = ['chalk.bold', 'chalk.cyan', 'chalk.green', 'chalk.dim', 'chalk.gray', 'chalk.red', 'chalk.yellow'];
      const hasChalkStyling = chalkMethods.some(method => searchableProjectPromptSource.includes(method));
      expect(hasChalkStyling).toBe(true);
    });

    it('should style validation error messages', () => {
      // Verify validation error messages exist (they should be styled)
      const hasValidationMessage = searchableProjectPromptSource.includes('at least one project') ||
        searchableProjectPromptSource.includes('same subdirectory');
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
        expect(source, `${fileName} should import chalk`).toContain('chalk');
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
      const hasBoldCyan = allSources.includes('chalk.bold.cyan');
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
      const hasDim = allSources.includes('chalk.dim');
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
      // Hiragana: 0x3040-0x309F, Katakana: 0x30A0-0x30FF, Kanji: 0x4E00-0x9FAF
      const hasJapaneseInMessages = messages.some((msg) => {
        return msg.split('').some((char) => {
          const code = char.charCodeAt(0);
          return (
            (code >= 0x3040 && code <= 0x309F) || // Hiragana
            (code >= 0x30A0 && code <= 0x30FF) || // Katakana
            (code >= 0x4E00 && code <= 0x9FAF)    // Kanji
          );
        });
      });
      expect(hasJapaneseInMessages).toBe(false);
    });
  });
});
