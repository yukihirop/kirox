import { Chalk } from 'chalk';
import type { Ora } from 'ora';
import type { ReporterOptions } from './types.js';
import { SpinnerManager } from './internal/spinner-manager.js';
import { MessageFormatter } from './internal/message-formatter.js';

export class ProgressReporter {
  private options: ReporterOptions;
  private chalk: InstanceType<typeof Chalk>;

  private spinnerManager: SpinnerManager;
  private messageFormatter: MessageFormatter;

  get spinnerMap(): Map<string, Ora> {
    return this.spinnerManager.getSpinnerMap();
  }

  get useFallback(): boolean {
    return this.spinnerManager.getUseFallback();
  }

  set useFallback(value: boolean) {
    if (value) {
      (this.spinnerManager as any).state = {
        ...(this.spinnerManager as any).state,
        useFallback: value,
      };
    }
  }

  get oraOptions() {
    return {
      color: this.options.useColor ? undefined : false,
      isEnabled: true,
    };
  }

  constructor(options: ReporterOptions) {
    this.options = options;

    this.chalk = new Chalk({
      level: options.useColor ? 3 : 0,
    });

    const oraOptions = {
      color: options.useColor ? undefined : false,
      isEnabled: true,
    };
    this.spinnerManager = new SpinnerManager(oraOptions, options.verbose);
    this.messageFormatter = new MessageFormatter(options.useColor);
  }

  reportStart(repository: string, project: string, subdir?: string, branch?: string): void;

  reportStart(repository: string, projects: string[], subdir?: string, branch?: string): void;

  reportStart(
    repository: string,
    projectOrProjects: string | string[],
    subdir?: string,
    branch?: string
  ): void {
    const kiroPath = subdir ? `${subdir}/.kiro` : '.kiro';
    const repoText = `Fetching files from ${repository}/${kiroPath}`;

    const repoOnly = repository.split('#')[0] || repository;

    const branchInfo = this.buildBranchInfo(repoOnly, branch);

    console.log(this.chalk.cyan(repoText));

    const projectText = this.buildProjectText(projectOrProjects);
    console.log(this.chalk.cyan(projectText));

    console.log(this.chalk.cyan(branchInfo));
  }

  private buildProjectText(projectOrProjects: string | string[]): string {
    if (Array.isArray(projectOrProjects)) {
      if (projectOrProjects.length === 1) {
        return `Project: ${projectOrProjects[0]}`;
      } else {
        const projectCount = projectOrProjects.length;
        const projectList = projectOrProjects.join(', ');
        return `Fetching ${projectCount} projects: ${projectList}`;
      }
    } else {
      return `Project: ${projectOrProjects}`;
    }
  }

  private buildBranchInfo(repository: string, branch?: string): string {
    if (branch) {
      return `Source: ${repository} (branch: ${branch})`;
    } else {
      return `Source: ${repository} (default branch)`;
    }
  }

  reportProgress(current: number, total: number, fileName: string, projectName?: string): void {
    const displayPath = this.stripSubdirPrefix(fileName);

    let message: string;
    if (projectName && projectName.trim() !== '') {
      message = `[${projectName}] [${current}/${total}] 📥 Fetching ${displayPath}...`;
    } else {
      message = `[${current}/${total}] 📥 Fetching ${displayPath}...`;
    }

    const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
    const spinner = this.spinnerManager.startSpinner(spinnerKey, message);

    if (spinner === null) {
      console.log(this.messageFormatter.formatInfo(message));
    } else {
      if (spinner.isSpinning) {
        this.spinnerManager.updateSpinner(spinnerKey, message);
      }
    }
  }

  private stripSubdirPrefix(filePath: string): string {
    const kiroIndex = filePath.indexOf('.kiro/');
    if (kiroIndex === -1) {
      return filePath;
    }
    return filePath.substring(kiroIndex);
  }

  reportSuccess(message: string, projectName?: string): void {
    const displayMessage = this.stripSubdirPrefixFromMessage(message);

    const formattedMessage = `✓ ${displayMessage}`;

    const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
    this.spinnerManager.stopSpinner(spinnerKey, '✓', formattedMessage);

    console.log(this.messageFormatter.formatSuccess(formattedMessage));
  }

  private stripSubdirPrefixFromMessage(message: string): string {
    const kiroIndex = message.indexOf('.kiro/');
    if (kiroIndex === -1) {
      return message;
    }

    const pathStartIndex = message.lastIndexOf(' ', kiroIndex) + 1;
    const prefix = message.substring(0, pathStartIndex);
    const filePath = message.substring(pathStartIndex);
    const displayPath = this.stripSubdirPrefix(filePath);

    return prefix + displayPath;
  }

  reportError(message: string, projectName?: string): void {
    const formattedMessage = `✗ ${message}`;

    const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
    this.spinnerManager.stopSpinner(spinnerKey, '✗', formattedMessage);

    console.error(this.messageFormatter.formatError(formattedMessage));
  }

  reportSummary(success: number, failed: number, subdir?: string, branch?: string): void {
    this.spinnerManager.clearAllSpinners();

    console.log('\nSummary:');

    if (subdir) {
      console.log(this.chalk.cyan(`  Fetched from: ${subdir}`));
    }

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

  reportVerbose(message: string, projectName?: string): void {
    if (!this.options.verbose) {
      return;
    }

    let formattedMessage: string;
    if (projectName && projectName.trim() !== '') {
      formattedMessage = `[VERBOSE] [${projectName}] ${message}`;
    } else {
      formattedMessage = `[VERBOSE] ${message}`;
    }

    console.log(this.chalk.gray(formattedMessage));
  }

  reportProjectSummary(
    projectName: string,
    filesDownloaded: number,
    filesFailed: number
  ): void {
    try {
      const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
      this.spinnerManager.stopSpinner(spinnerKey);
    } catch (_error) {
      if (this.options.verbose) {
        console.log('[VERBOSE] Spinner cleanup failed for project:', projectName);
      }
    }

    const successText = `${filesDownloaded} files succeeded`;
    const failedText = `${filesFailed} files failed`;
    const summaryMessage = `[${projectName}] Completed: ${successText}, ${failedText}`;

    console.log(this.chalk.cyan(summaryMessage));
  }

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

  reportOverallSummary(
    totalProjects: number,
    totalDownloaded: number,
    totalFailed: number
  ): void {
    this.spinnerManager.clearAllSpinners();

    const totalFiles = totalDownloaded + totalFailed;

    console.log(this.chalk.cyan('\n=== Overall Summary ==='));
    console.log(this.chalk.cyan(`Projects: ${totalProjects}`));
    console.log(this.chalk.cyan(`Total files: ${totalFiles}`));
    console.log(this.chalk.cyan(`Succeeded: ${totalDownloaded} files`));
    console.log(this.chalk.cyan(`Failed: ${totalFailed} files`));
  }

  reportProjectError(projectName: string, error: unknown): void {
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

  reportPartialFailureSummary(failedProjects: string[], successfulProjects: string[]): void {
    if (failedProjects.length > 0) {
      console.log(this.chalk.red(`\nFailed projects (${failedProjects.length}):`));
      failedProjects.forEach((project) => {
        console.log(this.chalk.red(`  - ${project}`));
      });
    }

    if (successfulProjects.length > 0) {
      console.log(this.chalk.green(`\nSuccessful projects (${successfulProjects.length}):`));
      successfulProjects.forEach((project) => {
        console.log(this.chalk.green(`  - ${project}`));
      });
    }
  }

  pauseSpinner(projectName?: string): void {
    try {
      const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
      this.spinnerManager.stopSpinner(spinnerKey);
    } catch (_error) {
      if (this.options.verbose) {
        console.log('[VERBOSE] Failed to pause spinner, continuing...');
      }
    }
  }

  resumeSpinner(projectName?: string): void {
    try {
      const spinnerKey = projectName && projectName.trim() !== '' ? projectName : '';
      this.spinnerManager.startSpinner(spinnerKey, '');
    } catch (_error) {
      if (this.options.verbose) {
        console.log('[VERBOSE] Failed to resume spinner, continuing...');
      }
    }
  }
}
