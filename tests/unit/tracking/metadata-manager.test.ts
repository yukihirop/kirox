/**
 * Metadata Manager Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import {
  loadMetadata,
  saveMetadata,
  METADATA_PATH,
} from '../../../src/tracking/metadata-manager.js';
import { MetadataErrorType } from '../../../src/tracking/types.js';
import type { Metadata } from '../../../src/tracking/types.js';

describe('MetadataManager - loadMetadata', () => {
  const testDir = path.join(process.cwd(), '.test-kiro');
  const testMetadataPath = path.join(testDir, '.kirox-meta.json');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('正常系', () => {
    it('有効なメタデータファイルを読み込める', async () => {
      // Arrange
      const validMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T10:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/spec.json',
                sha: 'a1b2c3d4e5f6',
                localHash: 'def456',
                size: 1024,
                fetchedAt: '2025-10-06T10:00:00Z',
              },
            ],
          },
        ],
      };

      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(validMetadata, null, 2),
        'utf-8'
      );

      // Act
      const result = await loadMetadata(testMetadataPath);

      // Assert
      expect(result).toEqual(validMetadata);
      expect(result.version).toBe('1.0');
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].repository).toBe('owner/repo');
    });

    it('空のプロジェクト配列を持つメタデータを読み込める', async () => {
      // Arrange
      const emptyMetadata: Metadata = {
        version: '1.0',
        projects: [],
      };

      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(emptyMetadata, null, 2),
        'utf-8'
      );

      // Act
      const result = await loadMetadata(testMetadataPath);

      // Assert
      expect(result).toEqual(emptyMetadata);
      expect(result.projects).toHaveLength(0);
    });
  });

  describe('異常系: メタデータファイルが存在しない', () => {
    it('ファイル不存在時にNOT_FOUNDエラーを投げる', async () => {
      // Act & Assert
      await expect(loadMetadata(testMetadataPath)).rejects.toThrow();
      await expect(loadMetadata(testMetadataPath)).rejects.toMatchObject({
        type: MetadataErrorType.NOT_FOUND,
      });
    });
  });

  describe('異常系: 不正なJSON形式', () => {
    it('不正なJSON形式の場合にINVALID_FORMATエラーを投げる', async () => {
      // Arrange
      await fs.writeFile(testMetadataPath, '{ invalid json', 'utf-8');

      // Act & Assert
      await expect(loadMetadata(testMetadataPath)).rejects.toThrow();
      await expect(loadMetadata(testMetadataPath)).rejects.toMatchObject({
        type: MetadataErrorType.INVALID_FORMAT,
      });
    });

    it('空ファイルの場合にINVALID_FORMATエラーを投げる', async () => {
      // Arrange
      await fs.writeFile(testMetadataPath, '', 'utf-8');

      // Act & Assert
      await expect(loadMetadata(testMetadataPath)).rejects.toThrow();
      await expect(loadMetadata(testMetadataPath)).rejects.toMatchObject({
        type: MetadataErrorType.INVALID_FORMAT,
      });
    });
  });

  describe('異常系: スキーマバリデーション', () => {
    it('versionフィールドが欠けている場合にINVALID_SCHEMAエラーを投げる', async () => {
      // Arrange
      const invalidMetadata = {
        projects: [],
      };

      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(invalidMetadata, null, 2),
        'utf-8'
      );

      // Act & Assert
      await expect(loadMetadata(testMetadataPath)).rejects.toThrow();
      await expect(loadMetadata(testMetadataPath)).rejects.toMatchObject({
        type: MetadataErrorType.INVALID_SCHEMA,
      });
    });

    it('projectsフィールドが欠けている場合にINVALID_SCHEMAエラーを投げる', async () => {
      // Arrange
      const invalidMetadata = {
        version: '1.0',
      };

      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(invalidMetadata, null, 2),
        'utf-8'
      );

      // Act & Assert
      await expect(loadMetadata(testMetadataPath)).rejects.toThrow();
      await expect(loadMetadata(testMetadataPath)).rejects.toMatchObject({
        type: MetadataErrorType.INVALID_SCHEMA,
      });
    });

    it('projectsが配列でない場合にINVALID_SCHEMAエラーを投げる', async () => {
      // Arrange
      const invalidMetadata = {
        version: '1.0',
        projects: 'not-an-array',
      };

      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(invalidMetadata, null, 2),
        'utf-8'
      );

      // Act & Assert
      await expect(loadMetadata(testMetadataPath)).rejects.toThrow();
      await expect(loadMetadata(testMetadataPath)).rejects.toMatchObject({
        type: MetadataErrorType.INVALID_SCHEMA,
      });
    });

    it('プロジェクトのrepositoryフィールドが欠けている場合にINVALID_SCHEMAエラーを投げる', async () => {
      // Arrange
      const invalidMetadata = {
        version: '1.0',
        projects: [
          {
            projectName: 'test',
            fetchedAt: '2025-10-06T10:00:00Z',
            files: [],
          },
        ],
      };

      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(invalidMetadata, null, 2),
        'utf-8'
      );

      // Act & Assert
      await expect(loadMetadata(testMetadataPath)).rejects.toThrow();
      await expect(loadMetadata(testMetadataPath)).rejects.toMatchObject({
        type: MetadataErrorType.INVALID_SCHEMA,
      });
    });

    it('ファイルメタデータのpathフィールドが欠けている場合にINVALID_SCHEMAエラーを投げる', async () => {
      // Arrange
      const invalidMetadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test',
            fetchedAt: '2025-10-06T10:00:00Z',
            files: [
              {
                sha: 'abc123',
                localHash: 'def456',
                size: 1024,
                fetchedAt: '2025-10-06T10:00:00Z',
              },
            ],
          },
        ],
      };

      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(invalidMetadata, null, 2),
        'utf-8'
      );

      // Act & Assert
      await expect(loadMetadata(testMetadataPath)).rejects.toThrow();
      await expect(loadMetadata(testMetadataPath)).rejects.toMatchObject({
        type: MetadataErrorType.INVALID_SCHEMA,
      });
    });
  });
});

describe('MetadataManager - saveMetadata', () => {
  const testDir = path.join(process.cwd(), '.test-kiro-save');
  const testMetadataPath = path.join(testDir, '.kirox-meta.json');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('正常系', () => {
    it('メタデータファイルを正常に書き込める', async () => {
      // Arrange
      const metadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T10:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/spec.json',
                sha: 'a1b2c3d4e5f6',
                localHash: 'def456',
                size: 1024,
                fetchedAt: '2025-10-06T10:00:00Z',
              },
            ],
          },
        ],
      };

      // Act
      await saveMetadata(metadata, testMetadataPath);

      // Assert
      const savedContent = await fs.readFile(testMetadataPath, 'utf-8');
      const parsedContent = JSON.parse(savedContent);
      expect(parsedContent).toEqual(metadata);
    });

    it('メタデータをインデント付きJSON形式で書き込む', async () => {
      // Arrange
      const metadata: Metadata = {
        version: '1.0',
        projects: [],
      };

      // Act
      await saveMetadata(metadata, testMetadataPath);

      // Assert
      const savedContent = await fs.readFile(testMetadataPath, 'utf-8');
      expect(savedContent).toContain('\n');
      expect(savedContent).toContain('  ');
      expect(savedContent).toMatch(/"version": "1.0"/);
    });

    it('ファイルパーミッション644で書き込む', async () => {
      // Arrange
      const metadata: Metadata = {
        version: '1.0',
        projects: [],
      };

      // Act
      await saveMetadata(metadata, testMetadataPath);

      // Assert
      const stats = await fs.stat(testMetadataPath);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o644);
    });

    it('既存ファイルを上書きできる', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [],
      };

      const updatedMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'new-owner/new-repo',
            projectName: 'new-project',
            fetchedAt: '2025-10-06T11:00:00Z',
            files: [],
          },
        ],
      };

      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      // Act
      await saveMetadata(updatedMetadata, testMetadataPath);

      // Assert
      const savedContent = await fs.readFile(testMetadataPath, 'utf-8');
      const parsedContent = JSON.parse(savedContent);
      expect(parsedContent).toEqual(updatedMetadata);
      expect(parsedContent.projects).toHaveLength(1);
    });

    it('原子的書き込み: 一時ファイルを使用して書き込む', async () => {
      // Arrange
      const metadata: Metadata = {
        version: '1.0',
        projects: [],
      };

      // Act
      const savePromise = saveMetadata(metadata, testMetadataPath);

      // 一時ファイルの存在を確認するのは難しいため、
      // 書き込み完了後に一時ファイルが残っていないことを確認
      await savePromise;

      // Assert
      const tempFilePath = `${testMetadataPath}.tmp`;
      await expect(fs.access(tempFilePath)).rejects.toThrow();
    });
  });

  describe('異常系: 書き込み失敗', () => {
    it('ディレクトリが存在しない場合にエラーを投げる', async () => {
      // Arrange
      const nonExistentPath = path.join(testDir, 'non-existent', '.kirox-meta.json');
      const metadata: Metadata = {
        version: '1.0',
        projects: [],
      };

      // Act & Assert
      await expect(saveMetadata(metadata, nonExistentPath)).rejects.toThrow();
      await expect(saveMetadata(metadata, nonExistentPath)).rejects.toMatchObject({
        type: MetadataErrorType.WRITE_FAILED,
      });
    });

    it('読み取り専用ディレクトリへの書き込み時にエラーを投げる', async () => {
      // Arrange
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true });
      await fs.chmod(readOnlyDir, 0o444);

      const readOnlyPath = path.join(readOnlyDir, '.kirox-meta.json');
      const metadata: Metadata = {
        version: '1.0',
        projects: [],
      };

      // Act & Assert
      await expect(saveMetadata(metadata, readOnlyPath)).rejects.toThrow();
      await expect(saveMetadata(metadata, readOnlyPath)).rejects.toMatchObject({
        type: MetadataErrorType.WRITE_FAILED,
      });

      // Cleanup
      await fs.chmod(readOnlyDir, 0o755);
    });
  });

  describe('エラー時のロールバック', () => {
    it('書き込み失敗時に一時ファイルがクリーンアップされる', async () => {
      // Arrange
      const nonExistentDir = path.join(testDir, 'non-existent-dir');
      const nonExistentPath = path.join(nonExistentDir, '.kirox-meta.json');
      const tempPath = `${nonExistentPath}.tmp`;

      const metadata: Metadata = {
        version: '1.0',
        projects: [],
      };

      // Act
      try {
        await saveMetadata(metadata, nonExistentPath);
      } catch {
        // エラーは期待される
      }

      // Assert: 一時ファイルが残っていないことを確認
      await expect(fs.access(tempPath)).rejects.toThrow();
    });
  });
});
