import { ipcMain } from 'electron';
import {
  ExtensionMainService,
  EXTENSION_SERVICE_UNINSTALL_CHANNEL,
} from '~/common/rpc/extensions';
import { Application } from './application';

export class ExtensionServiceHandler {
  constructor() {
    try {
      ipcMain.removeHandler(EXTENSION_SERVICE_UNINSTALL_CHANNEL);
    } catch {}

    ipcMain.handle(EXTENSION_SERVICE_UNINSTALL_CHANNEL, (_e, id: string) =>
      this.uninstall(id),
    );
  }

  uninstall(id: string): ReturnType<ExtensionMainService['uninstall']> {
    return Application.instance.sessions.uninstallExtension(id);
  }
}
