import { app, ipcMain, Menu } from 'electron';
import { isAbsolute, extname } from 'path';
import { existsSync } from 'fs';
import { SessionsService } from './sessions-service';

import type { ElectronChromeExtensions } from 'electron-chrome-extensions';
import { checkFiles } from '~/utils/files';
import { Settings } from './models/settings';
import { getPath, isURL, prefixHttp } from '~/utils';
import { WindowsService } from './windows-service';
import { StorageService } from './services/storage';
import { getMainMenu } from './menus/main';
import { runAutoUpdaterService } from './services';
import { DialogsService } from './services/dialogs-service';
import { requestAuth } from './dialogs/auth';
import { NetworkServiceHandler } from './network/network-service-handler';
import { ExtensionServiceHandler } from './extension-service-handler';

export class Application {
  public static instance = new Application();

  public sessions: SessionsService;

  public extensions?: ElectronChromeExtensions;

  public settings = new Settings();

  public storage = new StorageService();

  public windows = new WindowsService();

  public dialogs = new DialogsService();

  public start() {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      app.quit();
      return;
    } else {
      app.on('second-instance', async (e, argv) => {
        const path = argv[argv.length - 1];

        if (isAbsolute(path) && existsSync(path)) {
          if (process.env.NODE_ENV !== 'development') {
            const path = argv[argv.length - 1];
            const ext = extname(path);

            if (ext === '.html') {
              this.windows.current.win.focus();
              this.windows.current.viewManager.create({
                url: `file:///${path}`,
                active: true,
              });
            }
          }
          return;
        } else if (isURL(path)) {
          this.windows.current.win.focus();
          this.windows.current.viewManager.create({
            url: prefixHttp(path),
            active: true,
          });
          return;
        }

        this.windows.open();
      });
    }

    app.on('login', async (e, webContents, request, authInfo, callback) => {
      e.preventDefault();

      const window = this.windows.findByContentsView(webContents.id);
      const credentials = await requestAuth(
        window.win,
        request.url,
        webContents.id,
      );

      if (credentials) {
        callback(credentials.username, credentials.password);
      }
    });

    ipcMain.on('create-window', (e, incognito = false) => {
      this.windows.open(incognito);
    });

    this.onReady();
  }

  private async onReady() {
    await app.whenReady();

    new ExtensionServiceHandler();

    NetworkServiceHandler.get();

    checkFiles();

    this.storage.run();
    this.dialogs.run();

    this.sessions = new SessionsService()

    await this.setupExtensions()

    await this.setupChromeWebStore()

    this.windows.open()

    Menu.setApplicationMenu(getMainMenu());
    runAutoUpdaterService();

    app.on('activate', () => {
      if (this.windows.list.filter((x) => x !== null).length === 0) {
        this.windows.open();
      }
    });
  }

  private async setupExtensions(): Promise<void> {

    if (!process.env.ENABLE_EXTENSIONS) return

    try {

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ElectronChromeExtensions } = require('electron-chrome-extensions') as typeof import('electron-chrome-extensions')

      const targetSession = this.sessions?.view || require('electron').session.defaultSession

      this.extensions = new ElectronChromeExtensions({
        license: 'GPL-3.0',
        session: targetSession,
        createTab: async (details: any) => {

          const win = typeof details.windowId === 'number'
            ? this.windows.list.find((w) => w.id === details.windowId)
            : this.windows.current

          if (!win) {
            throw new Error(`Unable to find windowId=${details.windowId}`)
          }

          const view = win.viewManager.create({ url: details.url }, false, true)
          if (typeof details.active === 'boolean' ? details.active : true) {
            win.viewManager.select(view.id, true)
          }

          return [view.webContentsView.webContents, win.win]
        },
        selectTab: (tab: Electron.WebContents) => {

          const win = this.windows.findByContentsView(tab.id)
          if (win) {
            win.viewManager.select(tab.id, true)
          }
        },
        removeTab: (tab: Electron.WebContents) => {
          const win = this.windows.findByContentsView(tab.id)
          if (win) {
            try {
              win.viewManager.destroy(tab.id)
            } catch (err) {

            }
          }
        },
        createWindow: async (details: any) => {

          const newWin = this.windows.open(details?.incognito || false)
          if (details?.url) {
            newWin.viewManager.create({ url: details.url }, false, true)
          }
          return newWin.win
        },
        removeWindow: (browserWindow: Electron.BrowserWindow) => {

          const win = this.windows.fromBrowserWindow(browserWindow)
          if (win) {
            try {
              win.win.close()
            } catch (err) {

            }
          }
        },
      })

      try {

        ElectronChromeExtensions.handleCRXProtocol(targetSession)

        const { session: ElectronSession } = require('electron')
        ElectronChromeExtensions.handleCRXProtocol(ElectronSession.defaultSession)
      } catch (err) {
        console.warn('Failed to register CRX protocol:', err)
      }

      const getAnchorRect = (popup: any): { x: number; y: number; width: number; height: number } | null => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const candidates: any[] = [
            popup?.anchorRect,
            popup?.buttonBounds,
            popup?.details?.anchorRect,
            popup?.details?.buttonBounds,
            typeof popup?.getAnchorRect === 'function' ? popup.getAnchorRect() : null,
          ].filter(Boolean)

          if (candidates.length) {
            const r = candidates[0]
            if (typeof r.x === 'number' && typeof r.y === 'number' && typeof r.width === 'number' && typeof r.height === 'number') {
              return { x: r.x, y: r.y, width: r.width, height: r.height }
            }
          }
        } catch {

        }
        return null
      }

      const toScreenRect = (
        rect: { x: number; y: number; width: number; height: number },
        parentWin: Electron.BrowserWindow
      ): { x: number; y: number; width: number; height: number } => {
        try {
          const winBounds = parentWin.getBounds()
          const contentBounds = parentWin.getContentBounds()

          let { x, y } = rect

          const looksContentRelative =
            x >= 0 && y >= 0 &&
            x <= contentBounds.width + 4 &&
            y <= contentBounds.height + 48

          const looksWindowRelative =
            x >= 0 && y >= 0 &&
            x <= winBounds.width + 4 &&
            y <= winBounds.height + 48

          if (looksContentRelative) {
            x = contentBounds.x + x
            y = contentBounds.y + y
          } else if (looksWindowRelative) {
            x = winBounds.x + x
            y = winBounds.y + y
          }
          return { x, y, width: rect.width, height: rect.height }
        } catch {
          return rect
        }
      }

      const getDomAnchorFromWebUI = async (popup: any, parentWin: Electron.BrowserWindow) => {
        try {
          const bw = popup?.browserWindow
          const url = bw?.webContents?.getURL?.() || ''

          const match = /chrome-extension:\/\/([a-z0-9]{32})\//i.exec(url)
          const extId = match?.[1] || popup?.extensionId || popup?.details?.extensionId
          if (!extId) return null

          const rect = await parentWin.webContents.executeJavaScript(
            `(function () {
              const sel = document.querySelector('browser-action-list browser-action#${extId}') ||
                          document.querySelector('browser-action#${extId}');
              if (!sel) return null;
              const r = sel.getBoundingClientRect();
              return { x: r.left, y: r.top, width: r.width, height: r.height };
            })()`,
            true
          )

          if (rect && typeof rect.x === 'number') {
            return toScreenRect(rect, parentWin)
          }
        } catch (e) {

        }
        return null
      }

      this.extensions.on('browser-action-popup-created', (popup: any) => {

        const reposition = async () => {
          try {
            const bw = popup?.browserWindow
            if (!bw || bw.isDestroyed()) return

            let parentWin: Electron.BrowserWindow | null = null
            let anchor: { x: number; y: number; width: number; height: number } | null = null

            const candidates: Electron.BrowserWindow[] = []
            try {
              const providedParent = (popup as any)?.parent
              if (providedParent && !providedParent.isDestroyed()) {
                candidates.push(providedParent)
              }
            } catch {}
            for (const appWin of this.windows.list) {
              const win = appWin?.win
              if (!win || win.isDestroyed()) continue
              if (!candidates.includes(win)) {
                candidates.push(win)
              }
            }
            if (candidates.length === 0 && this.windows.current?.win) {
              candidates.push(this.windows.current.win)
            }

            for (const testWin of candidates) {
              try {
                anchor = await getDomAnchorFromWebUI(popup, testWin)
                if (anchor) {
                  parentWin = testWin
                  break
                }
              } catch {}
            }

            if (!parentWin) {
              parentWin = this.windows.current?.win || null
            }
            if (!parentWin || parentWin.isDestroyed()) return

            if (!anchor) {
              const rawAnchor = getAnchorRect(popup)
              anchor = rawAnchor ? toScreenRect(rawAnchor, parentWin) : null
            }

            const viewBounds = bw.getBounds()
            const winBounds = parentWin.getBounds()
            const margin = 12

            let targetX = viewBounds.x
            let targetY = viewBounds.y
            if (anchor) {
              targetX = Math.round(anchor.x + anchor.width - viewBounds.width)
              const belowY = Math.round(anchor.y + anchor.height + 8)
              const aboveY = Math.round(anchor.y - viewBounds.height - 8)
              const windowBottom = winBounds.y + winBounds.height
              targetY = (belowY + viewBounds.height <= windowBottom) ? belowY : aboveY
            }

            const maxX = winBounds.x + winBounds.width - margin - viewBounds.width
            const minX = winBounds.x + margin
            const maxY = winBounds.y + winBounds.height - margin - viewBounds.height
            const minY = winBounds.y + margin
            if (targetX > maxX) targetX = maxX
            if (targetX < minX) targetX = minX
            if (targetY > maxY) targetY = maxY
            if (targetY < minY) targetY = minY

            if (targetX !== viewBounds.x || targetY !== viewBounds.y) {
              bw.setBounds({ ...viewBounds, x: targetX, y: targetY })
            }
          } catch (err) {
            console.error('Failed to reposition extension popup:', err)
          }
        }

        if (typeof popup?.whenReady === 'function') {
          popup.whenReady().then(() => { reposition() }).catch(() => {})
        } else {

          setTimeout(() => { reposition() }, 0)
        }

        if (typeof popup?.on === 'function') {
          popup.on('resized', () => { reposition() })
          popup.on('moved', () => { reposition() })
        }
      })
    } catch (error) {
      console.error('Failed to initialize electron-chrome-extensions:', error)
    }
  }

  private async setupChromeWebStore(): Promise<void> {

    if (!process.env.ENABLE_EXTENSIONS) return;

    try {

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { installChromeWebStore } = require('electron-chrome-web-store') as typeof import('electron-chrome-web-store');

      const extPath = getPath('extensions') || undefined;

      await installChromeWebStore({
        session: this.sessions.view,
        extensionsPath: extPath,
        loadExtensions: true,
        allowUnpackedExtensions: false,
        autoUpdate: true,
        minimumManifestVersion: 3,
      });
    } catch (err) {
      console.error('Failed to initialize Chrome Web Store integration:', err);
    }
  }

}
