import { contextBridge, ipcRenderer, webFrame } from 'electron';

import AutoComplete from './models/auto-complete';
import { ERROR_PROTOCOL, WEBUI_BASE_URL } from '~/constants/files';
import { injectChromeWebstoreInstallButton } from './chrome-webstore';

// IMPORTANT: do NOT expose ipcRenderer directly to the page. We wrap only what we need.

/* ---------- IDs ---------- */

const tabId: number = ipcRenderer.sendSync('get-webcontents-id');
export const windowId: number = ipcRenderer.sendSync('get-window-id');

/* ---------- Navigation helpers ---------- */

const goBack = () => {
  ipcRenderer.invoke('web-contents-call', { webContentsId: tabId, method: 'goBack' });
};

const goForward = () => {
  ipcRenderer.invoke('web-contents-call', { webContentsId: tabId, method: 'goForward' });
};

/* ---------- Mouse buttons: X1/X2 back/forward ---------- */

window.addEventListener('mouseup', (e) => {
  if (e.button === 3) {
    e.preventDefault();
    goBack();
  } else if (e.button === 4) {
    e.preventDefault();
    goForward();
  }
});

/* ---------- Horizontal swipe back/forward (trackpads, etc.) ---------- */

let beginningScrollLeft: number = null;
let beginningScrollRight: number = null;
let horizontalMouseMove = 0;
let verticalMouseMove = 0;

const resetCounters = () => {
  beginningScrollLeft = null;
  beginningScrollRight = null;
  horizontalMouseMove = 0;
  verticalMouseMove = 0;
};

function getScrollStartPoint(x: number, y: number) {
  let left = 0;
  let right = 0;

  let n = document.elementFromPoint(x, y);

  while (n) {
    // @ts-ignore: element may not have scrollLeft
    if ((n as any).scrollLeft !== undefined) {
      const el = n as any;
      left = Math.max(left, el.scrollLeft);
      right = Math.max(right, el.scrollWidth - el.clientWidth - el.scrollLeft);
    }
    n = (n as HTMLElement).parentElement;
  }
  return { left, right };
}

document.addEventListener('wheel', (e) => {
  verticalMouseMove += e.deltaY;
  horizontalMouseMove += e.deltaX;

  if (beginningScrollLeft === null || beginningScrollRight === null) {
    const result = getScrollStartPoint(e.deltaX, e.deltaY);
    beginningScrollLeft = result.left;
    beginningScrollRight = result.right;
  }
});

ipcRenderer.on('scroll-touch-end', () => {
  if (
    horizontalMouseMove - beginningScrollRight > 150 &&
    Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5
  ) {
    if (beginningScrollRight < 10) goForward();
  }

  if (
    horizontalMouseMove + beginningScrollLeft < -150 &&
    Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5
  ) {
    if (beginningScrollLeft < 10) goBack();
  }

  resetCounters();
});

/* ---------- Autofill hooks (kept as-is) ---------- */

if (process.env.ENABLE_AUTOFILL) {
  window.addEventListener('load', AutoComplete.loadForms);
  window.addEventListener('mousedown', AutoComplete.onWindowMouseDown);
}

/* ---------- WebUI helpers & messaging ---------- */

const postMsg = (data: any, res: any) => {
  window.postMessage(
    {
      id: data.id,
      result: res,
      type: 'result',
    },
    '*',
  );
};

const hostname = window.location.href.substr(WEBUI_BASE_URL.length);

/* ---------- Chrome Web Store button injection ---------- */

if (process.env.ENABLE_EXTENSIONS && window.location.host === 'chrome.google.com') {
  injectChromeWebstoreInstallButton();
}

/* ---------- Settings bootstrap ---------- */

const settings = ipcRenderer.sendSync('get-settings-sync');

/**
 * IMPORTANT:
 * With contextIsolation on, do not try to give the page raw ipcRenderer.
 * Instead we expose exactly what internal pages need via contextBridge.
 *
 * We still keep postMessage-based RPC for storage/credentials like you had.
 */

/* ---------- Expose safe API to the main world ---------- */

contextBridge.exposeInMainWorld('electron', {
  // Expose only IPC methods you actually need on the page side
  ipc: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) =>
      ipcRenderer.on(channel, (_e, ...rest) => listener(...rest)),
    once: (channel: string, listener: (...args: any[]) => void) =>
      ipcRenderer.once(channel, (_e, ...rest) => listener(...rest)),
    removeListener: (channel: string, listener: (...args: any[]) => void) =>
      ipcRenderer.removeListener(channel, listener),
  },
});

// Back-compat: many of the internal pages referenced window.settings directly.
contextBridge.exposeInMainWorld('settings', settings);

// Basic window info + navigation
contextBridge.exposeInMainWorld('viewControls', {
  windowId,
  tabId,
  goBack,
  goForward,
});

// WebUI utilities that internal pages previously got via executeJavaScript
contextBridge.exposeInMainWorld('webui', {
  isInternal: window.location.href.startsWith(WEBUI_BASE_URL),
  isErrorPage: window.location.protocol === `${ERROR_PROTOCOL}:`,
  getErrorURL: async () => ipcRenderer.invoke(`get-error-url-${tabId}`),
  getHistory: async () => ipcRenderer.invoke('history-get'),
  removeHistory: (ids: string[]) => ipcRenderer.send('history-remove', ids),
  getTopSites: async (count: number) => ipcRenderer.invoke('topsites-get', count),
});

// If you still have code that expects window.require('electron') for a tiny subset,
// you can expose a minimal shim. This avoids exposing the real ipcRenderer.
contextBridge.exposeInMainWorld('require', (id: string) => {
  if (id === 'electron') {
    return {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
        send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
        on: (channel: string, listener: (...args: any[]) => void) =>
          ipcRenderer.on(channel, (_e, ...rest) => listener(...rest)),
        once: (channel: string, listener: (...args: any[]) => void) =>
          ipcRenderer.once(channel, (_e, ...rest) => listener(...rest)),
        removeListener: (channel: string, listener: (...args: any[]) => void) =>
          ipcRenderer.removeListener(channel, listener),
      },
    };
  }
  return undefined;
});

/* ---------- Do Not Track injection on non-internal pages ---------- */

if (!window.location.href.startsWith(WEBUI_BASE_URL)) {
  (async function () {
    if (settings.doNotTrack) {
      const w = await webFrame.executeJavaScript('window');
      Object.defineProperty(w.navigator, 'doNotTrack', { value: 1 });
    }
  })();
}

/* ---------- Internal page title & message handlers ---------- */

if (window.location.href.startsWith(WEBUI_BASE_URL)) {
  window.addEventListener('DOMContentLoaded', () => {
    if (hostname.startsWith('settings')) document.title = 'Settings';
    else if (hostname.startsWith('history')) document.title = 'History';
    else if (hostname.startsWith('bookmarks')) document.title = 'Bookmarks';
    else if (hostname.startsWith('extensions')) document.title = 'Extensions';
    else if (hostname.startsWith('newtab')) document.title = 'New tab';
  });

  // Same postMessage API you had; pages send messages, we fulfill via IPC.
  window.addEventListener('message', async ({ data }) => {
    if (!data) return;

    if (data.type === 'storage') {
      const res = await ipcRenderer.invoke(`storage-${data.operation}`, {
        scope: data.scope,
        ...data.data,
      });
      postMsg(data, res);
    } else if (data.type === 'credentials-get-password') {
      const res = await ipcRenderer.invoke('credentials-get-password', data.data);
      postMsg(data, res);
    } else if (data.type === 'save-settings') {
      ipcRenderer.send('save-settings', { settings: data.data });
    }
  });

  // Push updates to pages in the main world via postMessage (keeps code unchanged)
  ipcRenderer.on('update-settings', (_e, data) => {
    window.postMessage({ type: 'update-settings', data }, '*');
  });

  ipcRenderer.on('credentials-insert', (_e, data) => {
    window.postMessage({ type: 'credentials-insert', data }, '*');
  });

  ipcRenderer.on('credentials-update', (_e, data) => {
    window.postMessage({ type: 'credentials-update', data }, '*');
  });

  ipcRenderer.on('credentials-remove', (_e, data) => {
    window.postMessage({ type: 'credentials-remove', data }, '*');
  });
}

/* ---------- Modern history API namespace ---------- */
contextBridge.exposeInMainWorld('api', {
  history: {
    get: async () => ipcRenderer.invoke('history-get'),
    remove: (ids: string[]) => ipcRenderer.send('history-remove', ids),
  },
  topsites: {
    get: async (count: number) => ipcRenderer.invoke('topsites-get', count),
  },
});
