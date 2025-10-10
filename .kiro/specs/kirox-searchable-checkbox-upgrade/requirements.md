# Requirements Document

## Introduction

Kirox CLIのインタラクティブモードにおけるプロジェクト選択UIの大幅な改善です。現在の実装では、Tree API検索が成功した場合でも、ユーザーは**二段階のプロセス**（1. 検索プロンプトでプロジェクトを絞り込み → 2. 「Select multiple projects」オプションを選択してチェックボックスUIに遷移）を経る必要があります。

本機能により、**`inquirer-ts-checkbox-plus-prompt`パッケージを導入し、検索機能とチェックボックス機能を統合した単一ステップのUI**を提供します。これにより、ユーザーはリアルタイムで入力してプロジェクトをフィルタリングしながら、スペースキーで複数のプロジェクトを選択できるようになります。

### ビジネス価値

- **UX向上**: 二段階プロセスの解消により、プロジェクト選択フローが直感的になる
- **操作性改善**: リアルタイム検索とチェックボックス選択を同時に行えることで、大規模モノレポでも効率的にプロジェクトを選択可能
- **学習コスト削減**: 検索→複数選択モード切り替えという概念的な段階がなくなり、新規ユーザーでも理解しやすい

## Requirements

### Requirement 1: inquirer-ts-checkbox-plus-promptパッケージの導入

**Objective:** As a Kirox CLI開発者, I want inquirer-ts-checkbox-plus-promptパッケージを依存関係に追加する, so that 検索可能なチェックボックスUIを実装できる

#### Acceptance Criteria

1. WHEN package.jsonの依存関係を更新する THEN Kirox CLI SHALL `inquirer-ts-checkbox-plus-prompt` を `dependencies` セクションに追加する
2. WHEN パッケージをインストールする THEN Kirox CLI SHALL npm installを実行して正常にインストールされることを確認する
3. WHEN TypeScript型定義を確認する THEN Kirox CLI SHALL `inquirer-ts-checkbox-plus-prompt` がTypeScriptネイティブサポートを提供することを確認する

### Requirement 2: 単一ステップ検索可能チェックボックスUIの実装

**Objective:** As a Kirox CLIユーザー, I want プロジェクト選択時に検索とチェックボックス選択を同時に行える, so that 二段階のプロセスなしで効率的にプロジェクトを選択できる

#### Acceptance Criteria

1. WHEN Tree APIからプロジェクト一覧を取得した後 THEN Kirox CLI SHALL `inquirer-ts-checkbox-plus-prompt`の`CheckboxPlusPrompt`を使用してプロジェクト選択UIを表示する
2. WHEN プロジェクト選択UIを表示する THEN Kirox CLI SHALL `searchable: true` オプションを有効化し AND リアルタイム検索機能を提供する
3. WHEN ユーザーがテキストを入力する THEN Kirox CLI SHALL 入力テキストに部分一致するプロジェクトのみを表示する（大文字小文字を区別しない）
4. WHEN ユーザーがスペースキーを押す THEN Kirox CLI SHALL 現在フォーカスされているプロジェクトを選択/選択解除する
5. WHEN ユーザーがEnterキーを押す THEN Kirox CLI SHALL 選択されたプロジェクト一覧を確定する
6. WHEN 検索テキストをクリアする THEN Kirox CLI SHALL すべてのプロジェクトを再表示する
7. WHEN プロジェクト選択UIを表示する THEN Kirox CLI SHALL `highlight: true` オプションを有効化し AND 現在フォーカスされているプロジェクトをハイライト表示する

### Requirement 3: プロジェクト表示形式とソート順の維持

**Objective:** As a Kirox CLIユーザー, I want プロジェクトがサブディレクトリパス付きで表示され AND 既存の表示形式が維持される, so that 既存のワークフローとの一貫性を保てる

#### Acceptance Criteria

1. WHEN プロジェクト一覧を表示する THEN Kirox CLI SHALL 各プロジェクトを「サブディレクトリパス/プロジェクト名」形式で表示する
2. WHEN ルートディレクトリのプロジェクトを表示する THEN Kirox CLI SHALL そのプロジェクトを「プロジェクト名」のみで表示する（パスプレフィックスなし）
3. WHEN プロジェクト一覧をソートする THEN Kirox CLI SHALL サブディレクトリパスをアルファベット順にソートし AND 同じサブディレクトリ内のプロジェクトもアルファベット順にソートする
4. WHEN 検索フィルタリングを実行する THEN Kirox CLI SHALL 「サブディレクトリパス/プロジェクト名」全体に対して部分一致検索を実行する

### Requirement 4: 複数プロジェクト選択の制約維持

**Objective:** As a Kirox CLIユーザー, I want 複数プロジェクト選択時に同一サブディレクトリ制約が維持される, so that 意図しない組み合わせでのプロジェクト取得を防げる

#### Acceptance Criteria

1. WHEN ユーザーが異なるサブディレクトリのプロジェクトを選択しようとする THEN Kirox CLI SHALL バリデーションエラーメッセージ「All projects must be in the same subdirectory」を表示する
2. WHEN バリデーションエラーが発生する THEN Kirox CLI SHALL 選択されたサブディレクトリのリストを表示する（例: 「Selected subdirectories: root, lib/a」）
3. WHEN ユーザーが同じサブディレクトリのプロジェクトのみを選択する THEN Kirox CLI SHALL 選択を許可し AND 確定処理を実行する
4. WHEN 0個のプロジェクトが選択されている状態でEnterキーを押す THEN Kirox CLI SHALL バリデーションエラーメッセージ「Please select at least one project」を表示する

### Requirement 5: 既存のsearchable-project-prompt.tsの置き換え

**Objective:** As a Kirox CLI開発者, I want 既存の二段階UIロジックを新しい単一ステップUIに置き換える, so that コードベースを簡素化し保守性を向上させる

#### Acceptance Criteria

1. WHEN `promptProjectSelection`関数を実装する THEN Kirox CLI SHALL `@inquirer/prompts`の`search`と`checkbox`の組み合わせを`CheckboxPlusPrompt`に置き換える
2. WHEN 新しい実装を作成する THEN Kirox CLI SHALL 既存の`ProjectSelectionResult`インターフェースを維持する
3. WHEN 新しい実装を作成する THEN Kirox CLI SHALL `projects`（選択されたプロジェクト名の配列）と`subdir`（共通のサブディレクトリパス）を返す
4. WHEN 既存の`__select_multiple__`トリガーロジックを削除する THEN Kirox CLI SHALL 検索プロンプトとチェックボックスプロンプトの切り替えロジックを削除する
5. WHEN 既存の`sourceFunction`ロジックを削除する THEN Kirox CLI SHALL `CheckboxPlusPrompt`の組み込み検索機能に置き換える

### Requirement 6: エラーハンドリングの維持

**Objective:** As a Kirox CLIユーザー, I want 既存のエラーハンドリングが維持される, so that エッジケースでも適切なフィードバックを得られる

#### Acceptance Criteria

1. WHEN 選択されたプロジェクトが見つからない THEN Kirox CLI SHALL エラー「Selected project not found」をスローする
2. WHEN 有効なプロジェクトが0個選択された THEN Kirox CLI SHALL エラー「No valid projects selected」をスローする
3. WHEN ユーザーがCtrl+Cで中断する THEN Kirox CLI SHALL `ExitPromptError`を適切にハンドリングし AND 既存の中断処理フローを維持する

### Requirement 7: 既存機能との統合互換性

**Objective:** As a Kirox CLI開発者, I want 新しいUIが既存のインタラクティブフローと完全に統合される, so that 他の機能に影響を与えない

#### Acceptance Criteria

1. WHEN `interactive-prompt.ts`の`promptMissingArguments`関数から呼び出される THEN Kirox CLI SHALL `promptProjectSelection`が期待通りの`ProjectSelectionResult`を返す
2. WHEN Tree API検索が成功してプロジェクト一覧を取得する THEN Kirox CLI SHALL 新しい検索可能チェックボックスUIを表示する
3. WHEN Tree API検索が失敗する THEN Kirox CLI SHALL 既存のフォールバックワークフロー（サブディレクトリプロンプト → プロジェクトプロンプト）を維持する
4. WHEN 非インタラクティブモードで実行される THEN Kirox CLI SHALL プロジェクト選択UIを起動せず AND 引数として渡されたプロジェクト名をそのまま使用する
5. WHEN TTY環境でない場合 THEN Kirox CLI SHALL プロジェクト選択UIを起動せず AND 適切なエラーメッセージを表示する

### Requirement 8: パフォーマンスとユーザビリティの維持

**Objective:** As a Kirox CLIユーザー, I want 新しいUIが既存のUIと同等以上のパフォーマンスとユーザビリティを提供する, so that 操作体験が向上する

#### Acceptance Criteria

1. WHEN 100個以上のプロジェクトを表示する THEN Kirox CLI SHALL リアルタイム検索フィルタリングが1秒以内に完了する
2. WHEN ユーザーが検索テキストを入力する THEN Kirox CLI SHALL フィルタリング結果が即座に（100ms以内）表示される
3. WHEN プロジェクト一覧をレンダリングする THEN Kirox CLI SHALL スクロール可能なリストとしてレンダリングし AND 画面サイズに応じて適切に表示する
4. WHEN ユーザーが矢印キーでプロジェクトを移動する THEN Kirox CLI SHALL フォーカスが移動し AND ハイライト表示が更新される
5. WHEN ユーザーがスペースキーで選択を切り替える THEN Kirox CLI SHALL 選択状態が即座に（50ms以内）更新される

### Requirement 9: テストカバレッジの維持

**Objective:** As a Kirox CLI開発者, I want 新しい実装が既存のテストカバレッジを維持する, so that 品質を保証できる

#### Acceptance Criteria

1. WHEN 既存のテストケースを更新する THEN Kirox CLI SHALL `searchable-project-prompt.test.ts`のテストを新しい実装に対応させる
2. WHEN 単体テストを実行する THEN Kirox CLI SHALL プロジェクト選択ロジックのテストカバレッジが80%以上を維持する
3. WHEN 統合テストを実行する THEN Kirox CLI SHALL インタラクティブフローのE2Eテストが全て通過する
4. WHEN バリデーションロジックをテストする THEN Kirox CLI SHALL サブディレクトリ制約のテストケースが全て通過する
