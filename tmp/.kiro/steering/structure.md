# Project Structure

## 現在のプロジェクト構造

```
eg-kanban/
├── .claude/                 # Claude Code設定ディレクトリ
│   └── commands/           # カスタムスラッシュコマンド
│       └── kiro/           # Kiro spec-driven開発コマンド
│           ├── spec-init.md
│           ├── spec-requirements.md
│           ├── spec-design.md
│           ├── spec-tasks.md
│           ├── spec-impl.md
│           ├── spec-status.md
│           ├── steering.md
│           ├── steering-custom.md
│           ├── validate-design.md
│           └── validate-gap.md
├── .kiro/                  # Kiro開発フレームワーク
│   ├── steering/           # プロジェクト全体のステアリングドキュメント
│   │   ├── product.md     # プロダクト概要
│   │   ├── tech.md        # 技術スタック
│   │   └── structure.md   # プロジェクト構造（このファイル）
│   └── specs/              # 機能仕様書（実装時に作成）
└── CLAUDE.md               # Claude Codeプロジェクト設定
```

## Kiro Framework ディレクトリ

### `.claude/commands/kiro/`
Claude Codeのカスタムスラッシュコマンドを格納。
spec-driven開発のワークフローを実現。

**主要コマンド:**
- `spec-init.md`: 新機能の仕様初期化
- `spec-requirements.md`: 要件定義書の生成
- `spec-design.md`: 技術設計書の作成
- `spec-tasks.md`: 実装タスクの生成
- `spec-impl.md`: TDD方式での実装
- `spec-status.md`: 仕様の進捗確認
- `steering.md`: ステアリングドキュメント管理
- `validate-design.md`: 設計品質レビュー
- `validate-gap.md`: 要件と実装のギャップ分析

### `.kiro/steering/`
プロジェクト全体のコンテキストとルールを定義。
AIによる開発時に常に参照されるガイド。

**ファイル構成:**
- `product.md`: プロダクトビジョン、機能、ユースケース
- `tech.md`: 技術スタック、開発環境、コマンド
- `structure.md`: ファイル構成、コード規約、アーキテクチャ原則

**Inclusion Mode:** Always（全てのAIインタラクションで自動ロード）

### `.kiro/specs/`
個別機能の仕様書を格納（機能ごとにディレクトリ作成）。

**典型的な仕様書構造:**
```
.kiro/specs/[feature-name]/
├── requirements.md         # 要件定義書
├── design.md              # 技術設計書
├── tasks.md               # 実装タスクリスト
└── implementation.md      # 実装ログ（自動生成）
```

## 予想されるアプリケーション構造

以下は実装時に採用される可能性が高い構造例です。
具体的な構造は技術スタック決定時に確定します。

### フロントエンド（React + TypeScript想定）

```
src/
├── components/             # Reactコンポーネント
│   ├── common/            # 共通コンポーネント
│   │   ├── Button/
│   │   ├── Card/
│   │   └── Modal/
│   ├── board/             # ボード関連コンポーネント
│   │   ├── Board/
│   │   ├── Column/
│   │   └── KanbanCard/
│   └── layouts/           # レイアウトコンポーネント
│       ├── Header/
│       └── MainLayout/
├── hooks/                 # カスタムReact Hooks
│   ├── useBoard.ts
│   ├── useCard.ts
│   └── useDragDrop.ts
├── store/                 # 状態管理
│   ├── boardSlice.ts
│   ├── cardSlice.ts
│   └── store.ts
├── types/                 # TypeScript型定義
│   ├── board.ts
│   ├── card.ts
│   └── user.ts
├── utils/                 # ユーティリティ関数
│   ├── dateFormatter.ts
│   └── validators.ts
├── api/                   # API通信
│   ├── client.ts
│   ├── boards.ts
│   └── cards.ts
├── styles/                # スタイル
│   ├── globals.css
│   └── theme.ts
├── App.tsx               # ルートコンポーネント
└── main.tsx              # エントリーポイント
```

### バックエンド（Node.js + Express想定）

```
server/
├── src/
│   ├── controllers/       # コントローラー
│   │   ├── boardController.ts
│   │   └── cardController.ts
│   ├── models/            # データモデル
│   │   ├── Board.ts
│   │   ├── Card.ts
│   │   └── User.ts
│   ├── routes/            # ルート定義
│   │   ├── boards.ts
│   │   └── cards.ts
│   ├── middleware/        # ミドルウェア
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── services/          # ビジネスロジック
│   │   ├── boardService.ts
│   │   └── cardService.ts
│   ├── db/                # データベース設定
│   │   ├── connection.ts
│   │   └── migrations/
│   ├── utils/             # ユーティリティ
│   │   └── logger.ts
│   └── server.ts          # サーバーエントリーポイント
└── tests/                 # テスト
    ├── integration/
    └── unit/
```

### 設定ファイル（実装時）

```
eg-kanban/
├── package.json           # 依存関係とスクリプト
├── tsconfig.json          # TypeScript設定
├── vite.config.ts         # Viteビルド設定
├── .eslintrc.js           # ESLint設定
├── .prettierrc            # Prettier設定
├── .env.example           # 環境変数テンプレート
├── .gitignore            # Git除外設定
└── README.md             # プロジェクトドキュメント
```

## コード組織化パターン

### コンポーネント構造
各コンポーネントディレクトリには以下を含める：

```
ComponentName/
├── index.tsx              # コンポーネント本体
├── ComponentName.test.tsx # テスト
├── ComponentName.stories.tsx # Storybook (必要に応じて)
└── styles.module.css      # スタイル (CSS Modules使用時)
```

### ファイル命名規則

#### TypeScript/JavaScript
- **コンポーネント**: PascalCase (`Board.tsx`, `KanbanCard.tsx`)
- **Hooks**: camelCase + useプレフィックス (`useBoard.ts`, `useDragDrop.ts`)
- **ユーティリティ**: camelCase (`dateFormatter.ts`, `validators.ts`)
- **型定義**: camelCase (`board.ts`, `card.ts`)
- **定数**: UPPER_SNAKE_CASE in CONSTANTS.ts

#### スタイル
- **CSS Modules**: `ComponentName.module.css`
- **グローバルCSS**: `globals.css`, `theme.css`

#### テスト
- **ユニットテスト**: `*.test.ts` または `*.spec.ts`
- **E2Eテスト**: `*.e2e.ts`

### インポート整理

#### インポート順序
```typescript
// 1. 外部ライブラリ
import React from 'react';
import { useState } from 'react';

// 2. 内部モジュール（絶対パス）
import { Button } from '@/components/common/Button';
import { useBoard } from '@/hooks/useBoard';

// 3. 型定義
import type { Board, Card } from '@/types';

// 4. 相対パス
import { formatDate } from '../utils/dateFormatter';

// 5. スタイル
import styles from './Board.module.css';
```

#### パスエイリアス設定例
```json
{
  "@/components": "./src/components",
  "@/hooks": "./src/hooks",
  "@/types": "./src/types",
  "@/utils": "./src/utils"
}
```

## 主要アーキテクチャ原則

### 1. 関心の分離 (Separation of Concerns)
- UIロジックとビジネスロジックを分離
- コンポーネントは表示に集中
- 状態管理は専用のストアで

### 2. 単一責任の原則 (Single Responsibility)
- 各コンポーネント/モジュールは1つの責任のみ
- 小さく、テスト可能な単位に分割

### 3. DRY (Don't Repeat Yourself)
- 共通ロジックはHooksやユーティリティに抽出
- 再利用可能なコンポーネントの作成

### 4. 型安全性
- TypeScriptを積極的に活用
- `any`型の使用を最小限に
- 明示的な型定義

### 5. テスタビリティ
- テストしやすいコード設計
- 依存性注入の活用
- モックしやすいインターフェース

### 6. パフォーマンス最適化
- 必要に応じたメモ化（React.memo, useMemo）
- 遅延ロード（lazy loading）
- 仮想化（長いリストの場合）

## 更新履歴
- 2025-10-05: 初版作成（現在の構造と予想される構造を記載）
