import { app, ipcMain, Menu } from 'electron';
import { isAbsolute, extname } from 'path';
import { existsSync } from 'fs';
import { SessionsService } from './sessions-service';
// Import the electron-chrome-extensions library. This package provides
// modern Chrome extension support (currently MV2 and MV3) for Electron. We'll
// instantiate it when the application is ready and store the instance
// on the Application class. See setupExtensions() below for details.
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

  /**
   * Instance of ElectronChromeExtensions. This will be initialized on
   * application startup if the ENABLE_EXTENSIONS environment variable
   * is set. The type is defined using a dynamic import above to avoid
   * bundling issues when the package is unavailable at runtime.
   */
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

    // Initialise sessions before creating any windows or tabs. This ensures
    // that the appropriate session partitions exist before extension
    // support is initialised. Creating SessionsService early also
    // registers protocol handlers on the session.
    this.sessions = new SessionsService()

    // Initialize support for Chrome extensions if enabled. This must
    // happen after SessionsService is constructed (so that the view
    // sessions are available) but before any tabs are created. The
    // method will safely return if ENABLE_EXTENSIONS is not set. See
    // implementation below.
    await this.setupExtensions()

    // Enable installing directly from the Chrome Web Store.
    await this.setupChromeWebStore()

    // Only open a new window after sessions and extensions have been
    // initialised, so that new tabs inherit the correct session and
    // preload scripts. Without this ordering the first window would be
    // created before extension preloads were registered.
    this.windows.open()

    Menu.setApplicationMenu(getMainMenu());
    runAutoUpdaterService();

    app.on('activate', () => {
      if (this.windows.list.filter((x) => x !== null).length === 0) {
        this.windows.open();
      }
    });
  }

  /**
   * Initialize ElectronChromeExtensions support. If the
   * ENABLE_EXTENSIONS environment variable is unset, this method does
   * nothing. Otherwise it dynamically requires the
   * electron-chrome-extensions package, registers its preload scripts
   * on the view session, and instantiates an extensions instance with
   * callbacks that integrate with Selenix's window and tab management.
   */
  private async setupExtensions(): Promise<void> {
    // Only enable if the environment explicitly opts in. This mirrors
    // existing behaviour where extensions are disabled by default. A
    // simple string check is used instead of truthiness to avoid
    // accidentally enabling extensions when the variable is empty.
    if (!process.env.ENABLE_EXTENSIONS) return

    try {
      // Dynamically require the module because it may not be present in
      // some build environments. Using require instead of import
      // prevents bundlers from trying to resolve it when the feature is
      // disabled. Types for ElectronChromeExtensions are imported at
      // compile time above.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ElectronChromeExtensions } = require('electron-chrome-extensions') as typeof import('electron-chrome-extensions')

      // Choose the session where Chrome extensions should be active. We
      // use the persistent `view` session (persist:view) because all
      // normal browsing occurs there. If the session service hasn't
      // been created yet for some reason, fall back to Electron's
      // defaultSession.
      const targetSession = this.sessions?.view || require('electron').session.defaultSession

      // Instantiate the extensions manager. We specify a GPL-3.0 license
      // which is compatible with this project's open-source nature.
      this.extensions = new ElectronChromeExtensions({
        license: 'GPL-3.0',
        session: targetSession,
        createTab: async (details: any) => {
          // Wait for windows to be ready. There should always be at
          // least one window open by the time this callback is invoked.
          const win = typeof details.windowId === 'number'
            ? this.windows.list.find((w) => w.id === details.windowId)
            : this.windows.current

          if (!win) {
            throw new Error(`Unable to find windowId=${details.windowId}`)
          }

          // Create the tab via the view manager. The ViewManager
          // automatically handles attaching the view to the correct
          // BrowserWindow. Pass the URL if provided, otherwise a
          // blank page will be shown.
          const view = win.viewManager.create({ url: details.url }, false, true)
          if (typeof details.active === 'boolean' ? details.active : true) {
            win.viewManager.select(view.id, true)
          }
          // Return the webContents and the owning BrowserWindow as
          // required by electron-chrome-extensions.
          return [view.webContentsView.webContents, win.win]
        },
        selectTab: (tab: Electron.WebContents) => {
          // Map the tab's webContents back to our window and view
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
              // It's possible the view has already been removed by the
              // application. Swallow any errors to avoid crashing.
            }
          }
        },
        createWindow: async (details: any) => {
          // Create a new window using the WindowsService. Ignore
          // incognito for now; a new window will be non-incognito by
          // default. The returned AppWindow instance exposes the
          // underlying BrowserWindow via the `win` property.
          const newWin = this.windows.open(details?.incognito || false)
          if (details?.url) {
            newWin.viewManager.create({ url: details.url }, false, true)
          }
          return newWin.win
        },
        removeWindow: (browserWindow: Electron.BrowserWindow) => {
          // Find the corresponding AppWindow and destroy it. This will
          // close the BrowserWindow and clean up all associated views.
          const win = this.windows.fromBrowserWindow(browserWindow)
          if (win) {
            try {
              win.win.close()
            } catch (err) {
              // Silently ignore failures. The window may already be
              // destroyed by the application.
            }
          }
        },
      })

      // Allow icons from CRX packages to be served. Without this, MV3
      // extensions that specify default icons will not display in the
      // browser. We must register the CRX protocol handler on every
      // session which will request extension resources. In Selenix, this
      // includes the view session (persist:view) and the default session
      // used by the WebUI (persist:webui). If additional sessions are
      // created in the future (e.g. incognito), register the handler on
      // those sessions as well.
      try {
        // Register on the session where tab contents live.
        ElectronChromeExtensions.handleCRXProtocol(targetSession)
        // Register on the default session (used by the UI). Use the
        // imported session object from Electron rather than sessions.service
        // because defaultSession is static.
        const { session: ElectronSession } = require('electron')
        ElectronChromeExtensions.handleCRXProtocol(ElectronSession.defaultSession)
      } catch (err) {
        console.warn('Failed to register CRX protocol:', err)
      }

      /**
       * Utility: try to obtain an anchor rect (screen coords) for a popup.
       * Different electron-chrome-extensions versions expose different
       * fields. We defensively probe common shapes:
       *   - popup.anchorRect
       *   - popup.buttonBounds
       *   - popup.details?.anchorRect / .buttonBounds
       *   - popup.getAnchorRect?.()
       */
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
          /* noop */
        }
        return null
      }

      /**
       * Normalize an anchor rect so it is in **screen coordinates**.
       * Some builds of electron-chrome-extensions give window- or
       * content-relative coordinates. We translate to screen space by
       * comparing against the parent window's frame and content bounds.
       */
      const toScreenRect = (
        rect: { x: number; y: number; width: number; height: number },
        parentWin: Electron.BrowserWindow
      ): { x: number; y: number; width: number; height: number } => {
        try {
          const winBounds = parentWin.getBounds()            // frame bounds (screen coords)
          const contentBounds = parentWin.getContentBounds() // content area (screen coords)

          let { x, y } = rect

          // Heuristics:
          // If x/y look like small values within the window/content width/height,
          // they are most likely not screen coords. Translate accordingly.
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

      /**
       * Resolve the *true* anchor for a popup by asking the WebUI
       * for the bounding rect of the corresponding <browser-action> button.
       * This anchors the popup to the *specific* extension button the user
       * clicked (like in electron-browser-shell).
       */
      const getDomAnchorFromWebUI = async (popup: any, parentWin: Electron.BrowserWindow) => {
        try {
          const bw = popup?.browserWindow
          const url = bw?.webContents?.getURL?.() || ''
          // chrome-extension://<id>/...
          const match = /chrome-extension:\/\/([a-z0-9]{32})\//i.exec(url)
          const extId = match?.[1] || popup?.extensionId || popup?.details?.extensionId
          if (!extId) return null

          // Query the WebUI (parent window's webContents) for the <browser-action> DOM node
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
          // ignore; we'll fall back below
        }
        return null
      }

      // Listen for extension popup creation. The electron-chrome-extensions
      // library creates a BrowserWindow when a browser action is
      // activated. By default it positions the window relative to the
      // extension button and may cause the popup to overflow the
      // right edge of the application window. to stop this When a popup is
      // created we attach listeners to clamp its position so that the
      // popup does not have random calculations and has preferred size and on subsequent resizes/moves. See
      // https://github.com/samuelmaddock/electron-chrome-extensions
      // for details on the PopupView implementation.
      this.extensions.on('browser-action-popup-created', (popup: any) => {
        // Helper to place the popup:
        // 1) Prefer anchoring to the actual browser-action button in the WebUI.
        // 2) If unavailable, fall back to the anchor provided by the library.
        // 3) Regardless, clamp within the parent window with a margin.
        const reposition = async () => {
          try {
            const bw = popup?.browserWindow
            if (!bw || bw.isDestroyed()) return

            // Determine the window that triggered the popup. The
            // PopupView exposes the parent BrowserWindow via the
            // `parent` property. If that is unavailable, use the
            // current window from the WindowsService as a fallback.
            const parentWin = (popup as any).parent ?? this.windows.current.win
            if (!parentWin || parentWin.isDestroyed()) return

            const viewBounds = bw.getBounds()
            const winBounds = parentWin.getBounds()
            const margin = 12 // small visual margin from edges

            // 1) Ask the WebUI for the exact button rect
            let anchor = await getDomAnchorFromWebUI(popup, parentWin)

            // 2) Fall back to any anchor provided by the library
            if (!anchor) {
              const rawAnchor = getAnchorRect(popup)
              anchor = rawAnchor ? toScreenRect(rawAnchor, parentWin) : null
            }

            // Default to current position if still no anchor
            let targetX = viewBounds.x
            let targetY = viewBounds.y

            if (anchor) {
              // Mirror electron-browser-shell's default: align popup's right edge
              // to the button's right edge and place it below (or above if needed).
              targetX = Math.round(anchor.x + anchor.width - viewBounds.width)

              const belowY = Math.round(anchor.y + anchor.height + 8 /* padding */)
              const aboveY = Math.round(anchor.y - viewBounds.height - 8)
              const windowBottom = winBounds.y + winBounds.height
              targetY = (belowY + viewBounds.height <= windowBottom) ? belowY : aboveY
            }

            // Clamp to parent window horizontally/vertically.
            const maxX = winBounds.x + winBounds.width - margin - viewBounds.width
            const minX = winBounds.x + margin
            const maxY = winBounds.y + winBounds.height - margin - viewBounds.height
            const minY = winBounds.y + margin

            if (targetX > maxX) targetX = maxX
            if (targetX < minX) targetX = minX
            if (targetY > maxY) targetY = maxY
            if (targetY < minY) targetY = minY

            // Only update if changed to avoid unnecessary setBounds calls.
            if (targetX !== viewBounds.x || targetY !== viewBounds.y) {
              bw.setBounds({ ...viewBounds, x: targetX, y: targetY })
            }
          } catch (err) {
            // Swallow any errors to avoid crashing the app. Errors
            // here typically stem from windows being destroyed in
            // between events.
            console.error('Failed to reposition extension popup:', err)
          }
        }

        // Once the popup is ready and has reported its preferred size
        // we reposition it. Some Electron versions only emit the
        // `preferred-size-changed` event after a short delay, so
        // waiting on whenReady ensures we clamp the initial
        // position.
        if (typeof popup?.whenReady === 'function') {
          popup.whenReady().then(() => { reposition() }).catch(() => {})
        } else {
          // If whenReady is not available, queue a reposition on the
          // next tick.
          setTimeout(() => { reposition() }, 0)
        }

        // Reapply the anchoring whenever the popup resizes or moves.
        if (typeof popup?.on === 'function') {
          popup.on('resized', () => { reposition() })
          popup.on('moved', () => { reposition() })
        }
      })
    } catch (error) {
      console.error('Failed to initialize electron-chrome-extensions:', error)
    }
  }

  /**
   * Enable Chrome Web Store integration using the electron-chrome-web-store package.
   * This registers the proper preload and IPC on the **persist:view** session so
   * visiting the Chrome Web Store can install extensions directly.
   */
  private async setupChromeWebStore(): Promise<void> {
    // Respect the same ENABLE_EXTENSIONS gate as the core extensions setup.
    if (!process.env.ENABLE_EXTENSIONS) return;

    try {
      // Dynamically require to avoid bundling/runtime issues if the package isn't present.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { installChromeWebStore } = require('electron-chrome-web-store') as typeof import('electron-chrome-web-store');

      // Use the same extensions directory Selenix already uses elsewhere.
      const extPath = getPath('extensions') || undefined;

      await installChromeWebStore({
        session: this.sessions.view,          // persist:view
        extensionsPath: extPath,              // keep extension files with the rest of the app data
        loadExtensions: true,                 // load any previously installed extensions on startup
        allowUnpackedExtensions: false,       // match default
        autoUpdate: true,                     // keep extensions updated
        minimumManifestVersion: 3,            // prefer MV3; MV2 is EOL
      });
    } catch (err) {
      console.error('Failed to initialize Chrome Web Store integration:', err);
    }
  }

}
