# Requirements Document

## Introduction

`--steering`オプションを追加することで、`.kiro/steering`ディレクトリのみを取得する専用モードを実装します。このオプションは、プロジェクト固有の仕様書(`specs`)ではなく、プロジェクト全体のガイドラインやルール(`steering`)のみを共有・更新したいユースケースに対応します。

**ビジネス価値**:
- チーム全体で共有するステアリングドキュメント（開発ガイドライン、技術スタック、構造など）を簡単に同期
- プロジェクト仕様書のダウンロードをスキップすることで、実行時間とネットワーク負荷を削減
- 既存のワークフローを変更せず、新しいユースケースに対応

## Requirements

### Requirement 1: `--steering`オプションの追加
**Objective:** 開発者として、`.kiro/steering`ディレクトリのみを取得するオプションを使用したい。これにより、プロジェクト固有の仕様書をダウンロードせずに、プロジェクト全体のガイドラインのみを効率的に同期できる。

#### Acceptance Criteria
1. WHEN CLI引数に`--steering`オプションが指定されている THEN Kiroxシステム SHALL `--steering`フラグをtrueとして認識する
2. WHEN `--steering`オプションが指定されている THEN Kiroxシステム SHALL `.kiro/steering`ディレクトリ配下のファイルのみを取得対象とする
3. WHEN `--steering`オプションが指定されている THEN Kiroxシステム SHALL `.kiro/specs/<project>`ディレクトリ配下のファイルを取得対象から除外する
4. WHEN `--steering`オプションが指定されていない THEN Kiroxシステム SHALL 既存の動作（specsとsteering両方を取得）を維持する

### Requirement 2: 非インタラクティブモードでの`<project>`引数省略
**Objective:** 開発者として、非インタラクティブモードで`--steering`オプションを使用する際に、`<project>`引数を省略できるようにしたい。これにより、ステアリングファイルのみを取得する場合の引数指定を簡潔にできる。

#### Acceptance Criteria
1. WHEN 非インタラクティブモードで`--steering`オプションが指定されている AND `-p, --project`オプションが指定されていない THEN Kiroxシステム SHALL バリデーションエラーを発生させない
2. WHEN 非インタラクティブモードで`--steering`オプションが指定されている AND `-p, --project`オプションが指定されていない THEN Kiroxシステム SHALL 空のプロジェクト名リストとして処理を継続する
3. WHEN 非インタラクティブモードで`--steering`オプションが指定されていない AND `-p, --project`オプションが指定されていない THEN Kiroxシステム SHALL 既存のバリデーションエラーを発生させる（既存動作維持）
4. WHEN 非インタラクティブモードで`--steering`オプションが指定されている AND `-p, --project`オプションが指定されている THEN Kiroxシステム SHALL プロジェクト引数を無視してステアリングディレクトリのみを取得する

### Requirement 3: インタラクティブモードでのプロジェクトサジェストスキップ
**Objective:** 開発者として、インタラクティブモードで`--steering`オプションを使用する際に、プロジェクト選択プロンプトをスキップしたい。これにより、ステアリングファイルのみを取得する場合のインタラクティブフローを簡略化できる。

#### Acceptance Criteria
1. WHEN インタラクティブモードで`--steering`オプションが指定されている THEN Kiroxシステム SHALL リポジトリ入力プロンプトを表示する
2. WHEN インタラクティブモードで`--steering`オプションが指定されている THEN Kiroxシステム SHALL ブランチ選択プロンプトを表示する（既存動作維持）
3. WHEN インタラクティブモードで`--steering`オプションが指定されている THEN Kiroxシステム SHALL Tree APIによるプロジェクトスキャンをスキップする
4. WHEN インタラクティブモードで`--steering`オプションが指定されている THEN Kiroxシステム SHALL プロジェクト選択プロンプトをスキップする
5. WHEN インタラクティブモードで`--steering`オプションが指定されていない THEN Kiroxシステム SHALL 既存のプロンプトフロー（リポジトリ→ブランチ→Tree API/subdir→プロジェクト→出力→確認）を維持する

### Requirement 4: インタラクティブモードでの`<subdir>`入力サジェスト
**Objective:** 開発者として、インタラクティブモードで`--steering`オプションを使用する際に、プロジェクト選択の代わりにサブディレクトリ入力プロンプトを表示したい。これにより、サブディレクトリ配下の`.kiro/steering`を柔軟に指定できる。

#### Acceptance Criteria
1. WHEN インタラクティブモードで`--steering`オプションが指定されている AND サブディレクトリ引数(`-s, --subdir`)が指定されていない THEN Kiroxシステム SHALL サブディレクトリ入力プロンプトを表示する
2. WHEN インタラクティブモードで`--steering`オプションが指定されている AND サブディレクトリ入力プロンプトで空文字列が入力された THEN Kiroxシステム SHALL ルートディレクトリの`.kiro/steering`を取得対象とする
3. WHEN インタラクティブモードで`--steering`オプションが指定されている AND サブディレクトリ入力プロンプトで有効なパスが入力された THEN Kiroxシステム SHALL 指定されたサブディレクトリ配下の`.kiro/steering`を取得対象とする
4. WHEN インタラクティブモードで`--steering`オプションが指定されている AND サブディレクトリ引数(`-s, --subdir`)が既に指定されている THEN Kiroxシステム SHALL サブディレクトリ入力プロンプトをスキップする

### Requirement 5: 実行フローと確認プロンプト
**Objective:** 開発者として、`--steering`オプション使用時のインタラクティブモードで、最終確認プロンプトに正確な情報が表示されることを期待する。これにより、実行前に取得対象を明確に確認できる。

#### Acceptance Criteria
1. WHEN インタラクティブモードで`--steering`オプションが指定されている THEN Kiroxシステム SHALL 確認プロンプト画面に「Repository」「Output」「Subdirectory（指定時）」を表示する
2. WHEN インタラクティブモードで`--steering`オプションが指定されている THEN Kiroxシステム SHALL 確認プロンプト画面に「Project」フィールドを表示しない、または「N/A (steering only)」と表示する
3. WHEN インタラクティブモードで`--steering`オプションが指定されていない THEN Kiroxシステム SHALL 既存の確認プロンプト画面（Repository、Project、Output、Subdirectory）を表示する
4. WHEN 確認プロンプトでユーザーが承認した THEN Kiroxシステム SHALL `.kiro/steering`ディレクトリのファイル取得処理を開始する
5. WHEN 確認プロンプトでユーザーがキャンセルした THEN Kiroxシステム SHALL 処理を中断し、exit code 0で終了する

### Requirement 6: 既存機能との整合性
**Objective:** 開発チームとして、`--steering`オプションが既存の機能と適切に連携し、互換性を保つことを期待する。これにより、既存ユーザーのワークフローを破壊せずに新機能を提供できる。

#### Acceptance Criteria
1. WHEN `--steering`オプションが指定されている THEN Kiroxシステム SHALL 既存の`--force`, `--dry-run`, `--verbose`, `--config`オプションを正常に処理する
2. WHEN `--steering`オプションが指定されている THEN Kiroxシステム SHALL 既存の`-o, --output`オプションを正常に処理し、指定ディレクトリに`.kiro/steering`を作成する
3. WHEN `--steering`オプションが指定されている AND `--track`オプションが指定されている THEN Kiroxシステム SHALL メタデータにステアリングファイルの追跡情報を記録する
4. WHEN `--steering`オプションが指定されている AND `--check-updates`または`--update`オプションが指定されている THEN Kiroxシステム SHALL バリデーションエラーを発生させる（相互排他的）
5. WHEN `--steering`オプションが指定されていない THEN Kiroxシステム SHALL 既存の動作（specs + steering両方を取得）を完全に維持する

### Requirement 7: エラーハンドリングと境界条件
**Objective:** 開発者として、`--steering`オプション使用時に適切なエラーメッセージとガイダンスを受け取りたい。これにより、問題発生時に迅速に対処できる。

#### Acceptance Criteria
1. WHEN `--steering`オプションが指定されている AND リモートリポジトリに`.kiro/steering`ディレクトリが存在しない THEN Kiroxシステム SHALL 明確なエラーメッセージを表示する
2. WHEN `--steering`オプションが指定されている AND 指定されたサブディレクトリ配下に`.kiro/steering`ディレクトリが存在しない THEN Kiroxシステム SHALL サブディレクトリパスを含むエラーメッセージを表示する
3. WHEN `--steering`オプションが指定されている AND GitHub API制限に到達した THEN Kiroxシステム SHALL 既存のレート制限エラーハンドリングを実行する
4. WHEN `--steering`オプションが指定されている AND ネットワークエラーが発生した THEN Kiroxシステム SHALL 既存のネットワークエラーハンドリングを実行する
5. WHEN `--steering`オプションが指定されている AND `.kiro/steering`ディレクトリが空の場合 THEN Kiroxシステム SHALL 「No files found in .kiro/steering」メッセージを表示し、exit code 0で正常終了する

### Requirement 8: ヘルプメッセージとドキュメンテーション
**Objective:** 開発者として、`--steering`オプションの使用方法と目的をヘルプメッセージで確認したい。これにより、機能を理解し正しく使用できる。

#### Acceptance Criteria
1. WHEN `kirox --help`コマンドが実行された THEN Kiroxシステム SHALL `--steering`オプションの説明を表示する
2. WHEN `kirox --help`コマンドが実行された THEN Kiroxシステム SHALL `--steering`オプションの使用例を表示する
3. WHERE ヘルプメッセージ内 THE Kiroxシステム SHALL `--steering`オプションの説明として「Fetch only .kiro/steering directory (skip project specs)」を表示する
4. WHERE ヘルプメッセージ内 THE Kiroxシステム SHALL インタラクティブモードの例として「npx kirox --steering」を含める
5. WHERE ヘルプメッセージ内 THE Kiroxシステム SHALL 非インタラクティブモードの例として「npx kirox owner/repo --steering」「npx kirox owner/repo --subdir packages/api --steering」を含める

## Non-Functional Requirements

### NFR-1: パフォーマンス
- `.kiro/steering`ディレクトリのみを取得する場合、既存のフルフェッチ（specs + steering）と比較して、ネットワーク転送量とAPI呼び出し回数を削減する
- インタラクティブモードでのプロンプト表示は、Tree APIスキャンをスキップすることで応答時間を改善する

### NFR-2: 後方互換性
- `--steering`オプションを指定しない場合、既存の全ての動作（specs + steering取得、インタラクティブフロー、バリデーション）を完全に維持する
- 既存のテストスイート（1189 tests）が全て合格すること

### NFR-3: 保守性
- `--steering`オプションの実装は、既存のアーキテクチャ（レイヤー分離、依存性注入）に従う
- 新しいロジックは、既存のコンポーネント（parser.ts、entry.ts、interactive-prompt.ts）に統合され、重複を避ける
