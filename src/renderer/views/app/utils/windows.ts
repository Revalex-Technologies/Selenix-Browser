import { ipcRenderer } from 'electron';

export const getCurrentWindow = () => ({
  id: ipcRenderer.sendSync('get-window-id'),
});

export const closeWindow = () => {
  ipcRenderer.send(`window-close-${getCurrentWindow().id}`);
};

export const minimizeWindow = () => {
  ipcRenderer.send(`window-minimize-${getCurrentWindow().id}`);
};

export const maximizeWindow = () => {
  ipcRenderer.send(`window-toggle-maximize-${getCurrentWindow().id}`);
};
