import { BrowserWindow } from 'electron';
import { Application } from '../application';
import { DIALOG_MARGIN_TOP, DIALOG_MARGIN } from '~/constants/design';


// Normalize potentially malformed chrome-extension URLs (handles double prefixes,
// missing colon after scheme, file:// fallbacks, and duplicate slashes).
const normalizeChromeExtensionUrl = (raw: string): string => {
  if (!raw) return raw;
  let u = raw.trim();

  // Fix missing colon in scheme like 'chrome-extension//<id>/...'
  u = u.replace(/^chrome-extension\/\/?/i, 'chrome-extension://');

  // Handle file:// paths pointing into build/chrome-extension//<id>/...
  const fileMatch = u.match(/^file:\/\/.+?\/(?:chrome-extension)\/\/([^/]+)\/(.+)$/i);
  if (fileMatch) {
    const [, extId, rest] = fileMatch;
    return `chrome-extension://${extId}/${rest}`.replace(/\/{2,}/g, '/').replace('chrome-extension:/', 'chrome-extension://');
  }

  // If already chrome-extension://, remove any accidental nested 'chrome-extension//' segments
  // The above pattern can be tricky; instead split manually:
  if (u.startsWith('chrome-extension://')) {
    try {
      const withoutScheme = u.slice('chrome-extension://'.length);
      const firstSlash = withoutScheme.indexOf('/');
      const id = firstSlash === -1 ? withoutScheme : withoutScheme.slice(0, firstSlash);
      const rest = firstSlash === -1 ? '' : withoutScheme.slice(firstSlash + 1);

      // If rest starts with 'chrome-extension//<id>/', strip it
      const cleanedRest = rest.replace(/^chrome-extension\/\/?[^/]+\//i, '');
      const normalized = `chrome-extension://${id}/${cleanedRest}`;

      // collapse duplicate slashes (but keep :// intact)
      const collapsed = normalized.replace(/([^:])\/{2,}/g, (_m, p1) => p1 + '/');
      return collapsed;
    } catch {
      return u;
    }
  }

  // As a last resort, just collapse duplicate slashes after a scheme-like part
  return u.replace(/([^:])\/{2,}/g, '$1/');
};

export const showExtensionDialog = (
  browserWindow: BrowserWindow,
  x: number,
  y: number,
  url: string,
  inspect = false,
) => {
  url = normalizeChromeExtensionUrl(url);
  if (!process.env.ENABLE_EXTENSIONS) return;

  let height = 512;
  let width = 512;

  const dialog = Application.instance.dialogs.show({
    name: 'extension-popup',
    browserWindow,
    getBounds: () => {
      return {
        x: x - width + DIALOG_MARGIN,
        y: y - DIALOG_MARGIN_TOP,
        height: Math.min(1024, height),
        width: Math.min(1024, width),
      };
    },
    onWindowBoundsUpdate: () => dialog.hide(),
  });

  if (!dialog) return;

  dialog.on('bounds', (e, w, h) => {
    width = w;
    height = h;
    dialog.rearrange();
  });

  dialog.webContentsView.webContents.on(
    'will-attach-webview',
    (e, webPreferences, params) => {
      webPreferences.sandbox = true;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
    },
  );

  dialog.on('loaded', (e) => {
    e.reply('data', { url, inspect });
  });
};
