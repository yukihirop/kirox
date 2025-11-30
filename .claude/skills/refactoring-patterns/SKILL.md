---
name: refactoring-patterns
description: Apply TypeScript/JavaScript refactoring patterns to improve code maintainability, testability, and readability. Use when Claude needs to refactor large files (200+ lines), extract modules, split long functions (50+ lines), reduce code duplication, or apply architecture patterns like Facade. Applies SRP (Single Responsibility Principle), DRY principles, and layer separation systematically.
---

# Refactoring Patterns Skill

Systematic approach to refactoring TypeScript/JavaScript code for improved maintainability.

## Core Principles

### File Size Targets
- Files: ≤400 lines (target ≤200 for focused modules)
- Functions: ≤50 lines (target 30 for readability)
- Classes: Single responsibility, ≤300 lines

### Refactoring Triggers
Apply this skill when:
- File exceeds 200 lines with mixed responsibilities
- Function exceeds 50 lines
- Same logic appears in 2+ places
- Class handles 3+ distinct concerns
- Tests are difficult to write due to tight coupling

## Pattern Selection Guide

| Problem | Pattern | See Reference |
|---------|---------|---------------|
| Large file with mixed concerns | Module Extraction | [extraction.md](references/extraction.md) |
| Long function (50+ lines) | Function Decomposition | [decomposition.md](references/decomposition.md) |
| Duplicate code across files | Utility Consolidation | [utilities.md](references/utilities.md) |
| Complex class with many methods | Facade Pattern | [facade.md](references/facade.md) |
| Breaking changes risk | Interface Preservation | [compatibility.md](references/compatibility.md) |

## Standard Workflow

1. **Analyze**: Identify responsibilities in target file
2. **Plan**: Map extraction targets (see references for patterns)
3. **Extract**: Create new modules with focused responsibility
4. **Delegate**: Update original file to delegate to new modules
5. **Validate**: Ensure tests pass, types check, API preserved

## Quick Reference

### Module Extraction
```typescript
// BEFORE: entry.ts (500+ lines, mixed concerns)
export async function execute(argv: string[]): Promise<R> {
  // parsing logic (50 lines)
  // validation logic (30 lines)
  // github integration (100 lines)
  // file writing (80 lines)
  // progress reporting (40 lines)
}

// AFTER: entry.ts (orchestration only, ~100 lines)
import { parseArguments } from './parser.js';
import { validateInput } from './validator.js';
import { fetchFromGitHub } from '../github/fetcher.js';
import { writeFiles } from '../filesystem/writer.js';

export async function execute(argv: string[]): Promise<R> {
  const args = parseArguments(argv);
  validateInput(args);
  const files = await fetchFromGitHub(args.repository);
  await writeFiles(files, args.output);
  return { success: true, filesDownloaded: files.length };
}
```

### Facade Pattern (Preserve Public API)
```typescript
// BEFORE: progress-reporter.ts (300+ lines)
// Mixes spinner management + message formatting + state management

// AFTER: progress-reporter.ts (Facade, ~80 lines)
import { SpinnerManager } from './internal/spinner-manager.js';
import { MessageFormatter } from './internal/message-formatter.js';

export class ProgressReporter {
  private spinner: SpinnerManager;
  private formatter: MessageFormatter;

  constructor(options: ProgressOptions) {
    this.spinner = new SpinnerManager(options);
    this.formatter = new MessageFormatter(options);
  }

  // Public API preserved - no breaking changes
  reportProgress(message: string): void {
    this.spinner.update(this.formatter.formatProgress(message));
  }

  reportSuccess(message: string): void {
    this.spinner.succeed(this.formatter.formatSuccess(message));
  }
}
```

### Function Decomposition
```typescript
// BEFORE: 100+ line function
async function executeAddCommand(argv: string[]): Promise<R> {
  // All logic inline...
}

// AFTER: Orchestration + focused helpers
async function executeAddCommand(argv: string[]): Promise<R> {
  const config = await loadAndMergeConfig(argv);
  await checkMetadataAndDuplicates(config);
  const files = await fetchAndWriteFiles(config);
  return updateMetadataAndReport(files);
}

// Each helper: 30-50 lines, single responsibility
async function loadAndMergeConfig(argv: string[]): Promise<Config> { ... }
async function checkMetadataAndDuplicates(config: Config): Promise<void> { ... }
async function fetchAndWriteFiles(config: Config): Promise<File[]> { ... }
function updateMetadataAndReport(files: File[]): Result { ... }
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Utility files | `{domain}-utils.ts` | `metadata-utils.ts` |
| Prompt modules | `{feature}-prompt.ts` | `repository-prompt.ts` |
| Facade classes | Original name preserved | `ProgressReporter` |
| Internal modules | `internal/{feature}.ts` | `internal/spinner-manager.ts` |
| Config objects | `{feature}-config.ts` | `parser-config.ts` |

## Type Safety Requirements

- Explicit return type annotations on all functions
- No `any` type usage
- Strict TypeScript (`strict: true`)
- Import order: Node.js → external libs → internal modules → types

## Layer Separation Architecture

```
CLI Layer → GitHub Layer → FileSystem Layer → Reporting Layer
   ↓              ↓               ↓                  ↓
 Parser        Fetcher          Writer        ProgressReporter
 Validator   ParallelFetcher   PathUtils       ErrorHandler
 Prompts                                        Logger
```

**Rule**: Upper layers depend on lower layers. Never reverse the dependency direction.

## Comments Policy

- **Remove**: Self-explanatory comments (`// Parse arguments`)
- **Keep**: Business logic explanations (`// Duplicate projects allowed in different subdirectories per business requirement`)
- **Keep**: Non-obvious algorithm rationale
- **Remove**: Task tracking comments (`// Task 2.1: ...`)
