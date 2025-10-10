# Task 1.1 Investigation: @inquirer/prompts createPrompt API

**Date**: 2025-10-10
**Task**: 1.1 - `@inquirer/prompts`の`createPrompt` APIと既存実装の調査
**Status**: ✅ Completed

## Summary

`@inquirer/prompts` v7.8.6（Inquirer.js v9+アーキテクチャ）の`createPrompt` APIを調査し、カスタム検索可能チェックボックスプロンプトを自作するための技術的実現可能性を確認しました。

## Findings

### 1. @inquirer/core の createPrompt API

#### 基本的な使用方法

```typescript
import { createPrompt } from '@inquirer/core';

const myPrompt = createPrompt<ReturnType, ConfigType>(
  (config, done) => {
    // プロンプトのロジック
    // done(value)を呼び出すと、プロンプトが完了し値が返される
    return '表示するテキスト';
  }
);

// 使用方法
const answer = await myPrompt({ message: '質問', /* ...config */ });
```

#### TypeScript ジェネリクス

- **第1引数 (`ReturnType`)**: プロンプトが返す値の型
- **第2引数 (`ConfigType`)**: プロンプト設定のインターフェース型

```typescript
const input = createPrompt<string, { message: string }>(...);
```

### 2. 利用可能なHooks

`@inquirer/core`は、React風のフックAPIを提供：

| Hook | 用途 | 説明 |
|------|------|------|
| `useState<T>` | 状態管理 | コンポーネント内で状態を宣言・更新 |
| `useKeypress` | キーボードイベント | キー入力に反応、プロンプト行へのアクセス |
| `useEffect` | 副作用 | 外部システムとの接続 |
| `useMemo<T>` | メモ化 | 高コストな計算結果のキャッシュ |
| `useRef<T>` | 参照保持 | レンダリング間で値を保持（再レンダリングをトリガーしない） |
| `usePagination` | ページネーション | 大量の選択肢をページ分割して表示 |

### 3. @inquirer/checkbox の実装分析

#### 構造

```typescript
// node_modules/@inquirer/checkbox/dist/esm/index.js
export default createPrompt<Value[], CheckboxConfig<Value>>(
  (config, done) => {
    // 1. 設定とテーマの初期化
    const theme = makeTheme(checkboxTheme, config.theme);

    // 2. 状態管理
    const [status, setStatus] = useState('idle');
    const [items, setItems] = useState(normalizeChoices(config.choices));
    const [active, setActive] = useState(bounds.first);
    const [errorMsg, setError] = useState<string>();

    // 3. キーボードイベントハンドラ
    useKeypress(async (key) => {
      if (isEnterKey(key)) {
        // バリデーション実行
        const selection = items.filter(isChecked);
        const isValid = await validate([...selection]);
        if (isValid === true) {
          setStatus('done');
          done(selection.map(choice => choice.value));
        } else {
          setError(isValid || 'You must select a valid value');
        }
      } else if (isSpaceKey(key)) {
        // 選択状態をトグル
        setItems(items.map((choice, i) =>
          i === active ? toggle(choice) : choice
        ));
      } else if (isUpKey(key) || isDownKey(key)) {
        // カーソル移動
        // ...
      }
    });

    // 4. レンダリング
    const page = usePagination({
      items,
      active,
      renderItem({ item, isActive }) {
        // 各項目のレンダリングロジック
      },
      pageSize,
      loop,
    });

    // 5. 最終的な表示テキストを返す
    return `${prefix} ${message}\n${page}${error}`;
  }
);
```

#### 主要な実装パターン

1. **状態管理**: `useState`で複数の状態を管理（status, items, active, errorMsg）
2. **イベント処理**: `useKeypress`で全てのキーボードイベントを一箇所で処理
3. **バリデーション**: 非同期バリデーション関数をサポート、エラーメッセージを表示
4. **ページネーション**: `usePagination`で大量の選択肢を効率的に表示
5. **テーマ**: `makeTheme`でカスタマイズ可能なテーマシステム

### 4. 検索機能追加の実装難易度評価

#### 必要な変更点

1. **検索テキスト状態の追加**
   ```typescript
   const [searchText, setSearchText] = useState('');
   ```

2. **キーボードイベントハンドラの拡張**
   ```typescript
   useKeypress((key) => {
     if (key.name === 'backspace') {
       setSearchText(searchText.slice(0, -1));
     } else if (key.name && key.name.length === 1 && /[a-zA-Z0-9\/\-]/.test(key.name)) {
       setSearchText(searchText + key.name);
     }
     // ... 既存のハンドラ
   });
   ```

3. **フィルタリングロジックの追加**
   ```typescript
   const filteredItems = useMemo(() => {
     if (!searchText) return items;
     return items.filter(item =>
       !Separator.isSeparator(item) &&
       item.name.toLowerCase().includes(searchText.toLowerCase())
     );
   }, [items, searchText]);
   ```

4. **レンダリングの更新**
   ```typescript
   return `${prefix} ${message}\nSearch: ${searchText}\n${page}${error}`;
   ```

#### 実装難易度: ⭐⭐⭐☆☆ (中程度)

**理由**:
- ✅ `@inquirer/core`のフックAPIは直感的で、Reactの経験があれば理解しやすい
- ✅ `@inquirer/checkbox`の実装は明確で、拡張ポイントが分かりやすい
- ⚠️ キーボードイベント処理で、既存のショートカット（a, i）との競合を避ける必要あり
- ⚠️ フィルタリング後のカーソル位置管理（activeインデックス）の調整が必要

### 5. カスタムプロンプト実装の例

参考実装（簡易版）:

```typescript
import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  usePagination,
  useMemo,
  makeTheme,
  isUpKey,
  isDownKey,
  isSpaceKey,
  isEnterKey,
} from '@inquirer/core';

interface SearchableCheckboxConfig<Value> {
  message: string;
  choices: Choice<Value>[];
  validate?: (choices: Choice<Value>[]) => boolean | string | Promise<string | boolean>;
  pageSize?: number;
  loop?: boolean;
}

interface Choice<Value> {
  value: Value;
  name: string;
  checked?: boolean;
}

export default createPrompt<Value[], SearchableCheckboxConfig<Value>>(
  (config, done) => {
    const theme = makeTheme(/* ... */);
    const prefix = usePrefix({ status: 'idle', theme });

    // 状態管理
    const [searchText, setSearchText] = useState('');
    const [items, setItems] = useState(normalizeChoices(config.choices));
    const [active, setActive] = useState(0);
    const [errorMsg, setError] = useState<string>();

    // フィルタリング
    const filteredItems = useMemo(() => {
      if (!searchText) return items;
      return items.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }, [items, searchText]);

    // キーボードイベント
    useKeypress(async (key) => {
      // 文字入力: 検索テキストに追加
      if (key.name && /^[a-zA-Z0-9\/\-_]$/.test(key.name)) {
        setSearchText(searchText + key.name);
        setActive(0); // カーソルを先頭にリセット
      }
      // Backspace: 検索テキストから削除
      else if (key.name === 'backspace') {
        setSearchText(searchText.slice(0, -1));
        setActive(0);
      }
      // Enter: 選択確定
      else if (isEnterKey(key)) {
        const selection = items.filter(item => item.checked);
        const isValid = await config.validate?.(selection) ?? true;
        if (isValid === true) {
          done(selection.map(choice => choice.value));
        } else {
          setError(typeof isValid === 'string' ? isValid : 'Invalid selection');
        }
      }
      // Space: 選択トグル
      else if (isSpaceKey(key)) {
        const realIndex = items.findIndex(item =>
          item === filteredItems[active]
        );
        setItems(items.map((item, i) =>
          i === realIndex ? { ...item, checked: !item.checked } : item
        ));
      }
      // 矢印キー: カーソル移動
      else if (isUpKey(key)) {
        setActive(Math.max(0, active - 1));
      } else if (isDownKey(key)) {
        setActive(Math.min(filteredItems.length - 1, active + 1));
      }
    });

    // ページネーション
    const page = usePagination({
      items: filteredItems,
      active,
      renderItem({ item, isActive }) {
        const checkbox = item.checked ? '◉' : '◯';
        const cursor = isActive ? '❯' : ' ';
        return `${cursor}${checkbox} ${item.name}`;
      },
      pageSize: config.pageSize ?? 7,
      loop: config.loop ?? true,
    });

    // レンダリング
    const searchBar = searchText ? ` [Search: ${searchText}]` : '';
    let error = errorMsg ? `\n${errorMsg}` : '';

    return `${prefix} ${config.message}${searchBar}\n${page}${error}`;
  }
);
```

## Conclusion

### 実現可能性: ✅ 高い

`@inquirer/prompts`の`createPrompt` APIを使用して、検索可能なチェックボックスプロンプトを自作することは**十分に実現可能**です。

### 推奨アプローチ

1. **`@inquirer/checkbox`の実装を基に拡張**
   - 既存の`@inquirer/checkbox`のソースコードをコピー
   - 検索テキスト状態とフィルタリングロジックを追加
   - キーボードイベントハンドラを拡張

2. **新規ファイル作成**
   - `src/cli/prompts/searchable-checkbox.ts` を作成
   - `@inquirer/core`のみに依存（`@inquirer/checkbox`には依存しない）

3. **テスト戦略**
   - `@inquirer/checkbox`のテストパターンを参考
   - モックを使用してキーボードイベントをシミュレート

### Next Steps (Task 1.2)

以下の観点で技術的アプローチを決定：

1. **実装コスト**: 約200-300行のコード（`@inquirer/checkbox`は約200行）
2. **メンテナンス性**: `@inquirer/core` APIは安定しており、将来的な変更リスクは低い
3. **パフォーマンス**: `useMemo`でフィルタリング結果をメモ化し、100+プロジェクトでも高速
4. **ユーザー体験**: リアルタイム検索とチェックボックス選択の統合により、直感的なUI

**推奨**: Option B（`@inquirer/prompts`カスタムプロンプト自作）を採用

## References

- [@inquirer/core npm documentation](https://www.npmjs.com/package/@inquirer/core)
- [@inquirer/checkbox source code](node_modules/@inquirer/checkbox/dist/esm/index.js)
- [Inquirer.js GitHub - Custom Prompt Discussion](https://github.com/SBoudrias/Inquirer.js/discussions/1111)
- [inquirer-checkbox-plus-prompt reference implementation](https://github.com/faressoft/inquirer-checkbox-plus-prompt/blob/master/index.js)
