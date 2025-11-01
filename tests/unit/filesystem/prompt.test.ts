/**
 * Unit tests for prompt service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createInterface } from 'readline';
import { confirm } from '@/filesystem/prompt.js';

// Mock readline module
vi.mock('readline', () => ({
  createInterface: vi.fn(),
}));

describe('PromptService', () => {
  let mockRl: {
    question: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRl = {
      question: vi.fn(),
      close: vi.fn(),
    };

    vi.mocked(createInterface).mockReturnValue(mockRl as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('confirm', () => {
    it('should return true when user inputs "y"', async () => {
      mockRl.question.mockImplementation((_question: string, callback: (answer: string) => void) => {
        callback('y');
      });

      const result = await confirm('Overwrite file?');

      expect(result).toBe(true);
      expect(mockRl.question).toHaveBeenCalled();
      expect(mockRl.close).toHaveBeenCalled();
    });

    it('should return true when user inputs "Y"', async () => {
      mockRl.question.mockImplementation((_question: string, callback: (answer: string) => void) => {
        callback('Y');
      });

      const result = await confirm('Overwrite file?');

      expect(result).toBe(true);
    });

    it('should return true when user inputs "yes"', async () => {
      mockRl.question.mockImplementation((_question: string, callback: (answer: string) => void) => {
        callback('yes');
      });

      const result = await confirm('Overwrite file?');

      expect(result).toBe(true);
    });

    it('should return false when user inputs "n"', async () => {
      mockRl.question.mockImplementation((_question: string, callback: (answer: string) => void) => {
        callback('n');
      });

      const result = await confirm('Overwrite file?');

      expect(result).toBe(false);
    });

    it('should return false when user inputs "N"', async () => {
      mockRl.question.mockImplementation((_question: string, callback: (answer: string) => void) => {
        callback('N');
      });

      const result = await confirm('Overwrite file?');

      expect(result).toBe(false);
    });

    it('should return false when user inputs "no"', async () => {
      mockRl.question.mockImplementation((_question: string, callback: (answer: string) => void) => {
        callback('no');
      });

      const result = await confirm('Overwrite file?');

      expect(result).toBe(false);
    });

    it('should return false for empty input', async () => {
      mockRl.question.mockImplementation((_question: string, callback: (answer: string) => void) => {
        callback('');
      });

      const result = await confirm('Overwrite file?');

      expect(result).toBe(false);
    });

    it('should return false for invalid input', async () => {
      mockRl.question.mockImplementation((_question: string, callback: (answer: string) => void) => {
        callback('maybe');
      });

      const result = await confirm('Overwrite file?');

      expect(result).toBe(false);
    });

    it('should close readline interface after getting answer', async () => {
      mockRl.question.mockImplementation((_question: string, callback: (answer: string) => void) => {
        callback('y');
      });

      await confirm('Overwrite file?');

      expect(mockRl.close).toHaveBeenCalledTimes(1);
    });

    it('should display the provided message', async () => {
      const message = 'Do you want to overwrite existing file?';
      mockRl.question.mockImplementation((question: string, callback: (answer: string) => void) => {
        expect(question).toContain(message);
        callback('y');
      });

      await confirm(message);

      expect(mockRl.question).toHaveBeenCalled();
    });
  });
});
