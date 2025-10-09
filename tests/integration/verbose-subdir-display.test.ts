/**
 * Integration tests for verbose mode subdirectory display
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '@/cli/entry';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';

// Mock Octokit
vi.mock('octokit');

describe('Verbose Mode Subdirectory Display Integration', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'integration', 'verbose-subdir-test-output');

  beforeEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, ignore
    }
    await fs.mkdir(testOutputDir, { recursive: true });
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
    } catch {
      // Ignore cleanup errors
    }

    vi.clearAllMocks();
  });

  describe('verbose mode with subdirectory', () => {
    it('should display subdirectory path in verbose logs', async () => {
      // Spy on console.log to capture verbose output
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock Octokit responses
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock packages/api/.kiro/specs/test-project directory listing
                data: [
                  {
                    name: 'spec.json',
                    path: 'packages/api/.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock packages/api/.kiro/steering directory listing
                data: [],
              })
              .mockResolvedValueOnce({
                // Mock spec.json file content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"test": "data"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: 'packages/api/.kiro/specs/test-project/spec.json',
                  sha: 'abc123',
                },
              }),
          },
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 5000,
                  limit: 5000,
                  reset: Date.now() / 1000 + 3600,
                },
              },
            }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      // Execute with CLI subdir option and verbose mode
      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p', 'test-project',
        '--subdir', 'packages/api',
        '--output', testOutputDir,
        '--force',
        '--verbose',
      ];

      await execute(argv);

      // Check that verbose log includes subdirectory path
      const allLogs = consoleLogSpy.mock.calls.map((call) => call.join(' '));
      const hasSubdirLog = allLogs.some((log) =>
        log.includes('packages/api') || log.includes('Using subdirectory')
      );

      expect(hasSubdirLog).toBe(true);

      consoleLogSpy.mockRestore();
    });

    it('should not display subdirectory info when not using verbose mode', async () => {
      // Spy on console.log to capture output
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock Octokit responses
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: 'packages/api/.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({
                data: [],
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"test": "data"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: 'packages/api/.kiro/specs/test-project/spec.json',
                  sha: 'abc123',
                },
              }),
          },
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 5000,
                  limit: 5000,
                  reset: Date.now() / 1000 + 3600,
                },
              },
            }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      // Execute without verbose mode
      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p', 'test-project',
        '--subdir', 'packages/api',
        '--output', testOutputDir,
        '--force',
      ];

      await execute(argv);

      // Check that no verbose-specific subdirectory logs are present
      // (only the summary "Fetched from" should be present)
      const allLogs = consoleLogSpy.mock.calls.map((call) => call.join(' '));
      const hasVerboseSubdirLog = allLogs.some((log) =>
        log.includes('Using subdirectory')
      );

      expect(hasVerboseSubdirLog).toBe(false);

      consoleLogSpy.mockRestore();
    });
  });
});
