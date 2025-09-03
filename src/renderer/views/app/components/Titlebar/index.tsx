import { observer } from 'mobx-react-lite';
import * as React from 'react';

import { ipcRenderer } from 'electron';
import * as remote from '@electron/remote';

import store from '../../store';
import { Tabbar } from '../Tabbar';
import { platform } from 'os';
import { StyledTitlebar, FullscreenExitButton } from './style';
import { NavigationButtons } from '../NavigationButtons';
import { RightButtons } from '../RightButtons';

const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
  if (store.addressbarFocused) {
    e.preventDefault();
  }
};

const onFullscreenExit = (e: React.MouseEvent<HTMLDivElement>) => {
  remote.getCurrentWindow().setFullScreen(false);
};

export const Titlebar = observer(() => {
  return (
    <StyledTitlebar
      onMouseDown={onMouseDown}
      isFullscreen={store.isFullscreen}
      isHTMLFullscreen={store.isHTMLFullscreen}
    >
      {store.isCompact && <NavigationButtons />}
      <Tabbar />
      {store.isCompact && <RightButtons />}

      {}
      {platform() !== 'darwin' && store.isFullscreen && (
        <FullscreenExitButton
          style={{
            height: store.isCompact ? '100%' : 32,
          }}
          onMouseUp={onFullscreenExit}
          theme={store.theme}
        />
      )}
    </StyledTitlebar>
  );
});
