# Requirements Document

## Introduction

Kirox CLIのインタラクティブモードにおいて、プロジェクト名の入力をより使いやすくするための機能です。現在、ユーザーはプロジェクト名を手動で入力する必要がありますが、この機能により、リポジトリとサブディレクトリを指定した後、GitHub APIから取得可能なプロジェクト一覧を自動的に取得し、ラジオボタン形式で選択できるようになります。これにより、タイプミスを防ぎ、利用可能なプロジェクトを視覚的に確認できるため、ユーザーエクスペリエンスが大幅に向上します。

## Requirements

### Requirement 1: プロジェクト一覧の自動取得

**Objective:** As a Kirox CLIユーザー, I want リポジトリとサブディレクトリを指定した後に利用可能なプロジェクト一覧が自動的に取得される, so that 手動でプロジェクト名を入力する手間を省き、タイプミスを防ぐことができる

#### Acceptance Criteria

1. WHEN ユーザーがインタラクティブモードでリポジトリ（owner/repo#branch形式）を入力し AND サブディレクトリ（オプション）を入力した THEN Kirox CLI SHALL GitHub APIを呼び出して`.kiro/specs/`ディレクトリ配下のサブディレクトリ一覧を取得する
2. WHEN GitHub APIから`.kiro/specs/`配下のコンテンツを取得する THEN Kirox CLI SHALL `type: 'dir'`のアイテムのみを抽出してプロジェクト候補として処理する
3. IF サブディレクトリパラメータが指定されている THEN Kirox CLI SHALL `{subdir}/.kiro/specs/`パスからプロジェクト一覧を取得する
4. IF サブディレクトリパラメータが指定されていない THEN Kirox CLI SHALL `.kiro/specs/`パスからプロジェクト一覧を取得する
5. WHEN ブランチが指定されている（owner/repo#branch形式） THEN Kirox CLI SHALL GitHub APIの`ref`パラメータに指定されたブランチを渡してコンテンツを取得する

### Requirement 2: ラジオボタン形式での選択UI

**Objective:** As a Kirox CLIユーザー, I want 取得したプロジェクト一覧がラジオボタン形式で表示される, so that 利用可能なプロジェクトを視覚的に確認し、簡単に選択できる

#### Acceptance Criteria

1. WHEN プロジェクト一覧の取得が成功した THEN Kirox CLI SHALL `@inquirer/prompts`ライブラリの`select`プロンプトを使用してラジオボタン形式で選択UIを表示する
2. WHEN ラジオボタンUIが表示される THEN Kirox CLI SHALL 各プロジェクト名を選択肢として表示する
3. WHEN ユーザーが矢印キーで選択肢を移動し AND Enterキーを押す THEN Kirox CLI SHALL 選択されたプロジェクト名を確定する
4. WHEN 単一プロジェクトの選択が完了した THEN Kirox CLI SHALL 選択されたプロジェクト名を`ParsedArguments.projects`配列に格納する

### Requirement 3: 複数プロジェクト選択のサポート

**Objective:** As a Kirox CLIユーザー, I want 複数のプロジェクトをまとめて選択できる, so that 複数プロジェクトを一度に取得する場合の操作を効率化できる

#### Acceptance Criteria

1. WHEN ラジオボタンUIが表示される THEN Kirox CLI SHALL 「複数選択モード」のオプションを提供する
2. WHEN ユーザーが複数選択モードを選択する THEN Kirox CLI SHALL `@inquirer/prompts`ライブラリの`checkbox`プロンプトを使用してチェックボックス形式のUIに切り替える
3. WHEN チェックボックス形式のUIが表示される THEN Kirox CLI SHALL ユーザーがスペースキーで複数のプロジェクトを選択/解除できるようにする
4. WHEN ユーザーが複数のプロジェクトを選択し AND Enterキーを押す THEN Kirox CLI SHALL 選択された全てのプロジェクト名を`ParsedArguments.projects`配列に格納する
5. IF ユーザーが1つもプロジェクトを選択せずにEnterキーを押す THEN Kirox CLI SHALL 「少なくとも1つのプロジェクトを選択してください」というエラーメッセージを表示し AND 再度選択UIを表示する

### Requirement 4: エラーハンドリングとフォールバック

**Objective:** As a Kirox CLIユーザー, I want プロジェクト一覧の取得に失敗した場合でも処理を継続できる, so that ネットワークエラーやリポジトリの問題があっても手動入力で対応できる

#### Acceptance Criteria

1. WHEN GitHub APIからのプロジェクト一覧取得が失敗する（404エラー） THEN Kirox CLI SHALL 「.kiro/specs/ディレクトリが見つかりません」というエラーメッセージを表示し AND 手動入力モードにフォールバックする
2. WHEN GitHub APIからのプロジェクト一覧取得が失敗する（401/403エラー） THEN Kirox CLI SHALL 「認証エラー: GITHUB_TOKENを設定してください」というエラーメッセージを表示し AND 手動入力モードにフォールバックする
3. WHEN GitHub APIからのプロジェクト一覧取得が失敗する（その他のエラー） THEN Kirox CLI SHALL 「プロジェクト一覧の取得に失敗しました」というエラーメッセージを表示し AND 手動入力モードにフォールバックする
4. WHEN 手動入力モードにフォールバックする THEN Kirox CLI SHALL 現在の`promptProject`関数と同じ動作（テキスト入力プロンプト）を提供する
5. WHEN `.kiro/specs/`ディレクトリが空である（プロジェクトが存在しない） THEN Kirox CLI SHALL 「利用可能なプロジェクトが見つかりません」というメッセージを表示し AND 手動入力モードにフォールバックする
6. IF `--verbose`オプションが指定されている THEN Kirox CLI SHALL エラーの詳細情報（エラーメッセージ、ステータスコード）をログに出力する

### Requirement 5: 既存機能との互換性維持

**Objective:** As a Kirox CLI開発者, I want 既存の非インタラクティブモードとの互換性を維持する, so that 既存のワークフローやCI/CD環境で問題なく動作し続ける

#### Acceptance Criteria

1. WHEN ユーザーが非インタラクティブモードでコマンドを実行する（例: `npx kirox owner/repo -p project`） THEN Kirox CLI SHALL プロジェクトサジェスト機能を起動せず AND 指定されたプロジェクト名をそのまま使用する
2. WHEN ユーザーがインタラクティブモードでプロジェクト名を事前に指定する（`-p`オプション使用） THEN Kirox CLI SHALL プロジェクトサジェスト機能をスキップし AND 指定されたプロジェクト名を使用する
3. WHEN 既存の`promptProject`関数が呼び出される THEN Kirox CLI SHALL 新しいプロジェクトサジェスト機能を統合した拡張版として動作する
4. IF TTY環境でない（非対話環境） THEN Kirox CLI SHALL プロジェクトサジェスト機能を起動せず AND 既存のエラーハンドリング（「引数を明示的に指定してください」）を実行する

### Requirement 6: パフォーマンスとユーザーフィードバック

**Objective:** As a Kirox CLIユーザー, I want プロジェクト一覧取得中の状態が視覚的にフィードバックされる, so that 処理が進行していることを確認でき、待ち時間のストレスを軽減できる

#### Acceptance Criteria

1. WHEN GitHub APIを呼び出してプロジェクト一覧を取得する THEN Kirox CLI SHALL 「Fetching available projects...」というローディングメッセージを表示する
2. WHEN プロジェクト一覧の取得が完了する THEN Kirox CLI SHALL ローディングメッセージを消去し AND ラジオボタンUIを表示する
3. WHEN プロジェクト一覧の取得に3秒以上かかる THEN Kirox CLI SHALL 「取得中です。お待ちください...」という追加メッセージを表示する
4. IF `--verbose`オプションが指定されている THEN Kirox CLI SHALL プロジェクト一覧取得のAPI呼び出し詳細（リポジトリ、ブランチ、パス）をログに出力する
