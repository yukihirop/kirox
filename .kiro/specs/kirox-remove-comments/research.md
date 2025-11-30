# Research & Design Decisions

## Summary
- **Feature**: `kirox-remove-comments`
- **Discovery Scope**: New Feature
- **Key Findings**:
  - TypeScript Compiler APIの`ts.createPrinter({ removeComments: true })`を使用してコメント削除が可能
  - 文字列リテラル・テンプレートリテラル内のコメントパターンはAST解析により自動的に保護される
  - JSDocコメント保持には`getLeadingCommentRanges`での判定が必要

## Research Log

### TypeScript Compiler APIによるコメント削除

- **Context**: ソースコードからコメントを安全に削除する方法を調査
- **Sources Consulted**:
  - [TypeScript TSConfig removeComments](https://www.typescriptlang.org/tsconfig/removeComments.html)
  - [Manipulate comments with TypeScript API](https://quramy.medium.com/manipulate-comments-with-typescript-api-73d5f1d43d7f)
  - [GitHub Issue: setSyntheticLeadingComments](https://github.com/microsoft/TypeScript/issues/30191)
- **Findings**:
  - `ts.createPrinter({ removeComments: true })`でコメント削除が可能
  - AST解析により文字列リテラル内のコメントパターンは誤検出されない
  - 正規表現ベースのアプローチは文字列リテラル内の誤検出リスクがある
  - JSDocコメント（`/** */`）の保持には追加処理が必要
- **Implications**: TypeScript Compiler APIを使用することで安全にコメント削除が可能

### JSDocコメントの判定方法

- **Context**: JSDocコメントをデフォルトで保持する要件への対応
- **Sources Consulted**: TypeScript Compiler API documentation
- **Findings**:
  - `ts.getLeadingCommentRanges()`でコメント位置を取得
  - コメントテキストが`/**`で始まるかどうかで判定
  - `ts.setSyntheticLeadingComments()`で選択的にコメントを保持/削除
- **Implications**: JSDoc保持にはカスタムトランスフォーマーの実装が必要

### 既存コードベースとの統合

- **Context**: kiroxプロジェクトへの統合方法
- **Sources Consulted**: `src/cli/entry.ts`, `src/reporting/progress-reporter.ts`
- **Findings**:
  - 現在TypeScript Compiler APIは使用されていない（新規依存関係追加）
  - 既存のProgressReporterを再利用可能
  - Commander.jsによるCLIオプション追加パターンは確立済み
  - 開発用依存関係としてTypeScriptは既に存在（`^5.7.2`）
- **Implications**: TypeScript依存関係を本番依存関係として追加する必要はない（devDependenciesで十分）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| TypeScript Compiler API | ts.createPrinter + カスタムトランスフォーマー | 正確なAST解析、文字列リテラル安全 | 複雑性増加、バンドルサイズ | 推奨 |
| 正規表現ベース | 正規表現でコメントパターンを検出・削除 | シンプル、依存関係なし | 文字列リテラル内の誤検出リスク | 非推奨 |
| esbuild/swc | 外部ツールでコメント削除 | 高速 | JSDoc選択保持が困難 | 非推奨 |

## Design Decisions

### Decision: TypeScript Compiler API採用

- **Context**: コメント削除の実装方法選定
- **Alternatives Considered**:
  1. TypeScript Compiler API - AST解析による正確な処理
  2. 正規表現ベース - シンプルだが誤検出リスク
  3. 外部ツール（esbuild/swc）- JSDoc保持が困難
- **Selected Approach**: TypeScript Compiler APIを使用
- **Rationale**:
  - 文字列リテラル内のコメントパターンを誤検出しない
  - JSDocコメントの選択的保持が可能
  - TypeScriptは既にdevDependenciesに存在
- **Trade-offs**: 実装の複雑性 vs 正確性・安全性
- **Follow-up**: TypeScriptパッケージのランタイム使用をテストで確認

### Decision: サブコマンドではなくスクリプトとして実装

- **Context**: CLI統合方法の選定
- **Alternatives Considered**:
  1. `kirox remove-comments`サブコマンド
  2. 独立したスクリプト（`npm run remove-comments`）
- **Selected Approach**: npm scriptsで実行可能な独立スクリプト
- **Rationale**:
  - kiroxのコア機能（GitHub fetch）と責任範囲が異なる
  - 独立したスクリプトとして保守性向上
  - `npm run remove-comments`で直感的に実行可能
- **Trade-offs**: 統一CLI vs 責任分離

## Risks & Mitigations

- **Risk 1**: TypeScript Compiler APIの学習コスト → ミニマルな実装から開始
- **Risk 2**: 大量ファイル処理時のパフォーマンス → 並列処理の検討
- **Risk 3**: 予期しないコード変更 → --dry-runオプションとバックアップ機能

## References

- [TypeScript TSConfig removeComments](https://www.typescriptlang.org/tsconfig/removeComments.html) - 公式ドキュメント
- [Manipulate comments with TypeScript API](https://quramy.medium.com/manipulate-comments-with-typescript-api-73d5f1d43d7f) - コメント操作の詳細解説
- [GitHub Issue #30191](https://github.com/microsoft/TypeScript/issues/30191) - setSyntheticLeadingCommentsの挙動
