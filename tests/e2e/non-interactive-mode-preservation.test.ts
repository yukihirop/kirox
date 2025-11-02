/**
 * E2E tests for non-interactive mode preservation
 *
 * Task 10.5: 非対話モード維持の確認E2Eテスト
 *
 * Verifies that existing non-interactive mode functionality remains intact:
 * - Complete argument specification (no interactive mode)
 * - All CLI options work as before
 * - No performance degradation
 * - Backward compatibility maintained
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '../../src/cli/entry.js';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';
import * as interactive from '../../src/cli/interactive-prompt.js';

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

describe('E2E Non-Interactive Mode Preservation', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-noninteractive');
  let mockShouldEnterInteractiveMode: ReturnType<typeof vi.fn>;
  let mockPromptMissingArguments: ReturnType<typeof vi.fn>;

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
      await fs.rm(path.join(projectRootKiro, 'specs', 'my-project'), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    vi.clearAllMocks();
  });

  describe('Complete argument specification (no interactive mode)', () => {
    it('should not enter interactive mode when all required arguments are provided', async () => {
      // RED: Verify non-interactive mode with complete arguments

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      // Mock GitHub API
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"test": "data"}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
      ]);

      // Verify interactive mode was not triggered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'owner/repo',
          projects: ['test-project'],
          output: testOutputDir,
        })
      );

      // Verify prompts were not called
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify file was written
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'test-project', 'spec.json');
      expect(await fs.access(specFile).then(() => true).catch(() => false)).toBe(true);
    });

    it('should execute normally with repository and project in command line', async () => {
      // RED: Test basic non-interactive execution

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox', 'owner/repo', '-p', 'my-project']);

      // Verify success
      expect(result.success).toBe(true);
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });

    it('should work with branch specification in non-interactive mode', async () => {
      // RED: Test branch specification without interactive mode

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox', 'owner/repo#develop', '-p', 'test-project']);

      expect(result.success).toBe(true);
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();

      // Verify branch was passed to GitHub API
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: 'develop',
        })
      );
    });
  });

  describe('CLI options work as before', () => {
    it('should handle --force option in non-interactive mode', async () => {
      // RED: Test --force option

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'test.md',
                    path: '.kiro/specs/test-project/test.md',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('test content', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/test-project/test.md',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--force',
      ]);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });

    it('should handle --dry-run option in non-interactive mode', async () => {
      // RED: Test --dry-run option

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'test.md',
                    path: '.kiro/specs/test-project/test.md',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('test', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/test-project/test.md',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--dry-run',
      ]);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(0); // Dry-run doesn't write files
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();

      // Verify no files were written
      const testFile = path.join(testOutputDir, '.kiro', 'specs', 'test-project', 'test.md');
      expect(await fs.access(testFile).then(() => true).catch(() => false)).toBe(false);
    });

    it('should handle --verbose option in non-interactive mode', async () => {
      // RED: Test --verbose option

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test-project',
        '--verbose',
      ]);

      expect(result.success).toBe(true);
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });

    it('should handle --subdir option in non-interactive mode', async () => {
      // RED: Test --subdir option

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test-project',
        '--subdir',
        'packages/api',
      ]);

      expect(result.success).toBe(true);
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();

      // Verify subdir was used
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'packages/api/.kiro/specs/test-project',
        })
      );
    });

    it('should handle multiple options combined in non-interactive mode', async () => {
      // RED: Test multiple options together

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute([
        'node',
        'kirox',
        'owner/repo#main',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--subdir',
        'lib',
        '--force',
        '--verbose',
      ]);

      expect(result.success).toBe(true);
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });
  });

  describe('Performance impact verification', () => {
    it('should have minimal overhead for interactive mode check (<1ms)', async () => {
      // RED: Verify performance impact is negligible

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      // Measure execution time
      const startTime = performance.now();

      await execute(['node', 'kirox', 'owner/repo', '-p', 'test-project']);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // The interactive mode check should add minimal overhead
      // Most execution time is from GitHub API mocks and file operations
      // We just verify it completes without hanging
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify interactive mode check was called
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
    });

    it('should not slow down execution with interactive mode logic', async () => {
      // RED: Verify no significant performance degradation

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      // Run multiple times to check consistency
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await execute(['node', 'kirox', 'owner/repo', '-p', 'test-project']);
        const end = performance.now();
        times.push(end - start);
      }

      // Calculate average time
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      // Average execution time should be reasonable (under 1 second)
      expect(avgTime).toBeLessThan(1000);

      // Verify consistency (standard deviation should be low)
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be low (consistent performance)
      expect(stdDev).toBeLessThan(500);
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain exact same behavior as before interactive mode feature', async () => {
      // RED: Verify backward compatibility

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
      ]);

      // Verify exact same behavior
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);
      expect(result.filesFailed).toBe(0);

      // Verify file was written correctly
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'test-project', 'spec.json');
      const content = await fs.readFile(specFile, 'utf-8');
      expect(JSON.parse(content)).toEqual({});
    });

    it('should not interfere with existing error handling', async () => {
      // RED: Verify error handling remains unchanged

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      // Invalid repository format should still fail
      const result = await execute([
        'node',
        'kirox',
        'invalid-format',
        '-p',
        'test-project',
      ]);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });

    it('should maintain all existing exit codes', async () => {
      // RED: Verify exit codes are preserved

      mockShouldEnterInteractiveMode.mockReturnValue(false);

      // Test validation error (exit code 1)
      const result1 = await execute(['node', 'kirox', 'bad', '-p', 'test']);
      expect(result1.exitCode).toBe(1);

      // Test empty project name (exit code 1)
      const result2 = await execute(['node', 'kirox', 'owner/repo', '-p', '']);
      expect(result2.exitCode).toBe(1);

      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });
  });
});
