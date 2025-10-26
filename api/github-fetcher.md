---
url: /kirox/api/github-fetcher.md
description: GitHub integration module API specification
---

# GitHub Fetcher API

API specification for the module that fetches files from GitHub repositories.

## Overview

GitHub Fetcher (`src/github/`) is a layer that retrieves repository content using the GitHub REST API.

**Key Features**:

* Fetch repository content (directory listings, file content)
* Decode base64-encoded content
* Parallel file fetching and semaphore control
* Rate limit monitoring and handling

## Directory Structure

```
src/github/
├── fetcher.ts        # GitHubFetcher: Main file fetching logic
├── client.ts         # Octokit client initialization and authentication
├── semaphore.ts      # Semaphore for concurrency control utility
├── rate-limit.ts     # Rate limit checking and monitoring
└── types.ts          # GitHub layer type definitions (FetchResult, FileContent, etc.)
```

## Main Classes and Interfaces

### GitHubFetcher

Main class for fetching files from repositories.

#### Constructor

```typescript
class GitHubFetcher {
  constructor(
    private octokit: Octokit,
    private options: FetcherOptions
  ) {}
}
```

**Parameters**:

* `octokit`: Octokit instance
* `options`: Fetcher options

#### Methods

##### fetchFiles()

Fetches files from the specified repository.

```typescript
async fetchFiles(
  owner: string,
  repo: string,
  paths: string[],
  ref?: string
): Promise<FetchResult[]>
```

**Parameters**:

* `owner`: Repository owner name
* `repo`: Repository name
* `paths`: Array of file paths to fetch
* `ref`: Branch name, tag, or commit SHA (optional)

**Return Value**: `FetchResult[]` - Array of fetch results

**Example**:

```typescript
const fetcher = new GitHubFetcher(octokit, options);
const results = await fetcher.fetchFiles(
  'yukihirop',
  'my-project',
  ['.kiro/specs/api-spec/requirements.md', '.kiro/steering/tech.md'],
  'main'
);
```

##### fetchDirectoryContents()

Fetches the contents list of the specified directory.

```typescript
async fetchDirectoryContents(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<DirectoryContent[]>
```

**Parameters**:

* `owner`: Repository owner name
* `repo`: Repository name
* `path`: Directory path
* `ref`: Branch name, tag, or commit SHA (optional)

**Return Value**: `DirectoryContent[]` - Array of directory contents

##### fetchFilesInParallel()

Fetches multiple files in parallel (max 5 concurrent).

```typescript
async fetchFilesInParallel(
  owner: string,
  repo: string,
  paths: string[],
  ref?: string
): Promise<FetchResult[]>
```

**Parameters**:

* `owner`: Repository owner name
* `repo`: Repository name
* `paths`: Array of file paths to fetch
* `ref`: Branch name, tag, or commit SHA (optional)

**Return Value**: `FetchResult[]` - Array of fetch results

## Type Definitions

### FetchResult

Represents file fetch result.

```typescript
interface FetchResult {
  path: string;
  content: string | null;
  success: boolean;
  error?: string;
  size?: number;
  sha?: string;
}
```

**Properties**:

* `path`: File path
* `content`: File content (on successful fetch)
* `success`: Fetch success flag
* `error`: Error message (on failed fetch)
* `size`: File size (bytes)
* `sha`: Git object SHA

### DirectoryContent

Represents directory content.

```typescript
interface DirectoryContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
}
```

**Properties**:

* `name`: File/directory name
* `path`: Relative path
* `type`: Type (`file` or `dir`)
* `size`: File size (bytes, files only)
* `sha`: Git object SHA

### FetcherOptions

Represents fetcher options.

```typescript
interface FetcherOptions {
  maxConcurrency?: number;  // Max concurrency (default: 5)
  timeout?: number;          // Timeout in milliseconds (default: 30000)
  retries?: number;          // Number of retries (default: 3)
}
```

## Semaphore Control

### Semaphore

Semaphore class for controlling concurrency.

```typescript
class Semaphore {
  constructor(private maxConcurrency: number) {}

  async acquire(): Promise<void>
  release(): void
}
```

**Usage Example**:

```typescript
const semaphore = new Semaphore(5);

await semaphore.acquire();
try {
  // Concurrent processing
  await fetchFile();
} finally {
  semaphore.release();
}
```

## Rate Limit Management

### RateLimitManager

Manages GitHub API rate limits.

```typescript
class RateLimitManager {
  async checkRateLimit(octokit: Octokit): Promise<RateLimitStatus>
  async waitForRateLimit(octokit: Octokit): Promise<void>
}
```

#### checkRateLimit()

Gets current rate limit status.

**Return Value**: `RateLimitStatus`

```typescript
interface RateLimitStatus {
  limit: number;       // Rate limit (number of requests)
  remaining: number;   // Remaining requests
  reset: number;       // Reset time (UNIX timestamp)
  used: number;        // Used requests
}
```

## Error Handling

### GitHubAPIError

Custom error class representing GitHub API errors.

```typescript
class GitHubAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public response?: any
  ) {
    super(message);
  }
}
```

**Error Codes**:

* `404`: Repository or file not found
* `403`: Rate limit exceeded or insufficient permissions
* `401`: Authentication error
* `500`: Server error

## Usage Examples

### Basic Usage

```typescript
import { Octokit } from 'octokit';
import { GitHubFetcher } from './github/fetcher';

// Initialize Octokit client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Initialize GitHubFetcher
const fetcher = new GitHubFetcher(octokit, {
  maxConcurrency: 5,
  timeout: 30000,
  retries: 3
});

// Fetch files
const results = await fetcher.fetchFiles(
  'yukihirop',
  'my-project',
  ['.kiro/specs/api-spec/requirements.md'],
  'main'
);

results.forEach(result => {
  if (result.success) {
    console.log(`✓ ${result.path}: ${result.size} bytes`);
  } else {
    console.error(`✗ ${result.path}: ${result.error}`);
  }
});
```

### Parallel File Fetching

```typescript
const paths = [
  '.kiro/specs/api-spec/requirements.md',
  '.kiro/specs/api-spec/design.md',
  '.kiro/specs/api-spec/tasks.md',
  '.kiro/steering/tech.md',
  '.kiro/steering/structure.md'
];

const results = await fetcher.fetchFilesInParallel(
  'yukihirop',
  'my-project',
  paths,
  'main'
);
```

### Fetch Directory Contents

```typescript
const contents = await fetcher.fetchDirectoryContents(
  'yukihirop',
  'my-project',
  '.kiro/specs',
  'main'
);

contents.forEach(item => {
  console.log(`${item.type}: ${item.path}`);
});
```

## Performance

### Parallel Processing

* **Max concurrency**: 5 requests
* **Large file fetching**: Within 30 seconds for 50 files
* **Time reduction**: Approximately 80% time reduction (with parallel processing)

### Rate Limits

* **Without authentication**: 60 requests/hour
* **With authentication**: 5,000 requests/hour

## Related Pages

* [FileSystem Writer API](/api/filesystem-writer): Details on filesystem operations
* [API Specification](/api/): API specification overview
