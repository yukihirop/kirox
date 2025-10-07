# Requirements Document

## Introduction
Kirox CLIプロジェクトにGitHub Actions CI/CDワークフローを導入し、コード品質の自動検証とリリースプロセスの自動化を実現します。本機能により、プルリクエストやコミット時に自動的にテスト・リント・型チェック・ビルドが実行され、開発の安全性と効率性が向上します。

## Requirements

### Requirement 1: 継続的インテグレーション（CI）
**Objective:** As a 開発者, I want プルリクエストやプッシュ時に自動的にコード検証が実行される, so that コード品質を維持し、バグの早期発見ができる

#### Acceptance Criteria

1. WHEN 開発者がプルリクエストを作成する THEN GitHub Actions SHALL 自動的にCIワークフローを実行する
2. WHEN 開発者がmainブランチにプッシュする THEN GitHub Actions SHALL 自動的にCIワークフローを実行する
3. WHEN CIワークフローが実行される THEN GitHub Actions SHALL Node.js 18, 20, 22の3つのバージョンでテストを実行する
4. WHEN CIワークフローが実行される THEN GitHub Actions SHALL TypeScript型チェック（`npm run type-check`）を実行する
5. WHEN CIワークフローが実行される THEN GitHub Actions SHALL ESLintによるリント（`npm run lint`）を実行する
6. WHEN CIワークフローが実行される THEN GitHub Actions SHALL ビルド（`npm run build`）を実行する
7. WHEN CIワークフローが実行される THEN GitHub Actions SHALL Vitestによるテスト（`npm test`）を実行する
8. IF いずれかの検証ステップが失敗する THEN GitHub Actions SHALL ワークフロー全体を失敗としてマークする
9. WHEN CIワークフローが完了する THEN GitHub Actions SHALL プルリクエストページに成功・失敗のステータスを表示する

### Requirement 2: テストカバレッジレポート
**Objective:** As a 開発者, I want テストカバレッジを可視化できる, so that テストの網羅性を把握し改善できる

#### Acceptance Criteria

1. WHEN CIワークフローが実行される THEN GitHub Actions SHALL カバレッジレポート（`npm run test:coverage`）を生成する
2. IF カバレッジレポートが生成される THEN GitHub Actions SHALL カバレッジレポートをアーティファクトとして保存する
3. WHEN カバレッジレポートが生成される THEN GitHub Actions SHALL カバレッジサマリーをプルリクエストコメントとして投稿する
4. IF カバレッジが80%未満である THEN GitHub Actions SHALL 警告メッセージを出力する（ただしワークフローは失敗としない）

### Requirement 3: 依存関係のキャッシュ
**Objective:** As a 開発者, I want ワークフローの実行時間を短縮できる, so that フィードバックを迅速に得られる

#### Acceptance Criteria

1. WHEN GitHub Actions がワークフローを実行する THEN GitHub Actions SHALL npm依存関係をキャッシュする
2. WHEN package-lock.jsonが変更されていない THEN GitHub Actions SHALL キャッシュから依存関係を復元する
3. IF キャッシュが存在しない THEN GitHub Actions SHALL 依存関係をインストールし新しいキャッシュを作成する
4. WHEN 依存関係のインストールが完了する THEN GitHub Actions SHALL インストール時間をログに出力する

### Requirement 4: ワークフローの並列実行
**Objective:** As a 開発者, I want 複数のNode.jsバージョンでの検証を効率的に行える, so that 実行時間を最小化できる

#### Acceptance Criteria

1. WHEN CIワークフローが実行される THEN GitHub Actions SHALL 複数のNode.jsバージョン（18, 20, 22）のジョブを並列実行する
2. IF すべてのNode.jsバージョンのジョブが成功する THEN GitHub Actions SHALL ワークフロー全体を成功とする
3. IF いずれかのNode.jsバージョンのジョブが失敗する THEN GitHub Actions SHALL ワークフロー全体を失敗とする
4. WHEN 並列ジョブが実行される THEN GitHub Actions SHALL 各ジョブの実行時間をログに記録する

### Requirement 5: リリースワークフロー（自動タグ付け）
**Objective:** As a メンテナー, I want npmへの公開プロセスを自動化できる, so that リリース作業を効率化し人為的ミスを防げる

#### Acceptance Criteria

1. WHEN メンテナーがmainブランチにv*.*.*形式のGitタグをプッシュする THEN GitHub Actions SHALL リリースワークフローを実行する
2. WHEN リリースワークフローが実行される THEN GitHub Actions SHALL npm依存関係をインストールする
3. WHEN リリースワークフローが実行される THEN GitHub Actions SHALL すべてのCI検証（型チェック・リント・テスト・ビルド）を実行する
4. IF すべてのCI検証が成功する THEN GitHub Actions SHALL `npm publish`を実行してnpmレジストリに公開する
5. IF CI検証が失敗する THEN GitHub Actions SHALL npm公開をスキップしワークフローを失敗とする
6. WHEN npm公開が成功する THEN GitHub Actions SHALL GitHubリリースノートを自動生成する
7. IF npm公開が失敗する THEN GitHub Actions SHALL エラー詳細をワークフローログに出力する

### Requirement 6: セキュリティとクレデンシャル管理
**Objective:** As a メンテナー, I want npmトークンを安全に管理できる, so that セキュリティリスクを最小化できる

#### Acceptance Criteria

1. WHEN リリースワークフローがnpm公開を実行する THEN GitHub Actions SHALL GitHub SecretsからNPM_TOKENを取得する
2. IF NPM_TOKENが設定されていない THEN GitHub Actions SHALL エラーメッセージを出力しワークフローを失敗とする
3. WHEN ワークフローがクレデンシャルを使用する THEN GitHub Actions SHALL ログにクレデンシャルを出力しない
4. WHEN ワークフローが完了する THEN GitHub Actions SHALL 使用したクレデンシャルをメモリから削除する

### Requirement 7: ワークフローステータスバッジ
**Objective:** As a 開発者・ユーザー, I want プロジェクトのCIステータスを一目で確認できる, so that プロジェクトの健全性を把握できる

#### Acceptance Criteria

1. WHEN GitHub ActionsワークフローがREADME.mdに参照される THEN GitHub Actions SHALL CIステータスバッジを表示する
2. IF 最新のCIワークフローが成功している THEN ステータスバッジ SHALL 緑色で「passing」と表示する
3. IF 最新のCIワークフローが失敗している THEN ステータスバッジ SHALL 赤色で「failing」と表示する
4. WHEN ユーザーがステータスバッジをクリックする THEN GitHub Actions SHALL 最新のワークフロー実行ページにリダイレクトする

### Requirement 8: エラー通知とデバッグ
**Objective:** As a 開発者, I want ワークフロー失敗時に詳細な情報を得られる, so that 問題を迅速に解決できる

#### Acceptance Criteria

1. WHEN ワークフローステップが失敗する THEN GitHub Actions SHALL 失敗したステップの詳細ログを出力する
2. WHEN テストが失敗する THEN GitHub Actions SHALL 失敗したテストケース名とエラーメッセージを表示する
3. WHEN リントエラーが発生する THEN GitHub Actions SHALL エラー箇所のファイル名・行番号・内容を表示する
4. WHEN 型チェックエラーが発生する THEN GitHub Actions SHALL TypeScriptエラーの詳細を表示する
5. IF ワークフローがタイムアウトする THEN GitHub Actions SHALL タイムアウト警告を表示し実行時間を記録する
