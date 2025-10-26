---
title: 高度な使い方
description: Kirox CLIの高度な機能と設定
---

# 高度な使い方

Kirox CLIの高度な機能と設定について説明します。

## 設定ファイル（.kiroxrc.json）

プロジェクトルートに`.kiroxrc.json`ファイルを配置することで、デフォルト設定をカスタマイズできます。

### 設定ファイルの作成

```json
{
  "defaultRepository": "yukihirop/my-project",
  "defaultProjects": ["api-spec", "web-spec"],
  "force": false,
  "verbose": false,
  "track": false
}
```

### 設定項目

| 項目 | 型 | 説明 |
|------|------|------|
| `defaultRepository` | `string` | デフォルトのリポジトリ（`owner/repo`形式） |
| `defaultProjects` | `string[]` | デフォルトのプロジェクト一覧 |
| `force` | `boolean` | 上書き確認をスキップ（デフォルト: `false`） |
| `verbose` | `boolean` | 詳細ログを表示（デフォルト: `false`） |
| `track` | `boolean` | 更新追跡を有効化（デフォルト: `false`） |

### 優先順位

設定の優先順位は以下の通りです（上が優先）：

1. コマンドラインオプション
2. `.kiroxrc.json`設定ファイル
3. 環境変数
4. デフォルト値

## ブランチ指定

リポジトリのブランチを指定してファイルを取得できます。

### ブランチ指定の構文

```bash
npx kirox owner/repo#branch -p project-name
```

### 例

```bash
# developブランチから取得
npx kirox yukihirop/my-project#develop -p api-spec

# feature/新機能ブランチから取得
npx kirox yukihirop/my-project#feature/new-feature -p api-spec
```

### インタラクティブモードでのブランチ選択

インタラクティブモードでは、利用可能なブランチを検索可能なチェックボックスで選択できます：

```bash
$ npx kirox

? リポジトリを入力: yukihirop/my-project
? ブランチを選択（検索可能）:
  ❯ ◯ main
    ◯ develop
    ◯ feature/new-feature
```

## サブディレクトリ対応

リポジトリ内のサブディレクトリから`.kiro`ファイルを取得できます。

### サブディレクトリの指定

```bash
npx kirox owner/repo -p project-name --subdirectory path/to/subdir
```

### 例

```bash
# モノレポ内のbackendディレクトリから取得
npx kirox yukihirop/monorepo -p api-spec --subdirectory backend

# フロントエンドとバックエンドの両方から取得
npx kirox yukihirop/monorepo -p web-spec --subdirectory frontend
npx kirox yukihirop/monorepo -p api-spec --subdirectory backend
```

### インタラクティブモードでのサブディレクトリ選択

インタラクティブモードでは、検出されたサブディレクトリを自動的に提示します：

```bash
$ npx kirox

? リポジトリを入力: yukihirop/monorepo
? サブディレクトリを選択:
  ❯ ◯ backend
    ◯ frontend
    ◯ packages/core
```

## 複数プロジェクトの管理

### addサブコマンド

既存のローカルプロジェクトに新しいプロジェクトを追加します：

```bash
npx kirox add owner/repo -p new-project
```

インタラクティブモードでも使用可能：

```bash
npx kirox add
```

### プロジェクト提案機能

インタラクティブモードでは、リポジトリ内の利用可能なプロジェクトを自動検出して提案します：

```bash
$ npx kirox

? リポジトリを入力: yukihirop/my-project
? プロジェクトを選択（検索可能、複数選択可）:
  ❯ ☑ api-spec
    ☑ web-spec
    ☐ mobile-spec
    ☐ infra-spec
```

## シェル補完

bash、zsh、fish、PowerShell、elvishでのシェル補完をサポートしています。

### 補完スクリプトの生成

```bash
# bash
npx kirox completion bash > /etc/bash_completion.d/kirox

# zsh
npx kirox completion zsh > ~/.zsh/completion/_kirox

# fish
npx kirox completion fish > ~/.config/fish/completions/kirox.fish

# PowerShell
npx kirox completion powershell > kirox.ps1

# elvish
npx kirox completion elvish > ~/.elvish/lib/kirox.elv
```

### 補完の有効化

```bash
# bash
source /etc/bash_completion.d/kirox

# zsh (compinit実行後)
source ~/.zsh/completion/_kirox

# fish
# 自動的に読み込まれます
```

## 環境変数

### GITHUB_TOKEN

GitHub API認証に使用します：

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

プライベートリポジトリへのアクセスや、レート制限の緩和に必要です。

### NODE_ENV

実行環境を指定します：

```bash
export NODE_ENV=development  # または production、test
```

### DEBUG

デバッグログを有効化します：

```bash
export DEBUG=kirox:*
npx kirox owner/repo -p project-name
```

## パフォーマンス最適化

### 並列ファイル取得

Kirox CLIは最大5並列でファイルを取得します。これにより、大量のファイル取得時に約80%の時間短縮を実現します。

### レート制限対応

GitHub APIのレート制限を自動的に検出し、適切に対応します：

- **認証なし**: 60リクエスト/時
- **認証あり**: 5,000リクエスト/時

大量のファイルを取得する場合は、`GITHUB_TOKEN`を設定することを推奨します。

## 次のステップ

- [トラブルシューティング](/guide/troubleshooting): よくある問題と解決方法
- [設定リファレンス](/config/kiroxrc): .kiroxrc.jsonの詳細設定
- [API仕様](/api/): Kirox CLIのAPI仕様
