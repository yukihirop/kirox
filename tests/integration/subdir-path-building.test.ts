/**
 * Integration tests for subdirectory path building with buildRemotePath
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '@/cli/entry.js';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';

// Mock Octokit
vi.mock('octokit');

describe('Subdirectory Path Building Integration', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'integration', 'subdir-test-output');

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

  describe('buildRemotePath usage with subdir', () => {
    it('should use buildRemotePath with CLI subdir option', async () => {
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

      // Execute with CLI subdir option
      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p', 'test-project',
        '--subdir', 'packages/api',
        '--output', testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify the first getContent call used the correct subdir path
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'packages/api/.kiro/specs/test-project',
        })
      );

      // Verify the second getContent call used the correct subdir path for steering
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'packages/api/.kiro/steering',
        })
      );
    });

    it('should use buildRemotePath with empty subdir (root)', async () => {
      // Mock Octokit responses
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock .kiro/specs/test-project directory listing (root)
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock .kiro/steering directory listing
                data: [],
              })
              .mockResolvedValueOnce({
                // Mock spec.json file content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"test": "data"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/test-project/spec.json',
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

      // Execute without subdir option (should default to root)
      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p', 'test-project',
        '--output', testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify the first getContent call used root path
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '.kiro/specs/test-project',
        })
      );

      // Verify the second getContent call used root path for steering
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '.kiro/steering',
        })
      );
    });

    it('should replace getSpecDirectoryPath with buildRemotePath', async () => {
      // Mock Octokit responses
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock services/auth/.kiro/specs/test-project directory listing
                data: [
                  {
                    name: 'spec.json',
                    path: 'services/auth/.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'abc123',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock services/auth/.kiro/steering directory listing
                data: [],
              })
              .mockResolvedValueOnce({
                // Mock spec.json file content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"test": "data"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: 'services/auth/.kiro/specs/test-project/spec.json',
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

      // Execute with subdir option
      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p', 'test-project',
        '--subdir', 'services/auth',
        '--output', testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      expect(result.success).toBe(true);

      // Verify buildRemotePath was used correctly (check the path pattern)
      const firstCall = mockOctokit.rest.repos.getContent.mock.calls[0]![0]!;
      expect(firstCall.path).toBe('services/auth/.kiro/specs/test-project');

      const secondCall = mockOctokit.rest.repos.getContent.mock.calls[1]![0]!;
      expect(secondCall.path).toBe('services/auth/.kiro/steering');
    });
  });
});
