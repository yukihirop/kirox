/**
 * Parser - Validator Integration Tests (Task 6.5)
 *
 * Verify type compatibility between parser.ts and validator.ts after parser-config refactoring
 * Requirements 5.5, 6.6: ParsedArguments type signature remains unchanged and compatible with validator
 */

import { describe, it, expect } from 'vitest';
import { parseArguments } from '@/cli/parser.js';
import { validateInput, validateRepositoryFormat, validateProjectName } from '@/cli/validator.js';
import type { ParsedArguments } from '@/cli/types.js';

describe('Parser - Validator Integration (Task 6.5)', () => {
  describe('ParsedArguments type compatibility', () => {
    it('should produce ParsedArguments compatible with validateInput', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'my-project'];
      const parsedArgs: ParsedArguments = parseArguments(argv);

      // validateInput should accept ParsedArguments from parser without type errors
      const result = validateInput(parsedArgs);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate repository field from parser output', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'my-project'];
      const parsedArgs = parseArguments(argv);

      // Repository field should be compatible with validateRepositoryFormat
      const errors = validateRepositoryFormat(parsedArgs.repository);

      expect(errors).toEqual([]);
    });

    it('should validate projects field from parser output', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2'];
      const parsedArgs = parseArguments(argv);

      // Projects field should be string[] compatible with validateProjectName
      expect(Array.isArray(parsedArgs.projects)).toBe(true);
      expect(parsedArgs.projects).toEqual(['proj1', 'proj2']);

      // Each project should be compatible with validateProjectName
      for (const project of parsedArgs.projects) {
        const errors = validateProjectName(project);
        expect(errors).toEqual([]);
      }
    });

    it('should validate boolean options from parser output', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'my-project', '--force', '--dry-run', '--verbose'];
      const parsedArgs = parseArguments(argv);

      // Boolean fields should be boolean type
      expect(typeof parsedArgs.force).toBe('boolean');
      expect(typeof parsedArgs.dryRun).toBe('boolean');
      expect(typeof parsedArgs.verbose).toBe('boolean');
      expect(typeof parsedArgs.track).toBe('boolean');
      expect(typeof parsedArgs.checkUpdates).toBe('boolean');
      expect(typeof parsedArgs.update).toBe('boolean');
      expect(typeof parsedArgs.steering).toBe('boolean');

      // Validator should accept these boolean values
      const result = validateInput(parsedArgs);
      expect(result).toBeDefined();
    });

    it('should validate optional string fields from parser output', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'my-project', '--subdir', 'packages/api', '--config', '.kiroxrc'];
      const parsedArgs = parseArguments(argv);

      // Optional string fields should be string or undefined
      expect(typeof parsedArgs.subdir === 'string' || parsedArgs.subdir === undefined).toBe(true);
      expect(typeof parsedArgs.config === 'string' || parsedArgs.config === undefined).toBe(true);
      expect(typeof parsedArgs.shellType === 'string' || parsedArgs.shellType === undefined).toBe(true);

      // Validator should accept these optional values
      const result = validateInput(parsedArgs);
      expect(result).toBeDefined();
    });
  });

  describe('Add subcommand type compatibility', () => {
    it('should produce compatible ParsedArguments for add subcommand', () => {
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'new-project'];
      const parsedArgs = parseArguments(argv);

      // Subcommand field should be set
      expect(parsedArgs.subcommand).toBe('add');

      // Validator should accept add subcommand ParsedArguments
      const result = validateInput(parsedArgs);
      expect(result).toBeDefined();
    });

    it('should validate add subcommand with multiple projects', () => {
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'proj1,proj2,proj3'];
      const parsedArgs = parseArguments(argv);

      expect(parsedArgs.projects).toEqual(['proj1', 'proj2', 'proj3']);

      // Validator should accept multiple projects
      const result = validateInput(parsedArgs);
      expect(result.valid).toBe(true);
    });
  });

  describe('Default values compatibility', () => {
    it('should have valid default values compatible with validator', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'my-project'];
      const parsedArgs = parseArguments(argv);

      // Default values from parser-config should be validator-compatible
      expect(parsedArgs.output).toBe('.');
      expect(parsedArgs.force).toBe(false);
      expect(parsedArgs.dryRun).toBe(false);
      expect(parsedArgs.verbose).toBe(false);
      expect(parsedArgs.track).toBe(false);
      expect(parsedArgs.checkUpdates).toBe(false);
      expect(parsedArgs.update).toBe(false);
      expect(parsedArgs.steering).toBe(false);

      // Validator should accept these defaults
      const result = validateInput(parsedArgs);
      expect(result.valid).toBe(true);
    });
  });

  describe('Validation error scenarios', () => {
    it('should detect invalid repository format from parser', () => {
      const argv = ['node', 'kirox', 'invalid-repo', '-p', 'my-project'];
      const parsedArgs = parseArguments(argv);

      // Validator should detect invalid repository
      const result = validateInput(parsedArgs);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('repository');
    });

    it('should detect invalid project name from parser', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', '../evil'];
      const parsedArgs = parseArguments(argv);

      // Validator should detect path traversal attempt
      const result = validateInput(parsedArgs);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('project');
    });

    it('should detect mutually exclusive options from parser', () => {
      const argv = ['node', 'kirox', 'owner/repo', '--steering', '--check-updates'];
      const parsedArgs = parseArguments(argv);

      // Verify both options are set
      expect(parsedArgs.steering).toBe(true);
      expect(parsedArgs.checkUpdates).toBe(true);

      // Validator should detect mutual exclusivity violation (--steering and --check-updates)
      const result = validateInput(parsedArgs);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('options');
    });
  });

  describe('Steering mode compatibility', () => {
    it('should validate --steering mode from parser', () => {
      const argv = ['node', 'kirox', 'owner/repo', '--steering'];
      const parsedArgs = parseArguments(argv);

      expect(parsedArgs.steering).toBe(true);
      expect(parsedArgs.projects).toEqual([]);

      // Validator should accept --steering mode without projects
      const result = validateInput(parsedArgs);
      expect(result.valid).toBe(true);
    });

    it('should detect --steering with invalid option combinations', () => {
      const argv = ['node', 'kirox', 'owner/repo', '--steering', '--check-updates'];
      const parsedArgs = parseArguments(argv);

      // Validator should detect mutual exclusivity
      const result = validateInput(parsedArgs);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'options')).toBe(true);
    });
  });
});
