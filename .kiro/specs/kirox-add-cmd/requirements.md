# Requirements Document

## Introduction

Kirox CLIは現在、初回実行時に取得したプロジェクトをメタデータファイル（`.kirox-meta.json`）でトラッキングしています。しかし、後から新しいプロジェクトを追加で取得したい場合、既存のメタデータに追加する方法がなく、再度全プロジェクトを取得するか、メタデータを手動編集する必要があります。

本機能では、`add`サブコマンドを実装し、既存のメタデータに新しいプロジェクトを追加できるようにします。これにより、段階的なプロジェクト追加が可能となり、ユーザーの利便性が向上します。

interactiveモードとnon-interactiveモードの両方で動作し、既存のkiroxワークフローとシームレスに統合されます。

## Requirements

### Requirement 1: Non-Interactive Mode での追加コマンド
**Objective:** CLIユーザーとして、コマンドライン引数で新しいプロジェクトを既存メタデータに追加したい。これにより、スクリプトやCI/CD環境での自動化が可能になる。

#### Acceptance Criteria

1. WHEN ユーザーが`npx kirox add owner/repo -p new-project`を実行 THEN Kirox CLIは既存メタデータに`new-project`を追加してファイルを取得するべきである
2. WHEN ユーザーが`npx kirox add owner/repo -p proj1,proj2`のように複数プロジェクトを指定 THEN Kirox CLIは指定されたすべてのプロジェクトを既存メタデータに追加するべきである
3. WHEN `add`コマンドを実行 AND 指定されたプロジェクトが既にメタデータに存在する THEN Kirox CLIは「プロジェクトは既に追加されています」という警告を表示して処理をスキップするべきである
4. WHEN `add`コマンドを実行 AND リポジトリ指定にブランチが含まれる（例: `owner/repo#feature`） THEN Kirox CLIは指定されたブランチからファイルを取得するべきである
5. WHEN `add`コマンドを実行 AND `--subdir`オプションが指定されている THEN Kirox CLIは指定されたサブディレクトリからプロジェクトを取得するべきである
6. IF メタデータファイル（`.kirox-meta.json`）が存在しない THEN Kirox CLIは「メタデータファイルが見つかりません。先に通常のfetchコマンドを実行してください」というエラーメッセージを表示するべきである
7. WHEN 新しいプロジェクトの追加が成功 THEN Kirox CLIはメタデータを更新してファイル数とプロジェクト名をサマリー表示するべきである

### Requirement 2: Interactive Mode での追加コマンド
**Objective:** CLIユーザーとして、対話モードで新しいプロジェクトを追加したい。これにより、初心者ユーザーでも段階的にプロジェクトを追加できる。

#### Acceptance Criteria

1. WHEN ユーザーが引数なしで`npx kirox add`を実行 THEN Kirox CLIはインタラクティブモードに入り、リポジトリとプロジェクト名の入力を促すべきである
2. WHEN インタラクティブモードのリポジトリプロンプト THEN Kirox CLIは既存メタデータからデフォルト値（最後に使用したリポジトリ）を提案するべきである
3. WHEN インタラクティブモードのプロジェクト名プロンプト THEN Kirox CLIはプロジェクトサジェスト機能（Tree API検索）を使用して利用可能なプロジェクト一覧を表示するべきである
4. WHEN インタラクティブモードで確認プロンプト THEN Kirox CLIは「以下のプロジェクトを追加します」という確認メッセージと設定サマリーを表示するべきである
5. IF ユーザーが確認プロンプトで拒否 THEN Kirox CLIは「操作がキャンセルされました」と表示して終了コード0で終了するべきである
6. WHEN インタラクティブモードで複数プロジェクトを選択 THEN Kirox CLIは検索可能なチェックボックスUIで複数選択を可能にするべきである

### Requirement 3: メタデータ統合とバリデーション
**Objective:** システムとして、既存メタデータとの整合性を保ちながら新しいプロジェクトを追加したい。これにより、データの一貫性が維持される。

#### Acceptance Criteria

1. WHEN 新しいプロジェクトを追加 THEN Kirox CLIは既存メタデータの`projects`配列に新しい`ProjectMetadata`エントリを追加するべきである
2. WHEN 同じリポジトリ・同じプロジェクト名が既に存在する AND `--force`オプションが指定されていない THEN Kirox CLIは追加をスキップして警告メッセージを表示するべきである
3. WHEN 同じリポジトリ・同じプロジェクト名が既に存在する AND `--force`オプションが指定されている THEN Kirox CLIは既存エントリを上書き更新するべきである
4. WHEN 異なるサブディレクトリから同じプロジェクト名を追加 THEN Kirox CLIは別のプロジェクトエントリとして追加するべきである（サブディレクトリが異なるため）
5. WHEN 新しいプロジェクトのファイルを取得 THEN Kirox CLIは各ファイルのSHA、ハッシュ、サイズ、取得日時をメタデータに記録するべきである
6. IF 追加対象のプロジェクトがリモートリポジトリに存在しない THEN Kirox CLIは「プロジェクトが見つかりません」というエラーを表示して終了コード1で終了するべきである

### Requirement 4: ファイル書き込みと上書き制御
**Objective:** CLIユーザーとして、既存ファイルとの競合を適切に処理したい。これにより、意図しないファイル上書きを防げる。

#### Acceptance Criteria

1. WHEN 追加するプロジェクトのファイルがローカルに既に存在する AND `--force`オプションが指定されていない THEN Kirox CLIは上書き確認プロンプトを表示するべきである
2. WHEN `--force`オプションが指定されている THEN Kirox CLIは確認なしで既存ファイルを上書きするべきである
3. WHEN `--dry-run`オプションが指定されている THEN Kirox CLIは実際のファイル書き込みとメタデータ更新をスキップして、実行予定の操作のみを表示するべきである
4. WHEN ステアリングファイル（`.kiro/steering/`）が既に存在する THEN Kirox CLIは重複取得を避けてステアリングファイルの取得をスキップするべきである
5. IF 書き込み権限エラーが発生 THEN Kirox CLIは「ファイル書き込みに失敗しました」というエラーメッセージを表示してプロジェクト追加を中止するべきである

### Requirement 5: 進捗表示とサマリー
**Objective:** CLIユーザーとして、追加操作の進捗と結果を視覚的に把握したい。これにより、操作の透明性が向上する。

#### Acceptance Criteria

1. WHEN `add`コマンドを開始 THEN Kirox CLIは「プロジェクトを追加中: <project-name>」という開始メッセージを表示するべきである
2. WHILE ファイルを取得中 THE Kirox CLIは「[1/5] file.md を取得中...」のような進捗インジケータを表示するべきである
3. WHEN すべてのファイル取得が完了 THEN Kirox CLIは「✓ 追加完了: N個のファイルを取得しました」というサマリーメッセージを表示するべきである
4. WHEN 複数プロジェクトを追加 THEN Kirox CLIは各プロジェクトごとのサマリー（成功ファイル数・失敗ファイル数）を表示するべきである
5. WHEN `--verbose`オプション指定時 THEN Kirox CLIは各ファイルの詳細情報（SHA、サイズ、パス）を表示するべきである
6. IF 一部のファイル取得が失敗 THEN Kirox CLIは失敗したファイルのリストとエラー理由を表示するべきである

### Requirement 6: エラーハンドリングと復旧
**Objective:** システムとして、追加操作中のエラーを適切にハンドリングして既存データを保護したい。これにより、部分的な失敗時もメタデータの一貫性が保たれる。

#### Acceptance Criteria

1. WHEN ファイル取得中にネットワークエラーが発生 THEN Kirox CLIはエラーメッセージを表示し、成功したファイルのメタデータのみを保存するべきである
2. WHEN GitHub APIレート制限に達した THEN Kirox CLIは「APIレート制限に達しました。しばらく待ってから再試行してください」というメッセージを表示するべきである
3. WHEN メタデータファイルの更新に失敗 THEN Kirox CLIは「メタデータの更新に失敗しました」というエラーを表示し、取得したファイルは保持するべきである
4. IF ディスク容量不足でファイル書き込みが失敗 THEN Kirox CLIは「ディスク容量が不足しています」というエラーメッセージを表示して操作を中止するべきである
5. WHEN Ctrl+Cで操作を中断 THEN Kirox CLIは「操作が中断されました」と表示し、部分的に追加されたメタデータをロールバックするべきである

### Requirement 7: 既存機能との統合
**Objective:** CLIユーザーとして、`add`コマンドで追加したプロジェクトも`--check-updates`や`--update`で管理したい。これにより、一貫した更新管理ワークフローが実現する。

#### Acceptance Criteria

1. WHEN `add`コマンドでプロジェクトを追加 AND その後`npx kirox --check-updates`を実行 THEN Kirox CLIは追加されたプロジェクトの更新状況もチェックするべきである
2. WHEN `add`コマンドで複数プロジェクトを追加 AND `npx kirox --update`を実行 THEN Kirox CLIは追加されたすべてのプロジェクトの更新を適用するべきである
3. WHEN `add`コマンドで追加したプロジェクトのファイルをローカルで編集 AND `--check-updates`を実行 THEN Kirox CLIは「ローカルで編集されています」という警告を表示するべきである
4. WHEN 既存プロジェクトと新規追加プロジェクトが混在している AND `--update`を実行 THEN Kirox CLIは両方のプロジェクトを更新対象として処理するべきである

### Requirement 8: 設定ファイルとの統合
**Objective:** CLIユーザーとして、`.kiroxrc.json`の設定を`add`コマンドでも利用したい。これにより、一貫した設定管理が可能になる。

#### Acceptance Criteria

1. WHEN `.kiroxrc.json`に`outputDirectory`が設定されている THEN Kirox CLIは`add`コマンドでもその設定を使用するべきである
2. WHEN `.kiroxrc.json`に`subdir`が設定されている AND コマンドラインで`--subdir`が指定されていない THEN Kirox CLIは設定ファイルの値を使用するべきである
3. WHEN コマンドラインオプションと設定ファイルの両方に値がある THEN Kirox CLIはコマンドラインオプションを優先するべきである
4. WHEN `--config <path>`オプションで別の設定ファイルを指定 THEN Kirox CLIは指定された設定ファイルを使用するべきである

### Requirement 9: 下位互換性とヘルプ表示
**Objective:** 既存ユーザーとして、`add`コマンドの使い方を簡単に理解したい。また、既存の通常fetchコマンドの動作が影響を受けないことを保証したい。

#### Acceptance Criteria

1. WHEN `npx kirox add --help`を実行 THEN Kirox CLIは`add`コマンドの使用方法、オプション、使用例を表示するべきである
2. WHEN `npx kirox --help`を実行 THEN Kirox CLIはメインコマンドと`add`サブコマンドの両方の情報を表示するべきである
3. WHEN 既存の`npx kirox owner/repo -p project`コマンドを実行 THEN Kirox CLIは従来通りの動作（新規fetch）をするべきである
4. WHEN `add`コマンド以外の既存機能（`--check-updates`, `--update`） THEN Kirox CLIは変更前と同じ動作をするべきである
