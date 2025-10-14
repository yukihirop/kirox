# Technical Design Document

## Overview

本機能は、Kirox CLIのインタラクティブモードにおける全てのユーザープロンプトメッセージに視覚的な絵文字プレフィックスを追加し、ユーザー体験を向上させる。現在のテキストのみのプロンプトは機能的であるが視覚的な魅力に欠けるため、各質問の目的を表す適切な絵文字を先頭に配置することで、より親しみやすく直感的なインターフェースを提供する。

**ユーザー**: インタラクティブモードを使用する全てのKirox CLIユーザーが対象となる。開発者、チームメンバー、新規ユーザーがCLI実行時に視覚的に改善されたプロンプトを体験する。

**影響**: 既存のプロンプトメッセージ文字列に絵文字プレフィックスを追加することで、5つのプロンプト関数（9つのプロンプト地点）を修正する。この変更は視覚的な改善のみであり、プロンプトロジック、バリデーション、エラーハンドリングには一切変更を加えない。

### Goals

- 9つの全てのインタラクティブプロンプトに意味のある絵文字プレフィックスを追加する
- 既存のプロンプト動作（バリデーション、デフォルト値、エラー処理）を完全に維持する
- 全ての既存テストケース（ユニット、統合）を絵文字を含む新しいメッセージ形式に対応させる
- ユーザー体験を視覚的に改善し、各プロンプトの目的を一目で識別可能にする

### Non-Goals

- プロンプトロジックの変更や機能追加
- 新しいプロンプトの追加
- 絵文字以外のスタイリング変更（色、フォーマット、レイアウト）
- 絵文字の動的な選択や設定可能化（固定マッピングを使用）

## Architecture

### 既存アーキテクチャ分析

Kirox CLIは4層アーキテクチャを採用しており、インタラクティブプロンプトはCLI層に配置されている。

**現在のプロンプト実装構造**:
```
src/cli/
├── interactive-prompt.ts    # 5つの主要プロンプト関数
├── branch-prompt.ts          # ブランチ選択UI
├── searchable-project-prompt.ts  # プロジェクト選択UI
├── searchable-subdir-prompt.ts   # サブディレクトリ選択UI
src/filesystem/
└── prompt.ts                 # 上書き確認プロンプト
```

**使用ライブラリ**:
- `chalk` (v5.x): ターミナル出力の色付けとスタイリング
- `@inquirer/prompts`: インタラクティブプロンプトUI（input, confirm）
- `searchable-checkbox`: カスタム検索可能チェックボックスプロンプト

**既存のメッセージ構築パターン**:
全てのプロンプトは`chalk.bold.cyan()`で質問メッセージを装飾し、`chalk.dim()`でヒントや説明を追加している。

```typescript
// 現在のパターン
chalk.bold.cyan('Enter GitHub repository') + chalk.dim(' (owner/repo)')
```

### 技術的アライメント

**既存パターンの保持**:
- Chalkを使用した色付けパターン（cyan for questions, dim for hints）
- メッセージ文字列の構築方法（テンプレートリテラルと文字列連結）
- プロンプト関数のシグネチャと戻り値の型

**新しい要素**:
- 絵文字プレフィックスをメッセージ文字列の先頭に追加
- 絵文字とメッセージの間にスペースを挿入（`"📦 Enter..."`）

**ステアリング準拠**:
- Single Responsibility Principle: 各プロンプト関数は単一の責任を維持
- 既存の依存関係（Chalk、Inquirer）を再利用
- テスト可能性を維持（メッセージ文字列のアサーションを更新）

## 技術的アライメント

本機能は既存のKirox CLIの技術スタックとパターンに完全に準拠する。

**既存技術スタックとの整合性**:
- **Chalk (v5.x)**: 既存の色付けライブラリを継続使用、絵文字は単純な文字列プレフィックスとして追加
- **@inquirer/prompts**: 既存のプロンプトライブラリのAPIは変更なし
- **TypeScript**: 型定義やインターフェースに変更なし

**新しい依存関係**: なし（既存ライブラリのみを使用）

**パターンの遵守**:
- メッセージ構築パターン：`chalk.bold.cyan()`で質問を装飾、`chalk.dim()`でヒントを追加
- 絵文字は単純な文字列リテラルとしてメッセージ先頭に配置

## 主要な設計決定

### 決定1: メッセージ文字列への直接統合方式

**コンテキスト**: 絵文字をプロンプトメッセージに追加する方法として、複数のアプローチが考えられる。

**検討した代替案**:
1. **ヘルパー関数方式**: `addEmoji(type, message)` のような関数を作成し、絵文字マッピングを集中管理
2. **定数マッピング方式**: `EMOJI_MAP = { repository: '📦', branch: '🌿', ... }` を定義し、プロンプト関数で参照
3. **直接統合方式**: メッセージ文字列に絵文字リテラルを直接埋め込む

**選択したアプローチ**: 直接統合方式（オプション3）

各プロンプトメッセージ文字列の先頭に絵文字を直接記述する：

```typescript
// Before
message: chalk.bold.cyan('Enter GitHub repository')

// After
message: chalk.bold.cyan('📦 Enter GitHub repository')
```

**根拠**:
- **シンプルさ**: 追加のヘルパー関数や定数定義が不要で、コードの複雑度を増加させない
- **可読性**: 絵文字がメッセージ文字列内に直接記述されているため、視覚的に理解しやすい
- **局所性**: プロンプトメッセージと絵文字が同じ場所に配置され、変更時の追跡が容易
- **最小変更**: 既存のプロンプトロジックに一切変更を加えず、文字列リテラルのみを修正
- **テスト容易性**: テストコードでのメッセージ検証が直感的（絵文字を含む完全な文字列をアサート）

**トレードオフ**:
- **得られるもの**: 実装のシンプルさ、コードの可読性、最小の変更範囲、テストの明確性
- **失うもの**: 絵文字マッピングの集中管理（各プロンプトに絵文字が分散）、絵文字の動的変更の柔軟性

集中管理の利点よりもシンプルさと局所性の利点が上回ると判断した。絵文字は固定であり、将来的に動的に変更する必要性は低い。

### 決定2: 絵文字とメッセージの間のスペース配置

**コンテキスト**: 絵文字とメッセージテキストの間隔をどのように扱うか。

**検討した代替案**:
1. **スペースあり**: `"📦 Enter GitHub repository"`（絵文字の後にスペース）
2. **スペースなし**: `"📦Enter GitHub repository"`（絵文字とテキストを直接連結）

**選択したアプローチ**: スペースあり（オプション1）

**根拠**:
- **可読性**: 絵文字とテキストの間にスペースがあることで、視覚的に分離され読みやすい
- **標準的な慣行**: 一般的なCLIツールやUIデザインでは、アイコンとテキストの間にスペースを配置する
- **ターミナルフォントの互換性**: 一部のターミナルフォントでは絵文字の幅が不安定な場合があり、スペースが緩衝帯として機能する

**トレードオフ**:
- **得られるもの**: 可読性の向上、標準的なUI慣行との一貫性、フォント互換性の向上
- **失うもの**: 1文字分の追加スペース（影響は最小限）

## Requirements Traceability

| 要件 | 要件概要 | 変更ファイル | 変更関数/行 |
|------|----------|------------|-----------|
| 1.1-1.3 | リポジトリ入力プロンプト絵文字（📦） | `src/cli/interactive-prompt.ts` | `promptRepository` (L101-102) |
| 2.1-2.2 | ブランチ選択プロンプト絵文字（🌿） | `src/cli/branch-prompt.ts` | `promptBranch` (L66-67) |
| 3.1-3.2 | プロジェクト選択プロンプト絵文字（📋） | `src/cli/searchable-project-prompt.ts` | `promptProjectSelection` (L91-92) |
| 4.1-4.2 | プロジェクト名入力プロンプト絵文字（📋） | `src/cli/interactive-prompt.ts` | `promptProject` (L207-208) |
| 5.1-5.2 | 出力ディレクトリ入力プロンプト絵文字（📂） | `src/cli/interactive-prompt.ts` | `promptOutput` (L232-233) |
| 6.1-6.2 | サブディレクトリ選択プロンプト絵文字（📁） | `src/cli/searchable-subdir-prompt.ts` | `promptSubdirSelection` (L99-100) |
| 7.1-7.3 | サブディレクトリ入力プロンプト絵文字（📁） | `src/cli/interactive-prompt.ts` | `promptSubdir` (L251-253) |
| 8.1-8.2 | 実行確認プロンプト絵文字（❓） | `src/cli/interactive-prompt.ts` | `confirmExecution` (L303) |
| 9.1-9.2 | ファイル上書き確認プロンプト絵文字（⚠️） | `src/filesystem/prompt.ts` | `confirm` (L34) |
| 10.1-10.3 | 既存機能との互換性維持 | 全変更ファイル | プロンプトロジック、バリデーション、エラー処理は変更なし |
| 11.1-11.3 | テストのカバレッジ維持 | `tests/unit/cli/*.test.ts`, `tests/integration/*.test.ts` | メッセージアサーションを絵文字含む形式に更新 |

## Components and Interfaces

本機能は既存のプロンプトコンポーネントのメッセージ文字列のみを修正し、新しいコンポーネントやインターフェースの追加は行わない。

### CLI層 / インタラクティブプロンプト

#### interactive-prompt.ts

**変更の責任範囲**:
- 5つのプロンプト関数（`promptRepository`, `promptProject`, `promptOutput`, `promptSubdir`, `confirmExecution`）のメッセージ文字列に絵文字プレフィックスを追加
- プロンプトロジック、バリデーション、エラーハンドリングは一切変更しない

**依存関係**:
- **変更なし**: `@inquirer/prompts`（input, confirm）、`chalk`、既存のバリデーション関数

**変更内容**:

**promptRepository関数** (L101-102):
```typescript
// Before
message: chalk.bold.cyan('Enter GitHub repository (owner/repo or owner/repo#branch)')

// After
message: chalk.bold.cyan('📦 Enter GitHub repository (owner/repo or owner/repo#branch)')
```

**promptProject関数** (L207-208):
```typescript
// Before
message: chalk.bold.cyan('Enter project name') + chalk.dim(' (comma-separated for multiple projects)')

// After
message: chalk.bold.cyan('📋 Enter project name') + chalk.dim(' (comma-separated for multiple projects)')
```

**promptOutput関数** (L232-233):
```typescript
// Before
message: chalk.bold.cyan('Enter output directory') + chalk.dim(` (default: ${defaultValue})`)

// After
message: chalk.bold.cyan('📂 Enter output directory') + chalk.dim(` (default: ${defaultValue})`)
```

**promptSubdir関数** (L251-253):
```typescript
// Before
message: chalk.bold.cyan('Enter subdirectory in GitHub repository') + chalk.dim(' (optional)')

// After
message: chalk.bold.cyan('📁 Enter subdirectory in GitHub repository') + chalk.dim(' (optional)')
```

**confirmExecution関数** (L303):
```typescript
// Before
message: chalk.bold.yellow('Execute with this configuration?')

// After
message: chalk.bold.yellow('❓ Execute with this configuration?')
```

#### branch-prompt.ts

**変更の責任範囲**:
- `promptBranch`関数のメッセージ文字列に絵文字プレフィックスを追加

**変更内容** (L66-67):
```typescript
// Before
message: chalk.bold.cyan('Select branch') + chalk.dim(' (type to filter, space to select, enter to confirm)')

// After
message: chalk.bold.cyan('🌿 Select branch') + chalk.dim(' (type to filter, space to select, enter to confirm)')
```

#### searchable-project-prompt.ts

**変更の責任範囲**:
- `promptProjectSelection`関数のメッセージ文字列に絵文字プレフィックスを追加

**変更内容** (L91-92):
```typescript
// Before
message: chalk.bold.cyan('Select projects') + chalk.dim(' (type to filter, space to select, enter to confirm)')

// After
message: chalk.bold.cyan('📋 Select projects') + chalk.dim(' (type to filter, space to select, enter to confirm)')
```

#### searchable-subdir-prompt.ts

**変更の責任範囲**:
- `promptSubdirSelection`関数のメッセージ文字列に絵文字プレフィックスを追加

**変更内容** (L99-100):
```typescript
// Before
message: chalk.bold.cyan('Select subdirectory') + chalk.dim(' (type to filter, space to select, enter to confirm)')

// After
message: chalk.bold.cyan('📁 Select subdirectory') + chalk.dim(' (type to filter, space to select, enter to confirm)')
```

### FileSystem層 / 上書き確認プロンプト

#### filesystem/prompt.ts

**変更の責任範囲**:
- `confirm`関数のメッセージ表示に絵文字プレフィックスを追加

**依存関係**:
- **変更なし**: `readline`モジュール

**変更内容** (L34):
```typescript
// Before
rl.question(`${message} (y/N): `, (answer: string) => {

// After
rl.question(`⚠️ ${message} (y/N): `, (answer: string) => {
```

**注意**: この関数は`readline.createInterface`を使用しており、Inquirerではない。メッセージはテンプレートリテラルで構築される。

## Error Handling

本機能は既存のエラーハンドリングロジックに一切変更を加えない。

### エラー戦略

絵文字の追加は純粋に視覚的な変更であり、新しいエラーケースは発生しない。

**既存のエラーハンドリングの維持**:
- **バリデーションエラー**: プロンプト関数内の`validate`オプションは変更なし（例: `validateRepositoryFormat`, `validateProjectName`）
- **ユーザーキャンセル**: Ctrl+C時の`ExitPromptError`ハンドリングは変更なし
- **確認拒否**: `confirmExecution`での確認拒否時の`'Operation cancelled'`エラーは変更なし

### エラーメッセージの変更なし

エラーメッセージ（`chalk.red()`で表示される検証エラーやシステムエラー）には絵文字を追加しない。要件は正常系のプロンプトメッセージのみを対象としている。

## Testing Strategy

### ユニットテスト

既存のユニットテストを絵文字を含む新しいメッセージ形式に対応させる。

**対象テストファイル**:
- `tests/unit/cli/interactive-prompt.test.ts`（存在する場合）
- その他、プロンプトメッセージをアサートするユニットテスト

**更新内容**:
- メッセージ文字列のアサーションを絵文字を含む形式に更新
- 例: `expect(message).toContain('Enter GitHub repository')` → `expect(message).toContain('📦 Enter GitHub repository')`

**テストすべき項目**（各プロンプト関数ごと）:
1. プロンプトメッセージに正しい絵文字が含まれているか
2. 絵文字の後にスペースが挿入されているか
3. 既存のバリデーション動作が維持されているか
4. デフォルト値が正しく表示されるか（該当する場合）

### 統合テスト

既存の統合テストを絵文字を含む新しいメッセージ形式に対応させる。

**対象テストファイル**:
- `tests/integration/interactive-prompt.test.ts`（存在する場合）
- `tests/integration/interactive-config-integration.test.ts`
- `tests/integration/interactive-partial-args.test.ts`
- その他、プロンプトメッセージをアサートする統合テスト

**更新内容**:
- モック関数への期待値を絵文字を含む形式に更新
- 例: `expect(mockInput).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('📦 Enter GitHub repository') }))`

**テストすべき項目**:
1. インタラクティブモードの全体フローで絵文字が正しく表示されるか
2. 複数のプロンプトが連続で表示される場合、全てのプロンプトに絵文字が含まれているか
3. エラー発生時のフォールバック動作が絵文字の有無に影響されないか

### E2Eテスト

E2Eテストは実際のターミナル出力を検証する場合、絵文字を含むメッセージ形式を期待する。

**対象テストファイル**:
- `tests/e2e/basic-flow.test.ts`（存在する場合）
- その他、実際のCLI実行をテストするE2Eテスト

**更新内容**:
- ターミナル出力のスナップショットやアサーションを絵文字を含む形式に更新
- ターミナルのエンコーディング設定を確認（UTF-8を想定）

**テストすべき項目**:
1. 実際のターミナルで絵文字が正しく表示されるか
2. 異なるターミナル環境（macOS Terminal, iTerm2, Windows Terminal等）で絵文字が表示されるか
3. CI環境でテストが通過するか（ターミナルエミュレーションの確認）

### 手動テスト

**手動テストチェックリスト**:
1. **各プロンプトの視覚確認**:
   - インタラクティブモードを実行し、全てのプロンプトに絵文字が表示されることを確認
   - 絵文字とメッセージの間にスペースがあることを確認
2. **異なるターミナル環境での動作確認**:
   - macOS Terminal
   - iTerm2
   - Windows Terminal
   - VS Code統合ターミナル
3. **既存機能の回帰テスト**:
   - バリデーションエラーが正しく表示されるか
   - デフォルト値が正しく機能するか
   - Ctrl+Cでのキャンセルが動作するか
   - 確認拒否時のエラーハンドリングが動作するか

## 絵文字マッピング一覧

各プロンプトに対応する絵文字とその選定理由：

| プロンプト | 絵文字 | 選定理由 |
|-----------|-------|---------|
| リポジトリ入力 | 📦 | パッケージ/リポジトリを象徴、GitHubリポジトリの概念と一致 |
| ブランチ選択 | 🌿 | ブランチ（枝）を視覚的に表現、Gitブランチの概念と一致 |
| プロジェクト選択/入力 | 📋 | リスト/プロジェクト一覧を象徴、複数プロジェクトの選択に適合 |
| 出力ディレクトリ入力 | 📂 | 開いたフォルダを表現、ファイル保存先の指定に適合 |
| サブディレクトリ選択/入力 | 📁 | 閉じたフォルダを表現、ディレクトリ構造の中の特定位置を示す |
| 実行確認 | ❓ | 質問/確認を象徴、ユーザーの意思確認に適合 |
| 上書き確認 | ⚠️ | 警告/注意を象徴、重要な確認操作であることを強調 |
