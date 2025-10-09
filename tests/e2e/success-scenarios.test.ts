/**
 * E2E tests for successful scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '@/cli/entry';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';

vi.mock('octokit');

describe('E2E Success Scenarios', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output');

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

  describe('Complete flow: Command execution → File fetch → Placement verification', () => {
    it('should execute full flow successfully with multiple files', async () => {
      // Mock complete GitHub API responses
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                // Mock .kiro/specs/my-project directory
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/my-project/spec.json',
                    type: 'file',
                    sha: 'a1',
                    size: 150,
                  },
                  {
                    name: 'requirements.md',
                    path: '.kiro/specs/my-project/requirements.md',
                    type: 'file',
                    sha: 'a2',
                    size: 2000,
                  },
                  {
                    name: 'design.md',
                    path: '.kiro/specs/my-project/design.md',
                    type: 'file',
                    sha: 'a3',
                    size: 3000,
                  },
                ],
              })
              .mockResolvedValueOnce({
                // Mock .kiro/steering directory
                data: [
                  {
                    name: 'product.md',
                    path: '.kiro/steering/product.md',
                    type: 'file',
                    sha: 'b1',
                    size: 1500,
                  },
                  {
                    name: 'tech.md',
                    path: '.kiro/steering/tech.md',
                    type: 'file',
                    sha: 'b2',
                    size: 1800,
                  },
                ],
              })
              // File contents
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from(
                    JSON.stringify({ feature: 'my-project', phase: 'design' }),
                    'utf-8'
                  ).toString('base64'),
                  size: 150,
                  path: '.kiro/specs/my-project/spec.json',
                  sha: 'a1',
                },
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Requirements\n\nProject requirements...', 'utf-8').toString(
                    'base64'
                  ),
                  size: 2000,
                  path: '.kiro/specs/my-project/requirements.md',
                  sha: 'a2',
                },
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Design\n\nTechnical design...', 'utf-8').toString('base64'),
                  size: 3000,
                  path: '.kiro/specs/my-project/design.md',
                  sha: 'a3',
                },
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Product\n\nProduct overview...', 'utf-8').toString('base64'),
                  size: 1500,
                  path: '.kiro/steering/product.md',
                  sha: 'b1',
                },
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Tech Stack\n\nTechnology decisions...', 'utf-8').toString(
                    'base64'
                  ),
                  size: 1800,
                  path: '.kiro/steering/tech.md',
                  sha: 'b2',
                },
              }),
          },
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 4995,
                  limit: 5000,
                  reset: Date.now() / 1000 + 3600,
                },
              },
            }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      // Execute command
      const argv = [
        'node',
        'kirox',
        'owner/my-repo',
        '-p',
        'my-project',
        '-o',
        testOutputDir,
        '--force',
      ];

      const result = await execute(argv);

      // Verify execution result
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(5);
      expect(result.filesFailed).toBe(0);
      expect(result.exitCode).toBe(0);

      // Verify all files were created
      const expectedFiles = [
        '.kiro/specs/my-project/spec.json',
        '.kiro/specs/my-project/requirements.md',
        '.kiro/specs/my-project/design.md',
        '.kiro/steering/product.md',
        '.kiro/steering/tech.md',
      ];

      for (const filePath of expectedFiles) {
        const fullPath = path.join(testOutputDir, filePath);
        const exists = await fs
          .access(fullPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }

      // Verify file contents
      const specJsonContent = await fs.readFile(
        path.join(testOutputDir, '.kiro/specs/my-project/spec.json'),
        'utf-8'
      );
      expect(JSON.parse(specJsonContent)).toEqual({
        feature: 'my-project',
        phase: 'design',
      });

      const requirementsContent = await fs.readFile(
        path.join(testOutputDir, '.kiro/specs/my-project/requirements.md'),
        'utf-8'
      );
      expect(requirementsContent).toContain('# Requirements');
    });

    it('should create proper directory structure', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/deep-project/spec.json',
                    type: 'file',
                    sha: 'x1',
                    size: 100,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"test": true}', 'utf-8').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/deep-project/spec.json',
                  sha: 'x1',
                },
              }),
          },
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: { remaining: 5000, limit: 5000, reset: Date.now() / 1000 + 3600 },
              },
            }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const argv = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'deep-project',
        '-o',
        testOutputDir,
        '--force',
      ];

      await execute(argv);

      // Verify directory structure
      const specDir = path.join(testOutputDir, '.kiro/specs/deep-project');
      const specDirStats = await fs.stat(specDir);
      expect(specDirStats.isDirectory()).toBe(true);
    });
  });
});
