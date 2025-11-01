# Requirements Document

## Introduction

Kirox CLIでは現在、カスタム実装のLogger(`src/reporting/logger.ts`)を使用していますが、以下の課題があります:

1. **ログレベル制御の欠如**: 全てのログレベル(INFO/WARN/ERROR/VERBOSE)が常に出力され、環境や用途に応じた制御ができない
2. **冗長な条件分岐**: `if (args.verbose)`のような条件分岐が各所に散在し、コードの可読性と保守性が低下している
3. **軽量性の欠如**: カスタム実装のため、業界標準の機能や最適化が利用できない

本機能では、軽量な外部ログライブラリを導入し、ログレベルのデフォルト制御とverboseフラグによる条件分岐の排除を実現します。これにより、コードの簡潔性と保守性が向上し、標準化されたロギング機能を提供できます。

## Requirements

### Requirement 1: 軽量ログライブラリの選定と導入
**Objective:** 開発者として、業界標準の軽量ログライブラリを導入することで、カスタム実装のメンテナンスコストを削減し、信頼性の高いログ機能を利用したい

#### Acceptance Criteria

1. WHEN ログライブラリを選定する際 THEN Kirox CLI SHALL 以下の基準を満たすライブラリを選択する
   - バンドルサイズが50KB以下であること
   - TypeScript型定義が完全にサポートされていること
   - ログレベル制御機能(debug/info/warn/error)を持つこと
   - 週次ダウンロード数が100万以上であること(エコシステムの成熟度指標)
   - Node.js 18+をサポートしていること

2. WHEN ログライブラリを導入する際 THEN Kirox CLI SHALL 以下のログレベルに対応する
   - `debug`: 詳細なデバッグ情報(verbose相当)
   - `info`: 一般的な情報メッセージ
   - `warn`: 警告メッセージ
   - `error`: エラーメッセージ

3. WHEN ログライブラリがインストールされた際 THEN Kirox CLI SHALL package.jsonのdependenciesに追加され、ビルド後のバンドルサイズの増加が100KB以内に収まる

### Requirement 2: デフォルトログレベルの設定
**Objective:** ユーザーとして、通常利用時には必要最小限の情報のみが表示され、冗長なログ出力による視認性の低下を防ぎたい

#### Acceptance Criteria

1. WHEN --verboseフラグが指定されていない場合 THEN Kirox CLI SHALL infoレベル以上(info/warn/error)のログのみを出力する

2. WHEN --verboseフラグが指定された場合 THEN Kirox CLI SHALL debugレベル以上(debug/info/warn/error)の全てのログを出力する

3. WHEN ログライブラリが初期化される際 THEN Kirox CLI SHALL 環境変数や設定ファイルではなく、--verboseフラグのみでログレベルを制御する

4. IF ログレベルがinfoに設定されている場合 THEN Kirox CLI SHALL debugレベルのログメッセージを出力しない

### Requirement 3: 条件分岐の排除とコードの簡潔化
**Objective:** 開発者として、`if (args.verbose)`のような条件分岐をコードから排除し、ログライブラリのレベル制御機能に委譲することで、コードの可読性と保守性を向上させたい

#### Acceptance Criteria

1. WHEN 既存の`if (args.verbose) { logger.info(...) }`パターンが存在する場合 THEN Kirox CLI SHALL 条件分岐を削除し、`logger.debug(...)`に置き換える

2. WHEN 既存の`if (args.verbose) { logger.verbose(...) }`パターンが存在する場合 THEN Kirox CLI SHALL 条件分岐を削除し、`logger.debug(...)`に置き換える

3. WHEN 条件分岐なしの`logger.info(...)`が存在する場合 THEN Kirox CLI SHALL そのまま`logger.info(...)`として維持する(infoレベルは常に表示)

4. WHEN 全ての既存ログ呼び出しが新しいライブラリに移行された際 THEN Kirox CLI SHALL 以下のファイルから全ての`if (args.verbose)`条件分岐が削除される
   - `src/cli/entry.ts`
   - `src/reporting/progress-reporter.ts`
   - その他logger使用箇所全て

### Requirement 4: カスタムLoggerクラスの削除
**Objective:** 開発者として、カスタムLogger実装を削除し、外部ライブラリに完全移行することで、メンテナンスコストを削減したい

#### Acceptance Criteria

1. WHEN 新しいログライブラリへの移行が完了した際 THEN Kirox CLI SHALL `src/reporting/logger.ts`ファイルを削除する

2. WHEN `src/reporting/logger.ts`が削除された際 THEN Kirox CLI SHALL 以下のインポート文を全て削除または置き換える
   - `import { Logger } from '@/reporting/logger.js'`
   - `import type { LogLevel } from '@/reporting/types.js'`(LogLevel型がlogger.tsのみで使用されている場合)

3. WHEN カスタムLoggerが削除された際 THEN Kirox CLI SHALL 既存のテストファイル`tests/unit/reporting/logger.test.ts`を削除または新しいライブラリに対応したテストに置き換える

4. WHEN 移行が完了した際 THEN Kirox CLI SHALL `npm run build && npm run test`が全て成功する

### Requirement 5: 後方互換性とログ出力形式の維持
**Objective:** ユーザーとして、ライブラリ変更後もログ出力形式が大きく変わらず、既存のログ解析スクリプトやCI/CD環境に影響を与えないことを期待する

#### Acceptance Criteria

1. WHEN infoレベル以上のログが出力される際 THEN Kirox CLI SHALL 以下の基本情報を含む
   - ログレベル表示(INFO/WARN/ERROR等)
   - メッセージ本文
   - オプションの詳細情報(構造化データ)

2. WHEN errorレベルのログが出力される際 THEN Kirox CLI SHALL 標準エラー出力(stderr)に出力する

3. WHEN info/warn/debugレベルのログが出力される際 THEN Kirox CLI SHALL 標準出力(stdout)に出力する

4. IF 新しいログライブラリがタイムスタンプ機能を持つ場合 THEN Kirox CLI SHALL タイムスタンプの表示/非表示を設定可能にする(オプション)
