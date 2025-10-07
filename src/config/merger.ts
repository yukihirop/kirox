/**
 * Configuration Merger
 *
 * Merges configuration from multiple sources with proper priority
 */

import type { ParsedArguments } from '@/cli/types.js';
import type { KiroxConfig, MergedConfig } from './types.js';

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

  return config;
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
