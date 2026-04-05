import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { ThemeProvider } from 'styled-components';

import { StyledApp, Input, CurrentIcon, SearchBox } from './style';
import store from '../../store';
import { callViewMethod } from '~/utils/view';
import { ipcRenderer } from 'electron';
import { Suggestions } from '../Suggestions';
import { ICON_SEARCH, ICON_PAGE } from '~/renderer/constants';
import { UIStyle } from '~/renderer/mixins/default-styles';
import { COMPACT_TITLEBAR_HEIGHT, TOOLBAR_HEIGHT } from '~/constants/design';
import { resolveFaviconUrl } from '~/utils/favicon';

const onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.which === 13) {
    e.preventDefault();

    const text = e.currentTarget.value;
    let url = text;

    const suggestion = store.suggestions.selectedSuggestion;

    if (suggestion) {
      if (suggestion.isSearch) {
        url = store.searchEngine.url.replace('%s', text);
      } else if (text.indexOf('://') === -1) {
        url = `http://${text}`;
      }
    }

    e.currentTarget.value = url;

    // Handle calculator quick action: copy result to clipboard and close
    if (url && url.startsWith('calc:')) {
      const value = decodeURIComponent(url.slice(5));
      if (navigator && navigator.clipboard) {
        navigator.clipboard.writeText(value).catch(() => {});
      }
      store.hide();
      return;
    }
    callViewMethod(store.tabId, 'loadURL', url);

    store.hide();
  }
};

const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const { suggestions } = store;
  const { list } = suggestions;
  const input = store.inputRef.current;

  store.canSuggest = store.getCanSuggest(e.keyCode);

  if (e.key === 'Escape') {
    store.hide({ focus: true, escape: true });
  } else if (e.keyCode === 38 || e.keyCode === 40) {
    e.preventDefault();
    if (
      e.keyCode === 40 &&
      suggestions.selected + 1 <= list.length - 1 + store.searchedTabs.length
    ) {
      suggestions.selected++;
    } else if (e.keyCode === 38 && suggestions.selected - 1 >= 0) {
      suggestions.selected--;
    }

    let suggestion = list.find((x) => x.id === suggestions.selected);

    if (!suggestion) {
      suggestion = store.searchedTabs.find(
        (x) => x.id === suggestions.selected,
      );
    }

    input.value = suggestion.isSearch ? suggestion.primaryText : suggestion.url;
  }
};

const onInput = (e: React.FormEvent<HTMLInputElement>) => {
  store.inputText = e.currentTarget.value;

  if (e.currentTarget.value.trim() === '') {
    store.hide({ focus: true });
  }

  store.suggest();
};

export const App = observer(() => {
  const suggestionsVisible = store.suggestions.list.length !== 0;
  const hasSideTabs =
    store.settings.leftDockTabs && store.settings.topBarVariant !== 'compact';

  let height = 0;

  if (suggestionsVisible) {
    height = store.suggestions.list.length * 38;
  }

  requestAnimationFrame(() => {
    ipcRenderer.send(`height-${store.id}`, height);
  });

  const suggestion = store.suggestions.selectedSuggestion;
  let favicon = ICON_SEARCH;
  let customIcon = true;

  if (suggestion && suggestionsVisible) {
    favicon = suggestion.favicon;
    customIcon = false;
    const resolvedSuggestionFavicon = resolveFaviconUrl(
      favicon,
      undefined,
      suggestion.url,
    );

    if (suggestion.isSearch) {
      favicon = store.searchEngine.icon;
    } else if (
      (resolvedSuggestionFavicon || favicon) == null ||
      (resolvedSuggestionFavicon || favicon).trim() === '' ||
      favicon === ICON_PAGE
    ) {
      favicon = ICON_PAGE;
      customIcon = true;
    } else {
      favicon = resolvedSuggestionFavicon || favicon;
    }
  }

  return (
    <ThemeProvider
      theme={{
        ...store.theme,
        searchBoxHeight:
          store.settings.topBarVariant === 'compact'
            ? COMPACT_TITLEBAR_HEIGHT
            : TOOLBAR_HEIGHT - 1,
      }}
    >
      <StyledApp
        style={hasSideTabs ? { transform: 'translateY(-0.1px)' } : undefined}
      >
        <UIStyle />
        <SearchBox>
          <CurrentIcon
            style={{
              backgroundImage: `url(${favicon})`,
              filter:
                customIcon && store.theme['dialog.lightForeground']
                  ? 'invert(100%)'
                  : 'none',
              opacity: customIcon ? 0.54 : 1,
            }}
          ></CurrentIcon>
          <Input
            onKeyDown={onKeyDown}
            onInput={onInput}
            ref={store.inputRef}
            onKeyPress={onKeyPress}
          ></Input>
        </SearchBox>
        <Suggestions visible={suggestionsVisible}></Suggestions>
      </StyledApp>
    </ThemeProvider>
  );
});
