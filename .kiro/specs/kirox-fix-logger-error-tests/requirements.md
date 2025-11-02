# Requirements Document

## Introduction

`kirox-fix-pino-logger-mocks`仕様でPinoLoggerのグローバルモックを作成したが、モックに3つのメソッド（`logError`、`formatTimestamp`、`formatLogMessage`）が欠落しているため、140件のテストが`logger.error is not a function`や`logger.logError is not a function`エラーで失敗している。本要件は、PinoLoggerモックを完全な実装とし、全テストを通過させることを目的とする。

**ビジネス価値**: テストスイートの完全な修復により、継続的インテグレーション（CI）を正常化し、開発速度と品質保証を維持する。

## Requirements

### Requirement 1: logErrorメソッドのモック追加

**Objective:** テストファイル作成者として、PinoLoggerモックインスタンスに`logError`メソッドが含まれるようにしたい。そうすることで、`logger.logError(errorResult)`を使用するコードが正常に動作する。

#### Acceptance Criteria

1. WHEN PinoLoggerモックインスタンスが生成される THEN `logError`メソッドがvi.fn()でスパイ関数として存在すること
2. WHEN 実装コードが`logger.logError(errorResult)`を呼び出す THEN エラー"logError is not a function"が発生しないこと
3. WHEN テストが`expect(logger.logError).toHaveBeenCalled()`を実行する THEN 正しくアサーションが評価されること

### Requirement 2: formatTimestampメソッドのモック追加

**Objective:** テストファイル作成者として、PinoLoggerモックインスタンスに`formatTimestamp`メソッドが含まれるようにしたい。そうすることで、後方互換性メソッドを使用するコードが正常に動作する。

#### Acceptance Criteria

1. WHEN PinoLoggerモックインスタンスが生成される THEN `formatTimestamp`メソッドがvi.fn()でスパイ関数として存在すること
2. WHEN 実装コードが`logger.formatTimestamp()`を呼び出す THEN エラー"formatTimestamp is not a function"が発生しないこと
3. IF テストが`formatTimestamp`の戻り値を検証する THEN vi.fn()のmockReturnValueで戻り値を設定可能であること

### Requirement 3: formatLogMessageメソッドのモック追加

**Objective:** テストファイル作成者として、PinoLoggerモックインスタンスに`formatLogMessage`メソッドが含まれるようにしたい。そうすることで、後方互換性メソッドを使用するコードが正常に動作する。

#### Acceptance Criteria

1. WHEN PinoLoggerモックインスタンスが生成される THEN `formatLogMessage`メソッドがvi.fn()でスパイ関数として存在すること
2. WHEN 実装コードが`logger.formatLogMessage(level, message, details)`を呼び出す THEN エラー"formatLogMessage is not a function"が発生しないこと
3. IF テストが`formatLogMessage`の戻り値を検証する THEN vi.fn()のmockReturnValueで戻り値を設定可能であること

### Requirement 4: 全テストスイートの通過

**Objective:** テストスイート管理者として、PinoLoggerモック修正後に全テストが通過するようにしたい。そうすることで、CI/CDパイプラインが正常に機能する。

#### Acceptance Criteria

1. WHEN `npm run test`が実行される THEN 0件の失敗が報告されること
2. WHEN 全テストスイートが実行される THEN 2214件以上のテストが通過すること
3. WHEN CI/CDパイプラインが実行される THEN 全ステージ（lint、type-check、test、build）が通過すること
4. WHEN テストカバレッジが計測される THEN 既存レベル（95%以上）を維持していること

### Requirement 5: モックの完全性保証

**Objective:** 開発チームとして、PinoLoggerモックが実装クラスの全メソッドを網羅するようにしたい。そうすることで、将来的にメソッドが追加された際の保守性を向上させる。

#### Acceptance Criteria

1. WHEN PinoLoggerモックが定義される THEN 実装クラス（src/reporting/pino-logger.ts）の全publicメソッドがモックに含まれること
2. WHERE グローバルモックファイル（tests/setup.ts）THE モックは以下の8メソッドを全て含むこと: info、warn、error、debug、verbose、logError、formatTimestamp、formatLogMessage
3. WHEN 新しいメソッドがPinoLoggerに追加される THEN モック定義の更新が必要であることが明確に文書化されること
