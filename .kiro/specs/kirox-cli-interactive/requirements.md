# Requirements Document

## Introduction

Kirox CLIは現在、すべてのオプションを明示的に指定して実行する必要があります（例: `npx kirox yukihirop/eg-kanban#test -p simple-kanban-board-a -o ./tmp -s lib/a`）。この機能は、オプションを指定せずに`npx kirox`を実行した場合に、ユーザーが対話形式で各パラメータを入力できるようにし、より直感的で使いやすいCLI体験を提供します。

この対話モードにより、初めて使用するユーザーや、複雑なオプションを覚えていないユーザーでも、ガイド付きのプロンプトに従って簡単にKirox CLIを利用できるようになります。

## Requirements

### Requirement 1: 対話モードのトリガー

**Objective:** CLIユーザーとして、オプションなしでコマンドを実行した際に対話モードが自動的に起動することで、必要なパラメータをステップバイステップで入力できるようにしたい

#### Acceptance Criteria

1. WHEN ユーザーが`npx kirox`をオプションなしで実行 THEN Kirox CLIは対話モードを開始するべきである
2. WHEN ユーザーがリポジトリ引数のみを指定して`npx kirox owner/repo`を実行 AND プロジェクト名オプション(-p)が未指定 THEN Kirox CLIは対話モードでプロジェクト名を尋ねるべきである
3. IF リポジトリ引数とプロジェクト名オプションの両方が指定されている THEN Kirox CLIは既存の非対話モードで実行するべきである
4. IF `--check-updates`または`--update`オプションが指定されている THEN Kirox CLIは対話モードをスキップし、既存のコマンド処理を実行するべきである

### Requirement 2: リポジトリ情報の対話的入力

**Objective:** CLIユーザーとして、対話形式でリポジトリ情報を入力することで、GitHub URL形式やブランチ指定の詳細を意識せずに利用できるようにしたい

#### Acceptance Criteria

1. WHEN 対話モードが開始 AND リポジトリ引数が未指定 THEN Kirox CLIは「GitHubリポジトリを入力してください (owner/repo)」というプロンプトを表示するべきである
2. IF ユーザーが`owner/repo`形式でリポジトリを入力 THEN Kirox CLIはその入力を受け付けるべきである
3. IF ユーザーが`owner/repo#branch`形式でブランチ付きリポジトリを入力 THEN Kirox CLIはブランチ情報を含めて受け付けるべきである
4. IF ユーザーが無効な形式でリポジトリを入力 THEN Kirox CLIは「無効な形式です。owner/repo または owner/repo#branch の形式で入力してください」というエラーメッセージを表示し、再入力を促すべきである
5. WHEN ユーザーがリポジトリ入力をキャンセル（Ctrl+C） THEN Kirox CLIは処理を中断し、適切な終了コードで終了するべきである

### Requirement 3: プロジェクト名の対話的入力

**Objective:** CLIユーザーとして、対話形式でプロジェクト名を入力することで、取得したい仕様書を簡単に指定できるようにしたい

#### Acceptance Criteria

1. WHEN リポジトリ情報の入力が完了 AND プロジェクト名オプション(-p)が未指定 THEN Kirox CLIは「プロジェクト名を入力してください」というプロンプトを表示するべきである
2. IF ユーザーがプロジェクト名を入力 THEN Kirox CLIはその入力を受け付けるべきである
3. IF ユーザーが空のプロジェクト名を入力 THEN Kirox CLIは「プロジェクト名は必須です」というエラーメッセージを表示し、再入力を促すべきである
4. WHEN ユーザーがプロジェクト名入力をキャンセル（Ctrl+C） THEN Kirox CLIは処理を中断し、適切な終了コードで終了するべきである

### Requirement 4: オプションパラメータの対話的入力

**Objective:** CLIユーザーとして、対話形式でオプションパラメータ（出力ディレクトリ、サブディレクトリ等）を入力することで、デフォルト値を利用しつつ必要に応じてカスタマイズできるようにしたい

#### Acceptance Criteria

1. WHEN プロジェクト名の入力が完了 THEN Kirox CLIは「出力ディレクトリを入力してください (デフォルト: .)」というプロンプトを表示するべきである
2. IF ユーザーが出力ディレクトリを入力せずEnterを押す THEN Kirox CLIはデフォルト値「.」を使用するべきである
3. IF ユーザーが出力ディレクトリを入力 THEN Kirox CLIはその入力を使用するべきである
4. WHEN 出力ディレクトリの入力が完了 THEN Kirox CLIは「サブディレクトリパスを入力してください (オプション)」というプロンプトを表示するべきである
5. IF ユーザーがサブディレクトリを入力せずEnterを押す THEN Kirox CLIはサブディレクトリなしで実行するべきである
6. IF ユーザーがサブディレクトリを入力 THEN Kirox CLIはその入力を使用するべきである

### Requirement 5: 確認と実行

**Objective:** CLIユーザーとして、入力した内容を実行前に確認できることで、誤った設定で処理が実行されることを防ぎたい

#### Acceptance Criteria

1. WHEN すべてのパラメータの入力が完了 THEN Kirox CLIは入力内容のサマリー（リポジトリ、プロジェクト名、出力ディレクトリ、サブディレクトリ）を表示するべきである
2. WHEN サマリー表示後 THEN Kirox CLIは「この設定で実行しますか? (y/N)」という確認プロンプトを表示するべきである
3. IF ユーザーが「y」または「Y」を入力 THEN Kirox CLIは入力されたパラメータで通常のファイル取得処理を実行するべきである
4. IF ユーザーが「n」または「N」を入力、または空でEnterを押す THEN Kirox CLIは「処理を中断しました」というメッセージを表示し、終了するべきである
5. IF ユーザーが無効な入力をする THEN Kirox CLIは再度確認プロンプトを表示するべきである

### Requirement 6: 非対話モードとの共存

**Objective:** 開発者として、既存の非対話モード（オプション指定方式）と対話モードが問題なく共存し、既存の使用方法に影響を与えないようにしたい

#### Acceptance Criteria

1. WHEN ユーザーが完全なオプションを指定して実行（例: `npx kirox owner/repo -p project`） THEN Kirox CLIは対話モードを起動せず、既存の動作で実行するべきである
2. WHEN ユーザーが`--force`、`--dry-run`、`--verbose`などのフラグオプションを指定 THEN Kirox CLIはそれらのオプションを尊重し、対話モードでの入力をスキップするべきである
3. WHEN ユーザーが`--config`オプションで設定ファイルを指定 THEN Kirox CLIは設定ファイルの内容を読み込み、対話モードでの入力より優先するべきである
4. WHEN 対話モードで入力されたパラメータ AND 既存の設定ファイル（.kiroxrc.json）が存在 THEN Kirox CLIは対話入力値を優先し、設定ファイルはデフォルト値として扱うべきである

### Requirement 7: エラーハンドリングとユーザビリティ

**Objective:** CLIユーザーとして、対話モード中に発生するエラーを理解しやすい形で通知され、適切に回復できるようにしたい

#### Acceptance Criteria

1. IF 対話モード中にユーザーがCtrl+Cで中断 THEN Kirox CLIは「処理を中断しました」というメッセージを表示し、exitCode 130で終了するべきである
2. IF 対話モード中に予期しないエラーが発生 THEN Kirox CLIは適切なエラーメッセージを表示し、既存のエラーハンドリング機構を使用するべきである
3. WHERE ユーザーが無効な入力を行った場所 THE Kirox CLIは明確なエラーメッセージと期待される入力形式の例を表示するべきである
4. WHEN 対話モードで入力が完了し実行開始 THEN Kirox CLIは既存のProgressReporter機能を使用して進捗を表示するべきである
5. IF 対話モード実行後にファイル取得に失敗 THEN Kirox CLIは既存のエラーハンドリング機構を使用してエラーを報告するべきである
