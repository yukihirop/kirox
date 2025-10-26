---
title: completion コマンド
description: シェル補完スクリプト生成コマンド
---

# completion コマンド

シェル補完スクリプトを出力します。bash、zsh、fish、PowerShell、elvishに対応しています。

## 構文

```bash
npx kirox completion <shell>
```

## 引数

### `<shell>`

シェルの種類を指定します（必須）。

**サポートされているシェル**:
- `bash`
- `zsh`
- `fish`
- `powershell`
- `elvish`

## 使用方法

### bash

```bash
# 補完スクリプトを生成
npx kirox completion bash > /etc/bash_completion.d/kirox

# または、ユーザーディレクトリに配置
npx kirox completion bash > ~/.bash_completion.d/kirox

# 有効化
source /etc/bash_completion.d/kirox
# または
source ~/.bash_completion.d/kirox
```

**永続化**: `.bashrc`に以下を追加
```bash
if [ -f ~/.bash_completion.d/kirox ]; then
  source ~/.bash_completion.d/kirox
fi
```

### zsh

```bash
# 補完スクリプトを生成
npx kirox completion zsh > ~/.zsh/completion/_kirox

# compinit前に補完ディレクトリを追加
# .zshrcに以下を追加
fpath=(~/.zsh/completion $fpath)
autoload -Uz compinit && compinit
```

**Oh My Zsh使用時**:
```bash
# Oh My Zshのカスタムプラグインディレクトリに配置
mkdir -p ~/.oh-my-zsh/custom/plugins/kirox
npx kirox completion zsh > ~/.oh-my-zsh/custom/plugins/kirox/_kirox

# .zshrcのpluginsに追加
plugins=(... kirox)
```

### fish

```bash
# 補完スクリプトを生成
npx kirox completion fish > ~/.config/fish/completions/kirox.fish

# fishは自動的に補完を読み込みます
# シェルを再起動するか、以下を実行
source ~/.config/fish/completions/kirox.fish
```

### PowerShell

```bash
# 補完スクリプトを生成
npx kirox completion powershell > kirox.ps1

# プロファイルに追加
# プロファイルパスを確認
echo $PROFILE

# プロファイルに補完スクリプトを追加
Add-Content $PROFILE ". path\to\kirox.ps1"

# または、直接プロファイルに書き込む
npx kirox completion powershell >> $PROFILE
```

### elvish

```bash
# 補完スクリプトを生成
npx kirox completion elvish > ~/.elvish/lib/kirox.elv

# rc.elvに以下を追加
use kirox
```

## 補完される内容

シェル補完により、以下が自動補完されます：

### コマンド

- `kirox`
- `add`
- `completion`

### オプション

- `--project`, `-p`
- `--force`, `-f`
- `--dry-run`
- `--verbose`
- `--track`
- `--steering`
- `--subdirectory`
- `--config`, `-c`
- `--help`, `-h`
- `--version`, `-V`

### シェル名（completionコマンド）

- `bash`
- `zsh`
- `fish`
- `powershell`
- `elvish`

## 使用例

### 補完の動作確認

補完が正しく設定されると、以下のように動作します：

```bash
# コマンド補完
$ npx kirox [TAB]
add        completion

# オプション補完
$ npx kirox --[TAB]
--project      --force        --dry-run
--verbose      --track        --steering
--subdirectory --config       --help
--version

# シェル名補完
$ npx kirox completion [TAB]
bash       zsh        fish
powershell elvish
```

## トラブルシューティング

### 補完が動作しない（bash）

**確認事項**:
1. bash-completionがインストールされているか確認
```bash
# macOS (Homebrew)
brew install bash-completion

# Ubuntu/Debian
apt-get install bash-completion
```

2. bash-completionが有効化されているか確認（`.bashrc`に以下を追加）
```bash
if [ -f /etc/bash_completion ]; then
  . /etc/bash_completion
fi
```

3. シェルを再起動
```bash
exec bash
```

### 補完が動作しない（zsh）

**確認事項**:
1. compinit が実行されているか確認（`.zshrc`に以下を追加）
```bash
autoload -Uz compinit && compinit
```

2. 補完ディレクトリがfpathに含まれているか確認
```bash
echo $fpath
```

3. 補完キャッシュをリセット
```bash
rm ~/.zcompdump*
exec zsh
```

### 補完が動作しない（fish）

**確認事項**:
1. 補完ファイルのパスが正しいか確認
```bash
ls ~/.config/fish/completions/kirox.fish
```

2. fishを再起動
```bash
exec fish
```

## 手動での補完設定

補完スクリプトの自動生成がうまくいかない場合、手動で設定することもできます。

### bash（手動）

```bash
# .bashrcに以下を追加
_kirox_completion() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local prev="${COMP_WORDS[COMP_CWORD-1]}"

  case "${prev}" in
    kirox)
      COMPREPLY=( $(compgen -W "add completion --project --force --dry-run --verbose --track --steering --subdirectory --config --help --version" -- ${cur}) )
      return 0
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish powershell elvish" -- ${cur}) )
      return 0
      ;;
  esac
}

complete -F _kirox_completion kirox
```

## 関連ページ

- [kirox コマンド](/cli/kirox): メインコマンドの詳細
- [add コマンド](/cli/add): addサブコマンドの詳細
- [はじめに](/guide/getting-started): インストール方法と初期設定
