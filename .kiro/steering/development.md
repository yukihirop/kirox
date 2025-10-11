<!-- Inclusion Mode: Always -->

# Kirox CLI - Development Workflow

## Development Guidelines

### Commit Policy

**Token Efficiency**:
- **コミット省略の原則**: ユーザーが明示的にコミットを要求しない限り、token節約のためコミットは省略する
- **仕様書作成時**: `/kiro:spec-init`, `/kiro:spec-requirements`, `/kiro:spec-design`, `/kiro:spec-tasks`の実行後は自動コミットしない
- **実装作業時**: タスク完了後もユーザーの指示がある場合のみコミット
- **例外**: ユーザーが「コミットして」「gitにcommitして」などと明示的に要求した場合のみコミットを実行

**コミットメッセージ形式**（コミット実行時）:
- Conventional Commits形式を使用: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- 日本語で記述
- 絵文字は不要（デフォルトでは使用しない）

### Conversation Management

**長い会話のリセット**:
- 会話が長くなった場合は `/clear` コマンドで履歴をクリア
- 仕様書ファイル（`.kiro/specs/`）は永続化されているため、`/clear`後も継続可能
- 再開時は `/kiro:spec-status <feature-name>` で現在の進捗を確認

### Implementation Workflow

**段階的な実装**:
1. 仕様書作成フェーズ（init → requirements → design → tasks）
2. 実装フェーズ（`/kiro:spec-impl <feature-name> <task-numbers>`）
3. テスト実行とバリデーション
4. ユーザーの明示的な指示があればコミット

**タスク管理**:
- タスク完了時に `tasks.md` のチェックボックスをマーク
- 複数タスクを並行実行しない（順次実行が原則）
- 既存テストスイートの合格を継続的に確認

### Code Generation Principles

**実装時の優先順位**:
1. 既存コンポーネントの再利用を最優先
2. 既存パターンとの一貫性を保つ
3. 型安全性を維持（`any`型は使用しない）
4. テスト駆動開発（TDD）を推奨

**ファイル作成の最小化**:
- 既存ファイルの編集を優先
- 新規ファイル作成は設計書で明示的に定義された場合のみ
- マークダウンファイルやREADMEは明示的な要求がない限り作成しない

## Communication Style

**応答の言語**:
- 思考は英語、回答の生成は日本語で行う
- コードコメントは英語（`src/` 配下）
- ユーザー向けメッセージは英語（`language.md`参照）

**絵文字の使用**:
- デフォルトでは絵文字を使用しない
- ユーザーが明示的に要求した場合のみ使用

## Token Optimization

**コンテキスト管理**:
- 長い会話では `/clear` を活用
- 仕様書ファイルは必要時に再読み込み
- 不要な出力を避ける（例: 長いファイルの全文表示）

**効率的なツール使用**:
- 複数の独立したツール呼び出しは並列実行
- ファイル検索は `Glob` と `Grep` を活用
- 大きなファイルは `limit` パラメータで部分読み込み
