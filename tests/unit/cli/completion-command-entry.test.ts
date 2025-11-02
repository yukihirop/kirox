import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeCompletionCommand } from '@/cli/completion-command-entry.js';

/**
 * Tests for completion command entry point
 *
 * Task 1.3: CompletionEntry (execution entry point) implementation
 *
 * Requirements tested:
 * - 1.1: Basic command functionality
 * - 5.3: Execution flow and error handling
 *
 * Test coverage:
 * - Parser integration (argument parsing)
 * - Basic execution flow control
 * - Exit code management
 * - Error handling (for future shell validation and generation)
 */
describe('Completion Command Entry', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console methods to verify output
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Parser integration', () => {
    it('should parse arguments and extract shell type', async () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      const result = await executeCompletionCommand(argv);

      // Should parse successfully
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle different shell types', async () => {
      const shells = ['bash', 'zsh', 'fish', 'powershell', 'elvish'];

      for (const shell of shells) {
        const argv = ['node', '/path/to/kirox', 'completion', shell];
        const result = await executeCompletionCommand(argv);

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
      }
    });
  });

  describe('Execution flow control', () => {
    it('should return ExecutionResult with proper structure', async () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      const result = await executeCompletionCommand(argv);

      // Verify result structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('filesDownloaded');
      expect(result).toHaveProperty('filesFailed');
      expect(result).toHaveProperty('exitCode');

      // For completion command, filesDownloaded/filesFailed should be 0
      expect(result.filesDownloaded).toBe(0);
      expect(result.filesFailed).toBe(0);
    });

    it('should complete execution successfully for valid shell', async () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      const result = await executeCompletionCommand(argv);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Exit code management', () => {
    it('should return exit code 0 on success', async () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      const result = await executeCompletionCommand(argv);

      expect(result.exitCode).toBe(0);
    });

    it('should return exit code 1 for missing shell argument', async () => {
      const argv = ['node', '/path/to/kirox', 'completion'];
      const result = await executeCompletionCommand(argv);

      // Should fail with exit code 1 (user error)
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should return exit code 1 for unsupported shell', async () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'unsupported-shell'];
      const result = await executeCompletionCommand(argv);

      // Should fail with exit code 1 (user error)
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('Output control', () => {
    it('should output to stdout on success', async () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      await executeCompletionCommand(argv);

      // Should output completion script to stdout (console.log)
      expect(consoleLogSpy).toHaveBeenCalled();

      // Output should contain completion script content
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should output error to stderr on failure', async () => {
      const argv = ['node', '/path/to/kirox', 'completion'];
      await executeCompletionCommand(argv);

      // Should output error message to stderr (console.error)
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Error message should mention supported shells
      const errorOutput = consoleErrorSpy.mock.calls.map(call => call.join(' ')).join('\n');
      const lowerOutput = errorOutput.toLowerCase();
      expect(
        lowerOutput.includes('bash') ||
        lowerOutput.includes('zsh') ||
        lowerOutput.includes('fish') ||
        lowerOutput.includes('powershell') ||
        lowerOutput.includes('elvish')
      ).toBe(true);
    });

    it('should not output to stderr on success', async () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      await executeCompletionCommand(argv);

      // Should NOT output to stderr on success
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle parser errors gracefully', async () => {
      // Invalid argv structure
      const argv: string[] = [];
      const result = await executeCompletionCommand(argv);

      // Should not throw, but return error result
      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });

    it('should provide helpful error message for unsupported shell', async () => {
      const argv = ['node', '/path/to/kirox', 'completion', 'unknown-shell'];
      await executeCompletionCommand(argv);

      // Error message should be helpful
      const errorOutput = consoleErrorSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(errorOutput).toContain('unknown-shell');
      const lowerOutput = errorOutput.toLowerCase();
      expect(lowerOutput.includes('supported') || lowerOutput.includes('available')).toBe(true);
    });
  });

  describe('Integration with future components', () => {
    it('should be ready to integrate with ShellValidator', async () => {
      // This test documents the future integration point
      const argv = ['node', '/path/to/kirox', 'completion', 'BASH'];
      const result = await executeCompletionCommand(argv);

      // Currently should work, but future ShellValidator will normalize case
      expect(result).toBeDefined();
    });

    it('should be ready to integrate with Generator', async () => {
      // This test documents the future integration point
      const argv = ['node', '/path/to/kirox', 'completion', 'bash'];
      const result = await executeCompletionCommand(argv);

      // Currently returns success, future Generator will produce actual script
      expect(result.success).toBe(true);
    });
  });
});
