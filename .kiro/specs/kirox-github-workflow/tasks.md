# Implementation Plan

- [ ] 1. Vitestカバレッジ設定の拡張
- [x] 1.1 カバレッジレポート形式の追加設定
  - vitest.config.tsでカバレッジレポーターに`json-summary`と`json`を追加
  - 既存の`text`, `html`レポーターを維持
  - カバレッジ出力ディレクトリが`coverage/`であることを確認
  - カバレッジ生成が失敗時も実行されるよう`reportOnFailure: true`を設定
  - _Requirements: 2.1, 2.2_

- [ ] 2. CIワークフローの構築
- [ ] 2.1 基本CIワークフロー定義の作成
  - `.github/workflows/`ディレクトリを作成
  - `ci.yml`ワークフローファイルを作成
  - プルリクエストとmainブランチプッシュをトリガーとして設定
  - ワークフロー名を「CI」に設定
  - _Requirements: 1.1, 1.2_

- [ ] 2.2 Node.jsマトリクス戦略の実装
  - Node.js 18.x, 20.x, 22.xの3バージョンでマトリクス戦略を設定
  - ubuntu-latestランナーを使用
  - 各バージョンで独立したジョブとして並列実行
  - ジョブ名にNode.jsバージョンを含める
  - _Requirements: 1.3, 4.1, 4.2, 4.3_

- [ ] 2.3 依存関係キャッシュの設定
  - actions/setup-node@v4でnpmキャッシュを有効化
  - package-lock.jsonをキャッシュキーとして使用
  - キャッシュヒット時のログ出力を確認
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 2.4 コード品質検証ステップの実装
  - actions/checkout@v5でコードをチェックアウト
  - npm ciで依存関係をインストール
  - TypeScript型チェック（npm run type-check）を実行
  - ESLintリント（npm run lint）を実行
  - ビルド（npm run build）を実行
  - Vitestテスト（npm test）を実行
  - 各ステップに明確な名前を付ける
  - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

- [ ] 2.5 カバレッジレポートPR投稿の実装
  - Node.js 20ジョブでのみカバレッジレポートを生成
  - davelosert/vitest-coverage-report-action@v2を使用
  - テスト失敗時もカバレッジレポートを生成（if: always()）
  - file-coverage-mode: changesで変更ファイルのみカバレッジ表示
  - カバレッジアーティファクトとして保存
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 2.6 ワークフロー権限の設定
  - contents: read権限を設定（コードチェックアウト用）
  - pull-requests: write権限を設定（カバレッジコメント投稿用）
  - 権限を最小限に制限
  - _Requirements: セキュリティ要件全般_

- [ ] 3. Releaseワークフローの構築
- [ ] 3.1 基本Releaseワークフロー定義の作成
  - `release.yml`ワークフローファイルを作成
  - v*.*.*形式のタグプッシュをトリガーとして設定
  - ワークフロー名を「Release」に設定
  - ubuntu-latestランナーを使用
  - Node.js 20を使用
  - _Requirements: 5.1_

- [ ] 3.2 CI検証ステップの実装
  - actions/checkout@v5でコードをチェックアウト
  - actions/setup-node@v4でNode.js環境をセットアップ
  - npm ciで依存関係をインストール
  - TypeScript型チェック、ESLint、ビルド、テストを順次実行
  - いずれかの検証が失敗した場合はワークフロー全体を失敗
  - _Requirements: 5.2, 5.3, 5.5_

- [ ] 3.3 npm公開ステップの実装
  - npmレジストリURLを設定（registry-url: 'https://registry.npmjs.org'）
  - GitHub SecretsからNPM_TOKENを環境変数NODE_AUTH_TOKENとして設定
  - npm publishコマンドを実行
  - 公開成功時のログ出力を確認
  - 公開失敗時の詳細エラーログを出力
  - _Requirements: 5.4, 5.7, 6.1, 6.2, 6.3_

- [ ] 3.4 GitHubリリース作成の実装
  - npm公開成功後にGitHubリリースを自動作成
  - タグ名をリリース名として使用
  - コミット履歴から自動リリースノートを生成
  - リリースURLをログに出力
  - _Requirements: 5.6_

- [ ] 3.5 Releaseワークフロー権限の設定
  - contents: write権限を設定（GitHubリリース作成用）
  - id-token: write権限を設定（将来的なOIDC認証用）
  - _Requirements: セキュリティ要件全般_

- [ ] 4. ワークフローステータスバッジの追加
- [ ] 4.1 README.mdへのバッジ追加
  - README.mdの先頭にCIワークフローバッジを追加
  - Releaseワークフローバッジを追加
  - バッジがワークフローページにリンク
  - バッジマークダウン形式で記述
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 5. ワークフロー動作検証
- [ ] 5.1 CIワークフローの手動テスト
  - テスト用ブランチでプルリクエストを作成
  - 全Node.jsバージョン（18, 20, 22）でテストが実行されることを確認
  - カバレッジレポートがPRコメントとして投稿されることを確認
  - PRステータスチェックが✅になることを確認
  - 意図的にテスト失敗を導入し、ワークフロー失敗を確認
  - 意図的にリント違反を導入し、ワークフロー失敗を確認
  - _Requirements: 1.1-1.9, 2.1-2.4, 4.1-4.4, 8.1-8.5_

- [ ] 5.2 Releaseワークフローの手動テスト
  - テストタグ（v0.0.1-test）を作成してプッシュ
  - CI検証ステップが全て実行されることを確認
  - npm公開をスキップする条件（if: false）を一時的に追加してテスト
  - ワークフローログでNPM_TOKENがマスキングされていることを確認
  - _Requirements: 5.1-5.7, 6.1-6.4, 8.1-8.5_

- [ ] 5.3 キャッシュ効率の検証
  - 同一package-lock.jsonで連続してワークフローを実行
  - キャッシュヒット時のnpm ci実行時間を記録
  - キャッシュミス時（package-lock.json変更後）の実行時間と比較
  - キャッシュによる50%以上の時間短縮を確認
  - _Requirements: 3.1-3.4_

- [ ] 6. ドキュメント更新とクリーンアップ
- [ ] 6.1 GitHub Secrets設定手順の文書化
  - NPM_TOKENの取得方法をドキュメント化
  - GitHub Secretsへの登録手順を記載
  - トークンの権限スコープ（Automation Token）を明記
  - セキュリティベストプラクティスを記載
  - _Requirements: 6.1, 6.2_

- [ ] 6.2 ワークフロー仕様の最終確認
  - 全要件（Requirement 1-8）がワークフローに実装されていることを確認
  - エラーハンドリングが適切に動作することを確認
  - パフォーマンス目標（CI: 3-5分、Release: 5分以内）を満たすことを確認
  - セキュリティ対策（権限最小化、シークレットマスキング）が実装されていることを確認
  - _Requirements: 全要件_
