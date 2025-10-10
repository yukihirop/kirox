# Requirements Document

## Introduction

Kirox CLIのインタラクティブモードにおけるプロジェクト選択機能の大幅な強化です。現在の`kirox-suggest-project`機能では、ユーザーはリポジトリ → サブディレクトリ → プロジェクトの順に入力する必要があります。本機能により、**GitHub Tree APIを使用してリポジトリ全体を横断的に検索し、すべてのサブディレクトリ配下のプロジェクトを自動検出・一覧表示**することで、サブディレクトリ入力ステップを完全に省略できます。

これにより、モノレポ構造を持つリポジトリでも、ユーザーはサブディレクトリパスを覚える必要がなく、「lib/a/project-x」「lib/b/project-z」といった形式でプロジェクト名とパスをまとめて視覚的に選択できるようになります。

## Requirements

### Requirement 1: GitHub Tree APIによる横断的プロジェクト検出

**Objective:** As a Kirox CLIユーザー, I want リポジトリ入力後にすべてのサブディレクトリを横断してプロジェクト一覧が自動検出される, so that サブディレクトリパスを覚える必要がなく、プロジェクト選択だけに集中できる

#### Acceptance Criteria

1. WHEN ユーザーがインタラクティブモードでリポジトリ（owner/repo#branch形式）を入力する THEN Kirox CLI SHALL GitHub Tree API (`GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1`) を呼び出してリポジトリ全体のファイルツリーを取得する
2. WHEN GitHub Tree APIからファイルツリーを取得する THEN Kirox CLI SHALL `.kiro/specs/` 配下のディレクトリパスをすべて抽出する
3. WHEN `.kiro/specs/` 配下のディレクトリパスを抽出する THEN Kirox CLI SHALL 正規表現パターン `/\.kiro\/specs\/([^\/]+)/` を使用してプロジェクト名とサブディレクトリパスを識別する
4. WHEN ブランチが指定されている（owner/repo#branch形式） THEN Kirox CLI SHALL 指定されたブランチのTree SHAを取得してからTree APIを呼び出す
5. WHEN ブランチが指定されていない THEN Kirox CLI SHALL デフォルトブランチのTree SHAを取得してからTree APIを呼び出す
6. IF `.kiro/specs/` が複数のサブディレクトリに存在する THEN Kirox CLI SHALL すべてのサブディレクトリ配下のプロジェクトを検出する

### Requirement 2: プロジェクト一覧の構造化表示と検索機能

**Objective:** As a Kirox CLIユーザー, I want プロジェクト一覧がサブディレクトリパスと共に表示され AND テキスト入力でフィルタリングできる, so that モノレポ構造でも各プロジェクトの位置を視覚的に把握でき AND 多数のプロジェクトから素早く目的のものを見つけられる

#### Acceptance Criteria

1. WHEN プロジェクト一覧を表示する THEN Kirox CLI SHALL 各プロジェクトを「サブディレクトリパス/プロジェクト名」形式で表示する
2. WHEN ルートディレクトリに`.kiro/specs/`が存在する THEN Kirox CLI SHALL そのプロジェクトを「プロジェクト名」のみで表示する（パスプレフィックスなし）
3. WHEN サブディレクトリに`.kiro/specs/`が存在する THEN Kirox CLI SHALL そのプロジェクトを「サブディレクトリパス/プロジェクト名」形式で表示する
4. WHEN プロジェクト一覧をソートする THEN Kirox CLI SHALL サブディレクトリパスをアルファベット順にソートし AND 同じサブディレクトリ内のプロジェクトもアルファベット順にソートする
5. WHEN ユーザーがテキストを入力する THEN Kirox CLI SHALL 入力テキストに部分一致するプロジェクトのみを表示する（リアルタイムフィルタリング）
6. WHEN フィルタリングテキストを入力する THEN Kirox CLI SHALL 「サブディレクトリパス/プロジェクト名」全体に対して大文字小文字を区別せずに部分一致検索を実行する
7. WHEN フィルタリング結果が0件になる THEN Kirox CLI SHALL 「No matching projects found」というメッセージを表示する
8. WHEN ユーザーがフィルタリングテキストを削除する THEN Kirox CLI SHALL すべてのプロジェクトを再表示する

**表示例（検索機能付き）**:
```
Search or select a project: lib/a
  lib/a/project-x
  lib/a/project-y
  (lib/b/project-z は非表示)
  (project-w は非表示)
```

### Requirement 3: サブディレクトリプロンプトの条件付きスキップ

**Objective:** As a Kirox CLIユーザー, I want Tree APIで自動検出が成功した場合にサブディレクトリ入力をスキップできる, so that 不要な入力ステップを省略できる

#### Acceptance Criteria

1. WHEN Tree APIからプロジェクト一覧の取得が成功する THEN Kirox CLI SHALL サブディレクトリ入力プロンプトをスキップし AND 直接プロジェクト選択UIを表示する
2. WHEN Tree APIからプロジェクト一覧の取得が失敗する THEN Kirox CLI SHALL 既存のワークフロー（サブディレクトリプロンプト → プロジェクトプロンプト）にフォールバックする
3. WHEN ユーザーがプロジェクトを選択する THEN Kirox CLI SHALL 選択されたプロジェクトのサブディレクトリパスを自動的に抽出し AND `ParsedArguments.subdir` フィールドに設定する
4. IF ルートディレクトリのプロジェクトが選択された THEN Kirox CLI SHALL `ParsedArguments.subdir` を空文字列に設定する

### Requirement 4: 複数プロジェクト選択のサポート（同一サブディレクトリ制約付き・検索機能統合）

**Objective:** As a Kirox CLIユーザー, I want 同じサブディレクトリ内の複数プロジェクトを選択できる AND 検索機能を使いながら選択できる, so that モノレポ内の関連プロジェクトを一度に取得でき AND 意図しない組み合わせを防げる

#### Acceptance Criteria

1. WHEN ユーザーが複数選択モードを選択する THEN Kirox CLI SHALL checkboxプロンプトですべてのプロジェクトを表示し AND 検索機能を提供する
2. WHEN ユーザーが最初のプロジェクトを選択する（例: `lib/a/project-x`） THEN Kirox CLI SHALL 選択されたプロジェクトと異なるサブディレクトリのプロジェクトを非表示にする
3. WHEN ユーザーが同じサブディレクトリ内の追加プロジェクトを選択する THEN Kirox CLI SHALL 選択を許可し AND 選択肢のフィルタリング状態を維持する
4. WHEN ユーザーがすべての選択を解除する THEN Kirox CLI SHALL すべてのプロジェクトを再表示する
5. WHEN 検索テキストと選択による制約が両方存在する THEN Kirox CLI SHALL 両方の制約を満たすプロジェクトのみを表示する（AND条件）
6. WHEN ユーザーが検索テキストを削除する AND プロジェクトが選択済み THEN Kirox CLI SHALL 選択されたサブディレクトリのプロジェクトのみを表示する（選択制約を優先）
7. WHEN 複数プロジェクトの取得を実行する THEN Kirox CLI SHALL すべてのプロジェクトが同じサブディレクトリから取得されることを保証する
8. IF ルートディレクトリのプロジェクトが選択された THEN Kirox CLI SHALL ルートディレクトリのプロジェクトのみを選択可能にし AND サブディレクトリのプロジェクトを非表示にする

### Requirement 5: エラーハンドリングとフォールバック

**Objective:** As a Kirox CLIユーザー, I want Tree API失敗時でも既存のワークフローで処理を継続できる, so that APIエラーがあっても目的を達成できる

#### Acceptance Criteria

1. WHEN GitHub Tree APIからのツリー取得が失敗する（404エラー） THEN Kirox CLI SHALL 「リポジトリまたはブランチが見つかりません」というエラーメッセージを表示し AND 既存のワークフロー（サブディレクトリ入力プロンプト）にフォールバックする
2. WHEN GitHub Tree APIからのツリー取得が失敗する（409エラー - empty repository） THEN Kirox CLI SHALL 「リポジトリが空です」というエラーメッセージを表示し AND 既存のワークフローにフォールバックする
3. WHEN GitHub Tree APIのレスポンスが切り詰められる（truncated: true） THEN Kirox CLI SHALL 「リポジトリが大きすぎるため、一部のプロジェクトが表示されない可能性があります」という警告メッセージを表示し AND 取得できたプロジェクト一覧を表示する
4. WHEN `.kiro/specs/` ディレクトリが1つも見つからない THEN Kirox CLI SHALL 「プロジェクトが見つかりません」というメッセージを表示し AND 既存のワークフローにフォールバックする
5. WHEN GitHub APIからのツリー取得が失敗する（401/403エラー） THEN Kirox CLI SHALL 「認証エラー: GITHUB_TOKENを設定してください」というエラーメッセージを表示し AND 既存のワークフローにフォールバックする
6. IF `--verbose`オプションが指定されている THEN Kirox CLI SHALL Tree API呼び出しの詳細情報（Tree SHA、取得したエントリ数、エラー詳細）をログに出力する

### Requirement 6: 既存機能との互換性維持

**Objective:** As a Kirox CLI開発者, I want 既存のワークフローとの完全な互換性を維持する, so that 既存ユーザーのワークフローを壊さない

#### Acceptance Criteria

1. WHEN ユーザーが非インタラクティブモードでサブディレクトリを指定する（例: `npx kirox owner/repo -s lib/a -p project`） THEN Kirox CLI SHALL Tree API機能を起動せず AND 指定されたサブディレクトリとプロジェクト名をそのまま使用する
2. WHEN Tree API機能が無効化されている（設定フラグまたは環境変数） THEN Kirox CLI SHALL 既存のワークフロー（サブディレクトリプロンプト → プロジェクトプロンプト）を使用する
3. WHEN 既存の`kirox-suggest-project`機能（サブディレクトリ指定後のプロジェクトサジェスト）が呼び出される THEN Kirox CLI SHALL 既存の動作を維持する
4. IF TTY環境でない（非対話環境） THEN Kirox CLI SHALL Tree API機能を起動せず AND 既存のエラーハンドリング（「引数を明示的に指定してください」）を実行する

### Requirement 7: パフォーマンスとユーザーフィードバック

**Objective:** As a Kirox CLIユーザー, I want Tree API呼び出し中の状態が視覚的にフィードバックされる, so that 処理が進行していることを確認でき、待ち時間のストレスを軽減できる

#### Acceptance Criteria

1. WHEN GitHub Tree APIを呼び出してプロジェクト一覧を取得する THEN Kirox CLI SHALL 「Scanning repository for projects...」というローディングメッセージを表示する
2. WHEN Tree APIレスポンスが大きい場合（5秒以上） THEN Kirox CLI SHALL 「Large repository detected. This may take a moment...」という追加メッセージを表示する
3. WHEN プロジェクト一覧の取得が完了する THEN Kirox CLI SHALL ローディングメッセージを消去し AND 「Found X projects across Y subdirectories」というサマリーメッセージを表示する
4. IF `--verbose`オプションが指定されている THEN Kirox CLI SHALL Tree API呼び出しの詳細（リポジトリ、ブランチ、Tree SHA、取得したエントリ数、処理時間）をログに出力する

### Requirement 8: Tree APIレスポンスの効率的な処理

**Objective:** As a Kirox CLI開発者, I want Tree APIレスポンスを効率的に処理する, so that 大規模リポジトリでもパフォーマンスを維持できる

#### Acceptance Criteria

1. WHEN Tree APIレスポンスを処理する THEN Kirox CLI SHALL `.kiro/specs/` を含むパスのみを抽出するフィルタリングを最初に適用する
2. WHEN `.kiro/specs/` 配下のディレクトリを識別する THEN Kirox CLI SHALL 正規表現を1回のパスで適用し AND 不要なファイルエントリを早期にスキップする
3. WHEN プロジェクト一覧を構築する THEN Kirox CLI SHALL 重複プロジェクト名を検出し AND 異なるサブディレクトリであることを明確にする
4. IF Tree APIレスポンスのエントリ数が10,000を超える THEN Kirox CLI SHALL 「Large repository: Using optimized filtering」というメッセージを表示する
