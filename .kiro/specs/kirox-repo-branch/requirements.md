# Requirements Document

## Introduction

Kirox CLIは現在、リポジトリ参照時に`owner/repo`形式のみをサポートしており、デフォルトブランチ（通常は`main`または`master`）からファイルを取得します。本機能では、`owner/repo#branch`形式でブランチを明示的に指定できるようにし、開発ブランチやリリースブランチから直接`.kiro`ファイルを取得できるようにします。

これにより、以下のようなユースケースが可能になります：
- 開発中の機能ブランチから最新の仕様書を取得（例: `owner/repo#feature/new-api`）
- 特定のリリースブランチから安定版の仕様書を取得（例: `owner/repo#release/v2.0`）
- タグを指定して特定バージョンの仕様書を取得（例: `owner/repo#v1.2.3`）

## Requirements

### Requirement 1: ブランチ指定構文のサポート
**Objective:** ユーザーとして、`owner/repo#branch`形式でリポジトリとブランチを指定したい。これにより、デフォルトブランチ以外から`.kiro`ファイルを取得できる。

#### Acceptance Criteria

1. WHEN ユーザーが`owner/repo#branch`形式でリポジトリを指定 THEN Kirox CLIは指定されたブランチから`.kiro`ファイルを取得する
2. WHEN ユーザーが`owner/repo#feature/new-feature`形式でスラッシュを含むブランチ名を指定 THEN Kirox CLIは正しくブランチを解析して取得する
3. WHEN ユーザーが`owner/repo#v1.2.3`形式でタグを指定 THEN Kirox CLIは指定されたタグから`.kiro`ファイルを取得する
4. IF ブランチ指定が省略されている（`owner/repo`形式） THEN Kirox CLIはリポジトリのデフォルトブランチから取得する
5. WHEN ユーザーが`owner/repo#`形式（`#`のみで空ブランチ名）を指定 THEN Kirox CLIはデフォルトブランチから取得する

### Requirement 2: ブランチ名の検証
**Objective:** ユーザーとして、無効なブランチ名を指定した際に明確なエラーメッセージを受け取りたい。これにより、問題を迅速に特定して修正できる。

#### Acceptance Criteria

1. WHEN 指定されたブランチがリポジトリに存在しない THEN Kirox CLIは「ブランチが見つかりません: <branch>」というエラーメッセージを表示して終了する
2. WHEN ブランチ名に不正な文字（スペース、タブ、制御文字等）が含まれている THEN Kirox CLIは「無効なブランチ名です: <branch>」というエラーメッセージを表示して終了する
3. IF ブランチ名の検証に失敗 THEN Kirox CLIは終了コード1で終了する
4. WHEN GitHub API がブランチ取得時にエラーを返す THEN Kirox CLIは「ブランチへのアクセスに失敗しました: <branch>（権限不足の可能性があります）」というエラーメッセージを表示する

### Requirement 3: リポジトリパース処理の拡張
**Objective:** システムとして、`owner/repo#branch`形式のパース処理を実装し、既存の`owner/repo`形式との互換性を維持したい。これにより、内部的に正しくowner、repo、branchを抽出できる。

#### Acceptance Criteria

1. WHEN `owner/repo#branch`形式が入力される THEN Kirox CLIは`owner`、`repo`、`branch`の3つの要素に正しく分割する
2. WHEN `owner/repo`形式（ブランチ指定なし）が入力される THEN Kirox CLIは`owner`、`repo`を抽出し、`branch`を`undefined`として処理する
3. WHEN リポジトリパスに複数の`#`が含まれる THEN Kirox CLIは最初の`#`をブランチセパレータとして扱い、それ以降を全てブランチ名として処理する
4. IF リポジトリパスが`#`のみで始まる OR `/#`を含む THEN Kirox CLIは「無効なリポジトリ形式です: owner/repo#branch形式で指定してください」というエラーメッセージを表示する
5. WHEN ブランチ名に`/`が含まれる（例: `feature/new-api`） THEN Kirox CLIは正しく全体をブランチ名として認識する

### Requirement 4: GitHub API統合の拡張
**Objective:** システムとして、GitHub APIの`ref`パラメータを使用してブランチ指定に対応したい。これにより、指定されたブランチから正しくファイルを取得できる。

#### Acceptance Criteria

1. WHEN ブランチが指定されている THEN Kirox CLIはGitHub API呼び出し時に`ref`パラメータとしてブランチ名を渡す
2. WHEN デフォルトブランチを使用する THEN Kirox CLIは`ref`パラメータを省略する（GitHub APIのデフォルト動作を利用）
3. IF GitHub APIがブランチ指定でファイルを返す THEN Kirox CLIは正しくファイル内容を取得してローカルに保存する
4. WHEN 指定されたブランチに`.kiro`ディレクトリが存在しない THEN Kirox CLIは「ブランチ<branch>に.kiroフォルダが見つかりません」というエラーメッセージを表示する

### Requirement 5: 設定ファイルでのデフォルトブランチ指定
**Objective:** ユーザーとして、頻繁に使用するブランチを`.kiroxrc.json`に設定したい。これにより、毎回ブランチを指定する手間を省ける。

#### Acceptance Criteria

1. WHEN `.kiroxrc.json`に`branch`フィールドが設定されている AND コマンドラインでブランチが指定されていない THEN Kirox CLIは設定ファイルのブランチを使用する
2. WHEN `.kiroxrc.json`に`branch`フィールドが設定されている AND コマンドラインでも`owner/repo#branch`形式でブランチが指定されている THEN Kirox CLIはコマンドライン指定を優先する
3. IF `.kiroxrc.json`の`branch`フィールドが空文字列 THEN Kirox CLIはデフォルトブランチを使用する
4. WHEN 設定ファイルに無効なブランチ名が指定されている THEN Kirox CLIは起動時に「設定ファイルのブランチ名が無効です: <branch>」というエラーメッセージを表示する

### Requirement 6: 進捗表示とログ出力
**Objective:** ユーザーとして、どのブランチからファイルを取得しているか明確に把握したい。これにより、意図したブランチからファイルを取得していることを確認できる。

#### Acceptance Criteria

1. WHEN ブランチを指定してファイル取得を開始 THEN Kirox CLIは「取得元: <owner>/<repo> (ブランチ: <branch>)」という情報を表示する
2. WHEN デフォルトブランチから取得を開始 THEN Kirox CLIは「取得元: <owner>/<repo> (デフォルトブランチ)」という情報を表示する
3. WHEN `--verbose`オプション指定時 THEN Kirox CLIは各ファイル取得時に「<owner>/<repo>#<branch>/<file-path>から取得中」と表示する
4. WHEN ファイル取得完了時 THEN Kirox CLIのサマリーに取得元ブランチ情報を含める

### Requirement 7: サブディレクトリオプションとの併用
**Objective:** ユーザーとして、ブランチ指定と`--subdir`オプションを併用したい。これにより、特定ブランチの特定サブディレクトリから`.kiro`ファイルを取得できる。

#### Acceptance Criteria

1. WHEN `owner/repo#branch` AND `--subdir <path>`が両方指定されている THEN Kirox CLIは指定されたブランチの指定されたサブディレクトリから`.kiro`ファイルを取得する
2. WHEN `owner/repo#branch` AND `--subdir <path>` AND `--project <name>`が全て指定されている THEN Kirox CLIは指定されたブランチ、サブディレクトリ、プロジェクトの組み合わせで正しく取得する
3. IF ブランチ指定とサブディレクトリ指定の組み合わせで`.kiro`が見つからない THEN Kirox CLIは「ブランチ<branch>のサブディレクトリ<subdir>に.kiroフォルダが見つかりません」というエラーメッセージを表示する

### Requirement 8: 下位互換性の維持
**Objective:** 既存ユーザーとして、ブランチ指定を使用しなくても従来通りの動作を保証したい。これにより、既存のワークフローを変更せずに利用し続けられる。

#### Acceptance Criteria

1. WHEN ブランチ指定を含まない`owner/repo`形式を使用 THEN Kirox CLIは従来通りデフォルトブランチから取得する
2. IF 既存のコマンド構文（`npx kirox owner/repo -p project`）を使用 THEN Kirox CLIは変更前と同じ動作をする
3. WHEN 既存の`.kiroxrc.json`（`branch`フィールドなし）を使用 THEN Kirox CLIはエラーを発生させずに動作する
4. IF `--subdir`オプションのみを使用（ブランチ指定なし） THEN Kirox CLIはデフォルトブランチの指定されたサブディレクトリから取得する

### Requirement 9: ヘルプとドキュメント
**Objective:** ユーザーとして、ブランチ指定の使い方をヘルプで確認したい。これにより、新しい構文の正しい使用方法を理解できる。

#### Acceptance Criteria

1. WHEN `npx kirox --help`を実行 THEN Kirox CLIはリポジトリ引数の説明に`owner/repo#branch`形式の例を含める
2. WHERE ヘルプメッセージ内 THE Kirox CLIはブランチ指定の使用例を含める（例: `npx kirox owner/repo#feature/new-api -p my-project`）
3. WHEN ヘルプメッセージを表示 THEN Kirox CLIは「ブランチ指定は#の後に指定（例: owner/repo#develop）」という説明を含める
