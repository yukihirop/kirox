---
name: typescript-clean-code
description: Write clean, maintainable TypeScript code from the start. Use when implementing new features, modules, or files. Applies Single Responsibility Principle (SRP), proper layered architecture, explicit typing, and size constraints to avoid future refactoring. Includes patterns for CLI tools, API integrations, and modular design.
---

# TypeScript Clean Code Implementation

Write well-structured TypeScript code that won't need refactoring later.

## Core Constraints

### Size Limits (Hard Rules)
| Element | Max Lines | Target |
|---------|-----------|--------|
| File | 400 | ≤200 |
| Function | 50 | ≤30 |
| Class | 300 | ≤150 |
| Method | 30 | ≤20 |

**If approaching limits during implementation, split immediately.**

### Single Responsibility Check
Before writing, ask: "Can I describe this module's purpose in one sentence without 'and'?"

- ✅ "Parses CLI arguments into typed options"
- ❌ "Parses arguments and validates input and calls GitHub API"

## File Structure Template

```typescript
// 1. Node.js built-ins
import path from 'node:path';
import fs from 'node:fs/promises';

// 2. External libraries
import { Octokit } from '@octokit/rest';
import chalk from 'chalk';

// 3. Internal modules (by layer: same → lower)
import { validateInput } from './validator.js';
import { fetchData } from '../github/fetcher.js';

// 4. Types only
import type { Config, Options } from './types.js';

// --- Implementation below ---
```

## Implementation Patterns

### Pattern 1: Orchestrator + Helpers

Entry points orchestrate; helpers do work.

```typescript
// entry.ts - Orchestrator (~100 lines max)
export async function execute(argv: string[]): Promise<Result> {
  const args = parseArguments(argv);
  const config = await loadConfig(args.configPath);
  const validated = validateInput(args, config);
  
  const data = await fetchData(validated);
  const output = await processData(data);
  
  return reportResult(output);
}

// Each helper in separate file or same file if <30 lines
function parseArguments(argv: string[]): ParsedArgs { /* 20 lines */ }
async function loadConfig(path: string): Promise<Config> { /* 25 lines */ }
```

### Pattern 2: Single-Purpose Modules

```typescript
// validator.ts - One job: validation
export function validateRepositoryFormat(input: string): boolean {
  const pattern = /^[\w-]+\/[\w.-]+$/;
  return pattern.test(input);
}

export function validateProjectName(name: string): ValidationResult {
  if (!name) return { valid: false, error: 'Name required' };
  if (name.length > 100) return { valid: false, error: 'Name too long' };
  return { valid: true };
}

// Don't add unrelated functions like formatting or API calls
```

### Pattern 3: Facade for Complex Subsystems

When a module needs multiple internal components:

```typescript
// progress-reporter.ts - Public facade
import { SpinnerManager } from './internal/spinner-manager.js';
import { MessageFormatter } from './internal/message-formatter.js';

export class ProgressReporter {
  private spinner: SpinnerManager;
  private formatter: MessageFormatter;
  
  constructor(options: ReporterOptions = {}) {
    this.spinner = new SpinnerManager(options);
    this.formatter = new MessageFormatter(options);
  }
  
  // Simple public methods delegate to internal components
  reportProgress(message: string): void {
    this.spinner.update(this.formatter.format(message));
  }
}
```

### Pattern 4: Utility Modules

Group related pure functions:

```typescript
// utils/path-utils.ts
export function getMetadataPath(outputDir: string): string {
  return path.join(outputDir, '.metadata.json');
}

export function normalizePath(input: string): string {
  return path.normalize(input).replace(/\\/g, '/');
}

// Keep utilities pure, stateless, and focused on one domain
```

## Layer Architecture

```
┌─────────────────────────────────────────┐
│  CLI Layer (entry points, prompts)      │  ← User interaction
├─────────────────────────────────────────┤
│  Service Layer (business logic)         │  ← Core logic
├─────────────────────────────────────────┤
│  Integration Layer (APIs, external)     │  ← External systems
├─────────────────────────────────────────┤
│  Infrastructure (filesystem, logging)   │  ← System resources
└─────────────────────────────────────────┘

RULE: Arrows point DOWN only. Never import from upper layers.
```

**Directory mapping:**
```
src/
├── cli/           # CLI Layer
├── services/      # Service Layer  
├── github/        # Integration Layer
├── filesystem/    # Infrastructure
└── reporting/     # Infrastructure
```

## Type Safety Rules

### Always Explicit Return Types
```typescript
// ✅ Explicit
function parseArgs(argv: string[]): ParsedArgs { ... }
async function fetchData(id: string): Promise<Data | null> { ... }

// ❌ Inferred (avoid)
function parseArgs(argv: string[]) { ... }
```

### No `any` Type
```typescript
// ✅ Use unknown + type guards
function processInput(input: unknown): Result {
  if (typeof input === 'string') {
    return processString(input);
  }
  throw new Error('Invalid input type');
}

// ❌ Never
function processInput(input: any): any { ... }
```

### Interface Over Type for Objects
```typescript
// ✅ Interface - extendable, better errors
interface UserConfig {
  name: string;
  options: ConfigOptions;
}

// Use type for unions, primitives, functions
type Status = 'pending' | 'complete' | 'failed';
type Handler = (event: Event) => void;
```

## Function Design

### Parameters
```typescript
// ✅ Options object for 3+ params
interface FetchOptions {
  repository: string;
  branch?: string;
  path?: string;
  recursive?: boolean;
}

async function fetchContents(options: FetchOptions): Promise<Content[]> { ... }

// ✅ Simple params for 1-2 args
function formatMessage(text: string, color?: string): string { ... }
```

### Error Handling
```typescript
// ✅ Specific error types
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Early returns for validation
function processUser(user: User | null): Result {
  if (!user) {
    throw new ValidationError('User required', 'user');
  }
  
  if (!user.email) {
    throw new ValidationError('Email required', 'email');
  }
  
  // Happy path - no deep nesting
  return doProcess(user);
}
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `user-service.ts` |
| Classes | PascalCase | `UserService` |
| Functions | camelCase | `fetchUserData` |
| Constants | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Interfaces | PascalCase (no I prefix) | `UserConfig` |
| Types | PascalCase | `RequestStatus` |
| Private fields | underscore or # | `_cache` or `#cache` |

### Descriptive Names
```typescript
// ✅ Clear intent
async function fetchProjectsByRepository(repo: string): Promise<Project[]>
function isValidRepositoryFormat(input: string): boolean
const MAX_CONCURRENT_REQUESTS = 5;

// ❌ Vague
async function getData(r: string): Promise<any[]>
function check(s: string): boolean
const MAX = 5;
```

## Comments Policy

### Keep: WHY comments
```typescript
// Business rule: Allow duplicate projects in different subdirectories
// because monorepos often have same project structure in multiple packages
if (existingProject.subdir !== newProject.subdir) {
  return false; // Not a duplicate
}
```

### Remove: WHAT comments
```typescript
// ❌ Don't write these
// Parse the arguments
const args = parseArguments(argv);

// Check if user exists
if (user) { ... }
```

### Use JSDoc for Public APIs
```typescript
/**
 * Fetches directory contents from GitHub repository.
 * 
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param options - Fetch options including branch and path
 * @returns Array of content items or empty array if path not found
 * @throws {GitHubError} When API request fails
 */
export async function fetchDirectoryContents(
  owner: string,
  repo: string,
  options?: FetchOptions
): Promise<ContentItem[]> { ... }
```

## Pre-Implementation Checklist

Before writing code:

- [ ] Can describe module purpose in one sentence (no "and")
- [ ] Know which layer it belongs to
- [ ] Identified dependencies (only from same or lower layers)
- [ ] Estimated size (will it fit in 200 lines?)
- [ ] Defined public interface with explicit types
- [ ] Named file and exports descriptively

## Quick Reference Card

```
┌────────────────────────────────────────────────────┐
│  BEFORE CODING                                     │
├────────────────────────────────────────────────────┤
│  □ One responsibility per file                    │
│  □ Layer placement decided                        │
│  □ Public API types defined                       │
├────────────────────────────────────────────────────┤
│  WHILE CODING                                      │
├────────────────────────────────────────────────────┤
│  □ Function hitting 30 lines? → Extract helper    │
│  □ File hitting 200 lines? → Split module         │
│  □ Adding "and" to description? → New module      │
│  □ Importing from upper layer? → Wrong direction  │
├────────────────────────────────────────────────────┤
│  AFTER CODING                                      │
├────────────────────────────────────────────────────┤
│  □ All return types explicit                      │
│  □ No `any` types                                 │
│  □ Self-documenting names                         │
│  □ Only WHY comments remain                       │
└────────────────────────────────────────────────────┘
```
