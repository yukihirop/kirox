---
title: .kiroxrc.json
description: Kirox CLI設定ファイルのリファレンス
---

# .kiroxrc.json

Kirox CLIの設定ファイルのリファレンスです。

## 概要

`.kiroxrc.json`は、Kirox CLIのデフォルト動作を定義する設定ファイルです。プロジェクトルートに配置することで、コマンド実行時の設定を省略できます。

## ファイル形式

**形式**: JSON
**配置場所**: プロジェクトルート
**ファイル名**: `.kiroxrc.json`

## 設定項目

### defaultRepository

デフォルトのGitHubリポジトリを指定します。

**型**: `string`
**形式**: `owner/repo`
**デフォルト**: なし（未設定）

**例**:
```json
{
  "defaultRepository": "yukihirop/my-project"
}
```

**動作**: リポジトリ引数を省略した場合に使用されます。

```bash
# defaultRepository設定あり
npx kirox -p api-spec
# => yukihirop/my-project から api-spec を取得

# defaultRepository設定なし
npx kirox -p api-spec
# => エラー: リポジトリを指定してください
```

### defaultProjects

デフォルトのプロジェクト一覧を指定します。

**型**: `string[]`
**デフォルト**: なし（未設定）

**例**:
```json
{
  "defaultProjects": ["api-spec", "web-spec", "mobile-spec"]
}
```

**動作**: `--project`オプションを省略した場合に使用されます。

```bash
# defaultProjects設定あり
npx kirox yukihirop/my-project
# => api-spec, web-spec, mobile-spec を取得

# defaultProjects設定なし
npx kirox yukihirop/my-project
# => インタラクティブモードでプロジェクト選択
```

### force

既存ファイルの上書き確認をスキップします。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```json
{
  "force": true
}
```

**動作**:
- `true`: 既存ファイルを確認なしで上書き
- `false`: 既存ファイルがある場合、確認プロンプトを表示

::: warning 注意
`force: true`は既存ファイルを警告なしで上書きします。本番環境での使用には注意が必要です。
:::

### verbose

詳細ログを表示します。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```json
{
  "verbose": true
}
```

**動作**:
- `true`: 詳細なログを表示
- `false`: 通常のログのみ表示

**ログ例**:
```
[DEBUG] Loading config from .kiroxrc.json
[DEBUG] Fetching repository: yukihirop/my-project
[DEBUG] Branch: main
[INFO] Fetching .kiro/specs/api-spec/requirements.md...
```

### track

更新追跡を有効化します。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```json
{
  "track": true
}
```

**動作**:
- `true`: リモートリポジトリの変更を追跡し、変更があったファイルのみを取得
- `false`: すべてのファイルを毎回取得

## 完全な設定例

### 基本設定

```json
{
  "defaultRepository": "yukihirop/my-project",
  "defaultProjects": ["api-spec"],
  "force": false,
  "verbose": false,
  "track": false
}
```

### チーム開発用設定

複数プロジェクトを自動取得し、更新追跡を有効化：

```json
{
  "defaultRepository": "company/shared-specs",
  "defaultProjects": ["backend-api", "frontend-web", "mobile-app"],
  "force": false,
  "verbose": true,
  "track": true
}
```

### CI/CD用設定

強制上書きと詳細ログを有効化：

```json
{
  "defaultRepository": "company/project",
  "defaultProjects": ["api-spec"],
  "force": true,
  "verbose": true,
  "track": false
}
```

### 個人開発用設定

シンプルな設定で強制上書き：

```json
{
  "defaultRepository": "username/my-project",
  "defaultProjects": ["main-spec"],
  "force": true,
  "verbose": false,
  "track": false
}
```

## 設定の優先順位

設定は以下の優先順位で適用されます（上が優先）：

1. **コマンドラインオプション**
   ```bash
   npx kirox owner/repo -p project --force --verbose
   ```

2. **`.kiroxrc.json`設定ファイル**
   ```json
   { "force": false, "verbose": false }
   ```

3. **環境変数**
   ```bash
   export GITHUB_TOKEN=ghp_...
   ```

4. **デフォルト値**
   ```typescript
   { force: false, verbose: false, track: false }
   ```

## カスタム設定ファイル

デフォルトの`.kiroxrc.json`以外の設定ファイルを使用する場合：

```bash
npx kirox owner/repo -p project --config custom-config.json
```

**カスタム設定ファイルの例** (`team-config.json`):
```json
{
  "defaultRepository": "company/team-repo",
  "defaultProjects": ["team-spec"],
  "force": false,
  "verbose": true,
  "track": true
}
```

## 設定ファイルの検証

設定ファイルの形式が正しいか確認するには、`--verbose`オプションで実行します：

```bash
npx kirox owner/repo -p project --verbose
```

**出力例**:
```
[DEBUG] Loading config from .kiroxrc.json
[DEBUG] Config loaded: { defaultRepository: 'yukihirop/my-project', ... }
```

## トラブルシューティング

### 設定ファイルが読み込まれない

**原因**: ファイル名のスペルミスやJSON形式エラー

**解決方法**:
1. ファイル名を確認（`.kiroxrc.json`）
2. JSON形式を検証：
   ```bash
   cat .kiroxrc.json | jq .
   ```

### 設定が反映されない

**原因**: コマンドラインオプションが設定ファイルを上書き

**解決方法**:
1. コマンドラインオプションを確認
2. `--verbose`オプションで設定を確認

### JSON構文エラー

**エラーメッセージ**:
```
Error: Invalid JSON in .kiroxrc.json
```

**解決方法**:
1. JSONリンターで検証
2. コンマ、括弧、引用符を確認

## ベストプラクティス

### チーム開発

- `.kiroxrc.json`をバージョン管理に含める
- チーム全体で共通の設定を使用
- プロジェクト固有の設定を定義

```json
{
  "defaultRepository": "company/shared-specs",
  "defaultProjects": ["backend-api", "frontend-web"],
  "track": true
}
```

### 個人開発

- `.kiroxrc.json`を`.gitignore`に追加（個人設定の場合）
- 頻繁に使用するリポジトリとプロジェクトを設定

```json
{
  "defaultRepository": "username/my-project",
  "defaultProjects": ["main-spec"],
  "force": true
}
```

### CI/CD環境

- 強制上書きと詳細ログを有効化
- 更新追跡は無効化（毎回クリーンな状態で取得）

```json
{
  "force": true,
  "verbose": true,
  "track": false
}
```

## 関連ページ

- [設定ガイド](/config/): 設定の概要
- [高度な使い方](/guide/advanced-usage): 設定ファイルの活用方法
- [CLI リファレンス](/cli/): コマンドとオプションの詳細
