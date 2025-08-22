import { ipcMain } from 'electron';
import { parse } from 'url';

/**
 * Password persistence via electron-store (with a no-op in-memory fallback).
 * Set ELECTRON_STORE_KEY to enable at-rest encryption.
 */
type PasswordStore = {
  get(service: string, account: string): Promise<string | null>;
  set(service: string, account: string, password: string): Promise<void>;
  delete(service: string, account: string): Promise<void>;
};

let passwordStore: PasswordStore;

(() => {
  try {
    // Use require to avoid ESM/CJS friction in different build setups.
    const Store = require('electron-store') as typeof import('electron-store');

    // You can change the 'name' to customize the filename on disk (credentials.json).
    const store = new (Store as any)({
      name: 'credentials',
      // If you provide ELECTRON_STORE_KEY, values will be encrypted at rest.
      encryptionKey: process.env.ELECTRON_STORE_KEY || undefined,
      clearInvalidConfig: true,
    });

    const makeKey = (service: string, account: string) => `${service}:${account}`;

    passwordStore = {
      async get(service, account) {
        const v = store.get(makeKey(service, account));
        return (v ?? null) as string | null;
      },
      async set(service, account, password) {
        store.set(makeKey(service, account), password);
      },
      async delete(service, account) {
        store.delete(makeKey(service, account));
      },
    };
  } catch (err) {
    // Fallback: in-memory map so the app still compiles/runs without electron-store
    console.warn(
      '[credentials] electron-store not found; falling back to in-memory storage (passwords will not persist).',
    );
    const mem = new Map<string, string>();
    const makeKey = (service: string, account: string) => `${service}:${account}`;

    passwordStore = {
      async get(service, account) {
        return mem.get(makeKey(service, account)) ?? null;
      },
      async set(service, account, password) {
        mem.set(makeKey(service, account), password);
      },
      async delete(service, account) {
        mem.delete(makeKey(service, account));
      },
    };
  }
})();

// Maintain the same helper API the rest of the file expects:
const getPassword = (service: string, account: string) =>
  passwordStore.get(service, account);
const setPassword = (service: string, account: string, password: string) =>
  passwordStore.set(service, account, password);
const deletePassword = (service: string, account: string) =>
  passwordStore.delete(service, account);

import { AppWindow } from '../windows';
import { Application } from '../application';
import { showMenuDialog } from '../dialogs/menu';
import { PreviewDialog } from '../dialogs/preview';
import { IFormFillData, IBookmark } from '~/interfaces';
import { SearchDialog } from '../dialogs/search';

import * as bookmarkMenu from '../menus/bookmarks';
import { showFindDialog } from '../dialogs/find';
import { getFormFillMenuItems } from '../utils';
import { showAddBookmarkDialog } from '../dialogs/add-bookmark';
import { showExtensionDialog } from '../dialogs/extension-popup';
import { showDownloadsDialog } from '../dialogs/downloads';
import { showZoomDialog } from '../dialogs/zoom';
import { showTabGroupDialog } from '../dialogs/tabgroup';

export const runMessagingService = (appWindow: AppWindow) => {
  const { id } = appWindow;

  ipcMain.on(`window-focus-${id}`, () => {
    appWindow.win.focus();
    appWindow.webContents.focus();
  });

  ipcMain.on(`window-toggle-maximize-${id}`, () => {
    if (appWindow.win.isMaximized()) {
      appWindow.win.unmaximize();
    } else {
      appWindow.win.maximize();
    }
  });

  ipcMain.on(`window-minimize-${id}`, () => {
    appWindow.win.minimize();
  });

  ipcMain.on(`window-close-${id}`, () => {
    appWindow.win.close();
  });

  ipcMain.on(`window-fix-dragging-${id}`, () => {
    appWindow.fixDragging();
  });

  ipcMain.on(`show-menu-dialog-${id}`, (e, x, y) => {
    showMenuDialog(appWindow.win, x, y);
  });

  ipcMain.on(`search-show-${id}`, (e, data) => {
    const dialog = Application.instance.dialogs.getPersistent(
      'search',
    ) as SearchDialog;
    dialog.data = data;
    dialog.show(appWindow.win);
  });

  ipcMain.handle(`is-dialog-visible-${id}`, (e, dialog) => {
    return Application.instance.dialogs.isVisible(dialog);
  });

  ipcMain.on(`show-tab-preview-${id}`, (e, tab) => {
    const dialog = Application.instance.dialogs.getPersistent(
      'preview',
    ) as PreviewDialog;
    dialog.tab = tab;
    dialog.show(appWindow.win);
  });

  ipcMain.on(`hide-tab-preview-${id}`, (e, tab) => {
    const dialog = Application.instance.dialogs.getPersistent(
      'preview',
    ) as PreviewDialog;
    dialog.hide();
  });

  ipcMain.on(`find-show-${id}`, () => {
    showFindDialog(appWindow.win);
  });

  ipcMain.on(`find-in-page-${id}`, () => {
    appWindow.send('find');
  });

  ipcMain.on(`show-add-bookmark-dialog-${id}`, (e, left, top) => {
    showAddBookmarkDialog(appWindow.win, left, top);
  });

  if (process.env.ENABLE_EXTENSIONS) {
    ipcMain.on(`show-extension-popup-${id}`, (e, left, top, url, inspect) => {
      showExtensionDialog(appWindow.win, left, top, url, inspect);
    });
  }

  ipcMain.on(`show-downloads-dialog-${id}`, (e, left, top) => {
    showDownloadsDialog(appWindow.win, left, top);
  });

  ipcMain.on(`show-zoom-dialog-${id}`, (e, left, top) => {
    showZoomDialog(appWindow.win, left, top);
  });

  ipcMain.on(`show-tabgroup-dialog-${id}`, (e, tabGroup) => {
    showTabGroupDialog(appWindow.win, tabGroup);
  });

  ipcMain.on(`edit-tabgroup-${id}`, (e, tabGroup) => {
    appWindow.send(`edit-tabgroup`, tabGroup);
  });

  ipcMain.on(`is-incognito-${id}`, (e) => {
    e.returnValue = appWindow.incognito;
  });

  if (process.env.ENABLE_AUTOFILL) {
    // TODO: autofill
    // ipcMain.on(`form-fill-show-${id}`, async (e, rect, name, value) => {
    //   const items = await getFormFillMenuItems(name, value);
    //
    //   if (items.length) {
    //     appWindow.dialogs.formFillDialog.send(`formfill-get-items`, items);
    //     appWindow.dialogs.formFillDialog.inputRect = rect;
    //
    //     appWindow.dialogs.formFillDialog.resize(
    //       items.length,
    //       items.find((r) => r.subtext) != null,
    //     );
    //     appWindow.dialogs.formFillDialog.rearrange();
    //     appWindow.dialogs.formFillDialog.show(false);
    //   } else {
    //     appWindow.dialogs.formFillDialog.hide();
    //   }
    // });
    //
    // ipcMain.on(`form-fill-hide-${id}`, () => {
    //   appWindow.dialogs.formFillDialog.hide();
    // });

    ipcMain.on(
      `form-fill-update-${id}`,
      async (e, _id: string, persistent = false) => {
        const url = appWindow.viewManager.selected.url;
        const { hostname } = parse(url);

        const item =
          _id &&
          (await Application.instance.storage.findOne<IFormFillData>({
            scope: 'formfill',
            query: { _id },
          }));

        if (item && item.type === 'password') {
          item.fields.password = await getPassword(
            'wexond',
            `${hostname}-${item.fields.username}`,
          );
        }

        appWindow.viewManager.selected.send(
          `form-fill-update-${id}`,
          item,
          persistent,
        );
      },
    );

    // ipcMain.on(`credentials-show-${id}`, (e, data) => {
    //   appWindow.dialogs.credentialsDialog.send('credentials-update', data);
    //   appWindow.dialogs.credentialsDialog.rearrange();
    //   appWindow.dialogs.credentialsDialog.show();
    // });
    //
    // ipcMain.on(`credentials-hide-${id}`, () => {
    //   appWindow.dialogs.credentialsDialog.hide();
    // });

    ipcMain.on(`credentials-save-${id}`, async (e, data) => {
      const { username, password, update, oldUsername } = data;
      const view = appWindow.viewManager.selected;
      const hostname = view.hostname;

      if (!update) {
        const item = await Application.instance.storage.insert<IFormFillData>({
          scope: 'formfill',
          item: {
            type: 'password',
            url: hostname,
            favicon: appWindow.viewManager.selected.favicon,
            fields: {
              username,
              passLength: password.length,
            },
          },
        });

        appWindow.viewManager.settingsView.webContents.send(
          'credentials-insert',
          item,
        );
      } else {
        await Application.instance.storage.update({
          scope: 'formfill',
          query: {
            type: 'password',
            url: hostname,
            'fields.username': oldUsername,
            'fields.passLength': password.length,
          },
          value: {
            'fields.username': username,
          },
        });

        appWindow.viewManager.settingsView.webContents.send(
          'credentials-update',
          { ...data, hostname },
        );
      }

      await setPassword('wexond', `${hostname}-${username}`, password);

      appWindow.send(`has-credentials-${view.id}`, true);
    });

    ipcMain.on(`credentials-remove-${id}`, async (e, data: IFormFillData) => {
      const { _id, fields } = data;
      const view = appWindow.viewManager.selected;

      await Application.instance.storage.remove({
        scope: 'formfill',
        query: {
          _id,
        },
      });

      await deletePassword('wexond', `${view.hostname}-${fields.username}`);

      appWindow.viewManager.settingsView.webContents.send(
        'credentials-remove',
        _id,
      );
    });

    ipcMain.on(
      'credentials-get-password',
      async (e, id: string, account: string) => {
        const password = await getPassword('wexond', account);
        e.sender.send(id, password);
      },
    );
  }

  ipcMain.handle(
    `show-bookmarks-bar-dropdown-${id}`,
    (
      event,
      folderId: string,
      bookmarks: IBookmark[],
      { x, y }: { x: number; y: number },
    ) => {
      bookmarkMenu
        .createDropdown(appWindow, folderId, bookmarks)
        .popup({ x: Math.floor(x), y: Math.floor(y), window: appWindow.win });
    },
  );
  ipcMain.handle(
    `show-bookmarks-bar-context-menu-${id}`,
    (event, item: IBookmark) => {
      bookmarkMenu.createMenu(appWindow, item).popup({ window: appWindow.win });
    },
  );
};
