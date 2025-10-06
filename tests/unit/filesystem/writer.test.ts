/**
 * Unit tests for file writer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { ensureDirectory, checkFileExists, writeFile } from '@/filesystem/writer';
import type { WriteOptions } from '@/filesystem/types';

// Mock fs/promises
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    access: vi.fn(),
    writeFile: vi.fn(),
  },
  constants: {
    F_OK: 0,
  },
}));

// Mock prompt service
vi.mock('@/filesystem/prompt', () => ({
  confirm: vi.fn(),
}));

describe('FileWriter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', async () => {
      // Mock directory does not exist
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await ensureDirectory('.kiro/specs/my-project');

      expect(fs.access).toHaveBeenCalledWith('.kiro/specs/my-project', 0);
      expect(fs.mkdir).toHaveBeenCalledWith('.kiro/specs/my-project', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      // Mock directory exists
      vi.mocked(fs.access).mockResolvedValue(undefined);

      await ensureDirectory('.kiro/specs/my-project');

      expect(fs.access).toHaveBeenCalledWith('.kiro/specs/my-project', 0);
      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it('should create nested directories recursively', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await ensureDirectory('.kiro/specs/my-project/subdir');

      expect(fs.mkdir).toHaveBeenCalledWith('.kiro/specs/my-project/subdir', {
        recursive: true,
      });
    });

    it('should create .kiro/steering directory', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await ensureDirectory('.kiro/steering');

      expect(fs.mkdir).toHaveBeenCalledWith('.kiro/steering', { recursive: true });
    });

    it('should handle permission errors gracefully', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.mkdir).mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(ensureDirectory('.kiro/specs/project')).rejects.toThrow('permission denied');
    });

    it('should handle disk space errors gracefully', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.mkdir).mockRejectedValue(new Error('ENOSPC: no space left'));

      await expect(ensureDirectory('.kiro/specs/project')).rejects.toThrow('no space left');
    });

    it('should normalize path separators', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await ensureDirectory('.kiro\\specs\\project');

      // Should normalize to forward slashes
      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('.kiro'), {
        recursive: true,
      });
    });
  });

  describe('checkFileExists', () => {
    it('should return true if file exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await checkFileExists('.kiro/specs/project/file.md');

      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith('.kiro/specs/project/file.md', 0);
    });

    it('should return false if file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const result = await checkFileExists('.kiro/specs/project/file.md');

      expect(result).toBe(false);
    });

    it('should return false for directory access errors', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('EACCES'));

      const result = await checkFileExists('.kiro/specs/project/file.md');

      expect(result).toBe(false);
    });
  });

  describe('writeFile', () => {
    beforeEach(async () => {
      // Import confirm after mock is set up
      const { confirm } = await import('@/filesystem/prompt');
      vi.mocked(confirm).mockResolvedValue(true);
    });

    it('should write file when it does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const options: WriteOptions = {
        force: false,
        prompt: true,
        dryRun: false,
        verbose: false,
      };

      const result = await writeFile('.kiro/specs/project/new.md', 'content', options);

      expect(result.written).toBe(true);
      expect(result.skipped).toBe(false);
      expect(fs.writeFile).toHaveBeenCalledWith('.kiro/specs/project/new.md', 'content', 'utf-8');
    });

    it('should skip file write in dry-run mode', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const options: WriteOptions = {
        force: false,
        prompt: true,
        dryRun: true,
        verbose: false,
      };

      const result = await writeFile('.kiro/specs/project/file.md', 'content', options);

      expect(result.written).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('dry-run');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should prompt user when file exists and force is false', async () => {
      const { confirm } = await import('@/filesystem/prompt');

      vi.mocked(fs.access).mockResolvedValue(undefined); // File exists
      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const options: WriteOptions = {
        force: false,
        prompt: true,
        dryRun: false,
        verbose: false,
      };

      const result = await writeFile('.kiro/specs/project/existing.md', 'content', options);

      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('existing.md'));
      expect(result.written).toBe(true);
    });

    it('should skip file when user declines overwrite', async () => {
      const { confirm } = await import('@/filesystem/prompt');

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(confirm).mockResolvedValue(false);

      const options: WriteOptions = {
        force: false,
        prompt: true,
        dryRun: false,
        verbose: false,
      };

      const result = await writeFile('.kiro/specs/project/existing.md', 'content', options);

      expect(result.written).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('declined');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should not prompt when force option is true', async () => {
      const { confirm } = await import('@/filesystem/prompt');

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const options: WriteOptions = {
        force: true,
        prompt: false,
        dryRun: false,
        verbose: false,
      };

      const result = await writeFile('.kiro/specs/project/existing.md', 'content', options);

      expect(confirm).not.toHaveBeenCalled();
      expect(result.written).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle write errors gracefully', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('EACCES: permission denied'));

      const options: WriteOptions = {
        force: false,
        prompt: true,
        dryRun: false,
        verbose: false,
      };

      await expect(
        writeFile('.kiro/specs/project/file.md', 'content', options)
      ).rejects.toThrow('permission denied');
    });

    it('should not prompt when prompt option is false', async () => {
      const { confirm } = await import('@/filesystem/prompt');

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const options: WriteOptions = {
        force: false,
        prompt: false,
        dryRun: false,
        verbose: false,
      };

      const result = await writeFile('.kiro/specs/project/existing.md', 'content', options);

      expect(confirm).not.toHaveBeenCalled();
      expect(result.written).toBe(true);
    });

    it('should handle disk full errors (ENOSPC)', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('ENOSPC: no space left on device'));

      const options: WriteOptions = {
        force: false,
        prompt: true,
        dryRun: false,
        verbose: false,
      };

      await expect(
        writeFile('.kiro/specs/project/file.md', 'content', options)
      ).rejects.toThrow('no space left on device');
    });

    it('should return file path in result when written successfully', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const options: WriteOptions = {
        force: false,
        prompt: true,
        dryRun: false,
        verbose: false,
      };

      const filePath = '.kiro/specs/project/new-file.md';
      const result = await writeFile(filePath, 'test content', options);

      expect(result.written).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.filePath).toBe(filePath);
    });

    it('should return file path in result when skipped', async () => {
      const { confirm } = await import('@/filesystem/prompt');

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(confirm).mockResolvedValue(false);

      const options: WriteOptions = {
        force: false,
        prompt: true,
        dryRun: false,
        verbose: false,
      };

      const filePath = '.kiro/specs/project/existing.md';
      const result = await writeFile(filePath, 'content', options);

      expect(result.written).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.filePath).toBe(filePath);
    });

    it('should include file size in dry-run result', async () => {
      const options: WriteOptions = {
        force: false,
        prompt: true,
        dryRun: true,
        verbose: false,
      };

      const content = 'This is test content with some length';
      const filePath = '.kiro/specs/project/file.md';
      const result = await writeFile(filePath, content, options);

      expect(result.written).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.filePath).toBe(filePath);
      expect(result.size).toBe(Buffer.byteLength(content, 'utf-8'));
    });

    it('should write file even if directory does not exist (integration with ensureDirectory)', async () => {
      const filePath = '.kiro/specs/new-project/file.md';
      const dirPath = '.kiro/specs/new-project';

      // Mock: directory does not exist, will be created
      vi.mocked(fs.access)
        .mockRejectedValueOnce(new Error('ENOENT')) // checkFileExists
        .mockRejectedValueOnce(new Error('ENOENT')); // ensureDirectory check

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const options: WriteOptions = {
        force: false,
        prompt: true,
        dryRun: false,
        verbose: false,
      };

      // First ensure directory exists
      await ensureDirectory(dirPath);

      // Then write file
      const result = await writeFile(filePath, 'content', options);

      expect(fs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
      expect(result.written).toBe(true);
    });
  });
});
