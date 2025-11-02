<!-- Inclusion Mode: Always -->

# Regular Expression Escaping Guidelines

## Purpose

This document provides clear guidelines for correctly escaping special characters in regular expressions to prevent syntax errors like "Invalid regular expression flags" and ensure proper pattern matching.

## Core Principles

### 1. Character Class Escaping Rules

When using character classes `[...]`, certain characters must be escaped:

**Special characters in character classes:**
- `]` - Closes the character class (must be escaped as `\]`)
- `\` - Escape character itself (must be escaped as `\\`)
- `^` - Negation (only special at the start, escape as `\^`)
- `-` - Range operator (escape as `\-` when not creating a range)

**Opening bracket `[` escaping:**
```javascript
// ❌ WRONG - Invalid syntax
/[[\]\\]/g

// ✅ CORRECT - Properly escaped
/[\[\]\\]/g

// Explanation:
// [ - needs \[ to match literal [
// ] - needs \] to match literal ]
// \ - needs \\ to match literal \
```

### 2. Common Escaping Patterns

#### Escaping Special Regex Characters

```javascript
// Special characters that need escaping outside character classes:
// . * + ? ^ $ { } ( ) | [ ] \ /

// ❌ WRONG
const pattern = new RegExp('[.]');  // Works but inefficient

// ✅ CORRECT
const pattern = /\./;  // Escaped dot
```

#### Escaping in String Literals vs Regex Literals

```javascript
// In regex literals (/.../)
const regex1 = /\./;           // One backslash
const regex2 = /[\[\]]/;       // Escape [ and ] in character class

// In RegExp constructor (string needs double escaping)
const regex3 = new RegExp('\\.');      // Two backslashes
const regex4 = new RegExp('[\\[\\]]'); // Double escaped in string
```

### 3. Real-World Examples from Kirox

#### Example 1: Escaping ANSI Color Codes

```javascript
// Context: Escaping ANSI escape sequences like '\x1b[32m'
// We need to escape: [ ] \

// ❌ WRONG - Invalid regex syntax
const ansiGreen = '\x1b[32m';
const pattern = new RegExp(ansiGreen.replace(/[[\]\\]/g, '\\$&'));
//                                            ^^^^^^^^
//                                            Invalid: [ not escaped

// ✅ CORRECT - Properly escaped character class
const ansiGreen = '\x1b[32m';
const pattern = new RegExp(ansiGreen.replace(/[\[\]\\]/g, '\\$&'));
//                                            ^^^^^^^^^^
//                                            Correct: \[ \] \\
```

#### Example 2: Dynamic Pattern Building

```javascript
// When building regex patterns from user input or dynamic strings

// ❌ WRONG - Missing escapes
function createPattern(userInput) {
  return new RegExp('[' + userInput + ']');  // Dangerous!
}

// ✅ CORRECT - Escape special characters first
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createPattern(userInput) {
  const escaped = escapeRegex(userInput);
  return new RegExp(escaped);
}
```

### 4. Testing Regex Patterns

Always test regex patterns in isolation before using them:

```javascript
// Test your character class patterns
const testPattern = /[\[\]\\]/g;

console.log('['.match(testPattern));   // Should match
console.log(']'.match(testPattern));   // Should match
console.log('\\'.match(testPattern));  // Should match
console.log('a'.match(testPattern));   // Should NOT match

// Verify no syntax errors
try {
  new RegExp(testPattern);
  console.log('✓ Valid regex');
} catch (e) {
  console.error('✗ Invalid regex:', e.message);
}
```

## Common Pitfalls

### 1. Forgetting to Escape Opening Bracket

```javascript
// ❌ WRONG - [ not escaped in character class
/[[\]]/g  // SyntaxError: Invalid regular expression

// ✅ CORRECT
/[\[\]]/g  // Matches [ or ]
```

### 2. Single vs Double Escaping

```javascript
// Regex literal - single escape
const re1 = /\./;        // ✅ Matches literal dot

// String literal - double escape
const re2 = new RegExp('\\.'); // ✅ Matches literal dot
const re3 = new RegExp('.');   // ❌ Matches any character (not escaped)
```

### 3. Context-Dependent Special Characters

```javascript
// ^ is special only at the start of character class
/[abc^]/   // ✅ Matches a, b, c, or ^
/[^abc]/   // ✅ Negation: matches anything except a, b, c

// - is special only between characters (range)
/[a-z]/    // ✅ Range: matches a through z
/[a\-z]/   // ✅ Matches a, -, or z (escaped hyphen)
/[-az]/    // ✅ Matches -, a, or z (hyphen at start/end)
```

## Quick Reference

### Characters Requiring Escape in Character Classes

| Character | Escape As | Example | Matches |
|-----------|-----------|---------|---------|
| `[` | `\[` | `/[\[]/` | Literal `[` |
| `]` | `\]` | `/[\]]/` | Literal `]` |
| `\` | `\\` | `/[\\]/` | Literal `\` |
| `^` | `\^` (if not first) | `/[a\^]/` | `a` or `^` |
| `-` | `\-` (if not first/last) | `/[a\-z]/` | `a`, `-`, or `z` |

### Characters Requiring Escape Outside Character Classes

```javascript
. * + ? ^ $ { } ( ) | [ ] \ /
```

Use `\` before any of these when you want to match them literally.

## Integration with Testing Standards

When writing tests (see `testing.md`):

1. **Always validate regex patterns** in test setup
2. **Use clear test cases** for edge cases in pattern matching
3. **Document complex regex patterns** with comments explaining the escaping

```javascript
// Good test example
describe('ANSI color code escaping', () => {
  it('should escape brackets and backslashes correctly', () => {
    const ansiCode = '\x1b[32m';
    // Escape special regex characters: [ ] \
    const escaped = ansiCode.replace(/[\[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped);

    expect(pattern.test(ansiCode)).toBe(true);
    expect(() => new RegExp(escaped)).not.toThrow();
  });
});
```

## Rationale

**Why this matters:**
- Invalid regex patterns cause runtime errors that may not be caught until production
- Incorrect escaping can lead to security vulnerabilities (ReDoS attacks)
- Proper escaping ensures predictable pattern matching behavior
- Character class escaping is particularly error-prone and needs explicit guidelines

**Historical context:**
- This guidance was added after discovering `SyntaxError: Invalid regular expression flags` errors in `progress-reporter-consistent-colors.test.ts`
- The pattern `/[[\]\\]/g` was being used but `[` was not properly escaped

## References

- MDN Regular Expressions: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
- Regex101 (testing tool): https://regex101.com/
- Related steering: `testing.md` for test patterns
