/**
 * Hash Calculator Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { calculateHash, calculateFileHash } from '../../../src/tracking/hash-calculator.js';

describe('HashCalculator - calculateHash', () => {
  describe('正常系', () => {
    it('空文字列のハッシュを計算できる', () => {
      // Arrange
      const content = '';

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      expect(hash).toHaveLength(64);
    });

    it('通常のテキストのハッシュを計算できる', () => {
      // Arrange
      const content = 'hello world';

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
      expect(hash).toHaveLength(64);
    });

    it('マルチバイト文字（日本語）のハッシュを計算できる', () => {
      // Arrange
      const content = 'こんにちは世界';

      // Act
      const hash = calculateHash(content);

      // Assert
      // SHA-256ハッシュは64文字の16進数
      expect(hash).toHaveLength(64);
      // Check that all characters are lowercase hex digits
      expect(hash.split('').every((c) => /[a-f0-9]/.test(c))).toBe(true);
    });

    it('大容量テキストのハッシュを計算できる', () => {
      // Arrange
      const content = 'a'.repeat(10000);

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toHaveLength(64);
      // Check that all characters are lowercase hex digits
      expect(hash.split('').every((c) => /[a-f0-9]/.test(c))).toBe(true);
    });

    it('特殊文字を含むテキストのハッシュを計算できる', () => {
      // Arrange
      const content = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toHaveLength(64);
      // Check that all characters are lowercase hex digits
      expect(hash.split('').every((c) => /[a-f0-9]/.test(c))).toBe(true);
    });

    it('改行を含むテキストのハッシュを計算できる', () => {
      // Arrange
      const content = 'line1\nline2\nline3';

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toHaveLength(64);
      // Check that all characters are lowercase hex digits
      expect(hash.split('').every((c) => /[a-f0-9]/.test(c))).toBe(true);
    });
  });

  describe('冪等性', () => {
    it('同一内容に対して常に同一ハッシュを返す', () => {
      // Arrange
      const content = 'test content';

      // Act
      const hash1 = calculateHash(content);
      const hash2 = calculateHash(content);
      const hash3 = calculateHash(content);

      // Assert
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('わずかな違いで異なるハッシュを返す', () => {
      // Arrange
      const content1 = 'test content';
      const content2 = 'test content '; // 末尾にスペース

      // Act
      const hash1 = calculateHash(content1);
      const hash2 = calculateHash(content2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('ハッシュ形式', () => {
    it('64文字の16進数文字列を返す', () => {
      // Arrange
      const content = 'test';

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toHaveLength(64);
      // Check that all characters are lowercase hex digits
      expect(hash.split('').every((c) => /[a-f0-9]/.test(c))).toBe(true);
    });

    it('小文字の16進数を返す', () => {
      // Arrange
      const content = 'test';

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toBe(hash.toLowerCase());
      expect(hash.split('').every((c) => c === c.toLowerCase() && /[a-f0-9]/.test(c))).toBe(true);
    });
  });
});

describe('HashCalculator - calculateFileHash', () => {
  const testDir = path.join(process.cwd(), '.test-hash-calc');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('正常系', () => {
    it('ファイルからハッシュを計算できる', async () => {
      // Arrange
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'hello world', 'utf-8');

      // Act
      const hash = await calculateFileHash(filePath);

      // Assert
      expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
      expect(hash).toHaveLength(64);
    });

    it('空ファイルのハッシュを計算できる', async () => {
      // Arrange
      const filePath = path.join(testDir, 'empty.txt');
      await fs.writeFile(filePath, '', 'utf-8');

      // Act
      const hash = await calculateFileHash(filePath);

      // Assert
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('マルチバイト文字を含むファイルのハッシュを計算できる', async () => {
      // Arrange
      const filePath = path.join(testDir, 'japanese.txt');
      await fs.writeFile(filePath, 'こんにちは世界', 'utf-8');

      // Act
      const hash = await calculateFileHash(filePath);

      // Assert
      expect(hash).toHaveLength(64);
      // Check that all characters are lowercase hex digits
      expect(hash.split('').every((c) => /[a-f0-9]/.test(c))).toBe(true);
    });

    it('大容量ファイル（1MB）のハッシュを計算できる', async () => {
      // Arrange
      const filePath = path.join(testDir, 'large.txt');
      const largeContent = 'a'.repeat(1024 * 1024); // 1MB
      await fs.writeFile(filePath, largeContent, 'utf-8');

      // Act
      const startTime = Date.now();
      const hash = await calculateFileHash(filePath);
      const duration = Date.now() - startTime;

      // Assert
      expect(hash).toHaveLength(64);
      // Check that all characters are lowercase hex digits
      expect(hash.split('').every((c) => /[a-f0-9]/.test(c))).toBe(true);
      expect(duration).toBeLessThan(1000); // 1秒以内
    });

    it('改行を含むファイルのハッシュを計算できる', async () => {
      // Arrange
      const filePath = path.join(testDir, 'multiline.txt');
      await fs.writeFile(filePath, 'line1\nline2\nline3', 'utf-8');

      // Act
      const hash = await calculateFileHash(filePath);

      // Assert
      expect(hash).toHaveLength(64);
      // Check that all characters are lowercase hex digits
      expect(hash.split('').every((c) => /[a-f0-9]/.test(c))).toBe(true);
    });
  });

  describe('冪等性', () => {
    it('同一ファイルに対して常に同一ハッシュを返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test content', 'utf-8');

      // Act
      const hash1 = await calculateFileHash(filePath);
      const hash2 = await calculateFileHash(filePath);
      const hash3 = await calculateFileHash(filePath);

      // Assert
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('ファイル内容が変更されると異なるハッシュを返す', async () => {
      // Arrange
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'original content', 'utf-8');
      const hash1 = await calculateFileHash(filePath);

      // Modify file
      await fs.writeFile(filePath, 'modified content', 'utf-8');

      // Act
      const hash2 = await calculateFileHash(filePath);

      // Assert
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('異常系: ファイル不存在', () => {
    it('ファイルが存在しない場合にエラーを投げる', async () => {
      // Arrange
      const nonExistentPath = path.join(testDir, 'non-existent.txt');

      // Act & Assert
      await expect(calculateFileHash(nonExistentPath)).rejects.toThrow();
      await expect(calculateFileHash(nonExistentPath)).rejects.toMatchObject({
        code: 'FILE_NOT_FOUND',
      });
    });
  });

  describe('異常系: 読み込みエラー', () => {
    it('ディレクトリを指定した場合にエラーを投げる', async () => {
      // Arrange
      const dirPath = path.join(testDir, 'subdir');
      await fs.mkdir(dirPath);

      // Act & Assert
      await expect(calculateFileHash(dirPath)).rejects.toThrow();
    });

    it('読み取り権限がない場合にエラーを投げる', async () => {
      // Arrange
      const filePath = path.join(testDir, 'no-read.txt');
      await fs.writeFile(filePath, 'test', 'utf-8');
      await fs.chmod(filePath, 0o000);

      // Act & Assert
      await expect(calculateFileHash(filePath)).rejects.toThrow();
      await expect(calculateFileHash(filePath)).rejects.toMatchObject({
        code: 'READ_ERROR',
      });

      // Cleanup
      await fs.chmod(filePath, 0o644);
    });
  });
});
