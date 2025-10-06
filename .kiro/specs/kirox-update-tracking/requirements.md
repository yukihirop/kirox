# 要求仕様書

## はじめに

Kirox CLIに更新追従機能を追加し、リモートリポジトリから取得したKiro仕様ファイルの更新を追跡・管理できるようにする。この機能により、テンプレートとして取得した仕様をローカルで編集しつつ、オリジナルの改善も安全に取り込むことが可能になる。

### ビジネス価値
- テンプレート仕様の再利用性向上
- オリジナル仕様の改善を継続的に取り込める
- ローカル編集の保護による安全性確保
- 手動での差分確認作業の削減

## 要求仕様

### 要求1: 追跡メタデータの保存
**目的:** CLIユーザーとして、リモートから取得したファイルの追跡情報を自動的に保存したい。これにより、後で更新チェックや安全な更新取得が可能になる。

#### 受入基準

1. WHEN ユーザーが `--track` オプション付きでfetchコマンドを実行する THEN Kirox CLI SHALL `.kiro/.kirox-meta.json` にメタデータファイルを作成する
2. WHEN メタデータファイルが作成される THEN Kirox CLI SHALL リポジトリ情報（owner、repo、project名）を記録する
3. WHEN ファイルが取得される THEN Kirox CLI SHALL 各ファイルのパス、SHA、取得日時をメタデータに記録する
4. IF メタデータファイルが既に存在する THEN Kirox CLI SHALL 既存の追跡情報を保持しつつ新規ファイルの情報を追加する
5. WHEN メタデータファイルへの書き込みが失敗する THEN Kirox CLI SHALL エラーメッセージを表示し、ファイル取得は成功させる
6. WHEN `--track` オプションなしでfetchする THEN Kirox CLI SHALL メタデータファイルを作成・更新しない

### 要求2: ローカル編集の検出
**目的:** CLIユーザーとして、取得後にローカルで編集したファイルを自動的に検出したい。これにより、編集済みファイルの誤上書きを防止できる。

#### 受入基準

1. WHEN ファイルがローカルに保存される THEN Kirox CLI SHALL ファイル内容のSHA-256ハッシュを計算しメタデータに記録する
2. WHEN 更新チェック時にファイルが読み込まれる THEN Kirox CLI SHALL 現在のファイルハッシュと記録されたハッシュを比較する
3. IF ファイルハッシュが記録と一致しない THEN Kirox CLI SHALL そのファイルを「ローカル編集あり」として扱う
4. IF ファイルハッシュが記録と一致する THEN Kirox CLI SHALL そのファイルを「ローカル編集なし」として扱う
5. WHEN ファイルが削除されている THEN Kirox CLI SHALL そのファイルを「削除済み」として扱う
6. IF ファイルハッシュの計算に失敗する THEN Kirox CLI SHALL そのファイルを「状態不明」として扱い警告を表示する

### 要求3: リモート更新のチェック
**目的:** CLIユーザーとして、リモートリポジトリの仕様ファイルに更新があるかチェックしたい。これにより、どのファイルが更新可能か事前に把握できる。

#### 受入基準

1. WHEN ユーザーが `--check-updates` コマンドを実行する THEN Kirox CLI SHALL メタデータファイルを読み込む
2. IF メタデータファイルが存在しない THEN Kirox CLI SHALL エラーメッセージを表示し終了する
3. WHEN リモート更新をチェックする THEN Kirox CLI SHALL メタデータ内の各ファイルについてGitHub APIで最新SHAを取得する
4. WHEN ファイルの最新SHAを取得する THEN Kirox CLI SHALL 記録されたSHAと比較する
5. IF リモートSHAが記録SHAと異なる AND ローカル編集なし THEN Kirox CLI SHALL そのファイルを「更新可能」として表示する
6. IF リモートSHAが記録SHAと異なる AND ローカル編集あり THEN Kirox CLI SHALL そのファイルを「更新あり（ローカル編集あり）」として表示する
7. IF リモートSHAが記録SHAと一致する THEN Kirox CLI SHALL そのファイルを「最新」として表示する
8. WHEN すべてのファイルをチェック完了する THEN Kirox CLI SHALL サマリー（更新可能数、編集競合数、最新数）を表示する
9. IF GitHub APIエラーが発生する THEN Kirox CLI SHALL エラー詳細とリトライ推奨メッセージを表示する

### 要求4: 安全な更新の取得
**目的:** CLIユーザーとして、ローカル編集していないファイルのみ安全に更新したい。これにより、自分の編集を失わずにオリジナルの改善を取り込める。

#### 受入基準

1. WHEN ユーザーが `--update` コマンドを実行する THEN Kirox CLI SHALL メタデータファイルを読み込む
2. IF メタデータファイルが存在しない THEN Kirox CLI SHALL エラーメッセージを表示し終了する
3. WHEN 更新処理を開始する THEN Kirox CLI SHALL まずリモート更新チェックを実行する
4. WHEN ファイルが「更新可能」と判定される THEN Kirox CLI SHALL そのファイルをリモートから再取得する
5. WHEN ファイルが「更新あり（ローカル編集あり）」と判定される THEN Kirox CLI SHALL そのファイルをスキップし警告メッセージを表示する
6. WHEN ファイルが「最新」と判定される THEN Kirox CLI SHALL そのファイルをスキップする
7. WHEN ファイル更新が成功する THEN Kirox CLI SHALL メタデータ内のSHA、取得日時、ハッシュを更新する
8. WHEN すべてのファイル処理が完了する THEN Kirox CLI SHALL サマリー（更新成功数、スキップ数、失敗数）を表示する
9. IF 一部ファイルの更新が失敗する THEN Kirox CLI SHALL 成功したファイルのメタデータのみ更新し、失敗ファイルは元のままにする

### 要求5: メタデータの整合性管理
**目的:** システム管理者として、メタデータファイルの整合性を保ちたい。これにより、追跡機能が確実に動作する。

#### 受入基準

1. WHEN メタデータファイルを読み込む THEN Kirox CLI SHALL JSON形式の妥当性を検証する
2. IF メタデータのJSON形式が不正 THEN Kirox CLI SHALL エラーメッセージを表示し、メタデータを使用しない
3. WHEN メタデータを書き込む THEN Kirox CLI SHALL 原子的書き込み（一時ファイル→リネーム）で破損を防止する
4. WHEN メタデータに新規ファイルを追加する THEN Kirox CLI SHALL 重複チェックを行い既存エントリは上書きする
5. IF ファイルがローカルに存在しない THEN Kirox CLI SHALL メタデータからそのエントリを削除しない（削除として扱う）
6. WHEN メタデータファイルのパーミッションエラーが発生する THEN Kirox CLI SHALL 読み書き権限に関する具体的なエラーメッセージを表示する

### 要求6: 既存機能との互換性
**目的:** CLIユーザーとして、既存のfetch機能を従来通り使いたい。新機能は既存ワークフローを壊さない。

#### 受入基準

1. WHEN `--track` オプションなしでfetchする THEN Kirox CLI SHALL 既存の動作を完全に維持する
2. WHEN `--track`、`--check-updates`、`--update` 以外のオプションと組み合わせる THEN Kirox CLI SHALL 各オプションが正常に動作する
3. IF `.kiro/.kirox-meta.json` が存在しない AND `--check-updates` または `--update` を実行する THEN Kirox CLI SHALL 適切なエラーメッセージを表示する
4. WHEN 複数プロジェクトを同じディレクトリにfetchする THEN Kirox CLI SHALL メタデータ内で各プロジェクトの追跡情報を独立して管理する
5. IF メタデータファイルの読み書きエラーが発生する THEN Kirox CLI SHALL fetch自体は失敗させない（エラーログのみ）

### 要求7: エラーハンドリングとユーザーフィードバック
**目的:** CLIユーザーとして、エラー発生時に何が問題かを理解し適切に対処したい。明確なメッセージにより効率的にトラブルシューティングできる。

#### 受入基準

1. WHEN GitHub APIレート制限に達する THEN Kirox CLI SHALL リセット時刻を含むエラーメッセージを表示する
2. WHEN ネットワークエラーが発生する THEN Kirox CLI SHALL リトライ推奨メッセージとともにエラーを表示する
3. WHEN ファイルシステムエラーが発生する THEN Kirox CLI SHALL パーミッションやディスク容量に関する具体的なエラーを表示する
4. WHEN `--verbose` オプション付きで実行する THEN Kirox CLI SHALL メタデータ操作の詳細ログを出力する
5. WHEN ローカル編集ありのファイルをスキップする THEN Kirox CLI SHALL どのファイルがスキップされたか明示する
6. WHEN 更新処理が完了する THEN Kirox CLI SHALL 更新されたファイル一覧を表示する

## 非機能要求

### パフォーマンス
1. WHEN 100ファイルの更新チェックを実行する THEN Kirox CLI SHALL 30秒以内に完了する
2. WHEN メタデータファイルを読み書きする THEN Kirox CLI SHALL 1秒以内に完了する

### セキュリティ
1. WHEN メタデータファイルを作成する THEN Kirox CLI SHALL ファイルパーミッション644（user: rw, group: r, other: r）で作成する
2. WHEN GitHub認証トークンを使用する THEN Kirox CLI SHALL トークンをメタデータに記録しない

### 保守性
1. WHEN メタデータファイル形式を変更する THEN Kirox CLI SHALL バージョン番号を含め、後方互換性を維持する
2. WHERE 既存のKirox CLIアーキテクチャ THE 更新追従機能 SHALL 既存の層構造（CLI、GitHub、FileSystem、Reporting）に準拠する
