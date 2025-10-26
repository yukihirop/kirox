# 実装計画

- [x] 1. VitePressプロジェクトのセットアップと基本設定
- [x] 1.1 VitePress依存関係のインストールと初期設定
  - package.jsonにVitePress依存関係を追加
  - VitePress開発・ビルド・プレビュー用のnpmスクリプトを設定
  - docs/ディレクトリとサブディレクトリ構造を作成
  - 型チェックスクリプトにVitePress設定ファイルを含める
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 1.2 VitePress基本設定ファイルの作成
  - TypeScript形式でVitePress設定ファイルを作成
  - サイトタイトルと説明のメタデータを設定
  - GitHub Pages用のbaseパス設定を構成
  - 言語設定とHTMLメタデータを定義
  - マークダウン処理オプションを設定（行番号、アンカー、目次）
  - _Requirements: 1.2, 5.5_

- [x] 2. ドキュメント構造とコンテンツの作成
- [x] 2.1 トップページとホームレイアウトの構築
  - ホームレイアウト用のindex.mdをフロントマターで設定
  - プロジェクト概要とヒーローセクションの内容を作成
  - 主要機能紹介セクションを記述
  - クイックスタートガイドを含める
  - CTAボタンとリンク設定を追加
  - _Requirements: 2.1, 3.2_

- [x] 2.2 ガイドセクションのページ作成
  - guide/index.mdでガイド概要ページを作成
  - getting-started.mdでインストール手順を記述
  - basic-usage.mdで基本的な使い方を説明
  - advanced-usage.mdで高度な使い方を解説
  - troubleshooting.mdでトラブルシューティングを提供
  - 各ページにフロントマター（title、description）を設定
  - _Requirements: 2.3, 4.1_

- [x] 2.3 CLIリファレンスセクションのページ作成
  - cli/index.mdでCLIリファレンス概要を作成
  - kirox.mdで主要コマンドの詳細説明と使用例を記述
  - add.mdでaddサブコマンドのオプション一覧と使用例を記述
  - completion.mdでcompletionサブコマンドの説明を記述
  - 各ページにコードブロックと使用例を含める
  - _Requirements: 2.4, 4.2_

- [x] 2.4 API仕様とConfigセクションのページ作成
  - api/index.mdでAPI仕様概要を作成
  - github-fetcher.mdでGitHub Fetcher APIを説明
  - filesystem-writer.mdでFileSystem Writer APIを説明
  - config/index.mdで設定ガイドを作成
  - kiroxrc.mdで.kiroxrc.json設定リファレンスを記述
  - _Requirements: 2.5_

- [ ] 3. ナビゲーションとテーマのカスタマイズ
- [ ] 3.1 ナビゲーションバーとサイドバーの設定
  - トップナビゲーションメニュー項目を設定（ガイド、CLI、API、設定）
  - サイドバー構造をパスパターンごとに定義
  - ガイドセクション用のサイドバー項目を設定
  - CLIリファレンスセクション用のサイドバー項目を設定
  - API仕様セクション用のサイドバー項目を設定
  - _Requirements: 2.2_

- [ ] 3.2 テーマとブランディングのカスタマイズ
  - Kiroxブランド用のプライマリカラーとアクセントカラーをCSS変数で設定
  - ダークモード対応の色設定を追加
  - ロゴ画像とファビコンファイルを配置
  - VitePress設定でロゴとファビコンパスを指定
  - ソーシャルリンク（GitHub）を設定
  - _Requirements: 3.1, 3.3, 3.4_

- [ ] 3.3 フッターとその他のテーマ設定
  - フッター情報（ライセンス、コピーライト）を設定
  - コードブロックの構文ハイライト設定を確認
  - 検索機能（ローカル検索）を有効化
  - アウトライン表示設定を調整
  - _Requirements: 3.5, 4.4_

- [ ] 4. コンテンツ作成支援機能の実装
- [ ] 4.1 カスタムコンテナとフロントマターの活用
  - カスタムコンテナ（tip、warning、danger）の使用例をドキュメントに追加
  - 各マークダウンファイルのフロントマターを適切に設定
  - レイアウト種別（doc、home）の適切な使用を確認
  - outlineレベルの設定を各ページで調整
  - _Requirements: 4.2, 4.1_

- [ ] 4.2 内部リンク検証とコードタブ機能
  - 内部リンクが正しく設定されているか検証
  - 必要に応じてコード例タブ機能を実装
  - リンク切れをビルド警告で確認できることを検証
  - マークダウン内の相対リンクが正しく機能することを確認
  - _Requirements: 4.3, 4.5_

- [ ] 5. GitHub Actionsデプロイワークフローの構築
- [ ] 5.1 GitHub Actionsワークフローファイルの作成
  - deploy-docs.ymlワークフローファイルを作成
  - mainブランチへのpushと手動トリガーを設定
  - 必要な権限（contents: read、pages: write、id-token: write）を定義
  - リポジトリの全履歴取得設定（lastUpdated機能用）を追加
  - _Requirements: 5.3_

- [ ] 5.2 ビルドジョブの実装
  - Node.js 22セットアップステップを追加
  - npm ciで依存関係をインストール
  - npm run docs:buildでVitePressビルドを実行
  - ビルド成果物（docs/.vitepress/dist/）をアップロード
  - _Requirements: 5.1_

- [ ] 5.3 デプロイジョブの実装
  - GitHub Pagesへのデプロイステップを追加
  - github-pages環境を設定
  - デプロイ成功後のURL出力を確認
  - ワークフローがmainブランチへのpushで自動実行されることを確認
  - _Requirements: 5.3, 5.4_

- [ ] 6. テストと検証
- [ ] 6.1 ローカル開発環境でのテスト
  - npm run docs:devでローカルサーバーが起動することを確認
  - トップページが正しく表示されることを確認
  - 全セクション（ガイド、CLI、API、設定）のページが表示されることを確認
  - ナビゲーションとサイドバーが正しく機能することを確認
  - ダークモード切り替えが動作することを確認
  - _Requirements: 1.1, 2.1, 2.2, 3.3_

- [ ] 6.2 ビルドプロセスのテスト
  - npm run docs:buildが正常に完了することを確認
  - docs/.vitepress/dist/に静的ファイルが生成されることを確認
  - ビルド警告ログでリンク切れがないことを確認
  - 型チェック（npm run type-check）が成功することを確認
  - _Requirements: 5.1, 5.2_

- [ ] 6.3 GitHub Pagesデプロイメントの検証
  - GitHub Pagesリポジトリ設定でActionsをビルドソースに設定
  - mainブランチへのpushでワークフローが自動実行されることを確認
  - デプロイ成功後にGitHub Pages URLでサイトにアクセスできることを確認
  - 全ページとアセット（画像、CSS、JS）が正しくロードされることを確認
  - 検索機能が動作することを確認
  - _Requirements: 5.3, 5.4, 5.5, 4.4_

- [ ] 7. ドキュメント品質とパフォーマンスの検証
- [ ] 7.1 SEOとメタデータの確認
  - 各ページのメタタグ（title、description）が正しく生成されることを確認
  - sitemap.xmlが生成されることを確認
  - robots.txtが含まれることを確認（該当する場合）
  - _Requirements: 5.2_

- [ ] 7.2 パフォーマンステスト
  - ビルド時間が3分以内であることを確認（ページ数50以下の場合）
  - GitHub Pages URLでLighthouseスコアを測定
  - Performance スコア90以上を目標とする
  - FCP（First Contentful Paint）1.5秒以内を確認
  - _Requirements: パフォーマンス目標_

- [ ] 8. ドキュメント更新ワークフローの確立
- [ ] 8.1 ドキュメント更新プロセスの文書化
  - ドキュメント更新方法をREADMEまたはCONTRIBUTING.mdに記載
  - 新規ページ追加時のナビゲーション更新手順を説明
  - マークダウンフォーマット（Prettier）の使用方法を記載
  - _Requirements: 6.1, 6.3_

- [ ] 8.2 継続的品質チェックの設定
  - マークダウンフォーマットチェックをCIに統合（該当する場合）
  - リンク切れ検出スクリプトを追加（将来拡張）
  - プルリクエストテンプレートにドキュメント更新確認項目を追加
  - _Requirements: 6.3, 6.5_
