---
title: 設定
description: Kirox CLIの設定ガイド
---

# 設定

Kirox CLIの設定方法について説明します。

## 設定ファイル

Kirox CLIは、プロジェクトルートに配置した`.kiroxrc.json`ファイルで動作をカスタマイズできます。

### [.kiroxrc.json](/config/kiroxrc)

プロジェクトのデフォルト設定を定義する設定ファイルです。

**配置場所**: プロジェクトルート

**例**:
```json
{
  "defaultRepository": "yukihirop/my-project",
  "defaultProjects": ["api-spec", "web-spec"],
  "force": false,
  "verbose": false,
  "track": false
}
```

## 設定の優先順位

設定は以下の優先順位で適用されます（上が優先）：

1. **コマンドラインオプション**: 実行時に指定したオプション
2. **設定ファイル**: `.kiroxrc.json`の内容
3. **環境変数**: `GITHUB_TOKEN`など
4. **デフォルト値**: 組み込みのデフォルト値

## 環境変数

### GITHUB_TOKEN

GitHub API認証に使用します。

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

**用途**:
- プライベートリポジトリへのアクセス
- レート制限の緩和（60 → 5,000リクエスト/時）

**取得方法**:
1. [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. "Generate new token (classic)"をクリック
3. 以下のスコープを選択：
   - `public_repo`: パブリックリポジトリ読み取り
   - `repo`: プライベートリポジトリ読み取り（必要に応じて）

### NODE_ENV

実行環境を指定します。

```bash
export NODE_ENV=development  # または production、test
```

**影響**: ログレベル、エラー詳細度

### DEBUG

デバッグログを有効化します。

```bash
export DEBUG=kirox:*
npx kirox owner/repo -p project-name
```

## カスタム設定ファイル

デフォルトの`.kiroxrc.json`以外の設定ファイルを使用する場合は、`--config`オプションで指定します。

```bash
npx kirox owner/repo -p project --config custom-config.json
```

## 設定例

### チーム開発の設定

チーム全体で共有するリポジトリを設定：

```json
{
  "defaultRepository": "company/shared-specs",
  "defaultProjects": ["backend-api", "frontend-web"],
  "track": true,
  "verbose": false
}
```

### 個人開発の設定

個人プロジェクト用の設定：

```json
{
  "defaultRepository": "username/my-project",
  "defaultProjects": ["main-spec"],
  "force": true,
  "track": false
}
```

### CI/CD環境の設定

CI/CD環境で使用する設定：

```json
{
  "defaultRepository": "company/project",
  "defaultProjects": ["api-spec"],
  "force": true,
  "verbose": true,
  "track": false
}
```

## 次のステップ

- [.kiroxrc.json リファレンス](/config/kiroxrc): 設定項目の詳細
- [高度な使い方](/guide/advanced-usage): 設定ファイルの活用方法
