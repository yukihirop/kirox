# Requirements Document

## Introduction

Kirox CLIは現在、リモートリポジトリのrootディレクトリにある`.kiro/specs/<project>`と`.kiro/steering/`配下のファイルのみを取得できます。本機能では、リポジトリのサブディレクトリに配置された`.kiro`フォルダからもファイルを取得できるようにし、モノレポ構成やマルチプロジェクト構成のリポジトリに対応します。

これにより、以下のような構成のリポジトリからも仕様書とステアリングファイルを取得できるようになります：
- `packages/api/.kiro/`
- `services/auth/.kiro/`
- `apps/frontend/.kiro/`

## Requirements

### Requirement 1: サブディレクトリ指定オプションの追加
**Objective:** ユーザーとして、リポジトリのサブディレクトリにある.kiroフォルダを指定して取得したい。これにより、モノレポやマルチプロジェクト構成のリポジトリから特定のプロジェクトの仕様書を取得できる。

#### Acceptance Criteria

1. WHEN ユーザーが`--subdir <path>`オプションを指定 THEN Kirox CLIはリポジトリの指定されたサブディレクトリ配下の`.kiro`フォルダからファイルを取得する
2. WHEN ユーザーが`-s <path>`ショートオプションを指定 THEN Kirox CLIは`--subdir`と同じ動作をする
3. IF `--subdir`オプションが指定されていない THEN Kirox CLIは従来通りrootディレクトリの`.kiro`フォルダからファイルを取得する
4. WHEN サブディレクトリパスが`/`で始まる THEN Kirox CLIは先頭の`/`を除去してルートからの相対パスとして処理する
5. WHEN サブディレクトリパスが`./`で始まる THEN Kirox CLIは`./`を除去して処理する
6. WHEN サブディレクトリパスが末尾`/`で終わる THEN Kirox CLIは末尾の`/`を除去して処理する
7. WHEN サブディレクトリパスに連続した`/`が含まれる THEN Kirox CLIは単一の`/`に正規化して処理する
8. WHEN サブディレクトリパスが`\.` または空文字 THEN Kirox CLIはrootディレクトリを使用する
9. WHEN サブディレクトリパスにバックスラッシュ`\`が含まれる THEN Kirox CLIは`/`に変換して処理する

### Requirement 2: 設定ファイルでのデフォルトサブディレクトリ指定
**Objective:** ユーザーとして、頻繁に使用するサブディレクトリを`.kiroxrc.json`に設定したい。これにより、毎回`--subdir`オプションを指定する手間を省ける。

#### Acceptance Criteria

1. WHEN `.kiroxrc.json`に`subdir`フィールドが設定されている AND `--subdir`オプションが指定されていない THEN Kirox CLIは設定ファイルのサブディレクトリパスを使用する
2. WHEN `.kiroxrc.json`に`subdir`フィールドが設定されている AND `--subdir`オプションも指定されている THEN Kirox CLIはコマンドラインオプションを優先する
3. IF `.kiroxrc.json`の`subdir`フィールドが空文字列 THEN Kirox CLIはrootディレクトリを使用する
4. WHEN `--subdir ""`（空文字）が指定 AND `.kiroxrc.json`に`subdir`が設定されている THEN Kirox CLIはrootディレクトリを使用する（CLI指定を優先）
5. WHEN `--subdir ""`（空文字）が指定 THEN Kirox CLIはrootディレクトリを使用する

### Requirement 3: パス検証とエラーハンドリング
**Objective:** ユーザーとして、無効なサブディレクトリパスを指定した際に明確なエラーメッセージを受け取りたい。これにより、問題を迅速に特定して修正できる。

#### Acceptance Criteria

1. WHEN 指定されたサブディレクトリがリポジトリに存在しない THEN Kirox CLIは「指定されたサブディレクトリが見つかりません: <path>」というエラーメッセージを表示して終了する
2. WHEN 指定されたサブディレクトリに`.kiro`フォルダが存在しない THEN Kirox CLIは「サブディレクトリに.kiroフォルダが見つかりません: <path>/.kiro」というエラーメッセージを表示して終了する
3. WHEN サブディレクトリパスに不正な文字（`..`、絶対パス等）が含まれている THEN Kirox CLIは「無効なサブディレクトリパスです: <path>」というエラーメッセージを表示して終了する
4. IF サブディレクトリパスの検証に失敗 THEN Kirox CLIは終了コード1で終了する

### Requirement 4: プロジェクト指定との併用
**Objective:** ユーザーとして、サブディレクトリ指定と`--project`オプションを併用したい。これにより、サブディレクトリ配下の特定プロジェクトの仕様書のみを取得できる。

#### Acceptance Criteria

1. WHEN `--subdir <path>` AND `--project <name>`が両方指定されている THEN Kirox CLIは`<path>/.kiro/specs/<name>`のファイルのみを取得する
2. WHEN `--subdir <path>`のみ指定されている AND `--project`が指定されていない THEN Kirox CLIは`<path>/.kiro/specs/`配下の全プロジェクトと`<path>/.kiro/steering/`配下の全ファイルを取得する
3. IF `--subdir`指定時に`--project`で指定されたプロジェクトが存在しない THEN Kirox CLIは「プロジェクトが見つかりません: <path>/.kiro/specs/<name>」というエラーメッセージを表示する
4. WHEN `--project <name>` に`/`、`..`等の不正な文字が含まれている THEN Kirox CLIは「無効なプロジェクト名です: <name>」というエラーメッセージを表示して終了する（終了コード1）

### Requirement 5: 進捗表示とログ出力
**Objective:** ユーザーとして、サブディレクトリから取得している際も取得元のパスを明確に把握したい。これにより、意図したディレクトリからファイルを取得していることを確認できる。

#### Acceptance Criteria

1. WHEN サブディレクトリからファイル取得を開始 THEN Kirox CLIは「取得元: <owner>/<repo>/<subdir>/.kiro」という情報を表示する
2. WHEN `--verbose`オプション指定時 THEN Kirox CLIは各ファイル取得時に「<owner>/<repo>/<subdir>/.kiro/<file-path>から取得中」と表示する
3. WHEN ファイル取得完了時 THEN Kirox CLIのサマリーに取得元サブディレクトリパスを含める
4. WHEN サブディレクトリが未指定（root使用）の場合 THEN Kirox CLIは「取得元: <owner>/<repo>/.kiro」と表示し、サマリーにも同様のパスを含める

### Requirement 6: 下位互換性の維持
**Objective:** 既存ユーザーとして、サブディレクトリオプションを指定しなくても従来通りの動作を保証したい。これにより、既存のワークフローを変更せずに利用し続けられる。

#### Acceptance Criteria

1. WHEN `--subdir`オプションを指定しない AND `.kiroxrc.json`にも`subdir`設定がない THEN Kirox CLIは従来通りrootディレクトリの`.kiro`から取得する
2. IF 既存のコマンド構文（`npx kirox owner/repo -p project`）を使用 THEN Kirox CLIは変更前と同じ動作をする
3. WHEN 既存の`.kiroxrc.json`（`subdir`フィールドなし）を使用 THEN Kirox CLIはエラーを発生させずに動作する

### Requirement 7: ヘルプとドキュメント
**Objective:** ユーザーとして、`--subdir`オプションの使い方をヘルプで確認したい。これにより、オプションの正しい使用方法を理解できる。

#### Acceptance Criteria

1. WHEN `npx kirox --help`を実行 THEN Kirox CLIは`--subdir, -s <path>`オプションの説明を表示する
2. WHERE ヘルプメッセージ内 THE Kirox CLIは`--subdir`オプションの使用例を含める（例: `npx kirox owner/repo --subdir packages/api -p my-project`）
3. WHEN `--subdir`オプションの説明を表示 THEN Kirox CLIは「リポジトリのサブディレクトリ配下の.kiroフォルダを指定」という説明を含める
