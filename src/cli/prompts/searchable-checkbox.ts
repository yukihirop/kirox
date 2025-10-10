/**
 * Searchable Checkbox Custom Prompt
 *
 * A custom @inquirer/prompts implementation that combines real-time search filtering
 * with checkbox selection in a single step UI.
 *
 * Based on design: .kiro/specs/kirox-searchable-checkbox-upgrade/design-1.2.md
 */

import {
  createPrompt,
  useState,
  useKeypress,
  useMemo,
  useRef,
  usePagination,
  makeTheme,
  usePrefix,
  Separator,
  isEnterKey,
  isSpaceKey,
  isUpKey,
  isDownKey,
  isBackspaceKey,
  CancelPromptError,
} from '@inquirer/core';
import type { PartialDeep } from '@inquirer/type';
import { cursorHide } from '@inquirer/ansi';
import figures from '@inquirer/figures';
import chalk from 'chalk';

/**
 * Theme customization for searchable checkbox
 */
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
    answer: (text: string) => string;
    error: (text: string) => string;
  };
  helpMode: 'always' | 'never' | 'auto';
}

/**
 * Choice definition for searchable checkbox
 */
interface Choice<Value> {
  value: Value;
  name?: string;
  description?: string;
  short?: string;
  disabled?: boolean | string;
  checked?: boolean;
}

/**
 * Normalized choice with all properties defined
 */
interface NormalizedChoice<Value> {
  value: Value;
  name: string;
  description?: string;
  short: string;
  disabled: boolean | string;
  checked: boolean;
}

/**
 * Configuration for searchable checkbox prompt
 */
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
  theme?: PartialDeep<SearchableCheckboxTheme>;
}

/**
 * Normalize choice input to NormalizedChoice format
 */
function normalizeChoices<Value>(
  choices: readonly (string | Separator | Choice<Value>)[]
): NormalizedChoice<Value>[] {
  return choices
    .filter((choice): choice is string | Choice<Value> => !Separator.isSeparator(choice))
    .map((choice) => {
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

/**
 * Filter choices based on search text
 *
 * @param items - Normalized choices to filter
 * @param searchText - Search query (case-insensitive partial match)
 * @returns Filtered choices matching the search text
 *
 * @internal Exported for testing purposes
 */
export function filterChoices<Value>(
  items: NormalizedChoice<Value>[],
  searchText: string
): NormalizedChoice<Value>[] {
  if (!searchText) return items;

  return items.filter((item) => {
    // Skip separators (though normalizeChoices already removes them)
    if (Separator.isSeparator(item)) return false;

    // Case-insensitive partial match on name
    const normalizedSearch = searchText.toLowerCase();
    const normalizedName = item.name.toLowerCase();

    return normalizedName.includes(normalizedSearch);
  });
}

/**
 * Default theme for searchable checkbox
 */
const checkboxTheme: SearchableCheckboxTheme = {
  icon: {
    checked: chalk.green(figures.circleFilled),
    unchecked: figures.circle,
    cursor: chalk.cyan(figures.pointer),
  },
  style: {
    disabledChoice: (text: string) => chalk.dim(`- ${text}`),
    renderSelectedChoices: <T>(selectedChoices: ReadonlyArray<NormalizedChoice<T>>) =>
      selectedChoices.map((choice) => choice.short).join(', '),
    description: (text: string) => chalk.cyan(text),
    highlight: (text: string) => chalk.cyan(text),
    answer: (text: string) => chalk.cyan(text),
    error: (text: string) => chalk.red(`> ${text}`),
  },
  helpMode: 'auto',
};

/**
 * Searchable Checkbox Prompt
 *
 * Allows users to search and select multiple items in a single step.
 */
export default function searchableCheckbox<Value>(
  config: SearchableCheckboxConfig<Value>
): Promise<Value[]> {
  return createPrompt<Value[], SearchableCheckboxConfig<Value>>(
    (config, done) => {
    // Initialize theme
    const theme = makeTheme<SearchableCheckboxTheme>(checkboxTheme, config.theme);
    const prefix = usePrefix({ theme });

    // State: Prompt status
    const [status, setStatus] = useState<'idle' | 'done'>('idle');

    // State: Search text for filtering
    const [searchText, setSearchText] = useState<string>('');

    // State: Items with selection state
    const [items, setItems] = useState<NormalizedChoice<Value>[]>(normalizeChoices(config.choices));

    // State: Active cursor position (index in filtered list)
    const [active, setActive] = useState<number>(0);

    // State: Error message from validation
    const [errorMsg, setError] = useState<string | undefined>(undefined);

    // Track first render for cursor hide
    const firstRender = useRef(true);

    // Computed: Filtered items based on search text
    const filteredItems = useMemo(() => filterChoices(items, searchText), [items, searchText]);

    // Keyboard event handler
    useKeypress(async (key, rl) => {
      // Priority 1: Character input (update search text)
      // Handle normal alphanumeric characters via key.name
      if (key.name && /^[a-zA-Z0-9 \-_.]$/.test(key.name)) {
        setSearchText(searchText + key.name);
        setActive(0); // Reset cursor to top
        setError(undefined); // Clear error
        return;
      }

      // Special case: "/" key has no key.name property in some terminals
      // We need to check the readline buffer to detect it
      // When "/" is pressed, it gets added to rl.line but key.name is undefined
      if (!key.name && !key.ctrl && rl.line.length > 0) {
        // Check if a new character was added to readline buffer
        const lastChar = rl.line[rl.line.length - 1];

        // Only accept "/" character (and potentially other special chars in the future)
        if (lastChar === '/') {
          setSearchText(searchText + lastChar);
          // Clear readline buffer to prevent it from interfering with our state
          rl.line = '';
          setActive(0); // Reset cursor to top
          setError(undefined); // Clear error
          return;
        }
      }

      // Priority 2: Backspace/Delete (remove from search text)
      if (isBackspaceKey(key)) {
        if (searchText.length > 0) {
          setSearchText(searchText.slice(0, -1));
          setActive(0);
          setError(undefined);
        }
        return;
      }

      // Priority 3: Enter (confirm selection with validation)
      if (isEnterKey(key)) {
        const selection = items.filter((item) => !Separator.isSeparator(item) && item.checked);
        const isValid = config.validate ? await config.validate(selection) : true;

        if (isValid === true) {
          setStatus('done');
          done(selection.map((choice) => choice.value));
        } else {
          setError(typeof isValid === 'string' ? isValid : 'Invalid selection');
        }
        return;
      }

      // Priority 4: Space (toggle selection)
      if (isSpaceKey(key)) {
        if (filteredItems.length === 0) return; // No items to toggle

        const currentFilteredItem = filteredItems[active];
        if (!currentFilteredItem) return; // Safety check

        const realIndex = items.findIndex((item) => item === currentFilteredItem);

        if (realIndex !== -1 && !currentFilteredItem.disabled) {
          setItems(
            items.map((item, i) =>
              i === realIndex ? { ...item, checked: !item.checked } : item
            )
          );
          setError(undefined);
        }
        return;
      }

      // Priority 5: Arrow keys (cursor movement)
      if (isUpKey(key)) {
        const newActive = active > 0 ? active - 1 : config.loop ? filteredItems.length - 1 : 0;
        setActive(newActive);
        return;
      }

      if (isDownKey(key)) {
        const newActive =
          active < filteredItems.length - 1 ? active + 1 : config.loop ? 0 : active;
        setActive(newActive);
        return;
      }

      // Priority 6: Escape (cancel)
      if (key.name === 'escape') {
        throw new CancelPromptError();
      }
    });

    // Rendering: Final answer (done state)
    const message = chalk.bold(config.message);

    if (status === 'done') {
      const selection = items.filter((item) => !Separator.isSeparator(item) && item.checked);
      const answer = theme.style.answer(theme.style.renderSelectedChoices(selection, items));
      return `${prefix} ${message} ${answer}`;
    }

    // Rendering: Interactive UI (idle state)
    const searchBar = searchText ? chalk.dim(` (Search: "${searchText}")`) : '';

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

        if (item.disabled) {
          return theme.style.disabledChoice(item.name);
        }

        return color(`${cursor}${checkbox} ${item.name}`);
      },
      pageSize: config.pageSize ?? 7,
      loop: config.loop ?? true,
    });

    // No results message
    const noResultsMsg =
      filteredItems.length === 0 && searchText
        ? `\n${chalk.dim('No matching items found')}`
        : '';

    // Error message
    const error = errorMsg ? `\n${theme.style.error(errorMsg)}` : '';

    // Help text
    const helpTip =
      theme.helpMode === 'auto'
        ? chalk.dim('\n(Press space to select, enter to proceed)')
        : '';

    if (firstRender.current) {
      firstRender.current = false;
    }

    return `${prefix} ${message}${searchBar}\n${page}${noResultsMsg}${error}${helpTip}${cursorHide}`;
  })(config);
}
