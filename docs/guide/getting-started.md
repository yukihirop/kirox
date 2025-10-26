---
title: はじめに
description: Kirox CLIのインストール方法と初期設定
---

# はじめに

Kirox CLIを使い始めるための手順を説明します。

## 前提条件

Kirox CLIを使用するには、以下の環境が必要です：

- **Node.js 18.0.0以上**: [Node.js公式サイト](https://nodejs.org/)からダウンロード
- **npm 9以上**: Node.jsに同梱されています
- **Git**: バージョン管理ツール（オプション）

バージョンの確認：

```bash
node --version  # v18.0.0以上
npm --version   # 9.0.0以上
```

## インストール

Kirox CLIは**グローバルインストール不要**で、npxコマンドで即座に実行できます。

### npxで実行（推奨）

```bash
npx kirox owner/repo -p project-name
```

常に最新バージョンが実行されるため、この方法を推奨します。

### グローバルインストール

頻繁に使用する場合は、グローバルインストールも可能です：

```bash
npm install -g kirox
kirox owner/repo -p project-name
```

## 初回実行

### 基本的な使い方

GitHubリポジトリから仕様書を取得します：

```bash
npx kirox yukihirop/my-project -p my-spec
```

### インタラクティブモード

オプションなしで実行すると、対話形式で設定できます：

```bash
npx kirox
```

プロンプトに従って以下を入力します：
1. GitHubリポジトリ（例: `yukihirop/my-project`）
2. ブランチ（オプション）
3. サブディレクトリ（オプション）
4. プロジェクト名（複数選択可能）

## GitHub認証（オプション）

プライベートリポジトリにアクセスする場合や、GitHub APIのレート制限を緩和したい場合は、Personal Access Token（PAT）を設定します。

### PATの取得

1. [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)にアクセス
2. "Generate new token (classic)"をクリック
3. 以下のスコープを選択：
   - `public_repo`: パブリックリポジトリ読み取り
   - `repo`: プライベートリポジトリ読み取り（必要に応じて）
4. トークンを生成してコピー

### 環境変数の設定

```bash
# macOS / Linux
export GITHUB_TOKEN=ghp_your_token_here

# Windows (PowerShell)
$env:GITHUB_TOKEN="ghp_your_token_here"
```

永続的に設定する場合は、`.bashrc`、`.zshrc`、または`.profile`に追加します：

```bash
echo 'export GITHUB_TOKEN=ghp_your_token_here' >> ~/.bashrc
source ~/.bashrc
```

## 動作確認

以下のコマンドで、Kirox CLIが正しく動作することを確認します：

```bash
npx kirox --help
```

ヘルプメッセージが表示されれば、正常にインストールされています。

## 次のステップ

- [基本的な使い方](/guide/basic-usage): コマンドとオプションの詳細
- [高度な使い方](/guide/advanced-usage): 設定ファイルと高度な機能
- [CLI リファレンス](/cli/): 全コマンドのリファレンス
