/**
 * Unit tests for Logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '@/reporting/logger';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('info', () => {
    it('should log INFO level message to stdout', () => {
      const logger = new Logger();

      logger.info('Test information message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[INFO\].*Test information message/)
      );
    });

    it('should include timestamp in INFO log', () => {
      const logger = new Logger();

      logger.info('Message with timestamp');

      const calls = consoleLogSpy.mock.calls.flat();
      const hasTimestamp = calls.some((arg) =>
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(String(arg))
      );

      expect(hasTimestamp).toBe(true);
    });

    it('should not log to stderr for INFO level', () => {
      const logger = new Logger();

      logger.info('Info message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log WARN level message to stdout', () => {
      const logger = new Logger();

      logger.warn('Test warning message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[WARN\].*Test warning message/)
      );
    });

    it('should include timestamp in WARN log', () => {
      const logger = new Logger();

      logger.warn('Warning with timestamp');

      const calls = consoleLogSpy.mock.calls.flat();
      const hasTimestamp = calls.some((arg) =>
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(String(arg))
      );

      expect(hasTimestamp).toBe(true);
    });

    it('should not log to stderr for WARN level', () => {
      const logger = new Logger();

      logger.warn('Warning message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log ERROR level message to stderr', () => {
      const logger = new Logger();

      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[ERROR\].*Test error message/)
      );
    });

    it('should include timestamp in ERROR log', () => {
      const logger = new Logger();

      logger.error('Error with timestamp');

      const calls = consoleErrorSpy.mock.calls.flat();
      const hasTimestamp = calls.some((arg) =>
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(String(arg))
      );

      expect(hasTimestamp).toBe(true);
    });

    it('should not log to stdout for ERROR level', () => {
      const logger = new Logger();

      logger.error('Error message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should include error details if provided', () => {
      const logger = new Logger();
      const errorDetails = { code: 'ERR_001', file: 'test.md' };

      logger.error('Error occurred', errorDetails);

      const calls = consoleErrorSpy.mock.calls.flat();
      const hasDetails = calls.some((arg) => String(arg).includes('ERR_001'));

      expect(hasDetails).toBe(true);
    });
  });

  describe('logError', () => {
    it('should log recoverable error with WARN level', () => {
      const logger = new Logger();
      const errorResult = {
        type: 'NETWORK_ERROR' as const,
        message: 'Connection failed',
        exitCode: 2,
        recoverable: true,
      };

      logger.logError(errorResult);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[WARN\].*NETWORK_ERROR.*Connection failed/)
      );
    });

    it('should log fatal error with ERROR level', () => {
      const logger = new Logger();
      const errorResult = {
        type: 'VALIDATION_ERROR' as const,
        message: 'Invalid input',
        exitCode: 1,
        recoverable: false,
      };

      logger.logError(errorResult);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[ERROR\].*VALIDATION_ERROR.*Invalid input/)
      );
    });

    it('should include exit code in error log', () => {
      const logger = new Logger();
      const errorResult = {
        type: 'ACCESS_DENIED' as const,
        message: 'Permission denied',
        exitCode: 1,
        recoverable: false,
      };

      logger.logError(errorResult);

      const calls = consoleErrorSpy.mock.calls.flat();
      // JSON format: {"exitCode":1}
      const hasExitCode = calls.some((arg) =>
        String(arg).includes('"exitCode":1')
      );

      expect(hasExitCode).toBe(true);
    });

    it('should include error type in log', () => {
      const logger = new Logger();
      const errorResult = {
        type: 'RATE_LIMIT' as const,
        message: 'API limit reached',
        exitCode: 2,
        recoverable: true,
      };

      logger.logError(errorResult);

      const calls = consoleLogSpy.mock.calls.flat();
      const hasType = calls.some((arg) => String(arg).includes('RATE_LIMIT'));

      expect(hasType).toBe(true);
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp in ISO 8601 format', () => {
      const logger = new Logger();
      const testDate = new Date('2025-10-06T12:00:00Z');

      const formatted = logger.formatTimestamp(testDate);

      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('formatLogMessage', () => {
    it('should format log message with level and timestamp', () => {
      const logger = new Logger();
      const message = 'Test message';
      const level = 'INFO';

      const formatted = logger.formatLogMessage(level, message);

      expect(formatted).toMatch(/\[INFO\]/);
      expect(formatted).toContain('Test message');
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include details in formatted message if provided', () => {
      const logger = new Logger();
      const message = 'Operation failed';
      const level = 'ERROR';
      const details = { reason: 'timeout', duration: 30000 };

      const formatted = logger.formatLogMessage(level, message, details);

      expect(formatted).toContain('timeout');
      expect(formatted).toContain('30000');
    });

    it('should handle undefined details gracefully', () => {
      const logger = new Logger();
      const message = 'Simple message';
      const level = 'INFO';

      const formatted = logger.formatLogMessage(level, message);

      expect(formatted).toMatch(/\[INFO\]/);
      expect(formatted).toContain('Simple message');
    });
  });
});
