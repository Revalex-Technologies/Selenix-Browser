import { AppWindow } from './windows/app';
// The legacy electron-extensions package has been replaced by
// electron-chrome-extensions. All event hooks are now implemented
// via callbacks passed to the ElectronChromeExtensions constructor in
// Application.setupExtensions().
import { BrowserWindow, ipcMain } from 'electron';

export class WindowsService {
  public list: AppWindow[] = [];

  public current: AppWindow;

  public lastFocused: AppWindow;

  constructor() {
    // When extensions are enabled, tab and window creation events are
    // handled by the ElectronChromeExtensions instance created in
    // Application.setupExtensions(). There are no event listeners to
    // register here.

    ipcMain.handle('get-tab-zoom', (e, tabId) => {
      return this.findByContentsView(tabId).viewManager.views.get(tabId)
        .webContents.zoomFactor;
    });
  }

  public open(incognito = false) {
    const window = new AppWindow(incognito);
    this.list.push(window);
    // Electron-chrome-extensions automatically tracks windows when tabs are
    // created. There is no need to call extensions.windows.observe().

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
