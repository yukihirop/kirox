# Requirements Document

## Introduction

本機能は、kiroxプロジェクトのソースコードから全てのコメントを削除する機能を提供します。TypeScriptファイル（`.ts`）を対象に、単一行コメント（`//`）および複数行コメント（`/* */`）を安全に削除し、コードの可読性やフォーマットを保ちながらコメントのみを除去します。

## Requirements

### Requirement 1: コメント削除対象の特定

**Objective:** 開発者として、削除対象となるコメントの種類とファイル範囲を明確にしたい。適切なコメント削除範囲を定義することで、意図しないコード変更を防止できる。

#### Acceptance Criteria

1. The comment remover shall target all `.ts` files under the `src/` directory
2. The comment remover shall identify single-line comments starting with `//`
3. The comment remover shall identify multi-line comments enclosed in `/* */`
4. The comment remover shall preserve JSDoc comments (`/** */`) by default
5. Where the `--include-jsdoc` option is specified, the comment remover shall also remove JSDoc comments

### Requirement 2: コメント削除処理

**Objective:** 開発者として、ソースコードからコメントを正確に削除したい。コードの機能を損なわずにコメントのみを除去することで、コードサイズの削減とクリーンなコードベースを実現できる。

#### Acceptance Criteria

1. When the comment remover processes a file, the comment remover shall remove all single-line comments from the file
2. When the comment remover processes a file, the comment remover shall remove all multi-line comments from the file
3. The comment remover shall preserve string literals containing comment-like patterns (e.g., `"// not a comment"`)
4. The comment remover shall preserve template literals containing comment-like patterns
5. The comment remover shall preserve regular expressions containing comment-like patterns
6. When removing comments, the comment remover shall maintain the original code formatting and indentation

### Requirement 3: ファイル操作とバックアップ

**Objective:** 開発者として、元のファイルを復元可能な形でコメント削除を行いたい。安全なファイル操作により、万が一の問題発生時にも復元が可能となる。

#### Acceptance Criteria

1. When the `--backup` option is specified, the comment remover shall create backup files with `.bak` extension before modification
2. The comment remover shall overwrite original files with comment-removed content by default
3. When the `--dry-run` option is specified, the comment remover shall display changes without modifying files
4. If a file read error occurs, the comment remover shall log the error and continue processing other files
5. If a file write error occurs, the comment remover shall log the error with the specific file path

### Requirement 4: CLIオプション

**Objective:** 開発者として、コマンドラインからコメント削除の動作をカスタマイズしたい。柔軟なオプションにより、様々な使用シーンに対応できる。

#### Acceptance Criteria

1. The comment remover shall provide a `--dry-run` option to preview changes without modification
2. The comment remover shall provide a `--backup` option to create backup files
3. The comment remover shall provide a `--include-jsdoc` option to include JSDoc comments in removal
4. The comment remover shall provide a `--path` option to specify target directory (default: `src/`)
5. When invalid options are provided, the comment remover shall display an error message with usage instructions

### Requirement 5: 進捗表示とレポート

**Objective:** 開発者として、コメント削除の進捗と結果を確認したい。処理状況の可視化により、作業の完了状態を把握できる。

#### Acceptance Criteria

1. The comment remover shall display the total number of files to be processed before starting
2. While processing files, the comment remover shall display current progress (e.g., `[3/10] Processing file.ts...`)
3. When processing completes, the comment remover shall display a summary including total files processed, comments removed count, and any errors encountered
4. When the `--verbose` option is specified, the comment remover shall display detailed information for each file processed
