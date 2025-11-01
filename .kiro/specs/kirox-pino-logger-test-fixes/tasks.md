# Implementation Plan

## Overview

Logger→PinoLogger移行後に発生した26個のテスト失敗を修正します。実装コードは一切変更せず、テストコードのモック設定とアサーションを実装の動作に合わせて修正することで、CI/CDパイプラインの安定性を確保します。

## Tasks

- [ ] 1. add-command-entry.test.tsのPinoLoggerモック移行
- [ ] 1.1 ファイルトップレベルのモック定義を更新
  - 旧Loggerモックインポートを削除し、PinoLoggerモックインポートに置き換える
  - PinoLoggerモックで`info()`, `warn()`, `error()`, `debug()`メソッドを提供する
  - ErrorHandlerとProgressReporterのモックは既存のまま維持する
  - テスト実行でモックが正しくインポートされることを確認
  - _Requirements: 1.1, 1.2_

- [ ] 1.2 動的インポート文を全て更新
  - テストケース内の`import('@/reporting/logger.js')`を`import('@/reporting/pino-logger.js')`に変更
  - 全ての`Logger`変数名を`PinoLogger`に変更
  - 全ての`vi.mocked(Logger)`を`vi.mocked(PinoLogger)`に変更
  - 変更箇所が36個のテストケースに及ぶため、検索置換で一括実行
  - _Requirements: 1.3, 1.5_

- [ ] 1.3 ログメッセージ検証アサーションを更新
  - `mockLogger.info()`等の直接検証をPinoLogger.prototypeスパイに変更
  - beforeEachでスパイ変数（mockLoggerInfo, mockLoggerWarn, mockLoggerError）を宣言
  - vi.spyOnでPinoLogger.prototypeの各メソッドをモック
  - 構造化ログ検証パターン（expect.stringContaining + expect.objectContaining）を適用
  - テスト実行で全36個のテストケースが成功することを確認
  - _Requirements: 1.4, 1.6, 8.2, 8.3_

- [ ] 2. add-interrupt-handling.test.tsのシグナルハンドリング修正
- [ ] 2.1 シグナルハンドラーモックを正しく設定
  - テストファイルのトップレベルでsignalHandlers Mapを宣言
  - beforeEachでprocess.onのスパイを設定し、ハンドラーをMapに格納
  - process.removeListenerのスパイも設定
  - シグナルハンドラーがMapから正しく取得できることを確認
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 2.2 argv配列型エラーを修正
  - executeAddCommand呼び出し時の引数が文字列配列であることを確認
  - Object型やその他の型が渡されていないかチェック
  - 必要に応じて引数を文字列配列にキャスト
  - テスト実行で`argv.includes is not a function`エラーが解消されることを確認
  - _Requirements: 2.3_

- [ ] 2.3 シグナルハンドラートリガーテストを修正
  - signalHandlers.get('SIGINT')でハンドラーを取得
  - ハンドラーがundefinedでないことをexpect().toBeDefined()で確認
  - ハンドラーを関数として呼び出し（sigintHandler!()）
  - SIGTERM、SIGINT両方のシグナルハンドラーで同じパターンを適用
  - テスト実行で全9個のテスト（6失敗 + 3エラー）が成功することを確認
  - _Requirements: 2.5_

- [ ] 3. entry-pino-logger.test.tsの統合テスト修正
- [ ] 3.1 実装の実際のログ呼び出しパターンを調査
  - entry.ts内でPinoLoggerがどのように使用されているかコードを確認
  - 実際に呼び出されるメソッド（info, warn, error）とそのタイミングを特定
  - 呼び出し回数と引数パターンを記録
  - _Requirements: 3.1, 3.2_

- [ ] 3.2 PinoLoggerスパイ設定とアサーションを修正
  - beforeEachでPinoLogger.prototypeの必要なメソッドにスパイを設定
  - テストケースのアサーションを実際の呼び出しパターンに合わせて変更
  - expect(spy).toHaveBeenCalled()から具体的な呼び出し検証に変更
  - テスト実行で1個のテストが成功することを確認
  - _Requirements: 3.3, 3.4_

- [ ] 4. cli-to-github-to-fs.test.tsの--steeringモードメッセージ検証修正
- [ ] 4.1 実装の実際のメッセージ出力形式を調査
  - --steeringモードでステアリングディレクトリが空の場合の実装コードを確認
  - 実際に出力されるメッセージの形式とANSIエスケープコードを特定
  - サブディレクトリパスが含まれる場合のメッセージ形式も確認
  - _Requirements: 4.2_

- [ ] 4.2 メッセージ検証の正規表現を修正
  - 期待される正規表現を実装の出力形式に合わせて変更
  - ANSIエスケープコードを考慮した正規表現パターンを適用
  - サブディレクトリパス含有テストも同様に修正
  - テスト実行で2個のテストが成功することを確認
  - _Requirements: 4.1, 4.3, 4.4_

- [ ] 5. add-track-option.test.tsの--trackオプション検証修正
- [ ] 5.1 PinoLoggerスパイを設定してメッセージ検証を実装
  - テストファイルにPinoLoggerをインポート
  - beforeEachでmockLoggerInfo変数を宣言
  - vi.spyOn(PinoLogger.prototype, 'info')でスパイを設定
  - expect.stringContaining('Metadata tracking is disabled')で検証
  - expect.any(Object)で構造化ログの第2引数を検証
  - テスト実行で1個のテストが成功することを確認
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.2, 8.3_

- [ ] 6. project-suggestion-github-api.test.tsのログ出力テスト修正
- [ ] 6.1 beforeEachでPinoLoggerスパイを設定
  - テストファイルにPinoLoggerをインポート
  - beforeEachでmockLogger変数を宣言
  - mockLogger.infoとmockLogger.errorをvi.fn()で初期化
  - vi.spyOn(PinoLogger.prototype, 'info')とerror()でスパイを設定
  - _Requirements: 6.3_

- [ ] 6.2 verboseモードのログ出力検証を実装
  - API呼び出し詳細ログテストでmockLogger.info()が呼ばれることを検証
  - エラー詳細ログテストでmockLogger.error()が呼ばれることを検証
  - 構造化ログの検証パターン（expect.stringContaining等）を適用
  - テスト実行で2個のテストが成功することを確認
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 7. 全テストスイートの統合検証
- [ ] 7.1 個別テストファイルの検証
  - add-command-entry.test.tsを単独実行し全テストが成功することを確認
  - add-interrupt-handling.test.tsを単独実行し全テストが成功することを確認
  - entry-pino-logger.test.tsを単独実行し全テストが成功することを確認
  - cli-to-github-to-fs.test.tsを単独実行し全テストが成功することを確認
  - add-track-option.test.tsを単独実行し全テストが成功することを確認
  - project-suggestion-github-api.test.tsを単独実行し全テストが成功することを確認
  - _Requirements: 7.3_

- [ ] 7.2 全テストスイート実行による最終検証
  - npm testを実行し全2214テストが成功することを確認
  - 26個の失敗テストが全て解消されていることを確認
  - 失敗テスト数が0であることを確認
  - CI/CDパイプラインでテストが安定して成功することを確認
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 8. モック設定パターンの一貫性確保
- [ ] 8.1 全テストファイルでPinoLoggerモックパターンを統一
  - vi.mock('@/reporting/pino-logger.js')パターンを全ファイルで適用
  - vi.spyOn(PinoLogger.prototype, 'methodName')パターンを全ファイルで適用
  - beforeEachでのスパイ設定パターンを全ファイルで統一
  - 構造化ログ検証パターン（expect.stringContaining + expect.objectContaining）を全ファイルで統一
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## Implementation Notes

- 実装コード（PinoLogger、add-command-entry.ts等）は一切変更しない
- テストコードのモック設定とアサーションのみを修正する
- kirox-bug-test Task 6.4で確立されたPinoLogger.prototypeスパイパターンを踏襲する
- testing.mdステアリング文書の原則に準拠する
- 各タスク完了後、該当テストファイルを実行して成功を確認する
- 全タスク完了後、npm testで全テストスイートが成功することを確認する
