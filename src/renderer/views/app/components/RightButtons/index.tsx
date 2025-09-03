import { observer } from 'mobx-react-lite';
import * as React from 'react';

import { ipcRenderer } from 'electron';

import { ToolbarButton } from '../ToolbarButton';

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

const RemovedActions = observer(({ onPresenceChange }: { onPresenceChange?: (present: boolean) => void }) => {
  const listRef = React.useRef<any>(null);

  if (store.isIncognito) {
    try { onPresenceChange?.(false); } catch {}
    return null;
  }

  if (process.env.ENABLE_EXTENSIONS) {
    const { selectedTabId } = store.tabs;
    const [present, setPresent] = React.useState(false);

    React.useEffect(() => {
      const el = listRef.current as HTMLElement | null;
      const RO = (window as any).ResizeObserver;
      const handle = () => {
        const isPresent = !!el && el.offsetWidth > 0;
        setPresent(isPresent);
        try { onPresenceChange?.(isPresent); } catch {}
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
      }

      return cleanup;
    }, [onPresenceChange, store.tabs.selectedTabId]);

    return (
      <ExtensionsWrapper present={present}>
        {React.createElement('browser-action-list', {
          id: 'actions',
          alignment: 'bottom right',
          partition: 'persist:view',
          tab: selectedTabId ?? undefined,
          ref: listRef,
        } as any)}
      </ExtensionsWrapper>
    );
  }

  const { selectedTabId } = store.tabs;
  const hasMv2 = !!selectedTabId && store.extensions.browserActions.some((x) => x.tabId === selectedTabId);
  React.useEffect(() => { try { onPresenceChange?.(hasMv2); } catch {} }, [hasMv2, onPresenceChange]);

  return <ExtensionsWrapper present={hasMv2}>{null}</ExtensionsWrapper>;
})

export const RightButtons = observer(() => {
  const buttonsRef = React.useRef<HTMLDivElement | null>(null);
  const [hasExtensionActions, setHasExtensionActions] = React.useState(false);
  React.useEffect(() => {

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

    update();

    window.addEventListener('resize', update);
    const onGeom = () => update();
    try {
      const wco: any = (navigator as any).windowControlsOverlay;
      if (wco && typeof wco.addEventListener === 'function') {
        wco.addEventListener('geometrychange', onGeom);
      }
    } catch {}

    const mo = new MutationObserver(() => update());
    if (buttonsRef.current) {
      mo.observe(buttonsRef.current, { childList: true, subtree: true, attributes: true });
      try {
        const ro = new (window as any).ResizeObserver(() => update());
        (ro as any).observe(buttonsRef.current);

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
      {}
      {store.isCompact && (
        <RemovedActions onPresenceChange={setHasExtensionActions} />
      )}
      {!store.isIncognito && !store.isCompact && (
        <>
          <RemovedActions onPresenceChange={setHasExtensionActions} />
          {}
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