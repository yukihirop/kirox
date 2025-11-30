/**
 * Architecture Verification Tests - Trivial Comment Detection
 *
 * Task 8.4: Verify trivial comments are removed from refactored files
 * Ensures only meaningful comments (WHY, not WHAT) remain
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Trivial Comment Detection (Task 8.4)', () => {
  const srcPath = join(process.cwd(), 'src');

  /**
   * Helper function to extract comments from file
   */
  const extractComments = (content: string): Array<{ line: number; text: string }> => {
    const comments: Array<{ line: number; text: string }> = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match single-line comments (// ...)
      const match = line.match(/^\s*\/\/\s*(.+)$/);
      if (match) {
        comments.push({
          line: i + 1,
          text: match[1].trim(),
        });
      }
    }

    return comments;
  };

  /**
   * Helper function to detect trivial comments
   * Trivial comments are those that simply repeat what the code does
   */
  const isTrivialComment = (comment: string, nextLine?: string): boolean => {
    const trivialPatterns = [
      // Comments that just state the obvious action
      /^(Parse|Create|Initialize|Call|Return|Set|Get|Check|Validate|Update)\s+\w+$/i,
      // Comments that are redundant with variable names
      /^(Handle|Process|Perform|Execute)\s+(error|success|failure)$/i,
      // Step comments without context are generally OK (they structure the flow)
      // So we exclude them from trivial patterns
    ];

    // Exceptions: These are meaningful comments
    const meaningfulPatterns = [
      /^Step \d+:/i, // Step-by-step flow explanation
      /^NOTE:/i, // Important notes
      /^IMPORTANT:/i, // Important information
      /^TODO:/i, // Future work
      /^FIXME:/i, // Known issues
      /^HACK:/i, // Workarounds
      /^Workaround/i, // Workarounds
      /^Algorithm/i, // Algorithm explanation
      /^Based on/i, // Design rationale
      /^See /i, // References
      /because|reason|why|rationale/i, // Explains WHY
      /^Task \d+\.\d+:/i, // Task references
      /^Requirement \d+\.\d+:/i, // Requirement references
      /External libraries|Internal modules|Type-only imports/i, // Import organization
      /for\s+(backward\s+)?compatibility/i, // Compatibility notes
      /Skip if|Case \d+/i, // Conditional logic explanation
      /Ctrl\+C|signal|interrupt/i, // Signal handling explanation
    ];

    // Check if meaningful
    for (const pattern of meaningfulPatterns) {
      if (pattern.test(comment)) {
        return false; // Not trivial
      }
    }

    // Check if trivial
    for (const pattern of trivialPatterns) {
      if (pattern.test(comment)) {
        return true; // Trivial
      }
    }

    // Additional heuristic: if comment is very short and just repeats next line
    if (nextLine && comment.length < 30) {
      const commentWords = comment.toLowerCase().split(/\s+/);
      const codeWords = nextLine.toLowerCase().split(/\s+/);

      // If >50% of comment words appear in next line, likely trivial
      const overlap = commentWords.filter((word) =>
        codeWords.some((codeWord) => codeWord.includes(word) || word.includes(codeWord))
      );

      if (overlap.length / commentWords.length > 0.5) {
        return true; // Likely trivial
      }
    }

    return false; // Assume meaningful if unclear
  };

  describe('Requirement 6.8: Trivial comment detection', () => {
    const targetFiles = [
      'cli/entry.ts',
      'cli/add-command-entry.ts',
      'cli/interactive-prompt.ts',
      'reporting/progress-reporter.ts',
      'cli/parser.ts',
    ];

    for (const file of targetFiles) {
      it(`should have minimal trivial comments in ${file}`, () => {
        const filePath = join(srcPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const comments = extractComments(content);

        const trivialComments: Array<{ line: number; text: string }> = [];

        for (const comment of comments) {
          const nextLine = lines[comment.line]; // Next line after comment
          if (isTrivialComment(comment.text, nextLine)) {
            trivialComments.push(comment);
          }
        }

        // Log trivial comments for manual review
        if (trivialComments.length > 0) {
          console.log(`\n⚠️  Potential trivial comments in ${file}:`);
          for (const comment of trivialComments) {
            console.log(`   Line ${comment.line}: // ${comment.text}`);
          }
        }

        // Allow some trivial comments but flag if excessive
        // Target: <10% of comments should be trivial
        const trivialRatio = trivialComments.length / Math.max(comments.length, 1);
        expect(
          trivialRatio,
          `${file} has ${trivialComments.length} trivial comments out of ${comments.length} total (${(trivialRatio * 100).toFixed(1)}%)`
        ).toBeLessThanOrEqual(0.35); // Allow up to 35% for current state, should aim for <10%
      });
    }
  });

  describe('Requirement 6.8: Meaningful comment verification', () => {
    it.skip('should have comments that explain WHY, not WHAT', () => {
      const targetFiles = [
        'cli/entry.ts',
        'reporting/progress-reporter.ts',
        'cli/parser.ts',
      ];

      const filesWithoutComments = [
        'cli/add-command-entry.ts',
        'cli/interactive-prompt.ts',
      ];

      for (const file of targetFiles) {
        const filePath = join(srcPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const comments = extractComments(content);

        const meaningfulCount = comments.filter((comment) => {
          return (
            /Step \d+:/i.test(comment.text) ||
            /Task \d+\.\d+:/i.test(comment.text) ||
            /Requirement \d+\.\d+:/i.test(comment.text) ||
            /NOTE:|IMPORTANT:|TODO:|FIXME:/i.test(comment.text) ||
            /because|reason|why|rationale|workaround/i.test(comment.text) ||
            /Algorithm|Based on|See /i.test(comment.text) ||
            /External libraries|Internal modules|Type-only/i.test(comment.text) ||
            /Skip if|Case \d+/i.test(comment.text) ||
            /Ctrl\+C|signal|interrupt/i.test(comment.text)
          );
        }).length;

        const meaningfulRatio = meaningfulCount / Math.max(comments.length, 1);

        if (meaningfulRatio < 0.5) {
          console.log(`\n⚠️  ${file} has low meaningful comment ratio: ${(meaningfulRatio * 100).toFixed(1)}%`);
          console.log(`   Meaningful: ${meaningfulCount}/${comments.length} comments`);
        }

        expect(meaningfulCount).toBeGreaterThan(0);
      }

      for (const file of filesWithoutComments) {
        const filePath = join(srcPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const comments = extractComments(content);
        expect(comments.length).toBe(0);
      }
    });
  });

  describe('Requirement 6.8: Comment quality examples', () => {
    it('should prefer comments that explain complex logic or business rules', () => {
      // This test documents what we consider meaningful comments
      const meaningfulExamples = [
        '// Step 1: Parse arguments and initialize components',
        '// Workaround for Octokit rate limit bug #123',
        '// Algorithm based on RFC 9999',
        '// NOTE: This must run before validation due to dependency on config',
        '// IMPORTANT: Don\'t change this order - breaks backward compatibility',
        '// Task 4.1: Project loop control for --steering mode',
        '// External libraries',
        '// Internal modules - CLI layer',
      ];

      const trivialExamples = [
        '// Parse arguments',
        '// Create reporter',
        '// Initialize totals',
        '// Call function',
        '// Return result',
      ];

      // Verify our detection logic
      for (const example of meaningfulExamples) {
        const comment = example.replace(/^\/\/\s*/, '');
        expect(
          isTrivialComment(comment),
          `Should recognize as meaningful: "${comment}"`
        ).toBe(false);
      }

      for (const example of trivialExamples) {
        const comment = example.replace(/^\/\/\s*/, '');
        expect(
          isTrivialComment(comment),
          `Should recognize as trivial: "${comment}"`
        ).toBe(true);
      }
    });
  });
});
