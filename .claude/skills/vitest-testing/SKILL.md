---
name: vitest-testing
description: Comprehensive guide for writing unit, integration, E2E, and performance tests with Vitest. Use when Claude needs to create or improve tests that are readable (under 30 lines per test), follow best practices, and cover all test types (unit tests for functions/classes, integration tests for APIs/databases/services, E2E tests for user flows, performance tests for load/memory/response time). Helps write tests that are maintainable, focused, and easy to understand.
---

# Vitest Testing

Write comprehensive, readable tests using Vitest that follow testing best practices.

## Overview

Follow this workflow when creating tests:

1. **Identify test type**: Determine if test is unit, integration, E2E, or performance
2. **Choose pattern**: Select appropriate pattern from references/test-patterns.md
3. **Write concisely**: Keep each test under 30 lines
4. **Apply best practices**: Follow guidelines in references/best-practices.md

## Test Type Selection

**Unit tests** - Test individual functions, methods, or classes in isolation:
- Pure functions with different inputs
- Class methods and their behavior
- Async operations with mocks
- Edge cases and error handling

**Integration tests** - Test multiple components working together:
- API endpoints with request/response
- Database operations with real connections
- Service interactions across multiple modules
- External service integrations (with test environments)

**E2E tests** - Test complete user workflows:
- Full user journeys through the application
- Browser automation with Playwright
- Multi-step processes from start to finish
- Real-world user scenarios

**Performance tests** - Test speed and resource usage:
- Load testing with many operations
- Response time measurements
- Memory leak detection
- Benchmark comparisons

## Writing Readable Tests

### Keep Tests Concise (Under 30 Lines)

Each test should focus on one behavior. If a test grows beyond 30 lines:
- Split into multiple focused tests
- Extract setup to `beforeEach` hooks
- Create helper functions for common operations
- Move test data to fixtures

### Use Clear Test Names

Test names should describe the scenario and expected outcome:
- ✅ `it('returns 404 when user not found')`
- ✅ `it('calculates discount correctly for premium users')`
- ❌ `it('works')` or `it('test 1')`

### Follow AAA Pattern

Structure tests as Arrange-Act-Assert:

```typescript
it('creates order with correct total', () => {
  // Arrange
  const items = [{ price: 10, quantity: 2 }]
  
  // Act
  const order = createOrder(items)
  
  // Assert
  expect(order.total).toBe(20)
})
```

## Quick Reference

For detailed patterns and examples, refer to:
- **Test patterns**: See references/test-patterns.md for code examples of unit, integration, E2E, and performance tests
- **Best practices**: See references/best-practices.md for readability guidelines, mocking strategies, and common patterns

## Common Test Structures

### Unit Test Template
```typescript
import { describe, it, expect } from 'vitest'
import { functionToTest } from './module'

describe('functionToTest', () => {
  it('handles typical case', () => {
    expect(functionToTest(input)).toBe(expected)
  })
  
  it('handles edge case', () => {
    expect(functionToTest(edgeInput)).toBe(edgeExpected)
  })
  
  it('throws error for invalid input', () => {
    expect(() => functionToTest(invalid)).toThrow('Error message')
  })
})
```

### Integration Test Template
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Integration Test', () => {
  beforeEach(async () => {
    // Setup: connect to test DB, start test server, etc.
  })
  
  afterEach(async () => {
    // Cleanup: disconnect, clear data, etc.
  })
  
  it('completes workflow successfully', async () => {
    // Test multiple components working together
  })
})
```

### E2E Test Template
```typescript
import { describe, it, expect } from 'vitest'
import { chromium, Browser, Page } from 'playwright'

describe('E2E Test', () => {
  let browser: Browser
  let page: Page
  
  beforeEach(async () => {
    browser = await chromium.launch()
    page = await browser.newPage()
  })
  
  afterEach(async () => {
    await browser.close()
  })
  
  it('completes user journey', async () => {
    await page.goto('http://localhost:3000')
    // Simulate user actions
    expect(await page.textContent('selector')).toContain('expected')
  })
})
```

### Performance Test Template
```typescript
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'

describe('Performance Test', () => {
  it('completes within time limit', async () => {
    const start = performance.now()
    await operationToTest()
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(1000) // Under 1 second
  })
})
```

## Key Principles

1. **Readability first**: Tests should be easy to read and understand
2. **One behavior per test**: Each test verifies one specific behavior
3. **Independent tests**: Tests should not depend on each other
4. **Test behavior, not implementation**: Focus on what code does, not how
5. **Mock external dependencies**: Mock APIs, databases, file systems
6. **Cover edge cases**: Test error conditions and boundary cases

## When to Read References

- **Starting a new test file**: Read references/test-patterns.md for the appropriate test type
- **Test becoming complex**: Read references/best-practices.md for refactoring guidance
- **Need mocking help**: Read best-practices.md "Mock Guidelines" section
- **Performance testing**: Read test-patterns.md "Performance Test Patterns" section

## Output Format

Generate test files with:
- Clear describe blocks for grouping
- Descriptive test names
- Concise test bodies (under 30 lines each)
- Appropriate imports
- Setup/teardown hooks when needed
- Comments only when necessary for clarity
