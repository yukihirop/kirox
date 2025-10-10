/**
 * E2E tests for branch selection compatibility with existing features
 *
 * Task 6.2: 既存機能との統合互換性E2Eテスト作成
 *
 * Tests branch selection integration with:
 * - Tree API search (Requirement 10.1)
 * - Project selection (Requirement 10.2)
 * - Subdirectory support (Requirement 10.3)
 * - Confirmation prompt (Requirement 10.4)
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

describe('E2E Branch Compatibility with Existing Features (Task 6.2)', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-branch-compat');
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

  describe('Requirement 10.1: Tree API検索連携テスト', () => {
    it('should pass branch information to GitHub API when fetching multiple projects', async () => {
      // RED: Test that branch information is correctly passed to GitHub API
      // Tree API integration is tested in unit tests (Task 3.5)
      // E2E test focuses on end-to-end flow verification

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User selects branch "feature/multi-project" in interactive mode
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo#feature/multi-project',
        projects: ['project-a', 'project-b'],
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
              // PROJECT 1: project-a
              // 1. Fetch first project directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/project-a/spec.json',
                    type: 'file',
                    sha: 'sha-tree-1',
                    size: 50,
                  },
                ],
              })
              // 2. Fetch steering directory (empty, cached for subsequent projects)
              .mockResolvedValueOnce({ data: [] })
              // 3. Fetch first project file content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"name": "project-a"}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/project-a/spec.json',
                  sha: 'sha-tree-1',
                },
              })
              // PROJECT 2: project-b
              // 4. Fetch second project directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/project-b/spec.json',
                    type: 'file',
                    sha: 'sha-tree-2',
                    size: 50,
                  },
                ],
              })
              // 5. Fetch second project file content (steering cached)
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"name": "project-b"}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/project-b/spec.json',
                  sha: 'sha-tree-2',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);

      // Verify GitHub API was called with branch parameter for both projects
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          path: '.kiro/specs/project-a',
          ref: 'feature/multi-project',
        })
      );

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          path: '.kiro/specs/project-b',
          ref: 'feature/multi-project',
        })
      );

      // Verify files were written correctly
      const fileA = path.join(testOutputDir, '.kiro', 'specs', 'project-a', 'spec.json');
      const fileB = path.join(testOutputDir, '.kiro', 'specs', 'project-b', 'spec.json');

      expect(await fs.access(fileA).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(fileB).then(() => true).catch(() => false)).toBe(true);

      const contentA = await fs.readFile(fileA, 'utf-8');
      const contentB = await fs.readFile(fileB, 'utf-8');

      expect(JSON.parse(contentA)).toEqual({ name: 'project-a' });
      expect(JSON.parse(contentB)).toEqual({ name: 'project-b' });
    });
  });

  describe('Requirement 10.2: プロジェクト選択連携テスト', () => {
    it('should display project list from selected branch', async () => {
      // RED: Test that project selection displays projects from the selected branch

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User selects branch "release/v2.0" with multiple projects
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo#release/v2.0',
        projects: ['api-spec', 'db-schema'],
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
              // PROJECT 1: api-spec
              // 1. Fetch first project directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/api-spec/spec.json',
                    type: 'file',
                    sha: 'sha-release-1',
                    size: 50,
                  },
                ],
              })
              // 2. Fetch steering directory (empty)
              .mockResolvedValueOnce({ data: [] })
              // 3. Fetch first project file content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"version": "2.0"}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/api-spec/spec.json',
                  sha: 'sha-release-1',
                },
              })
              // PROJECT 2: db-schema
              // 4. Fetch second project directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/db-schema/spec.json',
                    type: 'file',
                    sha: 'sha-release-2',
                    size: 50,
                  },
                ],
              })
              // 5. Fetch second project file content (steering cached)
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"schema": "v2"}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/db-schema/spec.json',
                  sha: 'sha-release-2',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);

      // Verify GitHub API was called with release branch
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: 'release/v2.0',
        })
      );

      // Verify files from release branch were written
      const apiSpecFile = path.join(testOutputDir, '.kiro', 'specs', 'api-spec', 'spec.json');
      const dbSchemaFile = path.join(testOutputDir, '.kiro', 'specs', 'db-schema', 'spec.json');

      const apiContent = await fs.readFile(apiSpecFile, 'utf-8');
      const dbContent = await fs.readFile(dbSchemaFile, 'utf-8');

      expect(JSON.parse(apiContent)).toEqual({ version: '2.0' });
      expect(JSON.parse(dbContent)).toEqual({ schema: 'v2' });
    });
  });

  describe('Requirement 10.3: サブディレクトリ連携テスト', () => {
    it('should fetch from subdirectory on selected branch', async () => {
      // RED: Test that subdirectory files are fetched from the selected branch

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User selects branch "develop" with subdirectory "packages/core"
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/monorepo#develop',
        projects: ['core-project'],
        output: testOutputDir,
        subdir: 'packages/core',
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
              // 1. Fetch project directory from subdirectory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: 'packages/core/.kiro/specs/core-project/spec.json',
                    type: 'file',
                    sha: 'sha-subdir-1',
                    size: 60,
                  },
                ],
              })
              // 2. Fetch steering directory (empty)
              .mockResolvedValueOnce({ data: [] })
              // 3. Fetch file content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"subdirectory": "packages/core"}', 'utf-8').toString('base64'),
                  size: 60,
                  path: 'packages/core/.kiro/specs/core-project/spec.json',
                  sha: 'sha-subdir-1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);

      // Verify subdirectory file was fetched with branch parameter
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'monorepo',
          path: 'packages/core/.kiro/specs/core-project/spec.json',
          ref: 'develop',
        })
      );

      // Verify file content
      const specFile = path.join(testOutputDir, '.kiro', 'specs', 'core-project', 'spec.json');
      const content = await fs.readFile(specFile, 'utf-8');
      expect(JSON.parse(content)).toEqual({ subdirectory: 'packages/core' });
    });
  });

  describe('Requirement 10.4: 確認プロンプト連携テスト', () => {
    it('should include branch information in confirmation summary (console output)', async () => {
      // RED: Test that confirmation summary displays branch information
      // Note: This test verifies branch info is passed correctly to file fetcher,
      // which displays "Source: owner/repo (branch: branch-name)" in summary

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User selects branch "staging"
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo#staging',
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
              // 1. Fetch project directory
              .mockResolvedValueOnce({
                data: [
                  {
                    name: 'spec.json',
                    path: '.kiro/specs/test-project/spec.json',
                    type: 'file',
                    sha: 'sha-staging-1',
                    size: 40,
                  },
                ],
              })
              // 2. Fetch steering directory (empty)
              .mockResolvedValueOnce({ data: [] })
              // 3. Fetch file content
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{"branch": "staging"}', 'utf-8').toString('base64'),
                  size: 40,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'sha-staging-1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      // Capture console output to verify branch is displayed
      const consoleLogSpy = vi.spyOn(console, 'log');

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(true);

      // Verify branch information is displayed in console output
      // The file fetcher displays: "Source: owner/repo (branch: staging)"
      const consoleOutput = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(consoleOutput).toContain('branch: staging');

      consoleLogSpy.mockRestore();

      // Verify GitHub API was called with staging branch
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: 'staging',
        })
      );
    });
  });
});
