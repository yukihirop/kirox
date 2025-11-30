# Utility Consolidation Pattern

Eliminate code duplication by extracting shared logic into utility modules.

## When to Apply
- Same logic appears in 2+ files
- Copy-paste patterns emerge during development
- Multiple files depend on similar helper functions
- Utility functions are scattered across domain modules

## Consolidation Process

### Step 1: Identify Duplicates

```typescript
// Duplicate 1: entry.ts
function getMetadataPath(outputDir: string): string {
  return path.join(outputDir, '.kirox-metadata.json');
}

// Duplicate 2: add-command-entry.ts
function getMetadataPath(outputDir: string): string {
  return path.join(outputDir, '.kirox-metadata.json');
}

// Duplicate 3: update-checker.ts
const metadataPath = path.join(outputDir, '.kirox-metadata.json');
```

### Step 2: Extract to Utility Module

```typescript
// NEW: src/cli/utils/metadata-utils.ts
import path from 'node:path';
import type { ProjectMetadata } from '../../tracking/types.js';

const METADATA_FILENAME = '.kirox-metadata.json';

export function getMetadataPath(outputDir: string): string {
  return path.join(outputDir, METADATA_FILENAME);
}

export function isDuplicateProject(
  metadata: ProjectMetadata,
  repository: string,
  projectName: string,
  subdir?: string
): boolean {
  return metadata.projects.some(
    (p) =>
      p.repository === repository &&
      p.name === projectName &&
      p.subdir === subdir
  );
}

export function createProjectEntry(
  repository: string,
  projectName: string,
  options: { branch?: string; subdir?: string }
): ProjectEntry {
  return {
    repository,
    name: projectName,
    branch: options.branch,
    subdir: options.subdir,
    addedAt: new Date().toISOString(),
  };
}
```

### Step 3: Update All Consumers

```typescript
// UPDATED: entry.ts
import { getMetadataPath, isDuplicateProject } from './utils/metadata-utils.js';

// UPDATED: add-command-entry.ts
import { getMetadataPath, isDuplicateProject, createProjectEntry } from './utils/metadata-utils.js';

// UPDATED: update-checker.ts
import { getMetadataPath } from '../cli/utils/metadata-utils.js';
```

## Utility Module Patterns

### Pattern 1: Domain Utilities
Group utilities by domain responsibility:

```
src/
├── cli/
│   └── utils/
│       ├── metadata-utils.ts    # Metadata operations
│       ├── path-utils.ts        # CLI path handling
│       └── validation-utils.ts  # Input validation helpers
├── github/
│   └── utils/
│       ├── api-utils.ts         # API response handling
│       └── rate-limit-utils.ts  # Rate limiting helpers
└── reporting/
    └── utils/
        └── format-utils.ts      # Message formatting
```

### Pattern 2: Shared Utilities
For cross-cutting concerns:

```
src/
└── shared/
    ├── string-utils.ts     # String manipulation
    ├── async-utils.ts      # Promise helpers
    └── error-utils.ts      # Error creation/handling
```

## Common Extraction Candidates

| Duplicate Pattern | Utility Name | Purpose |
|-------------------|--------------|---------|
| Path construction | `path-utils.ts` | Consistent path handling |
| Format validation | `validation-utils.ts` | Input validation helpers |
| Date/time handling | `date-utils.ts` | Timestamp formatting |
| Error creation | `error-utils.ts` | Typed error factories |
| API response parsing | `api-utils.ts` | Response normalization |
| Config merging | `config-utils.ts` | Configuration handling |

## Utility Design Guidelines

### Do: Single Purpose Functions
```typescript
// Good: Single, clear purpose
export function normalizeRepositoryPath(input: string): string {
  return input.replace(/^https:\/\/github\.com\//, '')
              .replace(/\.git$/, '')
              .trim();
}
```

### Don't: Kitchen Sink Utilities
```typescript
// Bad: Unrelated functions bundled together
export function utils(input: any): any {
  // Does everything, tests nothing well
}
```

### Do: Type-Safe Interfaces
```typescript
// Good: Explicit types
export function parseProjectName(
  input: string
): { name: string; version?: string } {
  // Implementation
}
```

### Don't: Implicit Any
```typescript
// Bad: Type safety lost
export function parseProjectName(input) {
  return { name: input.split('@')[0] };
}
```

## Testing Utilities

```typescript
// Utilities should be pure and easy to test
describe('metadata-utils', () => {
  describe('getMetadataPath', () => {
    it('joins output dir with metadata filename', () => {
      expect(getMetadataPath('/project/.kiro'))
        .toBe('/project/.kiro/.kirox-metadata.json');
    });
  });

  describe('isDuplicateProject', () => {
    const metadata: ProjectMetadata = {
      projects: [
        { repository: 'owner/repo', name: 'project-a', subdir: undefined },
        { repository: 'owner/repo', name: 'project-b', subdir: 'packages/b' },
      ],
    };

    it('detects exact duplicate', () => {
      expect(isDuplicateProject(metadata, 'owner/repo', 'project-a'))
        .toBe(true);
    });

    it('allows same project in different subdir', () => {
      expect(isDuplicateProject(metadata, 'owner/repo', 'project-a', 'other'))
        .toBe(false);
    });
  });
});
```

## Consolidation Checklist

- [ ] Identified all instances of duplicated logic
- [ ] Created focused utility module with clear purpose
- [ ] Added explicit TypeScript types
- [ ] Updated all consumers to use utility
- [ ] Added unit tests for utility functions
- [ ] Verified no circular dependencies
- [ ] Updated imports to follow project conventions
