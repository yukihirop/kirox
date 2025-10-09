/**
 * Local Edit Detector Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { detectLocalEdit, EditStatus } from '../../../src/tracking/local-edit-detector.js';

describe('LocalEditDetector - detectLocalEdit', () => {
  const testDir = path.join(process.cwd(), '.test-local-edit');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('正常系: ローカル編集なし', () => {
    it('ハッシュが一致する場合に「編集なし」を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'unchanged.txt');
      const content = 'original content';
      await fs.writeFile(filePath, content, 'utf-8');

      // Calculate expected hash (SHA-256 of "original content")
      const recordedHash = 'bf573149b23303cac63c2a359b53760d919770c5d070047e76de42e2184f1046';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.status).toBe(EditStatus.NO_EDIT);
      expect(result.currentHash).toBe(recordedHash);
      expect(result.recordedHash).toBe(recordedHash);
      expect(result.message).toContain('not edited');
    });

    it('空ファイルのハッシュが一致する場合に「編集なし」を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'empty.txt');
      await fs.writeFile(filePath, '', 'utf-8');

      // SHA-256 hash of empty string
      const recordedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.status).toBe(EditStatus.NO_EDIT);
      expect(result.currentHash).toBe(recordedHash);
    });

    it('マルチバイト文字を含むファイルのハッシュが一致する場合に「編集なし」を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'japanese.txt');
      const content = 'こんにちは世界';
      await fs.writeFile(filePath, content, 'utf-8');

      // Calculate hash for multibyte content
      const crypto = await import('crypto');
      const recordedHash = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.status).toBe(EditStatus.NO_EDIT);
      expect(result.currentHash).toBe(recordedHash);
    });
  });

  describe('正常系: ローカル編集あり', () => {
    it('ハッシュが不一致の場合に「編集あり」を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'modified.txt');
      await fs.writeFile(filePath, 'modified content', 'utf-8');

      // Hash of original content (different from actual file)
      const recordedHash = 'bf573149b23303cac63c2a359b53760d919770c5d070047e76de42e2184f1046'; // "original content"

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.status).toBe(EditStatus.EDITED);
      expect(result.currentHash).not.toBe(recordedHash);
      expect(result.recordedHash).toBe(recordedHash);
      expect(result.message).toContain('Local edits');
    });

    it('わずかな違いでも「編集あり」を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'slightly-modified.txt');
      await fs.writeFile(filePath, 'original content ', 'utf-8'); // 末尾にスペース

      // Hash of "original content" (without space)
      const recordedHash = 'bf573149b23303cac63c2a359b53760d919770c5d070047e76de42e2184f1046';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.status).toBe(EditStatus.EDITED);
      expect(result.currentHash).not.toBe(recordedHash);
    });

    it('改行の追加でも「編集あり」を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'newline-added.txt');
      await fs.writeFile(filePath, 'original content\n', 'utf-8');

      // Hash of "original content" (without newline)
      const recordedHash = 'bf573149b23303cac63c2a359b53760d919770c5d070047e76de42e2184f1046';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.status).toBe(EditStatus.EDITED);
      expect(result.currentHash).not.toBe(recordedHash);
    });
  });

  describe('異常系: ファイル削除', () => {
    it('ファイルが存在しない場合に「削除済み」を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'deleted.txt');
      const recordedHash = 'bf573149b23303cac63c2a359b53760d919770c5d070047e76de42e2184f1046';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.status).toBe(EditStatus.DELETED);
      expect(result.currentHash).toBeUndefined();
      expect(result.recordedHash).toBe(recordedHash);
      expect(result.message).toContain('deleted');
    });

    it('ディレクトリに変更された場合に「削除済み」を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'converted-to-dir');
      await fs.mkdir(filePath); // Create directory instead of file
      const recordedHash = 'bf573149b23303cac63c2a359b53760d919770c5d070047e76de42e2184f1046';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.status).toBe(EditStatus.DELETED);
      expect(result.currentHash).toBeUndefined();
      expect(result.message).toContain('deleted');
    });
  });

  describe('異常系: ハッシュ計算失敗', () => {
    it('読み取り権限がない場合に「状態不明」を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'no-read.txt');
      await fs.writeFile(filePath, 'test content', 'utf-8');
      await fs.chmod(filePath, 0o000); // Remove all permissions
      const recordedHash = 'bf573149b23303cac63c2a359b53760d919770c5d070047e76de42e2184f1046';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.status).toBe(EditStatus.UNKNOWN);
      expect(result.currentHash).toBeUndefined();
      expect(result.recordedHash).toBe(recordedHash);
      expect(result.message).toContain('unknown');
      expect(result.error).toBeDefined();

      // Cleanup
      await fs.chmod(filePath, 0o644);
    });

    it('エラー詳細を含む「状態不明」を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'permission-error.txt');
      await fs.writeFile(filePath, 'test content', 'utf-8');
      await fs.chmod(filePath, 0o000);
      const recordedHash = 'test-hash';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.status).toBe(EditStatus.UNKNOWN);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('permission denied');

      // Cleanup
      await fs.chmod(filePath, 0o644);
    });
  });

  describe('エッジケース', () => {
    it('大容量ファイル（1MB）でも正しく編集検出できる', async () => {
      // Arrange
      const filePath = path.join(testDir, 'large.txt');
      const content = 'a'.repeat(1024 * 1024); // 1MB
      await fs.writeFile(filePath, content, 'utf-8');

      const crypto = await import('crypto');
      const recordedHash = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');

      // Act
      const startTime = Date.now();
      const result = await detectLocalEdit(filePath, recordedHash);
      const duration = Date.now() - startTime;

      // Assert
      expect(result.status).toBe(EditStatus.NO_EDIT);
      expect(duration).toBeLessThan(1000); // 1秒以内
    });

    it('無効なハッシュ形式でも比較できる', async () => {
      // Arrange
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'content', 'utf-8');
      const invalidHash = 'invalid-hash-format';

      // Act
      const result = await detectLocalEdit(filePath, invalidHash);

      // Assert
      expect(result.status).toBe(EditStatus.EDITED);
      expect(result.currentHash).not.toBe(invalidHash);
    });

    it('空の記録ハッシュでも処理できる', async () => {
      // Arrange
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'content', 'utf-8');
      const emptyHash = '';

      // Act
      const result = await detectLocalEdit(filePath, emptyHash);

      // Assert
      expect(result.status).toBe(EditStatus.EDITED);
      expect(result.currentHash).not.toBe(emptyHash);
    });
  });

  describe('結果オブジェクトの構造', () => {
    it('すべての必須フィールドを含む結果を返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'content', 'utf-8');
      const recordedHash = 'test-hash';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('recordedHash');
      expect(result).toHaveProperty('message');
      expect(result.status).toBeTypeOf('string');
      expect(result.recordedHash).toBe(recordedHash);
      expect(result.message).toBeTypeOf('string');
    });

    it('編集なしの場合にcurrentHashを含む', async () => {
      // Arrange
      const filePath = path.join(testDir, 'test.txt');
      const content = 'content';
      await fs.writeFile(filePath, content, 'utf-8');

      const crypto = await import('crypto');
      const recordedHash = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result).toHaveProperty('currentHash');
      expect(result.currentHash).toBe(recordedHash);
    });

    it('削除済みの場合にcurrentHashが未定義', async () => {
      // Arrange
      const filePath = path.join(testDir, 'deleted.txt');
      const recordedHash = 'test-hash';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result.currentHash).toBeUndefined();
    });

    it('状態不明の場合にerrorフィールドを含む', async () => {
      // Arrange
      const filePath = path.join(testDir, 'no-read.txt');
      await fs.writeFile(filePath, 'test', 'utf-8');
      await fs.chmod(filePath, 0o000);
      const recordedHash = 'test-hash';

      // Act
      const result = await detectLocalEdit(filePath, recordedHash);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result.error).toBeTypeOf('string');

      // Cleanup
      await fs.chmod(filePath, 0o644);
    });
  });
});
