import { describe, it, expect } from 'vitest';
import { validateInput } from '@/cli/validator';
import type { ParsedArguments } from '@/cli/types';

describe('InputValidator', () => {
  describe('validateInput', () => {
    const createValidArgs = (): ParsedArguments => ({
      repository: 'owner/repo',
      project: 'my-project',
      force: false,
      dryRun: false,
      verbose: false,
    });

    it('should validate correct repository format', () => {
      const args = createValidArgs();
      const result = validateInput(args);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject repository without slash', () => {
      const args = createValidArgs();
      args.repository = 'invalid-repo';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('repository');
    });

    it('should reject repository with multiple slashes', () => {
      const args = createValidArgs();
      args.repository = 'owner/repo/extra';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.field).toBe('repository');
    });

    it('should reject empty repository owner', () => {
      const args = createValidArgs();
      args.repository = '/repo';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.field).toBe('repository');
    });

    it('should reject empty repository name', () => {
      const args = createValidArgs();
      args.repository = 'owner/';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.field).toBe('repository');
    });

    it('should reject project name with path traversal (..)', () => {
      const args = createValidArgs();
      args.project = '../malicious';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.field).toBe('project');
    });

    it('should reject project name with forward slash', () => {
      const args = createValidArgs();
      args.project = 'path/to/project';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.field).toBe('project');
    });

    it('should reject project name with backslash', () => {
      const args = createValidArgs();
      args.project = 'path\\to\\project';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.field).toBe('project');
    });

    it('should reject empty project name', () => {
      const args = createValidArgs();
      args.project = '';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.field).toBe('project');
    });

    it('should accept project name with hyphens and underscores', () => {
      const args = createValidArgs();
      args.project = 'my-project_name';
      const result = validateInput(args);

      expect(result.valid).toBe(true);
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const args = createValidArgs();
      args.repository = 'invalid';
      args.project = '../malicious';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should provide descriptive error messages', () => {
      const args = createValidArgs();
      args.repository = 'invalid';
      const result = validateInput(args);

      expect(result.errors[0]?.message).toBeTruthy();
      expect(result.errors[0]?.message.length).toBeGreaterThan(0);
    });
  });
});
