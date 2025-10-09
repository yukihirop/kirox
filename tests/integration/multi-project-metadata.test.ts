/**
 * Integration tests for multi-project metadata tracking (task 10.1)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '@/cli/entry';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';
import { loadMetadata } from '@/tracking/metadata-manager';
import type { Metadata } from '@/tracking/types';

vi.mock('octokit');

describe('Multi-Project Metadata Tracking Integration', () => {
  const testOutputDir = path.join(
    process.cwd(),
    'tests',
    'integration',
    'test-output-metadata'
  );
  const metadataPath = path.join(testOutputDir, '.kiro', '.kirox-meta.json');

  beforeEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }

    vi.clearAllMocks();
  });

  describe('Multiple project metadata saving (task 10.1)', () => {
    it('should save metadata for each project separately', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First call: steering directory (empty for this test)
              .mockResolvedValueOnce({ data: [] })
              // Second call: proj1 spec directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/proj1/file1.md',
                    type: 'file',
                    sha: 'sha1',
                    size: 100,
                  },
                ],
              })
              // Third call: proj1/file1.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 1').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj1/file1.md',
                  sha: 'sha1',
                },
              })
              // Fourth call: proj2 spec directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file2.md',
                    path: '.kiro/specs/proj2/file2.md',
                    type: 'file',
                    sha: 'sha2',
                    size: 200,
                  },
                ],
              })
              // Fifth call: proj2/file2.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 2').toString('base64'),
                  size: 200,
                  path: '.kiro/specs/proj2/file2.md',
                  sha: 'sha2',
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
        'proj1,proj2',
        '-o',
        testOutputDir,
        '--track',
      ];

      const result = await execute(argv);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);

      // Verify metadata file exists
      const metadataExists = await fs
        .access(metadataPath)
        .then(() => true)
        .catch(() => false);
      expect(metadataExists).toBe(true);

      // Load and verify metadata
      const metadata: Metadata = await loadMetadata(metadataPath);

      expect(metadata.version).toBe('1.0');
      expect(metadata.projects).toHaveLength(2);

      // Verify proj1 metadata
      const proj1 = metadata.projects.find((p) => p.projectName === 'proj1');
      expect(proj1).toBeDefined();
      expect(proj1!.repository).toBe('owner/repo');
      expect(proj1!.files).toHaveLength(1);
      expect(proj1!.files[0].path).toBe('.kiro/specs/proj1/file1.md');
      expect(proj1!.files[0].sha).toBe('sha1');
      expect(proj1!.files[0].size).toBe(100);

      // Verify proj2 metadata
      const proj2 = metadata.projects.find((p) => p.projectName === 'proj2');
      expect(proj2).toBeDefined();
      expect(proj2!.repository).toBe('owner/repo');
      expect(proj2!.files).toHaveLength(1);
      expect(proj2!.files[0].path).toBe('.kiro/specs/proj2/file2.md');
      expect(proj2!.files[0].sha).toBe('sha2');
      expect(proj2!.files[0].size).toBe(200);
    });

    it('should use repository + projectName as unique key', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First execution: proj1
              // 1. steering directory
              .mockResolvedValueOnce({ data: [] })
              // 2. proj1 spec directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/proj1/file1.md',
                    type: 'file',
                    sha: 'sha1',
                    size: 100,
                  },
                ],
              })
              // 3. proj1/file1.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 1').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj1/file1.md',
                  sha: 'sha1',
                },
              })
              // Second execution: proj1 again with updated content
              // 4. steering directory
              .mockResolvedValueOnce({ data: [] })
              // 5. proj1 spec directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/proj1/file1.md',
                    type: 'file',
                    sha: 'sha1-updated',
                    size: 150,
                  },
                ],
              })
              // 6. proj1/file1.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 1 Updated').toString('base64'),
                  size: 150,
                  path: '.kiro/specs/proj1/file1.md',
                  sha: 'sha1-updated',
                },
              }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      // First execution
      const argv1 = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'proj1',
        '-o',
        testOutputDir,
        '--track',
        '--force',
      ];

      const result1 = await execute(argv1);
      expect(result1.success).toBe(true);

      // Second execution with same project
      const argv2 = [
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'proj1',
        '-o',
        testOutputDir,
        '--track',
        '--force',
      ];

      const result2 = await execute(argv2);
      expect(result2.success).toBe(true);

      // Verify metadata has only one project (updated)
      const metadata: Metadata = await loadMetadata(metadataPath);

      expect(metadata.projects).toHaveLength(1);
      expect(metadata.projects[0].projectName).toBe('proj1');
      expect(metadata.projects[0].repository).toBe('owner/repo');
      expect(metadata.projects[0].files[0].sha).toBe('sha1-updated');
      expect(metadata.projects[0].files[0].size).toBe(150);
    });

    it('should store projects with same name from different repositories separately', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First execution: owner1/repo - proj1
              // 1. steering directory
              .mockResolvedValueOnce({ data: [] })
              // 2. proj1 spec directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file1.md',
                    path: '.kiro/specs/proj1/file1.md',
                    type: 'file',
                    sha: 'sha1',
                    size: 100,
                  },
                ],
              })
              // 3. proj1/file1.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 1').toString('base64'),
                  size: 100,
                  path: '.kiro/specs/proj1/file1.md',
                  sha: 'sha1',
                },
              })
              // Second execution: owner2/repo - proj1
              // 4. steering directory
              .mockResolvedValueOnce({ data: [] })
              // 5. proj1 spec directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file2.md',
                    path: '.kiro/specs/proj1/file2.md',
                    type: 'file',
                    sha: 'sha2',
                    size: 200,
                  },
                ],
              })
              // 6. proj1/file2.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 2').toString('base64'),
                  size: 200,
                  path: '.kiro/specs/proj1/file2.md',
                  sha: 'sha2',
                },
              }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      // First execution: owner1/repo
      const argv1 = [
        'node',
        'kirox',
        'owner1/repo',
        '-p',
        'proj1',
        '-o',
        testOutputDir,
        '--track',
      ];

      const result1 = await execute(argv1);
      expect(result1.success).toBe(true);

      // Second execution: owner2/repo (same project name, different repo)
      const argv2 = [
        'node',
        'kirox',
        'owner2/repo',
        '-p',
        'proj1',
        '-o',
        testOutputDir,
        '--track',
        '--force',
      ];

      const result2 = await execute(argv2);
      expect(result2.success).toBe(true);

      // Verify metadata has two separate projects
      const metadata: Metadata = await loadMetadata(metadataPath);

      expect(metadata.projects).toHaveLength(2);

      const proj1Owner1 = metadata.projects.find(
        (p) => p.repository === 'owner1/repo' && p.projectName === 'proj1'
      );
      const proj1Owner2 = metadata.projects.find(
        (p) => p.repository === 'owner2/repo' && p.projectName === 'proj1'
      );

      expect(proj1Owner1).toBeDefined();
      expect(proj1Owner2).toBeDefined();
      expect(proj1Owner1!.files[0].sha).toBe('sha1');
      expect(proj1Owner2!.files[0].sha).toBe('sha2');
    });

    it('should continue saving metadata for successful projects when some fail', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First call: proj1 - fails
              .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { status: 404 }))
              // Second call: proj2 - succeeds
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file2.md',
                    path: '.kiro/specs/proj2/file2.md',
                    type: 'file',
                    sha: 'sha2',
                    size: 200,
                  },
                ],
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 2').toString('base64'),
                  size: 200,
                  path: '.kiro/specs/proj2/file2.md',
                  sha: 'sha2',
                },
              })
              // Third call: proj3 - succeeds
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file3.md',
                    path: '.kiro/specs/proj3/file3.md',
                    type: 'file',
                    sha: 'sha3',
                    size: 300,
                  },
                ],
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 3').toString('base64'),
                  size: 300,
                  path: '.kiro/specs/proj3/file3.md',
                  sha: 'sha3',
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
        'proj1,proj2,proj3',
        '-o',
        testOutputDir,
        '--track',
      ];

      const result = await execute(argv);

      // Overall failure due to proj1, but proj2 and proj3 succeeded
      expect(result.success).toBe(false);
      expect(result.filesDownloaded).toBe(2);

      // Verify metadata contains only successful projects
      const metadata: Metadata = await loadMetadata(metadataPath);

      expect(metadata.projects).toHaveLength(2);

      const proj2 = metadata.projects.find((p) => p.projectName === 'proj2');
      const proj3 = metadata.projects.find((p) => p.projectName === 'proj3');
      const proj1 = metadata.projects.find((p) => p.projectName === 'proj1');

      expect(proj2).toBeDefined();
      expect(proj3).toBeDefined();
      expect(proj1).toBeUndefined(); // Failed project should not be in metadata
    });

    it('should save metadata with subdirectory information', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // First call: steering directory
              .mockResolvedValueOnce({ data: [] })
              // Second call: proj1 spec directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'file1.md',
                    path: 'packages/api/.kiro/specs/proj1/file1.md',
                    type: 'file',
                    sha: 'sha1',
                    size: 100,
                  },
                ],
              })
              // Third call: proj1/file1.md content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('Content 1').toString('base64'),
                  size: 100,
                  path: 'packages/api/.kiro/specs/proj1/file1.md',
                  sha: 'sha1',
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
        'proj1',
        '--subdir',
        'packages/api',
        '-o',
        testOutputDir,
        '--track',
      ];

      const result = await execute(argv);

      expect(result.success).toBe(true);

      // Verify metadata contains subdirectory information
      const metadata: Metadata = await loadMetadata(metadataPath);

      expect(metadata.projects).toHaveLength(1);
      expect(metadata.projects[0].subdir).toBe('packages/api');
      expect(metadata.projects[0].projectName).toBe('proj1');
    });
  });
});
