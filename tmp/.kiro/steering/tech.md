# Technology Stack

## 現在のステータス
このプロジェクトは開発初期段階にあり、具体的な技術スタックはまだ決定されていません。
技術スタックは`/kiro:spec-init`および`/kiro:spec-design`フェーズで決定されます。

## 推奨技術スタック（決定時の参考）

### アーキテクチャパターン
- **SPA (Single Page Application)**: クライアントサイドレンダリング
- **SSR/SSG**: サーバーサイドレンダリング/静的サイト生成（SEO重視の場合）
- **PWA対応**: オフライン機能とモバイル対応

### フロントエンド候補

#### フレームワーク
- **React**: コンポーネントベース、豊富なエコシステム
- **Vue.js**: 学習コストが低く、柔軟性が高い
- **Svelte**: 高パフォーマンス、ビルド時最適化

#### UIライブラリ
- **Tailwind CSS**: ユーティリティファーストCSS
- **Material-UI / Ant Design**: コンポーネントライブラリ
- **Shadcn/ui**: モダンなコンポーネント集

#### ドラッグ&ドロップ
- **react-beautiful-dnd**: Reactアプリケーション向け
- **@dnd-kit**: モダンで柔軟なD&Dライブラリ
- **SortableJS**: フレームワーク非依存

#### 状態管理
- **Redux / Redux Toolkit**: 大規模アプリケーション向け
- **Zustand**: 軽量でシンプル
- **Jotai / Recoil**: Atomic state management

### バックエンド候補

#### フレームワーク
- **Next.js**: フルスタックReactフレームワーク
- **Express.js**: シンプルで柔軟なNode.jsフレームワーク
- **Fastify**: 高パフォーマンスNode.jsフレームワーク
- **NestJS**: TypeScript-firstのエンタープライズフレームワーク

#### データベース
- **PostgreSQL**: リレーショナルデータベース（複雑なクエリ）
- **MongoDB**: ドキュメント型データベース（柔軟なスキーマ）
- **SQLite**: 軽量データベース（ローカル開発・小規模）
- **Supabase**: BaaS（Backend as a Service）

#### リアルタイム通信
- **WebSocket**: 双方向リアルタイム通信
- **Server-Sent Events (SSE)**: サーバーからのプッシュ通知
- **Socket.io**: WebSocketラッパー

### 開発環境（予定）

#### 必須ツール
- **Node.js**: v18以上（LTS推奨）
- **npm / yarn / pnpm**: パッケージマネージャー
- **Git**: バージョン管理

#### 開発ツール
- **TypeScript**: 型安全性の確保
- **ESLint**: コード品質チェック
- **Prettier**: コードフォーマッター
- **Vitest / Jest**: ユニットテスト
- **Playwright / Cypress**: E2Eテスト

#### ビルドツール
- **Vite**: 高速開発サーバー
- **Webpack**: バンドラー（複雑な設定が必要な場合）
- **esbuild**: 高速ビルド

### 共通コマンド（実装後）

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# Lint実行
npm run lint

# フォーマット
npm run format
```

### 環境変数（実装後の例）

```env
# データベース
DATABASE_URL=postgresql://...

# APIキー
API_KEY=...

# アプリケーション設定
NODE_ENV=development
PORT=3000

# 認証
JWT_SECRET=...
```

### ポート設定（実装後の例）

- **フロントエンド開発サーバー**: 3000
- **バックエンドAPI**: 4000
- **データベース**: 5432 (PostgreSQL) / 27017 (MongoDB)

## 技術選定の原則

### 優先事項
1. **開発者体験**: 生産性の高いツールとフレームワーク
2. **パフォーマンス**: ユーザー体験を重視した高速な動作
3. **保守性**: 長期的なメンテナンスのしやすさ
4. **コミュニティ**: 活発なコミュニティとドキュメント
5. **型安全性**: TypeScriptの活用

### 実装フェーズでの決定事項
具体的な技術スタックは以下のフェーズで決定されます：
- `/kiro:spec-init`: 基本方針の決定
- `/kiro:spec-requirements`: 要件に基づく技術選定
- `/kiro:spec-design`: 詳細な技術設計

## 更新履歴
- 2025-10-05: 初版作成（技術スタック未決定、推奨事項のみ）
