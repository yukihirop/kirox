# Requirements Document

## Introduction

`npm test`の実行時に26件のテストが失敗している状況に対応する。実装コード（`src/`配下）は正しく動作していることを前提とし、テストコード（`tests/`配下）の検証ロジック、モック設定、期待値設定を修正することで、全テストが成功するようにする。

この修正により、CI/CDパイプラインが正常に動作し、開発者が安心してコードをコミットできる環境を提供する。

## Requirements

### Requirement 1: Logger検証ロジックの修正
**Objective:** テスト実行者として、Pino Loggerへの移行後も正しくログ出力が検証できるようにしたい。そうすることで、ロギング機能が正常に動作していることを保証できる。

#### Acceptance Criteria

1. WHEN テストがlogger.info()の呼び出しを検証する時、THEN Kirox CLIのテストフレームワークはPinoLoggerインスタンスのメソッド呼び出しを正しく検出しなければならない
2. WHEN テストがlogger.warn()の呼び出しを検証する時、THEN Kirox CLIのテストフレームワークはPinoLoggerインスタンスのメソッド呼び出しを正しく検出しなければならない
3. WHEN テストがlogger.error()の呼び出しを検証する時、THEN Kirox CLIのテストフレームワークはPinoLoggerインスタンスのメソッド呼び出しを正しく検出しなければならない
4. WHEN executeAddCommandがverbose=trueで実行される時、THEN テストはLogger初期化とinfo()呼び出しを検証しなければならない
5. WHERE tests/integration/entry-pino-logger.test.tsにおいて、THEN テストはentry.tsがloggerメソッドを呼び出すことを検証しなければならない
6. WHERE tests/integration/project-suggestion-github-api.test.tsのverboseモードテストにおいて、THEN テストはAPI呼び出し詳細とエラー詳細がログ出力されることを検証しなければならない
7. WHERE tests/unit/cli/add-command-entry.test.tsの複数テストケースにおいて、THEN テストはメタデータ作成、重複検出、ディレクトリ取得、成功サマリーの各段階でログ出力を検証しなければならない

### Requirement 2: --steering空ディレクトリメッセージの検証修正
**Objective:** テスト実行者として、steering空ディレクトリ時の情報メッセージが正しく出力されることを検証したい。そうすることで、ユーザーがファイルが見つからない理由を理解できることを保証できる。

#### Acceptance Criteria

1. WHEN --steeringモードでsteeringディレクトリが空の時、THEN Kirox CLIは"No files found in .kiro/steering"パターンにマッチする情報メッセージを出力しなければならない
2. WHEN --steeringモードでサブディレクトリ内のsteeringディレクトリが空の時、THEN Kirox CLIはサブディレクトリパスを含む"No files found in .kiro/steering"パターンのメッセージを出力しなければならない
3. WHERE tests/integration/cli-to-github-to-fs.test.ts:1213において、THEN テストは空ディレクトリ情報メッセージの正規表現マッチを検証しなければならない
4. WHERE tests/integration/cli-to-github-to-fs.test.ts:1275において、THEN テストはサブディレクトリパス付き空ディレクトリメッセージの正規表現マッチを検証しなければならない

### Requirement 3: 未実装オプションのテスト削除または修正
**Objective:** テスト実行者として、実装されていない機能のテストを実行しないようにしたい。そうすることで、テストスイートが現在の実装状態を正確に反映することを保証できる。

#### Acceptance Criteria

1. WHEN --check-updatesオプションのテストが実行される時、THEN Kirox CLIのテストフレームワークはテストをスキップまたは削除しなければならない
2. WHEN --updateオプションのテストが実行される時、THEN Kirox CLIのテストフレームワークはテストをスキップまたは削除しなければならない
3. WHERE tests/unit/cli/add-command-entry.test.ts:2755において、THEN テストは"error: unknown option '--check-updates'"エラーを発生させてはならない
4. WHERE tests/unit/cli/add-command-entry.test.ts:2792において、THEN テストは"error: unknown option '--update'"エラーを発生させてはならない
5. IF 将来これらのオプションが実装される場合、THEN テストは再度有効化されるべきである

### Requirement 4: シグナルハンドリングテストの修正
**Objective:** テスト実行者として、Ctrl+C割り込み処理が正しく動作することを検証したい。そうすることで、ユーザーが安全にコマンドを中断できることを保証できる。

#### Acceptance Criteria

1. WHEN add commandが開始される時、THEN Kirox CLIはSIGINTシグナルハンドラーを登録しなければならない
2. WHEN add commandが開始される時、THEN Kirox CLIはSIGTERMシグナルハンドラーを登録しなければならない
3. WHEN SIGINTが受信される時、THEN Kirox CLIは"Operation was interrupted."メッセージを表示しなければならない
4. WHEN 完了前にSIGINTが受信される時、THEN Kirox CLIはメタデータを保存してはならない
5. WHEN 既存メタデータがある状態でSIGINTが受信される時、THEN Kirox CLIは既存メタデータを保持しなければならない
6. WHEN SIGINTが受信される時、THEN Kirox CLIは適切な終了コードで終了しなければならない
7. WHEN commandが完了した時、THEN Kirox CLIはシグナルハンドラーをクリーンアップしなければならない
8. WHERE tests/unit/cli/add-interrupt-handling.test.tsの全テストケースにおいて、THEN テストは"TypeError: argv.includes is not a function"エラーを発生させてはならない

### Requirement 5: argvパラメータ型の修正
**Objective:** テスト実行者として、executeAddCommandに渡すargvパラメータが正しい型であることを保証したい。そうすることで、parser.ts内でargv.includes()が正常に動作することを確認できる。

#### Acceptance Criteria

1. WHEN executeAddCommandがテストから呼び出される時、THEN argv引数は配列型でなければならない
2. WHERE src/cli/parser.ts:39において、THEN argv.includes()とargv.indexOf()が正常に動作しなければならない
3. WHERE tests/unit/cli/add-interrupt-handling.test.tsの全テストケースにおいて、THEN "TypeError: argv.includes is not a function"エラーが発生してはならない
4. WHEN parseArguments関数がargvを受け取る時、THEN argvパラメータはstring[]型として扱われなければならない

### Requirement 6: --trackオプションデフォルト値の検証修正
**Objective:** テスト実行者として、--trackオプションのデフォルト値がfalseであることを検証したい。そうすることで、`kirox-track-default-false` specの要件が満たされていることを確認できる。

#### Acceptance Criteria

1. WHEN --trackオプションが指定されない時、THEN Kirox CLIは"Metadata tracking is disabled"メッセージを出力しなければならない
2. WHERE tests/unit/cli/add-track-option.test.ts:132において、THEN テストはメタデータトラッキング無効メッセージの存在を検証しなければならない
3. WHEN addコマンドが--trackなしで実行される時、THEN コンソール出力に"Metadata tracking is disabled"が含まれなければならない

## Test Modification Scope

本要件の対象となるテストファイル:
- `tests/integration/cli-to-github-to-fs.test.ts` (2件)
- `tests/integration/entry-pino-logger.test.ts` (1件)
- `tests/integration/project-suggestion-github-api.test.ts` (2件)
- `tests/unit/cli/add-command-entry.test.ts` (15件)
- `tests/unit/cli/add-interrupt-handling.test.ts` (7件)
- `tests/unit/cli/add-track-option.test.ts` (1件)

合計: 26件のテスト修正
