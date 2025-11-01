# Implementation Plan

## Overview

PinoLoggerモック設定の修正により、92件の失敗テストを通過させる。グローバルモックファイルを導入し、テストファイル間でモックパターンを統一する。

## Tasks

- [ ] 1. グローバルモックセットアップファイルの作成
- [ ] 1.1 テストセットアップファイルを作成
  - tests/setup.tsファイルを新規作成
  - PinoLoggerのグローバルモック定義を実装
  - モック関数としてのコンストラクタ（vi.fn()でラップ）を定義
  - 全メソッド（info、warn、error、debug、verbose）をスパイ関数として設定
  - TypeScript型定義との整合性を確認
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.2, 5.2, 5.3_

- [ ] 2. Vitest設定ファイルの更新
- [ ] 2.1 グローバルセットアップファイルを読み込むよう設定
  - vitest.config.tsにsetupFiles設定を追加
  - tests/setup.tsを指定
  - 設定ファイルの構文エラーがないことを確認
  - _Requirements: 5.1, 5.2_

- [ ] 3. テストファイルの修正とクリーンアップ
- [ ] 3.1 add-command-entry.test.tsのモック定義を削除
  - vi.mock('pino')ブロックを削除
  - vi.mock('@/reporting/logger.js')ブロックを削除
  - グローバルモックが自動適用されることを確認
  - テストロジックは変更しない
  - _Requirements: 4.1, 5.1_

- [ ] 3.2 interactive-error-handler.test.tsのモック定義を修正
  - 誤ったvi.mock('@/reporting/pino-logger.js')ブロックを削除
  - Loggerという存在しないエクスポートのモックを削除
  - グローバルモックが自動適用されることを確認
  - beforeEachでのインスタンス生成パターンを維持
  - _Requirements: 4.2, 5.1_

- [ ] 3.3 interactive-tty-check.test.tsのモック定義を削除
  - vi.mock('@/reporting/logger.js')ブロックを削除
  - グローバルモックが自動適用されることを確認
  - スパイ関数アサーションが正常に動作することを確認
  - _Requirements: 2.2, 2.3, 4.3, 5.1_

- [ ] 3.4 interactive-prompt.test.tsのモック定義を修正（ファイルが存在する場合）
  - 既存のPinoLoggerモック定義を削除
  - グローバルモックが自動適用されることを確認
  - テストケースに影響がないことを検証
  - _Requirements: 4.4, 5.1_

- [ ] 4. テスト検証と統合確認
- [ ] 4.1 個別テストファイルの実行確認
  - add-command-entry.test.tsの全73テストが通過することを確認
  - interactive-error-handler.test.tsの全15テストが通過することを確認
  - interactive-tty-check.test.tsの全2テストが通過することを確認
  - interactive-prompt.test.tsの全2テストが通過することを確認（存在する場合）
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4.2 全テストスイートの実行確認
  - npm run testで全テストを実行
  - 0件の失敗、2214件以上の成功を確認
  - テストカバレッジが既存レベル（95%以上）を維持していることを確認
  - CI/CDパイプラインが正常に動作することを確認
  - _Requirements: 4.5_

- [ ] 4.3 vi.mocked()互換性の検証
  - vi.mocked(PinoLogger).mockReturnValue()パターンが動作することを確認
  - カスタムモックインスタンスが正しく返されることを検証
  - mockReturnValue is not a functionエラーが発生しないことを確認
  - _Requirements: 3.1, 3.2, 3.3_

## Requirements Coverage

全ての要件がタスクでカバーされています：

- **Requirement 1 (PinoLoggerモックのエクスポート定義修正)**: タスク1.1でグローバルモック定義を実装
- **Requirement 2 (モックインスタンスのメソッドスパイ設定)**: タスク1.1でスパイ関数を設定、タスク3.3で検証
- **Requirement 3 (vi.mocked()互換性の確保)**: タスク1.1でvi.fn()コンストラクタを定義、タスク4.3で検証
- **Requirement 4 (影響を受けるテストファイルの修正)**: タスク3.1-3.4で4つのテストファイルを修正、タスク4.1-4.2で検証
- **Requirement 5 (モックパターンの一貫性確保)**: タスク1.1でグローバルモック一元管理、タスク2.1で自動適用設定

## Implementation Notes

- 既存のテストロジックは変更しない（モック設定のみを修正）
- PinoLogger実装コード（src/reporting/pino-logger.ts）は変更しない
- 各タスク完了後、該当するテストファイルを個別実行して早期検証
- 全タスク完了後、CI/CDパイプライン全体を実行して最終確認
