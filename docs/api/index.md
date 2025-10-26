---
title: API Specification
description: Kirox CLI API specification
---

# API Specification

API specification for Kirox CLI's major modules.

## Architecture Overview

Kirox CLI adopts a Layer-Based Architecture:

```
CLI Layer (src/cli/)
    ↓
GitHub Integration Layer (src/github/)
    ↓
File System Layer (src/filesystem/)
    ↓
Reporting Layer (src/reporting/)
```

## Major Modules

### [GitHub Fetcher](/api/github-fetcher)
Module for fetching files from GitHub repositories.

**Responsibilities**:
- Communication with GitHub API
- Fetching repository content
- Decoding base64-encoded content
- Parallel file fetching and semaphore control
- Rate limit monitoring and handling

### [FileSystem Writer](/api/filesystem-writer)
Module for writing files to the local filesystem.

**Responsibilities**:
- Writing to local filesystem
- Automatic directory creation
- Existing file overwrite confirmation prompt
- --dry-run mode processing

## Architecture Principles

### 1. Single Responsibility Principle (SRP)
Each component has a single responsibility.

### 2. Dependency Inversion Principle (DIP)
Upper layers depend on abstractions (interfaces), not on concrete implementations.

### 3. Layer Isolation
Minimize direct dependencies between layers; GitHub and FileSystem layers don't depend on each other.

## Development Guidelines

### TypeScript
- **Strict type checking**: `strict: true`
- **No `any`**: Enforce explicit type definitions
- **Explicit return types**: Explicitly specify function return types instead of relying on inference

### Naming
- **Functions**: Camel case starting with verbs (`fetchFiles`, `validateInput`)
- **Classes**: Noun-based Pascal case (`GitHubFetcher`, `ProgressReporter`)
- **Constants**: Upper snake case (`MAX_CONCURRENCY`, `DEFAULT_CONFIG`)

### Error Handling
- **Custom error classes**: Define domain-specific error types
- **Proper error propagation**: Don't suppress errors with try-catch

### Async/Await
- **No Promise chains**: Prefer async/await
- **Parallel processing**: Use `Promise.all()` / `Promise.allSettled()`

## Performance

- **Parallel file fetching**: Max 5 concurrent
- **Large file fetching**: Within 30 seconds for 50 files
- **Memory usage**: Within 100MB for 100 files
- **Rate limit avoidance**: No GitHub API rate limit violation for 100 files

## Next Steps

- [GitHub Fetcher API](/api/github-fetcher): Details on GitHub integration
- [FileSystem Writer API](/api/filesystem-writer): Details on filesystem operations
