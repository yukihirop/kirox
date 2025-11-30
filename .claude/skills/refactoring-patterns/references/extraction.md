# Module Extraction Pattern

Extract distinct responsibilities from large files into focused modules.

## When to Apply
- File exceeds 400 lines
- File handles 3+ unrelated concerns
- Multiple developers work on different parts simultaneously
- Testing requires mocking unrelated logic

## Extraction Process

### Step 1: Responsibility Analysis
Identify logical groupings in the file:

```typescript
// BEFORE: entry.ts (566 lines)
// Responsibilities found:
// 1. Argument parsing (lines 20-70)
// 2. Input validation (lines 71-120)
// 3. Interactive mode (lines 121-200)
// 4. GitHub integration (lines 201-350)
// 5. File writing (lines 351-450)
// 6. Progress reporting (lines 451-500)
// 7. Error handling (lines 501-566)
```

### Step 2: Define Module Boundaries

Map responsibilities to target files:

| Responsibility | Target Module | Layer |
|----------------|---------------|-------|
| Argument parsing | `cli/parser.ts` | CLI |
| Input validation | `cli/validator.ts` | CLI |
| Interactive mode | `cli/interactive-prompt.ts` | CLI |
| GitHub integration | `github/fetcher.ts` | GitHub |
| File writing | `filesystem/writer.ts` | FileSystem |
| Progress reporting | `reporting/progress-reporter.ts` | Reporting |
| Error handling | `reporting/error-handler.ts` | Reporting |

### Step 3: Extract with Interface Preservation

```typescript
// BEFORE: Everything in entry.ts
export async function execute(argv: string[]): Promise<ExecutionResult> {
  // 500+ lines of mixed logic
}

// AFTER: entry.ts becomes orchestrator
import { parseArguments } from './parser.js';
import { validateInput, ValidationResult } from './validator.js';
import { shouldEnterInteractiveMode, promptMissingArguments } from './interactive-prompt.js';
import { fetchDirectoryContents } from '../github/fetcher.js';
import { writeFiles } from '../filesystem/writer.js';
import { ProgressReporter } from '../reporting/progress-reporter.js';
import { handleError } from '../reporting/error-handler.js';

export async function execute(argv: string[]): Promise<ExecutionResult> {
  const reporter = new ProgressReporter({ useColor: true });
  
  try {
    const args = parseArguments(argv);
    const validation = validateInput(args);
    
    if (!validation.isValid) {
      return handleValidationError(validation);
    }
    
    const finalArgs = shouldEnterInteractiveMode(args)
      ? await promptMissingArguments(args)
      : args;
    
    reporter.reportProgress('Fetching files...');
    const files = await fetchDirectoryContents(finalArgs.repository);
    
    reporter.reportProgress('Writing files...');
    await writeFiles(files, finalArgs.output);
    
    reporter.reportSuccess(`Downloaded ${files.length} files`);
    return { success: true, filesDownloaded: files.length };
    
  } catch (error) {
    return handleError(error, reporter);
  }
}
```

## Directory Structure After Extraction

```
src/
├── cli/
│   ├── entry.ts           # Orchestration (≤150 lines)
│   ├── parser.ts          # Argument parsing
│   ├── validator.ts       # Input validation
│   ├── interactive-prompt.ts
│   └── prompts/           # Focused prompt modules
│       ├── repository-prompt.ts
│       ├── project-prompt.ts
│       └── branch-prompt.ts
├── github/
│   ├── fetcher.ts
│   └── parallel-fetcher.ts
├── filesystem/
│   ├── writer.ts
│   └── path-utils.ts
└── reporting/
    ├── progress-reporter.ts
    └── error-handler.ts
```

## Extraction Checklist

- [ ] Each new module has single responsibility
- [ ] Public API signatures unchanged
- [ ] All imports use explicit paths (no barrel imports for internals)
- [ ] No circular dependencies introduced
- [ ] Tests still pass after extraction
- [ ] TypeScript strict mode passes
