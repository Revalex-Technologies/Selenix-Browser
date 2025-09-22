import { protocol } from 'electron';
import { join } from 'path';
import { ERROR_PROTOCOL, WEBUI_PROTOCOL } from '~/constants/files';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'selenix',
    privileges: {
      bypassCSP: true,
      secure: true,
      standard: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      corsEnabled: false,
    },
  },
]);

export const registerProtocol = (session: Electron.Session) => {
  session.protocol.registerFileProtocol(
    ERROR_PROTOCOL,
    (request, callback: any) => {
      const parsed = new URL(request.url);

      if (parsed.hostname === 'network-error') {
        return callback({
          path: join(__dirname, '../static/pages/', `network-error.html`),
        });
      }
    },
  );

  if (process.env.NODE_ENV !== 'development') {
    session.protocol.registerFileProtocol(
      WEBUI_PROTOCOL,
      (request, callback: any) => {
        const parsed = new URL(request.url);

        if (parsed.pathname === '' || parsed.pathname === '/') {
          return callback({
            path: join(__dirname, `${parsed.hostname}.html`),
          });
        }

        const _p = decodeURIComponent(parsed.pathname.replace(/^\/+/,'').replace(/\+/g,'/'));
        const _safePath = join(__dirname, _p);
        callback({ path: _safePath });
      },
    );
  }
};
