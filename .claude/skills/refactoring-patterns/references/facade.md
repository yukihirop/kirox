# Facade Pattern

Simplify complex subsystems by providing a unified interface while preserving public API compatibility.

## When to Apply
- Class handles multiple distinct concerns (>300 lines)
- Internal implementation details leak into public interface
- External callers depend on many internal methods
- Refactoring would break existing consumers

## Facade Implementation

### Before: Monolithic Class

```typescript
// progress-reporter.ts (331 lines)
export class ProgressReporter {
  private spinnerMap: Map<string, Ora> = new Map();
  private useFallback: boolean = false;
  private useColor: boolean;
  
  constructor(options: ProgressOptions) {
    this.useColor = options.useColor ?? true;
    this.initializeSpinners();
  }
  
  // Spinner management (100 lines)
  private initializeSpinners(): void { /* ... */ }
  private getOrCreateSpinner(id: string): Ora { /* ... */ }
  private updateSpinner(id: string, text: string): void { /* ... */ }
  private succeedSpinner(id: string): void { /* ... */ }
  private failSpinner(id: string): void { /* ... */ }
  private stopAllSpinners(): void { /* ... */ }
  
  // Message formatting (80 lines)
  private formatProgressMessage(msg: string): string { /* ... */ }
  private formatSuccessMessage(msg: string): string { /* ... */ }
  private formatErrorMessage(msg: string): string { /* ... */ }
  private applyColor(msg: string, color: string): string { /* ... */ }
  
  // Public API (50 lines)
  reportProgress(message: string): void { /* ... */ }
  reportSuccess(message: string): void { /* ... */ }
  reportError(message: string): void { /* ... */ }
  reportFileProgress(current: number, total: number): void { /* ... */ }
  
  // State management (50 lines)
  pause(): void { /* ... */ }
  resume(): void { /* ... */ }
  stop(): void { /* ... */ }
}
```

### After: Facade with Internal Modules

```typescript
// progress-reporter.ts (Facade, ~80 lines)
import { SpinnerManager } from './internal/spinner-manager.js';
import { MessageFormatter } from './internal/message-formatter.js';
import type { ProgressOptions, SpinnerId } from './types.js';

export class ProgressReporter {
  private readonly spinner: SpinnerManager;
  private readonly formatter: MessageFormatter;
  
  constructor(options: ProgressOptions = {}) {
    const useColor = options.useColor ?? true;
    this.spinner = new SpinnerManager({ useFallback: !process.stdout.isTTY });
    this.formatter = new MessageFormatter({ useColor });
  }
  
  // Public API preserved - no signature changes
  reportProgress(message: string): void {
    const formatted = this.formatter.formatProgress(message);
    this.spinner.update('main', formatted);
  }
  
  reportSuccess(message: string): void {
    const formatted = this.formatter.formatSuccess(message);
    this.spinner.succeed('main', formatted);
  }
  
  reportError(message: string): void {
    const formatted = this.formatter.formatError(message);
    this.spinner.fail('main', formatted);
  }
  
  reportFileProgress(current: number, total: number): void {
    const message = `Processing file ${current}/${total}`;
    this.reportProgress(message);
  }
  
  pause(): void {
    this.spinner.pauseAll();
  }
  
  resume(): void {
    this.spinner.resumeAll();
  }
  
  stop(): void {
    this.spinner.stopAll();
  }
}

// Re-export for backward compatibility
export type { ProgressOptions } from './types.js';
```

```typescript
// internal/spinner-manager.ts (~100 lines)
import ora, { type Ora } from 'ora';

interface SpinnerState {
  spinner: Ora;
  isPaused: boolean;
  lastText: string;
}

export class SpinnerManager {
  private readonly spinners: Map<string, SpinnerState> = new Map();
  private readonly useFallback: boolean;
  
  constructor(options: { useFallback?: boolean } = {}) {
    this.useFallback = options.useFallback ?? false;
  }
  
  update(id: string, text: string): void {
    if (this.useFallback) {
      console.log(text);
      return;
    }
    
    const state = this.getOrCreate(id);
    state.spinner.text = text;
    state.lastText = text;
    
    if (!state.spinner.isSpinning) {
      state.spinner.start();
    }
  }
  
  succeed(id: string, text?: string): void {
    const state = this.spinners.get(id);
    if (!state) return;
    
    if (this.useFallback) {
      console.log(`✓ ${text ?? state.lastText}`);
    } else {
      state.spinner.succeed(text);
    }
    
    this.spinners.delete(id);
  }
  
  fail(id: string, text?: string): void {
    const state = this.spinners.get(id);
    if (!state) return;
    
    if (this.useFallback) {
      console.error(`✗ ${text ?? state.lastText}`);
    } else {
      state.spinner.fail(text);
    }
    
    this.spinners.delete(id);
  }
  
  pauseAll(): void {
    for (const state of this.spinners.values()) {
      if (state.spinner.isSpinning) {
        state.spinner.stop();
        state.isPaused = true;
      }
    }
  }
  
  resumeAll(): void {
    for (const state of this.spinners.values()) {
      if (state.isPaused) {
        state.spinner.start(state.lastText);
        state.isPaused = false;
      }
    }
  }
  
  stopAll(): void {
    for (const state of this.spinners.values()) {
      state.spinner.stop();
    }
    this.spinners.clear();
  }
  
  private getOrCreate(id: string): SpinnerState {
    let state = this.spinners.get(id);
    if (!state) {
      state = {
        spinner: ora({ spinner: 'dots' }),
        isPaused: false,
        lastText: '',
      };
      this.spinners.set(id, state);
    }
    return state;
  }
}
```

```typescript
// internal/message-formatter.ts (~50 lines)
import chalk from 'chalk';

export class MessageFormatter {
  private readonly useColor: boolean;
  
  constructor(options: { useColor?: boolean } = {}) {
    this.useColor = options.useColor ?? true;
  }
  
  formatProgress(message: string): string {
    return this.applyStyle(message, chalk.blue);
  }
  
  formatSuccess(message: string): string {
    return this.applyStyle(`✓ ${message}`, chalk.green);
  }
  
  formatError(message: string): string {
    return this.applyStyle(`✗ ${message}`, chalk.red);
  }
  
  formatWarning(message: string): string {
    return this.applyStyle(`⚠ ${message}`, chalk.yellow);
  }
  
  private applyStyle(
    text: string,
    styleFn: (text: string) => string
  ): string {
    return this.useColor ? styleFn(text) : text;
  }
}
```

## Directory Structure

```
src/reporting/
├── progress-reporter.ts     # Facade (public API)
├── types.ts                 # Shared types
├── error-handler.ts         # Other public modules
└── internal/                # Implementation details
    ├── spinner-manager.ts   # Spinner lifecycle
    └── message-formatter.ts # Message styling
```

## Facade Benefits

| Benefit | Description |
|---------|-------------|
| API Stability | Public interface unchanged, no breaking changes |
| Testability | Internal modules can be unit tested in isolation |
| Maintainability | Each internal module has single responsibility |
| Flexibility | Internal implementation can change freely |

## Testing Facade Components

```typescript
// Test facade through public API
describe('ProgressReporter', () => {
  it('reports progress through spinner', () => {
    const reporter = new ProgressReporter();
    reporter.reportProgress('Loading...');
    // Verify behavior, not implementation
  });
});

// Test internal modules directly
describe('SpinnerManager', () => {
  it('creates spinner on first update', () => {
    const manager = new SpinnerManager();
    manager.update('test', 'Hello');
    // Can test implementation details here
  });
});

describe('MessageFormatter', () => {
  it('adds checkmark to success messages', () => {
    const formatter = new MessageFormatter({ useColor: false });
    expect(formatter.formatSuccess('Done')).toBe('✓ Done');
  });
});
```

## Migration Checklist

- [ ] All public method signatures unchanged
- [ ] Constructor signature unchanged (or backward compatible)
- [ ] Exported types still available
- [ ] No new required dependencies for consumers
- [ ] Internal modules are not exported
- [ ] All existing tests pass without modification
