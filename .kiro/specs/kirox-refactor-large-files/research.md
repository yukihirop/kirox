# Research & Design Decisions

---
**Purpose**: リファクタリング対象ファイルの分析結果と設計判断の根拠を記録

**Usage**:
- 既存コードの責任分析と問題点の特定
- リファクタリングパターンの評価と選択根拠
- テスト影響範囲の評価
---

## Summary
- **Feature**: `kirox-refactor-large-files`
- **Discovery Scope**: Extension（既存システムの改善）
- **Key Findings**:
  - 5ファイル合計2323行のうち、重複ロジック・長大関数・責任過多が主要な問題
  - 既存の4層アーキテクチャ（CLI → GitHub → FileSystem → Reporting）は維持可能
  - 86件のテストファイルが存在し、公開APIシグネチャ維持が必須

## Research Log

### 既存ファイルの責任範囲分析

#### add-command-entry.ts（573行）
- **Context**: `add`サブコマンドのエントリポイントとして、引数パースからファイル書き込みまでの全フローを包含
- **Findings**:
  - 100行超の関数（`executeAddCommand`）が存在
  - メタデータ管理、ファイル取得、進捗レポートのロジックが重複
  - `getMetadataPath`、`isDuplicateProject`などのユーティリティ関数が散在
- **Implications**: ユーティリティ関数を専用モジュールに抽出し、エントリポイントはオーケストレーションのみに集中させる必要がある

#### entry.ts（566行）
- **Context**: メインコマンドのエントリポイントとして、対話モード・非対話モードの両方を処理
- **Findings**:
  - 対話モード判定と非対話モード実行が同一関数内で混在
  - try-catchブロックが多層化し、エラーハンドリングが重複
  - `getMetadataPath`関数がadd-command-entry.tsと重複定義
- **Implications**: 対話モード・非対話モードを独立した実行パスに分離し、エラーハンドリングを統一的なミドルウェアに委譲する

#### interactive-prompt.ts（397行）
- **Context**: 対話モードのプロンプト処理を担当
- **Findings**:
  - リポジトリ入力、プロジェクト選択、ブランチ選択、サブディレクトリ選択の各プロンプトが同一ファイルに混在
  - GitHub API統合（`suggestProjects`、`scanProjectsAcrossSubdirs`、`fetchBranches`）がプロンプトロジック内に埋め込まれている
  - `shouldEnterInteractiveMode`、`promptMissingArguments`などの公開API関数は既存の呼び出し元コードとの互換性を保つ必要がある
- **Implications**: 各プロンプトを独立したモジュールに分離し、GitHub API統合は専用サービス層に移動する。既存の公開API関数はファサードパターンで維持する

#### progress-reporter.ts（331行）
- **Context**: CLI操作の進捗レポートを担当し、oraスピナーとchalk色付けを統合
- **Findings**:
  - スピナー管理（`spinnerMap`、`oraOptions`）とメッセージフォーマット（chalk使用）が同一クラス内に混在
  - フォールバックロジック（console.log使用）がスピナー管理と密結合
  - 公開APIメソッド（`reportProgress`、`reportSuccess`、`reportError`）のシグネチャ変更は既存の呼び出し元に影響
- **Implications**: SpinnerManagerクラスとFormatterクラスに分離し、ProgressReporterはファサードパターンで既存APIを維持する

#### parser.ts（256行）
- **Context**: Commander.jsを使用したCLI引数パース処理
- **Findings**:
  - メインコマンド、addサブコマンド、completionサブコマンドのパース処理が条件分岐で混在
  - Commander.jsのオプション定義（`option()`、`action()`）がインラインで記述され、設定の再利用性が低い
  - ASCII artジェネレーション（figlet使用）がパースロジックと混在
- **Implications**: 各サブコマンドのパース処理を独立関数に分離し、オプション定義を宣言的な設定オブジェクトとして外部化する

### テスト影響範囲の評価
- **Context**: リファクタリングが既存テストに与える影響を評価
- **Sources Consulted**: `tests/unit/cli/*.test.ts`、`tests/unit/reporting/*.test.ts`、`tests/integration/*.test.ts`
- **Findings**:
  - 86件のテストファイルが存在し、特に`tests/unit/cli/`配下にパーサー、バリデーター、プロンプト関連の多数のテストが存在
  - `tests/unit/reporting/progress-reporter-*.test.ts`が8ファイル存在し、ProgressReporterの公開APIメソッドに対する詳細なテストが実装済み
  - 統合テスト（`tests/integration/`）は外部API呼び出しをモックしており、内部実装変更の影響を受けにくい
- **Implications**: 公開APIシグネチャを維持すれば既存テストの大部分は影響を受けない。内部実装変更に伴う単体テストの更新は最小限に抑える

### 既存アーキテクチャパターンの評価
- **Context**: ステアリングドキュメントで定義された4層アーキテクチャとの整合性を確認
- **Sources Consulted**: `.kiro/steering/structure.md`、`.kiro/steering/tech.md`
- **Findings**:
  - 既存のレイヤー分離原則（CLI → GitHub → FileSystem → Reporting）は明確に定義されており、リファクタリング後も維持すべき
  - 依存注入パターン（ProgressReporter、ErrorHandler、PinoLogger）が確立されており、リファクタリング後も継続使用が必須
  - TypeScript厳格型チェック（`strict: true`）と`any`型禁止のルールが適用済み
- **Implications**: リファクタリングは既存のアーキテクチャ原則を厳守し、レイヤー間の依存方向を維持する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| ファサードパターン | 既存の公開API関数を維持し、内部実装を新しいモジュールに委譲 | 既存の呼び出し元コードに影響を与えない、テストの大部分を再利用可能 | ファサード層が薄いラッパーとなり、実装の重複が発生する可能性 | `interactive-prompt.ts`、`progress-reporter.ts`に適用 |
| 関数抽出パターン | 長大な関数を単一責任の小関数に分割 | 可読性向上、単体テスト容易性向上 | 過度な分割は関数呼び出しのオーバーヘッドを増加させる可能性 | 全ファイルに適用（30-50行以下を目標） |
| モジュール分離パターン | 責任ごとに独立したモジュールファイルを作成 | 責任範囲の明確化、並行開発の容易性向上 | ファイル数の増加、インポート依存関係の複雑化 | `interactive-prompt.ts`のプロンプト機能分離に適用 |
| Strategy/Stateパターン | 進捗レポーターの状態管理をイミュータブルなStateオブジェクトで管理 | 状態の変更履歴追跡、テスタビリティ向上 | 既存のMap型（spinnerMap）からの移行コスト | `progress-reporter.ts`の状態管理に適用 |

## Design Decisions

### Decision: 公開APIシグネチャの維持戦略

- **Context**: リファクタリング後も既存の呼び出し元コードとの互換性を保つ必要がある
- **Alternatives Considered**:
  1. 全面的なAPI刷新 — 最適な設計を追求するが、既存コードの大規模修正が必要
  2. ファサードパターンによる互換性維持 — 内部実装のみを改善し、既存APIを維持
  3. デプリケーション警告付きの段階的移行 — 新旧APIを併存させるが、移行期間の管理コストが高い
- **Selected Approach**: ファサードパターンによる互換性維持
- **Rationale**: 既存の86件のテストファイルを最大限再利用し、リファクタリングの影響範囲を最小化するため
- **Trade-offs**: ファサード層の薄いラッパーが追加されるが、既存コードの安定性を優先
- **Follow-up**: リファクタリング完了後、パフォーマンス測定を実施し、ファサード層のオーバーヘッドが許容範囲内であることを確認

### Decision: 自明なコメントの削除基準

- **Context**: 要件6.8で「自明なコメント（コードの内容を繰り返すだけのコメント）を削除」が定義されている
- **Alternatives Considered**:
  1. 全てのコメントを削除 — コードの自己文書化を徹底するが、複雑なロジックの理解が困難になる
  2. JSDoc形式のみ保持 — API文書生成に必要なコメントを残すが、基準が明確でない
  3. 「WHY」を説明するコメントのみ保持 — ビジネスロジックや設計判断の理由を残す
- **Selected Approach**: 「WHY」を説明するコメントのみ保持
- **Rationale**: TypeScriptの型情報で「WHAT」は自明であり、コードリーダーが知るべきは「なぜこの実装を選んだか」
- **Trade-offs**: JSDoc形式のコメントが削減されるが、型定義で補完可能
- **Follow-up**: 削除対象の具体例を明確化（例: `// Parse arguments` → 削除、`// Task X.Y: ...` → 削除、`// Workaround for Octokit rate limit bug #123` → 保持）

### Decision: 関数分割の粒度基準

- **Context**: 要件1.3で「100行を超える関数を30-50行以下に分割」が定義されている
- **Alternatives Considered**:
  1. 厳密に30行以下 — 過度な分割により関数呼び出しのオーバーヘッドが増加
  2. 単一責任原則を優先 — 行数は目安とし、責任範囲で分割を判断
  3. 50行以下を目標 — バランスを取り、可読性と性能を両立
- **Selected Approach**: 単一責任原則を優先し、30-50行を目安とする
- **Rationale**: 行数は機械的な指標であり、責任範囲の明確化が本質的な目的
- **Trade-offs**: 行数の厳密な遵守よりも、ビジネスロジックの凝集度を優先
- **Follow-up**: リファクタリング後、各関数の責任範囲をJSDocで明記し、関数名で意図を明確化

## Risks & Mitigations

- **Risk 1: ファサードパターンによるパフォーマンス低下** — リファクタリング完了後、50ファイル取得のE2Eテストを実施し、30秒以内の性能目標を維持することを確認
- **Risk 2: 過度なモジュール分離によるインポート依存関係の複雑化** — 循環依存検出ツール（例: madge）を導入し、CI/CDパイプラインで継続的に監視
- **Risk 3: 既存テストの一部が内部実装に依存している可能性** — リファクタリング前にテストカバレッジレポートを取得し、影響範囲を事前特定

## References
- [Kirox CLI - Project Structure](.kiro/steering/structure.md) — レイヤー分離アーキテクチャの定義
- [Kirox CLI - Technology Stack](.kiro/steering/tech.md) — TypeScript厳格型チェックと依存ライブラリの方針
- [Kirox CLI - Testing Standards](.kiro/steering/testing.md) — TDDとモックパターンの標準
- [Refactoring: Improving the Design of Existing Code (Martin Fowler)](https://refactoring.com/) — ファサードパターンと関数抽出の実践ガイド
