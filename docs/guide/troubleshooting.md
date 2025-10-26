---
title: トラブルシューティング
description: よくある問題と解決方法
---

# トラブルシューティング

Kirox CLIの使用中に発生する可能性のある問題と、その解決方法を説明します。

## インストールと実行

### Node.jsのバージョンエラー

**エラーメッセージ**:
```
Error: Kirox requires Node.js 18.0.0 or higher
```

**原因**: Node.jsのバージョンが古い

**解決方法**:
```bash
# Node.jsのバージョンを確認
node --version

# Node.js 18以上にアップグレード
# https://nodejs.org/ から最新版をダウンロード

# nvm使用時
nvm install 18
nvm use 18
```

### npxコマンドが見つからない

**エラーメッセージ**:
```
command not found: npx
```

**原因**: npmが古いか、インストールされていない

**解決方法**:
```bash
# npmのバージョンを確認
npm --version

# npmをアップグレード
npm install -g npm@latest
```

## GitHub API関連

### レート制限エラー

**エラーメッセージ**:
```
Error: GitHub API rate limit exceeded
```

**原因**: GitHub APIのレート制限に到達（認証なし: 60リクエスト/時）

**解決方法**:

1. GitHub Personal Access Token（PAT）を設定：
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

2. 設定後、レート制限が5,000リクエスト/時に緩和されます

3. 現在のレート制限状況を確認：
```bash
npx kirox owner/repo -p project --verbose
```

### 認証エラー

**エラーメッセージ**:
```
Error: Bad credentials
```

**原因**: 無効なGitHub Personal Access Token

**解決方法**:

1. PATが正しいか確認：
```bash
echo $GITHUB_TOKEN
```

2. PATのスコープを確認（`public_repo`または`repo`が必要）

3. 新しいPATを生成：
   - [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)

### リポジトリが見つからない

**エラーメッセージ**:
```
Error: Repository not found: owner/repo
```

**原因**: リポジトリが存在しないか、アクセス権限がない

**解決方法**:

1. リポジトリ名のスペルを確認
2. プライベートリポジトリの場合、`GITHUB_TOKEN`を設定
3. リポジトリへのアクセス権限を確認

## ファイル取得関連

### ファイルが見つからない

**エラーメッセージ**:
```
Warning: .kiro/specs/project-name/ not found in repository
```

**原因**: 指定したプロジェクトがリポジトリに存在しない

**解決方法**:

1. プロジェクト名のスペルを確認
2. ブランチを確認（別のブランチに存在する可能性）：
```bash
npx kirox owner/repo#develop -p project-name
```

3. サブディレクトリを確認（モノレポの場合）：
```bash
npx kirox owner/repo -p project-name --subdirectory path/to/subdir
```

4. リポジトリ内の利用可能なプロジェクトを確認：
```bash
# インタラクティブモードで自動検出
npx kirox
```

### ファイルサイズ制限エラー

**エラーメッセージ**:
```
Error: File too large (max 1MB via GitHub API)
```

**原因**: GitHubのContent APIは1MBを超えるファイルを取得できない

**解決方法**:

1. ファイルサイズを確認し、必要に応じて分割
2. 大きなバイナリファイルは`.kiro/`ディレクトリに含めない
3. Git LFS使用時は、APIでの取得が困難な場合がある

## ローカルファイルシステム関連

### 書き込み権限エラー

**エラーメッセージ**:
```
Error: EACCES: permission denied
```

**原因**: ディレクトリへの書き込み権限がない

**解決方法**:

1. ディレクトリの権限を確認：
```bash
ls -la .kiro/
```

2. 権限を修正：
```bash
chmod -R u+w .kiro/
```

3. sudoでの実行は推奨しません（セキュリティリスク）

### 既存ファイルの上書き確認

**現象**: 既存ファイルを上書きするか確認される

**対処方法**:

1. 確認プロンプトで選択：
   - `y`: 上書き
   - `n`: スキップ
   - `a`: すべて上書き

2. 確認をスキップ（`--force`オプション）：
```bash
npx kirox owner/repo -p project --force
```

::: warning 注意
`--force`オプションは既存ファイルを警告なしで上書きします。
:::

3. ドライランで事前確認：
```bash
npx kirox owner/repo -p project --dry-run
```

## ネットワーク関連

### タイムアウトエラー

**エラーメッセージ**:
```
Error: Request timeout
```

**原因**: ネットワーク接続が遅いか、不安定

**解決方法**:

1. インターネット接続を確認
2. ファイアウォールやプロキシ設定を確認
3. 再試行：
```bash
npx kirox owner/repo -p project
```

### プロキシ設定

プロキシ経由でGitHub APIにアクセスする場合：

```bash
# HTTP プロキシ
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# 認証付きプロキシ
export HTTP_PROXY=http://user:pass@proxy.example.com:8080
```

## その他

### 予期しないエラー

**対処方法**:

1. 詳細ログを有効化：
```bash
npx kirox owner/repo -p project --verbose
```

2. デバッグログを確認：
```bash
DEBUG=kirox:* npx kirox owner/repo -p project
```

3. 最新バージョンを使用（npxは自動的に最新版を使用）

4. 問題が解決しない場合は、[GitHubリポジトリ](https://github.com/yukihirop/kirox/issues)でIssueを報告

### ヘルプの表示

問題解決のヒントを得るには：

```bash
# 全般的なヘルプ
npx kirox --help

# サブコマンドのヘルプ
npx kirox add --help
npx kirox completion --help
```

## さらなるサポート

- [GitHub Issues](https://github.com/yukihirop/kirox/issues): バグ報告や機能リクエスト
- [GitHub Discussions](https://github.com/yukihirop/kirox/discussions): 質問やディスカッション
- [CLI リファレンス](/cli/): コマンドとオプションの詳細
