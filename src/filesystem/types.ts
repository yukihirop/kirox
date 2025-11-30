export interface WriteOptions {
  force: boolean;
  prompt: boolean;
  dryRun: boolean;
  verbose: boolean;
}

export interface WriteResult {
  written: boolean;
  skipped: boolean;
  reason?: string;
  filePath?: string;
  size?: number;
}
