---
description: Details about llms.txt files
---

# LLMs.txt ファイルの詳細

このページでは、LLMが参照するためのドキュメントファイル（`llms.txt`および`llms-full.txt`）について詳しく説明します。

## llms.txt について

### 目的

`llms.txt`は、LLMがKirox CLIを理解するための要約版ドキュメントです。プロジェクトの概要と主要なドキュメントへのリンクを含んでいます。

### 内容

1. **プロジェクトの概要**
   - Kiroxとは何か
   - 主な機能
   - 使い方の概要

2. **主要ドキュメントへのリンク**
   - ガイド
   - CLIリファレンス
   - API仕様
   - コンフィグレーション

### 使用例

LLMがKirox CLIについて質問された際、最初に`llms.txt`を参照することで迅速に概要を把握できます。

## llms-full.txt について

### 目的

`llms-full.txt`は、LLMがKirox CLIの詳細な技術情報を理解するための完全なドキュメントです。

### 内容

1. **すべてのガイドドキュメント**
   - Getting Started
   - Basic Usage
   - Advanced Usage
   - Troubleshooting

2. **完全なCLIリファレンス**
   - kirox コマンド
   - add サブコマンド
   - completion サブコマンド

3. **API仕様**
   - GitHub Fetcher
   - FileSystem Writer

4. **コンフィグレーションリファレンス**
   - .kiroxrc.json
   - 設定オプション
   - 設定例

5. **パフォーマンス分析**
   - パフォーマンスメトリクス
   - ベンチマーク結果
   - 最適化方法

### 使用例

LLMが特定の技術的な質問に対して正確な回答をする必要がある場合、`llms-full.txt`を参照します。

## 生成プロセス

これらのファイルは、`vitepress-plugin-llms`プラグインによって自動生成されます。

### 生成タイミング

1. VitePressのビルドプロセス中に生成
2. 開発サーバーの起動時に生成
3. ビルドアーティファクトとして配布

### 生成場所

生成されたファイルは、以下の場所に配置されます：

```
docs/.vitepress/dist/
├── llms.txt
└── llms-full.txt
```

## ブラウザでのアクセス

ビルドされたサイトでは、以下のURLでアクセスできます：

- [llms.txt](https://yukihirop.github.io/kirox/llms.txt)
- [llms-full.txt](https://yukihirop.github.io/kirox/llms-full.txt)

## ダウンロード

生成されたファイルは以下のURLからアクセスできます：

- [llms.txt](https://yukihirop.github.io/kirox/llms.txt) - 要約版
- [llms-full.txt](https://yukihirop.github.io/kirox/llms-full.txt) - 完全版

## LLMとの統合

### LangChain使用例

```python
from langchain.document_loaders import TextLoader

# llms.txtを読み込む
loader = TextLoader('https://yukihirop.github.io/kirox/llms.txt')
docs = loader.load()

# ベクトルストアを作成
vectorstore = FAISS.from_documents(docs, embeddings)

# 質問に答える
response = chain.run("Kirox CLIの使い方を教えて")
```

### OpenAI API使用例

```python
import requests

# llms.txtを取得
response = requests.get('https://yukihirop.github.io/kirox/llms.txt')
llms_content = response.text

# OpenAI APIに送信
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": llms_content},
        {"role": "user", "content": "Kirox CLIの使い方を教えて"}
    ]
)
```

## ファイルフォーマット

### llms.txt形式

```
# Kirox

> Recycle .kiro CLI

CLI tool to fetch Kiro specification and steering files from remote GitHub repositories

## Table of Contents

### Guide

- [Guide](/kirox/guide.md): User guide for Kirox CLI
- [Getting Started](/kirox/guide/getting-started.md): ...
...
```

### llms-full.txt形式

```
---
url: /kirox/config/kiroxrc.md
description: Kirox CLI configuration file reference
---

# .kiroxrc.json

Reference for the Kirox CLI configuration file.
...
```

## ベストプラクティス

### LLMに最適化された書き方

1. **明確な見出し**: 各セクションに明確なタイトルを付ける
2. **具体的な例**: コード例や使用例を含める
3. **簡潔な説明**: 長い文章を避け、箇条書きを使用
4. **構造化された情報**: 表やリストを使用して情報を整理

### ファイルサイズの管理

- `llms.txt`: 約40行（要約版）
- `llms-full.txt`: 約3,000行以上（完全版）

## トラブルシューティング

### ファイルが見つからない場合

1. ビルドが正常に完了しているか確認
2. `.vitepress/dist/`ディレクトリを確認
3. プラグインの設定が正しいか確認

### 内容が古い場合

1. ドキュメントのソースファイルを更新
2. VitePressを再ビルド
3. キャッシュをクリア

## 関連リソース

- [llms.txt](/llms.txt) - 要約版ドキュメント
- [llms-full.txt](/llms-full.txt) - 完全版ドキュメント
- [vitepress-plugin-llms](https://github.com/llm-txt/vitepress-plugin-llms) - プラグインのGitHub
- [LLM.text標準](https://llmtext.com/) - llms.txtファイルの標準仕様

