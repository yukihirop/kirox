/**
 * Configuration Loader Unit Tests
 *
 * Tests for config file loading and parsing.
 * Task 6.1: 設定ファイル読み込み時のパース処理を追加
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { loadConfig } from '../../../src/config/loader.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe('Configuration Loader - Multi-Project Support', () => {
  let mockReadFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReadFile = fs.readFile as ReturnType<typeof vi.fn>;
    mockReadFile.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('project field parsing', () => {
    it('should accept array format project field', async () => {
      // RED: Test that array format is accepted
      const configContent = JSON.stringify({
        project: ['project1', 'project2', 'project3'],
        outputDirectory: './output',
      });

      mockReadFile.mockResolvedValue(configContent);

      const config = await loadConfig('./.kiroxrc.json');

      expect(config.project).toEqual(['project1', 'project2', 'project3']);
      expect(Array.isArray(config.project)).toBe(true);
    });

    it('should accept string format project field', async () => {
      // RED: Test that single string format is accepted
      const configContent = JSON.stringify({
        project: 'single-project',
        outputDirectory: './output',
      });

      mockReadFile.mockResolvedValue(configContent);

      const config = await loadConfig('./.kiroxrc.json');

      expect(config.project).toBe('single-project');
      expect(typeof config.project).toBe('string');
    });

    it('should accept comma-separated string format project field', async () => {
      // RED: Test that comma-separated string is accepted (will be parsed later by merger)
      const configContent = JSON.stringify({
        project: 'project1,project2,project3',
        outputDirectory: './output',
      });

      mockReadFile.mockResolvedValue(configContent);

      const config = await loadConfig('./.kiroxrc.json');

      expect(config.project).toBe('project1,project2,project3');
      expect(typeof config.project).toBe('string');
    });

    it('should reject empty project array', async () => {
      // RED: Test that empty array is rejected
      const configContent = JSON.stringify({
        project: [],
        outputDirectory: './output',
      });

      mockReadFile.mockResolvedValue(configContent);

      await expect(loadConfig('./.kiroxrc.json')).rejects.toThrow(
        '設定ファイルのproject配列が空です'
      );
    });

    it('should reject non-string elements in project array', async () => {
      // RED: Test that non-string elements are rejected
      const configContent = JSON.stringify({
        project: ['project1', 123, 'project3'],
        outputDirectory: './output',
      });

      mockReadFile.mockResolvedValue(configContent);

      await expect(loadConfig('./.kiroxrc.json')).rejects.toThrow(
        '設定ファイルのproject配列に文字列以外の値が含まれています'
      );
    });

    it('should reject invalid project field type (number)', async () => {
      // RED: Test that non-string/non-array types are rejected
      const configContent = JSON.stringify({
        project: 123,
        outputDirectory: './output',
      });

      mockReadFile.mockResolvedValue(configContent);

      await expect(loadConfig('./.kiroxrc.json')).rejects.toThrow(
        '設定ファイルのproject値が無効です'
      );
    });

    it('should reject invalid project field type (object)', async () => {
      // RED: Test that object type is rejected
      const configContent = JSON.stringify({
        project: { name: 'project1' },
        outputDirectory: './output',
      });

      mockReadFile.mockResolvedValue(configContent);

      await expect(loadConfig('./.kiroxrc.json')).rejects.toThrow(
        '設定ファイルのproject値が無効です'
      );
    });

    it('should accept config without project field', async () => {
      // RED: Test that project field is optional
      const configContent = JSON.stringify({
        outputDirectory: './output',
        verbose: true,
      });

      mockReadFile.mockResolvedValue(configContent);

      const config = await loadConfig('./.kiroxrc.json');

      expect(config.project).toBeUndefined();
      expect(config.outputDirectory).toBe('./output');
    });

    it('should accept array with single project', async () => {
      // RED: Test single-element array
      const configContent = JSON.stringify({
        project: ['only-one'],
      });

      mockReadFile.mockResolvedValue(configContent);

      const config = await loadConfig('./.kiroxrc.json');

      expect(config.project).toEqual(['only-one']);
      expect(Array.isArray(config.project)).toBe(true);
    });

    it('should accept array with project names containing hyphens', async () => {
      // RED: Test that array elements with hyphens are accepted
      const configContent = JSON.stringify({
        project: ['api-project', 'web-project', 'mobile-app'],
      });

      mockReadFile.mockResolvedValue(configContent);

      const config = await loadConfig('./.kiroxrc.json');

      expect(config.project).toEqual(['api-project', 'web-project', 'mobile-app']);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain backward compatibility with single project string', async () => {
      // RED: Test that old single-string config still works
      const configContent = JSON.stringify({
        project: 'legacy-project',
        githubToken: 'ghp_token',
      });

      mockReadFile.mockResolvedValue(configContent);

      const config = await loadConfig('./.kiroxrc.json');

      expect(config.project).toBe('legacy-project');
      expect(typeof config.project).toBe('string');
      expect(config.githubToken).toBe('ghp_token');
    });
  });
});
