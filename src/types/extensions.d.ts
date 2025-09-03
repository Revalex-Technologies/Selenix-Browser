declare module 'electron-chrome-extensions' {
  import { EventEmitter } from 'node:events'
  import type { BrowserWindow, Session, WebContents } from 'electron'

  export interface ElectronChromeExtensionsOptions {

    license: string

    session?: Session

    createTab?: (details: any) => Promise<[WebContents, BrowserWindow]>

    selectTab?: (tab: WebContents) => void

    removeTab?: (tab: WebContents) => void

    createWindow?: (details: any) => Promise<BrowserWindow>

    removeWindow?: (browserWindow: BrowserWindow) => void
  }

  export class ElectronChromeExtensions extends EventEmitter {
    constructor(opts: ElectronChromeExtensionsOptions)

    static handleCRXProtocol(session: Session): void

    addTab(tab: WebContents, window: BrowserWindow): void

    removeTab(tab: WebContents): void

    selectTab(tab: WebContents): void

    on(event: 'browser-action-popup-created', listener: (popup: any) => void): this
  }
}

declare module 'electron-chrome-extensions/browser-action' {

  export function injectBrowserAction(): void
}

declare module 'electron-chrome-extensions/preload' {

  const preload: unknown
  export = preload
}