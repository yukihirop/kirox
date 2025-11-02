/**
 * Metadata Manager Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import {
  loadMetadata,
  saveMetadata,
  upsertProject,
  upsertFile,
} from '../../../src/tracking/metadata-manager.js';
import { MetadataErrorType } from '../../../src/tracking/types.js';
import type { Metadata, ProjectMetadata, FileMetadata } from '../../../src/tracking/types.js';

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
      expect(result?.projects?.[0]?.repository).toBe('owner/repo');
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
      expect(savedContent).toContain('"version": "1.0"');
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

describe('MetadataManager - upsertProject', () => {
  const testDir = path.join(process.cwd(), '.test-kiro-upsert');
  const testMetadataPath = path.join(testDir, '.kirox-meta.json');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('正常系: 新規プロジェクト追加', () => {
    it('空のメタデータに新規プロジェクトを追加できる', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const newProject: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-10-06T10:00:00Z',
        files: [],
      };

      // Act
      await upsertProject(newProject, testMetadataPath);

      // Assert
      const updatedMetadata = await loadMetadata(testMetadataPath);
      expect(updatedMetadata.projects).toHaveLength(1);
      expect(updatedMetadata.projects[0]).toEqual(newProject);
    });

    it('既存プロジェクトがある場合、新規プロジェクトを追加できる', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'existing/repo',
            projectName: 'existing-project',
            fetchedAt: '2025-10-06T09:00:00Z',
            files: [],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const newProject: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-10-06T10:00:00Z',
        files: [],
      };

      // Act
      await upsertProject(newProject, testMetadataPath);

      // Assert
      const updatedMetadata = await loadMetadata(testMetadataPath);
      expect(updatedMetadata.projects).toHaveLength(2);
      expect(updatedMetadata.projects[1]).toEqual(newProject);
    });

    it('メタデータファイルが存在しない場合、新規作成する', async () => {
      // Arrange
      const newProject: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-10-06T10:00:00Z',
        files: [],
      };

      // Act
      await upsertProject(newProject, testMetadataPath);

      // Assert
      const updatedMetadata = await loadMetadata(testMetadataPath);
      expect(updatedMetadata.version).toBe('1.0');
      expect(updatedMetadata.projects).toHaveLength(1);
      expect(updatedMetadata.projects[0]).toEqual(newProject);
    });
  });

  describe('正常系: 既存プロジェクト更新', () => {
    it('同一リポジトリ・プロジェクト名の場合、既存プロジェクトを更新する', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T09:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/old-file.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 100,
                fetchedAt: '2025-10-06T09:00:00Z',
              },
            ],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const updatedProject: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-10-06T11:00:00Z',
        files: [
          {
            path: '.kiro/specs/test-project/new-file.md',
            sha: 'new-sha',
            localHash: 'new-hash',
            size: 200,
            fetchedAt: '2025-10-06T11:00:00Z',
          },
        ],
      };

      // Act
      await upsertProject(updatedProject, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      expect(metadata.projects).toHaveLength(1);
      expect(metadata?.projects?.[0]?.fetchedAt).toBe('2025-10-06T11:00:00Z');
      expect(metadata?.projects?.[0]?.files).toHaveLength(1);
      expect(metadata?.projects?.[0]?.files?.[0]?.path).toBe('.kiro/specs/test-project/new-file.md');
    });

    it('更新時にfetchedAtタイムスタンプが更新される', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T09:00:00Z',
            files: [],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const updatedProject: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-10-06T12:00:00Z',
        files: [],
      };

      // Act
      await upsertProject(updatedProject, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      expect(metadata?.projects?.[0]?.fetchedAt).toBe('2025-10-06T12:00:00Z');
    });
  });

  describe('一意性チェック', () => {
    it('リポジトリが異なる場合、別プロジェクトとして追加される', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner1/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T09:00:00Z',
            files: [],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const newProject: ProjectMetadata = {
        repository: 'owner2/repo',
        projectName: 'test-project',
        fetchedAt: '2025-10-06T10:00:00Z',
        files: [],
      };

      // Act
      await upsertProject(newProject, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      expect(metadata.projects).toHaveLength(2);
    });

    it('プロジェクト名が異なる場合、別プロジェクトとして追加される', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'project1',
            fetchedAt: '2025-10-06T09:00:00Z',
            files: [],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const newProject: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'project2',
        fetchedAt: '2025-10-06T10:00:00Z',
        files: [],
      };

      // Act
      await upsertProject(newProject, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      expect(metadata.projects).toHaveLength(2);
    });

    it('リポジトリとプロジェクト名が両方一致する場合のみ更新される', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T09:00:00Z',
            files: [],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const updatedProject: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-10-06T10:00:00Z',
        files: [],
      };

      // Act
      await upsertProject(updatedProject, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      expect(metadata.projects).toHaveLength(1);
      expect(metadata?.projects?.[0]?.fetchedAt).toBe('2025-10-06T10:00:00Z');
    });
  });

  describe('異常系', () => {
    it('ディレクトリが存在しない場合にエラーを投げる', async () => {
      // Arrange
      const nonExistentPath = path.join(testDir, 'non-existent', '.kirox-meta.json');
      const project: ProjectMetadata = {
        repository: 'owner/repo',
        projectName: 'test-project',
        fetchedAt: '2025-10-06T10:00:00Z',
        files: [],
      };

      // Act & Assert
      await expect(upsertProject(project, nonExistentPath)).rejects.toThrow();
      await expect(upsertProject(project, nonExistentPath)).rejects.toMatchObject({
        type: MetadataErrorType.WRITE_FAILED,
      });
    });
  });
});

describe('MetadataManager - upsertFile', () => {
  const testDir = path.join(process.cwd(), '.test-kiro-upsert-file');
  const testMetadataPath = path.join(testDir, '.kirox-meta.json');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('正常系: 新規ファイル追加', () => {
    it('プロジェクトに新規ファイルを追加できる', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T10:00:00Z',
            files: [],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const newFile: FileMetadata = {
        path: '.kiro/specs/test-project/spec.json',
        sha: 'abc123',
        localHash: 'def456',
        size: 1024,
        fetchedAt: '2025-10-06T10:00:00Z',
      };

      // Act
      await upsertFile('owner/repo', 'test-project', newFile, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      expect(metadata?.projects?.[0]?.files).toHaveLength(1);
      expect(metadata?.projects?.[0]?.files?.[0]).toEqual(newFile);
    });

    it('既存ファイルがある場合、新規ファイルを追加できる', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T10:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/existing.md',
                sha: 'existing-sha',
                localHash: 'existing-hash',
                size: 500,
                fetchedAt: '2025-10-06T09:00:00Z',
              },
            ],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const newFile: FileMetadata = {
        path: '.kiro/specs/test-project/spec.json',
        sha: 'abc123',
        localHash: 'def456',
        size: 1024,
        fetchedAt: '2025-10-06T10:00:00Z',
      };

      // Act
      await upsertFile('owner/repo', 'test-project', newFile, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      expect(metadata?.projects?.[0]?.files).toHaveLength(2);
      expect(metadata?.projects?.[0]?.files?.[1]).toEqual(newFile);
    });
  });

  describe('正常系: 既存ファイル更新', () => {
    it('同一パスのファイルが存在する場合、更新する', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T10:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/spec.json',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 500,
                fetchedAt: '2025-10-06T09:00:00Z',
              },
            ],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const updatedFile: FileMetadata = {
        path: '.kiro/specs/test-project/spec.json',
        sha: 'new-sha',
        localHash: 'new-hash',
        size: 1024,
        fetchedAt: '2025-10-06T11:00:00Z',
      };

      // Act
      await upsertFile('owner/repo', 'test-project', updatedFile, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      expect(metadata?.projects?.[0]?.files).toHaveLength(1);
      expect(metadata?.projects?.[0]?.files?.[0]).toEqual(updatedFile);
      expect(metadata?.projects?.[0]?.files?.[0]?.sha).toBe('new-sha');
      expect(metadata?.projects?.[0]?.files?.[0]?.localHash).toBe('new-hash');
      expect(metadata?.projects?.[0]?.files?.[0]?.fetchedAt).toBe('2025-10-06T11:00:00Z');
    });

    it('SHA、ハッシュ、日時が更新される', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T10:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/file.md',
                sha: 'sha1',
                localHash: 'hash1',
                size: 100,
                fetchedAt: '2025-10-06T09:00:00Z',
              },
            ],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const updatedFile: FileMetadata = {
        path: '.kiro/specs/test-project/file.md',
        sha: 'sha2',
        localHash: 'hash2',
        size: 200,
        fetchedAt: '2025-10-06T12:00:00Z',
      };

      // Act
      await upsertFile('owner/repo', 'test-project', updatedFile, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      const file = metadata?.projects?.[0]?.files?.[0];
      expect(file?.sha).toBe('sha2');
      expect(file?.localHash).toBe('hash2');
      expect(file?.size).toBe(200);
      expect(file?.fetchedAt).toBe('2025-10-06T12:00:00Z');
    });
  });

  describe('重複チェック', () => {
    it('ファイルパスが異なる場合、別ファイルとして追加される', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T10:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/file1.md',
                sha: 'sha1',
                localHash: 'hash1',
                size: 100,
                fetchedAt: '2025-10-06T09:00:00Z',
              },
            ],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const newFile: FileMetadata = {
        path: '.kiro/specs/test-project/file2.md',
        sha: 'sha2',
        localHash: 'hash2',
        size: 200,
        fetchedAt: '2025-10-06T10:00:00Z',
      };

      // Act
      await upsertFile('owner/repo', 'test-project', newFile, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      expect(metadata?.projects?.[0]?.files).toHaveLength(2);
    });

    it('ファイルパスが一致する場合のみ更新される', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo',
            projectName: 'test-project',
            fetchedAt: '2025-10-06T10:00:00Z',
            files: [
              {
                path: '.kiro/specs/test-project/file.md',
                sha: 'old-sha',
                localHash: 'old-hash',
                size: 100,
                fetchedAt: '2025-10-06T09:00:00Z',
              },
            ],
          },
        ],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const updatedFile: FileMetadata = {
        path: '.kiro/specs/test-project/file.md',
        sha: 'new-sha',
        localHash: 'new-hash',
        size: 200,
        fetchedAt: '2025-10-06T10:00:00Z',
      };

      // Act
      await upsertFile('owner/repo', 'test-project', updatedFile, testMetadataPath);

      // Assert
      const metadata = await loadMetadata(testMetadataPath);
      expect(metadata?.projects?.[0]?.files).toHaveLength(1);
      expect(metadata?.projects?.[0]?.files?.[0]?.sha).toBe('new-sha');
    });
  });

  describe('異常系', () => {
    it('プロジェクトが存在しない場合にエラーを投げる', async () => {
      // Arrange
      const initialMetadata: Metadata = {
        version: '1.0',
        projects: [],
      };
      await fs.writeFile(
        testMetadataPath,
        JSON.stringify(initialMetadata, null, 2),
        'utf-8'
      );

      const file: FileMetadata = {
        path: '.kiro/specs/test-project/spec.json',
        sha: 'abc123',
        localHash: 'def456',
        size: 1024,
        fetchedAt: '2025-10-06T10:00:00Z',
      };

      // Act & Assert
      await expect(
        upsertFile('owner/repo', 'test-project', file, testMetadataPath)
      ).rejects.toThrow();
      await expect(
        upsertFile('owner/repo', 'test-project', file, testMetadataPath)
      ).rejects.toMatchObject({
        type: MetadataErrorType.NOT_FOUND,
      });
    });

    it('メタデータファイルが存在しない場合にエラーを投げる', async () => {
      // Arrange
      const file: FileMetadata = {
        path: '.kiro/specs/test-project/spec.json',
        sha: 'abc123',
        localHash: 'def456',
        size: 1024,
        fetchedAt: '2025-10-06T10:00:00Z',
      };

      // Act & Assert
      await expect(
        upsertFile('owner/repo', 'test-project', file, testMetadataPath)
      ).rejects.toThrow();
      await expect(
        upsertFile('owner/repo', 'test-project', file, testMetadataPath)
      ).rejects.toMatchObject({
        type: MetadataErrorType.NOT_FOUND,
      });
    });
  });
});
