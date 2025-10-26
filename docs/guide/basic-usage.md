---
title: 基本的な使い方
description: Kirox CLIの基本的なコマンドとオプション
---

# 基本的な使い方

Kirox CLIの基本的なコマンドとオプションについて説明します。

## 基本コマンド

### リポジトリからファイルを取得

```bash
npx kirox <owner/repo> -p <project-name>
```

**例**:
```bash
npx kirox yukihirop/my-project -p my-spec
```

これにより、以下のファイルが取得されます：
- `.kiro/specs/my-spec/` 配下のすべてのファイル
- `.kiro/steering/` 配下のすべてのファイル

### インタラクティブモード

オプションなしで実行すると、対話形式で設定できます：

```bash
npx kirox
```

## 主要オプション

### プロジェクト指定 (`-p, --project`)

取得するプロジェクトを指定します：

```bash
# 単一プロジェクト
npx kirox owner/repo -p project1

# 複数プロジェクト（カンマ区切り）
npx kirox owner/repo -p project1,project2,project3
```

### 更新追跡 (`--track`)

リモートリポジトリの変更を追跡します：

```bash
npx kirox owner/repo -p project1 --track
```

デフォルトは`false`です。`--track`を指定すると、次回実行時に変更があったファイルのみを取得します。

### ステアリングのみ取得 (`--steering`)

`.kiro/steering/`のみを取得し、プロジェクト仕様をスキップします：

```bash
npx kirox owner/repo --steering
```

### 上書き確認スキップ (`-f, --force`)

既存ファイルを確認なしで上書きします：

```bash
npx kirox owner/repo -p project1 --force
```

::: warning 注意
`--force`オプションは既存ファイルを警告なしで上書きします。使用には注意が必要です。
:::

### ドライラン (`--dry-run`)

実際にファイルを書き込まず、取得するファイルを確認します：

```bash
npx kirox owner/repo -p project1 --dry-run
```

### 詳細ログ (`--verbose`)

詳細なログを表示します：

```bash
npx kirox owner/repo -p project1 --verbose
```

## 実行例

### 基本的な取得

```bash
$ npx kirox yukihirop/my-project -p api-spec

✓ Fetching files from yukihirop/my-project...
✓ [1/5] requirements.md
✓ [2/5] design.md
✓ [3/5] tasks.md
✓ [4/5] spec.json
✓ [5/5] steering/tech.md

Summary:
  Succeeded: 5 files
  Failed: 0 files
```

### 複数プロジェクトの取得

```bash
$ npx kirox yukihirop/my-project -p api-spec,web-spec

✓ Fetching files from yukihirop/my-project...
✓ Project: api-spec (5 files)
✓ Project: web-spec (4 files)

Summary:
  Succeeded: 9 files
  Failed: 0 files
```

### ドライランで確認

```bash
$ npx kirox yukihirop/my-project -p api-spec --dry-run

[DRY RUN] The following files would be fetched:
  .kiro/specs/api-spec/requirements.md
  .kiro/specs/api-spec/design.md
  .kiro/specs/api-spec/tasks.md
  .kiro/specs/api-spec/spec.json
  .kiro/steering/tech.md

No files were written (dry run mode).
```

## ヘルプの表示

コマンドのヘルプを表示：

```bash
npx kirox --help
```

サブコマンドのヘルプを表示：

```bash
npx kirox add --help
npx kirox completion --help
```

## 次のステップ

- [高度な使い方](/guide/advanced-usage): 設定ファイル、ブランチ指定、サブディレクトリ対応
- [CLI リファレンス](/cli/): 全コマンドとオプションの詳細
- [トラブルシューティング](/guide/troubleshooting): よくある問題と解決方法
