/**
 * Interactive Mode Detection Test
 *
 * Tests for shouldEnterInteractiveMode function
 * Task 3.1: 対話モード起動条件の実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shouldEnterInteractiveMode } from '@/cli/interactive-prompt.js';
import type { ParsedArguments } from '@/cli/types.js';

describe('shouldEnterInteractiveMode', () => {
  const createValidArgs = (): ParsedArguments => ({
    repository: 'owner/repo',
    project: 'my-project',
    output: '.',
    force: false,
    dryRun: false,
    verbose: false,
    track: false,
    checkUpdates: false,
    update: false,
  });

  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    // Save original isTTY value
    originalIsTTY = process.stdin.isTTY;
    // Set to TTY environment by default
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original isTTY value
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
  });

  describe('完全な引数指定時', () => {
    it('リポジトリとプロジェクト名が両方指定されている場合はfalseを返す', () => {
      const args = createValidArgs();
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(false);
    });

    it('全てのオプションが指定されている場合はfalseを返す', () => {
      const args = createValidArgs();
      args.output = './output';
      args.subdir = 'src';
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(false);
    });
  });

  describe('引数不足時', () => {
    it('リポジトリが欠落している場合はtrueを返す', () => {
      const args = createValidArgs();
      args.repository = '';
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(true);
    });

    it('プロジェクト名が欠落している場合はtrueを返す', () => {
      const args = createValidArgs();
      args.project = '';
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(true);
    });

    it('リポジトリとプロジェクト名が両方欠落している場合はtrueを返す', () => {
      const args = createValidArgs();
      args.repository = '';
      args.project = '';
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(true);
    });

    it('リポジトリがundefinedの場合はtrueを返す', () => {
      const args = createValidArgs();
      args.repository = undefined as unknown as string;
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(true);
    });

    it('プロジェクト名がundefinedの場合はtrueを返す', () => {
      const args = createValidArgs();
      args.project = undefined as unknown as string;
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(true);
    });
  });

  describe('--check-updatesと--updateオプション時', () => {
    it('--check-updatesが指定されている場合はfalseを返す（引数不足でも）', () => {
      const args = createValidArgs();
      args.repository = '';
      args.project = '';
      args.checkUpdates = true;
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(false);
    });

    it('--updateが指定されている場合はfalseを返す（引数不足でも）', () => {
      const args = createValidArgs();
      args.repository = '';
      args.project = '';
      args.update = true;
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(false);
    });

    it('--trackが指定されている場合は通常の判定を行う', () => {
      const args = createValidArgs();
      args.track = true;
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(false);
    });

    it('--trackが指定されていて引数不足の場合はtrueを返す', () => {
      const args = createValidArgs();
      args.repository = '';
      args.track = true;
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(true);
    });
  });

  describe('非TTY環境', () => {
    it('process.stdin.isTTYがfalseの場合はfalseを返す', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      const args = createValidArgs();
      args.repository = '';
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(false);
    });

    it('process.stdin.isTTYがundefinedの場合はfalseを返す', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const args = createValidArgs();
      args.project = '';
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(false);
    });

    it('TTY環境で引数不足の場合のみtrueを返す', () => {
      // TTY環境
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        writable: true,
        configurable: true,
      });

      const args = createValidArgs();
      args.repository = '';
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(true);
    });
  });

  describe('境界値テスト', () => {
    it('空白のみのリポジトリ名は欠落として扱う', () => {
      const args = createValidArgs();
      args.repository = '   ';
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(true);
    });

    it('空白のみのプロジェクト名は欠落として扱う', () => {
      const args = createValidArgs();
      args.project = '   ';
      const result = shouldEnterInteractiveMode(args);
      expect(result).toBe(true);
    });
  });
});
