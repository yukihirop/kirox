# Requirements Document

## Introduction

Kiroxプロジェクトにknipを導入し、未使用のファイル、依存関係、エクスポートを自動検出することで、コードベースの健全性を維持し、メンテナンス性を向上させます。knipは、TypeScript/JavaScriptプロジェクトにおける不要なコードや依存関係を継続的に監視し、プロジェクトの品質を保証するための重要なツールです。

この機能により、開発者は定期的にコードベースをクリーンな状態に保ち、バンドルサイズの最適化、ビルド時間の短縮、保守コストの削減を実現できます。

## Requirements

### Requirement 1: knip パッケージのインストールと基本設定
**Objective:** 開発者として、knipをプロジェクトに導入し、基本的な検出機能を利用できるようにしたい。これにより、プロジェクト内の未使用コードを自動的に発見できるようになる。

#### Acceptance Criteria

1. WHEN プロジェクトにknipをdevDependencyとしてインストールする THEN Kiroxプロジェクトは knipパッケージを含む SHALL
2. WHEN package.jsonにknip実行用のnpmスクリプトを追加する THEN 開発者は `npm run knip` コマンドでknipを実行できる SHALL
3. WHERE プロジェクトルートディレクトリ THE Kiroxプロジェクトは knip設定ファイル（`knip.json`または`knip.ts`）を含む SHALL
4. WHEN knipを実行する THEN knipは プロジェクト内の未使用ファイル、依存関係、エクスポートを検出してレポートする SHALL

### Requirement 2: Kiroxプロジェクト構成に合わせたknip設定
**Objective:** 開発者として、Kiroxプロジェクトの特殊な構成（src/、tests/、docs/、demo/等）に対応したknip設定を持ちたい。これにより、誤検出を防ぎ、正確な未使用コード検出を実現できる。

#### Acceptance Criteria

1. WHEN knip設定ファイルでエントリポイントを指定する THEN knipは `src/index.ts`をメインエントリポイントとして認識する SHALL
2. WHEN knip設定ファイルでテストファイルパターンを指定する THEN knipは `tests/**/*.test.ts`をテストファイルとして認識する SHALL
3. WHEN knip設定ファイルでVitePressドキュメント設定を含める THEN knipは `docs/.vitepress/config.ts`をドキュメントエントリポイントとして認識する SHALL
4. WHERE プロジェクトが複数のビルドターゲット（CLI、docs）を持つ THE knipは 各ビルドターゲットのエントリポイントを正しく検出する SHALL
5. WHEN knip設定で除外パターンを指定する THEN knipは `dist/`、`.kiro/`、`demo/`等のビルド成果物や特殊ディレクトリを検査対象から除外する SHALL

### Requirement 3: 既存の依存関係とワークフローとの統合
**Objective:** 開発者として、knipを既存の開発ワークフロー（lint、test、CI）に統合したい。これにより、継続的にコード品質を監視し、問題を早期発見できる。

#### Acceptance Criteria

1. WHEN package.jsonに`lint:knip`スクリプトを追加する THEN 開発者は knipをlintプロセスの一部として実行できる SHALL
2. IF プロジェクトにVitestテストが存在する THEN knipは Vitestの設定（`vitest.config.ts`）を認識し、テスト関連の依存関係を適切に処理する SHALL
3. IF プロジェクトにTypeScript設定が存在する THEN knipは `tsconfig.json`のpaths aliasを理解し、`@/*`エイリアスを正しく解決する SHALL
4. WHEN CI/CDワークフロー（GitHub Actions）にknipチェックを追加する THEN knipは 未使用コードが検出された場合にCIを失敗させる SHALL
5. WHERE 開発者がコードレビュー前 THE knipチェックは 未使用コードの存在を開発者に通知する SHALL

### Requirement 4: プロジェクト固有の例外処理とホワイトリスト
**Objective:** 開発者として、意図的に保持すべきファイルや依存関係（CLI公開用ファイル、将来の拡張用インターフェース等）をknipの検出から除外したい。これにより、誤検出による混乱を避けられる。

#### Acceptance Criteria

1. WHEN knip設定でignoreパターンを指定する THEN knipは 指定されたファイルパターン（例: `src/types/future-*.ts`）を検査から除外する SHALL
2. IF 依存関係がビルド時にのみ使用される（例: tsup、vitepress-plugin-llms） THEN knipは これらの依存関係を誤って「未使用」として報告しない SHALL
3. WHEN knip設定でCLIバイナリファイル（`dist/index.js`）を除外する THEN knipは package.jsonのbinフィールドで指定されたファイルを未使用として報告しない SHALL
4. WHERE プロジェクトが特殊な設定ファイル（`.claude/`、`.kiro/`配下）を持つ THE knipは これらのディレクトリを検査対象外として扱う SHALL

### Requirement 5: レポート生成とドキュメント化
**Objective:** 開発者として、knipの検出結果を理解しやすい形式で確認し、必要に応じてチームと共有したい。これにより、未使用コードのクリーンアップ作業を計画的に進められる。

#### Acceptance Criteria

1. WHEN knipを実行する THEN knipは 未使用ファイル、依存関係、エクスポートのリストを標準出力に表示する SHALL
2. WHEN `--reporter json`オプションを使用する THEN knipは JSON形式でレポートを出力する SHALL
3. WHERE READMEまたはCONTRIBUTING.md THE Kiroxプロジェクトは knipの使用方法と設定に関するドキュメントを含む SHALL
4. WHEN knipが未使用コードを検出する THEN レポートは ファイルパス、理由、推奨アクションを含む SHALL
5. IF knipレポートが空（未使用コードなし）の場合 THEN knipは 成功メッセージ（exit code 0）を返す SHALL
