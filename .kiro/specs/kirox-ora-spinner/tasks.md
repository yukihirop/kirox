# Implementation Plan

## Overview

このタスクプランは、kirox CLIの進捗表示機能を `ora` スピナーライブラリを使った一体型表示に改善する実装タスクを定義します。TDD (Test-Driven Development) アプローチに従い、各タスクでテストを先に作成し、その後実装を行います。

---

- [x] 1. ora パッケージのインストールと基本セットアップ
  - package.json に ora 依存関係を追加 (npm install ora)
  - TypeScript ビルドが正常に動作することを確認
  - ora パッケージが正しくインポートできることを検証
  - _Requirements: 1.1_

- [x] 2. ProgressReporter クラスにスピナー管理機能を追加
- [x] 2.1 スピナー管理の内部状態を設計
  - プロジェクト名をキーとしたスピナーインスタンス管理用のMapを追加
  - スピナー初期化失敗時のフォールバックフラグを追加
  - ora 初期化オプションを保持する内部設定を追加
  - _Requirements: 1.3, 5.1_

- [x] 2.2 コンストラクタにスピナー初期化ロジックを実装
  - ReporterOptions から ora 設定オプションを生成する機能を実装
  - 色出力設定 (useColor) を ora の color オプションにマッピング
  - スピナー初期化のエラーハンドリングとフォールバックフラグ設定を実装
  - verboseモード時にフォールバック警告メッセージを出力
  - _Requirements: 1.1, 1.2, 8.1_

- [x] 3. reportProgress メソッドをスピナーベースに移行
- [x] 3.1 シングルプロジェクトモードのスピナー進捗表示を実装
  - プロジェクト名なし (デフォルトスピナー) の場合のスピナー取得または生成機能を実装
  - スピナー未開始時に進捗テキストでスピナーを開始
  - スピナー動作中の場合は .text プロパティで進捗テキストを更新
  - フォールバックモード時は既存のconsole.log実装を使用
  - _Requirements: 2.1, 2.2, 2.7, 3.1, 3.2, 3.3, 3.4_

- [x] 3.2 マルチプロジェクトモードのスピナー管理を実装
  - プロジェクト名をキーとしてスピナーをMapから取得または新規作成
  - プロジェクト名プレフィックス付きの進捗テキストフォーマットを実装
  - 各プロジェクトのスピナーが独立して動作することを保証
  - _Requirements: 2.3, 5.1, 5.2, 5.4_

- [x] 4. reportSuccess と reportError メソッドをスピナー統合
- [x] 4.1 reportSuccess メソッドをoraのsucceedに置き換え
  - フォールバックモードでない場合、現在のスピナーを .succeed() で停止
  - 成功メッセージを引数としてsucceedメソッドに渡す
  - フォールバックモード時は既存のconsole.log実装を使用
  - _Requirements: 2.5, 4.1, 4.3, 4.5_

- [x] 4.2 reportError メソッドをoraのfailに置き換え
  - フォールバックモードでない場合、現在のスピナーを .fail() で停止
  - エラーメッセージを引数としてfailメソッドに渡す
  - フォールバックモード時は既存のconsole.error実装を使用
  - _Requirements: 2.6, 4.2, 4.4, 4.5_

- [x] 5. スピナーのライフサイクル管理機能を実装
- [x] 5.1 reportProjectSummary メソッドでスピナーをクリーンアップ
  - プロジェクト完了時に該当スピナーをMapから削除
  - スピナーが動作中の場合は停止してから削除
  - プロジェクトサマリーメッセージをconsole.logで出力
  - _Requirements: 5.3, 6.3, 6.5_

- [x] 5.2 reportSummary と reportOverallSummary でスピナー停止を保証
  - すべてのアクティブなスピナーを停止してからサマリー表示
  - Map内の全スピナーをクリア
  - サマリー情報をconsole.logで出力
  - _Requirements: 6.5, 7.4_

- [ ] 6. 既存機能との互換性を維持
- [ ] 6.1 verboseモードでの詳細ログ表示を継続サポート
  - スピナー動作中でもverboseメッセージをconsole.logで出力
  - スピナー表示と詳細ログが干渉しないことを確認
  - _Requirements: 7.1_

- [ ] 6.2 dry-runモードでスピナーを開始しない
  - reportDryRunFileList メソッドでスピナーを使用しない
  - ファイルリスト表示にはconsole.logを継続使用
  - _Requirements: 7.2_

- [ ] 6.3 useColor設定をoraに正しく伝播
  - useColor=false時にoraのcolorオプションをfalseに設定
  - 色無効化が正しく動作することを確認
  - _Requirements: 1.2, 7.3_

- [ ] 7. エラーハンドリングとフォールバック機構を強化
- [ ] 7.1 スピナー初期化失敗時のグレースフルフォールバック
  - コンストラクタでoraインスタンス生成エラーを捕捉
  - エラー発生時にuseFallbackフラグをtrueに設定
  - verboseモード時に警告メッセージを出力
  - _Requirements: 8.1_

- [ ] 7.2 スピナー操作失敗時のエラーリカバリー
  - reportProgress, reportSuccess, reportError 内でスピナー操作をtry-catchで囲む
  - エラー発生時にverboseモードで警告を出力し、フォールバックに切り替え
  - ファイル取得処理は中断せず継続
  - _Requirements: 8.2, 8.3_

- [ ] 8. ユニットテストの実装 (TDD RED-GREEN-REFACTOR)
- [ ] 8.1 スピナー初期化と設定のテスト
  - 色出力有効時にoraが正しい設定で初期化されることをテスト
  - 色出力無効時にoraのcolorオプションがfalseになることをテスト
  - ora初期化失敗時にuseFallbackがtrueに設定されることをテスト
  - _Requirements: 1.1, 1.2, 8.1_

- [ ] 8.2 スピナーMap管理機能のテスト
  - 新しいプロジェクト名でreportProgressを呼び出すと新しいスピナーがMapに追加されることをテスト
  - 既存プロジェクト名でreportProgressを呼び出すとスピナーの.textが更新されることをテスト
  - reportProjectSummary呼び出し後にスピナーがMapから削除されることをテスト
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8.3 フォールバックモードのテスト
  - useFallback=true時にreportProgressがconsole.logを呼び出すことをテスト
  - スピナー操作エラー発生時にフォールバックに切り替わることをテスト
  - _Requirements: 8.1, 8.2_

- [ ] 8.4 reportSuccessとreportErrorのスピナー統合テスト
  - useFallback=false時にreportSuccessがspinner.succeed()を呼び出すことをテスト
  - useFallback=false時にreportErrorがspinner.fail()を呼び出すことをテスト
  - _Requirements: 4.1, 4.2_

- [ ] 9. 統合テストの実装
- [ ] 9.1 CLI EntryとProgressReporterの統合テスト
  - シングルプロジェクトのファイル取得時にスピナーが正しく動作することをテスト
  - マルチプロジェクトのファイル取得時に各プロジェクトが独立したスピナーを持つことをテスト
  - _Requirements: 2.1, 2.2, 2.3, 5.1_

- [ ] 9.2 非TTY環境でのフォールバック動作テスト
  - process.stdout.isTTY=falseの環境でフォールバックモードが動作することをテスト
  - _Requirements: 8.1_

- [ ] 9.3 verboseモードとスピナー表示の共存テスト
  - --verboseオプション時にスピナー表示と詳細ログが両方出力されることをテスト
  - _Requirements: 7.1_

- [ ] 9.4 dry-runモードでスピナーが開始されないことをテスト
  - --dry-runモード時にスピナーが開始されず、ファイルリストのみ表示されることをテスト
  - _Requirements: 7.2_

- [ ] 10. E2Eテストの実装
- [ ] 10.1 実際のファイル取得フローでスピナー動作を確認
  - 実際のGitHubリポジトリ (モック) からファイルを取得し、スピナー表示が正しく動作することを目視確認または出力キャプチャでテスト
  - _Requirements: 2.1, 2.2, 2.5, 2.6_

- [ ] 10.2 マルチプロジェクト取得でスピナー進捗を確認
  - 複数プロジェクトを指定した実行で各プロジェクトのスピナーが独立して動作することを確認
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 10.3 エラー発生時のスピナーfail状態を確認
  - ファイル取得エラー発生時にスピナーが.fail()で停止し、エラーメッセージが表示されることを確認
  - _Requirements: 2.6, 4.2_

- [ ] 11. パフォーマンステストの実装
- [ ] 11.1 スピナーテキスト更新レイテンシを測定
  - spinner.textの更新が10ms以内に完了することを測定
  - _Requirements: 9.1_

- [ ] 11.2 高頻度更新時のパフォーマンスを検証
  - reportProgressを1秒間に10回以上呼び出した際にファイル取得操作にラグが発生しないことを確認
  - _Requirements: 9.2_

- [ ] 11.3 マルチプロジェクトスピナーの応答性を検証
  - 5つのプロジェクトで同時にスピナーを動作させた際、すべてのスピナーがスムーズにアニメーションすることを確認
  - _Requirements: 9.3_

- [ ] 12. 既存テストスイートの回帰テスト実行
  - 既存の685テストがすべて合格することを確認
  - テスト失敗がある場合は実装を修正
  - _Requirements: All requirements (回帰防止)_

- [ ] 13. ドキュメントとクリーンアップ
- [ ] 13.1 コード内のコメントを更新
  - スピナー関連の新しいロジックに対してTSDocコメントを追加
  - フォールバック機構の動作をコメントで説明
  - _Requirements: Documentation_

- [ ] 13.2 未使用コードのクリーンアップ
  - デバッグ用のconsole.logがあれば削除
  - 不要なインポートを削除
  - _Requirements: Code quality_
