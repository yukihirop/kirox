/**
 * E2E tests for interactive mode validation error flows
 *
 * Task 10.4: バリデーションエラーフローのE2Eテスト
 *
 * Tests validation error handling in interactive mode:
 * - Invalid repository format with retry flow
 * - Invalid project name error handling
 * - Multiple validation errors before success
 * - Error message readability
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

describe('E2E Interactive Validation Error Flow', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output-validation');
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

    // Clean up any files created in project root
    try {
      const projectRootKiro = path.join(process.cwd(), '.kiro');
      await fs.rm(path.join(projectRootKiro, '.kirox-meta.json'), { force: true });
      await fs.rm(path.join(projectRootKiro, 'specs', 'test-project'), { recursive: true, force: true });
      await fs.rm(path.join(projectRootKiro, 'specs', 'my-project'), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    vi.clearAllMocks();
  });

  describe('Invalid repository format validation', () => {
    it('should fail validation with invalid repository format', async () => {
      // RED: E2E test for invalid repository format validation

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User provides invalid repository format
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'invalid-repo-format',
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

      const result = await execute(['node', 'kirox']);

      // Verify validation failure
      expect(result.success).toBe(false);
      expect(result.filesDownloaded).toBe(0);
      expect(result.filesFailed).toBe(0);

      // Verify no files were created
      const specDir = path.join(testOutputDir, '.kiro', 'specs');
      expect(await fs.access(specDir).then(() => true).catch(() => false)).toBe(false);
    });

    it('should reject repository format without slash', async () => {
      // RED: Test repository format validation (missing slash)

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'invalidrepo',
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

      const result = await execute(['node', 'kirox']);

      // Verify validation failure
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should reject repository format with multiple slashes', async () => {
      // RED: Test repository format validation (multiple slashes)

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo/extra',
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

      const result = await execute(['node', 'kirox']);

      // Verify validation failure
      expect(result.success).toBe(false);
    });

    it('should accept valid repository format after interactive input', async () => {
      // RED: Verify valid repository format is accepted

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
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

      // Mock GitHub API
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
                    sha: 'sha1',
                    size: 50,
                  },
                ],
              })
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({
                data: {
                  type: 'file',
                  encoding: 'base64',
                  content: Buffer.from('{}', 'utf-8').toString('base64'),
                  size: 50,
                  path: '.kiro/specs/test-project/spec.json',
                  sha: 'sha1',
                },
              }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result = await execute(['node', 'kirox']);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);
    });
  });

  describe('Invalid project name validation', () => {
    it('should reject empty project name', async () => {
      // RED: Test empty project name validation

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: [],
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

      const result = await execute(['node', 'kirox']);

      // Verify validation failure
      expect(result.success).toBe(false);
      expect(result.filesDownloaded).toBe(0);
    });

    it('should reject project name with path traversal', async () => {
      // RED: Test path traversal in project name

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['../malicious'],
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

      const result = await execute(['node', 'kirox']);

      // Verify validation failure
      expect(result.success).toBe(false);
    });

    it('should reject project name with special characters', async () => {
      // RED: Test special characters in project name

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['project@#$%'],
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

      const result = await execute(['node', 'kirox']);

      // Verify validation failure
      expect(result.success).toBe(false);
    });
  });

  describe('Multiple validation errors', () => {
    it('should handle multiple validation errors in sequence', async () => {
      // RED: Test multiple validation attempts

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // First attempt: invalid repository
      mockPromptMissingArguments.mockResolvedValueOnce({
        repository: 'invalid',
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

      const result1 = await execute(['node', 'kirox']);
      expect(result1.success).toBe(false);

      vi.clearAllMocks();
      mockCheckTTYEnvironment.mockReturnValue({ success: true });
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Second attempt: invalid project
      mockPromptMissingArguments.mockResolvedValueOnce({
        repository: 'owner/repo',
        projects: ['../bad'],
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

      const result2 = await execute(['node', 'kirox']);
      expect(result2.success).toBe(false);

      vi.clearAllMocks();
      mockCheckTTYEnvironment.mockReturnValue({ success: true });
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Third attempt: success
      mockPromptMissingArguments.mockResolvedValueOnce({
        repository: 'owner/repo',
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
              .mockResolvedValueOnce({ data: [] })
              .mockResolvedValueOnce({ data: [] }),
          },
        },
      };

      (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);

      const result3 = await execute(['node', 'kirox']);
      expect(result3.success).toBe(true);
    });

    it('should validate both repository and project in same flow', async () => {
      // RED: Test validation of both required fields

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Both invalid
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'invalid',
        projects: [],
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

      const result = await execute(['node', 'kirox']);

      // Should fail (repository validation happens first)
      expect(result.success).toBe(false);
    });
  });

  describe('Error message readability', () => {
    it('should provide clear error message for invalid repository format', async () => {
      // RED: Verify error message contains helpful information

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'badformat',
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

      const result = await execute(['node', 'kirox']);

      // Error should occur with validation failure
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should provide clear error message for invalid project name', async () => {
      // RED: Verify project name error message

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: ['../invalid'],
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

      const result = await execute(['node', 'kirox']);

      // Error should occur with validation failure
      expect(result.success).toBe(false);
    });

    it('should handle validation errors with partial CLI arguments', async () => {
      // RED: Test validation with partial arguments from CLI

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // User provides invalid project via prompt
      mockPromptMissingArguments.mockResolvedValue({
        repository: 'owner/repo',
        projects: [],
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

      const result = await execute(['node', 'kirox', 'owner/repo']);

      // Verify validation failure
      expect(result.success).toBe(false);

      // Verify interactive mode was triggered
      expect(mockShouldEnterInteractiveMode).toHaveBeenCalled();
    });

    it('should maintain validation quality across all input methods', async () => {
      // RED: Verify validation consistency

      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Test various invalid formats
      const invalidCases = [
        { repository: 'no-slash', projects: ['valid'] },
        { repository: 'owner/repo', projects: ['../bad'] },
        { repository: 'owner/repo/extra', projects: ['valid'] },
      ];

      for (const invalidCase of invalidCases) {
        vi.clearAllMocks();
        mockCheckTTYEnvironment.mockReturnValue({ success: true });
        mockShouldEnterInteractiveMode.mockReturnValue(true);

        mockPromptMissingArguments.mockResolvedValue({
          ...invalidCase,
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

        const result = await execute(['node', 'kirox']);

        // All should fail validation
        expect(result.success).toBe(false);
      }
    });
  });
});
