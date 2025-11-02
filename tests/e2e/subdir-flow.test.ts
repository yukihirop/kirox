/**
 * E2E tests for subdirectory fetch flow (Task 10.1)
 *
 * Tests the complete flow of fetching files from subdirectories,
 * verifying that files are saved to <outputDir>/.kiro/... without
 * subdirectory structure in local paths.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '@/cli/entry.js';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';

// Mock Octokit
vi.mock('octokit');

describe('E2E Subdirectory Flow (Task 10.1)', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'subdir-test-output');

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

  describe('Basic subdirectory flow', () => {
    it('should complete full flow: npx kirox owner/repo --subdir packages/api -p my-project', async () => {
      // Mock Octokit responses for packages/api/.kiro directory
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock packages/api/.kiro/specs/my-project directory listing
                data: [
                  {
                    name: 'requirements.md',
                    path: 'packages/api/.kiro/specs/my-project/requirements.md',
                    type: 'file',
                    sha: 'req123',
                    size: 500,
                  },
                  {
                    name: 'design.md',
                    path: 'packages/api/.kiro/specs/my-project/design.md',
                    type: 'file',
                    sha: 'design456',
                    size: 800,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock packages/api/.kiro/steering directory listing
                data: [
                  {
                    name: 'tech.md',
                    path: 'packages/api/.kiro/steering/tech.md',
                    type: 'file',
                    sha: 'tech789',
                    size: 300,
                  },
                  {
                    name: 'product.md',
                    path: 'packages/api/.kiro/steering/product.md',
                    type: 'file',
                    sha: 'product101',
                    size: 400,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock requirements.md content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Requirements from packages/api', 'utf-8').toString('base64'),
                  size: 500,
                  path: 'packages/api/.kiro/specs/my-project/requirements.md',
                  sha: 'req123',
                },
              })
              .mockResolvedValueOnce({
                // Mock design.md content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Design from packages/api', 'utf-8').toString('base64'),
                  size: 800,
                  path: 'packages/api/.kiro/specs/my-project/design.md',
                  sha: 'design456',
                },
              })
              .mockResolvedValueOnce({
                // Mock tech.md content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Tech from packages/api', 'utf-8').toString('base64'),
                  size: 300,
                  path: 'packages/api/.kiro/steering/tech.md',
                  sha: 'tech789',
                },
              })
              .mockResolvedValueOnce({
                // Mock product.md content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Product from packages/api', 'utf-8').toString('base64'),
                  size: 400,
                  path: 'packages/api/.kiro/steering/product.md',
                  sha: 'product101',
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

      (Octokit as any).mockImplementation(() => mockOctokit);

      // Capture console output for verification
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = vi.fn((...args) => {
        consoleLogs.push(args.join(' '));
      });

      // Execute CLI command
      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'my-project',
        '-o',
        testOutputDir,
        '--subdir',
        'packages/api',
        '--force',
      ];

      const result = await execute(argv);

      // Restore console.log
      console.log = originalLog;

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(4);
      expect(result.filesFailed).toBe(0);

      // Verify progress display includes subdirectory info
      const output = consoleLogs.join('\n');
      expect(output).toContain('Fetching files from');
      expect(output).toContain('packages/api/.kiro');
      expect(output).toContain('Fetched from: packages/api');

      // Verify files are saved to <outputDir>/.kiro/... (WITHOUT subdirectory prefix)
      const requirementsPath = path.join(testOutputDir, '.kiro/specs/my-project/requirements.md');
      const designPath = path.join(testOutputDir, '.kiro/specs/my-project/design.md');
      const techPath = path.join(testOutputDir, '.kiro/steering/tech.md');
      const productPath = path.join(testOutputDir, '.kiro/steering/product.md');

      // Verify all files exist and have correct content
      const requirementsContent = await fs.readFile(requirementsPath, 'utf-8');
      const designContent = await fs.readFile(designPath, 'utf-8');
      const techContent = await fs.readFile(techPath, 'utf-8');
      const productContent = await fs.readFile(productPath, 'utf-8');

      expect(requirementsContent).toBe('# Requirements from packages/api');
      expect(designContent).toBe('# Design from packages/api');
      expect(techContent).toBe('# Tech from packages/api');
      expect(productContent).toBe('# Product from packages/api');

      // Verify subdirectory structure is NOT created in output directory
      const subdirPath = path.join(testOutputDir, 'packages/api/.kiro');
      let subdirExists = false;
      try {
        await fs.access(subdirPath);
        subdirExists = true;
      } catch {
        subdirExists = false;
      }
      expect(subdirExists).toBe(false); // packages/api/.kiro should NOT exist

      // Verify summary display
      expect(output).toContain('Summary');
      expect(output).toContain('4 files succeeded');
      expect(output).toContain('0 files failed');
    });

    it('should handle nested subdirectories: npx kirox owner/repo --subdir lib/a/b -p test', async () => {
      // Mock Octokit responses for nested subdirectory
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock lib/a/b/.kiro/specs/test directory listing
                data: [
                  {
                    name: 'spec.json',
                    path: 'lib/a/b/.kiro/specs/test/spec.json',
                    type: 'file',
                    sha: 'spec123',
                    size: 200,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock lib/a/b/.kiro/steering directory (empty)
                data: [],
              })
              .mockResolvedValueOnce({
                // Mock spec.json content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"name": "test from lib/a/b"}', 'utf-8').toString('base64'),
                  size: 200,
                  path: 'lib/a/b/.kiro/specs/test/spec.json',
                  sha: 'spec123',
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

      (Octokit as any).mockImplementation(() => mockOctokit);

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'test',
        '-o',
        testOutputDir,
        '--subdir',
        'lib/a/b',
        '--force',
      ];

      const result = await execute(argv);

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify file is saved to <outputDir>/.kiro/... (WITHOUT nested subdirectory)
      const specPath = path.join(testOutputDir, '.kiro/specs/test/spec.json');
      const specContent = await fs.readFile(specPath, 'utf-8');
      expect(specContent).toBe('{"name": "test from lib/a/b"}');

      // Verify nested subdirectory is NOT created
      const nestedSubdirPath = path.join(testOutputDir, 'lib/a/b/.kiro');
      let nestedExists = false;
      try {
        await fs.access(nestedSubdirPath);
        nestedExists = true;
      } catch {
        nestedExists = false;
      }
      expect(nestedExists).toBe(false);
    });

    it('should work without --subdir option (backward compatibility)', async () => {
      // Mock Octokit responses for root .kiro directory
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock .kiro/specs/project directory listing
                data: [
                  {
                    name: 'tasks.md',
                    path: '.kiro/specs/project/tasks.md',
                    type: 'file',
                    sha: 'task123',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock .kiro/steering directory (empty)
                data: [],
              })
              .mockResolvedValueOnce({
                // Mock tasks.md content
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Tasks from root', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/project/tasks.md',
                  sha: 'task123',
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

      (Octokit as any).mockImplementation(() => mockOctokit);

      // Execute without --subdir option
      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'project',
        '-o',
        testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify file is saved to <outputDir>/.kiro/...
      const tasksPath = path.join(testOutputDir, '.kiro/specs/project/tasks.md');
      const tasksContent = await fs.readFile(tasksPath, 'utf-8');
      expect(tasksContent).toBe('# Tasks from root');
    });
  });
});
