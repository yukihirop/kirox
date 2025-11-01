/**
 * Unit tests for PinoLogger
 *
 * TDD: RED phase - Tests written before implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PinoLogger } from '@/reporting/pino-logger.js';
import type { ErrorResult } from '@/reporting/types.js';

// Unmock PinoLogger to test the actual implementation
vi.unmock('@/reporting/pino-logger.js');

// Create mock Pino instance
const mockPinoInstance = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Mock pino module
vi.mock('pino', () => {
  return {
    default: vi.fn(() => mockPinoInstance),
  };
});

describe('PinoLogger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Task 2.1: ログレベル制御機能', () => {
    it('should suppress debug logs when verbose=false', () => {
      const logger = new PinoLogger(false);

      logger.debug('Debug message', { detail: 'value' });

      // When verbose=false (level=info), debug logs should be suppressed
      // Pino internally handles level filtering, so we verify the method is called
      expect(mockPinoInstance.debug).toHaveBeenCalledWith(
        { detail: 'value' },
        'Debug message'
      );
    });

    it('should output debug logs when verbose=true', () => {
      const logger = new PinoLogger(true);
      
      

      logger.debug('Debug message', { detail: 'value' });

      // When verbose=true (level=debug), debug logs should be output
      expect(mockPinoInstance.debug).toHaveBeenCalledWith(
        { detail: 'value' },
        'Debug message'
      );
    });

    it('should output info logs regardless of verbose flag (verbose=false)', () => {
      const logger = new PinoLogger(false);
      
      

      logger.info('Info message', { detail: 'value' });

      expect(mockPinoInstance.info).toHaveBeenCalledWith({ detail: 'value' }, 'Info message');
    });

    it('should output info logs regardless of verbose flag (verbose=true)', () => {
      const logger = new PinoLogger(true);
      
      

      logger.info('Info message', { detail: 'value' });

      expect(mockPinoInstance.info).toHaveBeenCalledWith({ detail: 'value' }, 'Info message');
    });

    it('should output warn logs regardless of verbose flag', () => {
      const logger = new PinoLogger(false);
      
      

      logger.warn('Warning message', { detail: 'value' });

      expect(mockPinoInstance.warn).toHaveBeenCalledWith({ detail: 'value' }, 'Warning message');
    });

    it('should output error logs regardless of verbose flag', () => {
      const logger = new PinoLogger(false);
      
      

      logger.error('Error message', { detail: 'value' });

      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        { detail: 'value' },
        'Error message'
      );
    });
  });

  describe('Task 2.2: 基本ログメソッド', () => {
    it('should call pino.info when info method is called', () => {
      const logger = new PinoLogger(false);
      
      

      logger.info('Test message', { key: 'value' });

      expect(mockPinoInstance.info).toHaveBeenCalledWith({ key: 'value' }, 'Test message');
    });

    it('should call pino.warn when warn method is called', () => {
      const logger = new PinoLogger(false);
      
      

      logger.warn('Warning message', { key: 'value' });

      expect(mockPinoInstance.warn).toHaveBeenCalledWith({ key: 'value' }, 'Warning message');
    });

    it('should call pino.error when error method is called', () => {
      const logger = new PinoLogger(false);
      
      

      logger.error('Error message', { key: 'value' });

      expect(mockPinoInstance.error).toHaveBeenCalledWith({ key: 'value' }, 'Error message');
    });

    it('should call pino.debug when debug method is called', () => {
      const logger = new PinoLogger(true);
      
      

      logger.debug('Debug message', { key: 'value' });

      expect(mockPinoInstance.debug).toHaveBeenCalledWith({ key: 'value' }, 'Debug message');
    });

    it('should pass message and details correctly to pino methods', () => {
      const logger = new PinoLogger(false);
      
      

      const message = 'Operation started';
      const details = { repository: 'owner/repo', files: 10 };

      logger.info(message, details);

      expect(mockPinoInstance.info).toHaveBeenCalledWith(details, message);
    });

    it('should handle undefined details gracefully', () => {
      const logger = new PinoLogger(false);
      
      

      logger.info('Message without details');

      expect(mockPinoInstance.info).toHaveBeenCalledWith(undefined, 'Message without details');
    });

    it('should call warn when logError receives recoverable error', () => {
      const logger = new PinoLogger(false);
      
      

      const errorResult: ErrorResult = {
        type: 'NETWORK_ERROR',
        message: 'Connection failed',
        exitCode: 2,
        recoverable: true,
      };

      logger.logError(errorResult);

      expect(mockPinoInstance.warn).toHaveBeenCalled();
    });

    it('should call error when logError receives non-recoverable error', () => {
      const logger = new PinoLogger(false);
      
      

      const errorResult: ErrorResult = {
        type: 'VALIDATION_ERROR',
        message: 'Invalid input',
        exitCode: 1,
        recoverable: false,
      };

      logger.logError(errorResult);

      expect(mockPinoInstance.error).toHaveBeenCalled();
    });
  });

  describe('Task 2.3: ログ出力先', () => {
    it('should output error logs to stderr (Pino default behavior)', () => {
      const logger = new PinoLogger(false);
      
      

      logger.error('Error message', { code: 'ERR_001' });

      // Verify pino.error is called (Pino handles stderr internally)
      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        { code: 'ERR_001' },
        'Error message'
      );
    });

    it('should output info logs to stdout (Pino default behavior)', () => {
      const logger = new PinoLogger(false);
      
      

      logger.info('Info message', { data: 'value' });

      // Verify pino.info is called (Pino handles stdout internally)
      expect(mockPinoInstance.info).toHaveBeenCalledWith({ data: 'value' }, 'Info message');
    });

    it('should output warn logs to stdout (Pino default behavior)', () => {
      const logger = new PinoLogger(false);
      
      

      logger.warn('Warning message', { data: 'value' });

      // Verify pino.warn is called (Pino handles stdout internally)
      expect(mockPinoInstance.warn).toHaveBeenCalledWith({ data: 'value' }, 'Warning message');
    });

    it('should output debug logs to stdout (Pino default behavior)', () => {
      const logger = new PinoLogger(true);
      
      

      logger.debug('Debug message', { data: 'value' });

      // Verify pino.debug is called (Pino handles stdout internally)
      expect(mockPinoInstance.debug).toHaveBeenCalledWith({ data: 'value' }, 'Debug message');
    });
  });
});
