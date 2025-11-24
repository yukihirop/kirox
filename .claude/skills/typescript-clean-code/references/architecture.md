# Layered Architecture Guide

How to organize code into proper layers from the start.

## Layer Definitions

### CLI Layer (`src/cli/`)
**Purpose**: Handle user interaction and orchestrate workflows

**Contains**:
- Entry points (`entry.ts`, `add-command-entry.ts`)
- Argument parsing (`parser.ts`)
- Input validation (`validator.ts`)
- Interactive prompts (`prompts/`)
- Command-line utilities

**Allowed Dependencies**:
- All lower layers
- External: commander, inquirer, chalk

```typescript
// cli/entry.ts
import { fetchProjects } from '../github/fetcher.js';  // ✅ Lower layer
import { writeFiles } from '../filesystem/writer.js';  // ✅ Lower layer
import { ProgressReporter } from '../reporting/progress-reporter.js'; // ✅ Lower layer
```

### Service Layer (`src/services/`)
**Purpose**: Core business logic, domain rules

**Contains**:
- Business rule implementations
- Domain-specific processing
- Workflow coordination (non-CLI)

**Allowed Dependencies**:
- Integration layer
- Infrastructure layer
- Shared types

```typescript
// services/project-manager.ts
import { GitHubClient } from '../github/client.js';  // ✅ Lower layer
import { MetadataStore } from '../tracking/metadata-manager.js';  // ✅ Lower layer
```

### Integration Layer (`src/github/`, `src/external/`)
**Purpose**: External system communication

**Contains**:
- API clients (`client.ts`, `fetcher.ts`)
- External service wrappers
- Rate limiting, retry logic

**Allowed Dependencies**:
- Infrastructure layer only
- External: octokit, axios

```typescript
// github/fetcher.ts
import { createLogger } from '../reporting/pino-logger.js';  // ✅ Lower layer

// ❌ NEVER
import { parseArgs } from '../cli/parser.js';  // Upper layer - forbidden
```

### Infrastructure Layer (`src/filesystem/`, `src/reporting/`, `src/tracking/`)
**Purpose**: System resources and cross-cutting concerns

**Contains**:
- File system operations
- Logging and progress reporting
- Metadata persistence
- Error handling

**Allowed Dependencies**:
- Other infrastructure modules (same level)
- External: fs, path, pino, ora, chalk

```typescript
// filesystem/writer.ts
import { createLogger } from '../reporting/pino-logger.js';  // ✅ Same level OK

// ❌ NEVER
import { fetchFiles } from '../github/fetcher.js';  // Upper layer - forbidden
```

## Layer Violation Detection

### Common Violations

**Violation 1: Infrastructure importing Service**
```typescript
// ❌ reporting/progress-reporter.ts
import { ProjectService } from '../services/project-service.js';

// Fix: Pass data as parameters instead
export function reportProgress(projectName: string, status: Status): void { ... }
```

**Violation 2: Integration importing CLI**
```typescript
// ❌ github/fetcher.ts
import { promptRetry } from '../cli/prompts/retry-prompt.js';

// Fix: Throw error, let CLI layer handle user interaction
if (rateLimited) {
  throw new RateLimitError('API rate limit exceeded');
}
```

**Violation 3: Circular dependencies**
```typescript
// ❌ Circular: A imports B, B imports A
// cli/entry.ts
import { Fetcher } from '../github/fetcher.js';

// github/fetcher.ts  
import { getConfig } from '../cli/entry.js';  // Creates cycle!

// Fix: Extract shared dependency to lower layer
// config/config-loader.ts (new file in infrastructure)
export function loadConfig(): Config { ... }
```

## Directory Structure

```
src/
├── cli/                    # CLI Layer
│   ├── entry.ts           # Main entry point
│   ├── add-command-entry.ts
│   ├── parser.ts          # Argument parsing
│   ├── validator.ts       # Input validation
│   ├── types.ts           # CLI-specific types
│   └── prompts/           # Interactive prompts
│       ├── repository-prompt.ts
│       ├── project-prompt.ts
│       └── branch-prompt.ts
│
├── services/               # Service Layer
│   ├── project-service.ts
│   └── update-service.ts
│
├── github/                 # Integration Layer
│   ├── client.ts          # Octokit wrapper
│   ├── fetcher.ts         # Content fetching
│   ├── parallel-fetcher.ts
│   └── types.ts
│
├── filesystem/             # Infrastructure Layer
│   ├── writer.ts
│   ├── path-utils.ts
│   └── types.ts
│
├── reporting/              # Infrastructure Layer
│   ├── progress-reporter.ts
│   ├── error-handler.ts
│   ├── pino-logger.ts
│   └── internal/
│       ├── spinner-manager.ts
│       └── message-formatter.ts
│
├── tracking/               # Infrastructure Layer
│   ├── metadata-manager.ts
│   └── types.ts
│
├── config/                 # Infrastructure Layer
│   ├── loader.ts
│   ├── merger.ts
│   └── types.ts
│
└── shared/                 # Shared utilities (any layer can import)
    ├── types.ts           # Shared type definitions
    └── constants.ts       # Shared constants
```

## Dependency Flow Diagram

```
                    ┌─────────────┐
                    │  CLI Layer  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Services   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Integration │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │Infrastructure│
                    └─────────────┘

Arrows = allowed import direction
```

## Module Placement Decision Tree

```
Is it user-facing (CLI args, prompts, output)?
├─ Yes → CLI Layer
└─ No
   │
   Is it business logic / domain rules?
   ├─ Yes → Service Layer
   └─ No
      │
      Does it talk to external APIs?
      ├─ Yes → Integration Layer
      └─ No → Infrastructure Layer
```

## Testing Implications

Proper layering enables focused testing:

```typescript
// Unit test service layer with mocked integration
describe('ProjectService', () => {
  it('filters invalid projects', () => {
    const mockFetcher = { fetch: vi.fn() };
    const service = new ProjectService(mockFetcher);
    // Test business logic in isolation
  });
});

// Integration test with real GitHub (but mocked filesystem)
describe('GitHubFetcher', () => {
  it('handles rate limiting', async () => {
    // Test API behavior
  });
});

// E2E test through CLI layer
describe('CLI', () => {
  it('completes full workflow', async () => {
    const result = await execute(['owner/repo', '-p', 'project']);
    expect(result.success).toBe(true);
  });
});
```
