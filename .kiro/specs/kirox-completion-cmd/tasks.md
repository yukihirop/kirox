# Implementation Plan

- [ ] 1. CLI層にcompletion機能の基盤を構築する
- [x] 1.1 エントリポイントでcompletionサブコマンドを検出してルーティングする
  - `src/index.ts`でサブコマンド検出ロジックに`completion`を追加
  - 既存の`add`サブコマンドと同様のパターンでルーティング
  - _Requirements: 5.1 (Commanderのサブコマンド構造に従う)_

- [x] 1.2 Parserにcompletionサブコマンドの引数パース機能を追加する
  - Commander.jsを使用してシェル名を必須引数として受け取る
  - `--help`オプションでヘルプメッセージを表示
  - パース結果を`ParsedArguments`型に格納（`subcommand: 'completion'`, `shellType: string`）
  - _Requirements: 4.1, 4.2 (ヘルプメッセージとコマンド構造)_

- [x] 1.3 CompletionEntry（実行エントリポイント）を実装する
  - 補完コマンドの実行フローを制御
  - Parser、ShellValidator、Generatorを統合
  - 標準出力/標準エラー出力の制御とexit codeの管理
  - _Requirements: 1.1, 5.3 (実行フローとエラーハンドリング)_

- [ ] 2. シェル名のバリデーション機能を実装する
- [x] 2.1 ShellValidatorを実装する
  - サポート対象シェルのリスト（bash, zsh, fish, powershell, elvish）を定義
  - シェル名の大文字小文字を正規化（Bash → bash）
  - 未サポートのシェル名を検出してエラーを返す
  - _Requirements: 2.2, 2.4 (入力バリデーションと大文字小文字正規化)_

- [x] 2.2 バリデーションエラーハンドリングを実装する
  - シェル名未指定時のエラーメッセージ（サポートシェルリスト表示）
  - 未サポートシェル指定時のエラーメッセージ
  - 標準エラー出力への出力とexit code 1を返す
  - _Requirements: 2.1, 2.2 (エラーメッセージと使用方法表示)_

- [x] 3. 補完スクリプト生成のコア機能を実装する
- [x] 3.1 Generatorを実装する
  - CompletionMetadata（プログラム名、サブコマンド、オプション）を定義
  - シェルタイプに応じて適切なテンプレートを選択
  - テンプレートにメタデータを注入してスクリプトを生成
  - _Requirements: 1.1, 3.2, 3.3 (スクリプト生成とサブコマンド/オプション補完)_

- [x] 3.2 補完候補メタデータを構築する
  - Kirox CLIの全サブコマンド（既存: add, completion）をリスト化
  - グローバルオプション（--force, --dry-run, --verbose等）をリスト化
  - 各サブコマンドの固有オプション（-p, --project等）をリスト化
  - _Requirements: 3.2, 3.3 (サブコマンドとオプションの補完候補)_

- [x] 4. Bashシェル用の補完スクリプトテンプレートを実装する
- [x] 4.1 BashTemplateを実装する
  - Bash補完の構文に従ったスクリプトテンプレートを作成
  - CompletionMetadataからサブコマンドとオプションを注入
  - `kirox`コマンド用のcompspec（complete -F）を定義
  - _Requirements: 1.2, 3.1, 3.2 (bash用スクリプト生成と補完候補)_

- [ ] 4.2 Bash補完スクリプトの構文検証を実装する
  - 生成されたスクリプトが構文的に有効であることを確認
  - `bash -n`コマンドで構文チェックを行うテストを追加
  - _Requirements: 3.1 (構文エラーなく実行)_

- [ ] 5. Zshシェル用の補完スクリプトテンプレートを実装する
- [ ] 5.1 ZshTemplateを実装する
  - Zsh補完の構文（_arguments形式）に従ったスクリプトテンプレートを作成
  - サブコマンドとオプションをZshの補完ディレクティブに変換
  - compdef関数を使用してkiroxコマンドに補完を登録
  - _Requirements: 1.3, 3.1, 3.2 (zsh用スクリプト生成と補完候補)_

- [ ] 5.2 Zsh補完スクリプトの構文検証を実装する
  - 生成されたスクリプトが構文的に有効であることを確認
  - `zsh -n`コマンドで構文チェックを行うテストを追加
  - _Requirements: 3.1 (構文エラーなく実行)_

- [ ] 6. Fishシェル用の補完スクリプトテンプレートを実装する
- [ ] 6.1 FishTemplateを実装する
  - Fish補完の構文（complete -c形式）に従ったスクリプトテンプレートを作成
  - サブコマンドとオプションをFishの補完コマンドに変換
  - `--condition`を使用してサブコマンドのコンテキスト依存補完を実装
  - _Requirements: 1.4, 3.1, 3.2 (fish用スクリプト生成と補完候補)_

- [ ] 6.2 Fish補完スクリプトの構文検証を実装する
  - 生成されたスクリプトが構文的に有効であることを確認
  - `fish -n`コマンドで構文チェックを行うテストを追加
  - _Requirements: 3.1 (構文エラーなく実行)_

- [ ] 7. PowerShellシェル用の補完スクリプトテンプレートを実装する
- [ ] 7.1 PowerShellTemplateを実装する
  - PowerShell補完の構文（Register-ArgumentCompleter形式）に従ったスクリプトテンプレートを作成
  - サブコマンドとオプションをPowerShellの補完スクリプトブロックに変換
  - `TabExpansion2`関数を使用した補完ロジックを実装
  - _Requirements: 1.5, 3.1, 3.2 (powershell用スクリプト生成と補完候補)_

- [ ] 7.2 PowerShell補完スクリプトの基本検証を実装する
  - 生成されたスクリプトが構文的に有効であることを確認
  - PowerShellスクリプトとして読み込み可能かをテスト
  - _Requirements: 3.1 (構文エラーなく実行)_

- [ ] 8. Elvishシェル用の補完スクリプトテンプレートを実装する
- [ ] 8.1 ElvishTemplateを実装する
  - Elvish補完の構文（edit:completion:arg-completer形式）に従ったスクリプトテンプレートを作成
  - サブコマンドとオプションをElvishの補完関数に変換
  - コマンドコンテキストに応じた補完候補を返すロジックを実装
  - _Requirements: 1.6, 3.1, 3.2 (elvish用スクリプト生成と補完候補)_

- [ ] 8.2 Elvish補完スクリプトの構文検証を実装する
  - 生成されたスクリプトが構文的に有効であることを確認
  - `elvish -compileonly`コマンドで構文チェックを行うテストを追加
  - _Requirements: 3.1 (構文エラーなく実行)_

- [ ] 9. ヘルプメッセージと使用例を実装する
- [ ] 9.1 Commanderのヘルプテキストを追加する
  - 補完コマンドの説明、サポートされているシェルのリストを追加
  - 各シェルでのインストール例を`addHelpText`で追加
  - `kirox completion --help`でヘルプメッセージを表示
  - _Requirements: 4.1, 4.3 (ヘルプメッセージとインストール例)_

- [ ] 9.2 メインヘルプにcompletionサブコマンドを追加する
  - `kirox --help`の出力にcompletionサブコマンドの概要を追加
  - `kirox help completion`でも同じヘルプを表示できるようにする
  - _Requirements: 4.2 (詳細なヘルプメッセージ)_

- [ ] 10. パフォーマンスと出力形式の要件を満たす
- [ ] 10.1 標準出力/標準エラー出力の制御を実装する
  - 正常系: 補完スクリプトを標準出力のみに出力
  - エラー系: エラーメッセージを標準エラー出力のみに出力
  - `console.log`（標準出力）と`console.error`（標準エラー出力）を適切に使い分ける
  - _Requirements: 6.2 (標準出力への出力)_

- [ ] 10.2 スクリプト生成パフォーマンスを検証する
  - 各シェルタイプで100ms以内にスクリプト生成が完了することを確認
  - パフォーマンステストを追加して生成時間を計測
  - _Requirements: 6.1 (100ms以内のスクリプト生成)_

- [ ] 10.3 ファイルリダイレクトの動作を検証する
  - `kirox completion bash > completion.bash`でファイルにリダイレクトできることを確認
  - リダイレクトされたファイルに正しい補完スクリプトのみが保存されることを検証
  - _Requirements: 6.3 (ファイルリダイレクト)_

- [ ] 11. テストスイートを実装する
- [ ] 11.1 単体テストを実装する
  - ShellValidatorのテスト（正規化、バリデーション、エラー検出）
  - Generatorのテスト（テンプレート選択、メタデータ注入）
  - 各ShellTemplateのテスト（スクリプト生成、構文有効性）
  - Parserのcompletionサブコマンドテスト
  - _Requirements: 全要件（各コンポーネントの機能検証）_

- [ ] 11.2 統合テストを実装する
  - CLI → Generator フローのエンドツーエンドテスト
  - エラーハンドリングフローのテスト
  - stdout/stderr出力の分離テスト
  - _Requirements: 全要件（システム全体の統合検証）_

- [ ] 11.3 E2Eテストを実装する
  - 基本フロー（各シェルでのスクリプト生成とファイルリダイレクト）
  - エラーシナリオ（未サポートシェル、シェル名未指定）
  - 各シェルでのスクリプト構文検証（bash -n, zsh -n, fish -n等）
  - _Requirements: 3.1, 3.4 (各シェルでの構文エラーなし)_

- [ ] 12. 型定義とドキュメントを整備する
- [ ] 12.1 TypeScript型定義を追加する
  - `SupportedShell`型の定義
  - `ValidationResult`型の定義
  - `CompletionMetadata`型の定義
  - `ParsedArguments`型の拡張（`subcommand: 'completion'`, `shellType: string`）
  - _Requirements: 5.4 (厳格な型チェック)_

- [ ] 12.2 コード内コメントとTSDocを追加する
  - 各関数・メソッドのTSDocコメント（説明、引数、戻り値、Preconditions、Postconditions）
  - 複雑なロジックの説明コメント
  - _Requirements: 5.1 (保守性と拡張性)_
