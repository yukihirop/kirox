/**
 * Configuration Management Type Definitions
 */

/**
 * Kirox configuration file structure (.kiroxrc.json)
 */
export interface KiroxConfig {
  /** GitHub Personal Access Token */
  githubToken?: string;
  /** Default concurrency for parallel file fetching (default: 5) */
  defaultConcurrency?: number;
  /** Output directory (default: current directory) */
  outputDirectory?: string;
  /** Enable verbose logging by default */
  verbose?: boolean;
  /** Force overwrite without confirmation by default */
  force?: boolean;
  /** Default subdirectory path containing .kiro folder */
  subdir?: string;
}

/**
 * Merged configuration from all sources
 * Priority: CLI options > config file > environment variables > defaults
 */
export interface MergedConfig {
  /** GitHub Personal Access Token */
  githubToken?: string;
  /** Concurrency for parallel file fetching */
  concurrency: number;
  /** Output directory */
  outputDirectory: string;
  /** Verbose logging enabled */
  verbose: boolean;
  /** Force overwrite without confirmation */
  force: boolean;
  /** Dry-run mode (no actual writes) */
  dryRun: boolean;
  /** Subdirectory path containing .kiro folder */
  subdir?: string;
}
