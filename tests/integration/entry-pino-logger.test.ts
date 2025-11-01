/**
 * Integration tests for PinoLogger in entry.ts
 *
 * TDD: RED phase - Tests written before PinoLogger integration
 * Task 5.1: entry.tsの統合テストケースを作成
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execute } from '@/cli/entry.js.js';

// Unmock PinoLogger to allow actual implementation
vi.unmock('@/reporting/pino-logger.js');

// Mock external dependencies
vi.mock('octokit');
vi.mock('@/github/fetcher.js.js');
vi.mock('@/github/parallel-fetcher.js');
vi.mock('@/filesystem/writer.js');
vi.mock('@/tracking/metadata-manager.js');
vi.mock('@/config/loader.js');

// Mock Pino module with log level filtering
let currentLogLevel: string = 'info';

// Create separate spies for tracking calls
const infoSpy = vi.fn();
const warnSpy = vi.fn();
const errorSpy = vi.fn();
const debugSpy = vi.fn();

const mockPinoInstance = {
  info: infoSpy,
  warn: warnSpy,
  error: errorSpy,
  debug: (details: any, message: string) => {
    // Only record the call if log level is 'debug' (mimic Pino's behavior)
    if (currentLogLevel === 'debug') {
      debugSpy(details, message);
    }
  },
};

vi.mock('pino', () => {
  return {
    default: vi.fn((options: { level: string }) => {
      currentLogLevel = options.level;
      return mockPinoInstance;
    }),
  };
});

describe('entry.ts - PinoLogger Integration (Task 5.1)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock environment
    process.env.GITHUB_TOKEN = 'test-token';

    // Setup basic mocks
    const { Octokit } = await import('octokit');
    vi.mocked(Octokit).mockImplementation(() => ({
      rest: {
        repos: {
          getContent: vi.fn(),
        },
      },
    }) as any);

    const fetcherModule = await import('@/github/fetcher.js.js');
    vi.mocked(fetcherModule.parseRepositoryPath).mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo',
      branch: undefined,
    });
    vi.mocked(fetcherModule.fetchDirectoryContents).mockResolvedValue([]);

    const parallelFetcherModule = await import('@/github/parallel-fetcher.js');
    vi.mocked(parallelFetcherModule.fetchFilesInParallel).mockResolvedValue({
      success: [],
      failed: [],
    });

    const configLoaderModule = await import('@/config/loader.js');
    vi.mocked(configLoaderModule.loadConfig).mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  it('should initialize PinoLogger with verbose=false when verbose flag is not specified', async () => {
    // Arrange: Execute with minimal args (verbose=false by default)
    const argv = ['node', 'kirox', 'owner/repo', '-p', 'project'];

    // Act: Execute command
    await execute(argv);

    // Assert: Pino should be called with level='info' (verbose=false)
    const pino = (await import('pino')).default;
    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info', // verbose=false → info level
      })
    );
  });

  it('should initialize PinoLogger with verbose=true when --verbose flag is specified', async () => {
    // Arrange: Execute with --verbose flag
    const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--verbose'];

    // Act: Execute command
    await execute(argv);

    // Assert: Pino should be called with level='debug' (verbose=true)
    const pino = (await import('pino')).default;
    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'debug', // verbose=true → debug level
      })
    );
  });

  it('should call logger methods with correct arguments', async () => {
    // Arrange
    const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--verbose'];

    // Act
    await execute(argv);

    // Assert: Logger methods should be called (PinoLogger wraps Pino methods)
    // With --verbose flag, debug() should be called for execution details
    expect(debugSpy).toHaveBeenCalled();
  });
});

describe('entry.ts - Conditional Branch Removal (Task 8.1)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock environment
    process.env.GITHUB_TOKEN = 'test-token';

    // Setup basic mocks
    const { Octokit } = await import('octokit');
    vi.mocked(Octokit).mockImplementation(() => ({
      rest: {
        repos: {
          getContent: vi.fn(),
        },
      },
    }) as any);

    const fetcherModule = await import('@/github/fetcher.js.js');
    vi.mocked(fetcherModule.parseRepositoryPath).mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo',
      branch: undefined,
    });
    vi.mocked(fetcherModule.fetchDirectoryContents).mockResolvedValue([]);

    const parallelFetcherModule = await import('@/github/parallel-fetcher.js');
    vi.mocked(parallelFetcherModule.fetchFilesInParallel).mockResolvedValue({
      success: [],
      failed: [],
    });

    const configLoaderModule = await import('@/config/loader.js');
    vi.mocked(configLoaderModule.loadConfig).mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  it('should suppress debug logs when verbose=false (Task 8.1)', async () => {
    // Arrange: Execute without --verbose flag
    const argv = ['node', 'kirox', 'owner/repo', '-p', 'project'];

    // Act: Execute command
    await execute(argv);

    // Assert: debug() should NOT be called when verbose=false
    // After conditional branch removal, logger.debug() calls should be suppressed by Pino level control
    // This test verifies that debug logs are controlled by log level, not by if (args.verbose)
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('should output debug logs when verbose=true (Task 8.1)', async () => {
    // Arrange: Execute with --verbose flag
    const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--verbose'];

    // Act: Execute command
    await execute(argv);

    // Assert: debug() should be called when verbose=true
    // After conditional branch removal, debug logs are output via logger.debug()
    // Pino's level control ensures debug logs are only output when level='debug'
    expect(debugSpy).toHaveBeenCalled();
  });
});
