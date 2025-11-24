/**
 * Message Formatter
 *
 * Formats messages with color using chalk
 */

import { Chalk } from 'chalk';

/**
 * MessageFormatter
 *
 * Provides unified message formatting with color support
 */
export class MessageFormatter {
  private readonly chalk: InstanceType<typeof Chalk>;

  constructor(useColor: boolean) {
    // Create Chalk instance with appropriate color level
    this.chalk = new Chalk({
      level: useColor ? 3 : 0, // 3 = TrueColor, 0 = No color
    });
  }

  /**
   * Format success message (green)
   *
   * @param message - Message to format
   * @returns Formatted success message
   */
  formatSuccess(message: string): string {
    return this.chalk.green(message);
  }

  /**
   * Format error message (red)
   *
   * @param message - Message to format
   * @returns Formatted error message
   */
  formatError(message: string): string {
    return this.chalk.red(message);
  }

  /**
   * Format progress message (cyan)
   *
   * @param fileName - File name being processed
   * @param current - Current file number
   * @param total - Total number of files
   * @returns Formatted progress message
   */
  formatProgress(fileName: string, current: number, total: number): string {
    const message = `[${current}/${total}] 📥 Fetching ${fileName}...`;
    return this.chalk.cyan(message);
  }

  /**
   * Format info message (cyan)
   *
   * @param message - Message to format
   * @returns Formatted info message
   */
  formatInfo(message: string): string {
    return this.chalk.cyan(message);
  }

  /**
   * Format warning message (yellow)
   *
   * @param message - Message to format
   * @returns Formatted warning message
   */
  formatWarning(message: string): string {
    return this.chalk.yellow(message);
  }
}
