/**
 * Architecture Verification Tests - Public API Compatibility
 *
 * Task 8.2: Verify public API signatures have not changed
 * Ensures backward compatibility after refactoring
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Public API Compatibility Verification (Task 8.2)', () => {
  describe('Requirement 1.5, 6.6: execute function signature', () => {
    it('should maintain execute function signature in entry.ts', () => {
      const entryPath = join(process.cwd(), 'src/cli/entry.ts');
      const content = readFileSync(entryPath, 'utf-8');

      // Verify execute function exists with correct signature
      expect(content).toMatch(/export async function execute\s*\(\s*argv:\s*string\[\]\s*\):/);
      expect(content).toMatch(/Promise<ExecutionResult>/);
    });

    it('should have ExecutionResult type with required fields', () => {
      const typesPath = join(process.cwd(), 'src/cli/types.ts');
      const content = readFileSync(typesPath, 'utf-8');

      // Verify ExecutionResult interface exists
      expect(content).toMatch(/export interface ExecutionResult/);
      expect(content).toMatch(/success:\s*boolean/);
      expect(content).toMatch(/filesDownloaded:\s*number/);
      expect(content).toMatch(/filesFailed:\s*number/);
      expect(content).toMatch(/exitCode:\s*number/);
    });
  });

  describe('Requirement 1.5, 6.6: executeAddCommand function signature', () => {
    it('should maintain executeAddCommand function signature in add-command-entry.ts', () => {
      const addEntryPath = join(process.cwd(), 'src/cli/add-command-entry.ts');
      const content = readFileSync(addEntryPath, 'utf-8');

      // Verify executeAddCommand function exists with correct signature
      expect(content).toMatch(
        /export async function executeAddCommand\s*\(\s*argv:\s*string\[\]\s*\):/
      );
      expect(content).toMatch(/Promise<ExecutionResult>/);
    });
  });

  describe('Requirement 6.6: shouldEnterInteractiveMode function signature', () => {
    it('should maintain shouldEnterInteractiveMode function signature in interactive-prompt.ts', () => {
      const interactivePath = join(process.cwd(), 'src/cli/interactive-prompt.ts');
      const content = readFileSync(interactivePath, 'utf-8');

      // Verify shouldEnterInteractiveMode function exists with correct signature
      expect(content).toMatch(
        /export function shouldEnterInteractiveMode\s*\(\s*args:\s*ParsedArguments\s*\):/
      );
      expect(content).toMatch(/boolean/);
    });
  });

  describe('Requirement 6.6: promptMissingArguments function signature', () => {
    it('should maintain promptMissingArguments function signature in interactive-prompt.ts', () => {
      const interactivePath = join(process.cwd(), 'src/cli/interactive-prompt.ts');
      const content = readFileSync(interactivePath, 'utf-8');

      // Verify promptMissingArguments function exists with correct signature
      expect(content).toMatch(
        /export async function promptMissingArguments\s*\(/
      );
      expect(content).toMatch(/args:\s*ParsedArguments/);
      expect(content).toMatch(/Promise<ParsedArguments>/);
    });
  });

  describe('Requirement 6.6: ProgressReporter class signature', () => {
    it('should maintain ProgressReporter class with core public methods', () => {
      const reporterPath = join(process.cwd(), 'src/reporting/progress-reporter.ts');
      const content = readFileSync(reporterPath, 'utf-8');

      // Verify ProgressReporter class exists
      expect(content).toMatch(/export class ProgressReporter/);

      // Verify constructor signature
      expect(content).toMatch(/constructor\s*\(\s*options:\s*ReporterOptions\s*\)/);

      // Verify core public methods exist (main use case)
      expect(content).toMatch(/reportStart\s*\(/);
      expect(content).toMatch(/reportProgress\s*\(/);
      expect(content).toMatch(/reportSuccess\s*\(/);
      expect(content).toMatch(/reportError\s*\(/);
    });

    it('should have ReporterOptions type', () => {
      const typesPath = join(process.cwd(), 'src/reporting/types.ts');
      const content = readFileSync(typesPath, 'utf-8');

      // Verify ReporterOptions interface exists
      expect(content).toMatch(/export interface ReporterOptions/);
    });
  });

  describe('Requirement 6.6: No breaking changes in existing callers', () => {
    it('should have index.ts importing execute function', () => {
      const indexPath = join(process.cwd(), 'src/index.ts');
      const content = readFileSync(indexPath, 'utf-8');

      // Verify execute is imported from entry.ts
      expect(content).toMatch(/import.*execute.*from.*entry/);
    });

    it('should have index.ts importing executeAddCommand', () => {
      const indexPath = join(process.cwd(), 'src/index.ts');
      const content = readFileSync(indexPath, 'utf-8');

      // Verify executeAddCommand is imported from add-command-entry.ts
      expect(content).toMatch(/import.*executeAddCommand.*from.*add-command-entry/);
    });
  });

  describe('Requirement 6.6: Type exports are maintained', () => {
    it('should export ParsedArguments type', () => {
      const typesPath = join(process.cwd(), 'src/cli/types.ts');
      const content = readFileSync(typesPath, 'utf-8');

      expect(content).toMatch(/export interface ParsedArguments/);
    });

    it('should export ExecutionResult type', () => {
      const typesPath = join(process.cwd(), 'src/cli/types.ts');
      const content = readFileSync(typesPath, 'utf-8');

      expect(content).toMatch(/export interface ExecutionResult/);
    });
  });
});
