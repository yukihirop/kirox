/**
 * Task 8.9: Test --track option behavior in add command
 *
 * Verifies that metadata file is only created/updated when --track option is specified
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { executeAddCommand } from '../../../src/cli/add-command-entry.js';
import { Octokit } from 'octokit';

// Mock dependencies
vi.mock('octokit');
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
  checkbox: vi.fn(),
}));

describe('Task 8.9: Add command --track option behavior', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'unit', 'cli', 'test-output-track');
  const metadataPath = path.join(testOutputDir, '.kiro', '.kirox-meta.json');

  let mockOctokit: any;

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    await fs.mkdir(testOutputDir, { recursive: true });

    // Mock Octokit responses
    mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn()
            // Specs directory listing
            .mockResolvedValueOnce({
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
            // Steering directory (empty)
            .mockResolvedValueOnce({ data: [] })
            // File content
            .mockResolvedValueOnce({
              data: {
                type: 'file',
                encoding: 'base64',
                content: Buffer.from('{"key": "value"}', 'utf-8').toString('base64'),
                size: 100,
                path: '.kiro/specs/test-project/spec.json',
                sha: 'abc123',
              },
            }),
        },
      },
    };

    (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  describe('Requirement: --track not specified (default false)', () => {
    it('should NOT create metadata file when --track is not specified', async () => {
      const argv = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
      ];

      const result = await executeAddCommand(argv);

      // Files should be downloaded successfully
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Metadata file should NOT exist
      const metadataExists = await fs
        .access(metadataPath)
        .then(() => true)
        .catch(() => false);

      expect(metadataExists).toBe(false);
    });

    it('should log info message indicating metadata tracking is disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const argv = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
      ];

      await executeAddCommand(argv);

      // Check for info message about disabled tracking
      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Metadata tracking is disabled');

      consoleSpy.mockRestore();
    });

    it('should skip duplicate detection when --track is not specified', async () => {
      const argv = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
      ];

      const result = await executeAddCommand(argv);

      // Should succeed without duplicate detection
      expect(result.success).toBe(true);

      // No metadata file should exist (no duplicate check performed)
      const metadataExists = await fs
        .access(metadataPath)
        .then(() => true)
        .catch(() => false);

      expect(metadataExists).toBe(false);
    });
  });

  describe('Requirement: --track specified', () => {
    it('should create metadata file when --track is specified', async () => {
      const argv = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--track',
      ];

      const result = await executeAddCommand(argv);

      // Files should be downloaded successfully
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Metadata file SHOULD exist
      const metadataExists = await fs
        .access(metadataPath)
        .then(() => true)
        .catch(() => false);

      expect(metadataExists).toBe(true);

      // Verify metadata content
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      expect(metadata.projects).toHaveLength(1);
      expect(metadata.projects[0].projectName).toBe('test-project');
      expect(metadata.projects[0].repository).toBe('owner/repo');
    });

    it('should perform duplicate detection when --track is specified', async () => {
      // First add with --track
      const argv1 = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--track',
      ];

      const result1 = await executeAddCommand(argv1);
      expect(result1.success).toBe(true);

      // Second add without --force (should fail due to duplicate)
      const argv2 = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--track',
      ];

      const result2 = await executeAddCommand(argv2);

      // Should fail due to duplicate detection
      expect(result2.success).toBe(false);
      expect(result2.exitCode).toBe(1);
    });

    it('should update existing metadata when --track and --force are specified', async () => {
      // Reset mock for first call
      mockOctokit.rest.repos.getContent.mockReset();
      mockOctokit.rest.repos.getContent
        // Specs directory listing
        .mockResolvedValueOnce({
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
        // Steering directory (empty)
        .mockResolvedValueOnce({ data: [] })
        // File content
        .mockResolvedValueOnce({
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('{"key": "value"}', 'utf-8').toString('base64'),
            size: 100,
            path: '.kiro/specs/test-project/spec.json',
            sha: 'abc123',
          },
        });

      // First add with --track
      const argv1 = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--track',
      ];

      await executeAddCommand(argv1);

      // Read initial metadata
      const initialMetadataContent = await fs.readFile(metadataPath, 'utf-8');
      const initialMetadata = JSON.parse(initialMetadataContent);
      const initialFetchedAt = initialMetadata.projects[0].fetchedAt;

      // Wait a bit to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset mock for second call
      mockOctokit.rest.repos.getContent.mockReset();
      mockOctokit.rest.repos.getContent
        // Specs directory listing
        .mockResolvedValueOnce({
          data: [
            {
              name: 'spec.json',
              path: '.kiro/specs/test-project/spec.json',
              type: 'file',
              sha: 'abc456', // Different SHA
              size: 100,
            },
          ],
        })
        // Steering directory (empty)
        .mockResolvedValueOnce({ data: [] })
        // File content
        .mockResolvedValueOnce({
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('{"key": "updated"}', 'utf-8').toString('base64'),
            size: 100,
            path: '.kiro/specs/test-project/spec.json',
            sha: 'abc456',
          },
        });

      // Second add with --track and --force
      const argv2 = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--track',
        '--force',
      ];

      const result2 = await executeAddCommand(argv2);

      // Should succeed with force
      expect(result2.success).toBe(true);

      // Verify metadata was updated
      const updatedMetadataContent = await fs.readFile(metadataPath, 'utf-8');
      const updatedMetadata = JSON.parse(updatedMetadataContent);
      const updatedFetchedAt = updatedMetadata.projects[0].fetchedAt;

      // Timestamp should be different (updated)
      expect(updatedFetchedAt).not.toBe(initialFetchedAt);
    });
  });

  describe('Requirement: Existing addコマンド functionality should work normally', () => {
    it('should fetch and save files regardless of --track option', async () => {
      // Without --track
      const argv = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
      ];

      const result = await executeAddCommand(argv);

      // Files should be downloaded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // File should exist on disk
      const specFilePath = path.join(testOutputDir, '.kiro', 'specs', 'test-project', 'spec.json');
      const fileExists = await fs
        .access(specFilePath)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });

    it('should support all existing options (--force, --dry-run, --verbose) with --track', async () => {
      const argv = [
        'node',
        'kirox',
        'add',
        'owner/repo',
        '-p',
        'test-project',
        '-o',
        testOutputDir,
        '--track',
        '--verbose',
        '--force',
      ];

      const result = await executeAddCommand(argv);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Metadata should be created
      const metadataExists = await fs
        .access(metadataPath)
        .then(() => true)
        .catch(() => false);

      expect(metadataExists).toBe(true);
    });
  });
});
