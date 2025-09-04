import { Menu, webContents, app, BrowserWindow, MenuItem } from 'electron';
import { defaultTabOptions } from '~/constants/tabs';
import { viewSource, saveAs, printPage } from './common-actions';
import { WEBUI_BASE_URL, WEBUI_URL_SUFFIX } from '~/constants/files';
import { AppWindow } from '../windows';
import { Application } from '../application';
import { showMenuDialog } from '../dialogs/menu';
import { getWebUIURL } from '~/common/webui';

const isMac = process.platform === 'darwin';

const createMenuItem = (
  shortcuts: string[],
  action: (
    window: AppWindow,
    menuItem: MenuItem,
    shortcutIndex: number,
  ) => void,
  label: string = null,
) => {
  const result: any = shortcuts.map((shortcut, key) => ({
    accelerator: shortcut,
    visible: label != null && key === 0,
    label: label != null && key === 0 ? label : '',
    click: (menuItem: MenuItem, browserWindow: BrowserWindow) =>
      action(
        Application.instance.windows.list.find(
          (x) => x.win.id === browserWindow.id,
        ),
        menuItem,
        key,
      ),
  }));

  return result;
};

export const getMainMenu = () => {
  const template: any = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideothers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        ...createMenuItem(
          ['CmdOrCtrl+N'],
          () => {
            Application.instance.windows.open();
          },
          'New window',
        ),
        ...createMenuItem(
          ['CmdOrCtrl+Shift+N'],
          () => {
            Application.instance.windows.open(true);
          },
          'New incognito window',
        ),
        ...createMenuItem(
          ['CmdOrCtrl+T'],
          (window) => {
            window.viewManager.create(defaultTabOptions);
          },
          'New tab',
        ),
        ...createMenuItem(
          ['CmdOrCtrl+Shift+T'],
          (window) => {
            window.send('revert-closed-tab');
          },
          'Revert closed tab',
        ),
        {
          type: 'separator',
        },
        ...createMenuItem(
          ['CmdOrCtrl+Shift+W'],
          (window) => {
            window.win.close();
          },
          'Close window',
        ),
        ...createMenuItem(
          ['CmdOrCtrl+W', 'CmdOrCtrl+F4'],
          (window) => {
            window.send('remove-tab', window.viewManager.selectedId);
          },
          'Close tab',
        ),
        {
          type: 'separator',
        },
        ...createMenuItem(
          ['CmdOrCtrl+S'],
          () => {
            saveAs();
          },
          'Save webpage as...',
        ),
        {
          type: 'separator',
        },
        ...createMenuItem(
          ['CmdOrCtrl+P'],
          () => {
            printPage();
          },
          'Print',
        ),

        ...createMenuItem(['Ctrl+Space', 'CmdOrCtrl+L', 'Alt+D', 'F6'], () => {
          Application.instance.dialogs
            .getPersistent('search')
            .show(Application.instance.windows.current.win);
        }),

        ...createMenuItem(['Alt+F', 'Alt+E'], () => {
          Application.instance.windows.current.send('show-menu-dialog');
        }),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startspeaking' }, { role: 'stopspeaking' }],
              },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
        { type: 'separator' },
        ...createMenuItem(
          ['CmdOrCtrl+F'],
          () => {
            Application.instance.windows.current.send('find');
          },
          'Find in page',
        ),
      ],
    },
    {
      label: 'View',
      submenu: [
        ...createMenuItem(
          ['CmdOrCtrl+R', 'F5'],
          () => {
            Application.instance.windows.current.viewManager.selected.webContents.reload();
          },
          'Reload',
        ),
        ...createMenuItem(
          ['CmdOrCtrl+Shift+R', 'Shift+F5'],
          () => {
            Application.instance.windows.current.viewManager.selected.webContents.reloadIgnoringCache();
          },
          'Reload ignoring cache',
        ),
      ],
    },
    {
      label: 'History',
      submenu: [
        ...createMenuItem(
          ['CmdOrCtrl+Shift+H'],
          () => {
            const { selected } = Application.instance.windows.current.viewManager;
            if (selected) {
              const home = (selected as any).homeUrl || 'about:blank';
              selected.webContents.loadURL(home);
            }
          },
          'Homepage',
        ),
        ...createMenuItem(
          isMac ? ['Cmd+[', 'Cmd+Left'] : ['Alt+Left'],
          () => {
            const {
              selected,
            } = Application.instance.windows.current.viewManager;
            if (selected) {
              selected.webContents.navigationHistory.goBack();
            }
          },
          'Go back',
        ),
        ...createMenuItem(
          isMac ? ['Cmd+]', 'Cmd+Right'] : ['Alt+Right'],
          () => {
            const {
              selected,
            } = Application.instance.windows.current.viewManager;
            if (selected) {
              selected.webContents.navigationHistory.goForward();
            }
          },
          'Go forward',
        ),

        { type: 'separator' },
        {
          label: 'Recently closed',
          submenu:
            Application.instance.windows.current.viewManager.recentlyClosed
              .slice(0, 10)
              .map((item) => ({
                label: (item.title || item.url || 'Closed Tab'),
                click: () => {
                  const { selected } = Application.instance.windows.current.viewManager;
                  if (selected && item.url) selected.webContents.loadURL(item.url);
                },
              })),
        },

        { type: 'separator' },
        {
          label: 'Recently visited',
          submenu:
            (Application.instance.storage?.history || [])
              .slice(-15)
              .reverse()
              .map((item: any) => ({
                label: (item.title || item.url),
                click: () => {
                  const { selected } = Application.instance.windows.current.viewManager;
                  if (selected && item?.url) selected.webContents.loadURL(item.url);
                },
              })),
        },
        { type: 'separator' },
        ...createMenuItem(
          isMac ? ['Cmd+Y'] : ['Ctrl+H'],
          () => {
            Application.instance.windows.current.viewManager.create({
              url: getWebUIURL('history'),
              active: true,
            });
          },
          'Manage history',
        ),
      ],
    },
    {
      label: 'Bookmarks',
      submenu: [
        ...createMenuItem(
          isMac ? ['Cmd+Option+B'] : ['CmdOrCtrl+Shift+O'],
          () => {
            Application.instance.windows.current.viewManager.create({
              url: getWebUIURL('bookmarks'),
              active: true,
            });
          },
          'Manage bookmarks',
        ),
        ...createMenuItem(
          ['CmdOrCtrl+Shift+B'],
          () => {
            const { bookmarksBar } = Application.instance.settings.object;
            Application.instance.settings.updateSettings({
              bookmarksBar: !bookmarksBar,
            });
          },
          'Toggle bookmarks bar',
        ),
        ...createMenuItem(
          ['CmdOrCtrl+D'],
          () => {
            Application.instance.windows.current.webContents.send(
              'show-add-bookmark-dialog',
            );
          },
          'Add this website to bookmarks',
        ),

        {
              label: 'Bookmarks',
              submenu: (Application.instance.storage?.bookmarks || [])
                .filter((b: any) => !b.isFolder && b.url)
                .slice(0, 15)
                .map((b: any) => ({
                  label: b.title || b.url,
                  click: () => {
                    const { selected } = Application.instance.windows.current.viewManager;
                    if (selected) selected.webContents.loadURL(b.url);
                  },
                })),
            }
      ],
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Developer',
          submenu: [
            ...createMenuItem(
              ['CmdOrCtrl+U'],
              () => {
                viewSource();
              },
              'View source',
            ),
            ...createMenuItem(
              ['CmdOrCtrl+Shift+I', 'CmdOrCtrl+Shift+J', 'F12'],
              () => {
                setTimeout(() => {
                  const win = Application.instance.windows.current;
                  const viewManager = win?.viewManager;
                  const selectedView = viewManager?.selected;
                  const wc = selectedView?.webContents;
                  if (!wc) return;

                  if (wc.isDevToolsOpened()) {
                    wc.closeDevTools();
                    return;
                  }

                  const platform = process.platform;
                  const detach = platform === 'win32' || platform === 'linux';
                  const mode: any = detach ? 'detach' : 'undocked';
                  try {
                    wc.openDevTools({ mode });
                    (wc as any)._hasOpenedDevTools = true;
                  } catch {
                    try {
                      wc.toggleDevTools();
                      (wc as any)._hasOpenedDevTools = true;
                    } catch {}
                  }
                });
              },
              'Developer tools...',
            ),

            ...createMenuItem(['CmdOrCtrl+Shift+F12'], () => {
              setTimeout(() => {
                const focused = webContents.getFocusedWebContents();
                if (!focused) return;
                try {
                  focused.openDevTools({ mode: 'detach' });
                  (focused as any)._hasOpenedDevTools = true;
                } catch {}
              });
            }),
          ],
        },
      ],
    },
    {
      label: 'Tab',
      submenu: [
        ...createMenuItem(
          isMac ? ['Cmd+Option+Right'] : ['Ctrl+Tab', 'Ctrl+PageDown'],
          () => {
            Application.instance.windows.current.webContents.send(
              'select-next-tab',
            );
          },
          'Select next tab',
        ),
        ...createMenuItem(
          isMac ? ['Cmd+Option+Left'] : ['Ctrl+Shift+Tab', 'Ctrl+PageUp'],
          () => {
            Application.instance.windows.current.webContents.send(
              'select-previous-tab',
            );
          },
          'Select previous tab',
        ),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'togglefullscreen' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close', accelerator: '' }]),
        { type: 'separator' },
        {
          label: 'Always on top',
          type: 'checkbox',
          checked: false,
          click(menuItem: MenuItem, browserWindow: BrowserWindow) {
            browserWindow.setAlwaysOnTop(!browserWindow.isAlwaysOnTop());
            menuItem.checked = browserWindow.isAlwaysOnTop();
          },
        },
      ],
    },
  ];

  template[0].submenu = template[0].submenu.concat(
    createMenuItem(
      Array.from({ length: 8 }, (v, k) => k + 1).map((i) => `CmdOrCtrl+${i}`),
      (window, menuItem, i) => {
        Application.instance.windows.current.webContents.send(
          'select-tab-index',
          i,
        );
      },
    ),
  );

  template[0].submenu = template[0].submenu.concat(
    createMenuItem(['CmdOrCtrl+9'], () => {
      Application.instance.windows.current.webContents.send('select-last-tab');
    }),
  );

  return Menu.buildFromTemplate(template);
};
