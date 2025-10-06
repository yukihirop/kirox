# Kirox CLI - Project Structure

## Root Directory Organization

```
kirox/
├── src/                    # ソースコード（TypeScript）
│   ├── cli/               # CLI層（引数パース、バリデーション）
│   ├── github/            # GitHub統合層（API通信、ファイル取得）
│   ├── filesystem/        # ファイルシステム層（書き込み、上書き確認）
│   ├── reporting/         # レポーティング層（進捗表示、エラーハンドリング）
│   ├── config/            # 設定管理（.kiroxrc.json読み込み）
│   ├── types/             # TypeScript型定義
│   └── index.ts           # エントリポイント
├── tests/                 # テストコード
│   ├── unit/             # 単体テスト
│   ├── integration/      # 統合テスト
│   └── e2e/              # E2Eテスト
├── dist/                  # コンパイル済みJavaScript（gitignore）
├── .kiro/                 # Kiro仕様書・ステアリング
│   ├── specs/            # 機能仕様書
│   └── steering/         # プロジェクトガイド（本ファイル）
├── .claude/               # Claude Code設定
├── package.json           # npm設定、依存関係、スクリプト
├── tsconfig.json          # TypeScriptコンパイラ設定
├── vitest.config.ts       # Vitestテスト設定
└── README.md              # プロジェクトREADME
```

## Subdirectory Structures

### `src/` - ソースコード

#### `src/cli/` - CLI層
```
src/cli/
├── entry.ts              # CLIエントリポイント、メイン実行フロー
├── parser.ts             # ArgumentParser: Commander.jsによる引数パース
├── validator.ts          # InputValidator: 引数バリデーションロジック
└── types.ts              # CLI層の型定義（ParsedArguments, CLIOptions等）
```

**責任範囲**:
- コマンドライン引数の受け付けと解析
- 引数の妥当性検証（リポジトリ形式、プロジェクト名検証）
- ヘルプメッセージ生成
- メイン実行フローの統括

#### `src/github/` - GitHub統合層
```
src/github/
├── fetcher.ts            # GitHubFetcher: ファイル取得のメインロジック
├── client.ts             # Octokitクライアント初期化と認証
├── semaphore.ts          # セマフォによる並列度制御ユーティリティ
├── rate-limit.ts         # レート制限チェックとモニタリング
└── types.ts              # GitHub層の型定義（FetchResult, FileContent等）
```

**責任範囲**:
- GitHub APIとの通信
- リポジトリコンテンツの取得（ディレクトリ一覧、ファイルコンテンツ）
- base64エンコードされたコンテンツのデコード
- 並列ファイル取得とセマフォ制御
- レート制限の監視と対応

#### `src/filesystem/` - ファイルシステム層
```
src/filesystem/
├── writer.ts             # FileWriter: ファイル書き込みメインロジック
├── prompt.ts             # PromptService: 対話的プロンプト（上書き確認）
├── path-utils.ts         # パス変換ユーティリティ（リモート→ローカル）
└── types.ts              # ファイルシステム層の型定義（WriteOptions等）
```

**責任範囲**:
- ローカルファイルシステムへの書き込み
- ディレクトリの自動作成（`.kiro/specs/`, `.kiro/steering/`）
- 既存ファイル上書き確認プロンプト
- --dry-runモードの処理（書き込みスキップ）

#### `src/reporting/` - レポーティング層
```
src/reporting/
├── progress-reporter.ts  # ProgressReporter: 進捗表示ロジック
├── error-handler.ts      # ErrorHandler: エラー分類とメッセージ変換
├── logger.ts             # 構造化ログ出力（--verbose対応）
└── types.ts              # レポーティング層の型定義（ErrorType等）
```

**責任範囲**:
- リアルタイム進捗表示（Chalk使用）
- サマリー表示（成功・失敗ファイル数）
- エラー分類とユーザーフレンドリーなメッセージ生成
- --verboseオプション時の詳細ログ出力

#### `src/config/` - 設定管理
```
src/config/
├── loader.ts             # 設定ファイル読み込み（.kiroxrc.json）
├── merger.ts             # 設定のマージとデフォルト値適用
└── types.ts              # 設定層の型定義（KiroxConfig等）
```

**責任範囲**:
- .kiroxrc.jsonファイルの検索と読み込み
- CLIオプション、設定ファイル、環境変数、デフォルト値のマージ
- 設定の優先順位制御

#### `src/types/` - グローバル型定義
```
src/types/
├── index.ts              # エクスポート集約
├── common.ts             # 共通型定義
└── domain.ts             # ドメインモデル（RepositoryReference, ProjectSpecification等）
```

### `tests/` - テストコード

#### `tests/unit/` - 単体テスト
```
tests/unit/
├── cli/
│   ├── parser.test.ts    # ArgumentParserのテスト
│   └── validator.test.ts # InputValidatorのテスト
├── github/
│   ├── fetcher.test.ts   # GitHubFetcherのテスト（モックAPI）
│   └── semaphore.test.ts # セマフォロジックのテスト
├── filesystem/
│   └── writer.test.ts    # FileWriterのテスト
└── reporting/
    └── error-handler.test.ts # ErrorHandlerのテスト
```

#### `tests/integration/` - 統合テスト
```
tests/integration/
├── cli-to-github.test.ts      # CLI → GitHub APIの統合テスト
├── github-to-fs.test.ts       # GitHub → ファイルシステムの統合テスト
└── error-recovery.test.ts     # エラーリカバリーフローのテスト
```

#### `tests/e2e/` - E2Eテスト
```
tests/e2e/
├── basic-flow.test.ts         # 基本フローのE2Eテスト
├── error-scenarios.test.ts    # エラーシナリオのE2Eテスト
└── options.test.ts            # 各種オプションのE2Eテスト
```

## Code Organization Patterns

### Layer-Based Architecture

Kirox CLIは、責任分離の原則に基づいた4層アーキテクチャを採用：

1. **CLI Layer** (`src/cli/`): ユーザーインターフェース
   - 外部依存: Commander.js
   - 単方向依存: CLI → GitHub、CLI → FileSystem

2. **GitHub Integration Layer** (`src/github/`): 外部サービス統合
   - 外部依存: Octokit
   - 独立性: ファイルシステムやCLIに依存しない

3. **File System Layer** (`src/filesystem/`): ローカルストレージ
   - 外部依存: Node.js fs/promises、readline
   - 独立性: GitHub層に依存しない

4. **Reporting Layer** (`src/reporting/`): 横断的関心事
   - 外部依存: Chalk
   - 全レイヤーから利用可能（依存注入）

### Dependency Flow

```
entry.ts (CLI Entry)
    ↓
parser.ts → validator.ts
    ↓
fetcher.ts (GitHub)
    ↓
writer.ts (FileSystem)
    ↓
progress-reporter.ts (Reporting)
error-handler.ts (Reporting)
```

**原則**:
- 上位層は下位層に依存可能
- 下位層は上位層に依存しない
- 横断的関心事（Reporting）は依存注入により全層で利用

## File Naming Conventions

### TypeScript Files
- **ケバブケース**: `file-name.ts`（推奨）
- **例**: `argument-parser.ts`, `github-fetcher.ts`, `progress-reporter.ts`

### Test Files
- **対象ファイル名 + `.test.ts`**: `file-name.test.ts`
- **例**: `argument-parser.test.ts`, `github-fetcher.test.ts`

### Type Definition Files
- **`types.ts`**: 各ディレクトリ内の型定義
- **`index.ts`**: 型のエクスポート集約

### Configuration Files
- **ドットファイル**: `.kiroxrc.json`, `.prettierrc`, `.eslintrc.js`
- **設定ファイル**: `tsconfig.json`, `vitest.config.ts`

## Import Organization

### Import順序（ESLint/Prettierで自動化）

1. **Node.js組み込みモジュール**
   ```typescript
   import { promises as fs } from 'fs';
   import path from 'path';
   ```

2. **外部ライブラリ**
   ```typescript
   import { Octokit } from 'octokit';
   import { Command } from 'commander';
   import chalk from 'chalk';
   ```

3. **内部モジュール（絶対パス、tsconfig.jsonのpaths設定）**
   ```typescript
   import { GitHubFetcher } from '@/github/fetcher';
   import { ProgressReporter } from '@/reporting/progress-reporter';
   ```

4. **相対パスインポート**
   ```typescript
   import { ParsedArguments } from './types';
   import { validateRepository } from './validator';
   ```

5. **型のみのインポート**
   ```typescript
   import type { FetchResult } from './types';
   ```

### Path Alias設定（tsconfig.json）
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**使用例**:
```typescript
// Good: 絶対パスでレイヤー間の依存を明確化
import { GitHubFetcher } from '@/github/fetcher';

// Avoid: 深いディレクトリの相対パス
import { GitHubFetcher } from '../../../github/fetcher';
```

## Key Architectural Principles

### 1. Single Responsibility Principle (SRP)
- 各コンポーネントは単一の責任を持つ
- 例: `GitHubFetcher`はファイル取得のみ、`FileWriter`は書き込みのみ

### 2. Dependency Inversion Principle (DIP)
- 上位層は抽象（インターフェース）に依存、具象に依存しない
- 例: `CLIEntry`は`IGitHubFetcher`インターフェースに依存

### 3. Interface Segregation Principle (ISP)
- 大きなインターフェースを避け、役割ごとに分割
- 例: `IProgressReporter`と`IErrorReporter`を分離

### 4. Layer Isolation
- レイヤー間の直接依存を最小化
- GitHub層とFileSystem層は互いに依存しない

### 5. Fail-Safe Design
- 部分的な失敗を許容（Promise.allSettled使用）
- エラー発生時も可能な限り処理を継続

### 6. Testability
- 各コンポーネントを単体でテスト可能に設計
- 外部依存はモックやスタブで置き換え可能

## Code Style Guidelines

### TypeScript
- **厳格な型チェック**: `strict: true` in tsconfig.json
- **`any`禁止**: 明示的な型定義を強制
- **関数の戻り値型明記**: 推論に頼らず明示的に指定

### Naming
- **関数**: 動詞から始めるキャメルケース（`fetchFiles`, `validateInput`）
- **クラス**: 名詞のパスカルケース（`GitHubFetcher`, `ProgressReporter`）
- **定数**: アッパースネークケース（`MAX_CONCURRENCY`, `DEFAULT_CONFIG`）
- **プライベートメンバー**: アンダースコアプレフィックス（`_internalState`）

### Error Handling
- **カスタムエラークラス**: ドメイン固有のエラー型を定義
  ```typescript
  class GitHubAPIError extends Error {
    constructor(public statusCode: number, message: string) {
      super(message);
    }
  }
  ```
- **エラーの適切な伝播**: try-catchで握りつぶさない

### Async/Await
- **Promiseチェーン禁止**: async/awaitを優先
- **並列処理**: `Promise.all()` / `Promise.allSettled()` 使用
- **エラーハンドリング**: 各async関数でtry-catchを適切に配置
