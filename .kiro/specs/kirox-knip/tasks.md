# 実装計画

- [ ] 1. knipパッケージのインストールと基本設定
  - `npm install --save-dev knip`を実行し、最新のknip v5.xをインストール
  - package.jsonのdevDependenciesにknipが追加されたことを確認
  - `npx knip --version`を実行し、knipが正常にインストールされたことを検証
  - _Requirements: 1.1_

- [ ] 2. package.jsonにknip実行用のnpmスクリプトを追加
  - package.jsonの`scripts`セクションに`"knip": "knip"`と`"lint:knip": "knip"`を追加
  - `npm run knip`を実行し、スクリプトが正常に動作することを確認
  - _Requirements: 1.2_

- [ ] 3. knip.ts設定ファイルをプロジェクトルートに作成
  - プロジェクトルートディレクトリに`knip.ts`ファイルを作成
  - エントリポイント設定: `src/index.ts`, `docs/.vitepress/config.ts`
  - 解析対象設定: `src/**/*.ts`, `tests/**/*.test.ts`, `docs/.vitepress/**/*.ts`
  - 除外パターン設定: `dist/**/*`, `.kiro/**/*`, `.claude/**/*`, `demo/**/*`
  - 除外依存関係設定: `tsup`, `esbuild-plugin-tsconfig-paths`, `vitepress-plugin-llms`
  - Vitestプラグイン有効化: `vitest: true`
  - TypeScript型定義を追加（`import type { KnipConfig } from 'knip'`）
  - `npm run type-check`が成功することを確認
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 4.2, 4.4_

- [ ] 4. knipを実行して未使用コード検出機能を検証
  - `npm run knip`を実行し、knipレポートを確認
  - 検出された未使用コードが正当な検出か誤検出かを判断
  - 誤検出の場合は`knip.ts`の`ignore`または`ignoreDependencies`に追加
  - 正当な未使用コードの場合は削除（または将来使用予定の場合はコメント追加）
  - 再度`npm run knip`を実行し、未使用コードが0件になることを確認
  - 統合テスト: knip実行が成功（exit code 0または1）することを確認するテストを作成
  - _Requirements: 1.4_

- [ ] 5. エントリポイント設定の検証テストを作成
  - `tests/integration/knip-config.test.ts`を作成
  - テストケース: `src/index.ts`ファイルが存在することを検証
  - テストケース: `docs/.vitepress/config.ts`ファイルが存在することを検証
  - テストケース: knip.ts設定を読み込み、`entry`配列に上記2ファイルが含まれることを検証
  - `npm test`を実行し、テストが通ることを確認
  - _Requirements: 2.1, 2.3_

- [ ] 6. テストファイルパターン認識の検証テストを作成
  - `tests/integration/knip-config.test.ts`に以下のテストケースを追加
  - テストケース: knip.tsの`project`配列に`tests/**/*.test.ts`が含まれることを検証
  - テストケース: Vitestプラグインが有効化されている（`vitest: true`）ことを検証
  - `npm test`を実行し、テストが通ることを確認
  - _Requirements: 2.2, 3.2_

- [ ] 7. VitePress設定とtsconfig paths alias解決の検証テストを作成
  - `tests/integration/knip-config.test.ts`に以下のテストケースを追加
  - テストケース: `docs/.vitepress/config.ts`が`entry`配列に含まれることを検証
  - テストケース: tsconfig.jsonの`compilerOptions.paths`に`@/*`エイリアスが設定されていることを検証
  - `npm run knip`を実行し、`@/*`エイリアスを使用したimport文が正しく解決されることを確認
  - _Requirements: 2.3, 3.3_

- [ ] 8. 除外パターン設定の検証テストを作成
  - `tests/integration/knip-config.test.ts`に以下のテストケースを追加
  - テストケース: knip.tsの`ignore`配列に`dist/**/*`, `.kiro/**/*`, `.claude/**/*`, `demo/**/*`が含まれることを検証
  - E2Eテスト: テスト用の未使用ファイルを`demo/test-unused.ts`に作成し、`npm run knip`を実行
  - E2Eテスト: `demo/test-unused.ts`がknipレポートに含まれないことを確認
  - E2Eテスト: テスト用ファイルを削除
  - _Requirements: 2.5, 4.4_

- [ ] 9. lint:knipスクリプトをlintワークフローに統合
  - package.jsonの`scripts`セクションに既存の`lint`スクリプトがあるか確認
  - （オプション）`lint:all`スクリプトを作成: `"lint:all": "npm run lint && npm run lint:knip"`
  - `npm run lint:all`を実行し、ESLintとknipが順次実行されることを確認
  - _Requirements: 3.1_

- [ ] 10. Vitest設定認識の統合テストを作成
  - `tests/integration/knip-vitest.test.ts`を作成
  - テストケース: `vitest.config.ts`ファイルが存在することを検証
  - テストケース: knip.tsで`vitest: true`が設定されていることを検証
  - 統合テスト: `npm run knip`を実行し、Vitest関連の依存関係（`vitest`、`@vitest/ui`等）が未使用として誤検出されないことを確認
  - `npm test`を実行し、テストが通ることを確認
  - _Requirements: 3.2_

- [ ] 11. TypeScript設定とpaths alias解決の統合テストを作成
  - `tests/integration/knip-typescript.test.ts`を作成
  - テストケース: tsconfig.jsonに`compilerOptions.paths["@/*"]`が設定されていることを検証
  - テストケース: `src/`ディレクトリ内のファイルで`@/*`エイリアスを使用したimport文が正しく解決されることを確認
  - 統合テスト: `npm run knip`を実行し、`@/*`エイリアスを使用したファイルが未使用として誤検出されないことを確認
  - `npm test`を実行し、テストが通ることを確認
  - _Requirements: 3.3_

- [ ] 12. GitHub Actions CI/CDワークフローにknipチェックを追加
  - `.github/workflows/ci.yml`を開き、既存のlintとtype-checkステップを確認
  - type-checkステップの後、testステップの前に`knip`ステップを追加
  - テストPRを作成し、CIでknipステップが実行されることを確認
  - E2Eテスト: 意図的に未使用ファイル（例: `src/test-unused.ts`）を追加し、CIが失敗することを確認
  - E2Eテスト: 未使用ファイルを削除し、CIが成功することを確認
  - _Requirements: 3.4, 3.5_

- [ ] 13. ビルド時専用依存関係の除外設定テストを作成
  - `tests/integration/knip-dependencies.test.ts`を作成
  - テストケース: knip.tsの`ignoreDependencies`配列に`tsup`, `esbuild-plugin-tsconfig-paths`, `vitepress-plugin-llms`が含まれることを検証
  - 統合テスト: `npm run knip`を実行し、これらの依存関係が未使用として報告されないことを確認
  - `npm test`を実行し、テストが通ることを確認
  - _Requirements: 4.2_

- [ ] 14. CLIバイナリファイル除外設定テストを作成
  - `tests/integration/knip-binaries.test.ts`を作成
  - テストケース: package.jsonの`bin`フィールドに`kirox`が定義されていることを検証
  - テストケース: knip.tsの`ignoreBinaries`配列に`kirox`が含まれることを検証
  - 統合テスト: `npm run knip`を実行し、`dist/index.js`が未使用として報告されないことを確認
  - `npm test`を実行し、テストが通ることを確認
  - _Requirements: 4.3_

- [ ] 15. 特殊ディレクトリ除外設定の検証テストを作成
  - `tests/integration/knip-ignore.test.ts`を作成
  - テストケース: knip.tsの`ignore`配列に`.kiro/**/*`, `.claude/**/*`が含まれることを検証
  - E2Eテスト: テスト用ファイルを`.kiro/test-unused.ts`に作成
  - E2Eテスト: `npm run knip`を実行し、`.kiro/test-unused.ts`が未使用として報告されないことを確認
  - E2Eテスト: テスト用ファイルを削除
  - `npm test`を実行し、テストが通ることを確認
  - _Requirements: 4.1, 4.4_

- [ ] 16. 標準出力レポート形式の検証テストを作成
  - `tests/integration/knip-report.test.ts`を作成
  - テストケース: テスト用の未使用ファイル（`src/test-unused.ts`）を作成
  - テストケース: `npm run knip`を実行し、標準出力に`src/test-unused.ts`が含まれることを検証
  - テストケース: テスト用ファイルを削除し、再度`npm run knip`を実行
  - テストケース: 標準出力に成功メッセージ（exit code 0）が表示されることを検証
  - `npm test`を実行し、テストが通ることを確認
  - _Requirements: 5.1, 5.5_

- [ ] 17. JSON形式レポート出力の検証テストを作成
  - `tests/integration/knip-json-report.test.ts`を作成
  - テストケース: テスト用の未使用ファイル（`src/test-unused.ts`）を作成
  - テストケース: `npx knip --reporter json > knip-report.json`を実行
  - テストケース: `knip-report.json`ファイルが生成されることを検証
  - テストケース: JSONファイルの構造が正しいこと（`files`, `dependencies`, `exports`等のキーが存在）を検証
  - テストケース: `knip-report.json`とテスト用ファイルを削除
  - `npm test`を実行し、テストが通ることを確認
  - _Requirements: 5.2_

- [ ] 18. CONTRIBUTING.mdにknipセクションを追加
  - `CONTRIBUTING.md`を開き、`Code Quality`セクションを追加（または既存セクションに統合）
  - knipの概要と目的を記述
  - ローカルでのknip実行方法（`npm run knip`）を記述
  - CI/CDでの動作説明を記述
  - knip.ts設定の概要（エントリポイント、除外パターン、除外依存関係）を記述
  - knipレポートの読み方と対処方法を記述
  - README.mdの`Development`セクションに`npm run knip`コマンドを追記
  - _Requirements: 5.3_

- [ ] 19. knipレポートの詳細情報検証テストを作成
  - `tests/integration/knip-report-details.test.ts`を作成
  - テストケース: テスト用の未使用ファイル（`src/test-unused.ts`）を作成
  - テストケース: `npm run knip`を実行し、レポートにファイルパス（`src/test-unused.ts`）が含まれることを検証
  - テストケース: （可能であれば）レポートに理由（例: "No entry points reference this file"）が含まれることを検証
  - テストケース: テスト用ファイルを削除
  - `npm test`を実行し、テストが通ることを確認
  - _Requirements: 5.4_

- [ ] 20. GitHub Actions CI環境でのknip実行E2Eテストを実施
  - テストブランチ（例: `test/knip-ci-integration`）を作成
  - テスト用の未使用ファイル（`src/test-unused-ci.ts`）を追加してコミット
  - テストブランチをpushし、GitHub Actions CIが実行されることを確認
  - CIログでknipステップが失敗（exit code 1）することを確認
  - 未使用ファイルを削除してpush
  - CIログでknipステップが成功（exit code 0）することを確認
  - テストブランチを削除
  - _Requirements: 3.4, 3.5_

- [ ] 23. knip設定とレポートのドキュメントを完成させる
  - `CONTRIBUTING.md`のknipセクションを充実させる
  - knip.ts設定の詳細を記述（エントリポイント、除外パターン、除外依存関係）
  - knipレポートの読み方を説明（未使用ファイル、未使用依存関係、未使用エクスポート）
  - CI/CDでの動作を説明（PR作成時の自動実行、未使用コード検出時のCI失敗）
  - CONTRIBUTING.mdをコミット
  - _Requirements: 5.3, 5.4_
