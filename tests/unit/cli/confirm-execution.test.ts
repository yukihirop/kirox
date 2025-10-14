/**
 * Execution Confirmation Prompt Test
 *
 * Tests for confirmExecution function
 * Task 4.4: 確認プロンプトの実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { confirmExecution } from '@/cli/interactive-prompt.js';
import type { ParsedArguments } from '@/cli/types.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
}));

// Mock console.log to capture output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('confirmExecution', () => {
  let mockConfirm: ReturnType<typeof vi.fn>;

  const createValidArgs = (): ParsedArguments => ({
    repository: 'owner/repo',
    projects: ['my-project'],
    output: '.',
    force: false,
    dryRun: false,
    verbose: false,
    track: false,
    checkUpdates: false,
    update: false,
    steering: false,
  });

  beforeEach(async () => {
    const inquirer = await import('@inquirer/prompts');
    mockConfirm = inquirer.confirm as ReturnType<typeof vi.fn>;
    mockConfirm.mockClear();
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('confirmプロンプトの動作', () => {
    it('confirmプロンプトを表示する', async () => {
      mockConfirm.mockResolvedValue(true);

      await confirmExecution(createValidArgs());

      expect(mockConfirm).toHaveBeenCalledTimes(1);
    });

    it('デフォルト値がfalseである', async () => {
      mockConfirm.mockResolvedValue(false);

      await confirmExecution(createValidArgs());

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          default: false,
        })
      );
    });

    it('適切な確認メッセージを表示する', async () => {
      mockConfirm.mockResolvedValue(true);

      await confirmExecution(createValidArgs());

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Execute with this configuration?',
        })
      );
    });
  });

  describe('ユーザーの応答', () => {
    it('ユーザーが承認した場合はtrueを返す', async () => {
      mockConfirm.mockResolvedValue(true);

      const result = await confirmExecution(createValidArgs());

      expect(result).toBe(true);
    });

    it('ユーザーが拒否した場合はfalseを返す', async () => {
      mockConfirm.mockResolvedValue(false);

      const result = await confirmExecution(createValidArgs());

      expect(result).toBe(false);
    });
  });

  describe('サマリー表示', () => {
    it('リポジトリ情報を表示する', async () => {
      mockConfirm.mockResolvedValue(true);

      await confirmExecution(createValidArgs());

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('owner/repo')
      );
    });

    it('プロジェクト名を表示する', async () => {
      mockConfirm.mockResolvedValue(true);

      await confirmExecution(createValidArgs());

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('my-project')
      );
    });

    it('出力先を表示する', async () => {
      mockConfirm.mockResolvedValue(true);

      await confirmExecution(createValidArgs());

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('.')
      );
    });

    it('サブディレクトリが指定されている場合は表示する', async () => {
      mockConfirm.mockResolvedValue(true);
      const args = createValidArgs();
      args.subdir = 'src/lib';

      await confirmExecution(args);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('src/lib')
      );
    });

    it('サブディレクトリが指定されていない場合は表示しない', async () => {
      mockConfirm.mockResolvedValue(true);

      await confirmExecution(createValidArgs());

      // サブディレクトリに関する行がないことを確認
      const calls = mockConsoleLog.mock.calls;
      const hasSubdirLine = calls.some(
        (call) =>
          call.length > 0 &&
          typeof call[0] === 'string' &&
          call[0].includes('Subdirectory')
      );
      expect(hasSubdirLine).toBe(false);
    });

    it('サマリーヘッダーを表示する', async () => {
      mockConfirm.mockResolvedValue(true);

      await confirmExecution(createValidArgs());

      // "Configuration:"のようなヘッダーが表示されることを確認
      const calls = mockConsoleLog.mock.calls;
      const hasHeader = calls.some(
        (call) =>
          call.length > 0 &&
          typeof call[0] === 'string' &&
          call[0].includes('Configuration')
      );
      expect(hasHeader).toBe(true);
    });
  });

  describe('ブランチ付きリポジトリ', () => {
    it('ブランチ情報を含むリポジトリを正しく表示する', async () => {
      mockConfirm.mockResolvedValue(true);
      const args = createValidArgs();
      args.repository = 'owner/repo#feature-branch';

      await confirmExecution(args);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('owner/repo#feature-branch')
      );
    });
  });

  describe('複数プロジェクト表示', () => {
    it('複数プロジェクト名をカンマ区切りで表示する', async () => {
      mockConfirm.mockResolvedValue(true);
      const args = createValidArgs();
      args.projects = ['project1', 'project2', 'project3'];

      await confirmExecution(args);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('project1, project2, project3')
      );
    });

    it('単一プロジェクト名は従来通り表示する', async () => {
      mockConfirm.mockResolvedValue(true);
      const args = createValidArgs();
      args.projects = ['single-project'];

      await confirmExecution(args);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('single-project')
      );
    });

    it('2つのプロジェクト名をカンマ区切りで表示する', async () => {
      mockConfirm.mockResolvedValue(true);
      const args = createValidArgs();
      args.projects = ['api-project', 'web-project'];

      await confirmExecution(args);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('api-project, web-project')
      );
    });

    it('プロジェクト名にスペースが含まれる場合も正しく表示する', async () => {
      mockConfirm.mockResolvedValue(true);
      const args = createValidArgs();
      args.projects = ['my-api', 'my-web', 'my-mobile'];

      await confirmExecution(args);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('my-api, my-web, my-mobile')
      );
    });
  });

  // Task 3.4: Steering mode - Confirmation prompt display
  describe('--steering モード - 確認プロンプト表示', () => {
    it('--steering モード時、「Mode: Steering only」を表示する（Requirement 5.2）', async () => {
      mockConfirm.mockResolvedValue(true);
      const args = createValidArgs();
      args.steering = true;
      args.projects = []; // Projects may be empty in steering mode

      await confirmExecution(args);

      // Should display "Mode: Steering only" instead of project names
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Mode: Steering only')
      );
    });

    it('--steering モード時、リポジトリ、出力ディレクトリを表示する（Requirement 5.1）', async () => {
      mockConfirm.mockResolvedValue(true);
      const args = createValidArgs();
      args.steering = true;
      args.projects = [];
      args.repository = 'owner/repo';
      args.output = './output';

      await confirmExecution(args);

      // Should display repository and output
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('owner/repo')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('./output')
      );
    });

    it('--steering モード時、サブディレクトリが指定されている場合は表示する（Requirement 5.1）', async () => {
      mockConfirm.mockResolvedValue(true);
      const args = createValidArgs();
      args.steering = true;
      args.projects = [];
      args.subdir = 'packages/core';

      await confirmExecution(args);

      // Should display subdirectory
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('packages/core')
      );
    });

    it('通常モード時、プロジェクト名を表示する（Requirement 5.3: 後方互換性）', async () => {
      mockConfirm.mockResolvedValue(true);
      const args = createValidArgs();
      args.steering = false;
      args.projects = ['my-project'];

      await confirmExecution(args);

      // Should display project name
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('my-project')
      );

      // Should NOT display "Mode: Steering only"
      const calls = mockConsoleLog.mock.calls;
      const hasSteering = calls.some(
        (call) =>
          call.length > 0 &&
          typeof call[0] === 'string' &&
          call[0].includes('Mode: Steering only')
      );
      expect(hasSteering).toBe(false);
    });
  });
});
