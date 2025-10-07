import { describe, it, expect } from 'vitest';
import { validateInput } from '@/cli/validator';
import type { ParsedArguments } from '@/cli/types';

describe('InputValidator', () => {
  describe('validateInput', () => {
    const createValidArgs = (): ParsedArguments => ({
      repository: 'owner/repo',
      project: 'my-project',
      output: '.',
      force: false,
      dryRun: false,
      verbose: false,
      track: false,
      checkUpdates: false,
      update: false,
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

  describe('validateInput - Command option mutual exclusivity', () => {
    const createValidArgs = (): ParsedArguments => ({
      repository: 'owner/repo',
      project: 'my-project',
      output: '.',
      force: false,
      dryRun: false,
      verbose: false,
      track: false,
      checkUpdates: false,
      update: false,
    });

    it('should allow --track with repository and project', () => {
      const args = createValidArgs();
      args.track = true;
      const result = validateInput(args);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow --check-updates without repository and project', () => {
      const args = createValidArgs();
      args.checkUpdates = true;
      args.repository = '';
      args.project = '';
      const result = validateInput(args);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow --update without repository and project', () => {
      const args = createValidArgs();
      args.update = true;
      args.repository = '';
      args.project = '';
      const result = validateInput(args);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject --track and --check-updates together', () => {
      const args = createValidArgs();
      args.track = true;
      args.checkUpdates = true;
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('options');
      expect(result.errors[0]?.message).toContain('--track');
      expect(result.errors[0]?.message).toContain('--check-updates');
    });

    it('should reject --track and --update together', () => {
      const args = createValidArgs();
      args.track = true;
      args.update = true;
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('options');
      expect(result.errors[0]?.message).toContain('--track');
      expect(result.errors[0]?.message).toContain('--update');
    });

    it('should reject --check-updates and --update together', () => {
      const args = createValidArgs();
      args.checkUpdates = true;
      args.update = true;
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('options');
      expect(result.errors[0]?.message).toContain('--check-updates');
      expect(result.errors[0]?.message).toContain('--update');
    });

    it('should reject all three options together', () => {
      const args = createValidArgs();
      args.track = true;
      args.checkUpdates = true;
      args.update = true;
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('options');
    });

    it('should not require repository/project for --check-updates', () => {
      const args = createValidArgs();
      args.checkUpdates = true;
      args.repository = '';
      args.project = '';
      const result = validateInput(args);

      expect(result.valid).toBe(true);
    });

    it('should not require repository/project for --update', () => {
      const args = createValidArgs();
      args.update = true;
      args.repository = '';
      args.project = '';
      const result = validateInput(args);

      expect(result.valid).toBe(true);
    });

    it('should require repository/project for regular fetch', () => {
      const args = createValidArgs();
      args.repository = '';
      args.project = '';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'repository')).toBe(true);
    });

    it('should require repository/project for --track', () => {
      const args = createValidArgs();
      args.track = true;
      args.repository = '';
      args.project = '';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'repository')).toBe(true);
    });
  });

  describe('validateInput - Subdirectory path validation', () => {
    const createValidArgs = (): ParsedArguments => ({
      repository: 'owner/repo',
      project: 'my-project',
      output: '.',
      force: false,
      dryRun: false,
      verbose: false,
      track: false,
      checkUpdates: false,
      update: false,
    });

    it('should accept valid subdirectory path', () => {
      const args = createValidArgs();
      args.subdir = 'packages/api';
      const result = validateInput(args);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept subdirectory path with multiple levels', () => {
      const args = createValidArgs();
      args.subdir = 'apps/frontend/modules';
      const result = validateInput(args);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept undefined subdirectory (not specified)', () => {
      const args = createValidArgs();
      args.subdir = undefined;
      const result = validateInput(args);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject subdirectory path with path traversal (..)', () => {
      const args = createValidArgs();
      args.subdir = '../malicious';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('subdir');
      expect(result.errors[0]?.message).toContain('パストラバーサル');
    });

    it('should reject subdirectory path with .. in the middle', () => {
      const args = createValidArgs();
      args.subdir = 'packages/../etc';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.field).toBe('subdir');
    });

    it('should reject absolute subdirectory path', () => {
      const args = createValidArgs();
      args.subdir = '/etc/passwd';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('subdir');
      expect(result.errors[0]?.message).toContain('絶対パス');
    });

    it('should not affect existing validation when subdir is not specified', () => {
      const args = createValidArgs();
      args.repository = 'invalid-repo';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('repository');
    });

    it('should return multiple errors for invalid repository and subdir', () => {
      const args = createValidArgs();
      args.repository = 'invalid';
      args.subdir = '../malicious';
      const result = validateInput(args);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some((e) => e.field === 'repository')).toBe(true);
      expect(result.errors.some((e) => e.field === 'subdir')).toBe(true);
    });
  });
});
