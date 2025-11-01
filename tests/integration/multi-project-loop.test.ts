/**
 * Multi-Project Loop Integration Tests
 *
 * Tests for project iteration basic structure.
 * Task 7.1: プロジェクト反復処理の基本構造を作成
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execute } from '../../src/cli/entry.js';
import * as fetcher from '../../src/github/fetcher.js';
import * as parallelFetcher from '../../src/github/parallel-fetcher.js';
import * as writer from '../../src/filesystem/writer.js';

// Mock modules
vi.mock('../../src/github/fetcher.js');
vi.mock('../../src/github/parallel-fetcher.js');
vi.mock('../../src/filesystem/writer.js');

describe('Multi-Project Loop Integration', () => {
  let mockFetchDirectoryContents: ReturnType<typeof vi.fn>;
  let mockFetchFilesInParallel: ReturnType<typeof vi.fn>;
  let mockWriteFile: ReturnType<typeof vi.fn>;
  let mockParseRepositoryPath: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetchDirectoryContents = fetcher.fetchDirectoryContents as ReturnType<typeof vi.fn>;
    mockFetchFilesInParallel = parallelFetcher.fetchFilesInParallel as ReturnType<typeof vi.fn>;
    mockWriteFile = writer.writeFile as ReturnType<typeof vi.fn>;
    mockParseRepositoryPath = fetcher.parseRepositoryPath as ReturnType<typeof vi.fn>;

    // Default mocks
    mockParseRepositoryPath.mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo',
      branch: undefined,
    });

    mockFetchDirectoryContents.mockResolvedValue([
      { type: 'file', path: '.kiro/specs/project1/file1.md', name: 'file1.md' },
    ]);

    mockFetchFilesInParallel.mockResolvedValue({
      success: [{ path: '.kiro/specs/project1/file1.md', content: 'test' }],
      failed: [],
    });

    mockWriteFile.mockResolvedValue({ written: true, skipped: false });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('projects array loop processing', () => {
    it('should loop through multiple projects', async () => {
      // RED: Test that entry.ts loops through projects array
      const projects = ['project1', 'project2', 'project3'];

      const result = await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        projects.join(','),
      ]);

      // Each project should trigger fetchDirectoryContents for specs
      expect(mockFetchDirectoryContents).toHaveBeenCalledTimes(projects.length + 1); // +1 for steering
      expect(result.success).toBe(true);
    });

    it('should process single project (backward compatibility)', async () => {
      // RED: Test backward compatibility with single project
      const result = await execute([
        'node',
        'kirox',
        'owner/repo',
        '-p',
        'single-project',
      ]);

      // Single project should work as before
      expect(mockFetchDirectoryContents).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('project index management', () => {
    it('should track current project index', async () => {
      // RED: Test that we can identify first vs subsequent projects
      const projects = ['proj1', 'proj2'];

      mockFetchDirectoryContents.mockResolvedValue([
        { type: 'file', path: '.kiro/steering/file.md', name: 'file.md' },
      ]);

      await execute(['node', 'kirox', 'owner/repo', '-p', projects.join(',')]);

      // Steering should only be fetched once (for first project)
      const steeringCalls = mockFetchDirectoryContents.mock.calls.filter(
        (call) => call[3]?.includes('steering')
      );
      expect(steeringCalls.length).toBe(1);
    });
  });

  describe('per-project result counters', () => {
    it('should count files per project', async () => {
      // RED: Test per-project success/failure counters
      mockFetchDirectoryContents
        .mockResolvedValueOnce([
          { type: 'file', path: '.kiro/specs/proj1/file1.md', name: 'file1.md' },
          { type: 'file', path: '.kiro/specs/proj1/file2.md', name: 'file2.md' },
        ])
        .mockResolvedValueOnce([]) // steering (empty)
        .mockResolvedValueOnce([
          { type: 'file', path: '.kiro/specs/proj2/file3.md', name: 'file3.md' },
        ]);

      mockFetchFilesInParallel
        .mockResolvedValueOnce({
          success: [
            { path: '.kiro/specs/proj1/file1.md', content: 'test1' },
            { path: '.kiro/specs/proj1/file2.md', content: 'test2' },
          ],
          failed: [],
        })
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj2/file3.md', content: 'test3' }],
          failed: [],
        });

      const result = await execute(['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2']);

      // Total files downloaded should be sum of all projects
      expect(result.filesDownloaded).toBe(3);
      expect(result.filesFailed).toBe(0);
    });

    it('should handle partial failures per project', async () => {
      // RED: Test partial failure handling
      mockFetchFilesInParallel
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj1/file1.md', content: 'test1' }],
          failed: [{ path: '.kiro/specs/proj1/file2.md', error: new Error('Failed') }],
        })
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj2/file3.md', content: 'test3' }],
          failed: [],
        });

      const result = await execute(['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2']);

      expect(result.filesDownloaded).toBe(2);
      expect(result.filesFailed).toBe(1);
    });
  });

  describe('aggregated counters', () => {
    it('should aggregate total success and failure counts', async () => {
      // RED: Test aggregated counters across all projects
      mockFetchFilesInParallel
        .mockResolvedValueOnce({
          success: [
            { path: '.kiro/specs/proj1/file1.md', content: 'test1' },
            { path: '.kiro/specs/proj1/file2.md', content: 'test2' },
          ],
          failed: [{ path: '.kiro/specs/proj1/file3.md', error: new Error('Failed') }],
        })
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj2/file4.md', content: 'test4' }],
          failed: [
            { path: '.kiro/specs/proj2/file5.md', error: new Error('Failed') },
            { path: '.kiro/specs/proj2/file6.md', error: new Error('Failed') },
          ],
        });

      const result = await execute(['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2']);

      expect(result.filesDownloaded).toBe(3); // 2 from proj1 + 1 from proj2
      expect(result.filesFailed).toBe(3); // 1 from proj1 + 2 from proj2
    });
  });

  describe('project error handling', () => {
    it('should continue processing after project failure', async () => {
      // RED: Test that failure in one project doesn't stop others
      mockFetchDirectoryContents
        .mockRejectedValueOnce(new Error('Project 1 not found'))
        .mockResolvedValueOnce([
          { type: 'file', path: '.kiro/specs/proj2/file.md', name: 'file.md' },
        ]);

      const result = await execute(['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2']);

      // Should still process project 2
      expect(mockFetchDirectoryContents).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(false); // Overall failure due to proj1
    });
  });

  describe('file write per project', () => {
    it('should write files for each project separately', async () => {
      // RED Task 7.4: Test file writing per project
      mockFetchDirectoryContents
        .mockResolvedValueOnce([
          { type: 'file', path: '.kiro/specs/proj1/file1.md', name: 'file1.md' },
        ])
        .mockResolvedValueOnce([]) // steering
        .mockResolvedValueOnce([
          { type: 'file', path: '.kiro/specs/proj2/file2.md', name: 'file2.md' },
        ]);

      mockFetchFilesInParallel
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj1/file1.md', content: 'content1', sha: 'abc', size: 8 }],
          failed: [],
        })
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj2/file2.md', content: 'content2', sha: 'def', size: 8 }],
          failed: [],
        });

      mockWriteFile.mockResolvedValue({ written: true, skipped: false });

      const result = await execute(['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2']);

      // Verify writeFile called for each project's files
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
      expect(result.filesDownloaded).toBe(2);
      expect(result.filesFailed).toBe(0);
    });

    it('should handle write errors per project', async () => {
      // RED Task 7.4: Test write error handling
      mockFetchDirectoryContents.mockResolvedValue([
        { type: 'file', path: '.kiro/specs/test/file.md', name: 'file.md' },
      ]);

      mockFetchFilesInParallel
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj1/file1.md', content: 'test', sha: 'abc', size: 4 }],
          failed: [],
        })
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj2/file2.md', content: 'test', sha: 'def', size: 4 }],
          failed: [],
        });

      // First project succeeds, second project fails at write
      mockWriteFile
        .mockResolvedValueOnce({ written: true, skipped: false })
        .mockRejectedValueOnce(new Error('Write permission denied'));

      const result = await execute(['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2']);

      // First project should succeed, second should fail
      expect(result.filesDownloaded).toBe(1);
      expect(result.filesFailed).toBe(1);
      expect(result.success).toBe(false);
    });

    it('should track written files per project for metadata', async () => {
      // RED Task 7.4: Test metadata tracking per project
      mockFetchDirectoryContents
        .mockResolvedValueOnce([
          { type: 'file', path: '.kiro/specs/proj1/file1.md', name: 'file1.md' },
        ])
        .mockResolvedValueOnce([]) // steering
        .mockResolvedValueOnce([
          { type: 'file', path: '.kiro/specs/proj2/file2.md', name: 'file2.md' },
        ]);

      mockFetchFilesInParallel
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj1/file1.md', content: 'test1', sha: 'sha1', size: 5 }],
          failed: [],
        })
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj2/file2.md', content: 'test2', sha: 'sha2', size: 5 }],
          failed: [],
        });

      mockWriteFile.mockResolvedValue({ written: true, skipped: false });

      await execute(['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2', '--track']);

      // Verify writeFile was called for both projects
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('spec path construction per project', () => {
    it('should construct correct spec path for each project', async () => {
      // RED Task 7.3: Test spec path construction for each project
      const projects = ['proj1', 'proj2', 'proj3'];

      mockFetchDirectoryContents.mockResolvedValue([
        { type: 'file', path: '.kiro/specs/test/file.md', name: 'file.md' },
      ]);

      await execute(['node', 'kirox', 'owner/repo', '-p', projects.join(',')]);

      // Verify fetchDirectoryContents called with correct spec paths
      const specCalls = mockFetchDirectoryContents.mock.calls.filter(
        (call) => call[3]?.includes('specs')
      );

      expect(specCalls.length).toBe(3);
      expect(specCalls[0]![3]!).toBe('.kiro/specs/proj1');
      expect(specCalls[1]![3]!).toBe('.kiro/specs/proj2');
      expect(specCalls[2]![3]!).toBe('.kiro/specs/proj3');
    });

    it('should construct spec path with subdirectory', async () => {
      // RED Task 7.3: Test spec path construction with subdir
      const projects = ['proj1', 'proj2'];

      await execute(['node', 'kirox', 'owner/repo', '--subdir', 'packages/api', '-p', projects.join(',')]);

      const specCalls = mockFetchDirectoryContents.mock.calls.filter(
        (call) => call[3]?.includes('specs')
      );

      expect(specCalls[0]![3]!).toBe('packages/api/.kiro/specs/proj1');
      expect(specCalls[1]![3]!).toBe('packages/api/.kiro/specs/proj2');
    });

    it('should handle project not found error gracefully', async () => {
      // GREEN Task 7.3: Test GitHub API 404 error for non-existent project
      mockFetchDirectoryContents
        .mockResolvedValueOnce([
          { type: 'file', path: '.kiro/specs/proj1/file.md', name: 'file.md' },
        ])
        .mockResolvedValueOnce([]) // steering
        .mockRejectedValueOnce(
          Object.assign(new Error('Not Found'), { status: 404 })
        )
        .mockResolvedValueOnce([
          { type: 'file', path: '.kiro/specs/proj3/file.md', name: 'file.md' },
        ]);

      mockFetchFilesInParallel
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj1/file.md', content: 'test', sha: 'abc', size: 4 }],
          failed: [],
        })
        .mockResolvedValueOnce({
          success: [{ path: '.kiro/specs/proj3/file.md', content: 'test', sha: 'def', size: 4 }],
          failed: [],
        });

      mockWriteFile.mockResolvedValue({ written: true, skipped: false });

      const result = await execute(['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2,proj3']);

      // Should process proj1 and proj3, but fail on proj2
      expect(result.success).toBe(false);
      expect(result.filesDownloaded).toBe(2); // proj1 + proj3
      expect(result.exitCode).toBe(1); // Partial failure
    });

    it('should handle all projects not found', async () => {
      // GREEN Task 7.3: Test all projects fail with 404
      mockFetchDirectoryContents
        .mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));

      const result = await execute(['node', 'kirox', 'owner/repo', '-p', 'proj1,proj2,proj3']);

      // All projects failed
      expect(result.success).toBe(false);
      expect(result.filesDownloaded).toBe(0);
      expect(result.exitCode).toBe(1);
    });
  });
});
