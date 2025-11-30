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
  theme?: PartialDeep<SearchableCheckboxTheme>;
}

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

export function filterChoices<Value>(
  items: NormalizedChoice<Value>[],
  searchText: string
): NormalizedChoice<Value>[] {
  if (!searchText) return items;

  return items.filter((item) => {
    
    if (Separator.isSeparator(item)) return false;

    const normalizedSearch = searchText.toLowerCase();
    const normalizedName = item.name.toLowerCase();

    return normalizedName.includes(normalizedSearch);
  });
}

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

export default function searchableCheckbox<Value>(
  config: SearchableCheckboxConfig<Value>
): Promise<Value[]> {
  return createPrompt<Value[], SearchableCheckboxConfig<Value>>(
    (config, done) => {
    
    const theme = makeTheme<SearchableCheckboxTheme>(checkboxTheme, config.theme);

    const [status, setStatus] = useState<'idle' | 'done'>('idle');

    const prefix = usePrefix({ status, theme });

    const [searchText, setSearchText] = useState<string>('');

    const [items, setItems] = useState<NormalizedChoice<Value>[]>(normalizeChoices(config.choices));

    const [active, setActive] = useState<number>(0);

    const [errorMsg, setError] = useState<string | undefined>(undefined);

    const firstRender = useRef(true);

    const filteredItems = useMemo(() => filterChoices(items, searchText), [items, searchText]);

    useKeypress(async (key, rl) => {
      
      if (key.name && /^[a-zA-Z0-9 \-_.]$/.test(key.name)) {
        setSearchText(searchText + key.name);
        setActive(0); 
        setError(undefined); 
        return;
      }

      if (!key.name && !key.ctrl && rl.line.length > 0) {
        
        const lastChar = rl.line[rl.line.length - 1];

        if (lastChar === '/') {
          setSearchText(searchText + lastChar);
          
          rl.line = '';
          setActive(0); 
          setError(undefined); 
          return;
        }
      }

      if (isBackspaceKey(key)) {
        if (searchText.length > 0) {
          setSearchText(searchText.slice(0, -1));
          setActive(0);
          setError(undefined);
        }
        return;
      }

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

      if (isSpaceKey(key)) {
        if (filteredItems.length === 0) return; 

        const currentFilteredItem = filteredItems[active];
        if (!currentFilteredItem) return; 

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

      if (key.name === 'escape') {
        throw new CancelPromptError();
      }
    });

    const message = chalk.bold(config.message);

    if (status === 'done') {
      const selection = items.filter((item) => !Separator.isSeparator(item) && item.checked);
      const answer = theme.style.answer(theme.style.renderSelectedChoices(selection, items));
      return `${prefix} ${message} ${answer}`;
    }

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

    const noResultsMsg =
      filteredItems.length === 0 && searchText
        ? `\n${chalk.dim('No matching items found')}`
        : '';

    const error = errorMsg ? `\n${theme.style.error(errorMsg)}` : '';

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
