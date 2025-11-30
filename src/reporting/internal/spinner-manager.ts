import ora, { type Ora } from 'ora';

export interface OraOptions {
  color?: boolean;
  isEnabled?: boolean;
}

interface SpinnerState {
  spinnerMap: Map<string, Ora>;
  useFallback: boolean;
}

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

  startSpinner(key: string, text: string): Ora | null {
    if (this.state.useFallback) {
      return null;
    }

    try {
      const existingSpinner = this.state.spinnerMap.get(key);
      if (existingSpinner && existingSpinner.isSpinning) {
        return existingSpinner;
      }

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

  getSpinnerMap(): Map<string, Ora> {
    return this.state.spinnerMap;
  }

  getUseFallback(): boolean {
    return this.state.useFallback;
  }
}
