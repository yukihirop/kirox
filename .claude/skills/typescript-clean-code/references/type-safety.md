# Type Safety Guidelines

Write type-safe TypeScript that catches errors at compile time.

## Explicit Return Types

### Why Always Explicit?
```typescript
// ❌ Inferred - changes silently if implementation changes
function processData(input: string) {
  return input.length > 0 ? { valid: true } : null;
}
// Return type silently changes if you add a case

// ✅ Explicit - compiler catches breaking changes
function processData(input: string): ValidationResult | null {
  return input.length > 0 ? { valid: true } : null;
}
```

### Apply Everywhere
```typescript
// Regular functions
function validate(input: string): boolean { ... }

// Arrow functions
const transform = (data: Data): TransformedData => { ... };

// Async functions
async function fetchData(id: string): Promise<Data | null> { ... }

// Methods
class Service {
  process(input: Input): Output { ... }
  async load(): Promise<Config> { ... }
}
```

## Eliminating `any`

### Pattern 1: Use `unknown` + Type Guards
```typescript
// ❌ any - no type safety
function parseJson(text: string): any {
  return JSON.parse(text);
}

// ✅ unknown + validation
function parseJson(text: string): unknown {
  return JSON.parse(text);
}

function isConfig(value: unknown): value is Config {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    'settings' in value
  );
}

// Usage
const data = parseJson(jsonString);
if (isConfig(data)) {
  console.log(data.version); // Type-safe
}
```

### Pattern 2: Generic Constraints
```typescript
// ❌ any in generic
function merge<T>(a: T, b: any): T {
  return { ...a, ...b };
}

// ✅ Proper generic constraint
function merge<T extends object, U extends Partial<T>>(a: T, b: U): T {
  return { ...a, ...b };
}
```

### Pattern 3: Mapped Types for Dynamic Keys
```typescript
// ❌ any for dynamic object
const handlers: { [key: string]: any } = {};

// ✅ Typed record
type EventHandler<T> = (event: T) => void;

const handlers: Record<string, EventHandler<Event>> = {};

// Or more specific
interface EventHandlers {
  click: EventHandler<MouseEvent>;
  keydown: EventHandler<KeyboardEvent>;
  submit: EventHandler<SubmitEvent>;
}
```

### Pattern 4: Assertion Functions
```typescript
// ❌ Casting with any
function getElement(id: string): HTMLElement {
  return document.getElementById(id) as any;
}

// ✅ Assertion function
function assertElement(
  element: Element | null,
  id: string
): asserts element is HTMLElement {
  if (!element) {
    throw new Error(`Element not found: ${id}`);
  }
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Not an HTMLElement: ${id}`);
  }
}

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  assertElement(element, id);
  return element; // Type narrowed to HTMLElement
}
```

## Strict Null Checking

### Handle Nullability Explicitly
```typescript
// ❌ Assumes value exists
function getName(user: User): string {
  return user.profile.name;  // Might be undefined!
}

// ✅ Handle all cases
function getName(user: User): string {
  return user.profile?.name ?? 'Unknown';
}

// ✅ Or throw early
function getName(user: User): string {
  if (!user.profile?.name) {
    throw new Error('User has no name');
  }
  return user.profile.name;
}
```

### Optional Chaining vs Nullish Coalescing
```typescript
interface Config {
  server?: {
    port?: number;
    host?: string;
  };
  timeout?: number;
}

function getServerUrl(config: Config): string {
  // ?.  - stops if any part is null/undefined
  const host = config.server?.host ?? 'localhost';
  
  // ?? - provides default only for null/undefined (not falsy)
  const port = config.server?.port ?? 3000;
  
  // || would treat 0 as falsy - wrong!
  // const port = config.server?.port || 3000; // ❌ if port is 0
  
  return `http://${host}:${port}`;
}
```

## Discriminated Unions

### For State Management
```typescript
// ✅ Type-safe state handling
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function handleState<T>(state: RequestState<T>): string {
  switch (state.status) {
    case 'idle':
      return 'Ready';
    case 'loading':
      return 'Loading...';
    case 'success':
      return `Got: ${state.data}`;  // data is available
    case 'error':
      return `Error: ${state.error.message}`;  // error is available
  }
}
```

### For Command Handling
```typescript
type Command =
  | { type: 'add'; project: string; repository: string }
  | { type: 'remove'; project: string }
  | { type: 'update'; project: string; force?: boolean }
  | { type: 'list'; filter?: string };

function executeCommand(cmd: Command): Promise<void> {
  switch (cmd.type) {
    case 'add':
      return addProject(cmd.project, cmd.repository);
    case 'remove':
      return removeProject(cmd.project);
    case 'update':
      return updateProject(cmd.project, cmd.force);
    case 'list':
      return listProjects(cmd.filter);
  }
}
```

## Branded Types

### For Type-Safe IDs
```typescript
// Prevents mixing up different ID types
type UserId = string & { readonly brand: unique symbol };
type ProjectId = string & { readonly brand: unique symbol };

function createUserId(id: string): UserId {
  return id as UserId;
}

function createProjectId(id: string): ProjectId {
  return id as ProjectId;
}

function getUser(id: UserId): User { ... }
function getProject(id: ProjectId): Project { ... }

// Usage
const userId = createUserId('user-123');
const projectId = createProjectId('proj-456');

getUser(userId);     // ✅ OK
getUser(projectId);  // ❌ Type error - can't mix IDs!
```

### For Validated Strings
```typescript
type ValidatedEmail = string & { readonly brand: unique symbol };

function validateEmail(input: string): ValidatedEmail {
  if (!input.includes('@')) {
    throw new Error('Invalid email');
  }
  return input as ValidatedEmail;
}

function sendEmail(to: ValidatedEmail, subject: string): void {
  // Guaranteed to be valid email
}

// Must validate before sending
const email = validateEmail(userInput);
sendEmail(email, 'Hello');
```

## Const Assertions

### For Literal Types
```typescript
// Without const assertion - types widen
const config = {
  version: '1.0.0',
  features: ['a', 'b'],
};
// Type: { version: string, features: string[] }

// With const assertion - exact literals
const config = {
  version: '1.0.0',
  features: ['a', 'b'],
} as const;
// Type: { readonly version: "1.0.0", readonly features: readonly ["a", "b"] }
```

### For Enums Alternative
```typescript
// Instead of enum
const Status = {
  Pending: 'pending',
  Active: 'active',
  Archived: 'archived',
} as const;

type Status = typeof Status[keyof typeof Status];
// Type: "pending" | "active" | "archived"

function setStatus(status: Status): void { ... }
setStatus(Status.Active);  // ✅
setStatus('invalid');      // ❌ Type error
```

## tsconfig.json Strict Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  }
}
```

## Quick Reference

| Instead of... | Use... |
|---------------|--------|
| `any` | `unknown` + type guard |
| `as any` | Assertion function |
| `{ [key: string]: any }` | `Record<string, T>` |
| `Function` | `(...args: T[]) => R` |
| `Object` | `object` or specific interface |
| `x!` (non-null assertion) | Proper null check |
| `// @ts-ignore` | Fix the type error |
