# Requirements Document

## Introduction

`kirox-lightweight-logger`仕様でPinoLoggerを導入した際、テストコードのモック設定に不備が発生し、92件のテストが失敗している。本要件は、PinoLoggerのモック構造を正しく設定し、全テストを通過させることを目的とする。

**ビジネス価値**: テストスイートの信頼性を回復し、継続的インテグレーション（CI）を正常に機能させることで、開発速度と品質保証を維持する。

## Requirements

### Requirement 1: PinoLoggerモックのエクスポート定義修正

**Objective:** テストファイル作成者として、PinoLoggerクラスをモックから正しくインポートできるようにしたい。そうすることで、モックインスタンスを生成してテスト内で使用できるようになる。

#### Acceptance Criteria

1. WHEN テストファイルが`import { PinoLogger } from '@/reporting/pino-logger'`を実行する THEN モックは`PinoLogger`クラスをエクスポートしていること
2. WHEN `vi.mock('@/reporting/pino-logger')`が定義される THEN モックファクトリ関数は`PinoLogger`をreturnオブジェクトに含めること
3. WHEN テストが`new PinoLogger(false)`でインスタンス化を試みる THEN エラー"No 'PinoLogger' export is defined"が発生しないこと

### Requirement 2: モックインスタンスのメソッドスパイ設定

**Objective:** テストファイル作成者として、PinoLoggerモックインスタンスのメソッド（info、warn、errorなど）がスパイ関数として動作するようにしたい。そうすることで、`expect(mockLogger.error).toHaveBeenCalled()`などのアサーションが正常に機能する。

#### Acceptance Criteria

1. WHEN PinoLoggerモックインスタンスが生成される THEN 全てのメソッド（info、warn、error、debug）は`vi.fn()`でラップされていること
2. WHEN テストが`expect(mockLogger.error).toHaveBeenCalled()`を実行する THEN エラー"is not a spy or a call to a spy"が発生しないこと
3. WHEN テストが`expect(mockLogger.info).not.toHaveBeenCalled()`を実行する THEN 正しくアサーションが評価されること

### Requirement 3: vi.mocked()互換性の確保

**Objective:** テストファイル作成者として、`vi.mocked(PinoLogger)`を使用してモックの戻り値を設定できるようにしたい。そうすることで、テスト内で柔軟にモックの振る舞いをカスタマイズできる。

#### Acceptance Criteria

1. WHEN テストが`vi.mocked(PinoLogger).mockReturnValue(mockInstance)`を実行する THEN エラー"mockReturnValue is not a function"が発生しないこと
2. WHEN `vi.mocked(PinoLogger)`が呼び出される THEN 返されるモックはVitestモック関数として認識されること
3. WHEN モックがコンストラクタとして使用される THEN `mockReturnValue`で設定されたインスタンスが返されること

### Requirement 4: 影響を受けるテストファイルの修正

**Objective:** テストスイート管理者として、PinoLoggerモック設定問題で失敗している全テストファイルを修正したい。そうすることで、テストスイート全体が再び通過するようになる。

#### Acceptance Criteria

1. WHEN `npm run test`が実行される THEN `tests/unit/cli/add-command-entry.test.ts`の全73テストが通過すること
2. WHEN `npm run test`が実行される THEN `tests/unit/cli/interactive-error-handler.test.ts`の全15テストが通過すること
3. WHEN `npm run test`が実行される THEN `tests/unit/cli/interactive-tty-check.test.ts`の全2テストが通過すること
4. WHEN `npm run test`が実行される THEN `tests/unit/cli/interactive-prompt.test.ts`の全2テストが通過すること（存在する場合）
5. WHEN 全テストスイートが実行される THEN 0件の失敗、2214件以上の成功が報告されること

### Requirement 5: モックパターンの一貫性確保

**Objective:** 開発チームとして、PinoLoggerモックの設定パターンを統一したい。そうすることで、今後のテスト作成時に同様の問題が再発することを防ぐ。

#### Acceptance Criteria

1. WHEN 複数のテストファイルがPinoLoggerをモックする THEN 全てのファイルで同一のモック設定パターンが使用されていること
2. WHEN 新しいテストファイルがPinoLoggerをインポートする THEN 既存のモック定義が自動的に適用されること
3. WHERE グローバルモックファイル（`tests/setup.ts`など）が存在する場合 THE テストスイートはそのファイルでPinoLoggerモックを一元管理すること
