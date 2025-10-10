# Requirements Document

## Introduction

Kirox CLIの対話モードにおいて、ユーザーが`owner/repo`形式でリポジトリを入力し、ブランチ指定（`#branch`）を省略した場合、現在はハードコードされた`main`ブランチをデフォルトとして使用しています。

本機能では、GitHub APIを使用してリポジトリの全ブランチ一覧を取得し、**既存のプロジェクト選択UIと同様のsearchable-checkbox（`inquirer-ts-checkbox-plus-prompt`）を使用してブランチを提案・選択できる対話的UIを提供**します。これにより、ユーザーは開発ブランチやリリースブランチから直接`.kiro`ファイルを取得でき、また、リポジトリのデフォルトブランチを適切に認識して使用できるようになります。

### ビジネス価値

- **柔軟性向上**: 開発中のfeatureブランチやreleaseブランチから最新の仕様書を取得可能
- **UX向上**: プロジェクト選択と同じ操作感で直感的にブランチを選択できる
- **正確性向上**: ハードコードされた`main`ではなく、リポジトリのデフォルトブランチを自動検出して使用
- **効率性向上**: リアルタイム検索により、多数のブランチから目的のブランチを素早く発見

## Requirements

### Requirement 1: ブランチ一覧取得機能の実装

**Objective:** As a Kirox CLI開発者, I want GitHub APIを使ってリポジトリの全ブランチ一覧を取得する機能を実装する, so that 対話的UIでブランチを提案できる

#### Acceptance Criteria

1. WHEN `github-fetcher.ts`に`fetchBranches`関数を実装する THEN Kirox CLI SHALL Octokit `client.rest.repos.listBranches`を使用してブランチ一覧を取得する
2. WHEN ブランチ一覧を取得する THEN Kirox CLI SHALL ブランチ名の配列を返す
3. IF GitHub APIがエラーを返す THEN Kirox CLI SHALL 適切なエラーメッセージをスローする
4. WHEN プライベートリポジトリにアクセスする THEN Kirox CLI SHALL `GITHUB_TOKEN`環境変数を使用して認証する
5. WHEN 大量のブランチが存在する THEN Kirox CLI SHALL ページネーションを適切に処理し全ブランチを取得する

### Requirement 2: デフォルトブランチ検出機能の実装

**Objective:** As a Kirox CLI開発者, I want リポジトリのデフォルトブランチを自動検出する機能を実装する, so that ハードコードされた`main`ではなく正しいデフォルトブランチを使用できる

#### Acceptance Criteria

1. WHEN `github-fetcher.ts`に`fetchDefaultBranch`関数を実装する THEN Kirox CLI SHALL Octokit `client.rest.repos.get`を使用してリポジトリ情報を取得する
2. WHEN リポジトリ情報を取得する THEN Kirox CLI SHALL `default_branch`フィールドを抽出して返す
3. IF リポジトリが見つからない THEN Kirox CLI SHALL 「リポジトリが見つかりません」エラーをスローする
4. IF APIリクエストが失敗する THEN Kirox CLI SHALL 適切なエラーメッセージをスローする

### Requirement 3: ブランチ選択プロンプトUIの実装

**Objective:** As a Kirox CLIユーザー, I want プロジェクト選択と同じ操作感でブランチを検索・選択できる, so that 直感的にブランチを指定できる

#### Acceptance Criteria

1. WHEN `cli/interactive-prompt.ts`に`promptBranch`関数を実装する THEN Kirox CLI SHALL `inquirer-ts-checkbox-plus-prompt`のsearchableCheckboxを使用してブランチ選択UIを表示する
2. WHEN ブランチ選択UIを表示する THEN Kirox CLI SHALL `searchable: true`オプションを有効化し AND リアルタイム検索機能を提供する
3. WHEN ユーザーがテキストを入力する THEN Kirox CLI SHALL 入力テキストに部分一致するブランチのみを表示する（大文字小文字を区別しない）
4. WHEN ユーザーがスペースキーを押す THEN Kirox CLI SHALL 現在フォーカスされているブランチを選択/選択解除する
5. WHEN ユーザーがEnterキーを押す THEN Kirox CLI SHALL 選択されたブランチを確定する
6. WHEN デフォルトブランチが検出されている THEN Kirox CLI SHALL デフォルトブランチに「(default)」ラベルを付けて表示する
7. WHEN ブランチ一覧をソートする THEN Kirox CLI SHALL デフォルトブランチを最上位に配置し AND その他のブランチをアルファベット順にソートする

### Requirement 4: ブランチ選択の制約とバリデーション

**Objective:** As a Kirox CLIユーザー, I want ブランチ選択時に適切なバリデーションが行われる, so that 意図しない操作を防げる

#### Acceptance Criteria

1. WHEN ユーザーが複数のブランチを選択しようとする THEN Kirox CLI SHALL バリデーションエラーメッセージ「Please select only one branch」を表示する
2. WHEN ユーザーがブランチを選択せずにEnterキーを押す THEN Kirox CLI SHALL 選択をキャンセルし AND デフォルトブランチを使用する
3. WHEN ユーザーがCtrl+Cで中断する THEN Kirox CLI SHALL `ExitPromptError`を適切にハンドリングし AND 既存の中断処理フローを維持する
4. WHEN ブランチ一覧が0件の場合 THEN Kirox CLI SHALL エラーメッセージ「No branches found in repository」を表示し AND プロンプトをスキップする

### Requirement 5: 対話モードフローへの統合

**Objective:** As a Kirox CLI開発者, I want ブランチ選択プロンプトを既存の対話モードフローに統合する, so that 適切なタイミングでブランチ選択が行われる

#### Acceptance Criteria

1. WHEN リポジトリ入力プロンプトが完了する THEN Kirox CLI SHALL 入力されたリポジトリ文字列に`#branch`が含まれるかチェックする
2. IF リポジトリ入力に`#branch`が含まれる THEN Kirox CLI SHALL ブランチ選択プロンプトをスキップする
3. IF リポジトリ入力に`#branch`が含まれない THEN Kirox CLI SHALL ブランチ選択プロンプトを表示する
4. WHEN ブランチ選択プロンプトが完了する THEN Kirox CLI SHALL 選択されたブランチをリポジトリ文字列に`#branch`形式で追加する
5. WHEN ユーザーがブランチ選択をキャンセルする（0件選択） THEN Kirox CLI SHALL デフォルトブランチをリポジトリ文字列に追加する
6. WHEN プロジェクト選択プロンプトが開始される THEN Kirox CLI SHALL ブランチが適用されたリポジトリ文字列を使用する

### Requirement 6: リポジトリ入力プロンプトメッセージの維持

**Objective:** As a Kirox CLIユーザー, I want リポジトリ入力プロンプトで両方の入力形式が使えることを理解する, so that 状況に応じて`owner/repo`または`owner/repo#branch`形式を選択できる

#### Acceptance Criteria

1. WHEN リポジトリ入力プロンプトを表示する THEN Kirox CLI SHALL メッセージ「Enter GitHub repository (owner/repo or owner/repo#branch)」を維持する
2. WHEN プロンプトメッセージを表示する THEN Kirox CLI SHALL `owner/repo#branch`形式の入力を引き続きサポートする
3. WHEN ユーザーがヘルプやドキュメントを参照する THEN Kirox CLI SHALL 対話モードではブランチ指定が任意である旨を明記する

### Requirement 7: エラーハンドリングとフォールバック

**Objective:** As a Kirox CLIユーザー, I want ブランチ取得に失敗した場合でも処理を続行できる, so that 中断されることなく操作を完了できる

#### Acceptance Criteria

1. WHEN ブランチ一覧取得APIが失敗する THEN Kirox CLI SHALL エラーメッセージを表示し AND デフォルトブランチを使用して処理を継続する
2. WHEN デフォルトブランチ取得APIが失敗する THEN Kirox CLI SHALL エラーメッセージを表示し AND ブランチ指定なしで処理を継続する
3. WHEN GitHub APIがレート制限エラーを返す THEN Kirox CLI SHALL 「GitHub API rate limit exceeded. Please try again later or set GITHUB_TOKEN」というメッセージを表示する
4. WHEN ネットワークエラーが発生する THEN Kirox CLI SHALL 「Network error occurred. Please check your connection」というメッセージを表示する
5. IF ブランチ選択プロンプトで例外が発生する THEN Kirox CLI SHALL デフォルトブランチを使用して処理を継続する

### Requirement 8: 非対話モードでの動作保証

**Objective:** As a Kirox CLI開発者, I want 非対話モード（引数指定時）での動作に影響を与えない, so that 既存のワークフローが変更なく動作する

#### Acceptance Criteria

1. WHEN リポジトリが`owner/repo#branch`形式で引数指定されている THEN Kirox CLI SHALL ブランチ選択プロンプトを表示しない
2. WHEN リポジトリが`owner/repo`形式で引数指定されている THEN Kirox CLI SHALL ブランチ選択プロンプトを表示しない
3. WHEN TTY環境でない場合 THEN Kirox CLI SHALL ブランチ選択プロンプトを表示しない
4. WHEN `--update`または`--check-updates`オプションが指定されている THEN Kirox CLI SHALL ブランチ選択プロンプトを表示しない

### Requirement 9: パフォーマンスとユーザビリティ

**Objective:** As a Kirox CLIユーザー, I want ブランチ選択UIが高速で使いやすい, so that ストレスなくブランチを選択できる

#### Acceptance Criteria

1. WHEN ブランチ一覧を取得する THEN Kirox CLI SHALL 取得開始から表示まで3秒以内に完了する（通常のネットワーク環境下）
2. WHEN 100個以上のブランチを表示する THEN Kirox CLI SHALL リアルタイム検索フィルタリングが1秒以内に完了する
3. WHEN ユーザーが検索テキストを入力する THEN Kirox CLI SHALL フィルタリング結果が即座に（100ms以内）表示される
4. WHEN ブランチ一覧をレンダリングする THEN Kirox CLI SHALL スクロール可能なリストとしてレンダリングし AND 画面サイズに応じて適切に表示する
5. WHEN ブランチ選択プロンプトを表示中 THEN Kirox CLI SHALL ローディングメッセージ「Fetching branches...」を表示する

### Requirement 10: 既存機能との統合互換性

**Objective:** As a Kirox CLI開発者, I want ブランチ選択機能が既存の対話モードフローと完全に統合される, so that 他の機能に影響を与えない

#### Acceptance Criteria

1. WHEN Tree API検索が実行される THEN Kirox CLI SHALL ブランチが適用されたリポジトリ文字列を使用してプロジェクトをスキャンする
2. WHEN プロジェクト選択UIが表示される THEN Kirox CLI SHALL 選択されたブランチのプロジェクト一覧を表示する
3. WHEN サブディレクトリプロンプトが表示される THEN Kirox CLI SHALL 選択されたブランチのサブディレクトリを取得する
4. WHEN 確認プロンプトが表示される THEN Kirox CLI SHALL 選択されたブランチ情報を含むサマリーを表示する

### Requirement 11: ログとデバッグ情報

**Objective:** As a Kirox CLI開発者, I want ブランチ選択に関する詳細なログを記録する, so that 問題発生時にデバッグできる

#### Acceptance Criteria

1. WHEN `--verbose`オプションが指定されている THEN Kirox CLI SHALL ブランチ一覧取得の開始と完了をログに記録する
2. WHEN ブランチ一覧を取得する THEN Kirox CLI SHALL 取得されたブランチ数をログに記録する
3. WHEN デフォルトブランチを検出する THEN Kirox CLI SHALL デフォルトブランチ名をログに記録する
4. WHEN ブランチ選択が完了する THEN Kirox CLI SHALL 選択されたブランチ名をログに記録する
5. IF ブランチ選択がキャンセルされる THEN Kirox CLI SHALL キャンセル理由（0件選択/Ctrl+C等）をログに記録する

### Requirement 12: テストカバレッジ

**Objective:** As a Kirox CLI開発者, I want ブランチ選択機能のテストカバレッジを確保する, so that 品質を保証できる

#### Acceptance Criteria

1. WHEN `fetchBranches`関数の単体テストを作成する THEN Kirox CLI SHALL 正常系・異常系のテストケースを含める
2. WHEN `fetchDefaultBranch`関数の単体テストを作成する THEN Kirox CLI SHALL 正常系・異常系のテストケースを含める
3. WHEN `promptBranch`関数の単体テストを作成する THEN Kirox CLI SHALL UIインタラクションをモックしてテストする
4. WHEN 対話モードフローの統合テストを実行する THEN Kirox CLI SHALL ブランチ選択が含まれるE2Eシナリオをテストする
5. WHEN テストカバレッジを計測する THEN Kirox CLI SHALL ブランチ選択機能のカバレッジが80%以上を維持する
