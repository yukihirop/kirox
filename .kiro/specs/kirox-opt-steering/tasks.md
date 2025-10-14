# Implementation Plan

## 実装計画

- [ ] 1. 型定義とCLI引数パーサーの更新
- [x] 1.1 型定義に`steering`フラグを追加
  - `ParsedArguments`インターフェースに`steering: boolean`フィールドを追加
  - 型の一貫性を確保し、既存の型定義と整合性を保つ
  - _Requirements: 1.1_

- [x] 1.2 CLI引数パーサーに`--steering`オプションを追加
  - Commander.jsを使用して`--steering`オプションを定義（デフォルト値: false）
  - ヘルプメッセージに説明文「Fetch only .kiro/steering directory (skip project specs)」を追加
  - 使用例をヘルプメッセージに追加（インタラクティブモード、非インタラクティブモード、サブディレクトリ指定）
  - _Requirements: 1.1, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. バリデーションロジックの更新
- [x] 2.1 プロジェクト引数の必須性制御を実装
  - `validateInput`関数内で`requiresRepositoryAndProject`条件式を更新
  - `--steering`モード時に`<project>`引数が省略されてもバリデーションエラーを発生させない
  - 通常モード時の既存バリデーションロジックを完全に維持
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.2 相互排他的オプションのバリデーションを追加
  - `--steering`、`--check-updates`、`--update`の相互排他性チェックを実装
  - 複数のオプションが同時に指定された場合、明確なエラーメッセージを表示
  - _Requirements: 6.4_

- [x] 3. インタラクティブモードの更新
- [x] 3.1 Tree APIスキャンのスキップロジックを実装
  - `promptMissingArguments`関数内の`shouldAttemptTreeAPI`条件式に`!completedArgs.steering`を追加
  - `--steering`モード時にTree APIによるプロジェクトスキャンをスキップ
  - _Requirements: 3.3_

- [x] 3.2 プロジェクトプロンプトのスキップロジックを実装
  - `--steering`モード時にプロジェクト選択プロンプトをスキップ
  - 通常モード時の既存プロンプトフローを完全に維持
  - _Requirements: 3.4, 3.5_

- [x] 3.3 サブディレクトリプロンプトの表示制御を実装
  - `--steering`モード時、サブディレクトリが未指定の場合にプロンプトを表示
  - サブディレクトリが既に指定されている場合はプロンプトをスキップ
  - 空文字列入力時はルートディレクトリを取得対象とする
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.4 確認プロンプトの表示内容を更新
  - `confirmExecution`関数内で`--steering`モード時の表示を変更
  - プロジェクトフィールドの代わりに「Mode: Steering only」を表示
  - 通常モード時の既存表示を完全に維持
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. ファイル取得ロジックの更新
- [x] 4.1 プロジェクトループの制御ロジックを実装
  - `--steering`モード時、プロジェクトループを1回のみ実行（`projects = ['']`）
  - 通常モード時の既存プロジェクトループロジックを維持
  - _Requirements: 1.2, 2.2_

- [x] 4.2 ディレクトリ取得の条件分岐を実装
  - `--steering`モード時、`.kiro/specs/<project>`ディレクトリの取得をスキップ
  - `--steering`モード時、`.kiro/steering`ディレクトリのみを取得
  - 通常モード時の既存動作（specs + steering両方を取得）を維持
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 4.3 ステアリングディレクトリ不在時のエラーハンドリングを実装
  - `--steering`モード時、`.kiro/steering`ディレクトリが存在しない場合は明確なエラーメッセージを表示
  - エラーメッセージにリポジトリパスとサブディレクトリパスを含める
  - 通常モード時は警告のみで処理を継続（既存動作維持）
  - _Requirements: 7.1, 7.2_

- [x] 4.4 空ディレクトリ処理を実装
  - `.kiro/steering`ディレクトリが空の場合、情報メッセージを表示
  - exit code 0で正常終了（ビジネスロジック上は正常）
  - _Requirements: 7.5_

- [x] 5. 既存機能との統合テスト
- [x] 5.1 既存オプションとの互換性を検証
  - `--steering` + `--force`の組み合わせが正常に動作することを確認
  - `--steering` + `--dry-run`の組み合わせが正常に動作することを確認
  - `--steering` + `--verbose`の組み合わせが正常に動作することを確認
  - `--steering` + `--config`の組み合わせが正常に動作することを確認
  - _Requirements: 6.1, 6.2_

- [x] 5.2 メタデータトラッキング機能との統合を検証
  - `--steering` + `--track`オプション時、ステアリングファイルの追跡情報がメタデータに記録されることを確認
  - _Requirements: 6.3_

- [x] 5.3 後方互換性を検証
  - `--steering`オプションを指定しない場合、既存の全ての動作が維持されることを確認
  - 既存のテストスイート（1189 tests）が全て合格することを確認
  - _Requirements: 1.4, 3.5, 6.5, NFR-2_

- [x] 6. 単体テストの作成
- [x] 6.1 パーサーのテストを作成
  - `--steering`オプションが正しく解析されることをテスト
  - デフォルト値が`false`であることをテスト
  - ヘルプメッセージに`--steering`オプションが含まれることをテスト
  - _Requirements: 1.1, 8.1, 8.2_

- [x] 6.2 バリデーターのテストを作成
  - `--steering`モード時、`<project>`引数が省略されてもエラーが発生しないことをテスト
  - `--steering` + `--check-updates`の同時指定でバリデーションエラーが発生することをテスト
  - `--steering` + `--update`の同時指定でバリデーションエラーが発生することをテスト
  - 通常モード時の既存バリデーションロジックが維持されることをテスト
  - _Requirements: 2.1, 2.2, 2.3, 6.4_

- [x] 6.3 インタラクティブプロンプトのテストを作成
  - `--steering`モード時、Tree APIスキャンがスキップされることをテスト
  - `--steering`モード時、プロジェクトプロンプトがスキップされることをテスト
  - `--steering`モード時、サブディレクトリプロンプトが表示されることをテスト
  - `--steering`モード時、確認プロンプトに「Mode: Steering only」が表示されることをテスト
  - _Requirements: 3.3, 3.4, 4.1, 5.2_

- [ ] 7. 統合テストの作成
- [ ] 7.1 CLI→GitHub API統合テストを作成
  - `--steering`モード時、`.kiro/steering`ディレクトリのみがGitHub APIから取得されることをテスト
  - `--steering`モード時、`.kiro/specs/<project>`ディレクトリがGitHub APIから取得されないことをテスト
  - `--steering` + `--subdir`オプション時、正しいサブディレクトリ配下の`.kiro/steering`が取得されることをテスト
  - _Requirements: 1.2, 1.3, 4.3_

- [ ] 7.2 GitHub API→ファイルシステム統合テストを作成
  - `--steering`モード時、取得したステアリングファイルが正しくローカルファイルシステムに書き込まれることをテスト
  - `--steering` + `--track`オプション時、メタデータにステアリングファイルの追跡情報が記録されることをテスト
  - _Requirements: 6.2, 6.3_

- [ ] 8. E2Eテストの作成
- [ ] 8.1 インタラクティブモードE2Eテストを作成
  - インタラクティブモード + `--steering`でプロジェクトプロンプトがスキップされ、サブディレクトリプロンプトが表示されることをテスト
  - 確認プロンプトで承認後、`.kiro/steering`ディレクトリのファイル取得処理が開始されることをテスト
  - 確認プロンプトでキャンセル時、exit code 0で終了することをテスト
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 5.4, 5.5_

- [ ] 8.2 非インタラクティブモードE2Eテストを作成
  - 非インタラクティブモード + `--steering`で`<project>`引数なしで実行でき、`.kiro/steering`のみが取得されることをテスト
  - `--steering` + `--force`で既存ファイルの上書き確認がスキップされることをテスト
  - `--steering` + `--dry-run`でファイルが実際に書き込まれないことをテスト
  - `--steering` + `--verbose`で詳細ログが出力されることをテスト
  - _Requirements: 2.1, 2.2, 2.4, 6.1_

- [ ] 8.3 エラーシナリオE2Eテストを作成
  - `--steering` + `--check-updates`でバリデーションエラーが発生し、exit code 1で終了することをテスト
  - `--steering` + 不在のステアリングディレクトリでエラーメッセージが表示され、exit code 1で終了することをテスト
  - `--steering` + 空のステアリングディレクトリで情報メッセージが表示され、exit code 0で終了することをテスト
  - _Requirements: 6.4, 7.1, 7.2, 7.5_

- [ ] 8.4 既存機能との統合E2Eテストを作成
  - GitHub APIエラー時に既存のエラーハンドリングが実行されることをテスト（レート制限、ネットワークエラー）
  - 通常モード時の既存のプロンプトフローが完全に維持されることをテスト
  - 既存のテストスイート（1189 tests）が全て合格することを最終確認
  - _Requirements: 7.3, 7.4, NFR-2_

- [ ] 9. ステアリングモードのUI改善（拡張機能）
- [x] 9.1 TreeBasedDirectoryScannerコンポーネントの実装
  - `src/github/tree-based-dir-scanner.ts`を作成
  - GitHub Tree APIを使用してリポジトリ内のディレクトリ構造を取得する`scanDirectoriesAcrossRepo`メソッドを実装
  - ディレクトリのみをフィルタリング（`type === 'tree'`）
  - レート制限エラー、ネットワークエラーを適切にハンドリング
  - Truncated警告メッセージを表示（Tree APIが切り捨てられた場合）
  - _Requirements: 9.1, 9.7_

- [x] 9.2 SubdirectoryPromptServiceコンポーネントの実装
  - `src/cli/searchable-subdir-prompt.ts`を作成
  - 検索可能なチェックボックスUI（inquirer-ts-checkbox-plus-prompt）を使用してディレクトリ一覧を表示する`promptSubdirSelection`メソッドを実装
  - ルートディレクトリ選択オプション（"(root)" → 空文字列）を選択肢に含める
  - リアルタイム検索フィルタリング機能を実装
  - 既存の`searchable-project-prompt.ts`パターンを参考にUXを統一
  - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 9.3 インタラクティブプロンプトの統合
  - `src/cli/interactive-prompt.ts`の`promptMissingArguments`関数を更新
  - `--steering`モード時、サブディレクトリが未指定の場合に以下のロジックを実装:
    1. TreeBasedDirectoryScannerを呼び出してディレクトリ一覧を取得
    2. 取得成功時: SubdirectoryPromptServiceを呼び出して選択UIを表示
    3. 取得失敗時: 既存のテキスト入力プロンプトにフォールバック（Requirement 4）
  - `--subdir` CLI引数が既に指定されている場合はTree APIスキャンをスキップ（後方互換性）
  - 通常モード（`--steering`なし）の動作は変更しない
  - _Requirements: 9.1, 9.7, 9.8, 9.9_

- [ ] 9.4 単体テストの作成
  - `tests/unit/github/tree-based-dir-scanner.test.ts`を作成
    - Tree APIからディレクトリ一覧を正常に取得できることをテスト
    - ディレクトリのみがフィルタリングされることをテスト（ファイルは除外）
    - truncated警告メッセージが正しく表示されることをテスト
    - レート制限エラー、ネットワークエラーが適切にハンドリングされることをテスト
  - `tests/unit/cli/searchable-subdir-prompt.test.ts`を作成
    - 検索可能なチェックボックスUIが正しく表示されることをテスト
    - ルートディレクトリ選択オプションが選択肢に含まれることをテスト
    - ユーザー選択が正しく返されることをテスト（空文字列の場合も含む）
  - `tests/unit/cli/interactive-prompt.test.ts`に追加
    - `--steering`モード時、サブディレクトリが未指定の場合にTree APIスキャンが実行されることをテスト
    - Tree API成功時に選択UIが表示されることをテスト
    - Tree API失敗時にテキスト入力プロンプトにフォールバックすることをテスト
    - `--subdir`が指定されている場合にTree APIスキャンがスキップされることをテスト
    - 通常モードでは既存のサブディレクトリプロンプト動作が維持されることをテスト
  - _Requirements: 9.1-9.9_

- [ ] 9.5 統合テストの作成
  - `tests/integration/interactive-subdir-selection.test.ts`を作成
    - インタラクティブモード + `--steering`でサブディレクトリ選択UIが表示されることを統合テスト
    - Tree API → SubdirectoryPromptService → インタラクティブプロンプトの統合フローをテスト
    - ルートディレクトリ選択時に空文字列が正しく処理されることをテスト
    - サブディレクトリ選択時に指定パスが正しく処理されることをテスト
  - _Requirements: 9.1-9.9_

- [ ] 9.6 E2Eテストの作成
  - `tests/e2e/steering-subdir-selection.test.ts`を作成
    - インタラクティブモード + `--steering`でサブディレクトリ選択UIから実際のファイル取得までのE2Eテスト
    - Tree API失敗時のフォールバック動作をE2Eテスト
    - `--subdir`指定時にTree APIスキャンがスキップされることをE2Eテスト
    - 通常モードでは既存動作が維持されることをE2Eテスト
  - _Requirements: 9.1-9.9_

- [ ] 9.7 後方互換性検証
  - 既存のテストスイート（1971 tests）が全て合格することを確認
  - `--subdir`オプション指定時の既存動作が維持されることを確認
  - 通常モード（`--steering`なし）の既存動作が維持されることを確認
  - _Requirements: 9.8, 9.9, NFR-2_

- [ ] 10. ステアリングディレクトリフィルタリング改善（UX改善）
- [x] 10.1 `.kiro/steering`親ディレクトリ抽出ロジックの実装
  - `src/github/tree-based-dir-scanner.ts`の`scanDirectoriesAcrossRepo`関数を更新
  - Tree APIから取得したディレクトリ一覧から`.kiro/steering`ディレクトリを検出
  - `.kiro/steering`が存在する親ディレクトリのパスを抽出
    - 例: `lib/a/.kiro/steering` → 親ディレクトリは `lib/a`
    - 例: `.kiro/steering` (ルート直下) → 親ディレクトリは `''` (空文字列、ルートを示す)
  - 重複する親ディレクトリを排除（Set使用）
  - ルート直下に`.kiro/steering`がある場合は"(root)"として表示
  - `.kiro/steering`が存在しない場合は空配列を返す
  - _UX Goal: ユーザーは`.kiro`や`.kiro/steering`自体ではなく、意味のあるプロジェクトディレクトリ（`lib/a`, `lib/sample`など）のみを選択できる_

- [x] 10.2 単体テストの作成
  - `tests/unit/github/tree-based-dir-scanner.test.ts`に追加テストを作成
    - `.kiro/steering`が複数のサブディレクトリに存在する場合、全ての親ディレクトリが抽出されることをテスト
    - `.kiro/steering`がルート直下にある場合、空文字列（ルート）が返されることをテスト
    - `.kiro/steering`が存在しない場合、空配列が返されることをテスト
    - ネストされたディレクトリ構造でも正しく親ディレクトリが抽出されることをテスト
      - 例: `lib/a/.kiro/steering`, `lib/a/.kiro/specs`, `lib/sample/.kiro/steering` → [`lib/a`, `lib/sample`]
    - 重複する親ディレクトリが排除されることをテスト

- [ ] 10.3 統合テストの更新
  - `tests/integration/interactive-steering-subdir.test.ts`を更新
    - サブディレクトリ選択UIに`.kiro/steering`の親ディレクトリのみが表示されることをテスト
    - `.kiro`や`.kiro/steering`自体が選択肢に含まれないことをテスト
    - 選択した親ディレクトリが正しく`--subdir`パラメータとして渡されることをテスト

- [ ] 10.4 既存テストの検証
  - `tests/unit/cli/searchable-subdir-prompt.test.ts`の既存テストが引き続きパスすることを確認
  - `tests/unit/cli/interactive-prompt-steering-subdir.test.ts`の既存テストが引き続きパスすることを確認
  - 全体のテストスイート（2012+ tests）が合格することを確認

## 要件カバレッジサマリー

全要件が以下のタスクでカバーされています:

- **Requirement 1 (1.1-1.4)**: Tasks 1.1, 1.2, 4.1, 4.2, 6.1, 7.1
- **Requirement 2 (2.1-2.4)**: Tasks 2.1, 4.1, 6.2, 8.2
- **Requirement 3 (3.1-3.5)**: Tasks 3.1, 3.2, 5.3, 6.3, 8.1
- **Requirement 4 (4.1-4.4)**: Tasks 3.3, 6.3, 8.1
- **Requirement 5 (5.1-5.5)**: Tasks 3.4, 8.1
- **Requirement 6 (6.1-6.5)**: Tasks 2.2, 5.1, 5.2, 5.3, 6.2, 7.2, 8.2, 8.4
- **Requirement 7 (7.1-7.5)**: Tasks 4.3, 4.4, 8.3, 8.4
- **Requirement 8 (8.1-8.5)**: Tasks 1.2, 6.1
- **Requirement 9 (9.1-9.9)**: Tasks 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
- **NFR-1 (パフォーマンス)**: Tasks 3.1, 8.4
- **NFR-2 (後方互換性)**: Tasks 5.3, 8.4, 9.7
- **NFR-3 (保守性)**: 全タスクで既存アーキテクチャを尊重

## 実装ノート

- タスク1-4は順次実装が必要（依存関係あり）
- タスク5-8は並行実装可能（テストタスク）
- タスク9は独立した拡張機能（ユーザーフィードバックに基づく改善）
  - Task 9.1-9.3は順次実装が必要（依存関係あり）
  - Task 9.4-9.7は並行実装可能（テストタスク）
- タスク10はUX改善タスク（Task 9完了後に実施）
  - Task 10.1: `tree-based-dir-scanner.ts`のロジック更新（`.kiro/steering`親ディレクトリ抽出）
  - Task 10.2-10.4: テストの作成と検証
  - 目的: ユーザーに意味のあるディレクトリ（`lib/a`, `lib/sample`）のみを表示し、`.kiro`や`.kiro/steering`自体は非表示にする
- 各タスク完了後、`npm test`を実行して既存テストの合格を確認
- `--verbose`オプションを使用して詳細ログを確認しながら実装を進める
