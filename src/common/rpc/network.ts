export interface ResponseDetails {
  statusCode: number;
  data: string; // binary string
  headers?: Record<string, string | string[] | undefined>;
}

export interface NetworkService {
  request(url: string): Promise<ResponseDetails>;
}

export const NETWORK_SERVICE_REQUEST_CHANNEL = 'network-service:request';

interface NetworkMainChannel {
  getInvoker(): NetworkService;
}

let _networkMainChannel: NetworkMainChannel | undefined;
let _networkInvoker: NetworkService | undefined;

const getRendererIpc = () => {
  try {
    return require('electron').ipcRenderer as Electron.IpcRenderer;
  } catch {
    return null;
  }
};

export const getNetworkMainChannel = () =>
  (_networkMainChannel ??= {
    getInvoker: () =>
      (_networkInvoker ??= {
        request: (url: string) => {
          const ipc = getRendererIpc();

          if (!ipc) {
            return Promise.reject(
              new Error('Network IPC is only available in renderer processes'),
            );
          }

          return ipc.invoke(NETWORK_SERVICE_REQUEST_CHANNEL, url);
        },
      }),
  });
