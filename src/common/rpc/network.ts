import { RendererToMainChannel } from '@wexond/rpc-electron';

export interface ResponseDetails {
  statusCode: number;
  data: string; // binary string
  headers?: Record<string, string | string[] | undefined>;
}

export interface NetworkService {
  request(url: string): Promise<ResponseDetails>;
}

export const networkMainChannel = new RendererToMainChannel<NetworkService>(
  'NetworkService',
);
