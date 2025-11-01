# Technical Design

## Overview

本機能は、kirox-lightweight-logger仕様におけるLogger→PinoLogger移行完了後に発生した26個のテスト失敗を修正します。PinoLoggerの構造化ログ（JSON形式）への移行により、既存のテストコードでは古いLoggerクラスをモックしているため、実装コードの動作と一致しません。

**Purpose**: テストコードのモック設定とアサーションを実装の動作に合わせて修正し、CI/CDパイプラインの安定性を確保します。

**Users**: Kiroxプロジェクトの開発者およびメンテナーが利用し、PinoLogger移行後のテストスイートの信頼性を回復します。

**Impact**: 現在26個のテスト失敗により不安定なテストスイートを修正し、全2214テストが成功する状態を実現します。

### Goals

- 5つのテストファイルにおける合計26個の失敗テストをすべて修正する
- PinoLoggerの構造化ログ出力に対応したモック設定とアサーションを実装する
- testing.mdステアリング文書の原則に準拠した一貫性のあるモックパターンを確立する
- 実装コードを一切変更せず、テストコードのみで解決する

### Non-Goals

- 実装コード（PinoLogger、add-command-entry.ts等）の変更
- 新規テストの追加（既存の失敗テストの修正のみ）
- テストフレームワーク（Vitest）のアップグレード
- PinoLogger以外のロギング機構の導入

## Architecture

### Existing Architecture Analysis

Kirox CLIプロジェクトは4層アーキテクチャを採用しています：

- **CLI Layer** (`src/cli/`): 引数パース、バリデーション、コマンドエントリーポイント
- **GitHub Integration Layer** (`src/github/`): GitHub API通信、ファイル取得
- **File System Layer** (`src/filesystem/`): ローカルファイル書き込み
- **Reporting Layer** (`src/reporting/`): 進捗表示、エラーハンドリング、**ロギング（PinoLogger）**

テストは`tests/unit/`および`tests/integration/`配下に配置されており、Vitestを使用しています。モック機構は`vi.mock()`を使用して外部依存を分離しています。

**本機能では、既存アーキテクチャとテスト構造を尊重し、テストコードのモック設定のみを修正します。**

### Technology Alignment

本機能は既存のテクノロジースタックに完全に準拠します：

- **テストフレームワーク**: Vitest（既存）
- **モック機構**: `vi.mock()`, `vi.spyOn()`（既存）
- **アサーションライブラリ**: Vitest組み込みのexpect API（既存）
- **ロガー**: PinoLogger（kirox-lightweight-logger仕様で導入済み）

新規の依存関係やライブラリは導入しません。

### Key Design Decisions

#### Decision 1: 実装コードを変更せずテストのみ修正

**Context**: 現在26個のテストが失敗していますが、実装コード（PinoLogger）は既に正しく動作しており、本番環境で稼働しています。テストのモック設定が古いLoggerクラスを参照しているため、実装の実際の動作と一致していない状態です。

**Alternatives**:
1. 実装コードをテストの期待値に合わせて変更（Loggerクラスを再導入）
2. テストのモック設定を実装コード（PinoLogger）の動作に合わせて変更
3. テストと実装の両方を見直し、仕様に基づいて修正

**Selected Approach**: テストのモック設定を実装コード（PinoLogger）の動作に合わせて変更します。

**Rationale**:
- kirox-lightweight-logger仕様で既にLogger→PinoLogger移行が承認・完了している
- 実装コード（PinoLogger）は既に本番環境で動作しており、変更リスクが高い
- テストの役割は実装の動作を検証することであり、実装を駆動することではない

**Trade-offs**:
- **Gain**: 実装コードの変更リスクがゼロ、本番環境への影響がない、ステアリング文書の原則に準拠
- **Sacrifice**: テストコードの修正工数が発生するが、一度の修正で完了する

#### Decision 2: PinoLogger.prototypeスパイパターンの採用

**Context**: PinoLoggerは構造化ログ（JSON形式）を出力するため、従来の`console.log`モックではログをキャプチャできません。テストでは、`logger.warn()`や`logger.info()`の呼び出しを直接検証する必要があります。

**Alternatives**:
1. `vi.mock('@/reporting/pino-logger.js')`でファイル全体をモックし、各テストで動的にインポート
2. `vi.spyOn(PinoLogger.prototype, 'methodName')`で各メソッドをスパイ
3. テストユーティリティ関数を作成してモック設定を共通化

**Selected Approach**: `vi.spyOn(PinoLogger.prototype, 'methodName')`パターンを使用します。

**Rationale**:
- kirox-bug-test仕様のTask 6.4で既に成功実績がある（add-duplicate-detection.test.ts）
- 各テストファイルで独立してスパイを設定でき、テスト分離の原則に準拠
- testing.mdステアリング文書の「Mocking Module Functions」パターンと一致

**Trade-offs**:
- **Gain**: テストの独立性が高く、beforeEach/afterEachで完全なクリーンアップが可能
- **Sacrifice**: 各テストファイルで同じスパイ設定が必要だが、一貫性のあるパターンで保守性を確保

## Requirements Traceability

| Requirement | Requirement Summary | Test Files | Modification Strategy |
|-------------|---------------------|------------|----------------------|
| 1.1-1.6 | add-command-entry.test.ts修正 | add-command-entry.test.ts | `@/reporting/logger.js`→`@/reporting/pino-logger.js`、動的インポート修正、スパイ設定 |
| 2.1-2.5 | add-interrupt-handling.test.ts修正 | add-interrupt-handling.test.ts | シグナルハンドラーモック修正、argv配列型チェック |
| 3.1-3.4 | entry-pino-logger.test.ts修正 | entry-pino-logger.test.ts | 実装の実際の呼び出しパターンに合わせたスパイ設定 |
| 4.1-4.4 | cli-to-github-to-fs.test.ts修正 | cli-to-github-to-fs.test.ts | メッセージ検証の正規表現修正 |
| 5.1-5.4 | add-track-option.test.ts修正 | add-track-option.test.ts | PinoLogger.prototype.info()スパイ設定、構造化ログ検証 |
| 6.1-6.4 | project-suggestion-github-api.test.ts修正 | project-suggestion-github-api.test.ts | beforeEachでスパイ設定追加 |
| 7.1-7.4 | テストスイート全体の安定性 | 全テストファイル | 全修正完了後、npm testで0失敗を確認 |
| 8.1-8.5 | モック設定の一貫性 | 全テストファイル | 統一されたPinoLoggerモックパターンの適用 |

## Components and Interfaces

### Test Modification Layer

#### add-command-entry.test.ts修正コンポーネント

**Responsibility & Boundaries**
- **Primary Responsibility**: `executeAddCommand`関数の動作を検証するテストケースの修正
- **Domain Boundary**: CLI層のadd subcommandエントリーポイント
- **Modification Scope**: テストのモック設定とアサーションのみ

**Dependencies**
- **Tested Component**: `@/cli/add-command-entry.js::executeAddCommand`
- **Old Mock Target**: `@/reporting/logger.js::Logger`（削除対象）
- **New Mock Target**: `@/reporting/pino-logger.js::PinoLogger`（新規）

**Contract Definition**

修正が必要な箇所（36個の失敗テスト）:

| Modification Type | Issue | Fix Strategy | Test Count |
|-------------------|-------|--------------|------------|
| モックインポート | `@/reporting/logger.js`をモック | `@/reporting/pino-logger.js`に変更 | 1箇所（ファイルトップレベル） |
| 動的インポート | `import('@/reporting/logger.js')` | `import('@/reporting/pino-logger.js')`に変更 | 複数テストケース |
| クラス名変更 | `Logger`参照 | `PinoLogger`に変更 | 複数テストケース |
| スパイ設定 | `vi.mocked(Logger)`使用 | `vi.mocked(PinoLogger)`に変更 | 複数テストケース |
| メソッド検証 | `mockLogger.info()`等の検証なし | `vi.spyOn(PinoLogger.prototype, 'info')`設定 | 複数テストケース |

**修正例**:
```typescript
// Before (OLD)
vi.mock('@/reporting/logger.js', () => ({
  Logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  })),
}));

// After (NEW)
vi.mock('@/reporting/pino-logger.js', () => ({
  PinoLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Before (動的インポート)
const { Logger } = await import('@/reporting/logger.js');

// After (動的インポート)
const { PinoLogger } = await import('@/reporting/pino-logger.js');
```

#### add-interrupt-handling.test.ts修正コンポーネント

**Responsibility & Boundaries**
- **Primary Responsibility**: Ctrl+C割り込みハンドリングの動作を検証するテストケースの修正
- **Domain Boundary**: シグナルハンドリング、プロセス中断処理
- **Modification Scope**: シグナルハンドラーモック設定と引数型検証

**Dependencies**
- **Tested Component**: `@/cli/add-command-entry.js::executeAddCommand`（シグナルハンドリング部分）
- **Mock Targets**: `process.on`, `process.removeListener`

**Contract Definition**

修正が必要な箇所（6個の失敗テスト + 3個のエラー）:

| Issue Type | Issue Description | Fix Strategy |
|------------|-------------------|--------------|
| argv型エラー | `argv.includes is not a function` | 引数が文字列配列であることを確認 |
| シグナルハンドラー未定義 | `sigintHandler is not a function` | beforeEachでprocess.onのモックを正しく設定 |
| スパイ呼び出し検証失敗 | `expected "spy" to be called` | 実装の実際のシグナルハンドラー登録パターンを確認 |

**修正戦略**:
```typescript
// シグナルハンドラーのモック設定
const signalHandlers = new Map<string, Function>();

beforeEach(() => {
  vi.spyOn(process, 'on').mockImplementation((event: string, handler: Function) => {
    signalHandlers.set(event, handler);
    return process;
  });
});

// テストケース内
const sigintHandler = signalHandlers.get('SIGINT');
expect(sigintHandler).toBeDefined();
sigintHandler!();
```

#### entry-pino-logger.test.ts修正コンポーネント

**Responsibility & Boundaries**
- **Primary Responsibility**: PinoLogger統合テストの修正
- **Domain Boundary**: entry.ts内でのPinoLogger使用検証
- **Modification Scope**: 実装の実際の呼び出しパターンに合わせたスパイ設定

**Dependencies**
- **Tested Component**: `src/entry.ts`
- **Mock Target**: `@/reporting/pino-logger.js::PinoLogger`

**Contract Definition**

修正が必要な箇所（1個の失敗テスト）:

| Issue | Fix Strategy |
|-------|--------------|
| `expect(infoSpy).toHaveBeenCalled()` 失敗 | entry.ts内の実際のログ呼び出しパターンを確認し、適切な検証に変更 |

#### cli-to-github-to-fs.test.ts修正コンポーネント

**Responsibility & Boundaries**
- **Primary Responsibility**: --steeringモード統合テストの修正
- **Domain Boundary**: CLI→GitHub→FileSystemの統合フロー
- **Modification Scope**: メッセージ検証の正規表現修正

**Dependencies**
- **Tested Component**: CLI統合フロー
- **Mock Targets**: GitHub API、FileSystem

**Contract Definition**

修正が必要な箇所（2個の失敗テスト）:

| Issue | Current Expectation | Fix Strategy |
|-------|---------------------|--------------|
| メッセージマッチング失敗 | `/No files found in \.kiro\/steering/` | 実装の実際の出力形式に合わせて正規表現を修正 |

#### add-track-option.test.ts修正コンポーネント

**Responsibility & Boundaries**
- **Primary Responsibility**: --trackオプションのテスト修正
- **Domain Boundary**: メタデータトラッキングの有効/無効切り替え
- **Modification Scope**: PinoLoggerスパイ設定と構造化ログ検証

**Dependencies**
- **Tested Component**: `@/cli/add-command-entry.js::executeAddCommand`（--track処理）
- **Mock Target**: `@/reporting/pino-logger.js::PinoLogger`

**Contract Definition**

修正が必要な箇所（1個の失敗テスト）:

| Issue | Fix Strategy |
|-------|--------------|
| "Metadata tracking is disabled" メッセージが見つからない | PinoLogger.prototype.info()のスパイを設定し、`expect.stringContaining()`で検証 |

**修正例**:
```typescript
beforeEach(() => {
  mockLoggerInfo = vi.fn();
  vi.spyOn(PinoLogger.prototype, 'info').mockImplementation(mockLoggerInfo);
});

it('should log info message indicating metadata tracking is disabled', async () => {
  await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'test']);

  expect(mockLoggerInfo).toHaveBeenCalledWith(
    expect.stringContaining('Metadata tracking is disabled'),
    expect.any(Object)
  );
});
```

#### project-suggestion-github-api.test.ts修正コンポーネント

**Responsibility & Boundaries**
- **Primary Responsibility**: プロジェクト提案機能のログ出力テスト修正
- **Domain Boundary**: GitHub API統合、プロジェクト提案
- **Modification Scope**: beforeEachでのPinoLoggerスパイ設定追加

**Dependencies**
- **Tested Component**: プロジェクト提案機能
- **Mock Target**: `@/reporting/pino-logger.js::PinoLogger`

**Contract Definition**

修正が必要な箇所（2個の失敗テスト）:

| Issue | Fix Strategy |
|-------|--------------|
| `expect(mockLogger.info).toHaveBeenCalled()` 失敗 | beforeEachでPinoLogger.prototype.info()のスパイを設定 |
| `expect(mockLogger.error).toHaveBeenCalled()` 失敗 | beforeEachでPinoLogger.prototype.error()のスパイを設定 |

## Error Handling

### Error Strategy

テスト修正における潜在的なエラーと対応戦略：

**テスト修正時のエラー**:
- **Issue**: 修正後もテストが失敗する
- **Recovery**: 実装コードの動作を再確認し、期待値を再調整。必要に応じてデバッガーを使用して実装の実際の呼び出しパターンを確認

**意図しない副作用**:
- **Issue**: テスト修正が他のテストに影響を与える
- **Recovery**: テスト分離を確認し、beforeEach/afterEachで完全なモックリセットを実施。共有状態がないことを検証

### Error Categories and Responses

**User Errors（テスト作成者のミス）**:
- モック設定の誤り → testing.mdのモックパターンを参照
- アサーションの不一致 → 実装の動作を詳細に検証

**System Errors（テスト実行環境の問題）**:
- Vitestのバージョン不一致 → package.jsonのバージョン確認
- モジュール解決の失敗 → tsconfig.jsonのpaths設定確認

## Testing Strategy

### Unit Tests

修正対象のテストファイル：

1. **`tests/unit/cli/add-command-entry.test.ts`**
   - 36個の失敗テストを修正
   - `@/reporting/logger.js`→`@/reporting/pino-logger.js`に変更
   - 動的インポートを全て修正
   - PinoLogger.prototypeスパイパターンを適用

2. **`tests/unit/cli/add-interrupt-handling.test.ts`**
   - 6個の失敗テスト + 3個のエラーを修正
   - シグナルハンドラーモックを正しく設定
   - argv配列型を確認

3. **`tests/unit/cli/add-track-option.test.ts`**
   - 1個の失敗テストを修正
   - PinoLogger.prototype.info()スパイを設定
   - 構造化ログ検証を実装

### Integration Tests

修正対象のテストファイル：

1. **`tests/integration/entry-pino-logger.test.ts`**
   - 1個の失敗テストを修正
   - entry.ts内の実際のログ呼び出しパターンに合わせる

2. **`tests/integration/cli-to-github-to-fs.test.ts`**
   - 2個の失敗テストを修正
   - メッセージ検証の正規表現を実装の出力形式に合わせる

3. **`tests/integration/project-suggestion-github-api.test.ts`**
   - 2個の失敗テストを修正
   - beforeEachでPinoLoggerスパイを設定

### Test Execution Validation

修正後の検証手順：

1. **個別テストファイル実行**:
   ```bash
   npm test tests/unit/cli/add-command-entry.test.ts
   npm test tests/unit/cli/add-interrupt-handling.test.ts
   npm test tests/unit/cli/add-track-option.test.ts
   npm test tests/integration/entry-pino-logger.test.ts
   npm test tests/integration/cli-to-github-to-fs.test.ts
   npm test tests/integration/project-suggestion-github-api.test.ts
   ```
   - 期待結果: 各ファイルで全テスト成功（0失敗）

2. **全テスト実行**: `npm test`
   - 期待結果: 26個の失敗テストが全て解消
   - 全テストスイート: 2214 passed

3. **特定カテゴリのテスト実行**:
   ```bash
   npm test tests/unit/cli/    # 単体テスト
   npm test tests/integration/ # 統合テスト
   ```

### Consistency Validation

一貫性のあるPinoLoggerモックパターンを確立：

**標準パターン（beforeEachでの設定）**:
```typescript
let mockLoggerWarn: ReturnType<typeof vi.fn>;
let mockLoggerInfo: ReturnType<typeof vi.fn>;
let mockLoggerError: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockLoggerWarn = vi.fn();
  mockLoggerInfo = vi.fn();
  mockLoggerError = vi.fn();
  vi.spyOn(PinoLogger.prototype, 'warn').mockImplementation(mockLoggerWarn);
  vi.spyOn(PinoLogger.prototype, 'info').mockImplementation(mockLoggerInfo);
  vi.spyOn(PinoLogger.prototype, 'error').mockImplementation(mockLoggerError);
});
```

**構造化ログ検証パターン**:
```typescript
expect(mockLoggerWarn).toHaveBeenCalledWith(
  expect.stringContaining('expected message'),
  expect.objectContaining({
    repository: 'owner/repo',
    projectName: 'test-project',
  })
);
```

このパターンをすべてのテストファイルで統一して適用します。
