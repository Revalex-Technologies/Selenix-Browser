import { resolve } from 'path';
import { app, ipcRenderer } from 'electron';

/**
 * Returns a path inside the application's userData directory. In a renderer
 * process we request the value from the main process over IPC. If neither
 * renderer IPC nor the main `app` module is available, `null` is returned.
 *
 * @param relativePaths additional segments to append to the base userData path
 */
export const getPath = (...relativePaths: string[]) => {
  let basePath: string | undefined;

  if (typeof process !== 'undefined' && process.type === 'renderer') {
    try {
      basePath = ipcRenderer.sendSync('get-app-path-sync', 'userData');
    } catch (e) {}
  }

  if (!basePath && app) {
    basePath = app.getPath('userData');
  }
  if (!basePath) {
    return null;
  }
  return resolve(basePath, ...relativePaths).replace(/\\/g, '/');
};
