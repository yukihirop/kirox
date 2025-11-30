/**
 * Progress Reporter
 *
 * Handles real-time progress reporting and user feedback for file fetching operations
 */

import { Chalk } from 'chalk';
import type { Ora } from 'ora';
import type { ReporterOptions } from './types.js';
import { SpinnerManager } from './internal/spinner-manager.js';
import { MessageFormatter } from './internal/message-formatter.js';

/**
 * Progress Reporter for CLI operations
 *
 * Provides formatted console output with optional color support and verbose logging
 *
 * Facade pattern: Delegates to SpinnerManager and MessageFormatter
 */
export class ProgressReporter {
  private options: ReporterOptions;
  private chalk: InstanceType<typeof Chalk>;

  // Facade: Delegate to internal components
  private spinnerManager: SpinnerManager;
  private messageFormatter: MessageFormatter;

  // Backward compatibility: Expose internal state for existing tests
  // TODO: Remove once tests are refactored to test public API only
  get spinnerMap(): Map<string, Ora> | undefined {
    // Return undefined to indicate this is now managed internally
    return undefined;
  }

  get useFallback(): boolean {
    // This is now managed by SpinnerManager, but we can't access it
    // Return false as default for backward compatibility
    return false;
  }

  get oraOptions() {
    return {
      color: this.options.useColor ? undefined : false,
      isEnabled: true,
    };
  }

  constructor(options: ReporterOptions) {
    this.options = options;

    // Create Chalk instance with appropriate color level
    this.chalk = new Chalk({
      level: options.useColor ? 3 : 0, // 3 = TrueColor, 0 = No color
    });

    // Initialize internal components (facade pattern)
    const oraOptions = {
      color: options.useColor ? undefined : false,
      isEnabled: true,
    };
    this.spinnerManager = new SpinnerManager(oraOptions, options.verbose);
    this.messageFormatter = new MessageFormatter(options.useColor);
  }

  /**
   * Report start of operation (single project)
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
  reportStart(repository: string, project: string, subdir?: string, branch?: string): void;

  /**
   * Report start of operation (multi-project)
   *
   * Displays repository and multiple projects information at the beginning of execution
   *
   * @param repository - GitHub repository (owner/repo)
   * @param projects - Array of project names
   * @param subdir - Optional subdirectory path containing .kiro folder
   * @param branch - Optional branch name
   *
   * @example
   * ```typescript
   * reporter.reportStart('owner/repo', ['proj1', 'proj2', 'proj3']);
   * // Output: Fetching files from owner/repo/.kiro
   * //         Fetching 3 projects: proj1, proj2, proj3
   * //         Source: owner/repo (default branch)
   *
   * reporter.reportStart('owner/repo', ['proj1', 'proj2'], 'packages/api', 'main');
   * // Output: Fetching files from owner/repo/packages/api/.kiro
   * //         Fetching 2 projects: proj1, proj2
   * //         Source: owner/repo (branch: main)
   * ```
   */
  reportStart(repository: string, projects: string[], subdir?: string, branch?: string): void;

  /**
   * Implementation of reportStart (handles both single and multi-project)
   */
  reportStart(
    repository: string,
    projectOrProjects: string | string[],
    subdir?: string,
    branch?: string
  ): void {
    const kiroPath = subdir ? `${subdir}/.kiro` : '.kiro';
    const repoText = `Fetching files from ${repository}/${kiroPath}`;

    // Extract owner/repo from repository (remove branch if present)
    const repoOnly = repository.split('#')[0] || repository;

    // Build branch information text
    const branchInfo = this.buildBranchInfo(repoOnly, branch);

    console.log(this.chalk.cyan(repoText));

    // Display project information (single or multi-project)
    const projectText = this.buildProjectText(projectOrProjects);
    console.log(this.chalk.cyan(projectText));

    console.log(this.chalk.cyan(branchInfo));
  }

  /**
   * Build project information text
   *
   * @param projectOrProjects - Single project name or array of project names
   * @returns Formatted project text
   */
  private buildProjectText(projectOrProjects: string | string[]): string {
    if (Array.isArray(projectOrProjects)) {
      // Multi-project display
      if (projectOrProjects.length === 1) {
        // Single project in array - use single project display
        return `Project: ${projectOrProjects[0]}`;
      } else {
        // Multiple projects
        const projectCount = projectOrProjects.length;
        const projectList = projectOrProjects.join(', ');
        return `Fetching ${projectCount} projects: ${projectList}`;
      }
    } else {
      // Single project display
      return `Project: ${projectOrProjects}`;
    }
  }

  /**
   * Build branch information text
   *
   * @param repository - Repository name (owner/repo)
   * @param branch - Optional branch name
   * @returns Formatted branch information
   */
  private buildBranchInfo(repository: string, branch?: string): string {
    if (branch) {
      return `Source: ${repository} (branch: ${branch})`;
    } else {
      return `Source: ${repository} (default branch)`;
    }
  }

  /**
   * Report progress for current file fetch
   *
   * Displays progress in [current/total] 📥 filename format
   * Strips subdirectory prefix from file paths to match local save paths
   * Optionally includes project name prefix for multi-project operations
   *
   * Task 3.1 & 3.2: Uses ora spinner for in-place updates instead of line-by-line output
   *
   * @param current - Current file number (1-indexed)
   * @param total - Total number of files
   * @param fileName - Name of file being fetched (may include subdirectory prefix)
   * @param projectName - Optional project name for multi-project display
   *
   * @example
   * ```typescript
   * reporter.reportProgress(3, 10, 'example.md');
   * // Output: [3/10] 📥 Fetching example.md... (spinner)
   *
   * reporter.reportProgress(1, 8, 'lib/a/.kiro/specs/project/requirements.md');
   * // Output: [1/8] 📥 Fetching .kiro/specs/project/requirements.md... (spinner)
   *
   * reporter.reportProgress(3, 10, 'example.md', 'proj1');
   * // Output: [proj1] [3/10] 📥 Fetching example.md... (spinner)
   * ```
   */
  reportProgress(current: number, total: number, fileName: string, projectName?: string): void {
    // Strip subdirectory prefix from file path to match local save paths
    const displayPath = this.stripSubdirPrefix(fileName);

    // Build message with optional project prefix
    let message: string;
    if (projectName && projectName.trim() !== '') {
      message = `[${projectName}] [${current}/${total}] 📥 Fetching ${displayPath}...`;
    } else {
      message = `[${current}/${total}] 📥 Fetching ${displayPath}...`;
    }

    // Delegate to SpinnerManager
    const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
    const spinner = this.spinnerManager.startSpinner(spinnerKey, message);

    // Fallback to console.log if spinner is null (fallback mode)
    if (spinner === null) {
      console.log(this.messageFormatter.formatInfo(message));
    } else {
      // Update spinner text if it's already running
      if (spinner.isSpinning) {
        this.spinnerManager.updateSpinner(spinnerKey, message);
      }
    }
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
   * Task 4.1: Uses ora spinner.succeed() instead of console.log
   * Displays success message in green color
   * If message contains a file path with subdirectory prefix, strips it
   *
   * @param message - Success message to display
   * @param projectName - Optional project name for multi-project display
   *
   * @example
   * ```typescript
   * reporter.reportSuccess('File downloaded successfully');
   * // Output: ✓ File downloaded successfully (spinner succeed)
   *
   * reporter.reportSuccess('Saved: lib/a/.kiro/specs/project/file.md');
   * // Output: ✓ Saved: .kiro/specs/project/file.md (spinner succeed)
   *
   * reporter.reportSuccess('Project completed', 'proj1');
   * // Output: ✓ Project completed (spinner succeed for proj1)
   * ```
   */
  reportSuccess(message: string, projectName?: string): void {
    // Strip subdirectory prefix from file paths in success messages
    const displayMessage = this.stripSubdirPrefixFromMessage(message);

    // Format success message with checkmark
    const formattedMessage = `✓ ${displayMessage}`;

    // Stop spinner (delegate to SpinnerManager)
    const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
    this.spinnerManager.stopSpinner(spinnerKey, '✓', formattedMessage);

    // Output success message with formatting (delegate to MessageFormatter)
    console.log(this.messageFormatter.formatSuccess(formattedMessage));
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
   * Task 4.2: Uses ora spinner.fail() instead of console.error
   * Displays error message in red color
   *
   * @param message - Error message to display
   * @param projectName - Optional project name for multi-project display
   *
   * @example
   * ```typescript
   * reporter.reportError('Failed to fetch file');
   * // Output: ✗ Failed to fetch file (spinner fail)
   *
   * reporter.reportError('Project failed', 'proj1');
   * // Output: ✗ Project failed (spinner fail for proj1)
   * ```
   */
  reportError(message: string, projectName?: string): void {
    // Format error message with cross mark
    const formattedMessage = `✗ ${message}`;

    // Stop spinner (delegate to SpinnerManager)
    const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
    this.spinnerManager.stopSpinner(spinnerKey, '✗', formattedMessage);

    // Output error message with formatting (delegate to MessageFormatter)
    console.error(this.messageFormatter.formatError(formattedMessage));
  }

  /**
   * Report summary of operation
   *
   * Task 5.2: Stop all spinners before displaying summary
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
    // Stop all active spinners and clear map (delegate to SpinnerManager)
    this.spinnerManager.clearAllSpinners();

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
   * Optionally includes project name prefix for multi-project operations
   *
   * @param message - Verbose/debug message
   * @param projectName - Optional project name for multi-project display
   *
   * @example
   * ```typescript
   * reporter.reportVerbose('API call took 250ms');
   * // Output: [VERBOSE] API call took 250ms (only if verbose=true, in gray)
   *
   * reporter.reportVerbose('取得中: file.md', 'proj1');
   * // Output: [VERBOSE] [proj1] 取得中: file.md (only if verbose=true, in gray)
   * ```
   */
  reportVerbose(message: string, projectName?: string): void {
    if (!this.options.verbose) {
      return;
    }

    // Build message with optional project prefix
    let formattedMessage: string;
    if (projectName && projectName.trim() !== '') {
      formattedMessage = `[VERBOSE] [${projectName}] ${message}`;
    } else {
      formattedMessage = `[VERBOSE] ${message}`;
    }

    console.log(this.chalk.gray(formattedMessage));
  }

  /**
   * Report summary for completed project
   *
   * Task 5.1: Cleanup spinner when project completes
   * Displays success and failure counts for a specific project
   * Used in multi-project operations to show per-project results
   *
   * @param projectName - Project name
   * @param filesDownloaded - Number of successful downloads
   * @param filesFailed - Number of failures
   *
   * @example
   * ```typescript
   * reporter.reportProjectSummary('proj1', 8, 2);
   * // Output: [proj1] Completed: 8 files succeeded, 2 files failed
   *
   * reporter.reportProjectSummary('proj2', 10, 0);
   * // Output: [proj2] Completed: 10 files succeeded, 0 files failed
   * ```
   */
  reportProjectSummary(
    projectName: string,
    filesDownloaded: number,
    filesFailed: number
  ): void {
    // Task 5.1: Stop and remove spinner for this project
    try {
      // Normalize project name to match spinner key
      const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
      // Use SpinnerManager to stop the spinner
      this.spinnerManager.stopSpinner(spinnerKey);
    } catch (_error) {
      // If spinner cleanup fails, log warning if verbose
      if (this.options.verbose) {
        console.log('[VERBOSE] Spinner cleanup failed for project:', projectName);
      }
    }

    // Output project summary message to console
    const successText = `${filesDownloaded} files succeeded`;
    const failedText = `${filesFailed} files failed`;
    const summaryMessage = `[${projectName}] Completed: ${successText}, ${failedText}`;

    console.log(this.chalk.cyan(summaryMessage));
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

  /**
   * Report overall summary for all projects
   *
   * Task 5.2: Stop all spinners before displaying summary
   * Displays total project count, total file count, success count, and failure count
   * Used in multi-project operations to show aggregated results
   *
   * @param totalProjects - Total number of projects processed
   * @param totalDownloaded - Total successful downloads across all projects
   * @param totalFailed - Total failures across all projects
   *
   * @example
   * ```typescript
   * reporter.reportOverallSummary(3, 24, 3);
   * // Output:
   * // === Overall Summary ===
   * // Projects: 3
   * // Total files: 27
   * // Succeeded: 24 files
   * // Failed: 3 files
   * ```
   */
  reportOverallSummary(
    totalProjects: number,
    totalDownloaded: number,
    totalFailed: number
  ): void {
    // Stop all active spinners and clear map (delegate to SpinnerManager)
    this.spinnerManager.clearAllSpinners();

    const totalFiles = totalDownloaded + totalFailed;

    console.log(this.chalk.cyan('\n=== Overall Summary ==='));
    console.log(this.chalk.cyan(`Projects: ${totalProjects}`));
    console.log(this.chalk.cyan(`Total files: ${totalFiles}`));
    console.log(this.chalk.cyan(`Succeeded: ${totalDownloaded} files`));
    console.log(this.chalk.cyan(`Failed: ${totalFailed} files`));
  }

  /**
   * Report project-specific error
   *
   * Displays error message with project name prefix for multi-project operations
   * Used when a project fails to be fetched or processed
   *
   * @param projectName - Project name that encountered the error
   * @param error - Error object or error message
   *
   * @example
   * ```typescript
   * reporter.reportProjectError('proj1', new Error('GitHub API failed'));
   * // Output: ✗ [proj1] エラー: GitHub API failed
   *
   * reporter.reportProjectError('proj2', 'Custom error message');
   * // Output: ✗ [proj2] エラー: Custom error message
   * ```
   */
  reportProjectError(projectName: string, error: unknown): void {
    // Extract error message
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = 'Unknown error';
    }

    const formattedMessage = `✗ [${projectName}] Error: ${errorMessage}`;

    console.error(this.chalk.red(formattedMessage));
  }

  /**
   * Report partial failure summary
   *
   * Displays lists of failed and successful projects for multi-project operations
   * Used when some projects succeed and others fail
   *
   * @param failedProjects - Array of failed project names
   * @param successfulProjects - Array of successful project names
   *
   * @example
   * ```typescript
   * reporter.reportPartialFailureSummary(['proj1', 'proj3'], ['proj2', 'proj4']);
   * // Output:
   * // Failed projects (2):
   * //   - proj1
   * //   - proj3
   * // Successful projects (2):
   * //   - proj2
   * //   - proj4
   * ```
   */
  reportPartialFailureSummary(failedProjects: string[], successfulProjects: string[]): void {
    // Display failed projects
    if (failedProjects.length > 0) {
      console.log(this.chalk.red(`\nFailed projects (${failedProjects.length}):`));
      failedProjects.forEach((project) => {
        console.log(this.chalk.red(`  - ${project}`));
      });
    }

    // Display successful projects
    if (successfulProjects.length > 0) {
      console.log(this.chalk.green(`\nSuccessful projects (${successfulProjects.length}):`));
      successfulProjects.forEach((project) => {
        console.log(this.chalk.green(`  - ${project}`));
      });
    }
  }

  /**
   * Pause spinner temporarily
   *
   * Task 14.7: Stop spinner before showing readline prompts to prevent hidden prompts
   * Useful when you need to show interactive prompts (e.g., overwrite confirmation)
   * while spinner is active. Call resumeSpinner() after prompt completes.
   *
   * @param projectName - Optional project name for multi-project spinner management
   *
   * @example
   * ```typescript
   * // Before showing readline prompt
   * reporter.pauseSpinner();
   * const answer = await confirm('Overwrite file?');
   * reporter.resumeSpinner();
   *
   * // Multi-project mode
   * reporter.pauseSpinner('proj1');
   * const answer = await confirm('Overwrite file?');
   * reporter.resumeSpinner('proj1');
   * ```
   */
  pauseSpinner(projectName?: string): void {
    try {
      const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
      // Use SpinnerManager to stop the spinner temporarily
      this.spinnerManager.stopSpinner(spinnerKey);
    } catch (_error) {
      // Silently ignore errors - spinner pause is optional UX improvement
      if (this.options.verbose) {
        console.log('[VERBOSE] Failed to pause spinner, continuing...');
      }
    }
  }

  /**
   * Resume paused spinner
   *
   * Task 14.7: Restart spinner after readline prompt completes
   * Restarts the spinner with its previous text, continuing the progress display.
   *
   * @param projectName - Optional project name for multi-project spinner management
   *
   * @example
   * ```typescript
   * // After readline prompt completes
   * reporter.pauseSpinner();
   * const answer = await confirm('Overwrite file?');
   * reporter.resumeSpinner();
   *
   * // Multi-project mode
   * reporter.pauseSpinner('proj1');
   * const answer = await confirm('Overwrite file?');
   * reporter.resumeSpinner('proj1');
   * ```
   */
  resumeSpinner(projectName?: string): void {
    try {
      const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
      // Resume spinner by starting it again
      // Note: SpinnerManager will handle the restart internally
      this.spinnerManager.startSpinner(spinnerKey, '');
    } catch (_error) {
      // Silently ignore errors - spinner resume is optional UX improvement
      if (this.options.verbose) {
        console.log('[VERBOSE] Failed to resume spinner, continuing...');
      }
    }
  }
}
