/**
 * Unit tests for MessageFormatter
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('MessageFormatter', () => {
  describe('constructor', () => {
    it('should initialize with color enabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(true);

      expect(formatter).toBeDefined();
    });

    it('should initialize with color disabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(false);

      expect(formatter).toBeDefined();
    });
  });

  describe('formatSuccess', () => {
    it('should format success message with green color when color is enabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(true);
      const result = formatter.formatSuccess('Operation completed');

      // Check that the result contains ANSI color codes for green
      expect(result).toContain('Operation completed');
      expect(result).toMatch(/\x1b\[3\dm/); // Green color code
    });

    it('should format success message without color when color is disabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(false);
      const result = formatter.formatSuccess('Operation completed');

      // Check that the result does not contain ANSI color codes
      expect(result).toBe('Operation completed');
      expect(result).not.toMatch(/\x1b\[/);
    });
  });

  describe('formatError', () => {
    it('should format error message with red color when color is enabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(true);
      const result = formatter.formatError('Operation failed');

      // Check that the result contains ANSI color codes for red
      expect(result).toContain('Operation failed');
      expect(result).toMatch(/\x1b\[3\dm/); // Red color code
    });

    it('should format error message without color when color is disabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(false);
      const result = formatter.formatError('Operation failed');

      // Check that the result does not contain ANSI color codes
      expect(result).toBe('Operation failed');
      expect(result).not.toMatch(/\x1b\[/);
    });
  });

  describe('formatProgress', () => {
    it('should format progress message with cyan color when color is enabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(true);
      const result = formatter.formatProgress('file.txt', 1, 10);

      // Check that the result contains file name and progress
      expect(result).toContain('file.txt');
      expect(result).toContain('1');
      expect(result).toContain('10');
      expect(result).toMatch(/\x1b\[3\dm/); // Cyan color code
    });

    it('should format progress message without color when color is disabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(false);
      const result = formatter.formatProgress('file.txt', 1, 10);

      // Check that the result contains file name and progress
      expect(result).toContain('file.txt');
      expect(result).toContain('1');
      expect(result).toContain('10');
      expect(result).not.toMatch(/\x1b\[/);
    });
  });

  describe('formatInfo', () => {
    it('should format info message with cyan color when color is enabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(true);
      const result = formatter.formatInfo('Information');

      expect(result).toContain('Information');
      expect(result).toMatch(/\x1b\[3\dm/); // Cyan color code
    });

    it('should format info message without color when color is disabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(false);
      const result = formatter.formatInfo('Information');

      expect(result).toBe('Information');
      expect(result).not.toMatch(/\x1b\[/);
    });
  });

  describe('formatWarning', () => {
    it('should format warning message with yellow color when color is enabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(true);
      const result = formatter.formatWarning('Warning message');

      expect(result).toContain('Warning message');
      expect(result).toMatch(/\x1b\[3\dm/); // Yellow color code
    });

    it('should format warning message without color when color is disabled', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(false);
      const result = formatter.formatWarning('Warning message');

      expect(result).toBe('Warning message');
      expect(result).not.toMatch(/\x1b\[/);
    });
  });

  describe('Color consistency', () => {
    it('should use the same color flag across all format methods', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatterWithColor = new MessageFormatter(true);
      const formatterWithoutColor = new MessageFormatter(false);

      // All methods with color
      expect(formatterWithColor.formatSuccess('test')).toMatch(/\x1b\[/);
      expect(formatterWithColor.formatError('test')).toMatch(/\x1b\[/);
      expect(formatterWithColor.formatInfo('test')).toMatch(/\x1b\[/);
      expect(formatterWithColor.formatWarning('test')).toMatch(/\x1b\[/);

      // All methods without color
      expect(formatterWithoutColor.formatSuccess('test')).not.toMatch(/\x1b\[/);
      expect(formatterWithoutColor.formatError('test')).not.toMatch(/\x1b\[/);
      expect(formatterWithoutColor.formatInfo('test')).not.toMatch(/\x1b\[/);
      expect(formatterWithoutColor.formatWarning('test')).not.toMatch(/\x1b\[/);
    });
  });

  describe('Return type validation', () => {
    it('should always return string type', async () => {
      const { MessageFormatter } = await import('../../../../src/reporting/internal/message-formatter.js');

      const formatter = new MessageFormatter(true);

      expect(typeof formatter.formatSuccess('test')).toBe('string');
      expect(typeof formatter.formatError('test')).toBe('string');
      expect(typeof formatter.formatProgress('file', 1, 10)).toBe('string');
      expect(typeof formatter.formatInfo('test')).toBe('string');
      expect(typeof formatter.formatWarning('test')).toBe('string');
    });
  });
});
