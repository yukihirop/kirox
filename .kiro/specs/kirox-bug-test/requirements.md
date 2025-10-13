# Requirements Document

## Introduction

本機能は、Kirox CLIプロジェクトにおいて現在失敗している単体テストを修正することを目的としています。実装コードが正しいという前提のもと、テストコードの期待値やモック設定を修正し、すべてのテストが成功するようにします。これにより、継続的インテグレーション（CI）の安定性を確保し、開発者がテスト結果を信頼できる状態を実現します。

## Requirements

### Requirement 1: add コマンドのエントリーポイントに関するテスト修正
**Objective:** 開発者として、add コマンドのエントリーポイントに関するテストが正しく通過してほしい。そうすることで、add コマンドの機能を変更する際にもテストスイートを信頼できるようにする。

#### Acceptance Criteria

1. WHEN executeAddCommand が有効な引数で呼び出される THEN テストスイートは ".kirox-meta.json" を含む正しいパスで loadMetadata が呼び出されることを検証する。
2. WHEN メタデータファイルが存在しない THEN "new.*metadata|creating.*metadata" のパターンに一致する適切なログメッセージが生成されることを検証する。
3. WHEN 対話モードで executeAddCommand が呼び出される THEN 対話プロンプトの完了後、更新された出力パスで loadMetadata が呼び出されることを検証する。
4. WHEN 非対話モードで executeAddCommand が呼び出される THEN デフォルトパス '.kiro/.kirox-meta.json' で即座に loadMetadata が呼び出されることを検証する。
5. WHEN サブディレクトリを持つプロジェクトでステアリングファイルを取得する THEN サブディレクトリのプレフィックスを含む正しいパス形式で fetchDirectoryContents が呼び出されることを検証する。

### Requirement 2: add コマンドの重複検出に関するテスト修正
**Objective:** 開発者として、重複検出テストが重複プロジェクトを扱う際のシステムの挙動を正しく検証してほしい。これにより、--force フラグに従って重複プロジェクトが適切に検出・処理されることを保証する。

#### Acceptance Criteria

1. WHEN --force フラグなしで重複プロジェクトを追加する THEN システムは success=false および exitCode=1 を返す。
2. WHEN --force フラグありで重複プロジェクトを追加する THEN システムは success=true を返し、重複を上書き操作として処理する。
3. WHEN サブディレクトリなしのプロジェクトと空文字のサブディレクトリを持つプロジェクトを比較する THEN それらは重複として扱われる。
4. WHEN --force と --verbose フラグで重複プロジェクトを上書きする THEN "overwrite"、"Overwriting"、または "force" のキーワードを含むログメッセージを表示する。
5. WHEN --force フラグなしで重複プロジェクトが検出される THEN システムは警告メッセージを表示し、その重複プロジェクトをスキップする。
6. WHEN 複数のプロジェクトを追加し、その中に重複が含まれる THEN 全体の操作として success=false および exitCode=1 を返す。
7. WHEN バッチ操作で複数の重複プロジェクトが存在する THEN すべての重複がスキップされたことを示す success=false および exitCode=1 を返す。

### Requirement 3: add サブコマンド向けパーサーテストの修正
**Objective:** 開発者として、add サブコマンドにおける track フラグの挙動を引数パーサーのテストで正しく検証してほしい。これにより、add の操作に対して常に適切に track フラグが設定されることを保証する。

#### Acceptance Criteria

1. WHEN add サブコマンドが明示的な --track フラグなしで呼び出される THEN ArgumentParser は track をデフォルトで true に設定する。
2. WHEN add サブコマンドが明示的な --track フラグ付きで呼び出される THEN ArgumentParser はユーザーが指定した値を尊重する。
3. WHEN add サブコマンドが --no-track フラグ付きで呼び出される THEN ArgumentParser は上書きして track を true に設定する（add は常に追跡が必要）。

### Requirement 4: テストスイートの安定性
**Objective:** 開発チームとして、すべてのテストが一貫して合格してほしい。これにより、CI パイプラインへの信頼を維持し、実際のリグレッションを確実に検知できるようにする。

#### Acceptance Criteria

1. WHEN npm test コマンドを実行する THEN すべてのテストファイルが失敗なく通過する。
2. WHEN テストスイートを実行する THEN 総テスト数は 1917（または現時点の合計）を維持する。
3. WHEN テストが完了する THEN テストランナーは失敗 0 を報告する。
4. WHEN 将来実装コードが変更される THEN 意図的に挙動を変更しない限り既存のテストは引き続き合格する。

### Requirement 5: モック設定の正確性
**Objective:** テスト作成者として、モック設定が実装の実際の挙動を正確に反映してほしい。これにより、テストが実運用に近いシナリオを効果的に検証できるようにする。

#### Acceptance Criteria

1. WHEN loadMetadata のモックを構成する THEN 実装フローに合致する期待どおりのタイミングで呼び出されること。
2. WHEN サブディレクトリのシナリオ向けに fetchDirectoryContents のモックを構成する THEN サブディレクトリのプレフィックスを含むパス引数を受け取ること。
3. WHEN 重複検出ロジックをテストする THEN モックのメタデータは既存プロジェクトの状態を正確に表現していること。
4. WHEN --force フラグの挙動をテストする THEN モック実装は上書き操作の正しい検証を可能にすること。
5. WHERE テストの期待でスパイ呼び出しの引数を指定する THEN その引数は実装における関数シグネチャおよび呼び出しパターンに一致していること。
