/**
 * Global Test Setup
 *
 * Vitest global configuration and mock definitions
 */

import { vi } from 'vitest';

/**
 * PinoLogger Global Mock
 *
 * Provides consistent mock implementation across all test files
 * - Exports PinoLogger as a vi.fn() constructor for vi.mocked() compatibility
 * - All methods (info, warn, error, debug, verbose, logError, formatTimestamp, formatLogMessage) are spy functions
 */
vi.mock('@/reporting/pino-logger.js', () => ({
  PinoLogger: vi.fn().mockImplementation((verbose: boolean, options?: unknown) => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
    logError: vi.fn(),
    formatTimestamp: vi.fn(),
    formatLogMessage: vi.fn(),
  })),
}));
