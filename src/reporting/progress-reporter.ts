/**
 * Progress Reporter
 *
 * Handles real-time progress reporting and user feedback for file fetching operations
 */

import { Chalk } from 'chalk';
import type { ReporterOptions } from './types.js';

/**
 * Progress Reporter for CLI operations
 *
 * Provides formatted console output with optional color support and verbose logging
 */
export class ProgressReporter {
  private options: ReporterOptions;
  private chalk: InstanceType<typeof Chalk>;

  constructor(options: ReporterOptions) {
    this.options = options;

    // Create Chalk instance with appropriate color level
    this.chalk = new Chalk({
      level: options.useColor ? 3 : 0, // 3 = TrueColor, 0 = No color
    });
  }

  /**
   * Report start of operation
   *
   * Displays repository and project information at the beginning of execution
   *
   * @param repository - GitHub repository (owner/repo)
   * @param project - Project name
   *
   * @example
   * ```typescript
   * reporter.reportStart('owner/repo', 'my-project');
   * // Output: Fetching files from owner/repo
   * //         Project: my-project
   * ```
   */
  reportStart(repository: string, project: string): void {
    const repoText = `Fetching files from ${repository}`;
    const projectText = `Project: ${project}`;

    console.log(this.chalk.cyan(repoText));
    console.log(this.chalk.cyan(projectText));
  }

  /**
   * Report progress for current file fetch
   *
   * Displays progress in [current/total] filename format
   *
   * @param current - Current file number (1-indexed)
   * @param total - Total number of files
   * @param fileName - Name of file being fetched
   *
   * @example
   * ```typescript
   * reporter.reportProgress(3, 10, 'example.md');
   * // Output: [3/10] Fetching example.md...
   * ```
   */
  reportProgress(current: number, total: number, fileName: string): void {
    const message = `[${current}/${total}] Fetching ${fileName}...`;

    console.log(this.chalk.cyan(message));
  }

  /**
   * Report success message
   *
   * Displays success message in green color
   *
   * @param message - Success message to display
   *
   * @example
   * ```typescript
   * reporter.reportSuccess('File downloaded successfully');
   * // Output: ✓ File downloaded successfully (in green)
   * ```
   */
  reportSuccess(message: string): void {
    const formattedMessage = `✓ ${message}`;

    console.log(this.chalk.green(formattedMessage));
  }

  /**
   * Report error message
   *
   * Displays error message in red color
   *
   * @param message - Error message to display
   *
   * @example
   * ```typescript
   * reporter.reportError('Failed to fetch file');
   * // Output: ✗ Failed to fetch file (in red)
   * ```
   */
  reportError(message: string): void {
    const formattedMessage = `✗ ${message}`;

    console.error(this.chalk.red(formattedMessage));
  }

  /**
   * Report summary of operation
   *
   * Displays success and failed counts with appropriate colors
   *
   * @param success - Number of successful operations
   * @param failed - Number of failed operations
   *
   * @example
   * ```typescript
   * reporter.reportSummary(8, 2);
   * // Output: Summary:
   * //         8 files succeeded (in green)
   * //         2 files failed (in red)
   * ```
   */
  reportSummary(success: number, failed: number): void {
    console.log('\nSummary:');

    console.log(this.chalk.green(`  ${success} files succeeded`));
    console.log(this.chalk.red(`  ${failed} files failed`));
  }

  /**
   * Report verbose message
   *
   * Only displays message if verbose option is enabled
   * Uses gray color to differentiate from regular output
   *
   * @param message - Verbose/debug message
   *
   * @example
   * ```typescript
   * reporter.reportVerbose('API call took 250ms');
   * // Output: [VERBOSE] API call took 250ms (only if verbose=true, in gray)
   * ```
   */
  reportVerbose(message: string): void {
    if (!this.options.verbose) {
      return;
    }

    const formattedMessage = `[VERBOSE] ${message}`;

    console.log(this.chalk.gray(formattedMessage));
  }

  /**
   * Report dry-run file list
   *
   * Displays list of files that would be fetched in dry-run mode
   *
   * @param files - Array of file paths to be fetched
   *
   * @example
   * ```typescript
   * reporter.reportDryRunFileList(['file1.md', 'file2.md']);
   * // Output: [DRY-RUN] Would fetch 2 files:
   * //           - file1.md
   * //           - file2.md
   * ```
   */
  reportDryRunFileList(files: string[]): void {
    const count = files.length;
    const headerMessage = `\n[DRY-RUN] Would fetch ${count} file${count !== 1 ? 's' : ''}:`;

    console.log(this.chalk.cyan(headerMessage));

    if (count === 0) {
      console.log(this.chalk.gray('  (no files to fetch)'));
      return;
    }

    files.forEach((file) => {
      console.log(this.chalk.cyan(`  - ${file}`));
    });
  }
}
