---
title: GitHub Fetcher API
description: GitHub連携モジュールのAPI仕様
---

# GitHub Fetcher API

GitHubリポジトリからファイルを取得するモジュールのAPI仕様です。

## 概要

GitHub Fetcher (`src/github/`)は、GitHub REST APIを使用してリポジトリコンテンツを取得するレイヤーです。

**主要機能**:
- リポジトリコンテンツの取得（ディレクトリ一覧、ファイルコンテンツ）
- base64エンコードされたコンテンツのデコード
- 並列ファイル取得とセマフォ制御
- レート制限の監視と対応

## ディレクトリ構造

```
src/github/
├── fetcher.ts        # GitHubFetcher: ファイル取得のメインロジック
├── client.ts         # Octokitクライアント初期化と認証
├── semaphore.ts      # セマフォによる並列度制御ユーティリティ
├── rate-limit.ts     # レート制限チェックとモニタリング
└── types.ts          # GitHub層の型定義（FetchResult, FileContent等）
```

## 主要クラスとインターフェース

### GitHubFetcher

リポジトリからファイルを取得するメインクラスです。

#### コンストラクタ

```typescript
class GitHubFetcher {
  constructor(
    private octokit: Octokit,
    private options: FetcherOptions
  ) {}
}
```

**パラメータ**:
- `octokit`: Octokitインスタンス
- `options`: フェッチャーオプション

#### メソッド

##### fetchFiles()

指定したリポジトリからファイルを取得します。

```typescript
async fetchFiles(
  owner: string,
  repo: string,
  paths: string[],
  ref?: string
): Promise<FetchResult[]>
```

**パラメータ**:
- `owner`: リポジトリオーナー名
- `repo`: リポジトリ名
- `paths`: 取得するファイルパスの配列
- `ref`: ブランチ名、タグ、コミットSHA（オプション）

**戻り値**: `FetchResult[]` - 取得結果の配列

**例**:
```typescript
const fetcher = new GitHubFetcher(octokit, options);
const results = await fetcher.fetchFiles(
  'yukihirop',
  'my-project',
  ['.kiro/specs/api-spec/requirements.md', '.kiro/steering/tech.md'],
  'main'
);
```

##### fetchDirectoryContents()

指定したディレクトリのコンテンツ一覧を取得します。

```typescript
async fetchDirectoryContents(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<DirectoryContent[]>
```

**パラメータ**:
- `owner`: リポジトリオーナー名
- `repo`: リポジトリ名
- `path`: ディレクトリパス
- `ref`: ブランチ名、タグ、コミットSHA（オプション）

**戻り値**: `DirectoryContent[]` - ディレクトリコンテンツの配列

##### fetchFilesInParallel()

複数のファイルを並列で取得します（最大5並列）。

```typescript
async fetchFilesInParallel(
  owner: string,
  repo: string,
  paths: string[],
  ref?: string
): Promise<FetchResult[]>
```

**パラメータ**:
- `owner`: リポジトリオーナー名
- `repo`: リポジトリ名
- `paths`: 取得するファイルパスの配列
- `ref`: ブランチ名、タグ、コミットSHA（オプション）

**戻り値**: `FetchResult[]` - 取得結果の配列

## 型定義

### FetchResult

ファイル取得結果を表します。

```typescript
interface FetchResult {
  path: string;
  content: string | null;
  success: boolean;
  error?: string;
  size?: number;
  sha?: string;
}
```

**プロパティ**:
- `path`: ファイルパス
- `content`: ファイルコンテンツ（取得成功時）
- `success`: 取得成功フラグ
- `error`: エラーメッセージ（取得失敗時）
- `size`: ファイルサイズ（バイト）
- `sha`: GitオブジェクトSHA

### DirectoryContent

ディレクトリコンテンツを表します。

```typescript
interface DirectoryContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
}
```

**プロパティ**:
- `name`: ファイル/ディレクトリ名
- `path`: 相対パス
- `type`: タイプ（`file`または`dir`）
- `size`: ファイルサイズ（バイト、ファイルのみ）
- `sha`: GitオブジェクトSHA

### FetcherOptions

フェッチャーオプションを表します。

```typescript
interface FetcherOptions {
  maxConcurrency?: number;  // 最大並列数（デフォルト: 5）
  timeout?: number;          // タイムアウト（ミリ秒、デフォルト: 30000）
  retries?: number;          // リトライ回数（デフォルト: 3）
}
```

## セマフォ制御

### Semaphore

並列度を制御するセマフォクラスです。

```typescript
class Semaphore {
  constructor(private maxConcurrency: number) {}

  async acquire(): Promise<void>
  release(): void
}
```

**使用例**:
```typescript
const semaphore = new Semaphore(5);

await semaphore.acquire();
try {
  // 並列処理
  await fetchFile();
} finally {
  semaphore.release();
}
```

## レート制限管理

### RateLimitManager

GitHub APIのレート制限を管理します。

```typescript
class RateLimitManager {
  async checkRateLimit(octokit: Octokit): Promise<RateLimitStatus>
  async waitForRateLimit(octokit: Octokit): Promise<void>
}
```

#### checkRateLimit()

現在のレート制限状況を取得します。

**戻り値**: `RateLimitStatus`

```typescript
interface RateLimitStatus {
  limit: number;       // レート制限（リクエスト数）
  remaining: number;   // 残りリクエスト数
  reset: number;       // リセット時刻（UNIXタイムスタンプ）
  used: number;        // 使用済みリクエスト数
}
```

## エラーハンドリング

### GitHubAPIError

GitHub APIエラーを表すカスタムエラークラスです。

```typescript
class GitHubAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public response?: any
  ) {
    super(message);
  }
}
```

**エラーコード**:
- `404`: リポジトリまたはファイルが見つからない
- `403`: レート制限超過または権限不足
- `401`: 認証エラー
- `500`: サーバーエラー

## 使用例

### 基本的な使い方

```typescript
import { Octokit } from 'octokit';
import { GitHubFetcher } from './github/fetcher';

// Octokitクライアントの初期化
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// GitHubFetcherの初期化
const fetcher = new GitHubFetcher(octokit, {
  maxConcurrency: 5,
  timeout: 30000,
  retries: 3
});

// ファイルを取得
const results = await fetcher.fetchFiles(
  'yukihirop',
  'my-project',
  ['.kiro/specs/api-spec/requirements.md'],
  'main'
);

results.forEach(result => {
  if (result.success) {
    console.log(`✓ ${result.path}: ${result.size} bytes`);
  } else {
    console.error(`✗ ${result.path}: ${result.error}`);
  }
});
```

### 並列ファイル取得

```typescript
const paths = [
  '.kiro/specs/api-spec/requirements.md',
  '.kiro/specs/api-spec/design.md',
  '.kiro/specs/api-spec/tasks.md',
  '.kiro/steering/tech.md',
  '.kiro/steering/structure.md'
];

const results = await fetcher.fetchFilesInParallel(
  'yukihirop',
  'my-project',
  paths,
  'main'
);
```

### ディレクトリコンテンツの取得

```typescript
const contents = await fetcher.fetchDirectoryContents(
  'yukihirop',
  'my-project',
  '.kiro/specs',
  'main'
);

contents.forEach(item => {
  console.log(`${item.type}: ${item.path}`);
});
```

## パフォーマンス

### 並列処理

- **最大並列数**: 5リクエスト
- **大量ファイル取得**: 50ファイル取得時30秒以内
- **時間短縮**: 約80%の時間短縮（並列処理使用時）

### レート制限

- **認証なし**: 60リクエスト/時
- **認証あり**: 5,000リクエスト/時

## 関連ページ

- [FileSystem Writer API](/api/filesystem-writer): ファイルシステム操作の詳細
- [API 仕様](/api/): API仕様の概要
