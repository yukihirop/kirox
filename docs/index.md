---
layout: home

hero:
  name: Kirox
  text: Kiro Spec-Driven Development CLI
  tagline: リモートGitHubリポジトリからKiro仕様書とステアリングファイルを取得するCLIツール
  actions:
    - theme: brand
      text: はじめる
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/yukihirop/kirox

features:
  - icon: 📦
    title: リモートリポジトリからのファイル取得
    details: 指定したGitHubリポジトリから.kiro/specs/<project>および.kiro/steering/配下の全ファイルを自動取得
  - icon: ⚡
    title: npx即時実行
    details: グローバルインストール不要、npx kiroxコマンドで即座に実行可能
  - icon: 🛡️
    title: 上書き保護
    details: 既存ローカルファイルの意図しない上書きを防ぐ確認プロンプト機能
  - icon: 📊
    title: 進捗可視化
    details: リアルタイムでファイル取得状況を表示し、完了時には成功・失敗数をサマリー表示
  - icon: 🎯
    title: 柔軟な設定
    details: 設定ファイル（.kiroxrc.json）による動作カスタマイズと複数オプション（--force、--dry-run、--verbose）のサポート
  - icon: 🔄
    title: 更新追跡
    details: リモートリポジトリの変更を追跡し、ローカルファイルとの差分を検出
---

## クイックスタート

### インストール

npxを使用して即座に実行できます：

```bash
npx kirox owner/repo -p project-name
```

### 基本的な使い方

GitHubリポジトリから仕様書を取得：

```bash
# 特定のプロジェクトを取得
npx kirox yukihirop/my-project -p my-spec

# 複数プロジェクトを取得
npx kirox yukihirop/my-project -p spec1,spec2

# インタラクティブモードで実行
npx kirox
```

### 主な機能

- **リモートリポジトリからのファイル取得**: `.kiro/specs/`と`.kiro/steering/`のファイルを自動取得
- **上書き保護**: 既存ファイルの確認プロンプト
- **ブランチ指定**: `owner/repo#branch`形式でブランチを指定可能
- **サブディレクトリ対応**: リポジトリ内のサブディレクトリから取得可能
- **シェル補完**: bash、zsh、fish、PowerShellに対応

詳しくは[ガイド](/guide/)をご覧ください。
