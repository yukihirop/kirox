# Requirements Document

## Project Description (Input)
[kirox-track-default-false] --trackのデフォルト値をfalseにしたいです。

## Introduction

Kirox CLIの`--track`オプションは、取得したファイルのメタデータを記録し、更新検知機能を有効化します。現在のデフォルト値は`true`ですが、多くのユースケースでは更新追跡が不要であり、不要なメタデータファイル生成を避けるため、デフォルト値を`false`に変更します。これにより、ユーザーが明示的に`--track`を指定した場合のみ更新追跡機能が有効化され、より直感的な挙動となります。

## Requirements

### Requirement 1: CLI引数パーサーのデフォルト値変更
**Objective:** As a kirox開発者, I want `--track`オプションのデフォルト値を`false`に設定する, so that 更新追跡機能が明示的な指定でのみ有効化される

#### Acceptance Criteria

1. WHEN Kirox CLIが引数なしで実行される THEN ArgumentParser SHALL set track option to false by default
2. WHEN `--track`オプションが明示的に指定される THEN ArgumentParser SHALL set track option to true
3. WHEN `--check-updates`または`--update`オプションが指定される THEN ArgumentParser SHALL set track option to false regardless of explicit --track flag

### Requirement 2: 既存テストケースの更新
**Objective:** As a kirox開発者, I want 既存のテストケースを新しいデフォルト値に合わせて更新する, so that テストスイート全体が正しく動作する

#### Acceptance Criteria

1. WHEN 単体テスト（parser.test.ts）が実行される THEN Test Suite SHALL verify track default value is false
2. WHEN 統合テスト（E2Eテスト）が実行される THEN Test Suite SHALL use explicit track: false in test expectations where track was previously implicitly true
3. WHEN 全テストが実行される THEN Test Suite SHALL pass with 100% success rate

### Requirement 3: 後方互換性の確保
**Objective:** As a kiroxユーザー, I want 明示的に`--track`を指定していた既存の使用パターンが継続して動作する, so that 既存のワークフローが破壊されない

#### Acceptance Criteria

1. WHEN ユーザーが`npx kirox owner/repo -p project --track`を実行する THEN Kirox CLI SHALL enable tracking functionality as before
2. WHEN ユーザーが`npx kirox owner/repo -p project`を実行する THEN Kirox CLI SHALL not create .kirox-metadata.json file
3. WHEN `.kiroxrc.json`に`"track": true`が設定されている THEN Kirox CLI SHALL respect the configuration file setting

### Requirement 4: ドキュメンテーションとヘルプメッセージ
**Objective:** As a kiroxユーザー, I want ヘルプメッセージとドキュメントが新しいデフォルト値を反映する, so that 正確な使用方法を理解できる

#### Acceptance Criteria

1. WHEN ユーザーが`npx kirox --help`を実行する THEN Kirox CLI SHALL display help text indicating --track defaults to false
2. WHERE README.mdまたはドキュメント THE Documentation SHALL accurately describe the default behavior of --track option
3. WHEN ユーザーがオプションの説明を読む THEN Documentation SHALL clarify that tracking must be explicitly enabled

### Requirement 5: インタラクティブモードでの動作
**Objective:** As a kiroxユーザー, I want インタラクティブモードでも新しいデフォルト値が適用される, so that 一貫した挙動を体験できる

#### Acceptance Criteria

1. WHEN ユーザーがインタラクティブモードで`npx kirox`を実行する THEN Kirox CLI SHALL default track to false unless explicitly specified
2. WHEN インタラクティブモードでtrackオプションのプロンプトが表示される THEN Kirox CLI SHALL show false as the default value
3. IF ユーザーがインタラクティブモードでtrackを有効化する THEN Kirox CLI SHALL create metadata file as expected
