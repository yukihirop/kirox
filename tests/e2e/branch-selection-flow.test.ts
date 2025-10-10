/**
 * E2E tests for branch selection interactive flow
 *
 * Task 6.1: 対話モード完全フローのE2Eテスト作成
 *
 * Tests the complete interactive flow with branch selection:
 * Repository input → Branch selection → Project selection → Confirmation → File fetching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '../../src/cli/entry.js';
import { promises as fs } from 'fs';
import { Octokit } from 'octokit';
import path from 'path';
import * as interactive from '../../src/cli/interactive-prompt.js';

vi.mock('octokit');
vi.mock('../../src/cli/interactive-prompt.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/cli/interactive-prompt.js')>();
  return {
    ...actual,
    shouldEnterInteractiveMode: vi.fn(),
    promptMissingArguments: vi.fn(),
    checkTTYEnvironment: vi.fn(),
  };
});

describe('E2E Branch Selection Interactive Flow (Task 6.1)', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-branch-flow');
  let mockShouldEnterInteractiveMode: ReturnType<typeof vi.fn>;
  let mockPromptMissingArguments: ReturnType<typeof vi.fn>;
  let mockCheckTTYEnvironment: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, ignore
    }
    await fs.mkdir(testOutputDir, { recursive: true });

    // Get mocked functions
    mockShouldEnterInteractiveMode = interactive.shouldEnterInteractiveMode as ReturnType<typeof vi.fn>;
    mockPromptMissingArguments = interactive.promptMissingArguments as ReturnType<typeof vi.fn>;
    mockCheckTTYEnvironment = interactive.checkTTYEnvironment as ReturnType<typeof vi.fn>;

    // Default TTY check success
    mockCheckTTYEnvironment.mockReturnValue({ success: true });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    vi.clearAllMocks();
  });

  describe('正常フロー：リポジトリ入力→ブランチ選択→プロジェクト選択→確認→ファイル取得', () => {
    it('should complete full flow with branch selection', async () => {
      // RED: E2E test for complete flow with branch selection
      // Simulates user selecting a branch in interactive mode

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User enters repository without branch, prompts trigger branch selection,
      // and branch "develop" is selected via promptBranch
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'test-owner/test-repo#develop', // Branch appended after promptBranch
        projects: ['test-project'],
        output: testOutputDir,
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      // Mock GitHub API responses
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              // .kiro/specs/test-project directory (on develop branch)
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'sha-develop-1',
                    size: 120,
                  },
                  {
                    name: 'requirements.md',
                    path: '.kiro/specs/test-project/requirements.md',
                    type: 'file',
                    sha: 'sha-develop-2',
                    size: 250,
                  },
                ],
              })
              // .kiro/steering directory (on develop branch)
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'product.md',
                    path: '.kiro/steering/product.md',
                    type: 'file',
                    sha: 'sha-develop-3',
                    size: 180,
                  },
                ],
              })
              // File contents from develop branch
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"feature": "develop-feature"}', 'utf-8').toString('base64'),
                  size: 120,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'sha-develop-1',
                },
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Requirements\nDevelop branch requirements', 'utf-8').toString('base64'),
                  size: 250,
                  path: '.kiro/specs/test-project/requirements.md',
                  sha: 'sha-develop-2',
                },
              })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('# Product\nDevelop branch product', 'utf-8').toString('base64'),
                  size: 180,
                  path: '.kiro/steering/product.md',
                  sha: 'sha-develop-3',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      // Execute with no arguments (triggers interactive mode)
      const result = await execute(['node', 'kirox']);

      // Verify interactive mode was entered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
      expect(mockPromptMissingArguments).toHaveBeenCalled();

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(3);
      expect(result.filesFailed).toBe(0);

      // Verify GitHub API was called with branch parameter "develop"
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          path: '.kiro/specs/test-project',
          ref: 'develop',
        })
      );

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          path: '.kiro/steering',
          ref: 'develop',
        })
      );

      // Verify files were written
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'test-project', 'spec.json');
      const reqFile = path.join(testOutputDir, '.kiro', 'specs', 'test-project', 'requirements.md');
      const prodFile = path.join(testOutputDir, '.kiro', 'steering', 'product.md');

      expect(await fs.access(specFile).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(reqFile).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(prodFile).then(() => true).catch(() => false)).toBe(true);

      // Verify file contents from develop branch
      const specContent = await fs.readFile(specFile, 'utf-8');
      const reqContent = await fs.readFile(reqFile, 'utf-8');
      const prodContent = await fs.readFile(prodFile, 'utf-8');

      expect(JSON.parse(specContent)).toEqual({ feature: 'develop-feature' });
      expect(reqContent).toBe('# Requirements\nDevelop branch requirements');
      expect(prodContent).toBe('# Product\nDevelop branch product');
    });
  });

  describe('ブランチ指定済みフロー：「owner/repo#branch」形式での入力時にブランチ選択がスキップされる', () => {
    it('should skip branch selection when branch is pre-specified', async () => {
      // RED: Test that branch selection is skipped when repository includes #branch

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User enters repository WITH branch - promptBranch should be skipped
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo#feature/new-api',
        projects: ['my-project'],
        output: testOutputDir,
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/my-project/spec.json',
                    type: 'file',
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] }) // Empty steering
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"name": "feature-project"}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/my-project/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify GitHub API was called with pre-specified branch
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          path: '.kiro/specs/my-project',
          ref: 'feature/new-api',
        })
      );

      // Verify file content
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'my-project', 'spec.json');
      const specContent = await fs.readFile(specFile, 'utf-8');
      expect(JSON.parse(specContent)).toEqual({ name: 'feature-project' });
    });
  });

  describe('Ctrl+C中断フロー：ブランチ選択中のCtrl+Cで適切に終了（exitCode=130）する', () => {
    it('should exit with code 130 when user cancels branch selection with Ctrl+C', async () => {
      // RED: Test that Ctrl+C during branch selection results in exitCode 130

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate ExitPromptError thrown from promptMissingArguments
      // (which would be thrown internally by promptBranch when user presses Ctrl+C)
      const exitError = new Error('User force closed the prompt with 0 null') as Error & { exitCode?: number };
      exitError.exitCode = 130;
      mockPromptMissingArguments.mockRejectedValue(exitError);

      const result = await execute(['node', 'kirox']);

      // Verify execution was cancelled
      expect(result.success).toBe(false);
      expect(result.filesDownloaded).toBe(0);
      expect(result.filesFailed).toBe(0);

      // In real execution, process.exit(130) would be called
      // In tests, we verify the error was handled appropriately
      expect(mockPromptMissingArguments).toHaveBeenCalled();
    });
  });

  describe('0件選択フロー：0件選択時にデフォルトブランチで処理が継続される', () => {
    it('should continue with default branch when user selects 0 branches', async () => {
      // RED: Test that selecting 0 branches falls back to default branch

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User enters repository without branch, selects 0 branches in promptBranch,
      // which triggers fallback to default branch "main"
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo#main', // Default branch appended after 0 selection
        projects: ['test-project'],
        output: testOutputDir,
        subdir: undefined,
        force: false,
        dryRun: false,
        verbose: false,
        config: undefined,
        checkUpdates: false,
        update: false,
        track: true,
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'sha-main-1',
                    size: 60,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"branch": "main"}', 'utf-8').toString('base64'),
                  size: 60,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'sha-main-1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify GitHub API was called with default branch "main"
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          path: '.kiro/specs/test-project',
          ref: 'main',
        })
      );

      // Verify file content from main branch
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'test-project', 'spec.json');
      const specContent = await fs.readFile(specFile, 'utf-8');
      expect(JSON.parse(specContent)).toEqual({ branch: 'main' });
    });
  });
});
