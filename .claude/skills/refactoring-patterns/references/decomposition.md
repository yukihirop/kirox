# Function Decomposition Pattern

Split long functions into focused, testable units.

## When to Apply
- Function exceeds 50 lines
- Function has multiple levels of abstraction
- Function has high cyclomatic complexity (many branches)
- Unit testing requires complex setup

## Decomposition Strategies

### Strategy 1: Extract by Phase

```typescript
// BEFORE: 150 line function with sequential phases
async function executeAddCommand(argv: string[]): Promise<Result> {
  // Phase 1: Parse and validate (40 lines)
  const options = parseOptions(argv);
  const repository = options.repository || process.env.KIROX_REPOSITORY;
  // ... validation logic
  
  // Phase 2: Load configuration (30 lines)
  const config = await loadConfig();
  const merged = mergeConfigs(config, options);
  // ... more config logic
  
  // Phase 3: Check metadata (25 lines)
  const metadataPath = getMetadataPath(options.output);
  const existingMetadata = await readMetadata(metadataPath);
  // ... duplicate checking
  
  // Phase 4: Fetch and write (35 lines)
  const files = await fetchFiles(repository);
  await writeAllFiles(files, options.output);
  // ... file handling
  
  // Phase 5: Report results (20 lines)
  reporter.reportSuccess(`Done: ${files.length} files`);
  await updateMetadata(metadataPath, { ... });
  return { success: true };
}

// AFTER: Orchestrator with focused helpers
async function executeAddCommand(argv: string[]): Promise<Result> {
  const args = parseAndValidateArgs(argv);
  const config = await loadAndMergeConfig(args);
  await checkMetadataAndDuplicates(config);
  const files = await fetchAndWriteFiles(config);
  return updateMetadataAndReport(files, config);
}

// Each helper is 30-50 lines, single responsibility
function parseAndValidateArgs(argv: string[]): ValidatedArgs {
  const options = parseOptions(argv);
  const repository = options.repository || process.env.KIROX_REPOSITORY;
  
  if (!repository) {
    throw new ValidationError('Repository is required');
  }
  
  validateRepositoryFormat(repository);
  
  return {
    repository,
    output: options.output || '.kiro',
    projects: options.projects || [],
    track: options.track ?? false,
  };
}

async function loadAndMergeConfig(args: ValidatedArgs): Promise<MergedConfig> {
  const fileConfig = await loadConfigFile(args.output);
  return {
    ...fileConfig,
    ...args,
    projects: args.projects.length > 0 ? args.projects : fileConfig.projects,
  };
}
```

### Strategy 2: Extract by Abstraction Level

```typescript
// BEFORE: Mixed abstraction levels
async function fetchProjects(repository: string): Promise<Project[]> {
  // High level: orchestration
  const client = createOctokitClient();
  
  // Low level: API details
  const response = await client.repos.getContent({
    owner: repository.split('/')[0],
    repo: repository.split('/')[1],
    path: '.kiro/specs',
  });
  
  // Low level: parsing
  const dirs = response.data.filter(item => item.type === 'dir');
  
  // Low level: parallel fetching
  const projects = await Promise.all(
    dirs.map(async (dir) => {
      const specResponse = await client.repos.getContent({ ... });
      return parseProjectSpec(specResponse.data);
    })
  );
  
  return projects;
}

// AFTER: Separated by abstraction
async function fetchProjects(repository: string): Promise<Project[]> {
  const { owner, repo } = parseRepositoryPath(repository);
  const directories = await listSpecDirectories(owner, repo);
  return fetchProjectsInParallel(directories, owner, repo);
}

function parseRepositoryPath(path: string): { owner: string; repo: string } {
  const [owner, repo] = path.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${path}`);
  }
  return { owner, repo };
}

async function listSpecDirectories(owner: string, repo: string): Promise<string[]> {
  const client = getOctokitClient();
  const response = await client.repos.getContent({
    owner,
    repo,
    path: '.kiro/specs',
  });
  
  return (response.data as ContentItem[])
    .filter(item => item.type === 'dir')
    .map(item => item.name);
}

async function fetchProjectsInParallel(
  directories: string[],
  owner: string,
  repo: string
): Promise<Project[]> {
  const semaphore = new Semaphore(5);  // Limit concurrent requests
  
  return Promise.all(
    directories.map(dir => 
      semaphore.acquire(() => fetchSingleProject(owner, repo, dir))
    )
  );
}
```

### Strategy 3: Extract Conditional Logic

```typescript
// BEFORE: Complex branching
async function handleUserInput(input: UserInput): Promise<Result> {
  if (input.type === 'interactive') {
    if (input.hasRepository) {
      // 20 lines of repository handling
    } else {
      // 15 lines of prompting
    }
    if (input.hasProject) {
      // 25 lines of project handling
    } else {
      // 20 lines of project prompting
    }
  } else {
    if (input.hasAllRequired) {
      // 15 lines of direct execution
    } else {
      // 10 lines of error handling
    }
  }
  // ... more nested conditions
}

// AFTER: Strategy pattern with clear paths
async function handleUserInput(input: UserInput): Promise<Result> {
  const strategy = selectStrategy(input);
  return strategy.execute(input);
}

function selectStrategy(input: UserInput): ExecutionStrategy {
  if (!input.hasAllRequired && !input.type === 'interactive') {
    return new ValidationErrorStrategy();
  }
  if (input.type === 'interactive') {
    return new InteractiveStrategy();
  }
  return new DirectExecutionStrategy();
}

class InteractiveStrategy implements ExecutionStrategy {
  async execute(input: UserInput): Promise<Result> {
    const repository = await this.resolveRepository(input);
    const project = await this.resolveProject(input, repository);
    return this.executeWithResolvedArgs(repository, project);
  }
  
  private async resolveRepository(input: UserInput): Promise<string> {
    if (input.hasRepository) {
      return input.repository;
    }
    return promptRepository();
  }
  
  // ... focused methods
}
```

## Helper Function Guidelines

| Guideline | Rationale |
|-----------|-----------|
| 30-50 lines max | Easy to understand at a glance |
| Single responsibility | Clear purpose, easy testing |
| Explicit return types | Self-documenting contracts |
| Pure when possible | Predictable, testable |
| Descriptive names | `parseAndValidateArgs` not `processInput` |

## Testing Decomposed Functions

```typescript
// Before decomposition: Complex test setup
describe('executeAddCommand', () => {
  it('handles all scenarios', async () => {
    // Mock 10 different things
    // 50+ lines of setup
    // Assertions scattered throughout
  });
});

// After decomposition: Focused unit tests
describe('parseAndValidateArgs', () => {
  it('extracts repository from argv', () => {
    const result = parseAndValidateArgs(['--repository', 'owner/repo']);
    expect(result.repository).toBe('owner/repo');
  });
  
  it('throws on invalid repository format', () => {
    expect(() => parseAndValidateArgs(['--repository', 'invalid']))
      .toThrow(ValidationError);
  });
});

describe('loadAndMergeConfig', () => {
  it('prefers CLI args over file config', async () => {
    // Focused test for this specific function
  });
});
```
