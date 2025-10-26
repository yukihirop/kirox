---
title: API 仕様
description: Kirox CLIのAPI仕様
---

# API 仕様

Kirox CLIの主要モジュールのAPI仕様です。

## アーキテクチャ概要

Kirox CLIは、Layer-Based Architectureを採用しています：

```
CLI Layer (src/cli/)
    ↓
GitHub Integration Layer (src/github/)
    ↓
File System Layer (src/filesystem/)
    ↓
Reporting Layer (src/reporting/)
```

## 主要モジュール

### [GitHub Fetcher](/api/github-fetcher)
GitHubリポジトリからファイルを取得するモジュールです。

**責任範囲**:
- GitHub APIとの通信
- リポジトリコンテンツの取得
- base64エンコードされたコンテンツのデコード
- 並列ファイル取得とセマフォ制御
- レート制限の監視と対応

### [FileSystem Writer](/api/filesystem-writer)
ローカルファイルシステムにファイルを書き込むモジュールです。

**責任範囲**:
- ローカルファイルシステムへの書き込み
- ディレクトリの自動作成
- 既存ファイル上書き確認プロンプト
- --dry-runモードの処理

## アーキテクチャ原則

### 1. Single Responsibility Principle (SRP)
各コンポーネントは単一の責任を持ちます。

### 2. Dependency Inversion Principle (DIP)
上位層は抽象（インターフェース）に依存し、具象に依存しません。

### 3. Layer Isolation
レイヤー間の直接依存を最小化し、GitHub層とFileSystem層は互いに依存しません。

## 開発ガイドライン

### TypeScript
- **厳格な型チェック**: `strict: true`
- **`any`禁止**: 明示的な型定義を強制
- **関数の戻り値型明記**: 推論に頼らず明示的に指定

### Naming
- **関数**: 動詞から始めるキャメルケース（`fetchFiles`, `validateInput`）
- **クラス**: 名詞のパスカルケース（`GitHubFetcher`, `ProgressReporter`）
- **定数**: アッパースネークケース（`MAX_CONCURRENCY`, `DEFAULT_CONFIG`）

### Error Handling
- **カスタムエラークラス**: ドメイン固有のエラー型を定義
- **エラーの適切な伝播**: try-catchで握りつぶさない

### Async/Await
- **Promiseチェーン禁止**: async/awaitを優先
- **並列処理**: `Promise.all()` / `Promise.allSettled()` 使用

## パフォーマンス

- **並列ファイル取得**: 最大5並列
- **大量ファイル取得**: 50ファイル取得時30秒以内
- **メモリ使用量**: 100ファイル取得時100MB以内
- **レート制限回避**: 100ファイル取得時にGitHub APIレート制限に抵触しない

## 次のステップ

- [GitHub Fetcher API](/api/github-fetcher): GitHub連携の詳細
- [FileSystem Writer API](/api/filesystem-writer): ファイルシステム操作の詳細
