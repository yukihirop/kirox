/**
 * Spinner Manager
 *
 * Manages ora spinner lifecycle and state
 */

import ora, { type Ora } from 'ora';

/**
 * Ora options for spinner configuration
 */
export interface OraOptions {
  color?: boolean;
  isEnabled?: boolean;
}

/**
 * Spinner state model
 */
interface SpinnerState {
  spinnerMap: Map<string, Ora>;
  useFallback: boolean;
}

/**
 * SpinnerManager
 *
 * Manages ora spinner instances with fallback to console.log
 */
export class SpinnerManager {
  private readonly options: OraOptions;
  private readonly verbose: boolean;
  private state: SpinnerState;

  constructor(options: OraOptions, verbose: boolean) {
    this.options = options;
    this.verbose = verbose;
    this.state = {
      spinnerMap: new Map<string, Ora>(),
      useFallback: false,
    };

    // Test ora initialization
    try {
      const testSpinner = ora(this.options);
      testSpinner.stop();
      this.state.useFallback = false;
    } catch (_error) {
      this.state.useFallback = true;

      if (this.verbose) {
        console.log('[VERBOSE] Spinner initialization failed, falling back to console output');
      }
    }
  }

  /**
   * Start a spinner with the given key and text
   *
   * @param key - Unique identifier for the spinner
   * @param text - Text to display
   * @returns Ora spinner instance or null in fallback mode
   */
  startSpinner(key: string, text: string): Ora | null {
    if (this.state.useFallback) {
      return null;
    }

    try {
      // Check if spinner already exists and is spinning
      const existingSpinner = this.state.spinnerMap.get(key);
      if (existingSpinner && existingSpinner.isSpinning) {
        return existingSpinner;
      }

      // Create new spinner
      const newSpinner = ora(this.options);
      this.state.spinnerMap.set(key, newSpinner);
      newSpinner.start(text);

      return newSpinner;
    } catch (_error) {
      if (this.verbose) {
        console.log('[VERBOSE] Spinner operation failed, falling back to console output');
      }
      return null;
    }
  }

  /**
   * Update spinner text
   *
   * @param key - Unique identifier for the spinner
   * @param text - New text to display
   */
  updateSpinner(key: string, text: string): void {
    if (this.state.useFallback) {
      return;
    }

    try {
      const spinner = this.state.spinnerMap.get(key);
      if (spinner) {
        spinner.text = text;
      }
    } catch (_error) {
      if (this.verbose) {
        console.log('[VERBOSE] Spinner operation failed');
      }
    }
  }

  /**
   * Stop spinner
   *
   * @param key - Unique identifier for the spinner
   * @param symbol - Optional symbol ('✓' for success, '✗' for failure)
   * @param text - Optional final text
   */
  stopSpinner(key: string, symbol?: string, text?: string): void {
    if (this.state.useFallback) {
      return;
    }

    try {
      const spinner = this.state.spinnerMap.get(key);
      if (!spinner) {
        return;
      }

      if (symbol === '✓' && text) {
        spinner.succeed(text);
      } else if (symbol === '✗' && text) {
        spinner.fail(text);
      } else {
        spinner.stop();
      }
    } catch (_error) {
      if (this.verbose) {
        console.log('[VERBOSE] Spinner operation failed');
      }
    }
  }

  /**
   * Stop all active spinners and clear the map
   */
  clearAllSpinners(): void {
    if (this.state.useFallback) {
      return;
    }

    try {
      for (const spinner of this.state.spinnerMap.values()) {
        if (spinner.isSpinning) {
          spinner.stop();
        }
      }

      this.state.spinnerMap.clear();
    } catch (_error) {
      if (this.verbose) {
        console.log('[VERBOSE] Failed to clear spinners');
      }
    }
  }

  /**
   * Get spinner map (for testing only)
   * @internal
   */
  getSpinnerMap(): Map<string, Ora> {
    return this.state.spinnerMap;
  }

  /**
   * Get fallback mode status (for testing only)
   * @internal
   */
  getUseFallback(): boolean {
    return this.state.useFallback;
  }
}
