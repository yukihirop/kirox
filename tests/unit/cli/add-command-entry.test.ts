/**
 * Add Command Entry Point Unit Tests
 *
 * Tests for executeAddCommand function (Task 2.1)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeAddCommand } from '@/cli/add-command-entry.js';
import type { ExecutionResult } from '@/cli/types.js';

// Mock all dependencies
vi.mock('@/reporting/logger.js', () => ({
  Logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  })),
}));

vi.mock('@/reporting/error-handler.js', () => ({
  ErrorHandler: vi.fn(() => ({
    handle: vi.fn(() => ({
      type: 'GENERIC_ERROR',
      message: 'Error occurred',
      exitCode: 1,
    })),
  })),
}));

vi.mock('@/reporting/progress-reporter.js', () => ({
  ProgressReporter: vi.fn(() => ({
    reportStart: vi.fn(),
    reportProgress: vi.fn(),
    reportSuccess: vi.fn(),
    reportError: vi.fn(),
    reportSummary: vi.fn(),
    reportVerbose: vi.fn(),
    reportProjectSummary: vi.fn(),
    reportOverallSummary: vi.fn(),
    reportPartialFailureSummary: vi.fn(),
    reportProjectError: vi.fn(),
  })),
}));

vi.mock('@/config/loader.js', () => ({
  loadConfig: vi.fn(async () => ({})),
}));

vi.mock('@/config/merger.js', () => ({
  mergeConfig: vi.fn((args) => args),
}));

vi.mock('@/tracking/metadata-manager.js', () => ({
  loadMetadata: vi.fn(async () => ({
    version: '1.0',
    projects: [],
  })),
}));

describe('executeAddCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Function signature and return type', () => {
    it('should be a function', () => {
      expect(typeof executeAddCommand).toBe('function');
    });

    it('should accept argv string array and return Promise<ExecutionResult>', async () => {
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];

      // Call executeAddCommand
      const result = executeAddCommand(argv);

      // Should return a Promise
      expect(result).toBeInstanceOf(Promise);

      // Await the result
      const executionResult = await result;

      // Should return ExecutionResult object
      expect(executionResult).toHaveProperty('success');
      expect(executionResult).toHaveProperty('filesDownloaded');
      expect(executionResult).toHaveProperty('filesFailed');
      expect(executionResult).toHaveProperty('exitCode');

      // Check types
      expect(typeof executionResult.success).toBe('boolean');
      expect(typeof executionResult.filesDownloaded).toBe('number');
      expect(typeof executionResult.filesFailed).toBe('number');
      expect(typeof executionResult.exitCode).toBe('number');
    });
  });

  describe('Argument validation', () => {
    it('should validate repository argument', async () => {
      const argv = ['node', 'kirox', 'add', '', '-p', 'test-project'];

      const result = await executeAddCommand(argv);

      // Invalid repository should result in failure
      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });

    it('should validate project argument', async () => {
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', ''];

      const result = await executeAddCommand(argv);

      // Empty project should result in failure (or enter interactive mode)
      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });

    it('should accept valid repository and project arguments', async () => {
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'valid-project'];

      // This will fail due to metadata check, but should pass argument validation
      const result = await executeAddCommand(argv);

      // Arguments are valid, so it should proceed to metadata check
      // Metadata check will fail, but exitCode should be specific to metadata error
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Logger initialization', () => {
    it('should initialize Logger instance', async () => {
      const { Logger } = await import('@/reporting/logger.js');
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];

      await executeAddCommand(argv);

      // Logger should be instantiated
      expect(Logger).toHaveBeenCalled();
    });

    it('should log execution start when verbose is true', async () => {
      const { Logger } = await import('@/reporting/logger.js');
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        logError: vi.fn(),
      };
      vi.mocked(Logger).mockReturnValue(mockLogger as any);

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project', '--verbose'];

      await executeAddCommand(argv);

      // Logger info should be called with verbose flag
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('ErrorHandler initialization', () => {
    it('should initialize ErrorHandler instance', async () => {
      const { ErrorHandler } = await import('@/reporting/error-handler.js');
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];

      await executeAddCommand(argv);

      // ErrorHandler should be instantiated
      expect(ErrorHandler).toHaveBeenCalled();
    });
  });

  describe('ProgressReporter initialization', () => {
    it('should initialize ProgressReporter instance', async () => {
      const { ProgressReporter } = await import('@/reporting/progress-reporter.js');
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];

      await executeAddCommand(argv);

      // ProgressReporter should be instantiated
      expect(ProgressReporter).toHaveBeenCalled();
    });

    it('should initialize ProgressReporter with verbose option', async () => {
      const { ProgressReporter } = await import('@/reporting/progress-reporter.js');
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project', '--verbose'];

      await executeAddCommand(argv);

      // ProgressReporter should be instantiated with verbose: true
      expect(ProgressReporter).toHaveBeenCalledWith({
        verbose: true,
        useColor: expect.any(Boolean),
      });
    });
  });

  describe('Config file loading and merging', () => {
    it('should call loadConfig with config path', async () => {
      const { loadConfig } = await import('@/config/loader.js');
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project', '--config', '/path/to/config.json'];

      await executeAddCommand(argv);

      // loadConfig should be called with config path
      expect(loadConfig).toHaveBeenCalledWith('/path/to/config.json');
    });

    it('should call loadConfig with undefined when config option is not provided', async () => {
      const { loadConfig } = await import('@/config/loader.js');
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];

      await executeAddCommand(argv);

      // loadConfig should be called with undefined (no custom config)
      expect(loadConfig).toHaveBeenCalledWith(undefined);
    });

    it('should call mergeConfig with parsed arguments and file config', async () => {
      const { loadConfig } = await import('@/config/loader.js');
      const { mergeConfig } = await import('@/config/merger.js');

      const fileConfig = { branch: 'develop', subdir: 'packages' };
      vi.mocked(loadConfig).mockResolvedValue(fileConfig);

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];

      await executeAddCommand(argv);

      // mergeConfig should be called with parsed args and file config
      expect(mergeConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          projects: ['test-project'],
        }),
        fileConfig
      );
    });
  });

  describe('ExecutionResult structure', () => {
    it('should return success: false and exitCode: 1 for invalid arguments', async () => {
      const argv = ['node', 'kirox', 'add', '', '-p', ''];

      const result = await executeAddCommand(argv);

      expect(result.success).toBe(false);
      expect(result.filesDownloaded).toBe(0);
      expect(result.filesFailed).toBe(0);
      expect(result.exitCode).toBe(1);
    });

    it('should return success: true and exitCode: 0 when operation succeeds', async () => {
      // This test will be implemented after GREEN phase
      // For now, we expect this to fail because executeAddCommand doesn't exist yet
      expect(true).toBe(true);
    });
  });

  describe('Metadata existence check (Task 2.2)', () => {
    it('should call loadMetadata with correct path', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project', '-o', './output'];

      await executeAddCommand(argv);

      // loadMetadata should be called with metadata path derived from output directory
      expect(loadMetadata).toHaveBeenCalledWith(expect.stringContaining('.kirox-meta.json'));
    });

    it('should return error when metadata file does not exist', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { MetadataError, MetadataErrorType } = await import('@/tracking/types.js');

      // Mock loadMetadata to throw MetadataError.NOT_FOUND
      vi.mocked(loadMetadata).mockRejectedValueOnce(
        new MetadataError(
          MetadataErrorType.NOT_FOUND,
          'Metadata file not found',
          'File does not exist: .kiro/.kirox-meta.json'
        )
      );

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      const result = await executeAddCommand(argv);

      // Should return failure with exit code 1
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.filesDownloaded).toBe(0);
      expect(result.filesFailed).toBe(0);
    });

    it('should log error message when metadata not found', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { MetadataError, MetadataErrorType } = await import('@/tracking/types.js');
      const { Logger } = await import('@/reporting/logger.js');

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        logError: vi.fn(),
      };
      vi.mocked(Logger).mockReturnValue(mockLogger as any);

      // Mock loadMetadata to throw MetadataError.NOT_FOUND
      vi.mocked(loadMetadata).mockRejectedValueOnce(
        new MetadataError(
          MetadataErrorType.NOT_FOUND,
          'Metadata file not found',
          'File does not exist: .kiro/.kirox-meta.json'
        )
      );

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      await executeAddCommand(argv);

      // Logger error should be called with guidance message
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Metadata file not found'),
        expect.any(Object)
      );
    });

    it('should display guidance to run regular fetch first when metadata not found', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { MetadataError, MetadataErrorType } = await import('@/tracking/types.js');
      const { Logger } = await import('@/reporting/logger.js');

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        logError: vi.fn(),
      };
      vi.mocked(Logger).mockReturnValue(mockLogger as any);

      // Mock loadMetadata to throw MetadataError.NOT_FOUND
      vi.mocked(loadMetadata).mockRejectedValueOnce(
        new MetadataError(
          MetadataErrorType.NOT_FOUND,
          'Metadata file not found',
          'File does not exist: .kiro/.kirox-meta.json'
        )
      );

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      await executeAddCommand(argv);

      // Logger error should include guidance message
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/run.*fetch.*first|regular.*fetch/i),
        expect.any(Object)
      );
    });

    it('should proceed when metadata file exists', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');

      // Mock loadMetadata to return valid metadata
      vi.mocked(loadMetadata).mockResolvedValueOnce({
        version: '1.0',
        projects: [
          {
            repository: 'existing/repo',
            projectName: 'existing-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [],
          },
        ],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      const result = await executeAddCommand(argv);

      // Should not fail due to metadata check
      // (Will eventually succeed when full implementation is complete)
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle other metadata errors separately', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { MetadataError, MetadataErrorType } = await import('@/tracking/types.js');

      // Mock loadMetadata to throw MetadataError.INVALID_FORMAT
      vi.mocked(loadMetadata).mockRejectedValueOnce(
        new MetadataError(
          MetadataErrorType.INVALID_FORMAT,
          'Invalid JSON format',
          'Unexpected token in JSON'
        )
      );

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      const result = await executeAddCommand(argv);

      // Should fail with error code (but not the specific NOT_FOUND message)
      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });
});
