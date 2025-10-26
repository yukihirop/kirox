---
title: kirox コマンド
description: Kirox CLIのメインコマンド
---

# kirox コマンド

GitHubリポジトリから`.kiro/specs/`と`.kiro/steering/`のファイルを取得します。

## 構文

```bash
npx kirox [<owner/repo>[#branch]] [options]
```

## 引数

### `<owner/repo>[#branch]`

GitHubリポジトリを指定します（オプション）。

**形式**:
- `owner/repo`: リポジトリのみ指定（デフォルトブランチを使用）
- `owner/repo#branch`: ブランチも指定

**例**:
```bash
npx kirox yukihirop/my-project
npx kirox yukihirop/my-project#develop
npx kirox yukihirop/my-project#feature/new-feature
```

**省略時**: インタラクティブモードで対話形式で入力

## オプション

### `-p, --project <projects>`

取得するプロジェクト名を指定します（カンマ区切りで複数指定可）。

**型**: `string`

**例**:
```bash
# 単一プロジェクト
npx kirox yukihirop/my-project -p api-spec

# 複数プロジェクト
npx kirox yukihirop/my-project -p api-spec,web-spec,mobile-spec
```

**省略時**:
- 非インタラクティブモード: エラー（`--steering`オプション使用時を除く）
- インタラクティブモード: 利用可能なプロジェクトを自動検出して提示

### `--track`

リモートリポジトリの変更を追跡します。

**型**: `boolean`
**デフォルト**: `false`

**動作**:
- 初回実行時: すべてのファイルを取得し、メタデータを保存
- 2回目以降: 変更があったファイルのみを取得

**例**:
```bash
npx kirox yukihirop/my-project -p api-spec --track
```

### `--steering`

`.kiro/steering/`のみを取得し、プロジェクト仕様をスキップします。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```bash
npx kirox yukihirop/my-project --steering
```

::: tip ヒント
チーム全体で共有するステアリング情報のみを取得したい場合に便利です。
:::

### `-f, --force`

既存ファイルを確認なしで上書きします。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```bash
npx kirox yukihirop/my-project -p api-spec --force
```

::: warning 注意
`--force`オプションは既存ファイルを警告なしで上書きします。使用には注意が必要です。
:::

### `--dry-run`

ファイル書き込みをシミュレートし、取得するファイルを表示します。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```bash
npx kirox yukihirop/my-project -p api-spec --dry-run
```

**出力例**:
```
[DRY RUN] The following files would be fetched:
  .kiro/specs/api-spec/requirements.md
  .kiro/specs/api-spec/design.md
  .kiro/specs/api-spec/tasks.md
  .kiro/specs/api-spec/spec.json
  .kiro/steering/tech.md
```

### `--verbose`

詳細なログを表示します。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```bash
npx kirox yukihirop/my-project -p api-spec --verbose
```

**出力例**:
```
[DEBUG] Loading config from .kiroxrc.json
[DEBUG] Fetching repository: yukihirop/my-project
[DEBUG] Branch: main
[DEBUG] Project: api-spec
[INFO] Fetching .kiro/specs/api-spec/requirements.md...
[INFO] Fetched 1024 bytes
```

### `--subdirectory <path>`

リポジトリ内のサブディレクトリから`.kiro/`ファイルを取得します。

**型**: `string`

**例**:
```bash
# モノレポ内のbackendディレクトリから取得
npx kirox yukihirop/monorepo -p api-spec --subdirectory backend

# ネストしたサブディレクトリ
npx kirox yukihirop/monorepo -p api-spec --subdirectory packages/core
```

### `-c, --config <path>`

設定ファイルのパスを指定します。

**型**: `string`
**デフォルト**: `.kiroxrc.json`

**例**:
```bash
npx kirox yukihirop/my-project -p api-spec --config custom-config.json
```

### `-h, --help`

ヘルプメッセージを表示します。

**例**:
```bash
npx kirox --help
```

### `-V, --version`

Kirox CLIのバージョンを表示します。

**例**:
```bash
npx kirox --version
```

## インタラクティブモード

引数とオプションを省略して実行すると、対話形式で設定できます。

```bash
npx kirox
```

**プロンプト**:
1. **リポジトリ入力**: `owner/repo`形式で入力
2. **ブランチ選択**: 利用可能なブランチを検索可能なチェックボックスで選択（オプション）
3. **サブディレクトリ選択**: 検出されたサブディレクトリから選択（オプション）
4. **プロジェクト選択**: 利用可能なプロジェクトを検索可能なチェックボックスで選択（複数選択可）

## 使用例

### 基本的な使い方

```bash
# 特定のプロジェクトを取得
npx kirox yukihirop/my-project -p api-spec
```

### ブランチ指定

```bash
# developブランチから取得
npx kirox yukihirop/my-project#develop -p api-spec

# feature/新機能ブランチから取得
npx kirox yukihirop/my-project#feature/new-feature -p api-spec
```

### 複数プロジェクト

```bash
# 複数プロジェクトを取得
npx kirox yukihirop/my-project -p api-spec,web-spec,mobile-spec
```

### サブディレクトリ

```bash
# モノレポ内のbackendディレクトリから取得
npx kirox yukihirop/monorepo -p api-spec --subdirectory backend
```

### オプション組み合わせ

```bash
# ドライラン + 詳細ログ
npx kirox yukihirop/my-project -p api-spec --dry-run --verbose

# 強制上書き + 更新追跡
npx kirox yukihirop/my-project -p api-spec --force --track

# ステアリングのみ + カスタム設定ファイル
npx kirox yukihirop/my-project --steering --config team-config.json
```

## 実行フロー

1. **設定読み込み**: `.kiroxrc.json`またはカスタム設定ファイル
2. **GitHub API認証**: `GITHUB_TOKEN`環境変数（オプション）
3. **リポジトリ情報取得**: ブランチ、サブディレクトリ、プロジェクト一覧
4. **ファイル取得**: 最大5並列でファイルを取得
5. **ファイル書き込み**: ローカル`.kiro/`ディレクトリに保存
6. **サマリー表示**: 成功・失敗ファイル数を表示

## 環境変数

### GITHUB_TOKEN

GitHub API認証に使用します。

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

プライベートリポジトリへのアクセスや、レート制限の緩和に必要です。

## 終了コード

| コード | 説明 |
|-------|------|
| `0` | 成功 |
| `1` | 引数エラー |
| `2` | GitHub APIエラー |
| `3` | ファイルシステムエラー |
| `4` | 設定エラー |

## 関連ページ

- [基本的な使い方](/guide/basic-usage): 基本的なコマンド使用方法
- [高度な使い方](/guide/advanced-usage): 設定ファイル、ブランチ指定、サブディレクトリ対応
- [トラブルシューティング](/guide/troubleshooting): よくある問題と解決方法
