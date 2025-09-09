import * as React from 'react';
import { observer } from 'mobx-react-lite';

import store from '../../store';
import { isURL } from '~/utils';
import { callViewMethod } from '~/utils/view';
import { ipcRenderer } from 'electron';
import { Menu, getCurrentWindow } from '@electron/remote';
import { ToolbarButton } from '../ToolbarButton';
import { StyledAddressBar, InputContainer, Input, Text, SecurityButton } from './style';
import { ICON_SEARCH, ICON_SECURE, ICON_NOT_SECURE, } from '~/renderer/constants';
import { SiteButtons } from '../SiteButtons';
import { DEFAULT_TITLEBAR_HEIGHT } from '~/constants/design';
import { NEWTAB_URL } from '~/constants/tabs';
import { WEBUI_BASE_URL } from '~/constants/files';

const onAddressBarContextMenu = (e: React.MouseEvent<HTMLElement>) => {
const PADDING = '\\u2003'.repeat(16);
  try {
    e.preventDefault();
    const inputEl = (e.currentTarget as HTMLElement).tagName === 'INPUT'
      ? (e.currentTarget as HTMLInputElement)
      : (document.querySelector('[data-addressbar-input="true"]') as HTMLInputElement) ||
        (store?.inputRef as HTMLInputElement);

    if (inputEl) inputEl.focus();

    const pad = '\u2003\u2003\u2003\u2003'; // em-spaces
    const template = [
      { label: 'Undo' + pad, role: 'undo', accelerator: process.platform === 'darwin' ? 'Cmd+Z' : 'Ctrl+Z' },
      { type: 'separator' },
      { label: 'Copy' + pad, role: 'copy', accelerator: process.platform === 'darwin' ? 'Cmd+C' : 'Ctrl+C' },
      { label: 'Paste' + pad, role: 'paste', accelerator: process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V' },
      { type: 'separator' },
      { label: 'Delete' + pad, role: 'delete', accelerator: process.platform === 'darwin' ? 'Fn+Delete' : 'Delete' },
      { type: 'separator' },
      { label: 'Select All' + pad, role: 'selectAll', accelerator: process.platform === 'darwin' ? 'Cmd+A' : 'Ctrl+A' },
      { type: 'separator' },
    ] as any;
    const menu = Menu.buildFromTemplate(template);
    if (typeof getCurrentWindow === 'function') {
      menu.popup({ window: getCurrentWindow() });
    } else {
      menu.popup();
    }
  } catch (err) {
    console.error('AddressBar context menu error:', err);
  }
};



let mouseUpped = false;

const onMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
  e.stopPropagation();

  if (!store.isCompact) return;

  store.addressbarTextVisible = false;
  store.addressbarFocused = true;
};

const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  store.addressbarTextVisible = false;
  store.addressbarFocused = true;

  if (store.tabs.selectedTab) {
    store.tabs.selectedTab.addressbarFocused = true;
  }

  if (store.isCompact) {

    e.currentTarget.select();
  }
};

const onSelect = (e: React.MouseEvent<HTMLInputElement>) => {
  if (store.tabs.selectedTab) {
    store.tabs.selectedTab.addressbarSelectionRange = [
      e.currentTarget.selectionStart,
      e.currentTarget.selectionEnd,
    ];
  }
};

const onMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
  if (
    !store.isCompact &&
    window.getSelection().toString().length === 0 &&
    !mouseUpped
  ) {
    e.currentTarget.select();
  }

  mouseUpped = true;
};

const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Escape' || e.key === 'Enter') {
    store.tabs.selectedTab.addressbarValue = null;
  }

  if (e.key === 'Escape') {
    const target = e.currentTarget;
    requestAnimationFrame(() => {
      target.select();
    });
  }

  if (e.key === 'Enter') {
    store.addressbarFocused = false;
    e.currentTarget.blur();
    const { value } = e.currentTarget;
    let url = value;

    if (isURL(value)) {
      url = value.indexOf('://') === -1 ? `http://${value}` : value;
    } else {
      url = store.settings.searchEngine.url.replace('%s', value);
    }

    store.tabs.selectedTab.addressbarValue = url;
    callViewMethod(store.tabs.selectedTabId, 'loadURL', url);
  }
};

let addressbarRef: HTMLDivElement;

const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  store.tabs.selectedTab.addressbarValue = e.currentTarget.value;

  const { left, width } = addressbarRef.getBoundingClientRect();

  if (e.currentTarget.value.trim() !== '') {
    ipcRenderer.send(`search-show-${store.windowId}`, {
      text: e.currentTarget.value,
      cursorPos: e.currentTarget.selectionStart,
      x: left,
      y: !store.isCompact ? DEFAULT_TITLEBAR_HEIGHT : 0,
      width: width,
    });
    store.addressbarEditing = true;
  }
};

const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
  window.getSelection().removeAllRanges();
  store.addressbarTextVisible = true;
  store.addressbarFocused = false;
  mouseUpped = false;

  const { selectedTab } = store.tabs;

  if (selectedTab) {
    selectedTab.addressbarFocused = false;
  }
};

export const AddressBar = observer(() => {
  const [appIconUrl, setAppIconUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const p = await ipcRenderer.invoke('get-app-icon-path');
      if (p) setAppIconUrl(p);
      } catch {}
    })();
  }, []);
  return (
    <StyledAddressBar onContextMenuCapture={onAddressBarContextMenu}
      ref={(r) => (addressbarRef = r)}
      focus={store.addressbarFocused}
    >

      {(() => {
        const tab = store.tabs.selectedTab;
        const url = tab?.url || '';
        const isNewTab = url.startsWith(NEWTAB_URL);
        const isInternal = !isNewTab && url.startsWith(WEBUI_BASE_URL);
        const isSecure = /^https:\/\//i.test(url);
        const isNotSecure = /^http:\/\//i.test(url) || (!isSecure && !isInternal && !!url);

        // TODO: (dialog) Later: open a dynamic security-chip + internal page indacation dialog from this button
        // const openSecurityChipDialog = async () => {
        //   try {
        //     await ipcRenderer.invoke('open-security-chip-dialog', {
        //       source: isInternal ? 'internal' : /^chrome-extension:\/\//i.test(url) ? 'extension' : 'other',
        //       url,
        //     });
        //   } catch (e) { /* swallow for now */ }
        // };

        const isExtension = /^chrome-extension:\/\//i.test(url);
        const isTrusted = isInternal || isExtension;


        if (isNewTab) {
          return (
            <ToolbarButton
              toggled={false}
              icon={ICON_SEARCH}
              size={16}
              dense
              iconStyle={{ transform: 'scale(-1,1)' }}
            />
          );
        }

        const expanded = isTrusted || isNotSecure;
        const danger = isNotSecure && !isTrusted;
        const icon = isTrusted ? (appIconUrl || ICON_SECURE) : (isSecure ? ICON_SECURE : ICON_NOT_SECURE);
        const label = isInternal ? 'Selenix' : isExtension ? 'Extension' : danger ? 'Not Secure' : '';

        return (
          <SecurityButton
            expanded={expanded}
            danger={danger}
            onClick={() => {}}
          >
<div
              className="icon"
              style={{
                backgroundImage: `url(${icon})`,
                filter: store.theme['toolbar.lightForeground'] && !danger && !isTrusted ? 'brightness(0) invert(1)' : 'none',
                marginLeft: (isSecure && !isInternal) ? '1.5px' : '-1px',
              }}
            />
            {expanded && <div className="label">{label}</div>}
          </SecurityButton>
        );
      })()}
    
      <InputContainer onContextMenuCapture={onAddressBarContextMenu}>
        <Input
          data-addressbar-input="true"
          onContextMenuCapture={onAddressBarContextMenu}
          ref={(r) => (store.inputRef = r)}
          spellCheck={false}
          onKeyDown={onKeyDown}
          onMouseDown={onMouseDown}
          onSelect={onSelect}
          onBlur={onBlur}
          onFocus={onFocus}
          onMouseUp={onMouseUp}
          onChange={onChange}
          placeholder="Search or type in a URL"
          visible={!store.addressbarTextVisible || store.addressbarValue === ''}
          value={store.addressbarValue}
        ></Input>
        <Text
          visible={store.addressbarTextVisible && store.addressbarValue !== ''}
        >
          {store.addressbarUrlSegments.map((item, key) => (
            <div
              key={key}
              style={{
                opacity: item.grayOut ? 0.54 : 1,
              }}
            >
              {item.value}
            </div>
          ))}
        </Text>
      </InputContainer>
      {!store.isCompact && <SiteButtons />}
    </StyledAddressBar>
  );
});