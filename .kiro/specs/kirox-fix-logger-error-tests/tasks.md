# Implementation Plan

## Overview

PinoLoggerグローバルモック定義に欠落している3メソッド（logError、formatTimestamp、formatLogMessage）を追加し、140件の失敗テストを通過させる。既存の5メソッドモック実装と同じvi.fn()パターンを使用し、実装クラスとの完全な対応を確立する。

## Tasks

- [ ] 1. グローバルモック定義の拡張
- [ ] 1.1 tests/setup.tsに3つの欠落メソッドを追加
  - logErrorメソッドをvi.fn()でスパイ関数として実装
  - formatTimestampメソッドをvi.fn()でスパイ関数として実装
  - formatLogMessageメソッドをvi.fn()でスパイ関数として実装
  - 既存の5メソッド（info、warn、error、debug、verbose)実装パターンを踏襲
  - TypeScript構文エラーがないことを確認
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [ ] 2. テスト検証と最終確認
- [ ] 2.1 全テストスイートの実行確認
  - npm run testで全テストを実行
  - 0件の失敗を確認（2214件以上の通過を期待）
  - PinoLogger関連テストが全て通過することを確認
  - テストカバレッジ95%以上を維持していることを確認
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3_

## Requirements Coverage

全ての要件がタスクでカバーされています：

- **Requirement 1 (logErrorメソッドのモック追加)**: タスク1.1でlogError: vi.fn()を追加
- **Requirement 2 (formatTimestampメソッドのモック追加)**: タスク1.1でformatTimestamp: vi.fn()を追加
- **Requirement 3 (formatLogMessageメソッドのモック追加)**: タスク1.1でformatLogMessage: vi.fn()を追加
- **Requirement 4 (全テストスイートの通過)**: タスク2.1で全テスト実行と検証
- **Requirement 5 (モックの完全性保証)**: タスク1.1で実装クラスの8メソッド全てをモック定義に含める

## Implementation Notes

- 既存のtests/setup.tsファイルを編集（新規ファイル作成は不要）
- PinoLogger実装コード（src/reporting/pino-logger.ts）は変更しない
- テストファイルは変更不要（グローバルモックが自動適用される）
- 各タスク完了後、即座にテスト実行して早期検証
- 変更は極めて小規模（3行追加のみ）、リスクは最小限
