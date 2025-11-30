# Module Design Templates

Ready-to-use templates for common module types.

## Template 1: Entry Point (Orchestrator)

Use for: Main commands, CLI entry points

```typescript
// cli/entry.ts
import path from 'node:path';

import { parseArguments } from './parser.js';
import { validateInput } from './validator.js';
import { shouldEnterInteractiveMode, promptMissingArguments } from './interactive-prompt.js';
import { fetchDirectoryContents } from '../github/fetcher.js';
import { writeFiles } from '../filesystem/writer.js';
import { ProgressReporter } from '../reporting/progress-reporter.js';
import { handleError } from '../reporting/error-handler.js';

import type { ExecutionResult, ParsedArguments } from './types.js';

export async function execute(argv: string[]): Promise<ExecutionResult> {
  const reporter = new ProgressReporter();
  
  try {
    // 1. Parse and validate
    const args = parseArguments(argv);
    const validation = validateInput(args);
    
    if (!validation.isValid) {
      return { success: false, error: validation.error, exitCode: 1 };
    }
    
    // 2. Interactive mode if needed
    const finalArgs = shouldEnterInteractiveMode(args)
      ? await promptMissingArguments(args)
      : args;
    
    // 3. Execute core workflow
    reporter.reportProgress('Fetching files...');
    const files = await fetchDirectoryContents(finalArgs.repository, finalArgs.path);
    
    reporter.reportProgress('Writing files...');
    const written = await writeFiles(files, finalArgs.output);
    
    // 4. Report success
    reporter.reportSuccess(`Downloaded ${written.length} files`);
    
    return {
      success: true,
      filesDownloaded: written.length,
      exitCode: 0,
    };
    
  } catch (error) {
    return handleError(error, reporter);
  }
}
```

**Key characteristics**:
- ~50-80 lines
- Minimal logic, maximum delegation
- Clear phase comments
- Single try-catch at top level

---

## Template 2: Service Module

Use for: Business logic, domain operations

```typescript
// services/project-service.ts
import type { Project, ProjectFilter, ProjectSortOrder } from './types.js';

export class ProjectService {
  constructor(
    private readonly repository: ProjectRepository
  ) {}

  async findProjects(filter: ProjectFilter): Promise<Project[]> {
    const allProjects = await this.repository.getAll();
    return this.applyFilter(allProjects, filter);
  }

  async addProject(project: Project): Promise<Project> {
    this.validateProject(project);
    
    const existing = await this.repository.findByName(project.name);
    if (existing && !this.allowsDuplicate(existing, project)) {
      throw new DuplicateProjectError(project.name);
    }
    
    return this.repository.save(project);
  }

  private applyFilter(projects: Project[], filter: ProjectFilter): Project[] {
    let result = projects;
    
    if (filter.name) {
      result = result.filter(p => p.name.includes(filter.name!));
    }
    
    if (filter.status) {
      result = result.filter(p => p.status === filter.status);
    }
    
    return this.sortProjects(result, filter.sortOrder);
  }

  private validateProject(project: Project): void {
    if (!project.name) {
      throw new ValidationError('Project name is required');
    }
    if (project.name.length > 100) {
      throw new ValidationError('Project name too long');
    }
  }

  private allowsDuplicate(existing: Project, newProject: Project): boolean {
    // Business rule: Allow same name in different subdirectories
    return existing.subdir !== newProject.subdir;
  }

  private sortProjects(projects: Project[], order?: ProjectSortOrder): Project[] {
    if (!order) return projects;
    
    return [...projects].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return order === 'desc' ? -comparison : comparison;
    });
  }
}
```

**Key characteristics**:
- Constructor injection for dependencies
- Public methods are thin (call private helpers)
- Private methods handle specific logic
- Business rules documented in method names

---

## Template 3: Utility Module

Use for: Pure functions, shared helpers

```typescript
// utils/path-utils.ts
import path from 'node:path';

const METADATA_FILENAME = '.kirox-metadata.json';
const CONFIG_FILENAME = '.kiroxrc.json';

export function getMetadataPath(outputDir: string): string {
  return path.join(outputDir, METADATA_FILENAME);
}

export function getConfigPath(outputDir: string): string {
  return path.join(outputDir, CONFIG_FILENAME);
}

export function normalizePath(input: string): string {
  return path.normalize(input).replace(/\\/g, '/');
}

export function isSubpath(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function getRelativePath(from: string, to: string): string {
  return normalizePath(path.relative(from, to));
}
```

**Key characteristics**:
- Pure functions (no side effects)
- Constants at top
- Each function does one thing
- No class needed

---

## Template 4: Prompt Module

Use for: Interactive user input

```typescript
// cli/prompts/repository-prompt.ts
import { input } from '@inquirer/prompts';

import { validateRepositoryFormat } from '../validator.js';
import { loadMetadata } from '../../tracking/metadata-manager.js';

import type { PromptOptions, Metadata } from '../types.js';

export interface RepositoryPromptOptions {
  currentValue?: string;
  metadata?: Metadata;
}

export async function promptRepository(
  options: RepositoryPromptOptions = {}
): Promise<string> {
  const defaultValue = options.currentValue 
    ?? getLastUsedRepository(options.metadata);
  
  const repository = await input({
    message: 'Enter repository (owner/repo):',
    default: defaultValue,
    validate: (value) => {
      if (!value.trim()) {
        return 'Repository is required';
      }
      if (!validateRepositoryFormat(value)) {
        return 'Invalid format. Use: owner/repo';
      }
      return true;
    },
  });
  
  return repository.trim();
}

function getLastUsedRepository(metadata?: Metadata): string | undefined {
  if (!metadata?.projects?.length) return undefined;
  
  // Return most recently added project's repository
  const sorted = [...metadata.projects].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );
  
  return sorted[0]?.repository;
}
```

**Key characteristics**:
- Single prompt per file
- Options interface for configuration
- Inline validation
- Helper functions for defaults

---

## Template 5: Facade Class

Use for: Simplifying complex subsystems

```typescript
// reporting/progress-reporter.ts
import { SpinnerManager } from './internal/spinner-manager.js';
import { MessageFormatter } from './internal/message-formatter.js';

import type { ReporterOptions, ProgressInfo } from './types.js';

export class ProgressReporter {
  private readonly spinner: SpinnerManager;
  private readonly formatter: MessageFormatter;

  constructor(options: ReporterOptions = {}) {
    this.spinner = new SpinnerManager({
      enabled: options.spinners ?? true,
      fallback: !process.stdout.isTTY,
    });
    this.formatter = new MessageFormatter({
      colors: options.colors ?? true,
    });
  }

  reportStart(repository: string, project: string): void {
    const message = this.formatter.formatStart(repository, project);
    this.spinner.start('main', message);
  }

  reportProgress(info: ProgressInfo): void {
    const message = this.formatter.formatProgress(info);
    this.spinner.update('main', message);
  }

  reportSuccess(filesCount: number): void {
    const message = this.formatter.formatSuccess(filesCount);
    this.spinner.succeed('main', message);
  }

  reportError(error: Error): void {
    const message = this.formatter.formatError(error);
    this.spinner.fail('main', message);
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
```

**Key characteristics**:
- Private internal components
- Simple public interface
- Constructor handles component creation
- Methods delegate, don't implement

---

## Template 6: Types Module

Use for: Shared type definitions

```typescript
// types.ts

// ============ Interfaces ============

export interface Project {
  readonly name: string;
  readonly repository: string;
  readonly branch?: string;
  readonly subdir?: string;
  readonly addedAt: string;
}

export interface ProjectMetadata {
  readonly version: string;
  readonly projects: readonly Project[];
  readonly lastUpdated: string;
}

export interface FetchOptions {
  readonly repository: string;
  readonly branch?: string;
  readonly path?: string;
  readonly recursive?: boolean;
}

// ============ Type Aliases ============

export type ProjectStatus = 'pending' | 'active' | 'archived';

export type SortOrder = 'asc' | 'desc';

export type ValidationResult = 
  | { valid: true }
  | { valid: false; error: string };

// ============ Function Types ============

export type ProgressCallback = (current: number, total: number) => void;

export type ErrorHandler = (error: Error) => void;

// ============ Utility Types ============

export type Writable<T> = { -readonly [P in keyof T]: T[P] };

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

**Key characteristics**:
- Grouped by category
- `interface` for object shapes
- `type` for unions, functions, utilities
- `readonly` for immutable data
- JSDoc for complex types

---

## Choosing the Right Template

| You're building... | Use Template |
|--------------------|--------------|
| CLI command entry | Entry Point (Orchestrator) |
| Business logic | Service Module |
| Helper functions | Utility Module |
| User input handling | Prompt Module |
| Complex subsystem wrapper | Facade Class |
| Shared types | Types Module |
