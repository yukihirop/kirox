import { Octokit } from 'octokit';
import { parseArguments } from './parser.js';
import { validateInput } from './validator.js';
import { PinoLogger } from '../reporting/pino-logger.js';
import { ErrorHandler } from '../reporting/error-handler.js';
import { ProgressReporter } from '../reporting/progress-reporter.js';
import { parseRepositoryPath } from '../github/fetcher.js';
import { shouldEnterInteractiveMode, promptMissingArguments } from './interactive-prompt.js';
import {
  loadAndMergeConfig,
  checkMetadataAndDuplicates,
  fetchAndWriteFiles,
  updateMetadataAndReport,
} from './add-command-helpers.js';
import type { ExecutionResult } from './types.js';

export async function executeAddCommand(argv: string[]): Promise<ExecutionResult> {
  
  const args = parseArguments(argv);
  const logger = new PinoLogger(args.verbose);
  const errorHandler = new ErrorHandler();

  let interrupted = false;
  const handleInterrupt = () => {
    interrupted = true;
    console.log('\nOperation was interrupted.');
    process.exit(130);
  };

  process.on('SIGINT', handleInterrupt);
  process.on('SIGTERM', handleInterrupt);

  try {
    const reporter = new ProgressReporter({
      verbose: args.verbose,
      useColor: true,
    });

    let config = await loadAndMergeConfig(args, logger);

    const enterInteractiveMode = shouldEnterInteractiveMode(args);

    if (enterInteractiveMode) {
      try {
        const completedArgs = await promptMissingArguments(
          args,
          config,
          logger,
          args.verbose,
          undefined
        );

        args.repository = completedArgs.repository;
        args.projects = completedArgs.projects;
        args.output = completedArgs.output;
        args.subdir = completedArgs.subdir;

        config = await loadAndMergeConfig(args, logger);

        if (args.verbose) {
          logger.info('Interactive prompts completed', {
            repository: args.repository,
            projects: args.projects,
            subdir: args.subdir,
          });
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Operation cancelled') {
          console.log('Operation cancelled');
          return {
            success: false,
            filesDownloaded: 0,
            filesFailed: 0,
            exitCode: 0,
          };
        }
        throw error;
      }
    }

    if (args.verbose) {
      logger.info('Executing add command', {
        repository: args.repository,
        projects: args.projects,
        config: args.config || 'default',
      });
    }

    const validation = validateInput(args);
    if (!validation.valid) {
      logger.error('Validation failed', { errors: validation.errors });
      return {
        success: false,
        filesDownloaded: 0,
        filesFailed: 0,
        exitCode: 1,
      };
    }

    let metadataCheck;
    try {
      metadataCheck = await checkMetadataAndDuplicates(args, config, logger);
    } catch (_error) {
      
      return {
        success: false,
        filesDownloaded: 0,
        filesFailed: 0,
        exitCode: 1,
      };
    }

    const { owner, repo, branch } = parseRepositoryPath(args.repository);
    const effectiveBranch = branch || config.branch;

    if (args.verbose) {
      logger.info('Repository parsed', {
        owner,
        repo,
        branch: effectiveBranch || 'default',
      });
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const subdir = config.subdir || '';
    const projects = args.projects.length > 0 ? args.projects : [''];

    let totalFilesDownloaded = 0;
    let totalFilesFailed = 0;
    let successfulProjects = 0;
    let failedProjects = 0;
    const steeringFetched = { value: false };

    for (const [index, projectName] of projects.entries()) {
      const isFirstProject = index === 0;

      try {
        
        const fetchResult = await fetchAndWriteFiles(
          octokit,
          owner,
          repo,
          projectName,
          effectiveBranch,
          subdir,
          args,
          config,
          reporter,
          logger,
          isFirstProject,
          steeringFetched
        );

        if (interrupted) {
          continue;
        }

        await updateMetadataAndReport(
          projectName,
          fetchResult,
          args,
          config,
          metadataCheck,
          logger,
          reporter,
          projects.length
        );

        successfulProjects++;
        totalFilesDownloaded += fetchResult.success.length;
        totalFilesFailed += fetchResult.failed;
      } catch (error) {
        
        const errorResult = errorHandler.handle(error, {
          project: projectName,
          details: error instanceof Error ? error.message : String(error),
        });
        logger.logError(errorResult);

        failedProjects++;
      }
    }

    if (projects.length > 1) {
      const totalProjects = successfulProjects + failedProjects;
      reporter.reportOverallSummary(totalProjects, totalFilesDownloaded, totalFilesFailed);
    }

    if (args.verbose) {
      logger.info('All projects processed', {
        successfulProjects,
        failedProjects,
        totalFilesDownloaded,
        totalFilesFailed,
      });
    }

    const hasAnySuccess = successfulProjects > 0;
    return {
      success: hasAnySuccess,
      filesDownloaded: totalFilesDownloaded,
      filesFailed: totalFilesFailed,
      exitCode: hasAnySuccess ? 0 : 1,
    };
  } catch (error) {
    
    const errorResult = errorHandler.handle(error);

    if (error instanceof Error) {
      logger.error('Unexpected error in add command', {
        message: error.message,
        stack: error.stack,
      });
    }

    logger.logError(errorResult);

    return {
      success: false,
      filesDownloaded: 0,
      filesFailed: 0,
      exitCode: errorResult.exitCode,
    };
  } finally {
    
    process.removeListener('SIGINT', handleInterrupt);
    process.removeListener('SIGTERM', handleInterrupt);
  }
}
