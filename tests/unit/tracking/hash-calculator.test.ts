/**
 * Hash Calculator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { calculateHash } from '../../../src/tracking/hash-calculator.js';

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
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('大容量テキストのハッシュを計算できる', () => {
      // Arrange
      const content = 'a'.repeat(10000);

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('特殊文字を含むテキストのハッシュを計算できる', () => {
      // Arrange
      const content = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('改行を含むテキストのハッシュを計算できる', () => {
      // Arrange
      const content = 'line1\nline2\nline3';

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
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
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('小文字の16進数を返す', () => {
      // Arrange
      const content = 'test';

      // Act
      const hash = calculateHash(content);

      // Assert
      expect(hash).toBe(hash.toLowerCase());
      expect(hash).not.toMatch(/[A-F]/);
    });
  });
});
