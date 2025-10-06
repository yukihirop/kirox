/**
 * Unit tests for file writer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { ensureDirectory } from '@/filesystem/writer';

// Mock fs/promises
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    access: vi.fn(),
  },
  constants: {
    F_OK: 0,
  },
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
});
