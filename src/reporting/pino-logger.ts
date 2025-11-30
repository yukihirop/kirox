import pino from 'pino';
import type { ErrorResult } from './types.js';

interface PinoLoggerOptions {
  timestamp?: boolean;
  formatMessage?: boolean;
}

export class PinoLogger {
  private pino: pino.Logger;

  constructor(verbose: boolean, options?: PinoLoggerOptions) {
    this.pino = pino({
      level: verbose ? 'debug' : 'info',
      timestamp: options?.timestamp !== false,
    });
  }

  info(message: string, details?: Record<string, unknown>): void {
    this.pino.info(details, message);
  }

  warn(message: string, details?: Record<string, unknown>): void {
    this.pino.warn(details, message);
  }

  error(message: string, details?: Record<string, unknown>): void {
    this.pino.error(details, message);
  }

  debug(message: string, details?: Record<string, unknown>): void {
    this.pino.debug(details, message);
  }

  verbose(message: string, details?: Record<string, unknown>): void {
    this.debug(message, details);
  }

  formatTimestamp(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  formatLogMessage(level: string, message: string, details?: unknown): string {
    const timestamp = this.formatTimestamp();
    const detailsStr = details !== undefined ? ` ${JSON.stringify(details)}` : '';
    return `[${level}] ${timestamp} ${message}${detailsStr}`;
  }

  logError(errorResult: ErrorResult): void {
    const { type, message, exitCode, recoverable } = errorResult;

    const errorMessage = `${type}: ${message}`;
    const details = { exitCode };

    if (recoverable) {
      this.warn(errorMessage, details);
    } else {
      this.error(errorMessage, details);
    }
  }
}
