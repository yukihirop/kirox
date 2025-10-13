/**
 * Add Command Metadata Existence Check Tests (Task 11.3)
 *
 * Verify that add command properly handles metadata file existence:
 * - Detects when metadata file does not exist (Task 2.4)
 * - Creates empty metadata object instead of failing
 * - Logs info message about creating new metadata
 * - Sets isNewMetadata flag to skip duplicate checks
 * - Successfully continues add command execution
 *
 * Requirements: 2.2, 2.4
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { executeAddCommand } from '@/cli/add-command-entry.js';
import * as metadataManager from '@/tracking/metadata-manager.js';
import * as fetcher from '@/github/fetcher.js';
import * as parallelFetcher from '@/github/parallel-fetcher.js';
import { MetadataError, MetadataErrorType } from '@/tracking/types.js';

// Mock required modules
vi.mock('@/cli/validator.js', () => ({
  validateInput: vi.fn(() => ({
    valid: true,
    errors: [],
  })),
}));

vi.mock('@/cli/interactive-prompt.js', () => ({
  shouldEnterInteractiveMode: vi.fn(() => false),
  promptMissingArguments: vi.fn(async (args) => args),
}));

vi.mock('@/config/loader.js', () => ({
  loadConfig: vi.fn(async () => ({})),
}));

vi.mock('@/config/merger.js', () => ({
  mergeConfig: vi.fn((args) => args),
}));

vi.mock('@/filesystem/writer.js', () => ({
  writeFile: vi.fn(async () => ({
    written: true,
    skipped: false,
    filePath: 'test-file.md',
    size: 100,
  })),
}));

vi.mock('@/tracking/hash-calculator.js', () => ({
  calculateFileHash: vi.fn(async () => 'default-hash'),
}));

vi.mock('@/filesystem/path-utils.js', () => ({
  buildRemotePath: vi.fn((subdir: string, projectName: string, type: string) => {
    return subdir ? `${subdir}/.kiro/${type}/${projectName}` : `.kiro/${type}/${projectName}`;
  }),
  resolveOutputPath: vi.fn((output: string, filePath: string) => `${output}/${filePath}`),
}));

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

vi.mock('@/tracking/metadata-manager.js', () => ({
  loadMetadata: vi.fn(async () => ({
    version: '1.0',
    projects: [],
  })),
  upsertProject: vi.fn(async () => {}),
  upsertFile: vi.fn(async () => {}),
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

vi.mock('octokit', () => ({
  Octokit: vi.fn(() => ({
    rest: {
      repos: {
        getContent: vi.fn(),
      },
    },
  })),
}));

describe('Add Command Metadata Existence Check (Task 11.3)', () => {
  beforeEach(async () => {
    // Clear all mock call history between tests
    vi.clearAllMocks();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset mocks to their default behavior
    const { loadMetadata, upsertProject } = await import('@/tracking/metadata-manager.js');
    const { fetchDirectoryContents } = await import('@/github/fetcher.js');
    const { fetchFilesInParallel } = await import('@/github/parallel-fetcher.js');

    // Set default behaviors for mocks
    vi.mocked(loadMetadata).mockResolvedValue({
      version: '1.0',
      projects: [],
    });

    vi.mocked(upsertProject).mockResolvedValue();

    vi.mocked(fetchDirectoryContents).mockResolvedValue([
      {
        name: 'requirements.md',
        path: '.kiro/specs/test-project/requirements.md',
        type: 'file',
        sha: 'sha1',
        size: 100,
      },
    ]);

    vi.mocked(fetchFilesInParallel).mockResolvedValue({
      success: [
        {
          path: '.kiro/specs/test-project/requirements.md',
          content: 'test content',
          sha: 'sha1',
          size: 100,
        },
      ],
      failed: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 2.2: Metadata existence check', () => {
    it('should detect when metadata file does not exist', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');

      // Mock loadMetadata to throw NOT_FOUND error
      const notFoundError = new MetadataError(
        'Metadata file not found',
        MetadataErrorType.NOT_FOUND,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.mocked(loadMetadata).mockRejectedValue(notFoundError);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Verify loadMetadata was called (existence check performed)
      expect(loadMetadata).toHaveBeenCalled();

      // Verify command succeeded despite missing metadata
      expect(result.success).toBe(true);
    });

    it('should succeed when metadata file exists', async () => {
      const { loadMetadata } = await import('@/tracking/metadata-manager.js');

      // Mock loadMetadata to return existing metadata
      vi.mocked(loadMetadata).mockResolvedValue({
        version: '1.0',
        projects: [],
      });

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Verify loadMetadata was called
      expect(loadMetadata).toHaveBeenCalled();

      // Verify command succeeded
      expect(result.success).toBe(true);
    });
  });

  describe('Requirement 2.4: Create empty metadata when not found', () => {
    it('should create empty metadata object when file does not exist', async () => {
      // Mock loadMetadata to throw NOT_FOUND error
      const notFoundError = new MetadataError(
        'Metadata file not found',
        MetadataErrorType.NOT_FOUND,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(notFoundError);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Verify command succeeded (empty metadata was created internally)
      expect(result.success).toBe(true);

      // Verify upsertProject was called (metadata was saved)
      expect(metadataManager.upsertProject).toHaveBeenCalled();
    });

    it('should log info message about creating new metadata file', async () => {
      // Mock loadMetadata to throw NOT_FOUND error
      const notFoundError = new MetadataError(
        'Metadata file not found',
        MetadataErrorType.NOT_FOUND,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(notFoundError);

      await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project']);

      // Verify info message was logged (using console.log, not console.error)
      const logCalls = (console.log as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasInfoMessage = logCalls.some(
        (msg: string) =>
          msg.includes('Creating new metadata file') ||
          msg.includes('New metadata file will be created')
      );
      expect(hasInfoMessage).toBe(true);
    });

    it('should include metadata path in info message', async () => {
      // Mock loadMetadata to throw NOT_FOUND error
      const notFoundError = new MetadataError(
        'Metadata file not found',
        MetadataErrorType.NOT_FOUND,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(notFoundError);

      await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project']);

      // Verify metadata path is mentioned in log message
      const logCalls = (console.log as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasPathInfo = logCalls.some((msg: string) => msg.includes('.kirox-meta.json'));
      expect(hasPathInfo).toBe(true);
    });

    it('should log verbose message when --verbose is specified', async () => {
      // Mock loadMetadata to throw NOT_FOUND error
      const notFoundError = new MetadataError(
        'Metadata file not found',
        MetadataErrorType.NOT_FOUND,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(notFoundError);

      await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '--verbose',
      ]);

      // Verify verbose message about empty metadata
      const logCalls = (console.log as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasVerboseMessage = logCalls.some(
        (msg: string) =>
          msg.includes('starting with empty metadata') ||
          msg.includes('Metadata file does not exist')
      );
      expect(hasVerboseMessage).toBe(true);
    });
  });

  describe('Requirement 2.4: Skip duplicate check for new metadata', () => {
    it('should skip duplicate check when metadata is new', async () => {
      // Mock loadMetadata to throw NOT_FOUND error (new metadata scenario)
      const notFoundError = new MetadataError(
        'Metadata file not found',
        MetadataErrorType.NOT_FOUND,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(notFoundError);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Verify command succeeded without duplicate warnings
      expect(result.success).toBe(true);

      // Verify no duplicate warning was logged
      const logCalls = (console.log as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasDuplicateWarning = logCalls.some(
        (msg: string) => msg.includes('already exists') || msg.includes('--force')
      );
      expect(hasDuplicateWarning).toBe(false);
    });

    it('should log verbose message about skipping duplicate check', async () => {
      // Mock loadMetadata to throw NOT_FOUND error
      const notFoundError = new MetadataError(
        'Metadata file not found',
        MetadataErrorType.NOT_FOUND,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(notFoundError);

      await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '--verbose',
      ]);

      // Verify verbose message about skipping duplicate check
      const logCalls = (console.log as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasSkipMessage = logCalls.some(
        (msg: string) =>
          msg.includes('Skipping duplicate check') || msg.includes('No existing projects')
      );
      expect(hasSkipMessage).toBe(true);
    });

    it('should perform duplicate check when metadata exists', async () => {
      // Mock loadMetadata to return existing metadata with a project
      vi.spyOn(metadataManager, 'loadMetadata').mockResolvedValue({
        version: '1.0',
        projects: [
          {
            projectName: 'test-project',
            repository: 'owner/repo',
            fetchedAt: '2025-01-01T00:00:00Z',
            files: [],
          },
        ],
      });

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Verify command failed due to duplicate (duplicate check was performed)
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);

      // Verify duplicate warning was logged
      const logCalls = (console.log as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasDuplicateWarning = logCalls.some(
        (msg: string) => msg.includes('already exists') || msg.includes('--force')
      );
      expect(hasDuplicateWarning).toBe(true);
    });
  });

  describe('Requirement 2.4: Continue execution after creating empty metadata', () => {
    it('should fetch files from GitHub after creating empty metadata', async () => {
      // Mock loadMetadata to throw NOT_FOUND error
      const notFoundError = new MetadataError(
        'Metadata file not found',
        MetadataErrorType.NOT_FOUND,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(notFoundError);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Verify GitHub API was called (execution continued)
      expect(fetcher.fetchDirectoryContents).toHaveBeenCalled();
      expect(parallelFetcher.fetchFilesInParallel).toHaveBeenCalled();

      // Verify command succeeded
      expect(result.success).toBe(true);
    });

    it('should save project metadata after successful file fetch', async () => {
      // Mock loadMetadata to throw NOT_FOUND error
      const notFoundError = new MetadataError(
        'Metadata file not found',
        MetadataErrorType.NOT_FOUND,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(notFoundError);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Verify upsertProject was called (metadata was saved)
      expect(metadataManager.upsertProject).toHaveBeenCalled();

      // Verify saved metadata includes project name
      const upsertCall = (metadataManager.upsertProject as any).mock.calls[0];
      const savedProject = upsertCall[0];
      expect(savedProject.projectName).toBe('test-project');
      expect(savedProject.repository).toBe('owner/repo');

      // Verify command succeeded
      expect(result.success).toBe(true);
    });

    it('should report successful project addition', async () => {
      // Mock loadMetadata to throw NOT_FOUND error
      const notFoundError = new MetadataError(
        'Metadata file not found',
        MetadataErrorType.NOT_FOUND,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(notFoundError);

      await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'test-project']);

      // Verify success message was logged
      const logCalls = (console.log as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasSuccessMessage = logCalls.some(
        (msg: string) => msg.includes('successfully added') || msg.includes('test-project')
      );
      expect(hasSuccessMessage).toBe(true);
    });
  });

  describe('Requirement 2.2: Error handling for other metadata errors', () => {
    it('should fail when metadata has invalid format', async () => {
      // Mock loadMetadata to throw INVALID_FORMAT error
      const invalidFormatError = new MetadataError(
        'Invalid metadata format',
        MetadataErrorType.INVALID_FORMAT,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(invalidFormatError);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Verify command failed (other errors are not handled like NOT_FOUND)
      expect(result.success).toBe(false);

      // Verify error was logged
      const errorCalls = (console.error as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasError = errorCalls.some(
        (msg: string) => msg.includes('error') || msg.includes('Error')
      );
      expect(hasError).toBe(true);
    });

    it('should fail when metadata has invalid schema', async () => {
      // Mock loadMetadata to throw INVALID_SCHEMA error
      const invalidSchemaError = new MetadataError(
        'Invalid metadata schema',
        MetadataErrorType.INVALID_SCHEMA,
        { path: '.kiro/.kirox-meta.json' }
      );
      vi.spyOn(metadataManager, 'loadMetadata').mockRejectedValue(invalidSchemaError);

      const result = await executeAddCommand([
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
      ]);

      // Verify command failed
      expect(result.success).toBe(false);

      // Verify error was logged
      const errorCalls = (console.error as any).mock.calls.map((call: any[]) => call.join(' '));
      const hasError = errorCalls.some(
        (msg: string) => msg.includes('error') || msg.includes('Error')
      );
      expect(hasError).toBe(true);
    });
  });
});
