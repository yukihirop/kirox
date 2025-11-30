export interface ParsedArguments {
  
  subcommand?: string;
  
  repository: string;
  
  projects: string[];
  
  output: string;
  
  force: boolean;
  
  dryRun: boolean;
  
  verbose: boolean;
  
  config?: string;
  
  track: boolean;
  
  checkUpdates: boolean;
  
  update: boolean;
  
  subdir?: string;
  
  shellType?: string;
  
  steering: boolean;
}

export interface ValidationError {
  
  field: string;
  
  message: string;
}

export interface ValidationResult {
  
  valid: boolean;
  
  errors: ValidationError[];
}

export interface ExecutionResult {
  
  success: boolean;
  
  filesDownloaded: number;
  
  filesFailed: number;
  
  exitCode: number;
}

export interface MergedConfig {
  
  subdir?: string;
  
  branch?: string;
  
  force: boolean;
  
  dryRun: boolean;
  
  verbose: boolean;
}

export interface MetadataCheckResult {
  
  metadataPath: string;
  
  metadata: import('../tracking/types.js').Metadata;
  
  isNewMetadata: boolean;
}

export interface ProjectContext {
  
  args: ParsedArguments;
  
  config: MergedConfig;
  
  owner: string;
  
  repo: string;
  
  effectiveBranch?: string;
  
  metadataCheck?: MetadataCheckResult;
}
