/**
 * Add Command .kiro Folder Not Found Error Handling Tests (Task 8.5)
 *
 * Verify that add command properly handles .kiro folder not found errors:
 * - Catches 404 errors from fetchDirectoryContents()
 * - Displays user-friendly error message
 * - Provides guidance about repository, branch, and subdirectory
 * - Exits with code 1 (user error)
 *
 * Requirements: 3.6 (new)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { executeAddCommand } from '@/cli/add-command-entry.js';
import * as metadataManager from '@/tracking/metadata-manager.js';
import * as fetcher from '@/github/fetcher.js';

// Unmock PinoLogger to allow actual implementation
vi.unmock('@/reporting/pino-logger.js');

describe('Add Command .kiro Folder Not Found Error Handling (Task 8.5)', () => {
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock metadata functions
    vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue({
      version: '1.0',
      projects: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 3.6: 404 error handling for .kiro folder', () => {
    it('should catch 404 error when .kiro folder is not found', async () => {
      // Mock fetchDirectoryContents to throw 404 error
      const error404 = new Error('Not Found');
      (error404 as any).status = 404;
      vi.spyOn(fetcher, 'fetchDirectoryContents').mockRejectedValue(error404);

      const result = await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project']);

      // Verify command failed
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1); // User error
    });

    it('should display user-friendly error message when .kiro folder not found', async () => {
      // Mock fetchDirectoryContents to throw 404 error
      const error404 = new Error('Not Found');
      (error404 as any).status = 404;
      vi.spyOn(fetcher, 'fetchDirectoryContents').mockRejectedValue(error404);

      await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project']);

      // Verify user-friendly error message was displayed
      const errorCalls = (console.error as any).mock.calls.map((call: any) => call.join(' '));
      const hasUserFriendlyMessage = errorCalls.some((msg: string) =>
        msg.includes('.kiro folder was not found') ||
        msg.includes('.kiro folder not found')
      );
      expect(hasUserFriendlyMessage).toBe(true);
    });

    it('should provide guidance about repository in error message', async () => {
      // Mock fetchDirectoryContents to throw 404 error
      const error404 = new Error('Not Found');
      (error404 as any).status = 404;
      vi.spyOn(fetcher, 'fetchDirectoryContents').mockRejectedValue(error404);

      await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project']);

      // Verify repository is mentioned in error message
      const errorCalls = (console.error as any).mock.calls.map((call: any) => call.join(' '));
      const hasRepositoryInfo = errorCalls.some((msg: string) =>
        msg.includes('repository') || msg.includes('owner/repo')
      );
      expect(hasRepositoryInfo).toBe(true);
    });

    it('should mention branch in error message when branch is specified', async () => {
      // Mock fetchDirectoryContents to throw 404 error
      const error404 = new Error('Not Found');
      (error404 as any).status = 404;
      vi.spyOn(fetcher, 'fetchDirectoryContents').mockRejectedValue(error404);

      await executeAddCommand(['node', 'kirox', 'add', 'owner/repo#feature', '-p', 'test-project']);

      // Verify branch is mentioned in error message
      const errorCalls = (console.error as any).mock.calls.map((call: any) => call.join(' '));
      const hasBranchInfo = errorCalls.some((msg: string) =>
        msg.includes('branch') || msg.includes('feature')
      );
      expect(hasBranchInfo).toBe(true);
    });

    it('should mention subdirectory in error message when subdir is specified', async () => {
      // Mock fetchDirectoryContents to throw 404 error
      const error404 = new Error('Not Found');
      (error404 as any).status = 404;
      vi.spyOn(fetcher, 'fetchDirectoryContents').mockRejectedValue(error404);

      await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '--subdir', 'packages/api', '-p', 'test-project']);

      // Verify subdirectory is mentioned in error message
      const errorCalls = (console.error as any).mock.calls.map((call: any) => call.join(' '));
      const hasSubdirInfo = errorCalls.some((msg: string) =>
        msg.includes('subdirectory') || msg.includes('packages/api')
      );
      expect(hasSubdirInfo).toBe(true);
    });

    it('should provide actionable guidance to check repository, branch, and subdirectory', async () => {
      // Mock fetchDirectoryContents to throw 404 error
      const error404 = new Error('Not Found');
      (error404 as any).status = 404;
      vi.spyOn(fetcher, 'fetchDirectoryContents').mockRejectedValue(error404);

      await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project']);

      // Verify actionable guidance is provided
      const errorCalls = (console.error as any).mock.calls.map((call: any) => call.join(' '));
      const hasGuidance = errorCalls.some((msg: string) =>
        msg.includes('check') || msg.includes('verify') || msg.includes('ensure')
      );
      expect(hasGuidance).toBe(true);
    });

    it('should not confuse user with technical error details', async () => {
      // Mock fetchDirectoryContents to throw 404 error with technical details
      const error404 = new Error('HTTP 404 Not Found: GET https://api.github.com/repos/owner/repo/contents/.kiro');
      (error404 as any).status = 404;
      vi.spyOn(fetcher, 'fetchDirectoryContents').mockRejectedValue(error404);

      await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project']);

      // Verify technical details are NOT exposed in non-verbose mode
      const errorCalls = (console.error as any).mock.calls.map((call: any) => call.join(' '));
      const hasTechnicalDetails = errorCalls.some((msg: string) =>
        msg.includes('api.github.com') || msg.includes('HTTP 404')
      );
      // Should not show technical details in user-facing error
      expect(hasTechnicalDetails).toBe(false);
    });
  });

  describe('Requirement 3.6: Exit code for user error', () => {
    it('should return exit code 1 for .kiro folder not found', async () => {
      // Mock fetchDirectoryContents to throw 404 error
      const error404 = new Error('Not Found');
      (error404 as any).status = 404;
      vi.spyOn(fetcher, 'fetchDirectoryContents').mockRejectedValue(error404);

      const result = await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project']);

      // Verify exit code is 1 (user error, not system error)
      expect(result.exitCode).toBe(1);
    });
  });
});
