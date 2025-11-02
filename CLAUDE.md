# Claude Code Spec-Driven Development

Kiro-style Spec Driven Development implementation using claude code slash commands, hooks and agents.

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`
- Commands: `.claude/commands/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- `kirox-cli`: CLI tool to fetch Kiro specification and steering files from remote repositories
- `kirox-update-tracking`: Update tracking feature for remote repository changes
- `kirox-repo-subdir`: Support fetching .kiro files from subdirectories in remote repositories
- `kirox-repo-branch`: Support branch specification using owner/repo#branch format
- `kirox-github-workflow`: GitHub Actions CI/CD workflow setup and configuration
- `kirox-cli-interactive`: Interactive mode for kirox CLI when executed without options
- `kirox-multi-project`: Multiple project support within the same subdirectory for both interactive and non-interactive modes
- `kirox-suggest-project`: Project suggestion feature in interactive mode - fetch available projects from GitHub API and present as radio button selection
- `kirox-upgrade-suggest-project`: Enhanced project suggestion - auto-detect projects across all subdirectories using GitHub Tree API, eliminating the need for manual subdirectory input
- `kirox-searchable-checkbox-upgrade`: Upgrade interactive mode with searchable checkbox for project selection, replacing two-step UI with single-step filterable checkbox using inquirer-ts-checkbox-plus-prompt
- `kirox-suggest-branch`: Interactive branch selection with searchable checkbox when branch is not specified in repository input
- `kirox-track-default-false`: Change default value of --track option to false
- `kirox-add-cmd`: Add subcommand for adding projects in both interactive and non-interactive modes
- `kirox-completion-cmd`: Shell completion command to output completion scripts for bash, zsh, fish, powershell, and elvish
- `kirox-bug-test`: Fix failing npm run test by correcting test code (assuming implementation code is correct)
- `kirox-bug-interactive`: Fix interactive mode prompt completion indicators - ensure branch, subdirectory, and project selections display checkmarks (✔) instead of question marks (?)
- `kirox-opt-steering`: Add --steering option to fetch only .kiro/steering directory; skip project specification in non-interactive mode and project suggestion in interactive mode
- `kirox-interactive-emoji`: Add emoji prefixes to interactive mode prompts to improve visual appeal and user experience
- `kirox-vitepress-docs`: VitePress documentation creation and deployment
- `kirox-knip`: Configure knip for detecting unused files, dependencies, and exports
- `kirox-ora-spinner`: Integrate ora spinner library to unify file fetching progress display with spinner UI instead of line-by-line output
- `kirox-lightweight-logger`: Replace custom logger.ts with lightweight logging library, default to info level, and eliminate verbose flag conditionals
- `kirox-fix-tests`: Fix failing tests by correcting test code (implementation code is assumed correct)
- `kirox-fix-pino-logger-mocks`: Fix PinoLogger mock configuration in test files to resolve 92 failing tests caused by incorrect mock setup
- `kirox-fix-logger-error-tests`: Fix logger.error is not a function errors affecting 140 test failures across multiple test files
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, but generate responses in Japanese (思考は英語、回答の生成は日本語で行うように)

## Workflow

### Phase 0: Steering (Optional)
`/kiro:steering` - Create/update steering documents
`/kiro:steering-custom` - Create custom steering for specialized contexts

Note: Optional for new features or small additions. You can proceed directly to spec-init.

### Phase 1: Specification Creation
1. `/kiro:spec-init [detailed description]` - Initialize spec with detailed project description
2. `/kiro:spec-requirements [feature]` - Generate requirements document
3. `/kiro:spec-design [feature]` - Interactive: "Have you reviewed requirements.md? [y/N]"
4. `/kiro:spec-tasks [feature]` - Interactive: Confirms both requirements and design review

### Phase 2: Progress Tracking
`/kiro:spec-status [feature]` - Check current progress and phases

## Development Rules
1. **Consider steering**: Run `/kiro:steering` before major development (optional for new features)
2. **Follow 3-phase approval workflow**: Requirements → Design → Tasks → Implementation
3. **Approval required**: Each phase requires human review (interactive prompt or manual)
4. **No skipping phases**: Design requires approved requirements; Tasks require approved design
5. **Update task status**: Mark tasks as completed when working on them
6. **Keep steering current**: Run `/kiro:steering` after significant changes
7. **Check spec compliance**: Use `/kiro:spec-status` to verify alignment

## Steering Configuration

### Current Steering Files
Managed by `/kiro:steering` command. Updates here reflect command changes.

### Active Steering Files
- `product.md`: Always included - Product context and business objectives
- `tech.md`: Always included - Technology stack and architectural decisions
- `structure.md`: Always included - File organization and code patterns

### Custom Steering Files
<!-- Added by /kiro:steering-custom command -->
<!-- Format:
- `filename.md`: Mode - Pattern(s) - Description
  Mode: Always|Conditional|Manual
  Pattern: File patterns for Conditional mode
-->
- `development.md`: Always - Development workflow, commit policy, token optimization, and conversation management
- `language.md`: Conditional - `"src/cli/**/*"`, `"src/reporting/**/*"`, `"src/**/*prompt*.ts"` - Language policy for user-facing messages (English-only requirement)
- `testing.md`: Conditional - `"**/*.test.ts"`, `"**/*.test.js"` - Testing standards, TDD methodology, and external API mocking strategies

### Inclusion Modes
- **Always**: Loaded in every interaction (default)
- **Conditional**: Loaded for specific file patterns (e.g., "*.test.js")
- **Manual**: Reference with `@filename.md` syntax

