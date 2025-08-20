import { ipcRenderer } from 'electron';
import { action, makeObservable, observable, runInAction } from 'mobx';
import { DialogStore } from '~/models/dialog-store';

type UpdaterState = {
  updateAvailable: boolean;
  error?: string | null;
};

/**
 * Store for the Quick Menu.
 * - Reflects updater state pushed by the main process.
 * - Never triggers network checks on open; reads cached state only.
 */
export class Store extends DialogStore {
  public alwaysOnTop = false;
  public updateAvailable = false;
  public updateError: string | null = null;

  constructor() {
    super();
    makeObservable(this, {
      // observables
      alwaysOnTop: observable,
      updateAvailable: observable,
      updateError: observable,
      // actions
      setAlwaysOnTop: action.bound,
      setUpdateAvailable: action.bound,
      setUpdateError: action.bound,
    });

    // Subscribe to broadcasts from main so blue dot and menu match
    ipcRenderer.on('update-state', (_evt, payload: UpdaterState) => {
      runInAction(() => {
        this.updateAvailable = !!payload?.updateAvailable;
        this.updateError = payload?.error ?? null;
      });
    });

    // Get the current cached state instantly (no network)
    this.refreshUpdaterState().catch(() => {});
  }

  // ----- actions -----
  public setAlwaysOnTop(value: boolean) {
    this.alwaysOnTop = value;
  }

  public setUpdateAvailable(value: boolean) {
    this.updateAvailable = value;
  }

  public setUpdateError(message: string | null) {
    this.updateError = message;
  }

  // ----- helpers used by QuickMenu -----

  /** Back-compat shim so existing call sites compile. Wire persistence later if desired. */
  public save(): void { /* no-op */ }

  /** Download and install the update without re-checking. */
  public async triggerUpdate(): Promise<void> {
    try {
      await ipcRenderer.invoke('update-download-and-install');
    } catch {
      // main will emit error via update-state, keep UI quiet here
    }
  }

  /** Ask main for cached updater state (fast, no network) */
  public async refreshUpdaterState(): Promise<void> {
    try {
      const state: UpdaterState | undefined = await ipcRenderer.invoke('update-get-state');
      runInAction(() => {
        this.updateAvailable = !!state?.updateAvailable;
        this.updateError = state?.error ?? null;
      });
    } catch {
      // ignore
    }
  }
}

export default new Store();
