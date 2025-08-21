import { AppWindow } from './windows/app';
import { extensions } from 'electron-extensions';
import { BrowserWindow, ipcMain } from 'electron';

export class WindowsService {
  public list: AppWindow[] = [];

  public current: AppWindow;

  public lastFocused: AppWindow;

  constructor() {
    if (process.env.ENABLE_EXTENSIONS) {
      extensions.tabs.on('activated', (tabId, windowId, focus) => {
        const win = this.list.find((x) => x.id === windowId);
        win.viewManager.select(tabId, focus === undefined ? true : focus);
      });

      extensions.tabs.onCreateDetails = (tab, details) => {
        const win = this.findByContentsView(tab.id);
        details.windowId = win.id;
      };

      extensions.windows.onCreate = async (details) => {
        return this.open(details.incognito).id;
      };

      extensions.tabs.onCreate = async (details) => {
        const win =
          this.list.find((x) => x.id === details.windowId) || this.lastFocused;

        if (!win) return -1;

        const view = win.viewManager.create(details);
        return view.id;
      };
    }

    ipcMain.handle('get-tab-zoom', (e, tabId) => {
      return this.findByContentsView(tabId).viewManager.views.get(tabId)
        .webContents.zoomFactor;
    });
  }

  public open(incognito = false) {
    const window = new AppWindow(incognito);
    this.list.push(window);

    if (process.env.ENABLE_EXTENSIONS) {
      extensions.windows.observe(window.win);
    }

    window.win.on('focus', () => {
      this.lastFocused = window;
    });

    return window;
  }

  public findByContentsView(webContentsId: number) {
    return this.list.find((x) => !!x.viewManager.views.get(webContentsId));
  }

  public fromBrowserWindow(browserWindow: BrowserWindow) {
    return this.list.find((x) => x.id === browserWindow.id);
  }

  public broadcast(channel: string, ...args: unknown[]) {
    const alive: AppWindow[] = [];
    this.list.forEach((appWindow) => {
      try {
        const win = (appWindow as any)?.win;
        if (!win || typeof win.isDestroyed !== 'function' || win.isDestroyed()) return;
        const wc = win.webContents;
        if (!wc || typeof wc.isDestroyed !== 'function' || wc.isDestroyed()) return;
        wc.send(channel, ...args);
        alive.push(appWindow);
      } catch {}
    });
    this.list = alive;
  }
}
