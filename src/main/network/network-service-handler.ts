import { ipcMain } from 'electron';
import {
  NETWORK_SERVICE_REQUEST_CHANNEL,
  NetworkService,
} from '~/common/rpc/network';
import { requestURL } from './request';

export class NetworkServiceHandler {
  private static instance?: NetworkServiceHandler;

  public static get() {
    if (!this.instance) this.instance = new NetworkServiceHandler();
    return this.instance;
  }

  constructor() {
    try {
      ipcMain.removeHandler(NETWORK_SERVICE_REQUEST_CHANNEL);
    } catch {}

    ipcMain.handle(NETWORK_SERVICE_REQUEST_CHANNEL, (_e, url: string) =>
      this.request(url),
    );
  }

  request(url: string): ReturnType<NetworkService['request']> {
    return requestURL(url);
  }
}
