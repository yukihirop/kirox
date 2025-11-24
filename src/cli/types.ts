/**
 * CLI Layer Type Definitions
 */

/**
 * Parsed command-line arguments
 */
export interface ParsedArguments {
  /** Subcommand name (e.g., 'add', 'completion') */
  subcommand?: string;
  /** Repository in format "owner/repo" */
  repository: string;
  /** Project name(s) to fetch (array for multi-project support) */
  projects: string[];
  /** Output directory (default: current directory) */
  output: string;
  /** Force overwrite without confirmation */
  force: boolean;
  /** Dry-run mode (no actual writes) */
  dryRun: boolean;
  /** Verbose logging */
  verbose: boolean;
  /** Custom config file path */
  config?: string;
  /** Track fetched files for update detection */
  track: boolean;
  /** Check for updates to tracked files */
  checkUpdates: boolean;
  /** Apply updates to tracked files */
  update: boolean;
  /** Subdirectory path containing .kiro folder */
  subdir?: string;
  /** Shell type for completion command (bash, zsh, fish, powershell, elvish) */
  shellType?: string;
  /** Fetch only .kiro/steering directory (skip project specs) */
  steering: boolean;
}

/**
 * Validation error for a specific field
 */
export interface ValidationError {
  /** Field name that failed validation */
  field: string;
  /** Error message describing the issue */
  message: string;
}

/**
 * Result of input validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors (empty if valid) */
  errors: ValidationError[];
}

/**
 * Result of CLI execution
 */
export interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Number of files downloaded */
  filesDownloaded: number;
  /** Number of files that failed */
  filesFailed: number;
  /** Exit code (0=success, 1=user error, 2=system error) */
  exitCode: number;
}

/**
 * Configuration after merging CLI args with file config
 */
export interface MergedConfig {
  /** Subdirectory path containing .kiro folder */
  subdir?: string;
  /** Branch name */
  branch?: string;
  /** Force overwrite without confirmation */
  force: boolean;
  /** Dry-run mode (no actual writes) */
  dryRun: boolean;
  /** Verbose logging */
  verbose: boolean;
}

/**
 * Metadata checking result
 */
export interface MetadataCheckResult {
  /** Metadata file path */
  metadataPath: string;
  /** Loaded or newly created metadata */
  metadata: import('../tracking/types.js').Metadata;
  /** Whether metadata is newly created (empty) */
  isNewMetadata: boolean;
}

/**
 * Project processing context
 */
export interface ProjectContext {
  /** Parsed arguments */
  args: ParsedArguments;
  /** Merged configuration */
  config: MergedConfig;
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Effective branch (from CLI or config) */
  effectiveBranch?: string;
  /** Metadata check result (undefined if --track is disabled) */
  metadataCheck?: MetadataCheckResult;
}
