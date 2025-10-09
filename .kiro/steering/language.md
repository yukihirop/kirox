<!-- Inclusion Mode: Conditional: "src/cli/**/*", "src/reporting/**/*", "src/**/*prompt*.ts" -->

# Kirox CLI - Language Policy

## Overview

All user-facing messages, error messages, help text, and CLI output in Kirox must be implemented in **English**. This policy ensures consistency, maintainability, and accessibility for the global developer community.

## Core Principle

**English-First Implementation**: All strings displayed to users should be in English by default.

## Scope

This policy applies to:
- CLI argument descriptions and help text
- Interactive prompt messages
- Error messages and warnings
- Progress indicators and status messages
- Log messages (when visible to users)
- Console output (success/failure messages)
- Confirmation prompts

## Rationale

### 1. **Global Accessibility**
- English is the de facto lingua franca of software development
- Developers worldwide can understand and use the tool without language barriers
- Open source contributors from any country can participate

### 2. **Maintainability**
- Single source of truth for all messages
- Easier to review and update messaging
- No need to maintain translations or language variants
- Simpler testing and documentation

### 3. **Consistency with Ecosystem**
- Node.js, npm, and GitHub APIs all use English
- Most CLI tools in the JavaScript ecosystem use English
- Users expect English in command-line tools

### 4. **Technical Benefits**
- No encoding issues or multi-byte character concerns
- Simpler string matching and parsing in tests
- Better compatibility with CI/CD pipelines and automation tools

## Implementation Guidelines

### ✅ Correct: English Messages

```typescript
// CLI help text
.option('-p, --project <name>', 'Project name to fetch (comma-separated for multiple projects)')

// Interactive prompts
message: 'Enter project name (comma-separated for multiple projects)'

// Error messages
console.error('Interactive mode is only available in TTY environment. Please specify arguments explicitly.');

// Success messages
console.log('✓ Configuration confirmed');

// Progress indicators
console.log(`[${current}/${total}] Fetching ${filename}...`);
```

### ❌ Incorrect: Japanese or Mixed Language Messages

```typescript
// ❌ BAD: Japanese message
message: 'プロジェクト名を入力してください'

// ❌ BAD: Mixed language
message: 'Enter project name (カンマ区切りで複数指定可能)'

// ❌ BAD: Japanese in notes
Note:
  ブランチ指定は#の後に指定 (例: owner/repo#develop)
```

## Special Cases

### Comments and Documentation
- **Code comments**: Can be in Japanese if it helps the development team
- **README.md**: Primary version should be in English; Japanese translation in separate file (README.ja.md)
- **Commit messages**: English preferred for open source collaboration
- **Internal documentation**: Team's choice

### Test Cases
- **Test descriptions**: English preferred for consistency
- **Test data**: Can include Japanese strings when testing multi-byte character handling
- **Assertion messages**: English

### Examples in Help Text
When showing example commands, keep all instructional text in English:

```typescript
// ✅ GOOD
Examples:
  # Fetch multiple projects (comma-separated)
  $ npx kirox owner/repo -p proj1,proj2,proj3

// ❌ BAD
Examples:
  # 複数プロジェクトを取得（カンマ区切り）
  $ npx kirox owner/repo -p proj1,proj2,proj3
```

## Migration from Existing Japanese Messages

### Current Status
Some existing code contains Japanese messages that were implemented before this policy:
- Interactive prompt messages
- Help text notes
- Some console output

### Migration Approach
1. **New code**: All new messages must be in English
2. **Existing code**: Gradually convert to English during:
   - Bug fixes touching those files
   - Feature additions in related areas
   - Dedicated refactoring tasks

3. **Priority order for conversion**:
   - High: Error messages, help text, CLI options
   - Medium: Interactive prompts, confirmation messages
   - Low: Internal logging, debug output

## Exceptions

The only acceptable use of non-English in user-facing output:
- **None** - All user-facing messages must be in English

If internationalization (i18n) is required in the future:
- Use a proper i18n library (e.g., `i18next`)
- Keep English as the default language
- Store translations in separate locale files
- Make language selection explicit via CLI option

## Testing Requirements

### Message Validation
- Test assertions should check for English messages
- Update tests when converting Japanese messages to English
- Example:
  ```typescript
  // ✅ GOOD
  expect(mockInput).toHaveBeenCalledWith({
    message: 'Enter project name (comma-separated for multiple projects)',
  });

  // ❌ BAD (unless during migration)
  expect(mockInput).toHaveBeenCalledWith({
    message: 'プロジェクト名を入力してください',
  });
  ```

## Checklist for New Features

When adding new user-facing features:
- [ ] All CLI options have English descriptions
- [ ] Help text is in English
- [ ] Error messages are in English
- [ ] Interactive prompts use English
- [ ] Success/failure messages are in English
- [ ] Examples in help text use English annotations
- [ ] Tests verify English messages

## References

- Commander.js documentation: English examples
- Inquirer.js documentation: English prompts
- npm CLI: English messages
- GitHub CLI (gh): English interface

## Summary

**Always implement user-facing messages in English.** This ensures Kirox CLI is accessible, maintainable, and consistent with the broader developer ecosystem.
