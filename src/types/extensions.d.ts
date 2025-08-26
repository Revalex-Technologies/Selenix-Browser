// Minimal TypeScript definitions for the electron-chrome-extensions package.
//
// These declarations allow the project to compile without requiring the
// full dependency to be installed at build time. Only the interfaces
// actually used by Selenix-Browser are declared here. If you extend
// functionality beyond what is defined below, you'll need to update
// this file accordingly.

declare module 'electron-chrome-extensions' {
  import { EventEmitter } from 'node:events'
  import type { BrowserWindow, Session, WebContents } from 'electron'

  export interface ElectronChromeExtensionsOptions {
    /**
     * License string as defined in electron-chrome-extensions. Valid
     * values include 'GPL-3.0' and 'Patron-License-2020-11-19'.
     */
    license: string
    /**
     * The Electron session extensions will operate on. If omitted,
     * defaults to Electron's defaultSession.
     */
    session?: Session
    /**
     * Called when an extension invokes chrome.tabs.create. Should
     * return a tuple of [WebContents, BrowserWindow] representing
     * the created tab and its containing window.
     */
    createTab?: (details: any) => Promise<[WebContents, BrowserWindow]>
    /**
     * Called when an extension requests to select/activate a tab.
     */
    selectTab?: (tab: WebContents) => void
    /**
     * Called when an extension requests to remove a tab.
     */
    removeTab?: (tab: WebContents) => void
    /**
     * Called when an extension invokes chrome.windows.create.
     */
    createWindow?: (details: any) => Promise<BrowserWindow>
    /**
     * Called when an extension invokes chrome.windows.remove.
     */
    removeWindow?: (browserWindow: BrowserWindow) => void
  }

  export class ElectronChromeExtensions extends EventEmitter {
    constructor(opts: ElectronChromeExtensionsOptions)
    /**
     * Register the 'crx://' protocol on the provided session. This is
     * required for extension icons served by the browser action list.
     */
    static handleCRXProtocol(session: Session): void
    /**
     * Add a tab (webContents) to the extensions system. The
     * BrowserWindow parameter associates the tab with a window.
     */
    addTab(tab: WebContents, window: BrowserWindow): void
    /**
     * Remove a previously-added tab from the extensions system.
     */
    removeTab(tab: WebContents): void
    /**
     * Notify the extensions system that a tab has been selected.
     */
    selectTab(tab: WebContents): void
    /**
     * Subscribe to extension events. In particular, the
     * 'browser-action-popup-created' event provides access to a
     * PopupView instance when a browser action popup is opened.
     */
    on(event: 'browser-action-popup-created', listener: (popup: any) => void): this
  }
}

// Additional module declarations for optional imports used by Selenix-Browser.
// These modules may not exist at build time, but declaring them as `any`
// allows TypeScript to compile without errors. When the real package is
// installed, these declarations are ignored in favor of the actual types.

declare module 'electron-chrome-extensions/browser-action' {
  /**
   * Registers the <browser-action-list> custom element and exposes the
   * browserAction API to the window. Must be called from a preload script
   * before using <browser-action-list> in renderer processes.
   */
  export function injectBrowserAction(): void
}

declare module 'electron-chrome-extensions/preload' {
  /**
   * The preload script for electron-chrome-extensions. Importing or requiring
   * this module will set up the global `chrome` namespace and extension
   * workers in renderer processes.
   */
  const preload: unknown
  export = preload
}