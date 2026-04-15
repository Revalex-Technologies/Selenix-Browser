import { registerProtocol } from './models/protocol';
import {
  ipcMain,
  app,
  webContents,
  session,
  BrowserWindow,
  Menu,
} from 'electron';

require('source-map-support').install();

import { platform } from 'os';
import { Application } from './application';

export const isNightly = app.name === 'selenix-nightly';

app.name = isNightly ? 'Selenix Nightly' : 'Selenix';

(process.env as any)['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;

app.commandLine.appendSwitch('--enable-transparent-visuals');
app.commandLine.appendSwitch(
  'enable-features',
  'CSSColorSchemeUARendering, ImpulseScrollAnimations, ParallelDownloading',
);

if (process.env.NODE_ENV === 'development') {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

ipcMain.setMaxListeners(0);

const application = Application.instance;
application.start();

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.on('window-all-closed', () => {
  if (platform() !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('get-webcontents-id', (e: any) => {
  e.returnValue = e.sender.id;
});

ipcMain.on('get-window-id', (e: any) => {
  e.returnValue = (e.sender as any).windowId;
});

ipcMain.on('get-app-name-sync', (e: any) => {
  e.returnValue = app.name;
});

ipcMain.on('get-process-argv-sync', (e: any) => {
  e.returnValue = process.argv;
});

ipcMain.on('get-app-path-sync', (e: any, pathName: string) => {
  const allowedPaths = new Set(['downloads', 'userData']);

  if (!allowedPaths.has(pathName)) {
    e.returnValue = '';
    return;
  }

  e.returnValue = app.getPath(pathName as 'downloads' | 'userData');
});

const resolveBrowserWindow = (
  sender: Electron.WebContents,
): BrowserWindow | null => {
  const windowId = (sender as any).windowId;

  if (typeof windowId === 'number') {
    const owner = BrowserWindow.fromId(windowId);
    if (owner && !owner.isDestroyed()) {
      return owner;
    }
  }

  const directOwner = BrowserWindow.fromWebContents(sender);
  if (directOwner && !directOwner.isDestroyed()) {
    return directOwner;
  }

  return null;
};

ipcMain.on('window-is-always-on-top-sync', (e: any) => {
  e.returnValue = resolveBrowserWindow(e.sender)?.isAlwaysOnTop() ?? false;
});

ipcMain.handle('window-set-always-on-top', (e, value: boolean) => {
  const browserWindow = resolveBrowserWindow(e.sender);

  if (!browserWindow) {
    return false;
  }

  browserWindow.setAlwaysOnTop(!!value);
  return browserWindow.isAlwaysOnTop();
});

ipcMain.handle('window-set-full-screen', (e, value: boolean) => {
  const browserWindow = resolveBrowserWindow(e.sender);

  if (!browserWindow) {
    return false;
  }

  browserWindow.setFullScreen(!!value);
  return browserWindow.isFullScreen();
});

ipcMain.handle('show-addressbar-context-menu', (e) => {
  const browserWindow = resolveBrowserWindow(e.sender);
  const menu = Menu.buildFromTemplate([
    { role: 'undo', accelerator: 'CmdOrCtrl+Z' },
    { type: 'separator' },
    { role: 'copy', accelerator: 'CmdOrCtrl+C' },
    { role: 'paste', accelerator: 'CmdOrCtrl+V' },
    { type: 'separator' },
    {
      role: 'delete',
      accelerator: process.platform === 'darwin' ? 'Fn+Delete' : 'Delete',
    },
    { type: 'separator' },
    { role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
  ]);

  menu.popup({
    window: browserWindow ?? undefined,
  });
});

const showActionMenu = (
  browserWindow: BrowserWindow | null,
  items: (
    finish: (action: string | null) => void,
  ) => Electron.MenuItemConstructorOptions[],
) =>
  new Promise<string | null>((resolve) => {
    let settled = false;

    const finish = (action: string | null) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(action);
    };

    const menu = Menu.buildFromTemplate(items(finish));

    menu.popup({
      window: browserWindow ?? undefined,
      callback: () => finish(null),
    });
  });

ipcMain.handle(
  'show-tab-context-menu',
  async (
    e,
    {
      hasTabGroup,
      isPinned,
      isMuted,
      canRevertClosed,
    }: {
      hasTabGroup: boolean;
      isPinned: boolean;
      isMuted: boolean;
      canRevertClosed: boolean;
    },
  ) =>
    showActionMenu(resolveBrowserWindow(e.sender), (finish) => [
      {
        label: 'New tab to the right',
        click: () => finish('new-tab-to-the-right'),
      },
      {
        label: 'Add to a new group',
        click: () => finish('add-to-a-new-group'),
      },
      {
        label: 'Remove from group',
        visible: !!hasTabGroup,
        click: () => finish('remove-from-group'),
      },
      {
        type: 'separator',
      },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: () => finish('reload'),
      },
      {
        label: 'Duplicate',
        click: () => finish('duplicate'),
      },
      {
        label: isPinned ? 'Unpin tab' : 'Pin tab',
        click: () => finish('toggle-pin'),
      },
      {
        label: isMuted ? 'Unmute tab' : 'Mute tab',
        click: () => finish('toggle-mute'),
      },
      {
        type: 'separator',
      },
      {
        label: 'Close tab',
        accelerator: 'CmdOrCtrl+W',
        click: () => finish('close-tab'),
      },
      {
        label: 'Close other tabs',
        click: () => finish('close-other-tabs'),
      },
      {
        label: 'Close tabs to the left',
        click: () => finish('close-tabs-to-the-left'),
      },
      {
        label: 'Close tabs to the right',
        click: () => finish('close-tabs-to-the-right'),
      },
      {
        type: 'separator',
      },
      {
        label: 'Revert closed tab',
        enabled: !!canRevertClosed,
        click: () => finish('revert-closed-tab'),
      },
    ]),
);

ipcMain.handle('show-shield-context-menu', async (e, enabled: boolean) =>
  showActionMenu(resolveBrowserWindow(e.sender), (finish) => [
    {
      label: 'Enable',
      type: 'checkbox',
      checked: !!enabled,
      click: () => finish(enabled ? 'disable' : 'enable'),
    },
  ]),
);

ipcMain.handle(
  `web-contents-call`,
  async (
    e,
    {
      webContentsId,
      method,
      args = [],
    }: { webContentsId: number; method: string; args: any[] },
  ) => {
    try {
      const wc = webContents.fromId(webContentsId);
      if (!wc || wc.isDestroyed()) {
        throw new Error(
          `WebContents with id ${webContentsId} not found or destroyed`,
        );
      }

      const segments = method.replace(/^webContents\./, '').split('.');
      let target: any = wc as any;
      const fnName = segments.pop()!;
      for (const seg of segments) {
        if (typeof target[seg] === 'undefined') {
          throw new Error(`Property ${seg} is not available on WebContents`);
        }
        target = target[seg];
      }
      const callable = target[fnName];
      if (typeof callable !== 'function') {
        throw new Error(
          `${fnName} is not a function on ${segments.join('.') || 'WebContents'}`,
        );
      }
      let result: any;
      try {
        result = callable.apply(target, args);
      } catch (err: any) {
        if (err && (err.code === 'ERR_ABORTED' || err.errno === -3)) {
          return null;
        }
        console.error('Error in webContents method:', method, err);
        throw err;
      }
      if (result instanceof Promise) {
        return await result.catch((err: any): any => {
          if (err && (err.code === 'ERR_ABORTED' || err.errno === -3)) {
            // Swallow navigation aborts; they are normal when navigating away mid-load
            return null;
          }
          console.error('Error in webContents method:', method, err);
          throw err;
        });
      }
      return result;
    } catch (error: any) {
      if (error && (error.code === 'ERR_ABORTED' || error.errno === -3)) {
        // benign abort, ignore
        return null;
      }
      console.error('Error in web-contents-call handler:', error);
      throw error;
    }
  },
);

app.whenReady().then(() => {
  try {
    registerProtocol(session.defaultSession);
  } catch (e) {
    console.error('registerProtocol defaultSession failed', e);
  }
});
