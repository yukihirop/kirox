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

- [x] 2.3 重複プロジェクト検出ロジックを実装
  - 既存メタデータ内のprojects配列から同一リポジトリ+プロジェクト名を検索
  - サブディレクトリが異なる場合は別プロジェクトとして扱う
  - 重複検出時、--forceオプションの有無で動作を分岐
  - --forceなしの場合は警告メッセージを表示してスキップ
  - --forceありの場合はverboseログを表示して上書き続行
  - _Requirements: 1.3, 3.2, 3.3, 3.4_

- [x] 2.4 メタデータ不要モードの実装（メタデータなしでもadd実行可能に）
  - メタデータファイルが存在しない場合、空のメタデータオブジェクトを作成
  - 初回実行時は「新規メタデータファイルを作成します」というメッセージを表示
  - 重複チェックをスキップ（メタデータが存在しないため）
  - インタラクティブモードでのリポジトリ提案をスキップ（既存メタデータがないため）
  - プロジェクトサジェスト機能は通常通り動作（Tree API検索）
  - 確認プロンプトで設定サマリーを表示
  - 処理完了後、新規メタデータファイルを作成
  - _Requirements: 1.6 (修正), 2.2 (拡張)_

- [ ] 3. GitHub取得ロジックをaddコマンドに統合
- [x] 3.1 ディレクトリコンテンツ取得を実装
  - parseRepositoryPath()でリポジトリとブランチを解析
  - 設定ファイルとCLI引数からeffectiveBranchを決定
  - fetchDirectoryContents()でspecsディレクトリのファイル一覧を取得
  - ステアリングファイルは最初のプロジェクトのみ取得（重複回避）
  - _Requirements: 1.4, 1.5, 4.4_

- [x] 3.2 並列ファイル取得を実装
  - fetchFilesInParallel()で複数ファイルを並列取得（セマフォ制御あり）
  - 取得成功/失敗を分類
  - 進捗表示とverboseログの統合
  - 部分的な失敗を許容（Promise.allSettled使用）
  - _Requirements: 5.2, 5.5, 6.1_

- [ ] 4. ファイル書き込みロジックをaddコマンドに統合
- [x] 4.1 ローカルファイルシステムへの書き込みを実装
  - resolveOutputPath()でリモートパス→ローカルパス変換
  - writeFile()で各ファイルを書き込み
  - --forceオプションによる上書き制御
  - --dry-runオプション時は書き込みスキップして実行予定のみ表示
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.2 ファイル書き込み進捗表示を実装
  - reportProgress()で「[1/5] file.md を取得中...」形式の進捗表示
  - reportSuccess()で書き込み成功メッセージを表示
  - reportError()で書き込み失敗メッセージを表示
  - 複数プロジェクト時はプロジェクト名プレフィックスを付与
  - _Requirements: 5.1, 5.2, 5.6_

- [ ] 5. メタデータ更新ロジックを実装
- [x] 5.1 プロジェクトメタデータの作成と保存
  - upsertProject()で新規ProjectMetadataを既存メタデータに追加
  - 各ファイルのSHA、localHash、size、fetchedAtを記録
  - calculateFileHash()でローカルファイルのハッシュを計算
  - upsertFile()で各ファイルメタデータを保存
  - _Requirements: 3.1, 3.5_

- [x] 5.2 アトミックなメタデータ書き込みを実装
  - saveMetadata()でtemp file + renameパターンを使用
  - 書き込み失敗時のロールバック処理
  - 成功時のサマリーメッセージ表示
  - _Requirements: 3.1, 6.3_

- [ ] 6. 複数プロジェクト追加のサポートを実装
- [x] 6.1 プロジェクトループ処理を実装
  - projects配列をループして各プロジェクトを順次処理
  - 各プロジェクトごとに独立したトランザクションとして実行
  - プロジェクトごとの成功/失敗カウントを集計
  - 一部のプロジェクトが失敗しても他のプロジェクトの処理を継続
  - _Requirements: 1.2, 5.4_

- [x] 6.2 プロジェクト別サマリー表示を実装
  - reportProjectSummary()で各プロジェクトの成功/失敗ファイル数を表示
  - reportOverallSummary()で全体の集計結果を表示
  - 複数プロジェクト時のみサマリーを表示
  - _Requirements: 5.3, 5.4_

- [ ] 7. インタラクティブモード対応を実装
- [x] 7.1 インタラクティブモード起動条件を判定
  - shouldEnterInteractiveMode()でリポジトリまたはプロジェクト名が未指定かをチェック
  - TTY環境の確認（process.stdin.isTTY）
  - --check-updates、--updateオプション時はインタラクティブモードをスキップ
  - _Requirements: 2.1_

- [x] 7.2 既存メタデータからのリポジトリ提案機能を実装
  - loadMetadata()で既存プロジェクト一覧を取得
  - 最後に使用したリポジトリをデフォルト値として提案
  - promptRepository()でリポジトリ入力プロンプトを表示
  - _Requirements: 2.2_

- [x] 7.3 プロジェクトサジェスト機能との統合
  - Tree API検索を使用して利用可能なプロジェクト一覧を取得
  - promptProjectSelection()で検索可能なチェックボックスUIを表示
  - 複数プロジェクト選択をサポート
  - サジェスト失敗時は手動入力にフォールバック
  - _Requirements: 2.3, 2.6_

- [x] 7.4 確認プロンプトを実装
  - confirmExecution()で「以下のプロジェクトを追加します」という確認メッセージを表示
  - リポジトリ、プロジェクト名、output、subdirの設定サマリーを表示
  - ユーザーが拒否した場合は「操作がキャンセルされました」と表示して終了コード0で終了
  - _Requirements: 2.4, 2.5_

- [ ] 8. エラーハンドリングとリカバリを実装
- [x] 8.1 ネットワークエラーハンドリングを実装
  - GitHub API呼び出し時のネットワークエラーをキャッチ
  - 「Network error: {details}. Check your internet connection.」というメッセージを表示
  - 成功したファイルのメタデータのみを保存
  - 部分的成功として処理を継続
  - _Requirements: 6.1_

- [x] 8.2 GitHub APIレート制限ハンドリングを実装
  - レート制限エラーをキャッチ
  - 「GitHub API rate limit exceeded. Please wait {minutes} minutes.」というメッセージを表示
  - レート制限リセット時刻を計算して表示
  - 終了コード2で終了
  - _Requirements: 6.2_

- [x] 8.3 ディスク容量不足エラーハンドリングを実装
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

- [ ] 8.5 .kiroフォルダ不在エラーハンドリングを実装
  - fetchDirectoryContents()で404エラーをキャッチ
  - 「.kiro folder not found」エラー時に明確なメッセージを表示
  - 「指定されたリポジトリ・ブランチ・サブディレクトリに.kiroフォルダが存在しません」というユーザーフレンドリーなメッセージに変換
  - リポジトリ、ブランチ、サブディレクトリの確認を促すガイダンスを表示
  - 終了コード1で終了（ユーザーエラー）
  - _Requirements: 3.6 (新規)_

- [x] 8.6 インタラクティブモードで設定されたsubdirがconfig.subdirに反映されない問題を修正（BUG FIX）
  - **問題**: Tree API経由でプロジェクト選択した際にargs.subdirは正しく設定されるが、mergeConfig()実行後のconfig.subdirには反映されず、buildRemotePath()呼び出し時に空文字列が使用されてしまう
  - **再現手順**:
    1. インタラクティブモードで実行: `npm run dev -- add`
    2. リポジトリ入力: `yukihirop/eg-kanban`
    3. ブランチ選択: `test`
    4. プロジェクト選択: `lib/a/simple-kanban-board-b` (Tree APIで検出)
    5. エラー発生: `.kiro folder not found on branch test`
  - **根本原因**:
    - `interactive-prompt.ts:473-474`でargs.subdirは正しく設定される（例: "lib/a"）
    - しかし`add-command-entry.ts:112`のmergeConfig()は、インタラクティブモードの**前**に実行される
    - そのため、インタラクティブモードで設定されたargs.subdirがconfig.subdirに反映されない
    - `add-command-entry.ts:311`で`config.subdir`（空文字列）が使用され、正しいパスが構築されない
  - **影響範囲**:
    - `add-command-entry.ts`の設定マージタイミング（line 112）
    - `add-command-entry.ts`のsubdir使用箇所（line 311, 339, 354）
  - **修正内容**:
    - **アプローチA（採用）**: インタラクティブモード後に再マージ
      - `add-command-entry.ts:112`で`const config`を`let config`に変更
      - `add-command-entry.ts:197`（インタラクティブモード完了後）で、`config = mergeConfig(args, fileConfig)`を再実行
      - 既存のmergeConfig()を再利用して、更新されたargs.subdirをconfig.subdirに反映
  - **テスト確認項目**:
    - ✅ mergeConfig()がインタラクティブモード前後で2回呼ばれることを確認（ユニットテスト）
    - ✅ 2回目の呼び出しでargs.subdirに正しい値が渡されることを確認（ユニットテスト）
    - ✅ 全テスト実行で1489テストが通過、既存機能にリグレッションなし
  - _Requirements: 7.3 (修正), 2.1 (設定マージ), 3.1 (buildRemotePath)_

- [x] 8.7 addコマンドでステアリングファイルの重複取得を防止（BUG FIX）
  - **問題**: addコマンドで2回目以降のプロジェクトを追加する際、既にローカルに存在するステアリングファイルを再度取得・保存してしまう
  - **再現手順**:
    1. 初回実行: `npm run dev -- add`でプロジェクトAを追加（ステアリングファイル取得）
    2. 2回目実行: `npm run dev -- add`でプロジェクトBを追加
    3. 結果: ステアリングファイル（product.md, tech.md, testing.md, structure.md）が再度取得・保存される
  - **期待動作**: ステアリングファイルが既にローカルに存在する場合は、取得・保存をスキップする
  - **根本原因**:
    - `add-command-entry.ts`のファイル取得ロジックで、ステアリングファイルの存在チェックが行われていない
    - 現在の実装は「最初のプロジェクトのみステアリングファイルを取得」という制御になっているが、これは同一実行内の制御であり、既存ファイルのチェックではない
  - **影響範囲**:
    - `add-command-entry.ts`のファイル取得ロジック（ステアリングファイル処理部分）
    - ファイル書き込み前の存在チェックロジック
  - **修正内容**:
    - **アプローチA（採用）**: ステアリングファイル取得前に存在チェックを追加
      - ステアリングファイル（`.kiro/steering/*.md`）のローカルパスを構築
      - `fs.existsSync()`で各ステアリングファイルの存在をチェック
      - 既に存在するファイルは取得リストから除外
      - Verboseモードで「Steering file already exists, skipping: {filename}」とログ出力
      - `add-command-entry.ts:386-407`に実装追加
    - **アプローチB（代替案）**: --forceオプションの動作を拡張
      - --forceオプション指定時のみステアリングファイルを上書き
      - デフォルト（--forceなし）は既存ステアリングファイルをスキップ
  - **テスト確認項目**:
    - ✅ 初回add実行でステアリングファイルが取得されることを確認（ユニットテスト）
    - ✅ 2回目add実行でステアリングファイルがスキップされることを確認（ユニットテスト）
    - ✅ --forceオプション時にステアリングファイルが上書きされることを確認（ユニットテスト）
    - ✅ プロジェクトファイル（specs配下）は通常通り取得されることを確認（ユニットテスト）
    - ✅ 全テスト実行で1493テストが通過、既存機能にリグレッションなし
  - _Requirements: 4.4 (ステアリングファイル重複回避), 4.1-4.2 (ファイル書き込み制御)_

- [x] 8.8 インタラクティブモード開始前のメタデータ読み込みタイミングを修正（BUG FIX）
  - **問題**: インタラクティブモードでoutput directory入力前に`.kiro/.kirox-meta.json`のパスが決定され、「Creating new metadata file」というメッセージが表示されてしまう
  - **再現手順**:
    1. インタラクティブモードで実行: `npm run dev -- add`
    2. リポジトリ入力プロンプトが表示される前に、`[INFO] Creating new metadata file {"path":".kiro/.kirox-meta.json"}`というログが出力される
    3. この時点ではユーザーがoutput directoryを指定していないため、メタデータファイルのパスが不正
  - **期待動作**:
    - インタラクティブモードでoutput directoryが確定してからメタデータファイルのパスを決定する
    - メタデータ読み込みは、全ての引数（repository, projects, output）が確定した後に行う
  - **根本原因**:
    - `add-command-entry.ts:127`で`getMetadataPath(args.output)`を呼び出している
    - この時点では`args.output`はデフォルト値（`.`）のまま
    - インタラクティブモードで`args.output`が更新される前にメタデータパスが決定される
    - `loadMetadata()`呼び出しも同じタイミングで実行される（line 135）
  - **影響範囲**:
    - `add-command-entry.ts`のメタデータ読み込みタイミング（line 123-167）
    - インタラクティブモード完了後のメタデータパス再計算（追加が必要）
  - **修正内容**:
    - **アプローチA（採用）**: インタラクティブモード前後でメタデータ読み込みを分岐
      - Non-interactiveモード: 現在の動作を維持（引数パース直後にメタデータ読み込み）
      - Interactiveモード: `promptMissingArguments()`完了後にメタデータパスを再計算して読み込み
      - `shouldEnterInteractiveMode()`の結果でメタデータ読み込みタイミングを制御
      - インタラクティブモード時のメタデータは、リポジトリ提案には使わない（既存メタデータなしとして扱う）
      - `add-command-entry.ts:132-267`で実装完了
  - **テスト確認項目**:
    - [x] Non-interactiveモードでメタデータが即座に読み込まれることを確認
    - [x] Interactiveモードでoutput確定後にメタデータが読み込まれることを確認
    - [x] Interactive mode開始時に不正なメタデータパスでログが出力されないことを確認
    - [x] Task 8.8のテスト3件全て通過
  - _Requirements: 2.2 (メタデータ存在チェック), 7.2 (リポジトリ提案), 8.1-8.4 (設定ファイル統合)_

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

- [ ] 10.3 ヘルプテキストの英語化とChalkスタイリング（IMPROVEMENT）
  - **問題**: 現在のヘルプ出力に日本語テキストが混在しており、カラーリングによる視覚的な区別もない
  - **再現手順**:
    1. `npm run dev -- --help`を実行
    2. ヘルプテキスト内に日本語が含まれている（例: "Multiple projects (カンマ区切りで複数プロジェクトを指定)"、"Note: ブランチ指定は#の後に指定"）
    3. 全体的にモノクロ出力で可読性が低い
  - **期待動作**:
    - すべてのヘルプテキストを英語に統一する
    - Chalkを使用してセクション見出し、オプション、例などを色分けして可読性を向上させる
  - **影響範囲**:
    - `src/cli/main.ts`のHelp text sections（各`.option()`、`.addHelpText()`呼び出し）
    - 日本語テキストを含むオプション説明とサンプルコマンド
  - **修正内容**:
    - 全ての日本語テキストを英語に翻訳
    - Chalkでスタイリング追加:
      - セクション見出し: `chalk.bold.blue`
      - オプション名: `chalk.yellow`
      - 例: `chalk.green`
      - 説明文: デフォルト（白）
  - **テスト確認項目**:
    - [ ] `npm run dev -- --help`実行時に日本語が含まれないことを確認
    - [ ] Chalkによる色分けが適切に表示されることを確認
    - [ ] ヘルプテキストの構造（セクション、オプション、例）が変更されていないことを確認
  - _Requirements: 9.1 (ヘルプテキスト改善), language.md (英語化ポリシー)_

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
