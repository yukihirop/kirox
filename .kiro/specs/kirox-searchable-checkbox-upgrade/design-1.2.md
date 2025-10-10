# Task 1.2 Design: Searchable Checkbox Prompt

**Date**: 2025-10-10
**Task**: 1.2 - 検索可能チェックボックスプロンプトの設計
**Status**: ✅ Completed

## Summary

タスク1.1の調査結果を基に、`@inquirer/prompts`の`createPrompt` APIを使用したカスタム検索可能チェックボックスプロンプトの詳細設計を策定しました。

## Architecture Mapping

### `inquirer-checkbox-plus-prompt`から`@inquirer/prompts`へのマッピング

| inquirer-checkbox-plus-prompt | @inquirer/prompts | 実装方法 |
|-------------------------------|-------------------|---------|
| `executeSource()` method | `useMemo` + filtering logic | フィルタリング結果をメモ化 |
| `value` / `checkedChoices` arrays | `useState` (items配列) | 選択状態を`checked`プロパティで管理 |
| `onKeypress()` handlers | `useKeypress` hook | 全キーボードイベントを単一フックで処理 |
| `render()` method | Return string from prompt function | レンダリング結果を文字列で返す |
| `toggleChoice()` method | 状態更新関数 | `setItems`で選択状態をトグル |
| Pagination | `usePagination` hook | 大量の選択肢を効率的に表示 |

## State Design

### 状態管理構造

```typescript
// 1. プロンプト状態
const [status, setStatus] = useState<'idle' | 'done'>('idle');

// 2. 検索テキスト（新規追加）
const [searchText, setSearchText] = useState<string>('');

// 3. 選択肢配列（checked状態を含む）
const [items, setItems] = useState<NormalizedChoice<Value>[]>(
  normalizeChoices(config.choices)
);

// 4. カーソル位置（フィルタリング済みリスト内のインデックス）
const [active, setActive] = useState<number>(0);

// 5. エラーメッセージ
const [errorMsg, setError] = useState<string | undefined>(undefined);

// 6. フィルタリング済み選択肢（計算済み状態）
const filteredItems = useMemo(() => {
  if (!searchText) return items;
  return items.filter(item =>
    !Separator.isSeparator(item) &&
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );
}, [items, searchText]);
```

### 状態遷移図

```
[初期状態]
  status: 'idle'
  searchText: ''
  items: normalizeChoices(config.choices)
  active: 0
  errorMsg: undefined

↓ ユーザーが文字入力

[検索中]
  searchText: 'lib/a' (更新)
  filteredItems: items.filter(...) (計算)
  active: 0 (リセット)

↓ ユーザーがSpaceキーを押す

[選択トグル]
  items: items.map(toggle) (更新)
  filteredItems: 再計算

↓ ユーザーがEnterキーを押す

[バリデーション実行]
  errorMsg: バリデーション結果に応じて設定

↓ バリデーション成功

[完了状態]
  status: 'done'
  done(selection.map(choice => choice.value)) 呼び出し
```

## Keyboard Event Handler Design

### イベント処理フロー

```typescript
useKeypress(async (key) => {
  // 優先度1: 文字入力（検索テキスト更新）
  if (key.name && /^[a-zA-Z0-9 \/\-_.]$/.test(key.name)) {
    setSearchText(searchText + key.name);
    setActive(0); // カーソルをリセット
    setError(undefined); // エラーをクリア
    return;
  }

  // 優先度2: Backspace/Delete（検索テキスト削除）
  if (key.name === 'backspace' || key.name === 'delete') {
    if (searchText.length > 0) {
      setSearchText(searchText.slice(0, -1));
      setActive(0);
      setError(undefined);
    }
    return;
  }

  // 優先度3: Enter（選択確定とバリデーション）
  if (isEnterKey(key)) {
    const selection = items.filter(item => !Separator.isSeparator(item) && item.checked);
    const isValid = await config.validate?.(selection) ?? true;

    if (isValid === true) {
      setStatus('done');
      done(selection.map(choice => choice.value));
    } else {
      setError(typeof isValid === 'string' ? isValid : 'Invalid selection');
    }
    return;
  }

  // 優先度4: Space（選択トグル）
  if (isSpaceKey(key)) {
    if (filteredItems.length === 0) return; // フィルタリング結果が0件の場合は何もしない

    const currentFilteredItem = filteredItems[active];
    const realIndex = items.findIndex(item => item === currentFilteredItem);

    if (realIndex !== -1) {
      setItems(items.map((item, i) =>
        i === realIndex ? { ...item, checked: !item.checked } : item
      ));
      setError(undefined);
    }
    return;
  }

  // 優先度5: 矢印キー（カーソル移動）
  if (isUpKey(key)) {
    const newActive = active > 0 ? active - 1 : (config.loop ? filteredItems.length - 1 : 0);
    setActive(newActive);
    return;
  }

  if (isDownKey(key)) {
    const newActive = active < filteredItems.length - 1 ? active + 1 : (config.loop ? 0 : active);
    setActive(newActive);
    return;
  }

  // 優先度6: Escape（キャンセル）
  if (key.name === 'escape') {
    throw new CancelPromptError();
  }
});
```

### キーボードイベント優先順位

1. **文字入力** (a-z, A-Z, 0-9, space, `/`, `-`, `_`, `.`): 検索テキスト更新
2. **Backspace/Delete**: 検索テキスト削除
3. **Enter**: 選択確定とバリデーション
4. **Space**: 選択トグル
5. **矢印キー (上/下)**: カーソル移動
6. **Escape**: プロンプトキャンセル

### ショートカットキーとの競合回避

- **`a` (select all)**: 削除（検索テキスト入力として扱う）
- **`i` (invert selection)**: 削除（検索テキスト入力として扱う）
- 理由: リアルタイム検索UIでは、ユーザーは文字入力を期待するため

## Filtering Logic Design

### フィルタリング実装

```typescript
const filteredItems = useMemo(() => {
  if (!searchText) return items;

  return items.filter(item => {
    // Separatorは常に除外
    if (Separator.isSeparator(item)) return false;

    // 大文字小文字を区別しない部分一致検索
    const normalizedSearch = searchText.toLowerCase();
    const normalizedName = item.name.toLowerCase();

    return normalizedName.includes(normalizedSearch);
  });
}, [items, searchText]);
```

### フィルタリング後のカーソル位置管理

```typescript
// 検索テキスト変更時: カーソルを先頭にリセット
if (key.name && /^[a-zA-Z0-9 \/\-_.]$/.test(key.name)) {
  setSearchText(searchText + key.name);
  setActive(0); // ← 重要: フィルタリング結果が変わるためリセット
}

// カーソル移動時: フィルタリング済みリストの範囲内に制限
if (isUpKey(key)) {
  const newActive = active > 0 ? active - 1 : (config.loop ? filteredItems.length - 1 : 0);
  setActive(newActive);
}
```

### 選択トグル時のインデックスマッピング

```typescript
// フィルタリング済みリストのインデックス → 元のリストのインデックス
const currentFilteredItem = filteredItems[active]; // フィルタリング済みリストから取得
const realIndex = items.findIndex(item => item === currentFilteredItem); // 元のリストで検索

if (realIndex !== -1) {
  setItems(items.map((item, i) =>
    i === realIndex ? { ...item, checked: !item.checked } : item
  ));
}
```

## Rendering Logic Design

### レンダリング構造

```typescript
// 1. ステータスが'done'の場合: 最終的な選択結果を表示
if (status === 'done') {
  const selection = items.filter(item => !Separator.isSeparator(item) && item.checked);
  const answer = theme.style.answer(
    theme.style.renderSelectedChoices(selection, items)
  );
  return `${prefix} ${message} ${answer}`;
}

// 2. ステータスが'idle'の場合: インタラクティブUI表示
const searchBar = searchText
  ? colors.dim(` (Search: "${searchText}")`)
  : '';

const page = usePagination({
  items: filteredItems,
  active,
  renderItem({ item, isActive }) {
    if (Separator.isSeparator(item)) {
      return ` ${item.separator}`;
    }

    const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked;
    const cursor = isActive ? theme.icon.cursor : ' ';
    const color = isActive ? theme.style.highlight : (x: string) => x;

    return color(`${cursor}${checkbox} ${item.name}`);
  },
  pageSize: config.pageSize ?? 7,
  loop: config.loop ?? true,
});

// フィルタリング結果が0件の場合のメッセージ
const noResultsMsg = filteredItems.length === 0 && searchText
  ? `\n${colors.dim('No matching projects found')}`
  : '';

// エラーメッセージ
const error = errorMsg ? `\n${theme.style.error(errorMsg)}` : '';

// ヘルプテキスト
const helpTip = theme.helpMode === 'auto'
  ? colors.dim('\n(Press space to select, enter to proceed)')
  : '';

return `${prefix} ${message}${searchBar}\n${page}${noResultsMsg}${error}${helpTip}${cursorHide}`;
```

### レンダリング要素

| 要素 | 表示条件 | スタイル | 説明 |
|------|---------|---------|------|
| プレフィックス | 常時 | `prefix` (? アイコン) | プロンプト識別子 |
| メッセージ | 常時 | `message` | "Select projects (type to filter):" |
| 検索バー | `searchText`が空でない | `colors.dim` | 現在の検索テキスト表示 |
| ページ | 常時 | `usePagination` | フィルタリング済みプロジェクトリスト |
| No results メッセージ | `filteredItems.length === 0 && searchText` | `colors.dim` | "No matching projects found" |
| エラーメッセージ | `errorMsg`が存在 | `theme.style.error` (赤色) | バリデーションエラー |
| ヘルプテキスト | `helpMode === 'auto'` | `colors.dim` | 操作説明 |
| カーソル非表示 | 常時 | `cursorHide` | ターミナルカーソルを非表示 |

## Type Definitions

### Config Interface

```typescript
import type { PartialDeep } from '@inquirer/type';
import { Separator, type Theme } from '@inquirer/core';

interface SearchableCheckboxTheme {
  icon: {
    checked: string;
    unchecked: string;
    cursor: string;
  };
  style: {
    disabledChoice: (text: string) => string;
    renderSelectedChoices: <T>(
      selectedChoices: ReadonlyArray<NormalizedChoice<T>>,
      allChoices: ReadonlyArray<NormalizedChoice<T> | Separator>
    ) => string;
    description: (text: string) => string;
    highlight: (text: string) => string;
  };
  helpMode: 'always' | 'never' | 'auto';
}

interface Choice<Value> {
  value: Value;
  name?: string;
  description?: string;
  short?: string;
  disabled?: boolean | string;
  checked?: boolean;
}

interface NormalizedChoice<Value> {
  value: Value;
  name: string;
  description?: string;
  short: string;
  disabled: boolean | string;
  checked: boolean;
}

interface SearchableCheckboxConfig<Value> {
  message: string;
  prefix?: string;
  pageSize?: number;
  instructions?: string | boolean;
  choices: readonly (string | Separator | Choice<Value>)[];
  loop?: boolean;
  required?: boolean;
  validate?: (
    choices: readonly NormalizedChoice<Value>[]
  ) => boolean | string | Promise<string | boolean>;
  theme?: PartialDeep<Theme<SearchableCheckboxTheme>>;
}
```

### Utility Functions

```typescript
// 選択肢の正規化
function normalizeChoices<Value>(
  choices: readonly (string | Separator | Choice<Value>)[]
): NormalizedChoice<Value>[] {
  return choices
    .filter(choice => !Separator.isSeparator(choice))
    .map(choice => {
      if (typeof choice === 'string') {
        return {
          value: choice as Value,
          name: choice,
          short: choice,
          disabled: false,
          checked: false,
        };
      }

      const name = choice.name ?? String(choice.value);
      const normalizedChoice: NormalizedChoice<Value> = {
        value: choice.value,
        name,
        short: choice.short ?? name,
        disabled: choice.disabled ?? false,
        checked: choice.checked ?? false,
      };

      if (choice.description) {
        normalizedChoice.description = choice.description;
      }

      return normalizedChoice;
    });
}

// 選択可能かどうかをチェック
function isSelectable<Value>(item: NormalizedChoice<Value> | Separator): boolean {
  return !Separator.isSeparator(item) && !item.disabled;
}
```

## Integration with Existing Code

### ProjectLocation to Choice Mapping

```typescript
// src/cli/searchable-project-prompt.ts の promptProjectSelection 関数内

import searchableCheckbox from './prompts/searchable-checkbox.js';
import type { ProjectLocation } from '../github/project-location-builder.js';

// ProjectLocation[] → Choice[]
const choices = projectLocations.map(location => ({
  value: location.displayName, // "lib/a/project-x" or "project-y"
  name: location.displayName,
  short: location.name, // "project-x" or "project-y"
  checked: false,
}));

// カスタムプロンプト呼び出し
const selectedDisplayNames = await searchableCheckbox<string>({
  message: 'Select projects (type to filter):',
  choices,
  loop: true,
  validate: (selectedChoices) => {
    // 既存のバリデーションロジック
    if (selectedChoices.length === 0) {
      return 'Please select at least one project';
    }

    const selectedProjects = selectedChoices.map(choice => {
      const location = projectLocations.find(p => p.displayName === choice.value);
      return location;
    }).filter((p): p is ProjectLocation => p !== undefined);

    const uniqueSubdirs = new Set(selectedProjects.map(p => p.subdir));

    if (uniqueSubdirs.size > 1) {
      const subdirList = Array.from(uniqueSubdirs)
        .map(s => (s === '' ? 'root' : s))
        .join(', ');
      return `All projects must be in the same subdirectory. Selected subdirectories: ${subdirList}`;
    }

    return true;
  },
});

// 選択結果 → ProjectSelectionResult
const selectedProjects = selectedDisplayNames
  .map(displayName => projectLocations.find(p => p.displayName === displayName))
  .filter((p): p is ProjectLocation => p !== undefined);

const subdir = selectedProjects[0]?.subdir ?? '';
const projects = selectedProjects.map(p => p.name);

return { projects, subdir };
```

## Performance Considerations

### Memoization Strategy

1. **フィルタリング結果のメモ化**
   - `useMemo`を使用して、`items`または`searchText`が変更された時のみ再計算
   - 100個のプロジェクトでも高速（O(n)の線形検索）

2. **レンダリング最適化**
   - `usePagination`が画面に表示される項目のみをレンダリング
   - 1000個のプロジェクトでも、pageSize=7であれば7項目のみレンダリング

### Performance Targets

| メトリクス | 目標値 | 実装方法 |
|-----------|--------|---------|
| フィルタリング時間 | < 100ms | `useMemo`でメモ化、O(n)フィルタリング |
| レンダリング時間 | < 50ms | `usePagination`でページネーション |
| キー入力レスポンス | < 50ms | 状態更新のみ、再レンダリングは自動 |
| 検索入力頻度対応 | 10回/秒 | デバウンスなし（React風フックが自動処理） |

## Validation Strategy

### Validation Function Design

```typescript
type ValidateFunction<Value> = (
  choices: readonly NormalizedChoice<Value>[]
) => boolean | string | Promise<string | boolean>;

// promptProjectSelection内で定義
const validate: ValidateFunction<string> = (selectedChoices) => {
  // ルール1: 最低1つのプロジェクトが選択されている
  if (selectedChoices.length === 0) {
    return 'Please select at least one project';
  }

  // ルール2: 全てのプロジェクトが同じサブディレクトリに属する
  const selectedProjects = selectedChoices
    .map(choice => projectLocations.find(p => p.displayName === choice.value))
    .filter((p): p is ProjectLocation => p !== undefined);

  const uniqueSubdirs = new Set(selectedProjects.map(p => p.subdir));

  if (uniqueSubdirs.size > 1) {
    const subdirList = Array.from(uniqueSubdirs)
      .map(s => (s === '' ? 'root' : s))
      .join(', ');
    return `All projects must be in the same subdirectory. Selected subdirectories: ${subdirList}`;
  }

  return true; // バリデーション成功
};
```

### Error Display

- バリデーションエラーは`setError()`で設定
- レンダリング時に`theme.style.error()`で赤色表示
- ユーザーは選択を修正し、Enterキーを再度押すことで再バリデーション

## Migration Path

### Phase 1: Implementation (Task 2.1-2.6)

1. Create `src/cli/prompts/searchable-checkbox.ts`
2. Implement core logic with `createPrompt`
3. Implement state management, keyboard handlers, filtering, rendering

### Phase 2: Integration (Task 3.1-3.3)

1. Modify `src/cli/searchable-project-prompt.ts`
2. Replace `search` + `checkbox` with `searchableCheckbox`
3. Remove `__select_multiple__` logic

### Phase 3: Testing (Task 6.1-6.5)

1. Create `tests/unit/cli/prompts/searchable-checkbox.test.ts`
2. Update `tests/unit/cli/searchable-project-prompt.test.ts`
3. Run integration and E2E tests

## Conclusion

### Design Summary

- **State Management**: 5つの状態（status, searchText, items, active, errorMsg）+ 1つの計算済み状態（filteredItems）
- **Keyboard Events**: 6種類のイベント（文字入力、Backspace、Enter、Space、矢印キー、Escape）
- **Filtering**: `useMemo`でメモ化、大文字小文字を区別しない部分一致検索
- **Rendering**: `usePagination`でページネーション、検索バー、エラーメッセージ、ヘルプテキスト
- **Validation**: 非同期バリデーション関数、エラーメッセージ表示

### Implementation Readiness: ✅

設計が完了し、実装準備が整いました。次のタスク（1.3、2.1-2.6）で実装を開始できます。

## References

- Task 1.1 Investigation: `investigation-1.1.md`
- [@inquirer/checkbox source code](node_modules/@inquirer/checkbox/dist/esm/index.js)
- [inquirer-checkbox-plus-prompt implementation](https://github.com/faressoft/inquirer-checkbox-plus-prompt/blob/master/index.js)
