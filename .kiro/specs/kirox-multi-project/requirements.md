# Requirements Document

## Introduction

Kirox CLIは現在、単一のプロジェクトを`-p`オプションで指定して取得する仕組みになっています。本機能では、同じサブディレクトリ内に複数のプロジェクトが存在する場合に、それらをまとめて取得できるようにします。これにより、関連する複数プロジェクトの仕様書を一度の操作で取得でき、開発効率が向上します。

interactiveモードとnon-interactiveモードの両方で複数プロジェクト指定をサポートし、ユーザーが柔軟に利用できるようにします。

## Requirements

### Requirement 1: 複数プロジェクト指定（Non-Interactive Mode）
**Objective:** CLIユーザーとして、コマンドライン引数で複数のプロジェクトを指定して一度に取得したい。これにより、関連するプロジェクトの仕様書を効率的に収集できる。

#### Acceptance Criteria

1. WHEN ユーザーが`-p project1,project2,project3`のようにカンマ区切りで複数プロジェクトを指定 THEN Kirox CLIは指定されたすべてのプロジェクトのファイルを取得するべきである
2. WHEN ユーザーが`--project "project1,project2"`のように引用符でくくって複数プロジェクトを指定 THEN Kirox CLIは正しくパースして取得するべきである
3. IF プロジェクト名にカンマ区切りが含まれる THEN Kirox CLIは各プロジェクト名をトリムして処理するべきである
4. WHEN 複数プロジェクト指定時 THEN Kirox CLIは各プロジェクトの`.kiro/specs/<project-name>`配下のファイルを個別に取得するべきである
5. WHEN 複数プロジェクト指定時 THEN Kirox CLIは`.kiro/steering/`配下のファイルを重複なく一度だけ取得するべきである
6. IF 指定された複数プロジェクトのうち一部が存在しない THEN Kirox CLIは存在するプロジェクトのみを取得し、存在しないプロジェクトについてはエラーメッセージを表示するべきである
7. WHEN 複数プロジェクト指定時に一部のファイル取得が失敗 THEN Kirox CLIは部分的な失敗を許容し、成功したファイルは保存して処理を継続するべきである

### Requirement 2: 複数プロジェクト指定（Interactive Mode）
**Objective:** CLIユーザーとして、対話モードでも複数プロジェクトを指定できるようにしたい。これにより、初心者ユーザーでも複数プロジェクトの取得機能を直感的に利用できる。

#### Acceptance Criteria

1. WHEN 対話モードのプロジェクト名入力プロンプト THEN Kirox CLIは「プロジェクト名を入力してください (カンマ区切りで複数指定可能)」というガイドを表示するべきである
2. IF ユーザーが`project1, project2, project3`のようにカンマ区切りで入力 THEN Kirox CLIは複数プロジェクトとして受け付けるべきである
3. IF ユーザーが単一プロジェクト名を入力 THEN Kirox CLIは従来通り単一プロジェクトとして処理するべきである
4. WHEN 複数プロジェクトを入力 THEN Kirox CLIは確認サマリーで「プロジェクト: project1, project2, project3」のように表示するべきである
5. IF 対話モードで空のプロジェクト名がカンマ区切り内に含まれる（例: `project1,,project2`） THEN Kirox CLIは空の要素を無視して処理するべきである

### Requirement 3: サブディレクトリ制約の検証
**Objective:** システムとして、複数プロジェクト指定が同じサブディレクトリ内のプロジェクトに限定されることを保証したい。これにより、異なるサブディレクトリ間のプロジェクト混在による混乱を防ぐ。

#### Acceptance Criteria

1. WHEN 複数プロジェクトが指定されている THEN Kirox CLIはすべてのプロジェクトが同じサブディレクトリ（または同じroot）から取得されることを検証するべきである
2. IF `--subdir packages/api`が指定されている AND 複数プロジェクトを指定 THEN Kirox CLIは`packages/api/.kiro/specs/`配下の指定されたプロジェクトのみを取得するべきである
3. IF サブディレクトリ指定なし AND 複数プロジェクトを指定 THEN Kirox CLIはroot `.kiro/specs/`配下の指定されたプロジェクトのみを取得するべきである
4. WHEN 複数プロジェクトの一部が指定されたサブディレクトリに存在しない THEN Kirox CLIは「プロジェクトが見つかりません: <subdir>/.kiro/specs/<project-name>」というエラーメッセージを表示するべきである

### Requirement 4: 進捗表示と結果サマリー
**Objective:** CLIユーザーとして、複数プロジェクト取得時の進捗と結果を明確に把握したい。これにより、どのプロジェクトがどの状態か視覚的に理解できる。

#### Acceptance Criteria

1. WHEN 複数プロジェクトの取得を開始 THEN Kirox CLIは「取得対象: N個のプロジェクト (project1, project2, ...)」という情報を表示するべきである
2. WHILE 各プロジェクトのファイルを取得中 THE Kirox CLIは「[project1] ファイル取得中 (1/5)」のようにプロジェクト別の進捗を表示するべきである
3. WHEN すべてのプロジェクトの取得が完了 THEN Kirox CLIはプロジェクト別のサマリー（成功/失敗ファイル数）を表示するべきである
4. WHEN `--verbose`オプション指定時 THEN Kirox CLIは各ファイル取得時に「[project1] <path>を取得中」のようにプロジェクト名を含めて表示するべきである
5. WHEN 複数プロジェクトの取得が完了 THEN Kirox CLIは全体サマリー（合計ファイル数、成功数、失敗数）を表示するべきである

### Requirement 5: 設定ファイルでのデフォルト複数プロジェクト指定
**Objective:** CLIユーザーとして、頻繁に使用する複数プロジェクトの組み合わせを`.kiroxrc.json`に設定したい。これにより、毎回プロジェクト名を入力する手間を省ける。

#### Acceptance Criteria

1. WHEN `.kiroxrc.json`に`project`フィールドが配列形式で設定されている（例: `"project": ["project1", "project2"]`） THEN Kirox CLIは複数プロジェクトとして認識するべきである
2. WHEN `.kiroxrc.json`に`project`フィールドが文字列形式で設定されている（例: `"project": "project1,project2"`) THEN Kirox CLIはカンマ区切りをパースして複数プロジェクトとして認識するべきである
3. WHEN `.kiroxrc.json`に複数プロジェクトが設定されている AND コマンドラインで`-p`オプションが指定されている THEN Kirox CLIはコマンドラインの指定を優先するべきである
4. IF `.kiroxrc.json`に単一プロジェクトが設定されている（例: `"project": "single-project"`) THEN Kirox CLIは従来通り単一プロジェクトとして処理するべきである

### Requirement 6: エラーハンドリングとバリデーション
**Objective:** CLIユーザーとして、複数プロジェクト指定時に発生したエラーを明確に理解したい。これにより、問題を迅速に特定して解決できる。

#### Acceptance Criteria

1. IF 指定された複数プロジェクトのうちすべてが存在しない THEN Kirox CLIは「指定されたプロジェクトがいずれも見つかりません」というエラーメッセージを表示して終了コード1で終了するべきである
2. IF プロジェクト名に不正な文字（`/`, `..`等）が含まれている THEN Kirox CLIは「無効なプロジェクト名です: <name>」というエラーメッセージを表示するべきである
3. WHEN 複数プロジェクト指定時に一部のプロジェクトでGitHub API呼び出しが失敗 THEN Kirox CLIは失敗したプロジェクトをエラーログに記録し、成功したプロジェクトの処理を継続するべきである
4. WHEN 複数プロジェクト指定時にファイル書き込みエラーが発生 THEN Kirox CLIはエラーファイルを記録し、プロジェクト別サマリーに反映するべきである
5. IF 空のプロジェクト名リスト（例: `-p ""`）が指定された THEN Kirox CLIは「プロジェクト名は必須です」というエラーメッセージを表示するべきである

### Requirement 7: メタデータトラッキング（--track）との統合
**Objective:** CLIユーザーとして、複数プロジェクト取得時も`--track`オプションで変更追跡できるようにしたい。これにより、複数プロジェクトの更新管理を効率化できる。

#### Acceptance Criteria

1. WHEN `--track`オプションが指定されている AND 複数プロジェクトを取得 THEN Kirox CLIは各プロジェクトのメタデータを個別に`.kirox-meta.json`に保存するべきである
2. WHEN 複数プロジェクトのメタデータを保存 THEN Kirox CLIは各プロジェクトを別々のプロジェクトエントリとして記録するべきである
3. WHEN `--check-updates`コマンドを実行 AND 複数プロジェクトがトラッキングされている THEN Kirox CLIはすべてのプロジェクトの更新状況を一度にチェックするべきである
4. WHEN `--update`コマンドを実行 AND 複数プロジェクトがトラッキングされている THEN Kirox CLIは更新が必要なすべてのプロジェクトのファイルを更新するべきである

### Requirement 8: 下位互換性の維持
**Objective:** 既存ユーザーとして、単一プロジェクト指定の既存動作が変更されないことを保証したい。これにより、既存のワークフローを維持できる。

#### Acceptance Criteria

1. WHEN ユーザーが単一プロジェクトを指定（例: `-p single-project`） THEN Kirox CLIは従来通りの動作でそのプロジェクトのみを取得するべきである
2. IF 既存の設定ファイル（`"project": "single-project"`）を使用 THEN Kirox CLIは単一プロジェクトとして処理するべきである
3. WHEN 対話モードで単一プロジェクト名のみを入力 THEN Kirox CLIは複数プロジェクトモードに入らず単一プロジェクトとして処理するべきである
4. WHEN 既存のコマンド構文（`npx kirox owner/repo -p project`）を使用 THEN Kirox CLIは変更前と同じ動作をするべきである
