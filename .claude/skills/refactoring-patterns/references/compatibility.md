# Interface Preservation Pattern

Refactor internal implementation without breaking external consumers.

## When to Apply
- Refactoring modules with external consumers
- Preserving backward compatibility during migration
- Gradual refactoring of widely-used APIs

## Core Principle

**Public API = Contract with consumers. Internal implementation = Free to change.**

```
External Consumer
      ↓
┌─────────────────────────────────┐
│     Public API (FROZEN)         │ ← Signatures, types, behavior
├─────────────────────────────────┤
│   Internal Implementation       │ ← Free to refactor
│   (Can change freely)           │
└─────────────────────────────────┘
```

## Preservation Techniques

### Technique 1: Re-export Wrapper

When extracting logic to new modules, maintain the original export point:

```typescript
// BEFORE: interactive-prompt.ts exports everything
export function shouldEnterInteractiveMode(args: Args): boolean { ... }
export function promptMissingArguments(args: Args): Promise<Args> { ... }
export function promptRepository(): Promise<string> { ... }
export function promptProjectSelection(projects: Project[]): Promise<Project[]> { ... }

// AFTER: Logic moved to focused modules, original file becomes re-export wrapper
// interactive-prompt.ts
export { shouldEnterInteractiveMode } from './utils/mode-detector.js';
export { promptMissingArguments } from './prompts/missing-args-prompt.js';
export { promptRepository } from './prompts/repository-prompt.js';
export { promptProjectSelection } from './prompts/project-selection-prompt.js';

// Consumers unchanged:
import { shouldEnterInteractiveMode, promptMissingArguments } from './interactive-prompt.js';
```

### Technique 2: Facade Delegation

Preserve class interface while delegating to new components:

```typescript
// BEFORE: Monolithic class
export class ProgressReporter {
  private spinnerMap: Map<string, Ora> = new Map();
  
  reportProgress(message: string): void {
    // 50 lines of spinner management
  }
  
  reportSuccess(message: string): void {
    // 30 lines of formatting + spinner
  }
}

// AFTER: Facade with same interface
export class ProgressReporter {
  private readonly spinner: SpinnerManager;
  private readonly formatter: MessageFormatter;
  
  constructor(options: ProgressOptions = {}) {
    this.spinner = new SpinnerManager(options);
    this.formatter = new MessageFormatter(options);
  }
  
  // Same signature, different implementation
  reportProgress(message: string): void {
    this.spinner.update('main', this.formatter.formatProgress(message));
  }
  
  reportSuccess(message: string): void {
    this.spinner.succeed('main', this.formatter.formatSuccess(message));
  }
}
```

### Technique 3: Optional Parameter Extension

Add new parameters without breaking existing calls:

```typescript
// BEFORE
export function fetchDirectoryContents(
  owner: string,
  repo: string,
  path: string
): Promise<Content[]>;

// AFTER: Add optional parameter at end
export function fetchDirectoryContents(
  owner: string,
  repo: string,
  path: string,
  options?: { ref?: string; recursive?: boolean }  // New, optional
): Promise<Content[]>;

// Existing calls still work:
fetchDirectoryContents('owner', 'repo', '.kiro');

// New calls can use options:
fetchDirectoryContents('owner', 'repo', '.kiro', { ref: 'develop' });
```

### Technique 4: Type Extension with Compatibility

Extend types without breaking existing usage:

```typescript
// BEFORE
export interface RepositoryRef {
  owner: string;
  repo: string;
}

// AFTER: Add optional fields
export interface RepositoryRef {
  owner: string;
  repo: string;
  branch?: string;  // New, optional - existing code unaffected
  subdir?: string;  // New, optional
}

// Old code works:
const ref: RepositoryRef = { owner: 'user', repo: 'project' };

// New code can use new fields:
const refWithBranch: RepositoryRef = { 
  owner: 'user', 
  repo: 'project', 
  branch: 'develop' 
};
```

### Technique 5: Deprecation Path

When changes are unavoidable, provide migration path:

```typescript
// Mark old API as deprecated but keep working
/**
 * @deprecated Use `parseRepositoryPath` instead. Will be removed in v3.0.
 */
export function parseRepoPath(input: string): { owner: string; repo: string } {
  console.warn('parseRepoPath is deprecated. Use parseRepositoryPath instead.');
  return parseRepositoryPath(input);
}

// New API
export function parseRepositoryPath(input: string): RepositoryRef {
  const [owner, repo, branch] = input.split(/[#@]/);
  return { owner, repo, branch };
}
```

## Verification Checklist

### Before Refactoring
- [ ] Document all public exports (functions, classes, types)
- [ ] Note all exported function signatures
- [ ] Identify all external consumers
- [ ] Create snapshot of public API types

### After Refactoring
- [ ] All original exports still exist at same paths
- [ ] All function signatures unchanged
- [ ] All class method signatures unchanged
- [ ] All exported types compatible
- [ ] All existing tests pass without modification
- [ ] No new required parameters on public functions

## API Snapshot Test

Create a test that fails if public API changes:

```typescript
// api-snapshot.test.ts
import * as interactivePrompt from './interactive-prompt.js';
import * as progressReporter from './progress-reporter.js';

describe('Public API Stability', () => {
  describe('interactive-prompt exports', () => {
    it('exports shouldEnterInteractiveMode function', () => {
      expect(typeof interactivePrompt.shouldEnterInteractiveMode).toBe('function');
    });
    
    it('exports promptMissingArguments function', () => {
      expect(typeof interactivePrompt.promptMissingArguments).toBe('function');
    });
  });
  
  describe('ProgressReporter class', () => {
    it('has required methods', () => {
      const reporter = new progressReporter.ProgressReporter();
      expect(typeof reporter.reportProgress).toBe('function');
      expect(typeof reporter.reportSuccess).toBe('function');
      expect(typeof reporter.reportError).toBe('function');
      expect(typeof reporter.pause).toBe('function');
      expect(typeof reporter.resume).toBe('function');
      expect(typeof reporter.stop).toBe('function');
    });
    
    it('constructor accepts optional options', () => {
      // Should not throw
      new progressReporter.ProgressReporter();
      new progressReporter.ProgressReporter({});
      new progressReporter.ProgressReporter({ useColor: true });
    });
  });
});
```

## Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Changing return type | Keep original type, extend if needed |
| Adding required parameters | Always make new parameters optional |
| Removing exports | Keep re-exports even if deprecated |
| Changing error types | Maintain same error classes/messages |
| Changing async/sync | Never change function's async nature |
