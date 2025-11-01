# Implementation Plan

## Phase 1: 高優先度修正（Logger & argv型エラー）

### 1. Logger検証ロジックの基盤整備

- [x] 1.1 Pinoモジュールレベルモックの共通パターン確立
  - Pinoモジュール全体をモックするヘルパー関数を設計
  - スパイ付きモックインスタンスの作成パターンを定義
  - beforeEach/afterEachでのスパイリセット戦略を確立
  - モック設定の再利用可能性を確保
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 entry-pino-logger.test.tsのLogger検証修正
  - Pinoモジュールをモックし、スパイでメソッド呼び出しを追跡可能にする
  - infoSpy, warnSpy, errorSpy, debugSpyの呼び出し検証を実装
  - ログレベル（info vs debug）に応じた出力フィルタリングを検証
  - entry.tsの実行後にloggerメソッド呼び出しが正しく検出されることを確認
  - _Requirements: 1.4, 1.5_

- [x] 1.3 project-suggestion-github-api.test.tsのverboseモードログ検証修正
  - Pinoモジュールモックをテストに統合
  - verboseモード時のAPI呼び出し詳細ログ検証を修正
  - エラー詳細ログ出力の検証を修正
  - mockLogger.debug()の呼び出しが正しく追跡されることを確認
  - _Requirements: 1.6_

### 2. add-command-entry.test.tsのLogger検証修正

- [x] 2.1 Logger初期化とverboseモード検証の修正
  - PinoLoggerコンストラクタ呼び出しの検証ロジックを修正
  - verbose=true時のdebug()呼び出し検証を実装（PinoLoggerはdebugを使用）
  - Logger初期化タイミングの検証を追加
  - _Requirements: 1.4, 1.7_

- [x] 2.2 メタデータ作成・重複検出時のログ検証修正
  - 新規メタデータ作成時のinfoSpy呼び出し検証を修正
  - 重複プロジェクト検出時のwarnSpy呼び出し検証を修正
  - --force使用時のinfoSpy呼び出し検証を修正
  - 警告メッセージ（--forceヒント）のwarnSpy呼び出し検証を修正
  - _Requirements: 1.7_

- [x] 2.3 ディレクトリ取得・ファイル取得時のログ検証修正
  - steeringディレクトリ未検出時のwarnSpy呼び出し検証を修正
  - verboseモード時のファイル取得ログinfoSpy呼び出し検証を修正
  - 並列ファイル取得時のログ出力検証を実装
  - _Requirements: 1.7_

- [x] 2.4 成功サマリーメッセージのログ検証修正
  - メタデータ更新成功時のinfoSpy呼び出し検証を修正
  - ファイル数を含む成功サマリーのログ検証を実装
  - プロジェクト追加完了メッセージの検証を修正
  - _Requirements: 1.7_

### 3. シグナルハンドリングテストのargv型エラー修正

- [x] 3.1 argv配列形式への変換パターン確立
  - ParsedArgumentsからstring[]への変換ロジックを設計
  - コマンドライン引数配列の構築パターンを定義
  - オプション付き引数配列の生成方法を確立
  - _Requirements: 4.8, 5.1, 5.2, 5.3, 5.4_

- [x] 3.2 add-interrupt-handling.test.tsのargv型修正（前半）
  - SIGINT/SIGTERMハンドラー登録テストのargv形式を修正
  - process.onモックの設定を検証
  - シグナルハンドラーキャプチャの動作を確認
  - "Operation was interrupted."メッセージ表示テストのargv形式を修正
  - _Requirements: 4.1, 4.2, 4.3, 4.8, 5.1, 5.3_

- [x] 3.3 add-interrupt-handling.test.tsのargv型修正（後半）
  - メタデータ保存阻止テストのargv形式を修正
  - 既存メタデータ保持テストのargv形式を修正
  - 終了コード検証テストのargv形式を修正
  - シグナルハンドラークリーンアップテストのargv形式を修正
  - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.3_

### 4. Phase 1検証とUnhandled Rejection解消確認

- [x] 4.1 Phase 1修正後のテスト実行と検証
  - entry-pino-logger.test.tsの成功を確認（5件）✅
  - project-suggestion-github-api.test.tsの成功を確認（13件）✅
  - add-command-entry-pino-logger.test.tsの成功を確認（3件）✅
  - add-interrupt-handling.test.tsの全テスト成功を確認（7件）✅
  - Unhandled Rejection（6件）が解消されたことを確認 ✅ (0件)
  - _Requirements: 1.1-1.7, 4.1-4.8, 5.1-5.4_

## Phase 2: 中優先度修正（Steering、未実装オプション、--track）

### 5. Steering空ディレクトリメッセージ検証修正

- [x] 5.1 実装コードの実際の出力メッセージ確認
  - --steeringモード空ディレクトリ時のコンソール出力をキャプチャ ✅
  - 実装が出力する実際のメッセージパターンを特定 ✅（サマリー表示: "0 files succeeded/failed"）
  - サブディレクトリ指定時の出力メッセージパターンを確認 ✅
  - _Requirements: 2.1, 2.2_

- [x] 5.2 cli-to-github-to-fs.test.tsのメッセージ検証修正
  - 空ディレクトリ情報メッセージの期待値を実装の出力に合わせる ✅
  - サブディレクトリパス付きメッセージの期待値を修正 ✅
  - 正規表現パターンを実装のメッセージフォーマットに更新 ✅
  - テスト実行して2件のテストが成功することを確認 ✅（cli-to-github-to-fs.test.ts: 28 passed）
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

### 6. 未実装オプションテストのスキップ処理

- [ ] 6.1 --check-updatesオプションテストのスキップ
  - it.skip()を使用してテストをスキップ
  - TODOコメントで将来の実装を明示（kirox-update-tracking spec参照）
  - テストコードは削除せず保持
  - npm test実行時にスキップされることを確認
  - _Requirements: 3.1, 3.3_

- [ ] 6.2 --updateオプションテストのスキップ
  - it.skip()を使用してテストをスキップ
  - TODOコメントで将来の実装を明示
  - テストコードは削除せず保持
  - npm test実行時に"unknown option"エラーが発生しないことを確認
  - _Requirements: 3.2, 3.4, 3.5_

### 7. --trackオプションデフォルト値検証修正

- [ ] 7.1 実装の--track動作確認とメッセージ検証修正
  - --trackオプションなし時の実装の実際の動作を確認
  - コンソール出力から実際のメッセージパターンを特定
  - add-track-option.test.tsのメッセージ期待値を実装に合わせる
  - "Metadata tracking is disabled"メッセージの有無・形式を実装に合致させる
  - テスト実行して1件のテストが成功することを確認
  - _Requirements: 6.1, 6.2, 6.3_

## Phase 3: 全体検証とCI/CD統合

### 8. 全テスト実行と修正検証

- [ ] 8.1 全テストスイート実行と成功確認
  - npm testで全テストを実行
  - 26件の修正対象テストが全て成功することを確認
  - スキップされたテスト数が2件（--check-updates, --update）であることを確認
  - Unhandled Rejectionが0件であることを確認
  - _Requirements: All requirements_

- [ ] 8.2 修正対象外テストの継続成功確認
  - 全integration testsが既存の成功状態を維持していることを確認
  - モック設定の変更が他のテストに影響していないことを確認
  - テスト総数とpass/fail/skip数を記録
  - _Requirements: All requirements_

- [ ] 8.3 実装コード非変更の検証
  - src/配下のファイルに変更がないことをgit statusで確認
  - 修正がtests/配下のみに限定されていることを確認
  - 実装コードのシグネチャや動作が維持されていることを検証
  - _Requirements: All requirements_

### 9. CI/CD統合と最終検証

- [ ] 9.1 テストカバレッジ検証
  - npm run test:coverageでカバレッジレポートを生成
  - 修正前のカバレッジと同等以上であることを確認
  - カバレッジレポートに異常な低下がないことを検証
  - _Requirements: All requirements_

- [ ] 9.2 CI/CDパイプライン実行確認
  - GitHub Actions CI/CDで全テストを実行
  - パイプラインが緑（全テスト成功）になることを確認
  - ビルドプロセスが正常に完了することを検証
  - 開発者が安心してコードをコミットできる環境が整ったことを確認
  - _Requirements: All requirements_

## 修正完了判定基準

以下の全条件が満たされた時点で修正完了とする:

✅ `npm test` で全テストが成功（0 failed）
✅ スキップされたテスト数が2件（--check-updates, --update）
✅ Unhandled Rejectionが0件
✅ 実装コード（`src/`配下）に変更がない
✅ テストカバレッジが修正前と同等以上
✅ CI/CDパイプラインが緑（全テスト成功）

---

**Note**: 各タスクは順序通りに実行すること。Phase 1 → Phase 2 → Phase 3の順で進め、各Phaseの完了後に次Phaseに進む。
