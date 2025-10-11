# 実装計画

- [ ] 1. コマンドパーサーにaddサブコマンドを追加
- [x] 1.1 Commander.jsでaddサブコマンドを定義
  - サブコマンドの引数とオプションを設定（repository、-p、--force、--dry-run、--verbose、--config、--subdir、-o）
  - サブコマンドのdescriptionとhelpテキストを追加
  - サブコマンドのアクションハンドラーを設定し、executeAddCommand()を呼び出す
  - 既存のmainコマンドパースロジックに影響を与えないことを確認
  - _Requirements: 1.1, 1.2, 9.1, 9.2_

- [x] 1.2 addコマンド用の引数パース処理を実装
  - リポジトリ引数のパース（owner/repo形式、ブランチ指定サポート）
  - プロジェクト名のカンマ区切りパース（複数プロジェクト対応）
  - オプションのデフォルト値設定
  - track オプションを常にtrueに設定（addコマンド専用動作）
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [ ] 2. addコマンド専用エントリポイントを作成
- [x] 2.1 executeAddCommand関数の基本構造を実装
  - 引数の受け取りとバリデーション
  - Logger、ErrorHandler、ProgressReporterの初期化
  - 設定ファイルの読み込みとマージ
  - 実行結果（ExecutionResult）の返却構造を定義
  - _Requirements: 1.1, 8.1, 8.2, 8.3, 8.4_

- [x] 2.2 メタデータ存在チェックロジックを実装
  - loadMetadata()を呼び出して既存メタデータを読み込み
  - MetadataError.NOT_FOUNDをキャッチしてエラーメッセージを表示
  - エラー時に「先に通常のfetchコマンドを実行してください」というガイダンスを表示
  - 終了コード1で即座に終了
  - _Requirements: 1.6_

- [ ] 2.3 重複プロジェクト検出ロジックを実装
  - 既存メタデータ内のprojects配列から同一リポジトリ+プロジェクト名を検索
  - サブディレクトリが異なる場合は別プロジェクトとして扱う
  - 重複検出時、--forceオプションの有無で動作を分岐
  - --forceなしの場合は警告メッセージを表示してスキップ
  - --forceありの場合はverboseログを表示して上書き続行
  - _Requirements: 1.3, 3.2, 3.3, 3.4_

- [ ] 3. GitHub取得ロジックをaddコマンドに統合
- [ ] 3.1 ディレクトリコンテンツ取得を実装
  - parseRepositoryPath()でリポジトリとブランチを解析
  - 設定ファイルとCLI引数からeffectiveBranchを決定
  - fetchDirectoryContents()でspecsディレクトリのファイル一覧を取得
  - ステアリングファイルは最初のプロジェクトのみ取得（重複回避）
  - _Requirements: 1.4, 1.5, 4.4_

- [ ] 3.2 並列ファイル取得を実装
  - fetchFilesInParallel()で複数ファイルを並列取得（セマフォ制御あり）
  - 取得成功/失敗を分類
  - 進捗表示とverboseログの統合
  - 部分的な失敗を許容（Promise.allSettled使用）
  - _Requirements: 5.2, 5.5, 6.1_

- [ ] 4. ファイル書き込みロジックをaddコマンドに統合
- [ ] 4.1 ローカルファイルシステムへの書き込みを実装
  - resolveOutputPath()でリモートパス→ローカルパス変換
  - writeFile()で各ファイルを書き込み
  - --forceオプションによる上書き制御
  - --dry-runオプション時は書き込みスキップして実行予定のみ表示
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4.2 ファイル書き込み進捗表示を実装
  - reportProgress()で「[1/5] file.md を取得中...」形式の進捗表示
  - reportSuccess()で書き込み成功メッセージを表示
  - reportError()で書き込み失敗メッセージを表示
  - 複数プロジェクト時はプロジェクト名プレフィックスを付与
  - _Requirements: 5.1, 5.2, 5.6_

- [ ] 5. メタデータ更新ロジックを実装
- [ ] 5.1 プロジェクトメタデータの作成と保存
  - upsertProject()で新規ProjectMetadataを既存メタデータに追加
  - 各ファイルのSHA、localHash、size、fetchedAtを記録
  - calculateFileHash()でローカルファイルのハッシュを計算
  - upsertFile()で各ファイルメタデータを保存
  - _Requirements: 3.1, 3.5_

- [ ] 5.2 アトミックなメタデータ書き込みを実装
  - saveMetadata()でtemp file + renameパターンを使用
  - 書き込み失敗時のロールバック処理
  - 成功時のサマリーメッセージ表示
  - _Requirements: 3.1, 6.3_

- [ ] 6. 複数プロジェクト追加のサポートを実装
- [ ] 6.1 プロジェクトループ処理を実装
  - projects配列をループして各プロジェクトを順次処理
  - 各プロジェクトごとに独立したトランザクションとして実行
  - プロジェクトごとの成功/失敗カウントを集計
  - 一部のプロジェクトが失敗しても他のプロジェクトの処理を継続
  - _Requirements: 1.2, 5.4_

- [ ] 6.2 プロジェクト別サマリー表示を実装
  - reportProjectSummary()で各プロジェクトの成功/失敗ファイル数を表示
  - reportOverallSummary()で全体の集計結果を表示
  - 複数プロジェクト時のみサマリーを表示
  - _Requirements: 5.3, 5.4_

- [ ] 7. インタラクティブモード対応を実装
- [ ] 7.1 インタラクティブモード起動条件を判定
  - shouldEnterInteractiveMode()でリポジトリまたはプロジェクト名が未指定かをチェック
  - TTY環境の確認（process.stdin.isTTY）
  - --check-updates、--updateオプション時はインタラクティブモードをスキップ
  - _Requirements: 2.1_

- [ ] 7.2 既存メタデータからのリポジトリ提案機能を実装
  - loadMetadata()で既存プロジェクト一覧を取得
  - 最後に使用したリポジトリをデフォルト値として提案
  - promptRepository()でリポジトリ入力プロンプトを表示
  - _Requirements: 2.2_

- [ ] 7.3 プロジェクトサジェスト機能との統合
  - Tree API検索を使用して利用可能なプロジェクト一覧を取得
  - promptProjectSelection()で検索可能なチェックボックスUIを表示
  - 複数プロジェクト選択をサポート
  - サジェスト失敗時は手動入力にフォールバック
  - _Requirements: 2.3, 2.6_

- [ ] 7.4 確認プロンプトを実装
  - confirmExecution()で「以下のプロジェクトを追加します」という確認メッセージを表示
  - リポジトリ、プロジェクト名、output、subdirの設定サマリーを表示
  - ユーザーが拒否した場合は「操作がキャンセルされました」と表示して終了コード0で終了
  - _Requirements: 2.4, 2.5_

- [ ] 8. エラーハンドリングとリカバリを実装
- [ ] 8.1 ネットワークエラーハンドリングを実装
  - GitHub API呼び出し時のネットワークエラーをキャッチ
  - 「Network error: {details}. Check your internet connection.」というメッセージを表示
  - 成功したファイルのメタデータのみを保存
  - 部分的成功として処理を継続
  - _Requirements: 6.1_

- [ ] 8.2 GitHub APIレート制限ハンドリングを実装
  - レート制限エラーをキャッチ
  - 「GitHub API rate limit exceeded. Please wait {minutes} minutes.」というメッセージを表示
  - レート制限リセット時刻を計算して表示
  - 終了コード2で終了
  - _Requirements: 6.2_

- [ ] 8.3 ディスク容量不足エラーハンドリングを実装
  - ファイル書き込み時のディスク容量エラーをキャッチ
  - 「Disk space error: {details}. Free up space and retry.」というメッセージを表示
  - 操作を中止して終了コード2で終了
  - _Requirements: 6.4_

- [ ] 8.4 Ctrl+C中断ハンドリングを実装
  - プロセスシグナルをキャッチ
  - 「操作が中断されました」と表示
  - 部分的に追加されたメタデータのロールバック処理
  - 既存メタデータの整合性を保護
  - _Requirements: 6.5_

- [ ] 9. 既存機能との統合を確認
- [ ] 9.1 --check-updates機能との統合を確認
  - addコマンドで追加したプロジェクトが--check-updatesで認識されることを確認
  - 既存プロジェクトと新規追加プロジェクトが両方チェックされることを確認
  - ローカル編集されたファイルが正しく検出されることを確認
  - _Requirements: 7.1, 7.3_

- [ ] 9.2 --update機能との統合を確認
  - addコマンドで追加した複数プロジェクトが--updateで更新可能であることを確認
  - 既存プロジェクトと新規追加プロジェクトが両方更新されることを確認
  - 更新の適用が正しく行われることを確認
  - _Requirements: 7.2, 7.4_

- [ ] 10. ヘルプテキストとドキュメントを追加
- [ ] 10.1 addサブコマンドのヘルプテキストを実装
  - .description()でaddコマンドの説明を追加
  - .addHelpText()で使用例とオプション説明を追加
  - 「npx kirox add --help」で適切なヘルプが表示されることを確認
  - _Requirements: 9.1_

- [ ] 10.2 メインコマンドのヘルプテキストを更新
  - メインコマンドのヘルプにaddサブコマンドの情報を追加
  - 「npx kirox --help」でメインコマンドとaddサブコマンドの両方が表示されることを確認
  - 既存コマンドのヘルプが変更されていないことを確認
  - _Requirements: 9.2_

- [ ] 11. 単体テストを実装
- [ ] 11.1 addサブコマンドパーサーのテストを実装
  - サブコマンドが正しくルーティングされることをテスト
  - サブコマンドオプションが正しくパースされることをテスト
  - mainコマンドとの干渉がないことをテスト
  - _Requirements: Testing Strategy - Unit Tests_

- [ ] 11.2 重複プロジェクト検出ロジックのテストを実装
  - 重複プロジェクトが正確に検出されることをテスト
  - サブディレクトリが異なる同名プロジェクトが別として扱われることをテスト
  - --forceオプションによる上書き動作をテスト
  - _Requirements: Testing Strategy - Unit Tests_

- [ ] 11.3 メタデータ存在チェックのテストを実装
  - メタデータファイル不存在時のエラーメッセージをテスト
  - 正しいエラーメッセージと終了コードが返されることをテスト
  - _Requirements: Testing Strategy - Unit Tests_

- [ ] 12. 統合テストを実装
- [ ] 12.1 CLI → Metadata Manager統合テストを実装
  - addコマンド実行の完全なフローをテスト（引数パース → メタデータチェック → GitHub取得 → ファイル書き込み → メタデータ更新）
  - 複数プロジェクト追加時の部分的失敗ハンドリングをテスト
  - _Requirements: Testing Strategy - Integration Tests_

- [ ] 12.2 Interactive Mode統合テストを実装
  - 対話モードでのリポジトリ提案をテスト（既存メタデータから）
  - Tree API検索とプロジェクト選択UIの統合をテスト
  - 確認プロンプトのキャンセル処理をテスト
  - _Requirements: Testing Strategy - Integration Tests_

- [ ] 12.3 既存機能との統合テストを実装
  - addで追加したプロジェクトが--check-updatesで認識されることをテスト
  - addで追加したプロジェクトが--updateで更新可能なことをテスト
  - _Requirements: Testing Strategy - Integration Tests_

- [ ] 13. E2Eテストを実装
- [ ] 13.1 Non-Interactive Mode基本フローのE2Eテストを実装
  - 「npx kirox add owner/repo -p new-project」で新規プロジェクト追加をテスト
  - メタデータファイルに正しく追加されることをテスト
  - ファイルが正しくディスクに書き込まれることをテスト
  - _Requirements: Testing Strategy - E2E Tests_

- [ ] 13.2 Interactive Mode基本フローのE2Eテストを実装
  - 引数なしで「npx kirox add」を実行してインタラクティブモードに入ることをテスト
  - リポジトリとプロジェクトの対話的選択をテスト
  - 確認プロンプトでの実行をテスト
  - _Requirements: Testing Strategy - E2E Tests_

- [ ] 13.3 エラーシナリオのE2Eテストを実装
  - メタデータファイル不存在時のエラー表示をテスト
  - 重複プロジェクト追加時の警告と--force動作をテスト
  - GitHub API失敗時の部分的成功ハンドリングをテスト
  - _Requirements: Testing Strategy - E2E Tests_

- [ ] 13.4 複数プロジェクト追加のE2Eテストを実装
  - 「npx kirox add owner/repo -p proj1,proj2,proj3」で複数プロジェクト追加をテスト
  - 各プロジェクトが独立してメタデータに追加されることをテスト
  - 一部失敗時の成功プロジェクトのみ保存されることをテスト
  - _Requirements: Testing Strategy - E2E Tests_

- [ ] 14. 下位互換性と既存動作の確認
- [ ] 14.1 既存fetchコマンドの動作確認
  - 「npx kirox owner/repo -p project」が従来通り動作することを確認
  - mainコマンドのオプションが変更されていないことを確認
  - 既存のテストスイートが全て合格することを確認
  - _Requirements: 9.3, 9.4_
