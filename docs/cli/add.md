---
title: add コマンド
description: プロジェクトを追加するサブコマンド
---

# add コマンド

既存のローカルプロジェクトに新しいプロジェクトを追加します。

## 構文

```bash
npx kirox add [<owner/repo>[#branch]] [options]
```

## 概要

`add`サブコマンドは、既存の`.kiro/`ディレクトリに新しいプロジェクトを追加します。メインコマンド（`kirox`）との違いは、既存のステアリングファイルを保持する点です。

**主な違い**:
- **`kirox`**: ステアリングファイルも含めてすべて取得
- **`add`**: 指定したプロジェクトのみを追加し、ステアリングは既存のものを保持

## 引数

### `<owner/repo>[#branch]`

GitHubリポジトリを指定します（オプション）。

**形式**:
- `owner/repo`: リポジトリのみ指定（デフォルトブランチを使用）
- `owner/repo#branch`: ブランチも指定

**例**:
```bash
npx kirox add yukihirop/my-project -p new-project
npx kirox add yukihirop/my-project#develop -p new-project
```

**省略時**: インタラクティブモードで対話形式で入力

## オプション

`add`コマンドは、`kirox`コマンドと同じオプションをサポートします（`--steering`を除く）。

### `-p, --project <projects>`

追加するプロジェクト名を指定します（カンマ区切りで複数指定可）。

**型**: `string`

**例**:
```bash
# 単一プロジェクトを追加
npx kirox add yukihirop/my-project -p new-project

# 複数プロジェクトを追加
npx kirox add yukihirop/my-project -p project1,project2
```

### `-f, --force`

既存ファイルを確認なしで上書きします。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```bash
npx kirox add yukihirop/my-project -p new-project --force
```

### `--dry-run`

ファイル書き込みをシミュレートし、追加するファイルを表示します。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```bash
npx kirox add yukihirop/my-project -p new-project --dry-run
```

### `--verbose`

詳細なログを表示します。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```bash
npx kirox add yukihirop/my-project -p new-project --verbose
```

### `--track`

リモートリポジトリの変更を追跡します。

**型**: `boolean`
**デフォルト**: `false`

**例**:
```bash
npx kirox add yukihirop/my-project -p new-project --track
```

### `--subdirectory <path>`

リポジトリ内のサブディレクトリから`.kiro/`ファイルを取得します。

**型**: `string`

**例**:
```bash
npx kirox add yukihirop/monorepo -p new-project --subdirectory backend
```

### `-c, --config <path>`

設定ファイルのパスを指定します。

**型**: `string`
**デフォルト**: `.kiroxrc.json`

**例**:
```bash
npx kirox add yukihirop/my-project -p new-project --config custom-config.json
```

### `-h, --help`

ヘルプメッセージを表示します。

**例**:
```bash
npx kirox add --help
```

## インタラクティブモード

引数とオプションを省略して実行すると、対話形式で設定できます。

```bash
npx kirox add
```

**プロンプト**:
1. **リポジトリ入力**: `owner/repo`形式で入力
2. **ブランチ選択**: 利用可能なブランチを検索可能なチェックボックスで選択（オプション）
3. **サブディレクトリ選択**: 検出されたサブディレクトリから選択（オプション）
4. **プロジェクト選択**: 利用可能なプロジェクトを検索可能なチェックボックスで選択（複数選択可）

## 使用例

### 基本的な使い方

既存のローカルプロジェクトに新しいプロジェクトを追加：

```bash
# 現在の状態
.kiro/
├── specs/
│   └── api-spec/
└── steering/

# 新しいプロジェクトを追加
npx kirox add yukihirop/my-project -p web-spec

# 追加後
.kiro/
├── specs/
│   ├── api-spec/     # 既存
│   └── web-spec/     # 新規追加
└── steering/         # 変更なし
```

### 複数プロジェクトを追加

```bash
npx kirox add yukihirop/my-project -p mobile-spec,infra-spec
```

### ブランチ指定で追加

```bash
npx kirox add yukihirop/my-project#develop -p new-project
```

### サブディレクトリから追加

```bash
npx kirox add yukihirop/monorepo -p new-project --subdirectory frontend
```

### インタラクティブモードで追加

```bash
$ npx kirox add

? リポジトリを入力: yukihirop/my-project
? ブランチを選択（検索可能）: main
? サブディレクトリを選択: (スキップ)
? プロジェクトを選択（検索可能、複数選択可）:
  ☑ web-spec
  ☑ mobile-spec
  ☐ infra-spec
```

## kiroxコマンドとの比較

| 特徴 | `kirox` | `kirox add` |
|------|---------|-------------|
| ステアリング取得 | ✓ | ✗ |
| プロジェクト追加 | ✓ | ✓ |
| 既存ステアリング保持 | ✗ | ✓ |
| 用途 | 初回セットアップ | 追加のプロジェクト取得 |

## 実行フロー

1. **既存`.kiro/`ディレクトリの確認**: 存在しない場合は警告
2. **設定読み込み**: `.kiroxrc.json`またはカスタム設定ファイル
3. **GitHub API認証**: `GITHUB_TOKEN`環境変数（オプション）
4. **リポジトリ情報取得**: ブランチ、サブディレクトリ、プロジェクト一覧
5. **プロジェクトファイル取得**: 指定したプロジェクトのみ取得
6. **ファイル書き込み**: ローカル`.kiro/specs/`に保存
7. **サマリー表示**: 成功・失敗ファイル数を表示

::: tip ヒント
`.kiro/`ディレクトリが存在しない場合は、まず`kirox`コマンドで初回セットアップを行ってください。
:::

## 終了コード

| コード | 説明 |
|-------|------|
| `0` | 成功 |
| `1` | 引数エラー |
| `2` | GitHub APIエラー |
| `3` | ファイルシステムエラー |
| `4` | 設定エラー |

## 関連ページ

- [kirox コマンド](/cli/kirox): メインコマンドの詳細
- [基本的な使い方](/guide/basic-usage): 基本的なコマンド使用方法
- [高度な使い方](/guide/advanced-usage): 設定ファイル、ブランチ指定、サブディレクトリ対応
