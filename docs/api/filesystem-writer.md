---
title: FileSystem Writer API
description: Filesystem operations module API specification
---

# FileSystem Writer API

API specification for the module that writes files to the local filesystem.

## Overview

FileSystem Writer (`src/filesystem/`) is the layer responsible for writing to the local filesystem.

**Key Features**:
- Writing to local filesystem
- Automatic directory creation (`.kiro/specs/`, `.kiro/steering/`)
- Existing file overwrite confirmation prompt
- --dry-run mode processing (skip writing)

## Directory Structure

```
src/filesystem/
├── writer.ts          # FileWriter: Main file writing logic
├── prompt.ts          # PromptService: Interactive prompts (overwrite confirmation)
├── path-utils.ts      # Path conversion utilities (remote→local)
└── types.ts           # Filesystem layer type definitions (WriteOptions, etc.)
```

## Main Classes and Interfaces

### FileWriter

Main class for writing files.

#### Constructor

```typescript
class FileWriter {
  constructor(private options: WriterOptions) {}
}
```

**Parameters**:
- `options`: Writer options

#### Methods

##### writeFiles()

Writes multiple files to the local filesystem.

```typescript
async writeFiles(
  files: FileContent[],
  options?: WriteOptions
): Promise<WriteResult[]>
```

**Parameters**:
- `files`: Array of files to write
- `options`: Write options (optional)

**Return Value**: `WriteResult[]` - Array of write results

**Example**:
```typescript
const writer = new FileWriter({ force: false, dryRun: false });
const results = await writer.writeFiles([
  { path: '.kiro/specs/api-spec/requirements.md', content: '...' },
  { path: '.kiro/steering/tech.md', content: '...' }
]);
```

##### writeFile()

Writes a single file.

```typescript
async writeFile(
  filePath: string,
  content: string,
  options?: WriteOptions
): Promise<WriteResult>
```

**Parameters**:
- `filePath`: File path
- `content`: File content
- `options`: Write options (optional)

**Return Value**: `WriteResult` - Write result

##### ensureDirectory()

Ensures a directory exists, creating it if it doesn't.

```typescript
async ensureDirectory(dirPath: string): Promise<void>
```

**Parameters**:
- `dirPath`: Directory path

## Type Definitions

### FileContent

Represents file content.

```typescript
interface FileContent {
  path: string;
  content: string;
  mode?: string;
}
```

**Properties**:
- `path`: File path
- `content`: File content
- `mode`: File mode (optional, default: `0o644`)

### WriteResult

Represents file write result.

```typescript
interface WriteResult {
  path: string;
  success: boolean;
  action: 'created' | 'updated' | 'skipped';
  error?: string;
  size?: number;
}
```

**Properties**:
- `path`: File path
- `success`: Write success flag
- `action`: Executed action
  - `created`: Newly created
  - `updated`: Overwritten
  - `skipped`: Skipped (dry-run or user declined)
- `error`: Error message (on write failure)
- `size`: Written file size (bytes)

### WriterOptions

Represents writer options.

```typescript
interface WriterOptions {
  force?: boolean;      // Skip overwrite confirmation (default: false)
  dryRun?: boolean;     // Dry-run mode (default: false)
  verbose?: boolean;    // Verbose logging (default: false)
}
```

### WriteOptions

Represents write options (for individual files).

```typescript
interface WriteOptions {
  overwrite?: boolean;  // Overwrite existing file
  skipPrompt?: boolean; // Skip overwrite confirmation prompt
}
```

## Prompt Service

### PromptService

Service providing interactive prompts.

```typescript
class PromptService {
  async confirmOverwrite(filePath: string): Promise<boolean>
  async confirmOverwriteAll(): Promise<OverwriteAction>
}
```

#### confirmOverwrite()

Confirms overwrite for a single file.

**Parameters**:
- `filePath`: File path

**Return Value**: `boolean` - `true`: Overwrite, `false`: Skip

**Example**:
```typescript
const prompt = new PromptService();
const shouldOverwrite = await prompt.confirmOverwrite('.kiro/specs/api-spec/requirements.md');
```

#### confirmOverwriteAll()

Confirms overwrite action for all files.

**Return Value**: `OverwriteAction`

```typescript
type OverwriteAction = 'yes' | 'no' | 'all' | 'none';
```

- `yes`: Overwrite this file only
- `no`: Skip this file
- `all`: Overwrite all
- `none`: Skip all

## Path Utilities

### PathUtils

Provides path conversion utilities.

```typescript
class PathUtils {
  static normalize(path: string): string
  static join(...paths: string[]): string
  static isAbsolute(path: string): boolean
  static relative(from: string, to: string): string
}
```

#### normalize()

Normalizes a path.

```typescript
const normalized = PathUtils.normalize('.kiro/specs//api-spec/requirements.md');
// => '.kiro/specs/api-spec/requirements.md'
```

#### join()

Joins multiple paths.

```typescript
const joined = PathUtils.join('.kiro', 'specs', 'api-spec', 'requirements.md');
// => '.kiro/specs/api-spec/requirements.md'
```

## Error Handling

### FileSystemError

Custom error class representing filesystem errors.

```typescript
class FileSystemError extends Error {
  constructor(
    public code: string,
    message: string,
    public path?: string
  ) {
    super(message);
  }
}
```

**Error Codes**:
- `EACCES`: Permission error
- `ENOENT`: File or directory not found
- `EEXIST`: File already exists
- `ENOSPC`: Disk space insufficient

## Usage Examples

### Basic Usage

```typescript
import { FileWriter } from './filesystem/writer';

// Initialize FileWriter
const writer = new FileWriter({
  force: false,
  dryRun: false,
  verbose: true
});

// Write files
const results = await writer.writeFiles([
  { path: '.kiro/specs/api-spec/requirements.md', content: '# Requirements' },
  { path: '.kiro/steering/tech.md', content: '# Tech Stack' }
]);

results.forEach(result => {
  if (result.success) {
    console.log(`✓ ${result.action}: ${result.path} (${result.size} bytes)`);
  } else {
    console.error(`✗ ${result.path}: ${result.error}`);
  }
});
```

### Dry-Run Mode

```typescript
const writer = new FileWriter({
  force: false,
  dryRun: true,  // Dry-run mode
  verbose: true
});

const results = await writer.writeFiles([
  { path: '.kiro/specs/api-spec/requirements.md', content: '...' }
]);

// Sample output: [DRY RUN] Would create: .kiro/specs/api-spec/requirements.md
```

### Force Overwrite

```typescript
const writer = new FileWriter({
  force: true,   // Skip overwrite confirmation
  dryRun: false,
  verbose: false
});

const results = await writer.writeFiles([
  { path: '.kiro/specs/api-spec/requirements.md', content: '...' }
]);
```

### Overwrite Confirmation Prompt

```typescript
import { PromptService } from './filesystem/prompt';

const prompt = new PromptService();

// Single file confirmation
const shouldOverwrite = await prompt.confirmOverwrite('.kiro/specs/api-spec/requirements.md');

if (shouldOverwrite) {
  await writer.writeFile('.kiro/specs/api-spec/requirements.md', content);
}

// All files confirmation
const action = await prompt.confirmOverwriteAll();

switch (action) {
  case 'all':
    // Overwrite all
    break;
  case 'none':
    // Skip all
    break;
  case 'yes':
    // Overwrite this file only
    break;
  case 'no':
    // Skip this file
    break;
}
```

### Automatic Directory Creation

```typescript
const writer = new FileWriter({ force: false, dryRun: false });

// Automatically create directory if it doesn't exist
await writer.ensureDirectory('.kiro/specs/new-project');

// Write file (directory is automatically created)
await writer.writeFile('.kiro/specs/new-project/requirements.md', '# Requirements');
```

## Performance

### Write Speed

- **Single file**: Less than 1ms (SSD environment)
- **Large files**: Within 1 second for 100 files
- **Directory creation**: Within 10ms for recursive directory creation

## Related Pages

- [GitHub Fetcher API](/api/github-fetcher): Details on GitHub integration
- [API Specification](/api/): API specification overview
