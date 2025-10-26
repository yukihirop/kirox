---
title: FileSystem Writer API
description: ファイルシステム操作モジュールのAPI仕様
---

# FileSystem Writer API

ローカルファイルシステムにファイルを書き込むモジュールのAPI仕様です。

## 概要

FileSystem Writer (`src/filesystem/`)は、ローカルファイルシステムへの書き込みを担当するレイヤーです。

**主要機能**:
- ローカルファイルシステムへの書き込み
- ディレクトリの自動作成（`.kiro/specs/`, `.kiro/steering/`）
- 既存ファイル上書き確認プロンプト
- --dry-runモードの処理（書き込みスキップ）

## ディレクトリ構造

```
src/filesystem/
├── writer.ts          # FileWriter: ファイル書き込みメインロジック
├── prompt.ts          # PromptService: 対話的プロンプト（上書き確認）
├── path-utils.ts      # パス変換ユーティリティ（リモート→ローカル）
└── types.ts           # ファイルシステム層の型定義（WriteOptions等）
```

## 主要クラスとインターフェース

### FileWriter

ファイルを書き込むメインクラスです。

#### コンストラクタ

```typescript
class FileWriter {
  constructor(private options: WriterOptions) {}
}
```

**パラメータ**:
- `options`: ライターオプション

#### メソッド

##### writeFiles()

複数のファイルをローカルファイルシステムに書き込みます。

```typescript
async writeFiles(
  files: FileContent[],
  options?: WriteOptions
): Promise<WriteResult[]>
```

**パラメータ**:
- `files`: 書き込むファイルの配列
- `options`: 書き込みオプション（オプション）

**戻り値**: `WriteResult[]` - 書き込み結果の配列

**例**:
```typescript
const writer = new FileWriter({ force: false, dryRun: false });
const results = await writer.writeFiles([
  { path: '.kiro/specs/api-spec/requirements.md', content: '...' },
  { path: '.kiro/steering/tech.md', content: '...' }
]);
```

##### writeFile()

単一のファイルを書き込みます。

```typescript
async writeFile(
  filePath: string,
  content: string,
  options?: WriteOptions
): Promise<WriteResult>
```

**パラメータ**:
- `filePath`: ファイルパス
- `content`: ファイルコンテンツ
- `options`: 書き込みオプション（オプション）

**戻り値**: `WriteResult` - 書き込み結果

##### ensureDirectory()

ディレクトリが存在することを確認し、存在しない場合は作成します。

```typescript
async ensureDirectory(dirPath: string): Promise<void>
```

**パラメータ**:
- `dirPath`: ディレクトリパス

## 型定義

### FileContent

ファイルコンテンツを表します。

```typescript
interface FileContent {
  path: string;
  content: string;
  mode?: string;
}
```

**プロパティ**:
- `path`: ファイルパス
- `content`: ファイルコンテンツ
- `mode`: ファイルモード（オプション、デフォルト: `0o644`）

### WriteResult

ファイル書き込み結果を表します。

```typescript
interface WriteResult {
  path: string;
  success: boolean;
  action: 'created' | 'updated' | 'skipped';
  error?: string;
  size?: number;
}
```

**プロパティ**:
- `path`: ファイルパス
- `success`: 書き込み成功フラグ
- `action`: 実行されたアクション
  - `created`: 新規作成
  - `updated`: 上書き更新
  - `skipped`: スキップ（dry-runまたはユーザーが拒否）
- `error`: エラーメッセージ（書き込み失敗時）
- `size`: 書き込んだファイルサイズ（バイト）

### WriterOptions

ライターオプションを表します。

```typescript
interface WriterOptions {
  force?: boolean;      // 上書き確認をスキップ（デフォルト: false）
  dryRun?: boolean;     // ドライランモード（デフォルト: false）
  verbose?: boolean;    // 詳細ログ（デフォルト: false）
}
```

### WriteOptions

書き込みオプションを表します（個別ファイル用）。

```typescript
interface WriteOptions {
  overwrite?: boolean;  // 既存ファイルを上書き
  skipPrompt?: boolean; // 上書き確認プロンプトをスキップ
}
```

## プロンプトサービス

### PromptService

対話的プロンプトを提供するサービスです。

```typescript
class PromptService {
  async confirmOverwrite(filePath: string): Promise<boolean>
  async confirmOverwriteAll(): Promise<OverwriteAction>
}
```

#### confirmOverwrite()

単一ファイルの上書き確認を行います。

**パラメータ**:
- `filePath`: ファイルパス

**戻り値**: `boolean` - `true`: 上書き、`false`: スキップ

**例**:
```typescript
const prompt = new PromptService();
const shouldOverwrite = await prompt.confirmOverwrite('.kiro/specs/api-spec/requirements.md');
```

#### confirmOverwriteAll()

すべてのファイルに対する上書きアクションを確認します。

**戻り値**: `OverwriteAction`

```typescript
type OverwriteAction = 'yes' | 'no' | 'all' | 'none';
```

- `yes`: このファイルのみ上書き
- `no`: このファイルをスキップ
- `all`: すべて上書き
- `none`: すべてスキップ

## パスユーティリティ

### PathUtils

パス変換ユーティリティを提供します。

```typescript
class PathUtils {
  static normalize(path: string): string
  static join(...paths: string[]): string
  static isAbsolute(path: string): boolean
  static relative(from: string, to: string): string
}
```

#### normalize()

パスを正規化します。

```typescript
const normalized = PathUtils.normalize('.kiro/specs//api-spec/requirements.md');
// => '.kiro/specs/api-spec/requirements.md'
```

#### join()

複数のパスを結合します。

```typescript
const joined = PathUtils.join('.kiro', 'specs', 'api-spec', 'requirements.md');
// => '.kiro/specs/api-spec/requirements.md'
```

## エラーハンドリング

### FileSystemError

ファイルシステムエラーを表すカスタムエラークラスです。

```typescript
class FileSystemError extends Error {
  constructor(
    public code: string,
    message: string,
    public path?: string
  ) {
    super(message);
  }
}
```

**エラーコード**:
- `EACCES`: 権限エラー
- `ENOENT`: ファイルまたはディレクトリが見つからない
- `EEXIST`: ファイルが既に存在
- `ENOSPC`: ディスクスペース不足

## 使用例

### 基本的な使い方

```typescript
import { FileWriter } from './filesystem/writer';

// FileWriterの初期化
const writer = new FileWriter({
  force: false,
  dryRun: false,
  verbose: true
});

// ファイルを書き込み
const results = await writer.writeFiles([
  { path: '.kiro/specs/api-spec/requirements.md', content: '# Requirements' },
  { path: '.kiro/steering/tech.md', content: '# Tech Stack' }
]);

results.forEach(result => {
  if (result.success) {
    console.log(`✓ ${result.action}: ${result.path} (${result.size} bytes)`);
  } else {
    console.error(`✗ ${result.path}: ${result.error}`);
  }
});
```

### ドライランモード

```typescript
const writer = new FileWriter({
  force: false,
  dryRun: true,  // ドライランモード
  verbose: true
});

const results = await writer.writeFiles([
  { path: '.kiro/specs/api-spec/requirements.md', content: '...' }
]);

// 出力例: [DRY RUN] Would create: .kiro/specs/api-spec/requirements.md
```

### 強制上書き

```typescript
const writer = new FileWriter({
  force: true,   // 上書き確認をスキップ
  dryRun: false,
  verbose: false
});

const results = await writer.writeFiles([
  { path: '.kiro/specs/api-spec/requirements.md', content: '...' }
]);
```

### 上書き確認プロンプト

```typescript
import { PromptService } from './filesystem/prompt';

const prompt = new PromptService();

// 単一ファイルの確認
const shouldOverwrite = await prompt.confirmOverwrite('.kiro/specs/api-spec/requirements.md');

if (shouldOverwrite) {
  await writer.writeFile('.kiro/specs/api-spec/requirements.md', content);
}

// すべてのファイルの確認
const action = await prompt.confirmOverwriteAll();

switch (action) {
  case 'all':
    // すべて上書き
    break;
  case 'none':
    // すべてスキップ
    break;
  case 'yes':
    // このファイルのみ上書き
    break;
  case 'no':
    // このファイルをスキップ
    break;
}
```

### ディレクトリの自動作成

```typescript
const writer = new FileWriter({ force: false, dryRun: false });

// ディレクトリが存在しない場合は自動作成
await writer.ensureDirectory('.kiro/specs/new-project');

// ファイルを書き込み（ディレクトリは自動的に作成される）
await writer.writeFile('.kiro/specs/new-project/requirements.md', '# Requirements');
```

## パフォーマンス

### 書き込み速度

- **単一ファイル**: 1ms未満（SSD環境）
- **大量ファイル**: 100ファイル書き込み時1秒以内
- **ディレクトリ作成**: 再帰的ディレクトリ作成で10ms以内

## 関連ページ

- [GitHub Fetcher API](/api/github-fetcher): GitHub連携の詳細
- [API 仕様](/api/): API仕様の概要
