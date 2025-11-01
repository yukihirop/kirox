# Requirements Document

## Introduction

本機能は、kirox-lightweight-logger仕様でLogger→PinoLoggerへの移行が完了した後に発生した、5つのテストファイルにおける合計26個のテスト失敗を修正することを目的としています。PinoLoggerの構造化ログ（JSON形式）への移行に伴うモック設定の不整合が主な原因であり、テストコードのモック設定とアサーションを実装の動作に合わせて修正します。これにより、CI/CDパイプラインの安定性を確保し、開発者がテスト結果を信頼できる状態を実現します。

## Requirements

### Requirement 1: add-command-entry.test.ts のLogger→PinoLoggerモック修正
**Objective:** 開発者として、add-command-entry.test.ts内の全テストがPinoLoggerのモック設定で正しく動作してほしい。そうすることで、addコマンドのエントリーポイント機能を変更する際にもテストスイートを信頼できるようにする。

#### Acceptance Criteria

1. WHEN add-command-entry.test.tsのテストが実行される THEN テストスイートは`@/reporting/logger.js`ではなく`@/reporting/pino-logger.js`をモックする。
2. WHEN PinoLoggerのモックが構成される THEN `info()`, `warn()`, `error()`, `debug()`メソッドが正しくモックされる。
3. WHEN Loggerインスタンス化のテストが実行される THEN `PinoLogger`クラスのコンストラクタが呼び出されたことを検証する。
4. WHEN ログメッセージの検証を行う THEN モックされた`PinoLogger.prototype.info()`/`warn()`/`error()`のスパイを使用してアサーションを行う。
5. WHEN 動的インポート`import('@/reporting/logger.js')`を使用しているテストケース THEN `import('@/reporting/pino-logger.js')`に変更し、`Logger`を`PinoLogger`に置き換える。
6. WHEN 全テストが修正される THEN add-command-entry.test.tsの全テストケースが成功する。

### Requirement 2: add-interrupt-handling.test.ts のシグナルハンドリングテスト修正
**Objective:** 開発者として、Ctrl+C割り込みハンドリングのテストが正しく動作してほしい。これにより、SIGINT/SIGTERMシグナルハンドリング機能が適切に検証されることを保証する。

#### Acceptance Criteria

1. WHEN シグナルハンドラー登録のテストが実行される THEN `process.on('SIGINT', handler)`および`process.on('SIGTERM', handler)`の呼び出しが正しく検証される。
2. WHEN シグナルハンドラーをトリガーするテスト THEN モックされたシグナルハンドラーが`Map`または適切なデータ構造に格納され、取得可能である。
3. WHEN `argv.includes is not a function`エラーが発生する THEN executeAddCommand関数に渡す引数が文字列配列であることを確認する。
4. WHEN シグナルハンドラーがundefinedまたは関数でない THEN テストのセットアップでシグナルハンドラーが正しくモックされていることを確認する。
5. WHEN 全テストが修正される THEN add-interrupt-handling.test.tsの全テストケースが成功する。

### Requirement 3: entry-pino-logger.test.ts の統合テスト修正
**Objective:** 開発者として、PinoLogger統合テストが実装の動作を正しく検証してほしい。これにより、PinoLoggerがentry.ts内で適切に使用されていることを保証する。

#### Acceptance Criteria

1. WHEN PinoLoggerのメソッド呼び出しを検証するテスト THEN 実装コードが実際に呼び出すメソッド（`info()`, `warn()`, `error()`）のスパイを設定する。
2. WHEN ロガーメソッドの呼び出しを検証する THEN `expect(spy).toHaveBeenCalled()`ではなく、実装の実際の呼び出しパターンに合わせた検証を行う。
3. WHEN 統合テストが実行される THEN entry.ts内でPinoLoggerが正しくインスタンス化され、メソッドが呼び出されることを確認する。
4. WHEN 全テストが修正される THEN entry-pino-logger.test.tsの全テストケースが成功する。

### Requirement 4: cli-to-github-to-fs.test.ts の--steeringモードテスト修正
**Objective:** 開発者として、--steeringモードに関するテストが正しく動作してほしい。これにより、ステアリングディレクトリが空の場合の動作が適切に検証されることを保証する。

#### Acceptance Criteria

1. WHEN ステアリングディレクトリが空の場合のテスト THEN 期待されるメッセージ（"No files found in .kiro/steering"）が表示されることを検証する。
2. WHEN メッセージ検証の正規表現マッチングが失敗する THEN 実装が出力する実際のメッセージ形式に合わせて正規表現または検証方法を修正する。
3. WHEN --steeringモードでサブディレクトリパスが含まれる THEN メッセージにサブディレクトリパスが正しく含まれることを検証する。
4. WHEN 全テストが修正される THEN cli-to-github-to-fs.test.tsの--steeringモード関連テストが成功する。

### Requirement 5: add-track-option.test.ts の--trackオプションテスト修正
**Objective:** 開発者として、--trackオプションに関するテストが正しく動作してほしい。これにより、メタデータトラッキングの有効/無効切り替えが適切に検証されることを保証する。

#### Acceptance Criteria

1. WHEN --trackオプションが指定されない場合のテスト THEN "Metadata tracking is disabled"メッセージが表示されることを検証する。
2. WHEN ログメッセージの検証が失敗する THEN PinoLoggerの構造化ログ出力形式（JSON）に合わせた検証方法を使用する。
3. WHEN PinoLogger.prototype.info()のスパイを使用する THEN `expect.stringContaining('Metadata tracking is disabled')`でメッセージを検証する。
4. WHEN 全テストが修正される THEN add-track-option.test.tsの全テストケースが成功する。

### Requirement 6: project-suggestion-github-api.test.ts のログ出力テスト修正
**Objective:** 開発者として、プロジェクト提案機能のログ出力テストが正しく動作してほしい。これにより、verboseモードでのAPI呼び出し詳細とエラー詳細のログ出力が適切に検証されることを保証する。

#### Acceptance Criteria

1. WHEN verboseモードでAPI呼び出し詳細をログ出力するテスト THEN PinoLogger.prototype.info()のスパイが呼び出されたことを検証する。
2. WHEN verboseモードでエラー詳細をログ出力するテスト THEN PinoLogger.prototype.error()のスパイが呼び出されたことを検証する。
3. WHEN ロガーのモック設定が不足している THEN テストのbeforeEachでPinoLogger.prototype.info()とerror()のスパイを設定する。
4. WHEN 全テストが修正される THEN project-suggestion-github-api.test.tsのログ出力関連テストが成功する。

### Requirement 7: テストスイート全体の安定性
**Objective:** 開発チームとして、全てのテストが一貫して合格してほしい。これにより、CIパイプラインへの信頼を維持し、実際のリグレッションを確実に検知できるようにする。

#### Acceptance Criteria

1. WHEN npm testコマンドを実行する THEN 全てのテストファイルが失敗なく通過する。
2. WHEN テストスイートを実行する THEN 失敗テスト数が0であることを報告する。
3. WHEN 対象の5つのテストファイル THEN 合計26個の失敗テストがすべて解消される。
4. WHEN 将来実装コードが変更される THEN 意図的に挙動を変更しない限り既存のテストは引き続き合格する。

### Requirement 8: モック設定の一貫性
**Objective:** テスト作成者として、PinoLoggerのモック設定がプロジェクト全体で一貫してほしい。これにより、テストの保守性と可読性を向上させる。

#### Acceptance Criteria

1. WHEN PinoLoggerをモックする THEN `vi.mock('@/reporting/pino-logger.js')`をファイルトップレベルで使用する。
2. WHEN PinoLoggerのメソッドスパイを設定する THEN `vi.spyOn(PinoLogger.prototype, 'methodName')`パターンを使用する。
3. WHEN 構造化ログの検証を行う THEN `expect.stringContaining()`と`expect.objectContaining()`を組み合わせて使用する。
4. WHERE 複数のテストファイルでPinoLoggerをモックする THEN 同じモックパターンを適用して一貫性を保つ。
5. WHEN モック設定のベストプラクティスを確立する THEN testing.mdステアリング文書の原則に準拠する。
