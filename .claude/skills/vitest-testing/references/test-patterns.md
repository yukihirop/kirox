# Vitest Test Patterns

## Unit Test Patterns

### Basic Function Test
```typescript
import { describe, it, expect } from 'vitest'
import { add } from './math'

describe('add', () => {
  it('adds two positive numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
  
  it('handles negative numbers', () => {
    expect(add(-2, 3)).toBe(1)
  })
  
  it('handles zero', () => {
    expect(add(0, 5)).toBe(5)
  })
})
```

### Class/Object Test
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { UserManager } from './UserManager'

describe('UserManager', () => {
  let manager: UserManager
  
  beforeEach(() => {
    manager = new UserManager()
  })
  
  it('creates user with valid data', () => {
    const user = manager.create({ name: 'Alice', age: 30 })
    expect(user).toMatchObject({ name: 'Alice', age: 30 })
    expect(user.id).toBeDefined()
  })
  
  it('throws error for invalid age', () => {
    expect(() => manager.create({ name: 'Bob', age: -1 }))
      .toThrow('Age must be positive')
  })
})
```

### Async Function Test
```typescript
import { describe, it, expect } from 'vitest'
import { fetchUser } from './api'

describe('fetchUser', () => {
  it('fetches user data successfully', async () => {
    const user = await fetchUser(1)
    expect(user).toMatchObject({
      id: 1,
      name: expect.any(String)
    })
  })
  
  it('handles network errors', async () => {
    await expect(fetchUser(-1))
      .rejects.toThrow('User not found')
  })
})
```

### Mock Pattern
```typescript
import { describe, it, expect, vi } from 'vitest'
import { notifyUser } from './notifications'
import { emailService } from './services/email'

vi.mock('./services/email')

describe('notifyUser', () => {
  it('sends email notification', async () => {
    const mockSend = vi.spyOn(emailService, 'send')
      .mockResolvedValue(true)
    
    await notifyUser('test@example.com', 'Hello')
    
    expect(mockSend).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({ message: 'Hello' })
    )
  })
})
```

## Integration Test Patterns

### API Endpoint Test
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from './server'
import request from 'supertest'

describe('User API', () => {
  let server: any
  
  beforeAll(async () => {
    server = await createServer()
  })
  
  afterAll(async () => {
    await server.close()
  })
  
  it('GET /users returns user list', async () => {
    const response = await request(server)
      .get('/users')
      .expect(200)
    
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.any(Number) })
      ])
    )
  })
  
  it('POST /users creates new user', async () => {
    const response = await request(server)
      .post('/users')
      .send({ name: 'Alice', email: 'alice@example.com' })
      .expect(201)
    
    expect(response.body.id).toBeDefined()
    expect(response.body.name).toBe('Alice')
  })
})
```

### Database Integration Test
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from './database'
import { UserRepository } from './repositories/UserRepository'

describe('UserRepository', () => {
  let repo: UserRepository
  
  beforeEach(async () => {
    await db.connect()
    await db.migrate()
    repo = new UserRepository(db)
  })
  
  afterEach(async () => {
    await db.cleanup()
    await db.disconnect()
  })
  
  it('saves and retrieves user', async () => {
    const user = await repo.save({ name: 'Alice', email: 'alice@test.com' })
    const found = await repo.findById(user.id)
    
    expect(found).toMatchObject({
      name: 'Alice',
      email: 'alice@test.com'
    })
  })
  
  it('handles unique constraint violations', async () => {
    await repo.save({ email: 'alice@test.com' })
    
    await expect(repo.save({ email: 'alice@test.com' }))
      .rejects.toThrow('Email already exists')
  })
})
```

### Service Integration Test
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './services/OrderService'
import { PaymentGateway } from './services/PaymentGateway'
import { InventoryService } from './services/InventoryService'

describe('OrderService Integration', () => {
  let orderService: OrderService
  let paymentGateway: PaymentGateway
  let inventoryService: InventoryService
  
  beforeEach(() => {
    paymentGateway = new PaymentGateway()
    inventoryService = new InventoryService()
    orderService = new OrderService(paymentGateway, inventoryService)
  })
  
  it('completes order with payment and inventory update', async () => {
    const order = await orderService.placeOrder({
      userId: 1,
      items: [{ productId: 100, quantity: 2 }],
      paymentMethod: 'credit_card'
    })
    
    expect(order.status).toBe('completed')
    expect(order.paymentStatus).toBe('paid')
    
    const stock = await inventoryService.getStock(100)
    expect(stock).toBeLessThan(100) // Verify inventory decreased
  })
})
```

## E2E Test Patterns

### Browser Automation Test
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { chromium, Browser, Page } from 'playwright'

describe('Login Flow E2E', () => {
  let browser: Browser
  let page: Page
  
  beforeEach(async () => {
    browser = await chromium.launch()
    page = await browser.newPage()
  })
  
  afterEach(async () => {
    await browser.close()
  })
  
  it('logs in successfully with valid credentials', async () => {
    await page.goto('http://localhost:3000/login')
    
    await page.fill('input[name="email"]', 'user@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard')
    expect(page.url()).toContain('/dashboard')
    
    const welcome = await page.textContent('h1')
    expect(welcome).toContain('Welcome')
  })
  
  it('shows error for invalid credentials', async () => {
    await page.goto('http://localhost:3000/login')
    
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    
    const error = await page.textContent('.error-message')
    expect(error).toContain('Invalid credentials')
  })
})
```

### Full User Journey Test
```typescript
import { describe, it, expect } from 'vitest'
import { test } from '@playwright/test'

describe('E-commerce Purchase Journey', () => {
  it('completes full purchase flow', async ({ page }) => {
    // Browse products
    await page.goto('http://localhost:3000')
    await page.click('text=Products')
    
    // Add to cart
    await page.click('text=Add to Cart', { first: true })
    await expect(page.locator('.cart-count')).toHaveText('1')
    
    // View cart
    await page.click('text=Cart')
    await expect(page.locator('.cart-item')).toHaveCount(1)
    
    // Checkout
    await page.click('text=Checkout')
    await page.fill('#shipping-address', '123 Main St')
    await page.fill('#card-number', '4242424242424242')
    await page.click('button:has-text("Complete Order")')
    
    // Verify confirmation
    await page.waitForURL('**/order-confirmation')
    const orderNumber = await page.textContent('.order-number')
    expect(orderNumber).toMatch(/^ORD-\d+$/)
  })
})
```

## Performance Test Patterns

### Load Test
```typescript
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'

describe('Performance Tests', () => {
  it('processes large dataset within time limit', () => {
    const data = Array.from({ length: 10000 }, (_, i) => i)
    
    const start = performance.now()
    const result = processLargeDataset(data)
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(1000) // Under 1 second
    expect(result).toHaveLength(10000)
  })
  
  it('handles concurrent requests efficiently', async () => {
    const requests = Array.from({ length: 100 }, (_, i) => 
      fetchUser(i)
    )
    
    const start = performance.now()
    const results = await Promise.all(requests)
    const duration = performance.now() - start
    
    expect(results).toHaveLength(100)
    expect(duration).toBeLessThan(5000) // Under 5 seconds for 100 requests
  })
})
```

### Memory Leak Test
```typescript
import { describe, it, expect } from 'vitest'

describe('Memory Tests', () => {
  it('does not leak memory on repeated operations', () => {
    const initialMemory = process.memoryUsage().heapUsed
    
    // Perform operation many times
    for (let i = 0; i < 10000; i++) {
      createAndProcessUser({ id: i, name: `User${i}` })
    }
    
    // Force garbage collection (if --expose-gc flag is set)
    if (global.gc) global.gc()
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024
    
    expect(memoryIncreaseMB).toBeLessThan(50) // Less than 50MB increase
  })
})
```

### Response Time Test
```typescript
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'

describe('API Response Time', () => {
  it('responds within acceptable time for critical endpoints', async () => {
    const measurements: number[] = []
    
    // Take multiple measurements
    for (let i = 0; i < 50; i++) {
      const start = performance.now()
      await fetch('http://localhost:3000/api/health')
      const duration = performance.now() - start
      measurements.push(duration)
    }
    
    const avg = measurements.reduce((a, b) => a + b) / measurements.length
    const p95 = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)]
    
    expect(avg).toBeLessThan(100) // Average under 100ms
    expect(p95).toBeLessThan(200) // 95th percentile under 200ms
  })
})
```

### Benchmark Test
```typescript
import { describe, it, bench } from 'vitest'

describe('Algorithm Performance', () => {
  const data = Array.from({ length: 1000 }, (_, i) => i)
  
  bench('linear search', () => {
    linearSearch(data, 999)
  })
  
  bench('binary search', () => {
    binarySearch(data, 999)
  })
  
  bench('hash lookup', () => {
    const map = new Map(data.map(x => [x, x]))
    map.get(999)
  })
})
```
