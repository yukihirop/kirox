# Requirements Document

## Introduction
Kirox CLIにシェル補完機能を追加し、`kirox completion <shell>`コマンドで各シェル用の補完スクリプトを標準出力に表示できるようにします。これにより、ユーザーは各シェル環境でコマンドライン補完を簡単にセットアップでき、Kirox CLIの使いやすさと開発者体験が大幅に向上します。サポート対象は主要な5つのシェル（bash、zsh、fish、powershell、elvish）です。

## Requirements

### Requirement 1: 補完コマンドの基本機能
**Objective:** CLI利用者として、シェル補完スクリプトを簡単に取得できるようにしたい。これにより、各シェル環境でのセットアップ作業が効率化される。

#### Acceptance Criteria

1. WHEN ユーザーが`kirox completion <shell>`コマンドを実行する THEN Kirox CLIは指定されたシェル用の補完スクリプトを標準出力に出力するものとする
2. WHEN ユーザーが`kirox completion bash`を実行する THEN Kirox CLIはbash用の補完スクリプトを出力するものとする
3. WHEN ユーザーが`kirox completion zsh`を実行する THEN Kirox CLIはzsh用の補完スクリプトを出力するものとする
4. WHEN ユーザーが`kirox completion fish`を実行する THEN Kirox CLIはfish用の補完スクリプトを出力するものとする
5. WHEN ユーザーが`kirox completion powershell`を実行する THEN Kirox CLIはPowerShell用の補完スクリプトを出力するものとする
6. WHEN ユーザーが`kirox completion elvish`を実行する THEN Kirox CLIはelvish用の補完スクリプトを出力するものとする

### Requirement 2: 入力バリデーションとエラーハンドリング
**Objective:** CLI利用者として、不正な入力に対して明確なエラーメッセージを受け取りたい。これにより、正しい使い方を素早く理解できる。

#### Acceptance Criteria

1. WHEN ユーザーがシェル名を指定せずに`kirox completion`を実行する THEN Kirox CLIはサポートされているシェルのリストとともに使用方法を表示するものとする
2. WHEN ユーザーがサポートされていないシェル名を指定する THEN Kirox CLIはエラーメッセージとサポートされているシェルのリスト（bash、zsh、fish、powershell、elvish）を表示するものとする
3. WHEN ユーザーが複数のシェル名を指定する THEN Kirox CLIは最初のシェル名のみを使用し、他の引数を無視するものとする
4. IF シェル名の大文字小文字が異なる場合（例：Bash、BASH） THEN Kirox CLIは大文字小文字を区別せずに正しい補完スクリプトを出力するものとする

### Requirement 3: 補完スクリプトの正確性
**Objective:** CLI利用者として、各シェル環境で正常に動作する補完スクリプトを取得したい。これにより、コマンド補完機能が期待通りに動作する。

#### Acceptance Criteria

1. WHEN 生成された補完スクリプトが対応するシェルで読み込まれる THEN そのスクリプトは構文エラーなく実行されるものとする
2. WHEN ユーザーが各シェルで補完スクリプトをインストールする THEN Kirox CLIの全てのサブコマンド（例：`kirox add`、`kirox completion`など）が補完候補として表示されるものとする
3. WHEN ユーザーが各シェルでオプションを入力する THEN Kirox CLIの全てのオプション（例：`--force`、`--dry-run`、`--verbose`など）が補完候補として表示されるものとする
4. WHEN ユーザーがリポジトリ引数を入力する THEN シェルはGitHubリポジトリ形式（owner/repo形式）を示すヘルプテキストを表示するものとする

### Requirement 4: ヘルプメッセージとドキュメント
**Objective:** CLI利用者として、補完機能のセットアップ方法を簡単に理解したい。これにより、各シェル環境での設定作業を迅速に完了できる。

#### Acceptance Criteria

1. WHEN ユーザーが`kirox completion --help`を実行する THEN Kirox CLIは補完コマンドの使用方法、サポートされているシェル、各シェルでのインストール手順を表示するものとする
2. WHEN ユーザーが`kirox help completion`を実行する THEN Kirox CLIは補完コマンドの詳細なヘルプメッセージを表示するものとする
3. WHERE ヘルプメッセージ内 THE Kirox CLIは各シェルでの補完スクリプトのインストール例（例：`kirox completion bash > ~/.kirox-completion.bash`）を提供するものとする

### Requirement 5: 既存CLI構造との統合
**Objective:** 開発者として、補完機能が既存のCLIアーキテクチャと一貫性を保ちたい。これにより、保守性と拡張性が確保される。

#### Acceptance Criteria

1. WHEN 補完コマンドが実装される THEN Commanderのサブコマンド構造に従って`src/cli/`に配置されるものとする
2. IF 新しいサブコマンドやオプションが将来追加される THEN 補完スクリプトは自動的に更新されるか、または手動更新の手順が明確に文書化されるものとする
3. WHEN 補完コマンドが実行される THEN 他のKirox CLIコマンドと同じエラーハンドリングとレポーティング層を使用するものとする
4. WHERE TypeScript型定義 THE 補完コマンドは厳格な型チェック（strict mode）を満たすものとする

### Requirement 6: パフォーマンスと出力形式
**Objective:** CLI利用者として、補完スクリプトの生成が高速で、標準的な形式で出力されることを期待する。これにより、スクリプトのパイプやリダイレクトが問題なく動作する。

#### Acceptance Criteria

1. WHEN ユーザーが補完コマンドを実行する THEN スクリプト生成は100ミリ秒以内に完了するものとする
2. WHEN 補完スクリプトが出力される THEN 標準出力のみに出力し、標準エラー出力には何も出力しないものとする
3. WHEN ユーザーが出力をファイルにリダイレクトする（例：`kirox completion bash > completion.bash`） THEN ファイルに正しい補完スクリプトのみが保存されるものとする
4. WHERE 補完スクリプト内 THE スクリプトはプラットフォーム固有の改行コード（Unix系では`\n`、Windowsでは`\r\n`）を適切に処理するものとする
