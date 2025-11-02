# Vitest Best Practices

## Readability Guidelines

### Keep Tests Under 30 Lines
Each test should be concise and focused. If a test exceeds 30 lines, consider:
- Breaking into multiple smaller tests
- Extracting setup logic to helper functions
- Moving complex assertions to custom matchers

**Bad:**
```typescript
it('processes complex order workflow', () => {
  const user = createUser({ name: 'Alice', email: 'alice@test.com', role: 'customer' })
  const product1 = createProduct({ name: 'Widget', price: 10, stock: 100 })
  const product2 = createProduct({ name: 'Gadget', price: 20, stock: 50 })
  const cart = createCart(user.id)
  addToCart(cart.id, product1.id, 3)
  addToCart(cart.id, product2.id, 2)
  const discount = createDiscount({ code: 'SAVE10', percent: 10 })
  applyDiscount(cart.id, discount.code)
  const order = checkout(cart.id, { address: '123 Main St', payment: 'credit' })
  const total = calculateTotal(order.id)
  expect(total).toBe(67) // (30 + 40) * 0.9 + 7 shipping
  // ... 20 more lines
})
```

**Good:**
```typescript
describe('Order Processing', () => {
  let testOrder: Order
  
  beforeEach(() => {
    testOrder = createTestOrderWithDiscount()
  })
  
  it('applies discount correctly', () => {
    const subtotal = testOrder.subtotal
    expect(testOrder.discountAmount).toBe(subtotal * 0.1)
  })
  
  it('includes shipping in total', () => {
    const expected = testOrder.subtotal - testOrder.discountAmount + 7
    expect(testOrder.total).toBe(expected)
  })
})
```

### Use Descriptive Test Names
Test names should clearly state what is being tested and the expected outcome.

**Bad:**
```typescript
it('works', () => { ... })
it('test 1', () => { ... })
it('returns true', () => { ... })
```

**Good:**
```typescript
it('returns true when user is authenticated', () => { ... })
it('throws error when email is invalid', () => { ... })
it('creates order with correct total amount', () => { ... })
```

### Follow AAA Pattern
Structure tests as Arrange-Act-Assert for clarity.

```typescript
it('calculates discount correctly', () => {
  // Arrange
  const order = { subtotal: 100, discountPercent: 20 }
  
  // Act
  const result = calculateDiscount(order)
  
  // Assert
  expect(result).toBe(20)
})
```

### Use beforeEach Wisely
Extract common setup to beforeEach, but keep test-specific setup in the test itself.

```typescript
describe('UserService', () => {
  let service: UserService
  
  // Common setup for all tests
  beforeEach(() => {
    service = new UserService()
  })
  
  it('creates user with premium account', () => {
    // Test-specific setup
    const premiumData = { name: 'Alice', plan: 'premium' }
    const user = service.create(premiumData)
    expect(user.plan).toBe('premium')
  })
})
```

## Testing Principles

### Test Behavior, Not Implementation
Focus on what the code does, not how it does it.

**Bad (tests implementation):**
```typescript
it('calls internal method twice', () => {
  const spy = vi.spyOn(service as any, '_internalMethod')
  service.process()
  expect(spy).toHaveBeenCalledTimes(2)
})
```

**Good (tests behavior):**
```typescript
it('processes all items in queue', () => {
  service.addItem('item1')
  service.addItem('item2')
  service.process()
  expect(service.getProcessedItems()).toHaveLength(2)
})
```

### One Assertion Per Test (Generally)
Each test should verify one specific behavior. Multiple assertions are ok if they verify the same behavior.

**Good:**
```typescript
it('creates user with correct properties', () => {
  const user = createUser({ name: 'Alice', age: 30 })
  expect(user.name).toBe('Alice')
  expect(user.age).toBe(30)
  expect(user.id).toBeDefined()
})
```

### Test Edge Cases
Don't just test the happy path.

```typescript
describe('divide', () => {
  it('divides positive numbers', () => {
    expect(divide(10, 2)).toBe(5)
  })
  
  it('handles division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero')
  })
  
  it('handles negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5)
  })
  
  it('handles decimal results', () => {
    expect(divide(10, 3)).toBeCloseTo(3.33, 2)
  })
})
```

### Make Tests Independent
Each test should run independently and not rely on other tests.

**Bad:**
```typescript
let userId: number

it('creates user', () => {
  userId = createUser().id
  expect(userId).toBeDefined()
})

it('fetches user', () => {
  const user = getUser(userId) // Depends on previous test
  expect(user).toBeDefined()
})
```

**Good:**
```typescript
it('creates user', () => {
  const userId = createUser().id
  expect(userId).toBeDefined()
})

it('fetches user', () => {
  const userId = createUser().id
  const user = getUser(userId)
  expect(user).toBeDefined()
})
```

## Mock Guidelines

### Mock External Dependencies Only
Mock network calls, databases, file systems. Don't mock your own business logic.

**Good mocking targets:**
- HTTP requests
- Database connections
- File system operations
- External APIs
- Time/dates

**Avoid mocking:**
- Business logic functions
- Pure functions
- Simple utilities

### Use Partial Mocks When Possible
Mock only what's necessary.

```typescript
const mockEmailService = {
  send: vi.fn().mockResolvedValue(true)
  // Only mock what you need to test
}
```

### Verify Mock Interactions Meaningfully
Don't just check that mocks were called; verify they were called correctly.

**Bad:**
```typescript
it('sends email', async () => {
  await notifyUser(user)
  expect(emailService.send).toHaveBeenCalled() // Too vague
})
```

**Good:**
```typescript
it('sends email with correct recipient and message', async () => {
  await notifyUser(user)
  expect(emailService.send).toHaveBeenCalledWith(
    user.email,
    expect.objectContaining({
      subject: 'Welcome',
      body: expect.stringContaining(user.name)
    })
  )
})
```

## Performance Test Guidelines

### Set Realistic Thresholds
Base performance expectations on actual requirements.

```typescript
it('loads dashboard within acceptable time', async () => {
  const start = performance.now()
  await loadDashboard()
  const duration = performance.now() - start
  
  // Based on actual UX requirements
  expect(duration).toBeLessThan(1000) // 1 second for good UX
})
```

### Test with Realistic Data Volumes
Use data sizes that reflect production usage.

```typescript
it('handles typical production load', async () => {
  // Production typically has 1000-5000 items
  const items = generateTestItems(3000)
  
  const start = performance.now()
  const result = processItems(items)
  const duration = performance.now() - start
  
  expect(duration).toBeLessThan(2000)
  expect(result).toHaveLength(3000)
})
```

### Measure Multiple Runs
Take average of multiple runs for stable measurements.

```typescript
it('has consistent performance', async () => {
  const runs = 10
  const measurements: number[] = []
  
  for (let i = 0; i < runs; i++) {
    const start = performance.now()
    await performOperation()
    measurements.push(performance.now() - start)
  }
  
  const avg = measurements.reduce((a, b) => a + b) / runs
  expect(avg).toBeLessThan(100)
})
```

## Common Patterns

### Testing Async Code
Always await or return promises.

```typescript
// Option 1: async/await
it('fetches data', async () => {
  const data = await fetchData()
  expect(data).toBeDefined()
})

// Option 2: return promise
it('fetches data', () => {
  return fetchData().then(data => {
    expect(data).toBeDefined()
  })
})
```

### Testing Error Cases
Use appropriate matchers for errors.

```typescript
// Synchronous errors
it('throws for invalid input', () => {
  expect(() => validate(null)).toThrow('Input required')
})

// Async errors
it('rejects for invalid ID', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('Invalid ID')
})
```

### Testing with Timeouts
Handle time-dependent code properly.

```typescript
import { vi } from 'vitest'

it('delays execution', async () => {
  vi.useFakeTimers()
  
  const callback = vi.fn()
  setTimeout(callback, 1000)
  
  vi.advanceTimersByTime(1000)
  expect(callback).toHaveBeenCalled()
  
  vi.useRealTimers()
})
```

### Custom Matchers
Create custom matchers for repeated assertions.

```typescript
expect.extend({
  toBeValidEmail(received: string) {
    const pass = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(received)
    return {
      pass,
      message: () => `Expected ${received} to be a valid email`
    }
  }
})

it('validates email format', () => {
  expect('user@example.com').toBeValidEmail()
})
```

## Code Organization

### Group Related Tests
Use nested describe blocks for logical organization.

```typescript
describe('UserService', () => {
  describe('create', () => {
    it('creates user with valid data', () => { ... })
    it('throws for invalid email', () => { ... })
  })
  
  describe('update', () => {
    it('updates existing user', () => { ... })
    it('throws for non-existent user', () => { ... })
  })
})
```

### Use Helper Functions
Extract common test logic into reusable functions.

```typescript
// test-helpers.ts
export function createTestUser(overrides = {}) {
  return {
    id: Math.random(),
    name: 'Test User',
    email: 'test@example.com',
    ...overrides
  }
}

// user.test.ts
it('processes user data', () => {
  const user = createTestUser({ name: 'Alice' })
  expect(processUser(user)).toBeDefined()
})
```

### Use Test Fixtures
Store test data in fixtures for reusability.

```typescript
// fixtures/users.ts
export const validUsers = [
  { name: 'Alice', email: 'alice@test.com' },
  { name: 'Bob', email: 'bob@test.com' }
]

// user.test.ts
import { validUsers } from './fixtures/users'

it('processes multiple users', () => {
  const results = validUsers.map(processUser)
  expect(results).toHaveLength(2)
})
```
