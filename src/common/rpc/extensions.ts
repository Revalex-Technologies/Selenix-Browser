export interface ExtensionMainService {
  uninstall(id: string): Promise<void>;
}

export const EXTENSION_SERVICE_UNINSTALL_CHANNEL =
  'extension-service:uninstall';

interface ExtensionMainChannel {
  getInvoker(): ExtensionMainService;
}

let _extensionMainChannel: ExtensionMainChannel | undefined;
let _extensionInvoker: ExtensionMainService | undefined;

const getRendererIpc = () => {
  try {
    return require('electron').ipcRenderer as Electron.IpcRenderer;
  } catch {
    return null;
  }
};

export const getExtensionMainChannel = () =>
  (_extensionMainChannel ??= {
    getInvoker: () =>
      (_extensionInvoker ??= {
        uninstall: (id: string) => {
          const ipc = getRendererIpc();

          if (!ipc) {
            return Promise.reject(
              new Error(
                'Extension IPC is only available in renderer processes',
              ),
            );
          }

          return ipc.invoke(EXTENSION_SERVICE_UNINSTALL_CHANNEL, id);
        },
      }),
  });
