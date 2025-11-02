# Requirements Document

## Introduction

現在、kirox CLIのファイル取得進捗表示は、各ファイルごとに行単位で出力される形式となっており、複数プロジェクトや大量のファイルを取得する際に出力が冗長になっています。

```
[simple-kanban-board-a] [1/8] 📥 Fetching .kiro/specs/simple-kanban-board-a/design.md...
✓ Saved: .kiro/specs/simple-kanban-board-a/design.md
[simple-kanban-board-a] [2/8] 📥 Fetching .kiro/specs/simple-kanban-board-a/spec.json...
✓ Saved: .kiro/specs/simple-kanban-board-a/spec.json
...
```

この要件では、`ora` (https://www.npmjs.com/package/ora) ライブラリを統合し、ファイル取得の進捗をスピナー形式で一体的に表示することで、ユーザー体験を向上させます。スピナーは現在取得中のファイル情報を動的に更新し、完了時には成功/失敗を視覚的に明確にします。

## Requirements

### Requirement 1: oraライブラリの統合と初期化

**Objective:** As a kirox CLI user, I want the progress reporting to use ora spinner library, so that file fetching progress is displayed in a more compact and visually appealing format

#### Acceptance Criteria

1. WHEN kirox CLI starts a file fetching operation THEN ProgressReporter SHALL initialize an ora spinner instance with appropriate configuration
2. IF color output is disabled (useColor=false) THEN ProgressReporter SHALL configure ora to disable color output
3. WHEN ProgressReporter is instantiated THEN it SHALL store the ora spinner instance as a class member for reuse across multiple progress updates

### Requirement 2: スピナーベースの進捗表示

**Objective:** As a kirox CLI user, I want file fetching progress to be displayed using a spinner that updates in-place, so that terminal output remains compact and easy to follow

#### Acceptance Criteria

1. WHEN ProgressReporter.reportProgress() is called THEN it SHALL update the existing spinner text instead of printing a new line
2. WHEN a file is being fetched THEN the spinner SHALL display "[current/total] 📥 Fetching [file-path]..." with a rotating spinner animation
3. IF a project name is provided (multi-project mode) THEN the spinner text SHALL include "[project-name]" prefix before the progress counter
4. WHILE files are being fetched THE spinner SHALL continuously animate to indicate ongoing activity
5. WHEN a file fetch completes successfully THEN the spinner SHALL change to a success state (✓) and display "Saved: [file-path]"
6. WHEN a file fetch fails THEN the spinner SHALL change to a failure state (✗) and display the error message
7. IF ProgressReporter.reportProgress() is called multiple times for different files THEN the spinner SHALL update its text to reflect the current file being fetched

### Requirement 3: 既存のreportProgressメソッドの置き換え

**Objective:** As a kirox CLI maintainer, I want the existing console.log-based progress reporting to be replaced with ora spinner updates, so that the implementation is consistent with the new spinner-based approach

#### Acceptance Criteria

1. WHEN ProgressReporter.reportProgress() is implemented with ora THEN it SHALL remove the existing console.log() call that prints "[current/total] 📥 Fetching..." messages
2. WHEN ProgressReporter.reportProgress() is called THEN it SHALL use ora's .start() or .text property to update the spinner display
3. IF the spinner has not been started yet THEN reportProgress() SHALL call spinner.start() with the initial message
4. IF the spinner is already running THEN reportProgress() SHALL update spinner.text with the new progress message

### Requirement 4: 成功・失敗メッセージのスピナー統合

**Objective:** As a kirox CLI user, I want success and failure messages to be displayed through the spinner, so that all file-related feedback is visually consistent

#### Acceptance Criteria

1. WHEN ProgressReporter.reportSuccess() is called THEN it SHALL use ora's .succeed() method to display the success message
2. WHEN ProgressReporter.reportError() is called THEN it SHALL use ora's .fail() method to display the error message
3. WHEN a success message is displayed THEN ora SHALL automatically prepend a green checkmark (✓) to the message
4. WHEN an error message is displayed THEN ora SHALL automatically prepend a red cross mark (✗) to the message
5. IF reportSuccess() or reportError() is called after reportProgress() THEN the spinner SHALL transition from the spinning state to the appropriate completion state

### Requirement 5: マルチプロジェクト対応

**Objective:** As a kirox CLI user fetching multiple projects, I want each project's file fetching progress to be displayed with a separate spinner, so that I can track the progress of individual projects

#### Acceptance Criteria

1. WHEN multiple projects are being fetched THEN ProgressReporter SHALL maintain separate ora spinner instances for each project
2. WHEN a project-specific progress update is reported THEN the corresponding project's spinner SHALL be updated
3. WHEN a project completes (all files fetched) THEN that project's spinner SHALL stop and display a final summary message
4. WHERE a project name is provided in reportProgress() THE ProgressReporter SHALL route the update to the correct project-specific spinner

### Requirement 6: スピナーのライフサイクル管理

**Objective:** As a kirox CLI maintainer, I want spinner lifecycle to be properly managed, so that spinners are started, updated, and stopped at appropriate times

#### Acceptance Criteria

1. WHEN a file fetching operation begins THEN ProgressReporter SHALL create a new ora spinner instance
2. WHEN files are being fetched THEN the spinner SHALL remain in the spinning state
3. WHEN all files for a project are fetched THEN the spinner SHALL be stopped using .succeed() or .fail() based on overall success
4. IF an error occurs during fetching THEN the spinner SHALL be stopped with .fail() and display the error message
5. WHEN ProgressReporter is destroyed or the operation completes THEN all active spinners SHALL be properly stopped to prevent orphaned spinners

### Requirement 7: 既存機能との互換性維持

**Objective:** As a kirox CLI user, I want all existing CLI options and behaviors to work correctly with the new spinner-based progress display, so that the migration is transparent

#### Acceptance Criteria

1. WHEN --verbose option is enabled THEN ProgressReporter SHALL continue to display verbose messages in addition to spinner updates
2. WHEN --dry-run option is enabled THEN ProgressReporter SHALL display the file list without starting spinners for actual file fetching
3. IF useColor=false in ReporterOptions THEN ora SHALL be configured to disable all color output
4. WHEN reportSummary() is called THEN it SHALL display the summary after stopping all active spinners
5. WHEN reportProjectSummary() is called THEN it SHALL display project-specific summary information after that project's spinner has stopped

### Requirement 8: エラーハンドリングとフォールバック

**Objective:** As a kirox CLI user, I want the CLI to handle spinner-related errors gracefully, so that progress reporting failures do not break the file fetching operation

#### Acceptance Criteria

1. IF ora fails to initialize THEN ProgressReporter SHALL fall back to the original console.log-based progress reporting
2. IF a spinner update operation fails THEN ProgressReporter SHALL log the error and continue with the file fetching operation
3. WHEN an unexpected error occurs in spinner lifecycle management THEN the error SHALL be caught and logged without crashing the CLI

### Requirement 9: パフォーマンスと応答性

**Objective:** As a kirox CLI user, I want spinner updates to be performant and responsive, so that progress display does not slow down file fetching operations

#### Acceptance Criteria

1. WHEN spinner.text is updated THEN the update SHALL complete in less than 10ms to avoid blocking the main thread
2. IF ProgressReporter.reportProgress() is called at high frequency (>10 times/second) THEN spinner updates SHALL not introduce noticeable lag in file fetching operations
3. WHEN multiple spinners are active (multi-project mode) THEN the CLI SHALL maintain responsive spinner animations for all active projects
