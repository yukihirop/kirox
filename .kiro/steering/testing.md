# Testing Standards and Practices

<!-- Inclusion Mode: Conditional: "**/*.test.ts", "**/*.test.js" -->

This document defines testing standards, TDD methodology, and external API mocking strategies for the Kirox project.

## Core Testing Principles

### 1. Never Call External APIs in Tests

**Rule**: All external API calls (GitHub API, network requests) MUST be mocked in tests.

**Rationale**:
- Tests must be fast, reliable, and independent of network conditions
- Avoid rate limiting issues with external services
- Prevent test failures due to external service downtime
- Enable offline development and CI/CD execution

**Implementation**: Use Vitest's `vi.mock()` to mock external dependencies like Octokit.

### 2. Test-Driven Development (TDD)

Follow Kent Beck's RED-GREEN-REFACTOR cycle for all new features:

1. **RED**: Write failing tests first
   - Define expected behavior through tests
   - Run tests to confirm they fail
   - Verify test failure messages are meaningful

2. **GREEN**: Write minimal code to make tests pass
   - Implement only what's needed to pass the tests
   - Don't optimize prematurely
   - Run tests to confirm they pass

3. **REFACTOR**: Improve code quality
   - Clean up implementation
   - Remove duplication
   - Improve readability
   - Ensure tests still pass

## Test Types and Organization

### Directory Structure

```
tests/
├── unit/              # Isolated unit tests (fast, focused)
│   ├── cli/
│   ├── github/
│   ├── reporting/
│   └── tracking/
├── integration/       # Component integration tests (medium scope)
│   └── cli-to-github-to-fs.test.ts
└── e2e/              # End-to-end tests (full flow)
    ├── interactive-flow.test.ts
    └── project-suggestion-flow.test.ts
```

### Test Type Selection

| Test Type | When to Use | Mock Level | Example |
|-----------|-------------|------------|---------|
| **Unit** | Testing single functions/classes | Mock all dependencies | `validator.test.ts` |
| **Integration** | Testing multiple components together | Mock external APIs only | `cli-to-github-to-fs.test.ts` |
| **E2E** | Testing complete user flows | Mock external APIs + file system | `project-suggestion-flow.test.ts` |

### Naming Conventions

- Test files: `{module-name}.test.ts`
- Test suites: `describe('ModuleName', () => {})`
- Test cases: `it('should do something specific', async () => {})`
- Use descriptive names that explain the behavior being tested

## Mocking External APIs

### Mocking Octokit (GitHub API)

**Pattern**: Mock the entire Octokit module at the file level.

```typescript
import { Octokit } from 'octokit';
import { vi } from 'vitest';

// Mock the Octokit module
vi.mock('octokit');

describe('GitHub API Integration', () => {
  let mockOctokit: any;

  beforeEach(() => {
    // Create a mock implementation
    mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn()
            // First call returns directory listing
            .mockResolvedValueOnce({
              data: [
                {
                  name: 'spec.json',
                  path: '.kiro/specs/project/spec.json',
                  type: 'file',
                  sha: 'abc123',
                  size: 100,
                },
              ],
            })
            // Second call returns file content
            .mockResolvedValueOnce({
              data: {
                type: 'file',
                encoding: 'base64',
                content: Buffer.from('{"key": "value"}', 'utf-8').toString('base64'),
                size: 100,
                path: '.kiro/specs/project/spec.json',
                sha: 'abc123',
              },
            }),
        },
      },
    };

    // Apply the mock
    (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch project files from GitHub', async () => {
    const result = await fetchProjectFiles('owner/repo', 'project-name');

    expect(result.success).toBe(true);
    expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(2);
  });
});
```

### Mock Response Structure Guidelines

**Directory Listing Response**:
```typescript
{
  data: [
    {
      name: 'filename.ext',
      path: 'full/path/to/file.ext',
      type: 'file' | 'dir',
      sha: 'git-sha-hash',
      size: 123,
    },
  ],
}
```

**File Content Response**:
```typescript
{
  data: {
    type: 'file',
    encoding: 'base64',
    content: Buffer.from('file contents', 'utf-8').toString('base64'),
    size: 123,
    path: 'full/path/to/file.ext',
    sha: 'git-sha-hash',
  },
}
```

### Mock Call Sequencing

When mocking multiple API calls, use `.mockResolvedValueOnce()` to define the sequence:

```typescript
const mockGetContent = vi.fn()
  .mockResolvedValueOnce({ data: [...] })  // 1st call
  .mockResolvedValueOnce({ data: {...} })  // 2nd call
  .mockResolvedValueOnce({ data: [...] })  // 3rd call
  .mockResolvedValue({ data: [] });        // Default for remaining calls
```

**Important**: Understand the actual API call flow in your implementation:
- Each project fetches directory listing independently
- Steering directory may be cached after first fetch
- File contents are fetched after directory listings

## Test Structure Patterns

### Standard Test Setup

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('FeatureName', () => {
  let mockDependency: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Setup mocks
    mockDependency = vi.fn();

    // Clean test environment
    await cleanupTestData();

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup
    await cleanupTestData();
    vi.clearAllMocks();
  });

  describe('specific behavior', () => {
    it('should handle success case', async () => {
      // Arrange
      mockDependency.mockResolvedValue({ success: true });

      // Act
      const result = await functionUnderTest();

      // Assert
      expect(result.success).toBe(true);
      expect(mockDependency).toHaveBeenCalledWith(expect.objectContaining({
        param: 'expected-value',
      }));
    });

    it('should handle error case', async () => {
      // Arrange
      mockDependency.mockRejectedValue(new Error('API error'));

      // Act & Assert
      await expect(functionUnderTest()).rejects.toThrow('API error');
    });
  });
});
```

### Async Test Patterns

All async functions MUST be tested with `async/await`:

```typescript
// ✅ CORRECT
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});

// ❌ WRONG - Missing await
it('should fetch data', () => {
  const result = fetchData(); // Returns a Promise, not the actual result
  expect(result).toBeDefined(); // This will fail
});
```

### File System Mocking (E2E Tests)

For E2E tests, use a temporary test directory:

```typescript
import { promises as fs } from 'fs';
import path from 'path';

describe('E2E File Operations', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'e2e', 'test-output');

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, ignore
    }
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});
```

## Interactive Prompt Testing

### Mocking @inquirer/prompts

```typescript
import * as inquirer from '@inquirer/prompts';
import { vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
  checkbox: vi.fn(),
}));

describe('Interactive Prompts', () => {
  beforeEach(() => {
    (inquirer.input as ReturnType<typeof vi.fn>).mockResolvedValue('user-input');
    (inquirer.confirm as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it('should prompt user for input', async () => {
    const result = await promptForValue();

    expect(inquirer.input).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String),
    }));
    expect(result).toBe('user-input');
  });
});
```

### Mocking Module Functions

When mocking specific functions from a module while keeping others real:

```typescript
vi.mock('../../src/cli/interactive-prompt.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/cli/interactive-prompt.js')>();
  return {
    ...actual,
    promptMissingArguments: vi.fn(), // Mock this function
    // Other functions use actual implementation
  };
});
```

## Assertion Best Practices

### Specific Assertions

```typescript
// ✅ GOOD - Specific expectations
expect(result.success).toBe(true);
expect(result.filesDownloaded).toBe(2);
expect(result.projects).toEqual(['project-a', 'project-b']);

// ❌ BAD - Vague assertions
expect(result).toBeTruthy();
expect(result.projects.length).toBeGreaterThan(0);
```

### Object Matching

```typescript
// Exact match
expect(result).toEqual({ success: true, count: 5 });

// Partial match
expect(result).toMatchObject({ success: true });

// Property checks
expect(result).toHaveProperty('success', true);

// Function call verification
expect(mockFn).toHaveBeenCalledWith(
  expect.objectContaining({
    repository: 'owner/repo',
    path: '.kiro/specs',
  })
);
```

### Array Assertions

```typescript
// Check array contents
expect(result.projects).toEqual(['proj1', 'proj2']);

// Check array includes value
expect(result.projects).toContain('proj1');

// Check array length
expect(result.projects).toHaveLength(2);

// Check each item
result.projects.forEach((project) => {
  expect(typeof project).toBe('string');
  expect(project.length).toBeGreaterThan(0);
});
```

## Test Coverage Guidelines

### Minimum Coverage Requirements

- **Unit tests**: Aim for 80%+ coverage of business logic
- **Integration tests**: Cover all major component interactions
- **E2E tests**: Cover all critical user flows

### What to Test

**✅ Always Test**:
- Public API functions and methods
- Error handling paths
- Edge cases (empty inputs, null values, boundary conditions)
- Critical business logic
- Integration points between components

**❌ Don't Test**:
- External library internals (trust the library)
- Generated code (auto-generated types, etc.)
- Trivial getters/setters
- Private implementation details (test behavior, not implementation)

## Common Testing Patterns

### Testing Error Handling

```typescript
it('should handle 404 errors from GitHub API', async () => {
  const error = new Error('Not Found');
  (error as any).status = 404;

  mockOctokit.rest.repos.getContent.mockRejectedValueOnce(error);

  const result = await fetchProject('owner/repo', 'project');

  expect(result.success).toBe(false);
  expect(result.errorMessage).toContain('not found');
});
```

### Testing Multiple Scenarios

```typescript
describe('Project Name Validation', () => {
  it.each([
    ['valid-name', true],
    ['valid_name', true],
    ['valid.name', true],
    ['invalid name', false], // spaces not allowed
    ['invalid/name', false], // slashes not allowed
    ['', false],             // empty not allowed
  ])('validates "%s" as %s', (input, expected) => {
    const result = validateProjectName(input);
    expect(result.valid).toBe(expected);
  });
});
```

### Testing Cached Behavior

When testing features with caching (like steering directory caching):

```typescript
it('should cache steering directory after first fetch', async () => {
  const mockGetContent = vi.fn()
    // First project
    .mockResolvedValueOnce({ data: [/* project 1 files */] })
    .mockResolvedValueOnce({ data: [] }) // steering (first fetch)
    .mockResolvedValueOnce({ data: { /* file content */ } })
    // Second project
    .mockResolvedValueOnce({ data: [/* project 2 files */] })
    // No steering fetch here - it's cached!
    .mockResolvedValueOnce({ data: { /* file content */ } });

  await fetchMultipleProjects(['proj1', 'proj2']);

  // Verify steering was only fetched once
  const steeringCalls = mockGetContent.mock.calls.filter(
    call => call[0].path === '.kiro/steering'
  );
  expect(steeringCalls).toHaveLength(1);
});
```

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- -t "pattern"

# Run tests in watch mode (development)
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Test Execution Guidelines

- Run full test suite before committing
- Fix failing tests immediately - don't commit broken tests
- Keep test execution time reasonable (aim for < 10 seconds for unit tests)
- Use `--watch` mode during development for fast feedback

## Anti-Patterns to Avoid

### ❌ Testing Implementation Details

```typescript
// ❌ BAD - Testing internal state
it('should set internal flag', () => {
  const instance = new MyClass();
  instance.process();
  expect(instance._internalFlag).toBe(true); // Don't test private state
});

// ✅ GOOD - Testing observable behavior
it('should return success when processing completes', () => {
  const instance = new MyClass();
  const result = instance.process();
  expect(result.success).toBe(true); // Test public API
});
```

### ❌ Overly Complex Test Setup

```typescript
// ❌ BAD - Too much setup in one test
it('should handle complex scenario', async () => {
  // 50 lines of setup code...
  // Test gets lost in the noise
});

// ✅ GOOD - Extract setup to helper functions
const setupComplexScenario = () => {
  // Setup logic
};

it('should handle complex scenario', async () => {
  const { mockData, mockFn } = setupComplexScenario();
  const result = await functionUnderTest(mockData);
  expect(result).toBe(expected);
});
```

### ❌ Testing Multiple Behaviors in One Test

```typescript
// ❌ BAD - Testing too many things
it('should fetch, validate, and save data', async () => {
  // Tests fetch logic
  // Tests validation logic
  // Tests save logic
  // Hard to debug when it fails
});

// ✅ GOOD - One behavior per test
it('should fetch data from API', async () => { /* ... */ });
it('should validate fetched data', () => { /* ... */ });
it('should save validated data', async () => { /* ... */ });
```

## Integration with Project Workflow

### TDD with /kiro:spec-impl

When implementing specification tasks with `/kiro:spec-impl`:

1. Command automatically follows TDD RED-GREEN-REFACTOR
2. Tests are written first based on requirements
3. Implementation follows test creation
4. All tests must pass before task completion

### Pre-Commit Checklist

Before committing test changes:

- [ ] All tests pass (`npm test`)
- [ ] No external API calls in tests (all mocked)
- [ ] Test names clearly describe behavior
- [ ] Edge cases covered
- [ ] Cleanup logic in afterEach
- [ ] No hardcoded values (use constants or fixtures)

## References

- **Vitest Documentation**: https://vitest.dev/
- **Testing Best Practices**: Kent Beck - "Test-Driven Development by Example"
- **Project Examples**:
  - `tests/e2e/project-suggestion-flow.test.ts` - E2E testing with Octokit mocks
  - `tests/integration/cli-to-github-to-fs.test.ts` - Integration testing patterns
  - `tests/unit/cli/validator.test.ts` - Unit testing examples
