import { app, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { Application } from '../application';

export const runAutoUpdaterService = () => {

  const updater = autoUpdater as any;

  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;

  if (!app.isPackaged) {

    try {
      updater.forceDevUpdateConfig = true;
    } catch {}
  }

  let hasUpdate = false;
  let isDownloaded = false;
  let installRequested = false;

  const broadcast = (channel: string, ...args: any[]) => {

    for (const w of Application.instance.windows.list) {
      try {
        w.send(channel, ...args);
      } catch {}
    }

    try {
      Application.instance.dialogs
        .getDynamic('menu')
        ?.webContentsView?.webContents?.send(channel, ...args);
    } catch {}
  };

  const showError = (message: string) => {
    try {
      dialog.showErrorBox('Update Error', message);
    } catch {}
  };

  const reportError = (err: unknown, context?: string) => {
    const base = err instanceof Error ? err.message : String(err);
    const msg = context ? `${context}\n\n${base}` : base;
    broadcast('update-error', msg);
    showError(msg);
  };

  updater.on('error', (err: unknown) => {
    hasUpdate = false;
    isDownloaded = false;
    reportError(err, 'Updater emitted an error');
  });

  updater.on('update-available', () => {
    hasUpdate = true;
    isDownloaded = false;
    broadcast('update-available');
  });

  updater.on('update-not-available', () => {
    hasUpdate = false;
    isDownloaded = false;
    broadcast('update-not-available');

    if (installRequested) {
      installRequested = false;
      showError(
        `No update available.\nYou're already on version ${app.getVersion()}.`
      );
    }
  });

  updater.on('update-downloaded', () => {
    isDownloaded = true;
    if (installRequested) {
      installRequested = false;

      setImmediate(() => {
        if (app.isPackaged) {
          try {
            updater.quitAndInstall(true, true);
          } catch (e) {
            reportError(e, 'Failed to quit and install');
          }
        } else {
          showError(
            'Update downloaded (development build).\nInstall is only performed in packaged apps.'
          );
        }
      });
    }
  });

  ipcMain.on('update-check', () => {
    updater.checkForUpdates().catch((err: unknown) => {
      reportError(err, 'Failed to check for updates');
    });
  });

  ipcMain.on('update-download-and-install', async () => {
    try {
      installRequested = true;

      if (!hasUpdate) {
        const info = await updater.checkForUpdates();
        hasUpdate = !!info?.updateInfo?.version;
        if (!hasUpdate) {

          showError(
            `No update available.\nYou're already on version ${app.getVersion()}.`
          );
          installRequested = false;
          return;
        }
      }

      if (isDownloaded) {

        setImmediate(() => {
          if (app.isPackaged) {
            try {
              updater.quitAndInstall(true, true);
            } catch (e) {
              reportError(e, 'Failed to quit and install');
            }
          } else {
            showError(
              'Update downloaded (development build).\nInstall is only performed in packaged apps.'
            );
          }
        });
        return;
      }

      updater.downloadUpdate().catch((err: unknown) => {
        reportError(err, 'Failed to download the update');
        installRequested = false;
      });
    } catch (err: unknown) {
      reportError(err, 'Update initiation failed');
      installRequested = false;
    }
  });

  setTimeout(() => {
    updater.checkForUpdates().catch(() => {});
  }, 1500);
};
