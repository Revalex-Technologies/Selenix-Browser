
// Safe IPC shim for contextIsolation: true and nodeIntegration: false.
// Expects preload to expose window.__electronApi = { ipcRenderer, remote? }
export type IpcRendererLike = {
  send: (...args: any[]) => void;
  sendSync?: (...args: any[]) => any;
  invoke?: (...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => any;
  once: (channel: string, listener: (...args: any[]) => void) => any;
  removeListener: (channel: string, listener: (...args: any[]) => void) => any;
  removeAllListeners: (channel?: string) => any;
  postMessage?: (channel: string, message: any, transfer?: any[]) => void;
};

declare global {
  interface Window {
    __electronApi?: { ipcRenderer: IpcRendererLike; remote?: any };
    electron?: { ipcRenderer?: IpcRendererLike; remote?: any };
    ipcRenderer?: IpcRendererLike;
    remote?: any;
  }
}

function pickIpc(): IpcRendererLike {
  const api = window.__electronApi?.ipcRenderer
    ?? window.electron?.ipcRenderer
    ?? (window as any).ipcRenderer;
  if (!api) {
    // Provide a no-op stub to prevent crashes if preload isn't ready yet.
    const no = () => {};
    const noop: any = new Proxy(no, { get: () => noop, apply: () => undefined });
    return Object.assign(noop, { on: no, once: no, removeListener: no, removeAllListeners: no });
  }
  return api;
}

function pickRemote(): any {
  return window.__electronApi?.remote ?? window.electron?.remote ?? (window as any).remote ?? {};
}

export const ipcRenderer: IpcRendererLike = pickIpc();
export const remote: any = pickRemote();
