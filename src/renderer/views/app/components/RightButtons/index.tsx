import { observer } from 'mobx-react-lite';
import * as React from 'react';
// Bring in ipcRenderer from electron and remote from @electron/remote.
import { ipcRenderer } from 'electron';

import { ToolbarButton } from '../ToolbarButton';
// REMOVED (renderer browseraction/popup): import {null} from '..//* RemovedAction removed */';
import {
  ICON_SHIELD,
  ICON_DOWNLOAD,
  ICON_INCOGNITO,
  ICON_MORE,
} from '~/renderer/constants/icons';
import { Buttons, Separator, ExtensionsWrapper } from './style';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;
import store from '../../store';
import { SiteButtons } from '../SiteButtons';

let menuRef: HTMLDivElement = null;

const onDownloadsClick = async (e: React.MouseEvent<HTMLDivElement>) => {
  const { right, bottom } = e.currentTarget.getBoundingClientRect();
  store.downloadNotification = false;
  ipcRenderer.send(`show-downloads-dialog-${store.windowId}`, right, bottom);
};

const showMenuDialog = async () => {
  const { right, bottom } = menuRef.getBoundingClientRect();
  ipcRenderer.send(`show-menu-dialog-${store.windowId}`, right, bottom);
};

ipcRenderer.on('show-menu-dialog', () => {
  showMenuDialog();
});

const onMenuClick = async () => {
  showMenuDialog();
};

// Display extension browser action icons using one of two mechanisms:
// When Electron Chrome Extensions (MV3) support is enabled, render the
// native <browser-action-list> element provided by the library. This
// custom element manages its own layout and updates in response to
// extension state changes. Otherwise fall back to the legacy
// RemovedActions component which relies on store-managed state.
const RemovedActions = observer(({ onPresenceChange }: { onPresenceChange?: (present: boolean) => void }) => {
  const listRef = React.useRef<any>(null);
  const [present, setPresent] = React.useState(false);

  // When MV3 extensions are enabled, use the <browser-action-list> custom element
  // provided by electron-chrome-extensions. This element manages its own state
  // internally and will update whenever the active tab changes. Note that the
  // element requires a partition corresponding to the session where extensions
  // are loaded ("persist:view" in Selenix) and the current tab ID to map actions
  // to the correct webContents. Without these attributes, the element will
  // attempt to query actions from the session of the WebUI, which has none.
  if (process.env.ENABLE_EXTENSIONS) {
    const { selectedTabId } = store.tabs
    React.useEffect(() => {
      const el = listRef.current as HTMLElement | null;
      const RO = (window as any).ResizeObserver;
      const handle = () => {
        const isPresent = (el && el.offsetWidth ? el.offsetWidth : 0) > 0;
        setPresent(isPresent);
        onPresenceChange?.(isPresent);
      };
      let cleanup: (() => void) | undefined;
      if (el) {
        handle();
        if (RO) {
          const ro = new RO(handle);
          ro.observe(el);
          cleanup = () => ro.disconnect();
        } else {
          const id = window.setInterval(handle, 300);
          cleanup = () => window.clearInterval(id);
        }
      } else {
        handle();
      }
      return cleanup;
    }, [onPresenceChange, store.tabs.selectedTabId]);
    // Use React.createElement to avoid JSX complaining about unknown intrinsic element.
    return (
      <ExtensionsWrapper present={present}>
        {React.createElement('browser-action-list', {
id: 'actions',
        alignment: 'bottom right',
        // Specify the session partition where MV3 extensions are loaded. In Selenix
        // this corresponds to the view session named "persist:view". Without
        // explicitly setting this, the list will default to the WebUI session and
        // will not display any icons.
        partition: 'persist:view',
        // Pass the current tab's webContents ID. This ensures the list reflects
        // the browser actions for the selected tab. When the selected tab
        // changes, MobX will re-render this component and update the attribute.
        tab: selectedTabId ?? undefined,
ref: listRef,
} as any)}
      </ExtensionsWrapper>
    )
  }

  // Fallback to MV2-style icons for legacy extensions. These are stored in
  // store.extensions.browserActions and keyed by tab ID.
  const { selectedTabId } = store.tabs
  const hasMv2 = !!selectedTabId && store.extensions.browserActions.some((x) => x.tabId === selectedTabId);
  React.useEffect(() => { onPresenceChange?.(hasMv2); }, [hasMv2, onPresenceChange]);
  return (
    <ExtensionsWrapper present={hasMv2}>
      {null}
    </ExtensionsWrapper>
  )
})

export const RightButtons = observer(() => {
  const buttonsRef = React.useRef<HTMLDivElement | null>(null);
  const [hasExtensionActions, setHasExtensionActions] = React.useState(false);
  React.useEffect(() => {
    // When the presence of extension actions changes (MV2/3), force a re-measure.
    const el = buttonsRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    document.documentElement.style.setProperty('--right-buttons-width', `${w}px`);
  }, [hasExtensionActions, store.extensions.browserActions.length, store.tabs.selectedTabId]);


  useIsomorphicLayoutEffect(() => {
    const update = () => {
      const w = buttonsRef.current ? buttonsRef.current.offsetWidth : 0;
      document.documentElement.style.setProperty('--right-buttons-width', `${w}px`);
    };

    // Initial
    update();

    // Recalc on window size and overlay geometry changes
    window.addEventListener('resize', update);
    const onGeom = () => update();
    try {
      const wco: any = (navigator as any).windowControlsOverlay;
      if (wco && typeof wco.addEventListener === 'function') {
        wco.addEventListener('geometrychange', onGeom);
      }
    } catch {}

    // Recalc on DOM changes (extension icons appearing/disappearing)
    const mo = new MutationObserver(() => update());
    if (buttonsRef.current) {
      mo.observe(buttonsRef.current, { childList: true, subtree: true, attributes: true });
      try {
        const ro = new (window as any).ResizeObserver(() => update());
        (ro as any).observe(buttonsRef.current);
        // Save on ref for cleanup
        (buttonsRef.current as any).__rb_ro = ro;
      } catch {}
    }

    return () => {
      window.removeEventListener('resize', update);
      try {
        const wco: any = (navigator as any).windowControlsOverlay;
        if (wco && typeof wco.removeEventListener === 'function') {
          wco.removeEventListener('geometrychange', onGeom);
        }
      } catch {}
      mo.disconnect();
      try {
        const el: any = buttonsRef.current;
        const ro = el && el.__rb_ro;
        if (ro && ro.disconnect) ro.disconnect();
      } catch {}
    };
  }, [store.isCompact]);

  return (
    <Buttons ref={buttonsRef}>
      {/* Compact mode: show BrowserAction icons as well (no separator) */}
      {store.isCompact && (
        <RemovedActions onPresenceChange={setHasExtensionActions} />
      )}
      {!store.isCompact && (
        <>
          <RemovedActions onPresenceChange={setHasExtensionActions} />
          {/*
            Display a separator whenever extensions are enabled. For MV2 extensions,
            we previously checked browserActions.length. For MV3 extensions, there
            is no easy way to detect whether any actions are currently shown, so
            we optimistically render a separator whenever the feature is enabled.
          */}
          {hasExtensionActions || store.extensions.browserActions.length > 0 ? (
            <Separator />
          ) : null}
        </>
      )}
      {store.isCompact && (
        <>
          <SiteButtons />
          <Separator />
        </>
      )}

      {store.downloadsButtonVisible && (
        <ToolbarButton
          size={18}
          badge={store.downloadNotification}
          onMouseDown={onDownloadsClick}
          toggled={store.dialogsVisibility['downloads-dialog']}
          icon={ICON_DOWNLOAD}
          badgeTop={9}
          badgeRight={9}
          preloader
          value={store.downloadProgress}
        ></ToolbarButton>
      )}
      {store.isIncognito && <ToolbarButton icon={ICON_INCOGNITO} size={18} />}
      <ToolbarButton
        divRef={(r) => (menuRef = r)}
        toggled={store.dialogsVisibility['menu']}
        badge={store.updateAvailable}
        badgeRight={10}
        badgeTop={6}
        onMouseDown={onMenuClick}
        icon={ICON_MORE}
        size={18}
      />
    </Buttons>
  );
});