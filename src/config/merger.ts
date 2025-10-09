/**
 * Configuration Merger
 *
 * Merges configuration from multiple sources with proper priority
 */

import type { ParsedArguments } from '@/cli/types.js';
import type { KiroxConfig, MergedConfig } from './types.js';
import { parseRepositoryPath } from '@/github/fetcher.js';
import { parseProjects } from '@/cli/project-name-parser.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: MergedConfig = {
  githubToken: undefined,
  concurrency: 5,
  outputDirectory: process.cwd(),
  verbose: false,
  force: false,
  dryRun: false,
};

/**
 * Minimum and maximum concurrency values
 */
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 10;

/**
 * Merge configuration from all sources
 *
 * Priority (highest to lowest):
 * 1. CLI options
 * 2. Config file
 * 3. Environment variables
 * 4. Default values
 *
 * @param cliArgs - Parsed CLI arguments
 * @param fileConfig - Configuration loaded from file
 * @returns Merged configuration with all values resolved
 */
export function mergeConfig(
  cliArgs: ParsedArguments,
  fileConfig: KiroxConfig
): MergedConfig {
  // Start with defaults
  const config: MergedConfig = { ...DEFAULT_CONFIG };

  // Priority 4: Environment variables
  if (process.env.GITHUB_TOKEN) {
    config.githubToken = process.env.GITHUB_TOKEN;
  }

  // Priority 3: Config file
  if (fileConfig.githubToken !== undefined) {
    config.githubToken = fileConfig.githubToken;
  }
  if (fileConfig.defaultConcurrency !== undefined) {
    config.concurrency = clampConcurrency(fileConfig.defaultConcurrency);
  }
  if (fileConfig.outputDirectory !== undefined) {
    config.outputDirectory = fileConfig.outputDirectory;
  }
  if (fileConfig.verbose !== undefined) {
    config.verbose = fileConfig.verbose;
  }
  if (fileConfig.force !== undefined) {
    config.force = fileConfig.force;
  }
  if (fileConfig.subdir !== undefined) {
    config.subdir = fileConfig.subdir;
  }
  // Task 4.2: Merge branch from config file
  if (fileConfig.branch !== undefined) {
    // Normalize empty string to undefined (default branch)
    config.branch = fileConfig.branch === '' ? undefined : fileConfig.branch;
  }

  // Priority 1 & 2: CLI options (highest priority)
  if (cliArgs.verbose) {
    config.verbose = true;
  }
  if (cliArgs.force) {
    config.force = true;
  }
  if (cliArgs.dryRun) {
    config.dryRun = true;
  }
  if (cliArgs.subdir !== undefined) {
    config.subdir = cliArgs.subdir;
  }

  // Task 4.2: Extract and prioritize branch from CLI repository argument
  try {
    const { branch: cliBranch } = parseRepositoryPath(cliArgs.repository);
    if (cliBranch !== undefined) {
      // CLI branch takes highest priority
      config.branch = cliBranch;
    }
  } catch {
    // If parsing fails, ignore branch extraction (validation happens elsewhere)
  }

  return config;
}

/**
 * Merge project names from CLI and config file
 *
 * Priority:
 * 1. CLI projects array (if not empty)
 * 2. Config file project field (string or array)
 *
 * @param cliProjects - Projects from CLI arguments
 * @param configProject - Project(s) from config file
 * @returns Merged array of project names
 */
export function mergeProjects(
  cliProjects: string[],
  configProject: string | string[] | undefined
): string[] {
  // CLI projects take precedence (if not empty)
  if (cliProjects.length > 0) {
    return cliProjects;
  }

  // No config project specified
  if (configProject === undefined) {
    return [];
  }

  // Parse config project
  if (typeof configProject === 'string') {
    // Parse comma-separated string
    return parseProjects(configProject);
  } else if (Array.isArray(configProject)) {
    // Use array directly
    return configProject;
  }

  // Should not reach here due to type system
  return [];
}

/**
 * Clamp concurrency value to valid range
 *
 * @param value - Concurrency value to clamp
 * @returns Clamped value between MIN_CONCURRENCY and MAX_CONCURRENCY
 */
function clampConcurrency(value: number): number {
  return Math.max(MIN_CONCURRENCY, Math.min(MAX_CONCURRENCY, value));
}
