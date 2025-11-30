import type { ParsedArguments } from '@/cli/types.js';
import type { KiroxConfig, MergedConfig } from './types.js';
import { parseRepositoryPath } from '@/github/fetcher.js';
import { parseProjects } from '@/cli/project-name-parser.js';

const DEFAULT_CONFIG: MergedConfig = {
  githubToken: undefined,
  concurrency: 5,
  outputDirectory: process.cwd(),
  verbose: false,
  force: false,
  dryRun: false,
};

const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 10;

export function mergeConfig(
  cliArgs: ParsedArguments,
  fileConfig: KiroxConfig
): MergedConfig {
  const config: MergedConfig = { ...DEFAULT_CONFIG };

  if (process.env.GITHUB_TOKEN) {
    config.githubToken = process.env.GITHUB_TOKEN;
  }

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
  if (fileConfig.branch !== undefined) {
    config.branch = fileConfig.branch === '' ? undefined : fileConfig.branch;
  }

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

  try {
    const { branch: cliBranch } = parseRepositoryPath(cliArgs.repository);
    if (cliBranch !== undefined) {
      config.branch = cliBranch;
    }
  } catch {
  }

  return config;
}

export function mergeProjects(
  cliProjects: string[],
  configProject: string | string[] | undefined
): string[] {
  if (cliProjects.length > 0) {
    return cliProjects;
  }

  if (configProject === undefined) {
    return [];
  }

  if (typeof configProject === 'string') {
    return parseProjects(configProject);
  } else if (Array.isArray(configProject)) {
    return configProject;
  }

  return [];
}

function clampConcurrency(value: number): number {
  return Math.max(MIN_CONCURRENCY, Math.min(MAX_CONCURRENCY, value));
}
