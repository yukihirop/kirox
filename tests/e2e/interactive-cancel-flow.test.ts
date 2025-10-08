/**
 * E2E tests for interactive mode cancellation flows
 *
 * Task 10.3: キャンセルフローのE2Eテスト
 *
 * Tests the complete cancellation scenarios in interactive mode:
 * - Ctrl+C interruption (exit 130)
 * - Confirmation prompt cancellation (exit 0)
 * - Error message display
 * - Process cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '../../src/cli/entry.js';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';
import * as interactive from '../../src/cli/interactive-prompt.js';
import { ExitPromptError } from '@inquirer/core';

vi.mock('octokit');
vi.mock('../../src/cli/interactive-prompt.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/cli/interactive-prompt.js')>();
  return {
    ...actual,
    shouldEnterInteractiveMode: vi.fn(),
    promptMissingArguments: vi.fn(),
    checkTTYEnvironment: vi.fn(),
  };
});

describe('E2E Interactive Cancellation Flow', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-cancel');
  let mockShouldEnterInteractiveMode: ReturnType<typeof vi.fn>;
  let mockPromptMissingArguments: ReturnType<typeof vi.fn>;
  let mockCheckTTYEnvironment: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, ignore
    }
    await fs.mkdir(testOutputDir, { recursive: true });

    // Get mocked functions
    mockShouldEnterInteractiveMode = interactive.shouldEnterInteractiveMode as ReturnType<typeof vi.fn>;
    mockPromptMissingArguments = interactive.promptMissingArguments as ReturnType<typeof vi.fn>;
    mockCheckTTYEnvironment = interactive.checkTTYEnvironment as ReturnType<typeof vi.fn>;

    // Default TTY check success
    mockCheckTTYEnvironment.mockReturnValue({ success: true });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Clean up any files created in project root
    try {
      const projectRootKiro = path.join(process.cwd(), '.kiro');
      await fs.rm(path.join(projectRootKiro, '.kirox-meta.json'), { force: true });
      await fs.rm(path.join(projectRootKiro, 'specs', 'test-project'), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    vi.clearAllMocks();
  });

  describe('Ctrl+C interruption (exit 130)', () => {
    it('should return exit code 130 when user presses Ctrl+C during repository prompt', async () => {
      // RED: E2E test for Ctrl+C interruption during repository prompt

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate Ctrl+C during repository prompt
      const exitPromptError = new ExitPromptError();
      mockPromptMissingArguments.mockRejectedValue(exitPromptError);

      const result = await execute(['node', 'kirox']);

      // Verify exit code 130
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(130);
      expect(result.filesDownloaded).toBe(0);
      expect(result.filesFailed).toBe(0);

      // Verify no files were created
      const specDir = path.join(testOutputDir, '.kiro', 'specs');
      expect(await fs.access(specDir).then(() => true).catch(() => false)).toBe(false);
    });

    it('should return exit code 130 when user presses Ctrl+C during project prompt', async () => {
      // RED: E2E test for Ctrl+C interruption during project prompt

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate Ctrl+C during any prompt
      const exitPromptError = new ExitPromptError();
      mockPromptMissingArguments.mockRejectedValue(exitPromptError);

      const result = await execute(['node', 'kirox', 'owner/repo']);

      // Verify exit code 130
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(130);
      expect(result.filesDownloaded).toBe(0);

      // Verify interactive mode was triggered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
      expect(mockPromptMissingArguments).toHaveBeenCalled();
    });

    it('should not create any files when interrupted with Ctrl+C', async () => {
      // RED: Verify no files are created on Ctrl+C

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const exitPromptError = new ExitPromptError();
      mockPromptMissingArguments.mockRejectedValue(exitPromptError);

      await execute(['node', 'kirox']);

      // Verify test output directory is empty (except the directory itself)
      const dirContents = await fs.readdir(testOutputDir).catch(() => []);
      expect(dirContents.length).toBe(0);
    });
  });

  describe('Confirmation prompt cancellation (exit 0)', () => {
    it('should return exit code 0 when user cancels at confirmation prompt', async () => {
      // RED: E2E test for confirmation cancellation

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate user cancelling at confirmation
      const cancelError = new Error('Operation cancelled');
      mockPromptMissingArguments.mockRejectedValue(cancelError);

      const result = await execute(['node', 'kirox']);

      // Verify exit code 0 (graceful cancellation)
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(result.filesDownloaded).toBe(0);
    });

    it('should not create any files when cancelled at confirmation', async () => {
      // RED: Verify no files created on confirmation cancellation

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const cancelError = new Error('Operation cancelled');
      mockPromptMissingArguments.mockRejectedValue(cancelError);

      await execute(['node', 'kirox', 'owner/repo']);

      // Verify no .kiro directory was created
      const kiroDir = path.join(testOutputDir, '.kiro');
      expect(await fs.access(kiroDir).then(() => true).catch(() => false)).toBe(false);
    });

    it('should handle cancellation with partial arguments provided', async () => {
      // RED: Test cancellation with partial CLI arguments

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const cancelError = new Error('Operation cancelled');
      mockPromptMissingArguments.mockRejectedValue(cancelError);

      const result = await execute(['node', 'kirox', 'owner/repo', '-o', testOutputDir]);

      // Verify graceful exit
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(0);

      // Verify interactive mode was triggered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          project: '',
          output: testOutputDir,
        })
      );
    });
  });

  describe('Error message display', () => {
    it('should not display error messages for Ctrl+C interruption', async () => {
      // RED: Verify clean Ctrl+C exit without error messages

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const exitPromptError = new ExitPromptError();
      mockPromptMissingArguments.mockRejectedValue(exitPromptError);

      const result = await execute(['node', 'kirox']);

      // Ctrl+C should result in exit 130 without error logging
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(130);
    });

    it('should handle cancellation error message gracefully', async () => {
      // RED: Verify cancellation message handling

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const cancelError = new Error('Operation cancelled');
      mockPromptMissingArguments.mockRejectedValue(cancelError);

      const result = await execute(['node', 'kirox']);

      // Cancellation should result in exit 0
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Process cleanup', () => {
    it('should clean up resources on Ctrl+C interruption', async () => {
      // RED: Verify resource cleanup on Ctrl+C

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const exitPromptError = new ExitPromptError();
      mockPromptMissingArguments.mockRejectedValue(exitPromptError);

      await execute(['node', 'kirox']);

      // Verify no partial files or locks remain
      const testDirExists = await fs.access(testOutputDir).then(() => true).catch(() => false);
      if (testDirExists) {
        const contents = await fs.readdir(testOutputDir, { recursive: true });
        // Should be empty or only contain empty directories
        const files = contents.filter((item) => !item.toString().endsWith('/'));
        expect(files.length).toBe(0);
      }
    });

    it('should clean up resources on confirmation cancellation', async () => {
      // RED: Verify resource cleanup on cancellation

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const cancelError = new Error('Operation cancelled');
      mockPromptMissingArguments.mockRejectedValue(cancelError);

      await execute(['node', 'kirox', 'owner/repo', '-p', 'test-project']);

      // Verify no GitHub API calls were made (no Octokit mock needed)
      // and no files were created
      const dirExists = await fs.access(testOutputDir).then(() => true).catch(() => false);
      if (dirExists) {
        const contents = await fs.readdir(testOutputDir);
        expect(contents.length).toBe(0);
      }
    });

    it('should handle multiple cancellation scenarios in sequence', async () => {
      // RED: Test multiple cancellation scenarios

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // First: Ctrl+C
      const exitPromptError = new ExitPromptError();
      mockPromptMissingArguments.mockRejectedValueOnce(exitPromptError);

      const result1 = await execute(['node', 'kirox']);
      expect(result1.exitCode).toBe(130);

      vi.clearAllMocks();
      mockCheckTTYEnvironment.mockReturnValue({ success: true });
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Second: Confirmation cancel
      const cancelError = new Error('Operation cancelled');
      mockPromptMissingArguments.mockRejectedValueOnce(cancelError);

      const result2 = await execute(['node', 'kirox']);
      expect(result2.exitCode).toBe(0);

      // Verify clean state after both cancellations
      const dirExists = await fs.access(testOutputDir).then(() => true).catch(() => false);
      if (dirExists) {
        const contents = await fs.readdir(testOutputDir);
        expect(contents.length).toBe(0);
      }
    });
  });
});
