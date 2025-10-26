---
title: CLI リファレンス
description: Kirox CLIコマンドのリファレンス
---

# CLI リファレンス

Kirox CLIの全コマンドとオプションのリファレンスです。

## コマンド一覧

### [kirox](/cli/kirox)
メインコマンド。GitHubリポジトリから`.kiro/`ファイルを取得します。

```bash
npx kirox <owner/repo> [options]
```

### [add](/cli/add)
既存のローカルプロジェクトに新しいプロジェクトを追加します。

```bash
npx kirox add <owner/repo> [options]
```

### [completion](/cli/completion)
シェル補完スクリプトを出力します。

```bash
npx kirox completion <shell>
```

## グローバルオプション

すべてのコマンドで使用できるオプション：

| オプション | 短縮形 | 説明 |
|-----------|--------|------|
| `--help` | `-h` | ヘルプを表示 |
| `--version` | `-V` | バージョンを表示 |

## 共通オプション

`kirox`と`add`コマンドで使用できるオプション：

| オプション | 短縮形 | 型 | 説明 |
|-----------|--------|------|------|
| `--project` | `-p` | `string` | プロジェクト名（カンマ区切りで複数指定可） |
| `--force` | `-f` | `boolean` | 上書き確認をスキップ |
| `--dry-run` | | `boolean` | ファイル書き込みをシミュレート |
| `--verbose` | | `boolean` | 詳細ログを表示 |
| `--track` | | `boolean` | 更新追跡を有効化 |
| `--steering` | | `boolean` | ステアリングのみ取得 |
| `--subdirectory` | | `string` | サブディレクトリパス |
| `--config` | `-c` | `string` | 設定ファイルパス |

## 実行例

### 基本的な使い方

```bash
# 特定のプロジェクトを取得
npx kirox yukihirop/my-project -p api-spec

# インタラクティブモード
npx kirox

# ヘルプを表示
npx kirox --help
```

### オプション指定

```bash
# 複数プロジェクトを取得
npx kirox yukihirop/my-project -p api-spec,web-spec

# ブランチ指定
npx kirox yukihirop/my-project#develop -p api-spec

# 上書き確認なし
npx kirox yukihirop/my-project -p api-spec --force

# ドライラン
npx kirox yukihirop/my-project -p api-spec --dry-run

# 詳細ログ
npx kirox yukihirop/my-project -p api-spec --verbose
```

### サブコマンド

```bash
# プロジェクトを追加
npx kirox add yukihirop/my-project -p new-project

# シェル補完スクリプト生成
npx kirox completion bash > /etc/bash_completion.d/kirox
npx kirox completion zsh > ~/.zsh/completion/_kirox
npx kirox completion fish > ~/.config/fish/completions/kirox.fish
```

## 次のステップ

- [kirox コマンド](/cli/kirox): メインコマンドの詳細
- [add コマンド](/cli/add): addサブコマンドの詳細
- [completion コマンド](/cli/completion): completionサブコマンドの詳細
