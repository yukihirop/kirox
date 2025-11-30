# Requirements Document

## Project Description (Input)
github.com/AlDanial/cloc v 2.06  T=0.02 s (2440.3 files/s, 497103.8 lines/s)
-------------------------------------------------------------------------------------------
File                                                    blank        comment           code
-------------------------------------------------------------------------------------------
src/cli/add-command-entry.ts                              104            211            573
src/cli/entry.ts                                          121            131            566
src/cli/interactive-prompt.ts                              73            266            397
src/reporting/progress-reporter.ts                         77            451            331
src/cli/parser.ts                                          55             52            256
src/tracking/metadata-manager.ts                           45             81            255
src/cli/prompts/searchable-checkbox.ts                     48             70            247
src/github/fetcher.ts                                      42             82            242
src/cli/project-suggester.ts                               39            128            191
src/github/parallel-fetcher.ts                             41             96            184
src/cli/completion/generator.ts                            44             88            181
src/cli/validator.ts                                       35            107            145
src/tracking/update-checker.ts                             16             41            144
src/github/retry.ts                                        28             57            126
src/tracking/batch-file-updater.ts                         18             41            113
src/github/tree-based-dir-scanner.ts                       22             64            105
src/filesystem/path-utils.ts                               36            154            104
src/github/metadata-fetcher.ts                             13             35             91
src/reporting/error-handler.ts                             21             41             91
src/github/tree-based-project-scanner.ts                   22             36             90
src/config/merger.ts                                       14             56             84
src/filesystem/writer.ts                                   17             71             84
src/github/parallel-metadata-fetcher.ts                    19             37             84
src/tracking/batch-update-checker.ts                       16             33             82
src/tracking/file-updater.ts                               15             35             79
src/cli/completion-command-entry.ts                        12             51             73
src/config/loader.ts                                       12             43             69
src/cli/searchable-project-prompt.ts                       18             57             67
src/github/tree-sha-fetcher.ts                             15             35             64
src/tracking/status-classifier.ts                          15             53             64
src/tracking/local-edit-detector.ts                         7             22             61
src/cli/searchable-subdir-prompt.ts                        14             61             60
src/tracking/update-filter.ts                              18             30             53
src/reporting/pino-logger.ts                               14            108             48
src/tracking/hash-calculator.ts                             8             24             48
src/cli/branch-prompt.ts                                    8             43             41
src/github/semaphore.ts                                     8             52             38
src/tracking/types.ts                                       5             30             35
src/cli/completion/shell-validator.ts                       9             55             32
src/github/tree-response-parser.ts                          7             34             32
src/cli/types.ts                                            4             37             30
src/reporting/types.ts                                      4             15             29
src/github/client.ts                                        6             23             25
src/config/types.ts                                         2             26             20
src/index.ts                                                5             18             20
src/filesystem/prompt.ts                                    5             23             15
src/github/project-location-builder.ts                      4             24             15
src/filesystem/types.ts                                     2              9             13
src/cli/project-name-parser.ts                              3             24             10
src/github/types.ts                                         3             21              5
src/global.d.ts                                             1              4              1
-------------------------------------------------------------------------------------------
SUM:                                                     1190           3386           5813
-------------------------------------------------------------------------------------------
 以上のファイルの行数が多いやつを5個リファクタリングしたい

## Introduction
本仕様は、Kirox CLIプロジェクトにおける最大規模5ファイルのリファクタリングを定義します。対象ファイルは`add-command-entry.ts` (573行)、`entry.ts` (566行)、`interactive-prompt.ts` (397行)、`progress-reporter.ts` (331行)、`parser.ts` (256行) です。これらのファイルは単一責任原則（SRP）違反や過度な依存関係により、保守性・テスタビリティ・可読性が低下しています。本リファクタリングにより、レイヤー分離の明確化、関数の適切な分割、型安全性の向上を実現し、長期的な開発効率を改善します。

## Requirements

### Requirement 1: add-command-entry.tsのリファクタリング
**Objective:** 開発者として、`add-command-entry.ts` (573行) の責任範囲を明確に分離し、保守性とテスタビリティを向上させたい。

#### Acceptance Criteria
1. When リファクタリング作業を実施する際、the リファクタリングモジュールは、重複ロジック（メタデータ管理、ファイル取得、進捗レポート）を独立したユーティリティ関数またはクラスに抽出すること
2. When 重複している型定義を発見した場合、the リファクタリングモジュールは、共通型定義を `types.ts` に統合し、各モジュールからインポートする構造に変更すること
3. When 100行を超える関数を検出した場合、the リファクタリングモジュールは、関数を単一責任の原則に従って30-50行以下の関数に分割すること
4. The リファクタリングモジュールは、既存のテストスイートを全て合格させた状態を維持すること
5. The リファクタリングモジュールは、外部公開APIのシグネチャを変更せずに内部実装のみを改善すること

### Requirement 2: entry.tsのリファクタリング
**Objective:** 開発者として、`entry.ts` (566行) のCLIエントリポイントロジックを簡潔化し、オーケストレーション責任のみに集中させたい。

#### Acceptance Criteria
1. When メイン実行フローを分析した際、the リファクタリングモジュールは、引数パース・バリデーション・GitHub統合・ファイルシステム操作の各責任を独立したモジュールに委譲すること
2. When エラーハンドリングロジックを評価した場合、the リファクタリングモジュールは、重複するtry-catchブロックを統一的なエラーハンドラークラスまたはミドルウェアパターンに統合すること
3. When 対話モードと非対話モードのロジックが混在している箇所を発見した場合、the リファクタリングモジュールは、各モードを独立した実行パスに分離すること
4. While リファクタリングを実施する間、the リファクタリングモジュールは、既存の依存注入パターン（ProgressReporter、ErrorHandler、PinoLogger）を維持すること
5. The リファクタリングモジュールは、ファイルサイズを400行以下に削減すること

### Requirement 3: interactive-prompt.tsのリファクタリング
**Objective:** 開発者として、`interactive-prompt.ts` (397行) の複雑な対話ロジックを整理し、各プロンプト機能を独立したモジュールに分離したい。

#### Acceptance Criteria
1. When プロンプト関数を分析した際、the リファクタリングモジュールは、リポジトリ入力、プロジェクト選択、ブランチ選択、サブディレクトリ選択の各プロンプトを独立したモジュールファイルに抽出すること
2. When GitHub API統合ロジック（suggestProjects、scanProjectsAcrossSubdirs、fetchBranches）を評価した場合、the リファクタリングモジュールは、API呼び出しを専用のサービスクラスまたは関数群に委譲すること
3. When バリデーションロジックを確認した際、the リファクタリングモジュールは、既存の `validator.ts` モジュールを活用し、重複するバリデーションコードを削除すること
4. If プロンプト関数が50行を超える場合、the リファクタリングモジュールは、関数を複数のヘルパー関数に分割し、各関数が単一の責任を持つようにすること
5. The リファクタリングモジュールは、対話モード判定ロジック（`shouldEnterInteractiveMode`）を独立した関数として維持し、CLIエントリポイントから呼び出し可能な状態を保つこと

### Requirement 4: progress-reporter.tsのリファクタリング
**Objective:** 開発者として、`progress-reporter.ts` (331行) のレポーティングロジックを整理し、スピナー管理とメッセージフォーマットの責任を分離したい。

#### Acceptance Criteria
1. When スピナー管理ロジック（ora統合）を分析した際、the リファクタリングモジュールは、スピナーの初期化・更新・終了処理を独立したSpinnerManagerクラスまたはモジュールに抽出すること
2. When メッセージフォーマットロジック（chalk使用）を評価した場合、the リファクタリングモジュールは、色付けとフォーマットを担当するFormatterクラスまたはユーティリティ関数群に分離すること
3. When 進捗状態管理（spinnerMap、useFallback）を確認した際、the リファクタリングモジュールは、状態管理を明示的なStateパターンまたはイミュータブルな状態オブジェクトで管理すること
4. If フォールバックロジック（console.log使用）が複雑化している場合、the リファクタリングモジュールは、Fallback Reporterを独立したクラスとして実装すること
5. The リファクタリングモジュールは、公開APIメソッド（reportProgress、reportSuccess、reportError等）のシグネチャを維持し、既存の呼び出し元コードに影響を与えないこと

### Requirement 5: parser.tsのリファクタリング
**Objective:** 開発者として、`parser.ts` (256行) の引数パースロジックを簡潔化し、サブコマンド処理とオプションパースの責任を分離したい。

#### Acceptance Criteria
1. When サブコマンド処理ロジック（add、completion、メインコマンド）を分析した際、the リファクタリングモジュールは、各サブコマンドのパース処理を独立した関数またはクラスに抽出すること
2. When Commander.jsの設定コード（option定義、action定義）を評価した場合、the リファクタリングモジュールは、オプション定義を宣言的な設定オブジェクトとして外部化すること
3. When プロジェクト名パース処理（parseProjects呼び出し）を確認した際、the リファクタリングモジュールは、既存の`project-name-parser.ts`モジュールとの連携を維持し、重複ロジックを削除すること
4. If ASCII artジェネレーション（figlet使用）がメイン処理と混在している場合、the リファクタリングモジュールは、表示ロジックを独立したユーティリティ関数に移動すること
5. The リファクタリングモジュールは、パース結果の型（ParsedArguments）を維持し、既存のバリデーション層（validator.ts）との互換性を保つこと

### Requirement 6: 横断的品質要件
**Objective:** 開発者として、全てのリファクタリング対象ファイルにおいて、一貫した品質基準とアーキテクチャ原則を適用したい。

#### Acceptance Criteria
1. The リファクタリングモジュールは、レイヤー分離アーキテクチャ（CLI → GitHub → FileSystem → Reporting）の原則を維持し、下位レイヤーが上位レイヤーに依存しない構造を保つこと
2. The リファクタリングモジュールは、TypeScript厳格型チェック（`strict: true`）に準拠し、`any`型の使用を排除すること
3. The リファクタリングモジュールは、各関数に明示的な戻り値型アノテーションを追加し、型推論に依存しないこと
4. The リファクタリングモジュールは、既存のインポート整理規則（Node.js組み込み → 外部ライブラリ → 内部モジュール → 型のみ）を維持すること
5. When リファクタリング完了後、the リファクタリングモジュールは、全ての既存テストスイート（unit、integration、e2e）を合格させること
6. The リファクタリングモジュールは、外部公開APIのシグネチャを変更せず、破壊的変更を導入しないこと
7. The リファクタリングモジュールは、パフォーマンス要件（50ファイル取得30秒以内、メモリ使用量100MB以内）を維持すること
8. When コードを実装する際やレビューする際、the リファクタリングモジュールは、自明なコメント（コードの内容を繰り返すだけのコメント）を削除し、複雑なロジックやビジネス要件を説明する有意義なコメントのみを残すこと

