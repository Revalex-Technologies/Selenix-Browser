import { ipcMain, app, webContents } from 'electron';
import { setIpcMain } from '@wexond/rpc-electron';
setIpcMain(ipcMain);

import { initialize } from '@electron/remote/main';

initialize();

if (process.env.NODE_ENV === 'development') {
  require('source-map-support').install();
}

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

ipcMain.on('get-webcontents-id', (e) => {
  e.returnValue = e.sender.id;
});

ipcMain.on('get-window-id', (e) => {
  e.returnValue = (e.sender as any).windowId;
});

ipcMain.handle(
  `web-contents-call`,
  async (e, { webContentsId, method, args = [] }: { webContentsId: number; method: string; args: any[] }) => {
    try {
      const wc = webContents.fromId(webContentsId);
      if (!wc || wc.isDestroyed()) {
        throw new Error(`WebContents with id ${webContentsId} not found or destroyed`);
      }

      let actualMethod = method;
      if (method.startsWith('webContents.')) {
        actualMethod = method.split('.')[1];
      }

      if (typeof (wc as any)[actualMethod] !== 'function') {
        throw new Error(`${actualMethod} is not a function on WebContents`);
      }

      const result = (wc as any)[actualMethod](...args);

      if (result instanceof Promise) {
        return await result.catch((err: any): any => {
          if ((err && (err.code === 'ERR_ABORTED' || err.errno === -3))) {
            // Swallow navigation aborts; they are normal when navigating away mid-load
            return null;
          }
          console.error('Error in webContents method:', actualMethod, err);
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
  }
);
