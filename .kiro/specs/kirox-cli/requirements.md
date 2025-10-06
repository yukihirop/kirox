# Requirements Document

## Introduction

Kirox CLIは、リモートGitHubリポジトリからKiro仕様書とステアリングファイルを取得するためのnpxコマンドラインツールです。開発者がプロジェクト間でKiroのSpec-Driven Developmentの成果物を簡単に共有・再利用できるようにすることで、開発の一貫性と効率性を向上させます。

## Requirements

### Requirement 1: リモートリポジトリからのファイル取得
**Objective:** 開発者として、指定したGitHubリポジトリから特定プロジェクトのKiroファイルを取得したい。これにより、他のプロジェクトで作成された仕様書やステアリング情報を自分のローカル環境で利用できるようにする。

#### Acceptance Criteria

1. WHEN ユーザーが `npx kirox <github_user>/<repo_name> -p <project>` コマンドを実行 THEN Kirox CLIはGitHubリポジトリから指定されたプロジェクトの `.kiro/specs/<project>` 配下の全ファイルと `.kiro/steering/` 配下の全ファイルを取得
2. WHEN ユーザーが `-p` オプションでプロジェクト名を指定 THEN Kirox CLIはそのプロジェクト名に対応する `.kiro/specs/<project>` ディレクトリのみを対象とする
3. WHEN ファイル取得が成功 THEN Kirox CLIは取得したファイルを現在のディレクトリの `.kiro/specs/<project>` に配置
4. WHEN リポジトリから `.kiro/steering/**` ファイルを取得 THEN Kirox CLIは全てのステアリングファイルを現在のディレクトリの `.kiro/steering/` に配置

### Requirement 2: エラーハンドリングと検証
**Objective:** 開発者として、不正な入力や通信エラーが発生した場合に明確なエラーメッセージを受け取りたい。これにより、問題を迅速に特定して解決できるようにする。

#### Acceptance Criteria

1. WHEN 指定されたGitHubリポジトリが存在しない THEN Kirox CLIは「リポジトリが見つかりません」というエラーメッセージを表示して終了
2. WHEN 指定されたプロジェクト名に対応する `.kiro/specs/<project>` ディレクトリがリモートリポジトリに存在しない THEN Kirox CLIは「プロジェクトが見つかりません」というエラーメッセージを表示して終了
3. WHEN ネットワークエラーが発生 THEN Kirox CLIは「接続エラーが発生しました」というエラーメッセージを表示して終了
4. WHEN 必須パラメータ（リポジトリ名またはプロジェクト名）が指定されていない THEN Kirox CLIは使用方法のヘルプメッセージを表示
5. WHEN GitHub APIのレート制限に達した THEN Kirox CLIは「API制限に達しました。しばらく待ってから再実行してください」というエラーメッセージを表示して終了
6. WHEN プライベートリポジトリにアクセス権限がない THEN Kirox CLIは「アクセス権限がありません」というエラーメッセージを表示して終了

### Requirement 3: ローカルファイルの上書き制御
**Objective:** 開発者として、既存のローカルファイルを誤って上書きしないように保護されたい。これにより、ローカルで作業中の仕様書が意図せず失われることを防ぐ。

#### Acceptance Criteria

1. WHEN 取得先のローカルディレクトリに既に同名のファイルが存在 THEN Kirox CLIは上書き確認プロンプトを表示
2. WHEN ユーザーが上書き確認プロンプトで「No」を選択 THEN Kirox CLIは該当ファイルをスキップして次のファイルの処理を継続
3. WHEN ユーザーが上書き確認プロンプトで「Yes」を選択 THEN Kirox CLIは既存ファイルを新しいファイルで上書き
4. WHEN ユーザーが `--force` オプションを指定 THEN Kirox CLIは確認プロンプトなしで全てのファイルを上書き

### Requirement 4: 実行フィードバックと進捗表示
**Objective:** 開発者として、ファイル取得処理の進捗状況を把握したい。これにより、処理が正常に進行しているかを確認し、完了までの見通しを持つことができる。

#### Acceptance Criteria

1. WHEN Kirox CLIがファイル取得を開始 THEN 対象リポジトリとプロジェクト名を表示
2. WHILE ファイルを取得中 THEN Kirox CLIは「[1/5] example.md を取得中...」のような形式でファイル名と進捗（現在のファイル数/総ファイル数）を表示
3. WHEN 全てのファイル取得が完了 THEN Kirox CLIは取得したファイル数とディレクトリパスの概要を表示
4. WHEN 一部のファイル取得に失敗 THEN Kirox CLIは成功したファイル数と失敗したファイル数を表示

### Requirement 5: npxによる実行環境
**Objective:** 開発者として、ツールをインストールせずに最新版を直接実行したい。これにより、環境のセットアップ時間を削減し、常に最新機能を利用できるようにする。

#### Acceptance Criteria

1. WHEN ユーザーが `npx kirox` コマンドを実行 THEN Kirox CLIはnpm/npxエコシステムから直接実行可能
2. WHEN Kirox CLIが初回実行される THEN npxは自動的に必要なパッケージをダウンロードして実行
3. WHERE Node.js環境がインストールされている THE Kirox CLIは追加のグローバルインストールなしで実行可能
4. WHEN パッケージのバージョンが更新されている THEN npxは自動的に最新バージョンを取得して実行

### Requirement 6: GitHub API制約への対応
**Objective:** 開発者として、GitHub APIの制約内で安全にファイルを取得したい。これにより、API制限による実行失敗を防ぎ、安定した動作を保証する。

#### Acceptance Criteria

1. WHEN GitHub APIのレート制限に近づいた場合 THEN Kirox CLIは適切な間隔でAPIリクエストを実行
2. WHEN 単一ファイルが1MBを超える場合 THEN Kirox CLIは「ファイルサイズが大きすぎます」という警告メッセージを表示してスキップ
3. WHEN 取得対象ファイルの総数が100個を超える場合 THEN Kirox CLIは「ファイル数が多すぎます」という警告メッセージを表示して終了
