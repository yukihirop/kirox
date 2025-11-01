/**
 * Interactive Mode Multi-Project Prompt Tests
 *
 * Tests for multi-project support in interactive prompts.
 * Task 5.1: プロジェクト名入力プロンプトのメッセージを更新
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptProject } from '../../../src/cli/interactive-prompt.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

describe('Interactive Mode Multi-Project Support', () => {
  let mockInput: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Import mocked functions
    const inquirerPrompts = await import('@inquirer/prompts');
    mockInput = inquirerPrompts.input as ReturnType<typeof vi.fn>;

    // Reset mocks
    mockInput.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('promptProject - multi-project message', () => {
    it('should display message with comma-separated instruction', async () => {
      // RED: Test that prompt message includes multi-project instruction
      // Expected message: 'Enter project name (comma-separated for multiple projects)'
      mockInput.mockResolvedValueOnce('project1');

      await promptProject('');

      expect(mockInput).toHaveBeenCalledWith({
        message: '📋 Enter project name (comma-separated for multiple projects)',
        validate: expect.any(Function),
      });
    });

    it('should accept single project name input', async () => {
      // User enters single project name
      mockInput.mockResolvedValueOnce('single-project');

      const result = await promptProject('');

      expect(result).toBe('single-project');
      expect(mockInput).toHaveBeenCalled();
    });

    it('should accept comma-separated multiple project names', async () => {
      // User enters multiple project names
      mockInput.mockResolvedValueOnce('project1, project2, project3');

      const result = await promptProject('');

      expect(result).toBe('project1, project2, project3');
      expect(mockInput).toHaveBeenCalled();
    });

    it('should skip prompt when valid project name is already provided', async () => {
      // When project is already provided, should return immediately
      const result = await promptProject('existing-project');

      expect(result).toBe('existing-project');
      expect(mockInput).not.toHaveBeenCalled();
    });

    it('should validate project name input', async () => {
      // Mock validation function
      mockInput.mockResolvedValueOnce('valid-project');

      await promptProject('');

      // Verify validate function is passed
      const callArgs = mockInput.mock.calls[0]?.[0];
      expect(callArgs.validate).toBeInstanceOf(Function);
    });
  });
});
