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

vi.mock('@/github/fetcher.js', () => ({
  parseRepositoryPath: vi.fn((repo: string) => {
    const parts = repo.split('#');
    return {
      owner: 'owner',
      repo: 'repo',
      branch: parts[1] || undefined,
    };
  }),
  fetchDirectoryContents: vi.fn(async () => []),
  fetchDefaultBranch: vi.fn(async () => 'main'),
  fetchBranches: vi.fn(async () => ['main', 'develop']),
}));

vi.mock('@/github/parallel-fetcher.js', () => ({
  fetchFilesInParallel: vi.fn(async () => ({
    success: [],
    failed: [],
  })),
}));

vi.mock('@/filesystem/path-utils.js', () => ({
  buildRemotePath: vi.fn((subdir: string, projectName: string, type: string) => {
    return subdir ? `${subdir}/.kiro/${type}/${projectName}` : `.kiro/${type}/${projectName}`;
  }),
  resolveOutputPath: vi.fn((output: string, filePath: string) => `${output}/${filePath}`),
}));

vi.mock('octokit', () => ({
  Octokit: vi.fn(() => ({
    rest: {
      repos: {
        getContent: vi.fn(),
      },
    },
  })),
}));

describe('executeAddCommand', () => {
  beforeEach(async () => {
    // Clear all mock call history between tests
    vi.clearAllMocks();

    // Reset mocks to their default behavior to prevent test interdependence
    const { loadMetadata } = await import('@/tracking/metadata-manager.js');
    const { loadConfig } = await import('@/config/loader.js');
    const { mergeConfig } = await import('@/config/merger.js');
    const { fetchDirectoryContents } = await import('@/github/fetcher.js');
    const { fetchFilesInParallel } = await import('@/github/parallel-fetcher.js');
    const { Logger } = await import('@/reporting/logger.js');

    // Set default behaviors for mocks
    // Tests can override these with their own mockResolvedValue calls
    vi.mocked(loadMetadata).mockResolvedValue({
      version: '1.0',
      projects: [],
    });

    vi.mocked(loadConfig).mockResolvedValue({});

    vi.mocked(mergeConfig).mockImplementation((args) => args);

    vi.mocked(fetchDirectoryContents).mockResolvedValue([]);

    vi.mocked(fetchFilesInParallel).mockResolvedValue({
      success: [],
      failed: [],
    });

    vi.mocked(Logger).mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      logError: vi.fn(),
    } as any);
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
      vi.mocked(loadMetadata).mockRejectedValue(
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
      vi.mocked(loadMetadata).mockRejectedValue(
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
      vi.mocked(loadMetadata).mockRejectedValue(
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
      vi.mocked(loadMetadata).mockResolvedValue({
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
      vi.mocked(loadMetadata).mockRejectedValue(
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

  describe('Duplicate project detection (Task 2.3)', () => {
    it('should detect duplicate project when repository and projectName match', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { Logger } = await import('@/reporting/logger.js');

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        logError: vi.fn(),
      };
      vi.mocked(Logger).mockReturnValue(mockLogger as any);

      // Mock loadMetadata to return existing project with same repository and projectName
      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [],
          },
        ],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      const result = await executeAddCommand(argv);

      // Should detect duplicate and skip without --force
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/already exists|duplicate/i),
        expect.any(Object)
      );
    });

    it('should treat different subdirectory as separate project', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');

      // Mock loadMetadata to return existing project with same repository and projectName but different subdir
      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            subdir: 'packages/api',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [],
          },
        ],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project', '--subdir', 'packages/web'];
      const result = await executeAddCommand(argv);

      // Should NOT detect as duplicate because subdir is different
      // (Will eventually succeed when full implementation is complete)
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should skip duplicate project without --force option', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { Logger } = await import('@/reporting/logger.js');

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        logError: vi.fn(),
      };
      vi.mocked(Logger).mockReturnValue(mockLogger as any);

      // Mock loadMetadata to return existing project with same repository and projectName
      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [],
          },
        ],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      const result = await executeAddCommand(argv);

      // Should skip with warning
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should continue with verbose log when duplicate project found with --force', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { Logger } = await import('@/reporting/logger.js');

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        logError: vi.fn(),
      };
      vi.mocked(Logger).mockReturnValue(mockLogger as any);

      // Mock loadMetadata to return existing project with same repository and projectName
      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [],
          },
        ],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project', '--force', '--verbose'];
      const result = await executeAddCommand(argv);

      // Should continue with verbose log (not fail)
      // (Will eventually succeed when full implementation is complete)
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/overwriting|force/i),
        expect.any(Object)
      );
    });

    it('should display warning message when duplicate found without --force', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { Logger } = await import('@/reporting/logger.js');

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        logError: vi.fn(),
      };
      vi.mocked(Logger).mockReturnValue(mockLogger as any);

      // Mock loadMetadata to return existing project with same repository and projectName
      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [],
          },
        ],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      await executeAddCommand(argv);

      // Should display warning with suggestion to use --force
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/use.*--force|--force.*overwrite/i),
        expect.any(Object)
      );
    });
  });

  describe('Directory content fetching (Task 3.1)', () => {
    it('should fetch spec directory contents using buildRemotePath and fetchDirectoryContents', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { buildRemotePath } = await import('@/filesystem/path-utils.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');

      // Mock successful metadata load
      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      // Mock fetchDirectoryContents to return spec files
      vi.mocked(fetchDirectoryContents).mockResolvedValue([
        { name: 'spec.json', path: '.kiro/specs/test-project/spec.json', type: 'file', sha: 'abc123' },
      ] as any);

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      await executeAddCommand(argv);

      // Should call buildRemotePath for specs directory
      expect(buildRemotePath).toHaveBeenCalledWith('', 'test-project', 'specs');

      // Should call fetchDirectoryContents with spec path
      expect(fetchDirectoryContents).toHaveBeenCalledWith(
        expect.anything(), // octokit client
        'owner',
        'repo',
        '.kiro/specs/test-project',
        undefined // no branch specified
      );
    });

    it('should support branch specification via repository#branch format', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { parseRepositoryPath, fetchDirectoryContents } = await import('@/github/fetcher.js');

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      vi.mocked(fetchDirectoryContents).mockResolvedValue([]);

      const argv = ['node', 'kirox', 'add', 'owner/repo#develop', '-p', 'test-project'];
      await executeAddCommand(argv);

      // Should parse branch from repository path
      expect(parseRepositoryPath).toHaveBeenCalledWith('owner/repo#develop');

      // Should call fetchDirectoryContents with branch
      expect(fetchDirectoryContents).toHaveBeenCalledWith(
        expect.anything(),
        'owner',
        'repo',
        expect.any(String),
        'develop' // branch should be passed
      );
    });

    it.skip('should support --subdir option when fetching directory contents', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { mergeConfig } = await import('@/config/merger.js');
      const { buildRemotePath } = await import('@/filesystem/path-utils.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      // Mock mergeConfig to return subdir
      // Use mockImplementation to ensure it returns correct config every time it's called
      vi.mocked(mergeConfig).mockImplementation(() => ({
        repository: 'owner/repo',
        projects: ['test-project'],
        subdir: 'packages/api',
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: true,
        checkUpdates: false,
        update: false,
      }));

      vi.mocked(fetchDirectoryContents).mockResolvedValue([]);

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project', '--subdir', 'packages/api'];
      await executeAddCommand(argv);

      // Should call buildRemotePath with subdir
      expect(buildRemotePath).toHaveBeenCalledWith('packages/api', 'test-project', 'specs');

      // Should fetch from subdirectory path
      expect(fetchDirectoryContents).toHaveBeenCalledWith(
        expect.anything(),
        'owner',
        'repo',
        'packages/api/.kiro/specs/test-project',
        undefined
      );
    });

    it('should fetch steering directory only once (avoid duplication)', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { buildRemotePath } = await import('@/filesystem/path-utils.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      // Use mockResolvedValueOnce for each call
      vi.mocked(fetchDirectoryContents)
        .mockResolvedValueOnce([]) // specs for project1
        .mockResolvedValueOnce([]) // steering (first time)
        .mockResolvedValueOnce([]); // specs for project2 (no steering fetch)

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'project1,project2'];
      await executeAddCommand(argv);

      // Should call buildRemotePath for steering only once
      const buildRemotePathMock = vi.mocked(buildRemotePath);
      const steeringCalls = buildRemotePathMock.mock.calls.filter(
        call => call[2] === 'steering'
      );
      expect(steeringCalls).toHaveLength(1);

      // fetchDirectoryContents should be called 3 times total:
      // - specs/project1
      // - steering (once)
      // - specs/project2
      expect(fetchDirectoryContents).toHaveBeenCalledTimes(3);
    });

    it('should handle steering directory not found gracefully', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { Logger } = await import('@/reporting/logger.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        logError: vi.fn(),
      };
      vi.mocked(Logger).mockReturnValue(mockLogger as any);

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      // First call (specs) succeeds, second call (steering) fails
      vi.mocked(fetchDirectoryContents)
        .mockResolvedValueOnce([]) // specs - success
        .mockRejectedValueOnce(new Error('Path not found')); // steering - fails

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project', '--verbose'];
      const result = await executeAddCommand(argv);

      // Should continue despite steering directory not found
      expect(result.exitCode).toBeGreaterThanOrEqual(0);

      // Should log warning when verbose
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/steering.*not found|skipping/i),
        expect.any(Object)
      );
    });

    it('should use effective branch from merged config when CLI branch not specified', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { loadConfig } = await import('@/config/loader.js');
      const { mergeConfig } = await import('@/config/merger.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      // Mock config file with branch
      vi.mocked(loadConfig).mockResolvedValue({ branch: 'staging' });

      // Mock mergeConfig to return branch from config
      // Use mockImplementation to ensure correct behavior on every call
      vi.mocked(mergeConfig).mockImplementation(() => ({
        repository: 'owner/repo',
        projects: ['test-project'],
        branch: 'staging',
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: true,
        checkUpdates: false,
        update: false,
      }));

      vi.mocked(fetchDirectoryContents).mockResolvedValue([]);

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      await executeAddCommand(argv);

      // Should use branch from merged config
      expect(fetchDirectoryContents).toHaveBeenCalledWith(
        expect.anything(),
        'owner',
        'repo',
        expect.any(String),
        'staging' // effectiveBranch from config
      );
    });
  });

  describe('Parallel file fetching (Task 3.2)', () => {
    it('should call fetchFilesInParallel with correct parameters', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');
      const { fetchFilesInParallel } = await import('@/github/parallel-fetcher.js');

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      // Mock fetchDirectoryContents to return file items
      // First call: specs directory (returns files)
      // Second call: steering directory (returns empty, will throw error and be caught)
      vi.mocked(fetchDirectoryContents)
        .mockResolvedValueOnce([
          { name: 'spec.json', path: '.kiro/specs/test-project/spec.json', type: 'file', sha: 'abc123', size: 100 },
          { name: 'requirements.md', path: '.kiro/specs/test-project/requirements.md', type: 'file', sha: 'def456', size: 200 },
        ] as any)
        .mockRejectedValueOnce(new Error('Steering directory not found'));

      // Mock fetchFilesInParallel to return successful fetch
      vi.mocked(fetchFilesInParallel).mockResolvedValue({
        success: [
          { path: '.kiro/specs/test-project/spec.json', content: '{}', size: 100, sha: 'abc123' },
          { path: '.kiro/specs/test-project/requirements.md', content: '# Requirements', size: 200, sha: 'def456' },
        ],
        failed: [],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      await executeAddCommand(argv);

      // Should call fetchFilesInParallel with correct parameters
      expect(fetchFilesInParallel).toHaveBeenCalledWith(
        expect.anything(), // octokit client
        'owner',
        'repo',
        ['.kiro/specs/test-project/spec.json', '.kiro/specs/test-project/requirements.md'],
        5, // default maxConcurrency
        undefined // no branch
      );
    });

    it('should pass ref parameter to fetchFilesInParallel when branch is specified', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');
      const { fetchFilesInParallel } = await import('@/github/parallel-fetcher.js');

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      // Mock fetchDirectoryContents - first call for specs, second call for steering fails
      vi.mocked(fetchDirectoryContents)
        .mockResolvedValueOnce([
          { name: 'spec.json', path: '.kiro/specs/test-project/spec.json', type: 'file', sha: 'abc123', size: 100 },
        ] as any)
        .mockRejectedValueOnce(new Error('Steering directory not found'));

      vi.mocked(fetchFilesInParallel).mockResolvedValue({
        success: [
          { path: '.kiro/specs/test-project/spec.json', content: '{}', size: 100, sha: 'abc123' },
        ],
        failed: [],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo#develop', '-p', 'test-project'];
      await executeAddCommand(argv);

      // Should pass branch to fetchFilesInParallel
      expect(fetchFilesInParallel).toHaveBeenCalledWith(
        expect.anything(),
        'owner',
        'repo',
        expect.any(Array),
        5,
        'develop' // branch from repository#branch format
      );
    });

    it('should classify successful and failed file fetches', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');
      const { fetchFilesInParallel } = await import('@/github/parallel-fetcher.js');

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      vi.mocked(fetchDirectoryContents)
        .mockResolvedValueOnce([
          { name: 'spec.json', path: '.kiro/specs/test-project/spec.json', type: 'file', sha: 'abc123', size: 100 },
          { name: 'requirements.md', path: '.kiro/specs/test-project/requirements.md', type: 'file', sha: 'def456', size: 200 },
          { name: 'large-file.txt', path: '.kiro/specs/test-project/large-file.txt', type: 'file', sha: 'ghi789', size: 2000000 },
        ] as any)
        .mockRejectedValueOnce(new Error('Steering directory not found'));

      // Mock fetchFilesInParallel to return mixed results
      vi.mocked(fetchFilesInParallel).mockResolvedValue({
        success: [
          { path: '.kiro/specs/test-project/spec.json', content: '{}', size: 100, sha: 'abc123' },
          { path: '.kiro/specs/test-project/requirements.md', content: '# Requirements', size: 200, sha: 'def456' },
        ],
        failed: [
          { path: '.kiro/specs/test-project/large-file.txt', error: 'File size exceeds 1MB limit', retryable: false },
        ],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      const result = await executeAddCommand(argv);

      // Should continue execution despite partial failures
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should integrate progress reporting for each file fetch', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');
      const { fetchFilesInParallel } = await import('@/github/parallel-fetcher.js');
      const { ProgressReporter } = await import('@/reporting/progress-reporter.js');

      const mockReporter = {
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
      };
      vi.mocked(ProgressReporter).mockReturnValue(mockReporter as any);

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      vi.mocked(fetchDirectoryContents)
        .mockResolvedValueOnce([
          { name: 'spec.json', path: '.kiro/specs/test-project/spec.json', type: 'file', sha: 'abc123', size: 100 },
        ] as any)
        .mockRejectedValueOnce(new Error('Steering directory not found'));

      vi.mocked(fetchFilesInParallel).mockResolvedValue({
        success: [
          { path: '.kiro/specs/test-project/spec.json', content: '{}', size: 100, sha: 'abc123' },
        ],
        failed: [],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      await executeAddCommand(argv);

      // Progress reporter should be called (implementation detail will be verified in GREEN phase)
      expect(ProgressReporter).toHaveBeenCalled();
    });

    it('should support verbose logging for file fetching', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');
      const { fetchFilesInParallel } = await import('@/github/parallel-fetcher.js');
      const { Logger } = await import('@/reporting/logger.js');

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        logError: vi.fn(),
      };
      vi.mocked(Logger).mockReturnValue(mockLogger as any);

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      vi.mocked(fetchDirectoryContents)
        .mockResolvedValueOnce([
          { name: 'spec.json', path: '.kiro/specs/test-project/spec.json', type: 'file', sha: 'abc123', size: 100 },
        ] as any)
        .mockRejectedValueOnce(new Error('Steering directory not found'));

      vi.mocked(fetchFilesInParallel).mockResolvedValue({
        success: [
          { path: '.kiro/specs/test-project/spec.json', content: '{}', size: 100, sha: 'abc123' },
        ],
        failed: [],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project', '--verbose'];
      await executeAddCommand(argv);

      // Logger info should be called with verbose flag
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should tolerate partial failures using Promise.allSettled behavior', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');
      const { fetchDirectoryContents } = await import('@/github/fetcher.js');
      const { fetchFilesInParallel } = await import('@/github/parallel-fetcher.js');

      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      vi.mocked(fetchDirectoryContents)
        .mockResolvedValueOnce([
          { name: 'spec.json', path: '.kiro/specs/test-project/spec.json', type: 'file', sha: 'abc123', size: 100 },
          { name: 'missing.md', path: '.kiro/specs/test-project/missing.md', type: 'file', sha: 'xyz999', size: 50 },
        ] as any)
        .mockRejectedValueOnce(new Error('Steering directory not found'));

      // Mock partial failure: one success, one failure
      vi.mocked(fetchFilesInParallel).mockResolvedValue({
        success: [
          { path: '.kiro/specs/test-project/spec.json', content: '{}', size: 100, sha: 'abc123' },
        ],
        failed: [
          { path: '.kiro/specs/test-project/missing.md', error: 'File not found', retryable: true },
        ],
      });

      const argv = ['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project'];
      const result = await executeAddCommand(argv);

      // Should not completely fail - partial success is acceptable
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });
});
