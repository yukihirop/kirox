# Implementation Plan

## Overview

失敗している37個の単体テストを修正し、CI/CDパイプラインの安定性を確保します。実装コードは正しいという前提のもと、テストコードの期待値とモック設定を実装の実際の動作に合わせて修正します。

## Tasks

- [ ] 1. add-command-entry.test.tsのメタデータ関連テストを修正
- [ ] 1.1 メタデータ存在確認テストに--trackフラグを追加
  - `should call loadMetadata with correct path`テストケースのargv配列に`'--track'`を追加
  - `should create empty metadata when metadata file does not exist`テストケースのargv配列に`'--track'`を追加
  - `should handle other metadata errors separately`テストケースのargv配列に`'--track'`を追加
  - テスト実行で3個のテストが成功することを確認
  - _Requirements: 1.1, 1.2, 5.1_

- [ ] 1.2 重複プロジェクト検出テストに--trackフラグを追加
  - `should detect duplicate project when repository and projectName match`テストケースのargv配列に`'--track'`を追加
  - `should skip duplicate project without --force option`テストケースのargv配列に`'--track'`を追加
  - 残り16個の重複検出関連テストケース全てのargv配列に`'--track'`を追加
  - テスト実行で18個のテストが成功することを確認
  - _Requirements: 2.1, 2.2, 2.5, 5.3_

- [ ] 1.3 対話モード・非対話モードのテストに--trackフラグを追加
  - 対話モードでのメタデータロードタイミング検証テストのargv配列に`'--track'`を追加
  - 非対話モードでの即座のメタデータロード検証テストのargv配列に`'--track'`を追加
  - テスト実行で2個のテストが成功することを確認
  - _Requirements: 1.3, 1.4, 5.1_

- [ ] 2. add-duplicate-detection.test.tsの重複検出テストを修正
- [ ] 2.1 Requirement 3.2の重複検出テストを修正
  - `should detect duplicate project with same repository, projectName, and subdir`テストケースのargv配列に`'--track'`を追加
  - `should treat projects with no subdir vs empty string subdir as duplicates`テストケースのargv配列に`'--track'`を追加
  - `should not detect duplicate for different project names`テストケースのargv配列に`'--track'`を追加（成功確認用）
  - テスト実行で重複検出ロジックが正しく動作することを確認
  - _Requirements: 2.1, 2.3, 5.3_

- [ ] 2.2 Requirement 3.3の--forceオプションテストを修正
  - `should display verbose log when overwriting with --force`テストケースのargv配列に`'--track'`を追加
  - `should skip duplicate without --force and display warning`テストケースのargv配列に`'--track'`を追加
  - `should allow overwriting duplicate project when --force is specified`テストケースのargv配列に`'--track'`を追加（成功確認用）
  - テスト実行で--forceフラグの動作が正しく検証されることを確認
  - _Requirements: 2.2, 2.4, 2.5, 5.4_

- [ ] 2.3 Requirement 3.4の複数重複検出テストを修正
  - `should handle multiple projects with some duplicates`テストケースのargv配列に`'--track'`を追加
  - `should skip all duplicate projects when multiple duplicates exist`テストケースのargv配列に`'--track'`を追加
  - テスト実行で複数プロジェクトの重複検出が正しく動作することを確認
  - _Requirements: 2.6, 2.7_

- [ ] 3. parser.test.tsのtrack フラグテストを修正
- [ ] 3.1 addサブコマンドのtrackフラグデフォルト値テストを修正
  - `should always set track to true for add subcommand`テストケースの期待値を`false`に変更
  - テスト名を`should default track to false for add subcommand (requires explicit --track)`に変更
  - テストの説明コメントを実装の動作に合わせて更新
  - テスト実行で1個のテストが成功することを確認
  - _Requirements: 3.1, 5.5_

- [ ] 4. 全テスト実行による最終検証
- [ ] 4.1 修正したテストファイルの個別検証
  - `npm test tests/unit/cli/add-command-entry.test.ts`を実行し全テスト成功を確認
  - `npm test tests/unit/cli/add-duplicate-detection.test.ts`を実行し全テスト成功を確認
  - `npm test tests/unit/cli/parser.test.ts`を実行し全テスト成功を確認
  - 3つのテストファイルで合計30個のテストが成功することを確認
  - _Requirements: 4.1, 4.3_

- [ ] 4.2 単体テスト全体の実行と検証
  - `npm test tests/unit/cli/`を実行し全単体テストが成功することを確認
  - 失敗テスト数が0であることを確認
  - テスト総数が1917テスト（または現在の合計）を維持していることを確認
  - CI/CDパイプラインで単体テストが安定して成功することを確認
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

## Implementation Notes

- 各タスクは独立して実行可能ですが、順次実行することを推奨します
- テスト修正後は必ず該当テストファイルを実行して成功を確認してください
- 統合テストの失敗（16個）は本タスクの対象外です（GitHub API、Tree API関連）
- 実装コードは一切変更しません（テストコードのみ修正）
