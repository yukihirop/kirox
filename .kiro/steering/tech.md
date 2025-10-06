# Kirox CLI - Technology Stack

## Architecture

Kirox CLIは、単方向データフローアーキテクチャを採用したコマンドラインツールです。

**High-Level Flow**:
```
CLI Entry Point → Argument Parser → Input Validator → GitHub Fetcher → File Writer
                                                     ↓
                                              Progress Reporter
                                              Error Handler
```

**Layer Separation**:
- **CLI Layer**: ユーザー入力の受け付けと引数パース（Commander.js）
- **GitHub Integration Layer**: GitHub APIとの通信、ファイル取得（Octokit）
- **File System Layer**: ローカルファイルシステムへの書き込み（Node.js fs/promises）
- **Reporting Layer**: 進捗表示とエラーメッセージング（Chalk）

## Runtime & Language

### Node.js 18+
- **選定理由**:
  - npxエコシステムとの完全統合
  - 組み込みfetch API利用可能（Polyfill不要）
  - LTS版による長期サポートと安定性
- **最小バージョン**: Node.js 18.0.0以上
- **推奨バージョン**: Node.js 20.x（最新LTS）

### TypeScript 5.x
- **選定理由**:
  - 型安全性による開発時エラー検出
  - IDE補完による開発者体験向上
  - npm公開時の型定義自動提供
- **コンパイルターゲット**: ESNext（Node.js 18+対応）
- **モジュールシステム**: ESM（ES Modules）

## Core Dependencies

### Octokit (v5.x)
- **用途**: GitHub REST API統合
- **選定理由**:
  - GitHub公式SDK、TypeScript完全サポート
  - レート制限自動処理、リトライ機構内蔵
  - 認証機構（Personal Access Token）内蔵
- **主要機能**:
  - `octokit.rest.repos.getContent()`: ファイル・ディレクトリコンテンツ取得
  - base64エンコード済みコンテンツの自動デコード
  - レート制限情報の取得とモニタリング

### Commander (v12.x)
- **用途**: CLI引数パースとバリデーション
- **選定理由**:
  - npmで最も広く使われているCLIライブラリ（週800万DL以上）
  - 宣言的APIによる高い可読性
  - TypeScript型定義による型安全な引数アクセス
- **主要機能**:
  - 必須・オプション引数の定義と自動バリデーション
  - ヘルプメッセージの自動生成
  - サブコマンドのサポート（将来拡張用）

### Chalk (v5.x)
- **用途**: ターミナル出力の色付けと視認性向上
- **選定理由**:
  - クロスプラットフォーム対応（Windows、macOS、Linux）
  - 色サポート自動検出
  - 軽量かつパフォーマンス影響なし
- **使用例**:
  - 成功メッセージ: `chalk.green('✓ ファイル取得完了')`
  - エラーメッセージ: `chalk.red('✗ エラー発生')`
  - 進捗表示: `chalk.cyan('[3/10] file.md を取得中...')`

## Development Tools

### Vitest
- **用途**: 単体テスト・統合テストフレームワーク
- **選定理由**:
  - 高速な単体テスト実行（Vite利用）
  - TypeScript/ESM完全サポート
  - Jestとの高い互換性（移行容易）
- **テスト戦略**:
  - 単体テスト: 30+ケース（コアロジック、バリデーション）
  - 統合テスト: GitHub API → ファイルシステム
  - E2Eテスト: 実際のコマンド実行シナリオ

### tsx
- **用途**: TypeScript直接実行（開発時）
- **選定理由**:
  - コンパイル不要でTypeScriptを即座に実行
  - 開発時の迅速なフィードバックループ
- **使用方法**: `tsx src/index.ts -- user/repo -p project`

## Development Environment

### 必須ツール
- **Node.js 18+**: ランタイム環境
- **npm 9+**: パッケージ管理（Node.js同梱）
- **Git**: バージョン管理

### 推奨ツール
- **Visual Studio Code**: TypeScript開発環境
  - 推奨拡張: ESLint, Prettier, TypeScript Import Sorter
- **GitHub CLI (gh)**: 開発時のGitHub操作効率化

### エディタ設定
```json
// .vscode/settings.json（推奨）
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Common Commands

### プロジェクトセットアップ
```bash
# プロジェクトクローン
git clone https://github.com/your-org/kirox.git
cd kirox

# 依存関係インストール
npm install

# TypeScriptコンパイル
npm run build
```

### 開発コマンド
```bash
# 開発モードで実行（TypeScript直接実行）
npm run dev -- user/repo -p project

# 型チェック
npm run type-check

# リント実行
npm run lint

# フォーマット実行
npm run format
```

### テストコマンド
```bash
# 全テスト実行
npm test

# 監視モードでテスト
npm run test:watch

# カバレッジ付きテスト
npm run test:coverage

# E2Eテスト
npm run test:e2e
```

### ビルドとリリース
```bash
# プロダクションビルド
npm run build

# ローカルでnpxテスト
npm link
npx kirox user/repo -p project

# npm公開（メンテナー用）
npm publish
```

## Environment Variables

### GITHUB_TOKEN
- **用途**: GitHub API認証（プライベートリポジトリアクセス、レート制限緩和）
- **設定方法**:
  ```bash
  export GITHUB_TOKEN=ghp_your_token_here
  ```
- **取得方法**: GitHub Settings → Developer settings → Personal access tokens
- **必要スコープ**:
  - `public_repo`: パブリックリポジトリ読み取り
  - `repo`: プライベートリポジトリ読み取り（必要に応じて）

### NODE_ENV
- **用途**: 実行環境の指定
- **値**: `development` | `production` | `test`
- **影響**: ログレベル、エラー詳細度

### DEBUG
- **用途**: デバッグログ出力制御
- **設定例**:
  ```bash
  DEBUG=kirox:* npm run dev
  ```

## Port Configuration

Kirox CLIはCLIツールのため、ポート使用はありません。ネットワーク通信は以下のみ：
- **HTTPS 443**: GitHub APIとの通信（api.github.com）

## Key Technical Decisions

### 1. Octokit SDK vs 直接REST呼び出し
- **決定**: Octokit SDK使用
- **理由**: レート制限自動処理、TypeScript型定義、base64デコード抽象化
- **トレードオフ**: バンドルサイズ増加（約200KB）vs 開発速度・安全性向上

### 2. セマフォ並列度制御（最大5並列）
- **決定**: Promise.allSettled + セマフォパターン
- **理由**: GitHub APIレート制限回避、実行時間短縮（100ファイルで約80%削減）
- **トレードオフ**: 実装複雑度増加 vs パフォーマンス向上

### 3. ESM (ES Modules) 採用
- **決定**: CommonJS ではなくESM使用
- **理由**: Node.js 18+標準、Vitestとの完全互換、将来性
- **影響**: `"type": "module"` in package.json、`.ts`拡張子省略不可

## Performance Targets

- **大量ファイル取得**: 50ファイル取得時30秒以内
- **メモリ使用量**: 100ファイル取得時100MB以内
- **レート制限回避**: 100ファイル取得時にGitHub APIレート制限に抵触しない
- **並列処理**: 最大5並列リクエスト、セマフォによる制御
