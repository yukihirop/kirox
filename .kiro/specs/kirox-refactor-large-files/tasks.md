# Implementation Plan

## 実装タスク一覧

### 前提条件
- 既存のテストスイートが全て合格している状態でリファクタリングを開始する
- 各タスク完了後、影響を受けるテストを実行し、合格を確認する
- 公開APIシグネチャを変更しないことで、既存の呼び出し元コードとの互換性を保つ

---

## Phase 1: ユーティリティモジュールの作成

- [ ] 1. ユーティリティモジュールの基盤構築
- [x] 1.1 (P) メタデータ操作ユーティリティの実装
  - `getMetadataPath`関数を実装し、出力ディレクトリからメタデータファイルパスを生成する
  - `isDuplicateProject`関数を実装し、リポジトリ・プロジェクト名・サブディレクトリの組み合わせで重複を検出する
  - 既存の`tracking/metadata-manager`モジュールとの連携を維持する
  - MainEntryとAddEntryで重複していたロジックを削除可能にする
  - TypeScript厳格型チェックに準拠し、明示的な戻り値型を追加する
  - _Requirements: 1.1, 2.1, 6.2, 6.3_

- [x] 1.2 (P) パーサー設定オブジェクトの外部化
  - Commander.jsのオプション定義を宣言的な設定オブジェクトとして定義する
  - メインコマンド、addサブコマンド、completionサブコマンドのオプションを統一的に管理する
  - 既存の`project-name-parser.ts`モジュールとの連携を維持する
  - オプションの再利用性とメンテナンス性を向上させる
  - _Requirements: 5.2, 5.3, 6.2, 6.3_

- [x] 1.3 (P) ASCII art生成ユーティリティの実装
  - figletを使用したASCII art生成処理を独立したユーティリティ関数として実装する
  - 生成失敗時のフォールバック処理を含める
  - Parserのメイン処理から表示ロジックを分離する
  - _Requirements: 5.4, 6.2, 6.3_

---

## Phase 2: Reporting層の内部モジュール作成

- [ ] 2. Reporting層の責任分離
- [x] 2.1 (P) スピナー管理クラスの実装
  - `SpinnerManager`クラスを実装し、oraスピナーのライフサイクル管理を担当する
  - スピナーの初期化・更新・停止処理を独立した関数として定義する
  - スピナーのマップ（`spinnerMap`）と状態（`useFallback`）を明示的なStateパターンで管理する
  - フォールバックロジック（console.log使用）をSpinnerManager内に統合する
  - TypeScript厳格型チェックに準拠し、`any`型を排除する
  - _Requirements: 4.1, 4.3, 4.4, 6.2, 6.3_

- [x] 2.2 (P) メッセージフォーマットクラスの実装
  - `MessageFormatter`クラスを実装し、chalkを使用したメッセージの色付けとフォーマットを担当する
  - 成功メッセージ、エラーメッセージ、進捗メッセージの統一的なフォーマット提供を実装する
  - カラー無効化オプション（`useColor: false`）への対応を含める
  - 各メソッドに明示的な戻り値型アノテーションを追加する
  - _Requirements: 4.2, 6.2, 6.3_

- [x] 2.3 ProgressReporterのファサード化
  - 既存のProgressReporterクラスをファサードパターンで再実装する
  - 公開APIメソッド（`reportProgress`、`reportSuccess`、`reportError`等）のシグネチャを維持する
  - 内部実装をSpinnerManagerとMessageFormatterに委譲する
  - 既存の呼び出し元コード（MainEntry、AddEntry、GitHubFetcher）への影響を最小化する
  - レイヤー分離アーキテクチャの原則を維持する
  - _Requirements: 4.5, 6.1, 6.6_
  - **注意**: 内部実装をテストする49件のテストが失敗（修正タスク9.2で対応）

---

## Phase 3: CLI層のプロンプトモジュール作成

- [ ] 3. 対話モードプロンプトの分離
- [x] 3.1 (P) リポジトリ入力プロンプトの実装
  - `promptRepository`関数を実装し、@inquirer/promptsを使用してリポジトリ入力を受け付ける
  - 既存の`validateRepositoryFormat`関数を活用してリアルタイムバリデーションを実装する
  - メタデータから最後に使用したリポジトリをデフォルト値として提案する機能を含める
  - 50行以下の単一責任関数として実装する
  - _Requirements: 3.1, 3.3, 3.4, 6.2, 6.3_
  - ✅ 実装完了: `src/cli/prompts/repository-prompt.ts` (56行)
  - ✅ テスト完了: 12テスト全て合格

- [x] 3.2 (P) プロジェクト選択プロンプトの実装
  - `promptProjectSelection`関数を実装し、@inquirer/promptsを使用してプロジェクト選択を受け付ける
  - GitHub API統合（プロジェクト一覧取得）はGitHub LayerのFetcherに委譲する
  - 検索可能なチェックボックスUIを提供する
  - 50行以下の単一責任関数として実装する
  - _Requirements: 3.1, 3.2, 3.4, 6.2, 6.3_
  - ✅ 実装完了: `src/cli/prompts/project-selection-prompt.ts` (125行)
  - ✅ テスト完了: 11テスト全て合格
  - ✅ 後方互換性: `searchable-project-prompt.ts`を再エクスポートラッパーに変更

- [x] 3.3 (P) ブランチ選択プロンプトの実装
  - `promptBranch`関数を実装し、@inquirer/promptsを使用してブランチ選択を受け付ける
  - GitHub API統合（ブランチ一覧取得）はGitHub LayerのFetcherに委譲する
  - デフォルトブランチの提案機能を含める
  - 50行以下の単一責任関数として実装する
  - _Requirements: 3.1, 3.2, 3.4, 6.2, 6.3_
  - ✅ 実装完了: `src/cli/prompts/branch-prompt.ts` (71行)
  - ✅ テスト完了: 17テスト全て合格
  - ✅ 後方互換性: `branch-prompt.ts`を再エクスポートラッパーに変更

- [x] 3.4 (P) サブディレクトリ選択プロンプトの実装
  - `promptSubdirSelection`関数を実装し、@inquirer/promptsを使用してサブディレクトリ選択を受け付ける
  - GitHub API統合（サブディレクトリ一覧取得）はGitHub LayerのFetcherに委譲する
  - 検索可能なチェックボックスUIを提供する
  - 50行以下の単一責任関数として実装する
  - _Requirements: 3.1, 3.2, 3.4, 6.2, 6.3_
  - ✅ 実装完了: `src/cli/prompts/subdir-selection-prompt.ts` (111行)
  - ✅ テスト完了: 13テスト全て合格
  - ✅ 後方互換性: `searchable-subdir-prompt.ts`を再エクスポートラッパーに変更

- [ ] 3.5 InteractiveFacadeのファサード化
  - 既存のinteractive-prompt.tsをファサードパターンで再実装する
  - 公開API関数（`shouldEnterInteractiveMode`、`promptMissingArguments`）のシグネチャを維持する
  - 内部実装を各Promptsモジュール（RepoPrompt、ProjectPrompt、BranchPrompt、SubdirPrompt）に委譲する
  - GitHub API統合をGitHub LayerのFetcherに委譲する
  - 既存の呼び出し元コード（MainEntry、AddEntry）への影響を最小化する
  - バリデーションロジックを既存の`validator.ts`モジュールに集約する
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 6.1, 6.6_

---

## Phase 4: entry.tsのリファクタリング

- [ ] 4. entry.tsの責任範囲整理とファイルサイズ削減
- [ ] 4.1 getMetadataPath関数のMetadataUtilsへの移行
  - entry.ts内の`getMetadataPath`関数を削除し、MetadataUtilsからインポートする
  - 既存の呼び出し箇所を更新する
  - 重複コードを削除し、DRY原則を適用する
  - _Requirements: 2.1, 6.1_

- [ ] 4.2 execute関数の分割と委譲
  - 100行超の`execute`関数を30-50行以下のヘルパー関数に分割する
  - 引数パース・バリデーション処理を`parseAndValidateArgs`関数に抽出する
  - 設定読み込み・マージ処理を`loadAndMergeConfig`関数に抽出する
  - メタデータチェック処理を`checkMetadata`関数に抽出する
  - ファイル取得・書き込み処理を`fetchAndWriteFiles`関数に抽出する
  - メタデータ更新・レポート処理を`updateMetadataAndReport`関数に抽出する
  - 各ヘルパー関数に明示的な戻り値型アノテーションを追加する
  - _Requirements: 2.1, 2.5, 6.2, 6.3_

- [ ] 4.3 エラーハンドリングの統一化
  - 重複するtry-catchブロックを統一的なエラーハンドリングミドルウェアに統合する
  - ErrorHandlerを使用してエラー分類とユーザーフレンドリーなメッセージ生成を実装する
  - エラーハンドリングロジックを共通化し、コードの重複を削減する
  - _Requirements: 2.2, 6.1_

- [ ] 4.4 対話モードと非対話モードの実行パス分離
  - 対話モード判定後の処理を独立した実行パスに分離する
  - 条件分岐を最小化し、各モードのフローを明確化する
  - InteractiveFacadeへの委譲を適切に配置する
  - _Requirements: 2.3, 6.1_

- [ ] 4.5 依存注入パターンの維持確認
  - ProgressReporter、ErrorHandler、PinoLoggerの依存注入パターンが維持されていることを確認する
  - レイヤー分離アーキテクチャの原則に従っていることを検証する
  - インポート整理規則（Node.js組み込み → 外部ライブラリ → 内部モジュール → 型のみ）を適用する
  - _Requirements: 2.4, 6.1, 6.4_

- [ ] 4.6 自明なコメントの削除
  - コードの内容を繰り返すだけの自明なコメント（例: `// Parse arguments`）を削除する
  - 複雑なロジックやビジネス要件を説明する有意義なコメントのみを残す
  - WHYを説明するコメント（例: `// Workaround for Octokit rate limit bug #123`）は保持する
  - _Requirements: 6.8_

---

## Phase 5: add-command-entry.tsのリファクタリング

- [ ] 5. add-command-entry.tsの責任範囲整理
- [ ] 5.1 getMetadataPathとisDuplicateProjectのMetadataUtilsへの移行
  - add-command-entry.ts内の`getMetadataPath`と`isDuplicateProject`関数を削除する
  - MetadataUtilsからインポートする
  - 既存の呼び出し箇所を更新する
  - 重複コードを削除し、DRY原則を適用する
  - _Requirements: 1.1, 1.2, 6.1_

- [ ] 5.2 executeAddCommand関数の分割と委譲
  - 100行超の`executeAddCommand`関数を30-50行以下のヘルパー関数に分割する
  - 引数パース・バリデーション処理を`parseAndValidateArgs`関数に抽出する
  - 設定読み込み・マージ処理を`loadAndMergeConfig`関数に抽出する
  - メタデータチェック・重複検出処理を`checkMetadataAndDuplicates`関数に抽出する
  - ファイル取得・書き込み処理を`fetchAndWriteFiles`関数に抽出する
  - メタデータ更新・レポート処理を`updateMetadataAndReport`関数に抽出する
  - 各ヘルパー関数に明示的な戻り値型アノテーションを追加する
  - _Requirements: 1.3, 6.2, 6.3_

- [ ] 5.3 型定義の統合
  - add-command-entry.ts内で重複している型定義を`cli/types.ts`に統合する
  - 共通型定義を各モジュールからインポートする構造に変更する
  - TypeScript厳格型チェックに準拠し、`any`型を排除する
  - _Requirements: 1.2, 6.2_

- [ ] 5.4 自明なコメントの削除
  - コードの内容を繰り返すだけの自明なコメント（例: `// Task X.Y: ...`）を削除する
  - 複雑なロジックやビジネス要件を説明する有意義なコメントのみを残す
  - WHYを説明するコメント（例: `// Business requirement: Duplicate projects are allowed in different subdirectories`）は保持する
  - _Requirements: 6.8_

- [ ] 5.5 公開APIシグネチャの維持確認
  - `executeAddCommand`関数のシグネチャが変更されていないことを確認する
  - 既存の呼び出し元コードへの影響がないことを検証する
  - _Requirements: 1.5, 6.6_

---

## Phase 6: parser.tsのリファクタリング

- [ ] 6. parser.tsの責任範囲整理
- [ ] 6.1 (P) サブコマンドパース処理の分離
  - メインコマンド、addサブコマンド、completionサブコマンドのパース処理を独立した関数に抽出する
  - `parseMainCommand`、`parseAddCommand`、`parseCompletionCommand`関数を実装する
  - 各関数に明示的な戻り値型アノテーションを追加する
  - _Requirements: 5.1, 6.2, 6.3_

- [ ] 6.2 (P) オプション定義の外部化適用
  - ParserConfigからオプション定義をインポートする
  - Commander.jsの`option()`メソッドに設定オブジェクトを適用する
  - オプションの再利用性とメンテナンス性を向上させる
  - _Requirements: 5.2, 6.1_

- [ ] 6.3 (P) ASCII artジェネレーションの移動
  - `generateKiroxAsciiArt`関数の呼び出しをAsciiArtUtilsからのインポートに変更する
  - パーサーのメイン処理から表示ロジックを分離する
  - _Requirements: 5.4, 6.1_

- [ ] 6.4 (P) プロジェクト名パース連携の維持確認
  - 既存の`project-name-parser.ts`モジュールとの連携が維持されていることを確認する
  - 重複ロジックが削除されていることを検証する
  - _Requirements: 5.3_

- [ ] 6.5 型互換性の維持確認
  - `ParsedArguments`型のシグネチャが変更されていないことを確認する
  - 既存のバリデーション層（validator.ts）との互換性を保つ
  - _Requirements: 5.5, 6.6_

- [ ] 6.6 自明なコメントの削除
  - コードの内容を繰り返すだけの自明なコメント（例: `// Parse command-line arguments`）を削除する
  - 複雑なロジックやビジネス要件を説明する有意義なコメントのみを残す
  - _Requirements: 6.8_

---

## Phase 7: テストとバリデーション

- [ ] 7. 既存テストスイートの実行と修正
- [ ] 7.1 単体テストの実行と修正
  - 全ての単体テスト（`tests/unit/`）を実行し、合格を確認する
  - リファクタリングにより影響を受けたテストケースを修正する
  - 公開APIシグネチャが維持されているため、大部分のテストは再利用可能
  - 新規作成したユーティリティモジュール（MetadataUtils、ParserConfig、AsciiArtUtils）の単体テストを追加する
  - Promptsモジュール（RepoPrompt、ProjectPrompt、BranchPrompt、SubdirPrompt）の単体テストを追加する
  - SpinnerMgrとFormatterの単体テストを追加する
  - _Requirements: 1.4, 6.5_

- [ ] 7.2 統合テストの実行と修正
  - 全ての統合テスト（`tests/integration/`）を実行し、合格を確認する
  - 外部API呼び出しがモック化されているため、内部実装変更の影響は最小限
  - InteractiveFacade統合テスト（対話モードフロー全体）を実行し、合格を確認する
  - ProgressFacade統合テスト（ProgressReporter → SpinnerMgr → Formatter）を実行し、合格を確認する
  - _Requirements: 6.5_

- [ ] 7.3 パフォーマンステストの実行
  - 50ファイル取得E2Eテストを実行し、30秒以内の性能目標を維持することを確認する
  - 100ファイル取得時のメモリ使用量が100MB以内であることを確認する
  - ファサードパターンによる関数呼び出しオーバーヘッドが許容範囲内（1ms以下）であることを確認する
  - _Requirements: 6.7_

- [ ] 7.4 型チェックとリント実行
  - TypeScript厳格型チェック（`npm run type-check`）を実行し、エラーがないことを確認する
  - `any`型が使用されていないことを検証する
  - ESLintを実行し、コード品質基準を満たしていることを確認する
  - インポート整理規則が適用されていることを検証する
  - _Requirements: 6.2, 6.3, 6.4_

---

## Phase 8: 最終検証とドキュメント更新

- [ ] 8. 最終検証
- [ ] 8.1 レイヤー分離アーキテクチャの検証
  - CLI → GitHub → FileSystem → Reportingの依存方向が維持されていることを確認する
  - 下位レイヤーが上位レイヤーに依存していないことを検証する
  - 循環依存が発生していないことをツール（例: madge）で確認する
  - _Requirements: 6.1_

- [ ] 8.2 公開API互換性の最終確認
  - 全ての公開API関数（`execute`、`executeAddCommand`、`shouldEnterInteractiveMode`、`promptMissingArguments`、`ProgressReporter`クラス）のシグネチャが変更されていないことを確認する
  - 既存の呼び出し元コードへの影響がないことを最終検証する
  - _Requirements: 1.5, 6.6_

- [ ] 8.3 ファイルサイズ削減の確認
  - entry.tsのファイルサイズが400行以下に削減されていることを確認する
  - 各ファイルが単一責任原則に従っていることを検証する
  - 関数のサイズが30-50行以下（目安）であることを確認する
  - _Requirements: 2.5_

- [ ] 8.4 自明なコメント削除の最終確認
  - 全てのリファクタリング対象ファイルで自明なコメントが削除されていることを確認する
  - WHYを説明する有意義なコメントのみが残されていることを検証する
  - _Requirements: 6.8_

---

## 要件カバレッジ確認

全ての要件が実装タスクでカバーされていることを確認:

- **Requirement 1 (add-command-entry.ts)**: Tasks 1.1, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1
- **Requirement 2 (entry.ts)**: Tasks 1.1, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.3
- **Requirement 3 (interactive-prompt.ts)**: Tasks 3.1, 3.2, 3.3, 3.4, 3.5
- **Requirement 4 (progress-reporter.ts)**: Tasks 2.1, 2.2, 2.3
- **Requirement 5 (parser.ts)**: Tasks 1.2, 1.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
- **Requirement 6 (横断的品質要件)**: Tasks 2.3, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4

---

## 修正タスク

### 開発環境エラー修正

- [x] 9.1 `npm run dev`で`__KIROX_VERSION__`未定義エラーの修正
  - **問題**: `src/cli/parser.ts:14`で`ReferenceError: __KIROX_VERSION__ is not defined`が発生
  - **原因**: 開発環境（tsx）では`__KIROX_VERSION__`がビルド時定義されないため、実行時にエラーになる
  - **対応方法**:
    1. `src/cli/parser.ts`で`__KIROX_VERSION__`のフォールバック処理を追加
    2. `package.json`のバージョンを動的にインポートするか、開発環境用のデフォルト値を設定
  - **検証**: `npm run dev`が正常に動作することを確認
  - **影響範囲**: 開発環境のみ（ビルド後の動作には影響なし）

### テスト修正

- [ ] 9.2 ProgressReporterリファクタリング後のテスト修正
  - **問題**: タスク2.3でProgressReporterをファサードパターンにリファクタリング後、49個のテストが失敗
  - **原因**: テストが内部実装の詳細（`spinnerMap`、`useFallback`などのprivateプロパティ）に直接アクセスしている
  - **影響テストファイル**:
    - `progress-reporter-compatibility.test.ts` (4件)
    - `progress-reporter-error-handling.test.ts` (2件)
    - `progress-reporter-fallback.test.ts` (1件)
    - `progress-reporter-lifecycle.test.ts` (9件)
    - `progress-reporter-progress-spinner.test.ts` (13件)
    - `progress-reporter-success-error-spinner.test.ts` (12件)
    - `progress-reporter-spinner-pause.test.ts` (7件)
    - `progress-reporter-spinner-state.test.ts` (1件)
  - **対応方法**:
    1. 公開APIのみをテストするようにテストを修正
    2. または、テスト用にSpinnerManagerへのアクセサーを追加（後方互換性）
  - **優先度**: 高（現在49テスト失敗中）