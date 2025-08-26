import { configureRenderer } from '~/common/renderer-config';

// Before configuring renderer, register the <browser-action-list> custom element
// provided by electron-chrome-extensions when extensions are enabled. This
// injection must occur in the WebUI context (not the tab preloads) so that
// React can render the element correctly. Without this call, MV3 extension
// icons will not appear in the toolbar.
if (process.env.ENABLE_EXTENSIONS) {
  try {
    // Use dynamic require to avoid bundling issues. The module may not be
    // present when extensions are disabled; in that case the require will
    // throw and we catch the error silently.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { injectBrowserAction } = require('electron-chrome-extensions/browser-action');
    if (typeof injectBrowserAction === 'function') {
      injectBrowserAction();
    }
  } catch (err) {
    console.error('[pre-entry] Failed to inject browser action:', err);
  }
}

configureRenderer();