---
description: llms.txt files for LLMs
---

# LLMs.txt

このページでは、LLMが参照するためのドキュメントファイルを提供しています。

## 概要

Kiroxのドキュメントは、LLMが理解しやすい形式で提供しています。

## 利用可能なファイル

### llms.txt

プロジェクトの簡潔な概要と主要なドキュメントへのリンクを含む要約版です。

- [llms.txt](/llms.txt)

このファイルには次の内容が含まれています：

- プロジェクトの概要
- 主要なドキュメントへのリンク
- ガイド（Getting Started, Basic Usage, Advanced Usage, Troubleshooting）
- CLIリファレンス（kirox, add, completion）
- API仕様（GitHub Fetcher, FileSystem Writer）
- コンフィグレーション（.kiroxrc.json）

### llms-full.txt

プロジェクトの完全なドキュメントを含む詳細版です。

- [llms-full.txt](/llms-full.txt)

このファイルには次の内容が含まれています：

- すべてのガイドドキュメントの完全な内容
- CLIリファレンスの完全な内容
- API仕様の完全な内容
- コンフィグレーションリファレンスの完全な内容
- パフォーマンス分析レポートの完全な内容

## 使用方法

### LLMのための推奨事項

1. **クイックリファレンスが必要な場合**: `llms.txt`を使用
2. **詳細な情報が必要な場合**: `llms-full.txt`を使用
3. **特定のトピックを探している場合**: 上記ファイル内でキーワード検索

## 技術的な詳細

これらのファイルは、`vitepress-plugin-llms`プラグインによって自動生成されます。

生成されたファイルは、VitePressのビルドプロセス中に作成され、サイトのルートに配置されます。

## ファイル構造

```
.kirox/
├── specs/
│   └── <project-name>/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
└── steering/
    ├── tech.md
    ├── product.md
    └── structure.md
```

## ダウンロード

生成されたファイルを直接ダウンロードまたは閲覧できます：

- [llms.txt](/llms.txt) - 要約版（軽量）
- [llms-full.txt](/llms-full.txt) - 完全版（詳細）

::: tip ヒント
初めてKirox CLIを使用する場合は`llms.txt`を、詳細な技術情報が必要な場合は`llms-full.txt`を参照してください。
:::

## 関連リソース

- [Guide](/guide/) - 使い方ガイド
- [CLI Reference](/cli/) - CLIコマンドリファレンス
- [API Documentation](/api/) - API仕様
- [Configuration](/config/) - 設定リファレンス

