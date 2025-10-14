# Requirements Document

## Introduction

Kirox CLIのインタラクティブモードは、ユーザーに対して複数の質問プロンプトを表示して入力を求めます。現在の実装では、質問メッセージがテキストのみで構成されており、視覚的な魅力に欠けています。

本機能では、各質問メッセージの先頭に適切な絵文字を追加することで、インタラクティブモードのユーザー体験を向上させます。絵文字は各質問の意味を視覚的に伝え、より親しみやすく使いやすいインターフェースを提供します。

## Requirements

### 要件1: リポジトリ入力プロンプトへの絵文字追加
**Objective:** インタラクティブモードユーザーとして、リポジトリ入力プロンプトに絵文字が表示されることで、視覚的に分かりやすいインターフェースを使用したい。

#### Acceptance Criteria

1. WHEN Kirox CLIがインタラクティブモードでリポジトリ入力を求める THEN Kirox CLIは質問メッセージの先頭に📦絵文字を表示する
2. WHEN リポジトリ入力プロンプトが表示される THEN Kirox CLIはメッセージ形式を「📦 Enter GitHub repository (owner/repo or owner/repo#branch)」とする
3. WHERE デフォルトリポジトリが提案される場合 THE Kirox CLIは絵文字の後にメッセージとデフォルト値を表示する

### 要件2: ブランチ選択プロンプトへの絵文字追加
**Objective:** インタラクティブモードユーザーとして、ブランチ選択プロンプトに絵文字が表示されることで、ブランチ選択操作を視覚的に認識しやすくしたい。

#### Acceptance Criteria

1. WHEN Kirox CLIがインタラクティブモードでブランチ選択を求める THEN Kirox CLIは質問メッセージの先頭に🌿絵文字を表示する
2. WHEN ブランチ選択プロンプトが表示される THEN Kirox CLIはメッセージ形式を「🌿 Select branch (type to filter, space to select, enter to confirm)」とする

### 要件3: プロジェクト選択プロンプトへの絵文字追加
**Objective:** インタラクティブモードユーザーとして、プロジェクト選択プロンプトに絵文字が表示されることで、プロジェクト選択操作を視覚的に理解しやすくしたい。

#### Acceptance Criteria

1. WHEN Kirox CLIがTree API検索結果からプロジェクト選択を求める THEN Kirox CLIは質問メッセージの先頭に📋絵文字を表示する
2. WHEN プロジェクト選択プロンプトが表示される THEN Kirox CLIはメッセージ形式を「📋 Select projects (type to filter, space to select, enter to confirm)」とする

### 要件4: プロジェクト名入力プロンプトへの絵文字追加
**Objective:** インタラクティブモードユーザーとして、手動プロジェクト名入力プロンプトに絵文字が表示されることで、入力内容を視覚的に把握しやすくしたい。

#### Acceptance Criteria

1. WHEN Kirox CLIがインタラクティブモードで手動プロジェクト名入力を求める THEN Kirox CLIは質問メッセージの先頭に📋絵文字を表示する
2. WHEN 手動プロジェクト名入力プロンプトが表示される THEN Kirox CLIはメッセージ形式を「📋 Enter project name (comma-separated for multiple projects)」とする

### 要件5: 出力ディレクトリ入力プロンプトへの絵文字追加
**Objective:** インタラクティブモードユーザーとして、出力ディレクトリ入力プロンプトに絵文字が表示されることで、ファイル保存先の指定操作を視覚的に認識しやすくしたい。

#### Acceptance Criteria

1. WHEN Kirox CLIがインタラクティブモードで出力ディレクトリ入力を求める THEN Kirox CLIは質問メッセージの先頭に📂絵文字を表示する
2. WHEN 出力ディレクトリ入力プロンプトが表示される THEN Kirox CLIはメッセージ形式を「📂 Enter output directory (default: [value])」とする

### 要件6: サブディレクトリ選択プロンプトへの絵文字追加
**Objective:** インタラクティブモードユーザーとして、サブディレクトリ選択プロンプト（--steeringモード用）に絵文字が表示されることで、ディレクトリ選択操作を視覚的に理解しやすくしたい。

#### Acceptance Criteria

1. WHEN Kirox CLIがインタラクティブモードでサブディレクトリ選択を求める THEN Kirox CLIは質問メッセージの先頭に📁絵文字を表示する
2. WHEN サブディレクトリ選択プロンプトが表示される THEN Kirox CLIはメッセージ形式を「📁 Select subdirectory (type to filter, space to select, enter to confirm)」とする

### 要件7: サブディレクトリ入力プロンプトへの絵文字追加
**Objective:** インタラクティブモードユーザーとして、手動サブディレクトリ入力プロンプトに絵文字が表示されることで、オプション入力項目であることを視覚的に把握しやすくしたい。

#### Acceptance Criteria

1. WHEN Kirox CLIがインタラクティブモードで手動サブディレクトリ入力を求める THEN Kirox CLIは質問メッセージの先頭に📁絵文字を表示する
2. WHEN 手動サブディレクトリ入力プロンプトが表示される THEN Kirox CLIはメッセージ形式を「📁 Enter subdirectory in GitHub repository (optional)」とする
3. WHERE 設定ファイルからデフォルト値が提供される場合 THE Kirox CLIは絵文字の後にメッセージとデフォルト値を表示する

### 要件8: 実行確認プロンプトへの絵文字追加
**Objective:** インタラクティブモードユーザーとして、実行確認プロンプトに絵文字が表示されることで、最終確認ステップであることを視覚的に認識しやすくしたい。

#### Acceptance Criteria

1. WHEN Kirox CLIがインタラクティブモードで実行確認を求める THEN Kirox CLIは質問メッセージの先頭に❓絵文字を表示する
2. WHEN 実行確認プロンプトが表示される THEN Kirox CLIはメッセージ形式を「❓ Execute with this configuration?」とする

### 要件9: ファイル上書き確認プロンプトへの絵文字追加
**Objective:** ファイル書き込みユーザーとして、上書き確認プロンプトに絵文字が表示されることで、重要な確認操作であることを視覚的に強調してほしい。

#### Acceptance Criteria

1. WHEN Kirox CLIが既存ファイルの上書き確認を求める THEN Kirox CLIは質問メッセージの先頭に⚠️絵文字を表示する
2. WHEN ファイル上書き確認プロンプトが表示される THEN Kirox CLIはメッセージ形式を「⚠️ [ファイル名] already exists. Overwrite?」とする

### 要件10: 既存機能との互換性維持
**Objective:** 開発者として、絵文字追加による既存機能の動作変更がないことを確認したい。

#### Acceptance Criteria

1. WHEN 絵文字が追加される THEN Kirox CLIは既存のプロンプト動作（バリデーション、デフォルト値、エラーメッセージ）を維持する
2. WHEN 絵文字が追加される THEN Kirox CLIは既存のテストケースが全て成功する
3. WHERE 既存のプロンプトロジックが存在する THE Kirox CLIは絵文字追加以外の変更を行わない

### 要件11: ユニットテストのカバレッジ維持
**Objective:** 開発者として、絵文字追加後も既存のユニットテストおよび統合テストが正常に動作することを確認したい。

#### Acceptance Criteria

1. WHEN 絵文字が追加される THEN Kirox CLIは全てのユニットテストが成功する
2. WHEN 絵文字が追加される THEN Kirox CLIは全ての統合テストが成功する
3. WHERE テストコード内でプロンプトメッセージを検証している THE Kirox CLIは絵文字を含む新しいメッセージ形式に合わせてテストを更新する
