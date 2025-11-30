export interface KiroxConfig {
  githubToken?: string;
  defaultConcurrency?: number;
  outputDirectory?: string;
  verbose?: boolean;
  force?: boolean;
  subdir?: string;
  branch?: string;
  project?: string | string[];
}

export interface MergedConfig {
  githubToken?: string;
  concurrency: number;
  outputDirectory: string;
  verbose: boolean;
  force: boolean;
  dryRun: boolean;
  subdir?: string;
  branch?: string;
}
