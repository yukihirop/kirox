/**
 * Metadata Manager Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import {
  loadMetadata,
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
