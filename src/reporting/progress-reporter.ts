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
   * @param subdir - Optional subdirectory path containing .kiro folder
   * @param branch - Optional branch name
   *
   * @example
   * ```typescript
   * reporter.reportStart('owner/repo', 'my-project');
   * // Output: Fetching files from owner/repo/.kiro
   * //         Project: my-project
   * //         Source: owner/repo (default branch)
   *
   * reporter.reportStart('owner/repo', 'my-project', 'packages/api', 'feature-branch');
   * // Output: Fetching files from owner/repo/packages/api/.kiro
   * //         Project: my-project
   * //         Source: owner/repo (branch: feature-branch)
   * ```
   */
  reportStart(repository: string, project: string, subdir?: string, branch?: string): void {
    const kiroPath = subdir ? `${subdir}/.kiro` : '.kiro';
    const repoText = `Fetching files from ${repository}/${kiroPath}`;
    const projectText = `Project: ${project}`;

    // Extract owner/repo from repository (remove branch if present)
    const repoOnly = repository.split('#')[0];

    // Build branch information text
    let branchInfo: string;
    if (branch) {
      branchInfo = `Source: ${repoOnly} (branch: ${branch})`;
    } else {
      branchInfo = `Source: ${repoOnly} (default branch)`;
    }

    console.log(this.chalk.cyan(repoText));
    console.log(this.chalk.cyan(projectText));
    console.log(this.chalk.cyan(branchInfo));
  }

  /**
   * Report progress for current file fetch
   *
   * Displays progress in [current/total] filename format
   * Strips subdirectory prefix from file paths to match local save paths
   *
   * @param current - Current file number (1-indexed)
   * @param total - Total number of files
   * @param fileName - Name of file being fetched (may include subdirectory prefix)
   *
   * @example
   * ```typescript
   * reporter.reportProgress(3, 10, 'example.md');
   * // Output: [3/10] Fetching example.md...
   *
   * reporter.reportProgress(1, 8, 'lib/a/.kiro/specs/project/requirements.md');
   * // Output: [1/8] Fetching .kiro/specs/project/requirements.md...
   * ```
   */
  reportProgress(current: number, total: number, fileName: string): void {
    // Strip subdirectory prefix from file path to match local save paths
    // Example: lib/a/.kiro/specs/project/file.md -> .kiro/specs/project/file.md
    const displayPath = this.stripSubdirPrefix(fileName);
    const message = `[${current}/${total}] Fetching ${displayPath}...`;

    console.log(this.chalk.cyan(message));
  }

  /**
   * Strip subdirectory prefix from file path
   *
   * Removes subdirectory prefix before .kiro/ to match local save paths.
   * If path doesn't contain .kiro/, returns the original path.
   *
   * @param filePath - File path (may include subdirectory prefix)
   * @returns Path without subdirectory prefix
   *
   * @example
   * ```typescript
   * stripSubdirPrefix('lib/a/.kiro/specs/project/file.md')
   * // Returns: '.kiro/specs/project/file.md'
   *
   * stripSubdirPrefix('.kiro/specs/project/file.md')
   * // Returns: '.kiro/specs/project/file.md'
   * ```
   */
  private stripSubdirPrefix(filePath: string): string {
    const kiroIndex = filePath.indexOf('.kiro/');
    if (kiroIndex === -1) {
      return filePath;
    }
    return filePath.substring(kiroIndex);
  }

  /**
   * Report success message
   *
   * Displays success message in green color
   * If message contains a file path with subdirectory prefix, strips it
   *
   * @param message - Success message to display
   *
   * @example
   * ```typescript
   * reporter.reportSuccess('File downloaded successfully');
   * // Output: ✓ File downloaded successfully (in green)
   *
   * reporter.reportSuccess('Saved: lib/a/.kiro/specs/project/file.md');
   * // Output: ✓ Saved: .kiro/specs/project/file.md (in green)
   * ```
   */
  reportSuccess(message: string): void {
    // Strip subdirectory prefix from file paths in success messages
    const displayMessage = this.stripSubdirPrefixFromMessage(message);
    const formattedMessage = `✓ ${displayMessage}`;

    console.log(this.chalk.green(formattedMessage));
  }

  /**
   * Strip subdirectory prefix from message containing file paths
   *
   * @param message - Message that may contain file paths
   * @returns Message with subdirectory prefixes stripped
   */
  private stripSubdirPrefixFromMessage(message: string): string {
    // If message contains .kiro/, strip subdirectory prefix
    const kiroIndex = message.indexOf('.kiro/');
    if (kiroIndex === -1) {
      return message;
    }

    // Find the start of the path (after "Saved: " or similar prefix)
    const pathStartIndex = message.lastIndexOf(' ', kiroIndex) + 1;
    const prefix = message.substring(0, pathStartIndex);
    const filePath = message.substring(pathStartIndex);
    const displayPath = this.stripSubdirPrefix(filePath);

    return prefix + displayPath;
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
   * @param subdir - Optional subdirectory path
   * @param branch - Optional branch name
   *
   * @example
   * ```typescript
   * reporter.reportSummary(8, 2);
   * // Output: Summary:
   * //         Source: (default branch)
   * //         8 files succeeded (in green)
   * //         2 files failed (in red)
   *
   * reporter.reportSummary(8, 2, 'packages/api');
   * // Output: Summary:
   * //         Fetched from: packages/api
   * //         Source: (default branch)
   * //         8 files succeeded (in green)
   * //         2 files failed (in red)
   *
   * reporter.reportSummary(8, 2, undefined, 'feature-branch');
   * // Output: Summary:
   * //         Source: (branch: feature-branch)
   * //         8 files succeeded (in green)
   * //         2 files failed (in red)
   * ```
   */
  reportSummary(success: number, failed: number, subdir?: string, branch?: string): void {
    console.log('\nSummary:');

    if (subdir) {
      console.log(this.chalk.cyan(`  Fetched from: ${subdir}`));
    }

    // Build branch information text
    let branchInfo: string;
    if (branch) {
      branchInfo = `  Source: (branch: ${branch})`;
    } else {
      branchInfo = `  Source: (default branch)`;
    }
    console.log(this.chalk.cyan(branchInfo));

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
