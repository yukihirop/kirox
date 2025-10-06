/**
 * Reporting Layer Type Definitions
 */

/**
 * Progress reporter options
 */
export interface ReporterOptions {
  verbose: boolean; // Show verbose logging
  useColor: boolean; // Use colored output (default: true)
}

/**
 * Summary statistics for reporting
 */
export interface Summary {
  success: number; // Number of successful operations
  failed: number; // Number of failed operations
  total: number; // Total number of operations
}
