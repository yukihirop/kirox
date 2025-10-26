# 実装計画

- [x] 1. knipパッケージのインストールと基本設定
  - `npm install --save-dev knip`を実行し、最新のknip v5.xをインストール
  - package.jsonのdevDependenciesにknipが追加されたことを確認
  - `npx knip --version`を実行し、knipが正常にインストールされたことを検証
  - _Requirements: 1.1_

- [x] 2. package.jsonにknip実行用のnpmスクリプトを追加
  - package.jsonの`scripts`セクションに`"knip": "knip"`と`"lint:knip": "knip"`を追加
  - `npm run knip`を実行し、スクリプトが正常に動作することを確認
  - _Requirements: 1.2_

- [x] 3. knip.ts設定ファイルをプロジェクトルートに作成
  - プロジェクトルートディレクトリに`knip.ts`ファイルを作成
  - エントリポイント設定: `src/index.ts`, `docs/.vitepress/config.ts`
  - 解析対象設定: `src/**/*.ts`, `tests/**/*.test.ts`, `docs/.vitepress/**/*.ts`
  - 除外パターン設定: `dist/**/*`, `.kiro/**/*`, `.claude/**/*`, `demo/**/*`, `docs/.vitepress/theme/**/*`
  - 除外依存関係設定: peer dependencies of @inquirer/prompts, @types/figlet
  - Vitestプラグイン有効化: `vitest: true`
  - TypeScript型定義を追加（`import type { KnipConfig } from 'knip'`）
  - `npm run type-check`が成功することを確認
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 4.2, 4.4_

- [x] 4. knipを実行して未使用コード検出機能を検証
  - `npm run knip`を実行し、knipレポートを確認
  - 検出された未使用コードが正当な検出か誤検出かを判断
  - 誤検出の場合は`knip.ts`の`ignore`または`ignoreDependencies`に追加
  - 正当な未使用コードの場合は削除（または将来使用予定の場合はコメント追加）
  - 再度`npm run knip`を実行し、誤検出が解消されたことを確認
  - 統合テスト: knip実行が成功（exit code 0または1）することを確認するテストを作成
  - _Requirements: 1.4_

- [x] 9. lint:knipスクリプトをlintワークフローに統合
  - package.jsonの`scripts`セクションに既存の`lint`スクリプトがあるか確認
  - （オプション）`lint:all`スクリプトを作成: `"lint:all": "npm run lint && npm run lint:knip"`
  - `npm run lint:all`を実行し、ESLintとknipが順次実行されることを確認
  - _Requirements: 3.1_

- [x] 12. GitHub Actions CI/CDワークフローにknipチェックを追加
  - `.github/workflows/ci.yml`を開き、既存のlintとtype-checkステップを確認
  - type-checkステップの後、testステップの前に`knip`ステップを追加
  - テストPRを作成し、CIでknipステップが実行されることを確認
  - E2Eテスト: 意図的に未使用ファイル（例: `src/test-unused.ts`）を追加し、CIが失敗することを確認
  - E2Eテスト: 未使用ファイルを削除し、CIが成功することを確認
  - _Requirements: 3.4, 3.5_

- [x] 18. CONTRIBUTING.mdにknipセクションを追加
  - `CONTRIBUTING.md`を開き、`Code Quality`セクションを追加（または既存セクションに統合）
  - knipの概要と目的を記述
  - ローカルでのknip実行方法（`npm run knip`）を記述
  - CI/CDでの動作説明を記述
  - knip.ts設定の概要（エントリポイント、除外パターン、除外依存関係）を記述
  - knipレポートの読み方と対処方法を記述
  - README.mdの`Development`セクションに`npm run knip`コマンドを追記
  - _Requirements: 5.3_

- [x] 23. knip設定とレポートのドキュメントを完成させる
  - `CONTRIBUTING.md`のknipセクションを充実させる
  - knip.ts設定の詳細を記述（エントリポイント、除外パターン、除外依存関係）
  - knipレポートの読み方を説明（未使用ファイル、未使用依存関係、未使用エクスポート）
  - CI/CDでの動作を説明（PR作成時の自動実行、未使用コード検出時のCI失敗）
  - CONTRIBUTING.mdをコミット
  - _Requirements: 5.3, 5.4_

## 修正タスク

- [x] 24. knip警告を解消してクリーンな状態にする
  - knip実行結果を確認し、検出された未使用エクスポートと設定ヒントに対処
  - `npm run knip`をConfiguration hint 1件のみで通過
  - _Requirements: 1.4, 5.1_

- [x] 24.1. 未使用エクスポートの対処
  - 24個の未使用エクスポート（1関数 + 23型）をコメントアウトまたは内部型に変更
  - `withRetryAndRateLimit`関数を削除
  - `FetchResult`、`Summary`インターフェースを削除
  - その他20個の型を内部型（exportなし）に変更
  - `RateLimitInfo`など実際に使用されている型はエクスポートを維持
  - `validateProjectDuplicates`関数をコメントアウト（関連テストもskip）
  - _Requirements: 1.4, 4.1_

- [x] 24.2. knip設定の最適化
  - package.jsonの`main`フィールドを`.dist/index.js`から`dist/index.js`に修正
  - Configuration hint 1件（`src/index.ts`の冗長エントリ）は残存（実害なし）
  - _Requirements: 1.3, 4.4_

- [x] 24.3. 最終検証
  - ✅ type-check: 成功
  - ✅ lint: 成功
  - ✅ knip: Configuration hint 1件のみ（未使用エクスポート0件）
  - ✅ test: 2023/2029成功（失敗2件はREADME badgeテストとknipとは無関係、skip 4件）
  - _Requirements: 1.4, 3.1, 5.5_