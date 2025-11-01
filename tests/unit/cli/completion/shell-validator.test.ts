import { describe, it, expect } from 'vitest';
import { validateShellType, getSupportedShells } from '@/cli/completion/shell-validator.js';

/**
 * Tests for ShellValidator
 *
 * Task 2.1: ShellValidator implementation
 *
 * Requirements tested:
 * - 2.2: Input validation
 * - 2.4: Case normalization
 *
 * Test coverage:
 * - Supported shell validation (bash, zsh, fish, powershell, elvish)
 * - Case-insensitive normalization (BASH → bash)
 * - Unsupported shell detection
 * - Empty string and edge case handling
 * - getSupportedShells() utility
 */
describe('ShellValidator', () => {
  describe('Supported shell validation', () => {
    it('should validate bash as supported', () => {
      const result = validateShellType('bash');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('bash');
      expect(result.error).toBeUndefined();
    });

    it('should validate zsh as supported', () => {
      const result = validateShellType('zsh');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('zsh');
      expect(result.error).toBeUndefined();
    });

    it('should validate fish as supported', () => {
      const result = validateShellType('fish');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('fish');
      expect(result.error).toBeUndefined();
    });

    it('should validate powershell as supported', () => {
      const result = validateShellType('powershell');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('powershell');
      expect(result.error).toBeUndefined();
    });

    it('should validate elvish as supported', () => {
      const result = validateShellType('elvish');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('elvish');
      expect(result.error).toBeUndefined();
    });

    it('should validate all shells from getSupportedShells()', () => {
      const supportedShells = getSupportedShells();

      // All supported shells should pass validation
      for (const shell of supportedShells) {
        const result = validateShellType(shell);
        expect(result.valid).toBe(true);
        expect(result.normalizedShell).toBe(shell);
      }
    });
  });

  describe('Case-insensitive normalization', () => {
    it('should normalize uppercase shell name (BASH → bash)', () => {
      const result = validateShellType('BASH');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('bash');
      expect(result.error).toBeUndefined();
    });

    it('should normalize mixed case shell name (Bash → bash)', () => {
      const result = validateShellType('Bash');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('bash');
      expect(result.error).toBeUndefined();
    });

    it('should normalize uppercase ZSH → zsh', () => {
      const result = validateShellType('ZSH');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('zsh');
    });

    it('should normalize mixed case Fish → fish', () => {
      const result = validateShellType('Fish');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('fish');
    });

    it('should normalize mixed case PowerShell → powershell', () => {
      const result = validateShellType('PowerShell');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('powershell');
    });

    it('should normalize uppercase ELVISH → elvish', () => {
      const result = validateShellType('ELVISH');

      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('elvish');
    });
  });

  describe('Unsupported shell detection', () => {
    it('should reject unsupported shell (cmd)', () => {
      const result = validateShellType('cmd');

      expect(result.valid).toBe(false);
      expect(result.normalizedShell).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('cmd');
    });

    it('should reject unsupported shell (sh)', () => {
      const result = validateShellType('sh');

      expect(result.valid).toBe(false);
      expect(result.normalizedShell).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should reject unsupported shell (csh)', () => {
      const result = validateShellType('csh');

      expect(result.valid).toBe(false);
      expect(result.normalizedShell).toBeUndefined();
    });

    it('should reject completely unknown shell', () => {
      const result = validateShellType('unknown-shell');

      expect(result.valid).toBe(false);
      expect(result.normalizedShell).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should include list of supported shells in error message', () => {
      const result = validateShellType('unknown');

      expect(result.error).toMatch(/bash.*zsh.*fish.*powershell.*elvish/);
    });
  });

  describe('Edge case handling', () => {
    it('should reject empty string', () => {
      const result = validateShellType('');

      expect(result.valid).toBe(false);
      expect(result.normalizedShell).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should reject whitespace-only string', () => {
      const result = validateShellType('   ');

      expect(result.valid).toBe(false);
      expect(result.normalizedShell).toBeUndefined();
    });

    it('should handle shell name with leading/trailing spaces', () => {
      const result = validateShellType('  bash  ');

      // Should normalize by trimming and lowercasing
      expect(result.valid).toBe(true);
      expect(result.normalizedShell).toBe('bash');
    });

    it('should reject shell name with special characters', () => {
      const result = validateShellType('bash-5.0');

      expect(result.valid).toBe(false);
      expect(result.normalizedShell).toBeUndefined();
    });

    it('should reject shell name with numbers only', () => {
      const result = validateShellType('123');

      expect(result.valid).toBe(false);
    });
  });

  describe('getSupportedShells()', () => {
    it('should return array of 5 supported shells', () => {
      const shells = getSupportedShells();

      expect(shells).toHaveLength(5);
      expect(shells).toContain('bash');
      expect(shells).toContain('zsh');
      expect(shells).toContain('fish');
      expect(shells).toContain('powershell');
      expect(shells).toContain('elvish');
    });

    it('should return shells in consistent order', () => {
      const shells1 = getSupportedShells();
      const shells2 = getSupportedShells();

      expect(shells1).toEqual(shells2);
    });

    it('should return a new array instance each time', () => {
      const shells1 = getSupportedShells();
      const shells2 = getSupportedShells();

      // Arrays should be equal but not the same reference
      expect(shells1).toEqual(shells2);
      expect(shells1).not.toBe(shells2);
    });
  });

  describe('Type safety', () => {
    it('should return normalizedShell with correct type', () => {
      const result = validateShellType('bash');

      if (result.valid) {
        // TypeScript should infer normalizedShell as SupportedShell
        const shell: 'bash' | 'zsh' | 'fish' | 'powershell' | 'elvish' = result.normalizedShell!;
        expect(shell).toBe('bash');
      }
    });
  });
});
