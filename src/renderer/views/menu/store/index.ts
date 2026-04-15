import { ipcRenderer } from 'electron';
import { makeObservable, observable } from 'mobx';
import { DialogStore } from '~/models/dialog-store';

export class Store extends DialogStore {
  public appName = ipcRenderer.sendSync('get-app-name-sync') || 'Selenix';

  @observable
  public alwaysOnTop = false;

  @observable
  public updateAvailable = false;
  @observable
  public updateError: string | null = null;

  constructor() {
    super();

    makeObservable(this);

    try {
      this.alwaysOnTop = !!ipcRenderer.sendSync('window-is-always-on-top-sync');
    } catch (e) {}
    this.registerIpcHandlers();
  }

  private registerIpcHandlers() {
    ipcRenderer.on('always-on-top-change', (_e, value: boolean) => {
      this.setAlwaysOnTop(value);
    });

    ipcRenderer.on('update-available', () => {
      this.setUpdateAvailable(true);
      this.setUpdateError(null);
    });

    ipcRenderer.on('update-not-available', () => {
      this.setUpdateAvailable(false);
    });

    ipcRenderer.on('update-error', (_e, message: string) => {
      this.setUpdateError(message || 'Update failed');
    });

    ipcRenderer.send('update-check');
  }

  public triggerUpdate() {
    ipcRenderer.send('update-download-and-install');
  }

  public save(): void {}

  public setAlwaysOnTop(value: boolean) {
    this.alwaysOnTop = value;
  }
  public setUpdateAvailable(flag: boolean) {
    this.updateAvailable = flag;
  }
  public setUpdateError(message: string | null) {
    this.updateError = message;
  }
}

export default new Store();
