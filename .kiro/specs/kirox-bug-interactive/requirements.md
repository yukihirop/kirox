# Requirements Document

## Project Description (Input)
[kirox-bug-interactive] npm run dev

> kirox@0.1.0 dev
> tsx src/index.ts

✔ 📦 Enter GitHub repository (owner/repo or owner/repo#branch) yukihirop/eg-kanban

Fetching branches...
? 🌿 Select branch (type to filter, space to select, enter to confirm) test

Scanning repository for projects...
Found 4 projects across 3 subdirectories

? 📋 Select projects (type to filter, space to select, enter to confirm) lib/a/simple-kanban-board-a, lib/a/simple-kanban-board-b
✔ 📂 Enter output directory (default: .) tmp

Configuration:
  Repository: yukihirop/eg-kanban#test
  Project: simple-kanban-board-a, simple-kanban-board-b
  Output: tmp
  Subdirectory: lib/a
? 🚀 Execute with this configuration? (y/N) => 「  ? 🌿 Select branch (type to filter, space to select, enter to confirm) test」と「  ? 📋 Select projects (type to filter, space to filter, enter to confirm) lib/a/simple-kanban-board-a, lib/a/simple-kanban-board-b」と「  ? 📁 Select subdirectory」は入力したのに先頭が「✔」ではなく

## Introduction

Kirox CLIのインタラクティブモードにおいて、ユーザーがブランチ・サブディレクトリ・プロジェクトの選択を完了した後、プロンプト表示の先頭記号が疑問符(?)からチェックマーク(✔)に変更されない視覚的なバグが発生しています。

この問題により、ユーザーは選択が正常に完了したかどうかを視覚的に確認できず、ユーザーエクスペリエンスが低下しています。特に、リポジトリ入力や出力ディレクトリ入力では正常にチェックマーク(✔)が表示されるため、一貫性のない表示となっています。

本要件は、`searchableCheckbox`カスタムプロンプトの完了時表示を修正し、すべてのインタラクティブプロンプトで一貫したビジュアルフィードバックを提供することを目的としています。

## Requirements

### Requirement 1: ブランチ選択プロンプトの完了表示修正
**Objective:** As a CLI user, I want to see a checkmark (✔) prefix when I complete branch selection, so that I can visually confirm my selection was accepted.

#### Acceptance Criteria

1. WHEN user completes branch selection in interactive mode THEN branch prompt SHALL display checkmark (✔) prefix instead of question mark (?) prefix
2. WHEN branch prompt shows completion THEN the selected branch name SHALL be displayed after the checkmark prefix
3. WHEN branch selection is completed THEN the prompt display format SHALL match the repository input completion format (✔ 📦 Enter GitHub repository...)
4. IF user selects the default branch THEN branch prompt SHALL display checkmark with selected branch name
5. IF user selects a non-default branch THEN branch prompt SHALL display checkmark with selected branch name

### Requirement 2: サブディレクトリ選択プロンプトの完了表示修正
**Objective:** As a CLI user in steering mode, I want to see a checkmark (✔) prefix when I complete subdirectory selection, so that I can visually confirm my selection was accepted.

#### Acceptance Criteria

1. WHEN user completes subdirectory selection in interactive mode (--steering mode) THEN subdirectory prompt SHALL display checkmark (✔) prefix instead of question mark (?) prefix
2. WHEN subdirectory prompt shows completion THEN the selected subdirectory path SHALL be displayed after the checkmark prefix
3. IF user selects root directory "(root)" THEN subdirectory prompt SHALL display checkmark with "(root)" label
4. IF user selects a non-root subdirectory THEN subdirectory prompt SHALL display checkmark with the subdirectory path

### Requirement 3: プロジェクト選択プロンプトの完了表示修正
**Objective:** As a CLI user, I want to see a checkmark (✔) prefix when I complete project selection, so that I can visually confirm my selection was accepted.

#### Acceptance Criteria

1. WHEN user completes project selection in interactive mode THEN project prompt SHALL display checkmark (✔) prefix instead of question mark (?) prefix
2. WHEN project prompt shows completion THEN all selected project display names SHALL be shown after the checkmark prefix
3. IF user selects a single project THEN project prompt SHALL display checkmark with single project display name
4. IF user selects multiple projects THEN project prompt SHALL display checkmark with comma-separated project display names
5. WHEN multiple projects are selected THEN the display format SHALL be "displayName1, displayName2, displayName3"

### Requirement 4: searchableCheckboxカスタムプロンプトの修正
**Objective:** As a developer, I want the searchableCheckbox custom prompt to use checkmark prefix on completion, so that all prompts using this component display consistent completion indicators.

#### Acceptance Criteria

1. WHEN searchableCheckbox prompt transitions to 'done' state THEN the prompt SHALL use checkmark (✔) prefix instead of default question mark (?) prefix
2. WHEN rendering completion state THEN searchableCheckbox SHALL apply success theme prefix using @inquirer/core's usePrefix hook
3. WHERE the prompt is in 'done' status THEN the rendered output format SHALL be "{checkmark_prefix} {message} {selected_answer}"
4. WHEN searchableCheckbox completes successfully THEN the prefix SHALL use the theme's success icon (chalk.green(figures.tick))

### Requirement 5: ビジュアル一貫性の保証
**Objective:** As a CLI user, I want all interactive prompts to display consistent completion indicators, so that I have a predictable and intuitive user experience.

#### Acceptance Criteria

1. WHEN any interactive prompt completes THEN all prompts SHALL use identical checkmark (✔) prefix styling
2. WHEN comparing repository input prompt and searchableCheckbox prompts THEN both SHALL display the same checkmark character and color (green)
3. WHERE a prompt uses emoji prefix (e.g., 🌿, 📋, 📁) THEN the checkmark SHALL appear before the emoji in completion state
4. WHEN all interactive steps complete THEN the terminal output SHALL show consistent visual pattern with all checkmarks aligned

### Requirement 6: 既存機能への影響回避
**Objective:** As a developer, I want the fix to only affect visual display, so that existing functionality and behavior remain unchanged.

#### Acceptance Criteria

1. WHEN modifying searchableCheckbox completion display THEN the prompt's return value SHALL remain unchanged
2. WHEN applying the fix THEN validation logic, error handling, and selection behavior SHALL not be affected
3. WHEN updating prefix display THEN keyboard event handling (space, enter, arrows) SHALL continue to function identically
4. WHERE tests exist for searchableCheckbox THEN all existing unit tests and integration tests SHALL continue to pass
5. WHEN the fix is applied THEN no breaking changes SHALL be introduced to the public API of searchableCheckbox
